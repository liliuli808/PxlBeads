import { RGB } from '@pxlbeads/shared';
import { rgbToOklab, oklabToRgb, deltaEOklab, OKLab } from './oklab';
import { SemanticData, SemanticLabel } from './semanticAnalyzer';

export interface GridPixel {
  x: number;
  y: number;
  sourceColor: OKLab;
  srgb: RGB;
  semanticLabel: SemanticLabel;
  importance: number;
}

export interface SemanticDownsamplerConfig {
  minCoverage?: number;
}

const LABEL_PRIORITY: Record<SemanticLabel, number> = {
  feature: 10,
  hair: 6,
  skin: 5,
  clothes: 4,
  background: 1,
};

const MIN_COVERAGE: Record<SemanticLabel, number> = {
  feature: 0.12,
  hair: 0.25,
  skin: 0.25,
  clothes: 0.25,
  background: 0.2,
};

function weightedMedoidColor(
  colors: OKLab[],
  weights: number[]
): OKLab {
  if (colors.length === 0) {
    return [0.5, 0, 0];
  }
  if (colors.length === 1) {
    return colors[0];
  }

  let bestIdx = 0;
  let bestScore = Infinity;

  for (let i = 0; i < colors.length; i++) {
    let score = 0;
    for (let j = 0; j < colors.length; j++) {
      if (i === j) continue;
      const dist = deltaEOklab(colors[i], colors[j]);
      score += dist * weights[j];
    }
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return colors[bestIdx];
}

export function semanticDownsample(
  imageData: ImageData,
  semantic: SemanticData,
  gridWidth: number,
  gridHeight: number,
  config: SemanticDownsamplerConfig = {}
): GridPixel[][] {
  const { width, height, data } = imageData;
  const { labels, importance } = semantic;
  const minCoverage = config.minCoverage ?? 0.2;

  const cellW = width / gridWidth;
  const cellH = height / gridHeight;
  const grid: GridPixel[][] = [];

  for (let gy = 0; gy < gridHeight; gy++) {
    const row: GridPixel[] = [];
    const yStart = Math.floor(gy * cellH);
    const yEnd = Math.min(height, Math.floor((gy + 1) * cellH));

    for (let gx = 0; gx < gridWidth; gx++) {
      const xStart = Math.floor(gx * cellW);
      const xEnd = Math.min(width, Math.floor((gx + 1) * cellW));

      const labelCounts = new Map<SemanticLabel, number>();
      const labelColors = new Map<SemanticLabel, { oklab: OKLab; srgb: RGB; weight: number }[]>();
      let total = 0;

      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const p = y * width + x;
          const alpha = data[p * 4 + 3];
          if (alpha < 128) continue;

          total++;
          const label = labels[p];
          const r = data[p * 4];
          const g = data[p * 4 + 1];
          const b = data[p * 4 + 2];
          const srgb: RGB = [r, g, b];
          const oklab = rgbToOklab(srgb);
          const weight = importance[p];

          labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
          if (!labelColors.has(label)) {
            labelColors.set(label, []);
          }
          labelColors.get(label)!.push({ oklab, srgb, weight });
        }
      }

      let dominantLabel: SemanticLabel = 'background';
      let chosenColors = labelColors.get('background') ?? [];

      if (total > 0) {
        // Choose label by priority and minimum coverage.
        const candidates = Array.from(labelCounts.entries()).map(([label, count]) => ({
          label,
          coverage: count / total,
          priority: LABEL_PRIORITY[label],
        }));

        candidates.sort((a, b) => {
          const aMin = MIN_COVERAGE[a.label] ?? minCoverage;
          const bMin = MIN_COVERAGE[b.label] ?? minCoverage;
          const aPass = a.coverage >= aMin ? 1 : 0;
          const bPass = b.coverage >= bMin ? 1 : 0;
          if (aPass !== bPass) return bPass - aPass;
          return b.priority - a.priority || b.coverage - a.coverage;
        });

        dominantLabel = candidates[0].label;
        chosenColors = labelColors.get(dominantLabel) ?? [];
      }

      const medoid = weightedMedoidColor(
        chosenColors.map((c) => c.oklab),
        chosenColors.map((c) => c.weight)
      );
      const srgb = oklabToRgb(medoid);

      row.push({
        x: gx,
        y: gy,
        sourceColor: medoid,
        srgb,
        semanticLabel: dominantLabel,
        importance: chosenColors.reduce((sum, c) => sum + c.weight, 0) / Math.max(1, chosenColors.length),
      });
    }

    grid.push(row);
  }

  return grid;
}
