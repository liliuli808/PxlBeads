import { BrandColor } from '@pxlbeads/shared';
import { SemanticLabel } from './semanticAnalyzer';
import { findConnectedComponents } from './connectedComponents';

export interface QualityScore {
  noise: number;
  edgeRetention: number;
  featureReadability: number;
  paletteCompliance: number;
  total: number;
  warnings: string[];
}

function paletteKey(color: BrandColor): string {
  return `${color.brand}:${color.code}`;
}

function computeEdgeMap(grid: (BrandColor | null)[], width: number, height: number): Float32Array {
  const edgeMap = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const current = grid[idx];
      if (!current) continue;

      const currentKey = paletteKey(current);
      let diffCount = 0;
      let total = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nIdx = (y + dy) * width + (x + dx);
          const neighbor = grid[nIdx];
          total++;
          if (!neighbor || paletteKey(neighbor) !== currentKey) {
            diffCount++;
          }
        }
      }

      edgeMap[idx] = diffCount / total;
    }
  }

  return edgeMap;
}

export function evaluateQuality(
  grid: (BrandColor | null)[],
  labels: SemanticLabel[],
  width: number,
  height: number,
  maxColors: number
): QualityScore {
  const warnings: string[] = [];

  // 1. Noise: isolated single-pixel ratio.
  const components = findConnectedComponents(grid, width, height, 8);
  const totalCells = grid.filter(Boolean).length;
  const isolated = components.filter((c) => c.size === 1).reduce((sum, c) => sum + c.size, 0);
  const noise = totalCells > 0 ? isolated / totalCells : 0;

  // 2. Palette compliance: all colors come from palette implicitly, check count.
  const nonNullGrid = grid.filter((c): c is BrandColor => c !== null);
  const uniqueColors = new Set(nonNullGrid.map(paletteKey)).size;
  const paletteCompliance = uniqueColors <= maxColors ? 1 : Math.max(0, 1 - (uniqueColors - maxColors) / maxColors);

  if (uniqueColors > maxColors) {
    warnings.push(`使用了 ${uniqueColors} 种颜色，超过目标 ${maxColors} 色`);
  }

  // 3. Feature readability: count feature regions and their contrast.
  const featureComponents = components.filter((c) => {
    const sample = c.pixels[0];
    return labels[sample.y * width + sample.x] === 'feature';
  });

  let featureReadability = 0;
  if (featureComponents.length >= 2) {
    const readable = featureComponents.filter((c) => {
      const colors = new Set(c.pixels.map((p) => paletteKey(grid[p.y * width + p.x]!))).size;
      return colors >= 2 && c.size >= 4;
    }).length;
    featureReadability = readable / featureComponents.length;
  } else {
    warnings.push('未能识别出明显的五官特征区域');
  }

  // 4. Edge retention: average local color difference.
  const edgeMap = computeEdgeMap(grid, width, height);
  let edgeSum = 0;
  let edgeCount = 0;
  for (let i = 0; i < edgeMap.length; i++) {
    if (edgeMap[i] > 0) {
      edgeSum += edgeMap[i];
      edgeCount++;
    }
  }
  const edgeRetention = edgeCount > 0 ? Math.min(1, edgeSum / edgeCount * 2) : 0;

  if (featureReadability < 0.5) {
    warnings.push('五官可读性较低，建议增大网格尺寸或使用卡通插画重绘');
  }

  if (noise > 0.05) {
    warnings.push('噪点较多，建议提高细节等级或开启平滑');
  }

  const total =
    (1 - noise) * 0.25 +
    featureReadability * 0.25 +
    edgeRetention * 0.20 +
    paletteCompliance * 0.15 +
    (1 - Math.min(1, uniqueColors / maxColors)) * 0.15;

  return {
    noise,
    edgeRetention,
    featureReadability,
    paletteCompliance,
    total,
    warnings,
  };
}
