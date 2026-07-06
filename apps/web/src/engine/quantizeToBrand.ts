import { BrandColor, BeadStats, Lab, RGB } from '@pxlbeads/shared';
import { rgbToLab } from './colorSpace';
import { deltaE2000 } from './ciede2000';
import { kmeans } from './kmeans';

export interface QuantizeResult {
  grid: (BrandColor | null)[];
  usedPalette: BrandColor[];
  stats: BeadStats;
}

function findNearestBrand(lab: [number, number, number], palette: BrandColor[]): BrandColor {
  let best = palette[0];
  let bestDist = deltaE2000(lab, palette[0].lab);
  for (let i = 1; i < palette.length; i++) {
    const dist = deltaE2000(lab, palette[i].lab);
    if (dist < bestDist) {
      bestDist = dist;
      best = palette[i];
    }
  }
  return best;
}

export function quantizeToBrand(
  pixels: RGB[],
  palette: BrandColor[],
  maxColors: number,
  mode: 'fast' | 'smart',
  alpha?: number[]
): QuantizeResult {
  const pixelsLab = pixels.map(rgbToLab);
  const isTransparent = (idx: number) => (alpha?.[idx] ?? 255) < 128;

  if (mode === 'fast') {
    // Map each pixel to nearest brand color
    const fullMapping = pixelsLab.map((lab, i) => (isTransparent(i) ? null : findNearestBrand(lab, palette)));

    // Count frequencies (skip transparent cells)
    const counts = new Map<string, { color: BrandColor; count: number }>();
    for (const color of fullMapping) {
      if (!color) continue;
      const key = `${color.brand}:${color.code}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { color, count: 1 });
      }
    }

    // Keep top maxColors
    const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
    const reducedPalette = sorted.slice(0, maxColors).map((item) => item.color);

    // Re-map to reduced palette
    const grid = pixelsLab.map((lab, i) => {
      if (isTransparent(i)) return null;
      return findNearestBrand(lab, reducedPalette);
    });
    return buildResult(grid);
  }

  // Smart mode: K-means then map centroids to brand colors
  const opaquePixels: Lab[] = [];
  const opaqueIndices: number[] = [];
  for (let i = 0; i < pixelsLab.length; i++) {
    if (!isTransparent(i)) {
      opaquePixels.push(pixelsLab[i]);
      opaqueIndices.push(i);
    }
  }

  const k = Math.min(maxColors, opaquePixels.length || 1);
  const { centroids } = kmeans(opaquePixels, k, 30);
  const reducedPalette = centroids.map((centroid) => findNearestBrand(centroid, palette));

  const grid: (BrandColor | null)[] = new Array(pixelsLab.length).fill(null);
  for (let i = 0; i < opaquePixels.length; i++) {
    const idx = opaqueIndices[i];
    grid[idx] = findNearestBrand(opaquePixels[i], reducedPalette);
  }
  return buildResult(grid);
}

function buildResult(grid: (BrandColor | null)[]): QuantizeResult {
  const counts: Record<string, number> = {};
  const usedSet = new Map<string, BrandColor>();

  for (const color of grid) {
    if (!color) continue;
    const key = `${color.brand}:${color.code}`;
    counts[key] = (counts[key] || 0) + 1;
    usedSet.set(key, color);
  }

  const usedPalette = Array.from(usedSet.values());

  return {
    grid,
    usedPalette,
    stats: {
      counts,
      total: grid.filter(Boolean).length,
      actualColors: usedPalette.length,
    },
  };
}
