import { BrandColor, BeadStats } from '@pxlbeads/shared';
import { rgbToOklab, deltaEOklab, OKLab } from './oklab';
import { GridPixel } from './semanticDownsampler';
import { SemanticLabel } from './semanticAnalyzer';

export interface SemanticQuantizeOptions {
  maxColors?: number;
  dither?: boolean;
  ditherStrength?: number;
  confettiMinRatio?: number;
}

export interface SemanticQuantizeResult {
  grid: (BrandColor | null)[];
  usedPalette: BrandColor[];
  stats: BeadStats;
}

function ensureOklab(color: BrandColor): OKLab {
  if (color.oklab) return color.oklab;
  return rgbToOklab(color.rgb);
}

function paletteKey(color: BrandColor): string {
  return `${color.brand}:${color.code}`;
}

function findNearestBrand(
  oklab: OKLab,
  palette: BrandColor[],
  semanticLabel: SemanticLabel
): BrandColor {
  // Region-aware weighting: prefer colors that look appropriate for the region.
  const regionHueBias: Partial<Record<SemanticLabel, (oklab: OKLab) => number>> = {
    skin: (lab) => (lab[1] > 0 && lab[1] < 0.08 && lab[2] > 0.02 && lab[2] < 0.12 ? -2 : 0),
    hair: (lab) => (lab[0] < 0.5 ? -1 : 0),
    background: () => 0,
  };

  const biasFn = regionHueBias[semanticLabel];

  let best = palette[0];
  let bestScore = Infinity;

  for (const color of palette) {
    const cOklab = ensureOklab(color);
    let score = deltaEOklab(oklab, cOklab);
    if (biasFn) {
      score += biasFn(cOklab);
    }
    if (score < bestScore) {
      bestScore = score;
      best = color;
    }
  }

  return best;
}

function ditherQuantize(
  pixels: GridPixel[],
  palette: BrandColor[],
  width: number,
  height: number,
  strength: number
): (BrandColor | null)[][] {
  const amount = Math.max(0, Math.min(1, strength));
  const buffer: (OKLab | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const output: (BrandColor | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );

  for (const pixel of pixels) {
    buffer[pixel.y][pixel.x] = [...pixel.sourceColor];
  }

  const clampChannel = (v: number) => Math.max(0, Math.min(1, v));

  const spread = (
    y: number,
    x: number,
    error: OKLab,
    factor: number
  ) => {
    if (y < 0 || x < 0 || y >= height || x >= width) return;
    const cell = buffer[y][x];
    if (!cell) return;
    cell[0] = clampChannel(cell[0] + error[0] * factor * amount);
    cell[1] = clampChannel(cell[1] + error[1] * factor * amount);
    cell[2] = clampChannel(cell[2] + error[2] * factor * amount);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = buffer[y][x];
      if (!cell) continue;

      // Find semantic label for this cell from input pixels.
      const pixel = pixels.find((p) => p.x === x && p.y === y);
      const label = pixel?.semanticLabel ?? 'background';
      const bead = findNearestBrand(cell, palette, label);
      output[y][x] = bead;

      const beadOklab = ensureOklab(bead);
      const error: OKLab = [
        cell[0] - beadOklab[0],
        cell[1] - beadOklab[1],
        cell[2] - beadOklab[2],
      ];

      spread(y, x + 1, error, 7 / 16);
      spread(y + 1, x - 1, error, 3 / 16);
      spread(y + 1, x, error, 5 / 16);
      spread(y + 1, x + 1, error, 1 / 16);
    }
  }

  return output;
}

function cleanConfetti(
  grid: (BrandColor | null)[][],
  minRatio: number
): (BrandColor | null)[][] {
  if (minRatio <= 0) return grid;

  const counts = new Map<string, number>();
  const colorMap = new Map<string, BrandColor>();
  let total = 0;

  for (const row of grid) {
    for (const color of row) {
      if (!color) continue;
      const key = paletteKey(color);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      colorMap.set(key, color);
      total++;
    }
  }

  if (total === 0) return grid;

  const keep = new Set<string>();
  const orphans: string[] = [];
  counts.forEach((count, key) => {
    if (count / total >= minRatio) keep.add(key);
    else orphans.push(key);
  });

  if (keep.size === 0 || orphans.length === 0) return grid;

  const remap = new Map<string, BrandColor>();
  for (const orphan of orphans) {
    const source = colorMap.get(orphan);
    if (!source) continue;

    const sourceOklab = ensureOklab(source);
    let best: BrandColor | null = null;
    let bestDist = Infinity;

    keep.forEach((key) => {
      const target = colorMap.get(key);
      if (!target) return;
      const dist = deltaEOklab(sourceOklab, ensureOklab(target));
      if (dist < bestDist) {
        bestDist = dist;
        best = target;
      }
    });

    if (best) remap.set(orphan, best);
  }

  return grid.map((row) =>
    row.map((color) => {
      if (!color) return null;
      return remap.get(paletteKey(color)) ?? color;
    })
  );
}

function optimizeGlobalPalette(
  grid: (BrandColor | null)[][],
  pixels: GridPixel[],
  maxColors: number
): (BrandColor | null)[][] {
  const unique = new Map<string, { color: BrandColor; count: number; importance: number }>();

  for (const row of grid) {
    for (const color of row) {
      if (!color) continue;
      const key = paletteKey(color);
      const existing = unique.get(key);
      if (existing) {
        existing.count++;
      } else {
        unique.set(key, { color, count: 1, importance: 0 });
      }
    }
  }

  for (const pixel of pixels) {
    const bead = grid[pixel.y]?.[pixel.x];
    if (!bead) continue;
    const key = paletteKey(bead);
    unique.get(key)!.importance += pixel.importance;
  }

  if (unique.size <= maxColors) return grid;

  // Iteratively merge the least valuable color.
  let working = grid.map((row) => row.map((c) => c));

  while (unique.size > maxColors) {
    let removableKey: string | null = null;
    let removableValue = Infinity;

    unique.forEach((value, key) => {
      const colorOklab = ensureOklab(value.color);
      let nearestDist = Infinity;
      unique.forEach((other, otherKey) => {
        if (key === otherKey) return;
        const dist = deltaEOklab(colorOklab, ensureOklab(other.color));
        if (dist < nearestDist) nearestDist = dist;
      });

      // Value = usage * importance * nearest-alternative-distance.
      // Lower value = safer to remove.
      const valueScore = value.count * (value.importance + 1) * nearestDist;
      if (valueScore < removableValue) {
        removableValue = valueScore;
        removableKey = key;
      }
    });

    if (!removableKey) break;

    const removable = unique.get(removableKey)!;
    const removableOklab = ensureOklab(removable.color);

    let bestReplacement: BrandColor | null = null;
    let bestDist = Infinity;
    unique.forEach((other, otherKey) => {
      if (otherKey === removableKey) return;
      const dist = deltaEOklab(removableOklab, ensureOklab(other.color));
      if (dist < bestDist) {
        bestDist = dist;
        bestReplacement = other.color;
      }
    });

    if (!bestReplacement) break;

    working = working.map((row) =>
      row.map((c) => (c && paletteKey(c) === removableKey ? bestReplacement! : c))
    );
    unique.delete(removableKey);
  }

  return working;
}

function computeAvgDeltaE(
  pixels: GridPixel[],
  grid: (BrandColor | null)[][]
): number {
  let total = 0;
  let deltaSum = 0;

  for (const pixel of pixels) {
    const bead = grid[pixel.y]?.[pixel.x];
    if (!bead) continue;
    deltaSum += deltaEOklab(pixel.sourceColor, ensureOklab(bead));
    total++;
  }

  return total === 0 ? 0 : deltaSum / total;
}

export function quantizeSemanticGrid(
  pixels: GridPixel[],
  palette: BrandColor[],
  options: SemanticQuantizeOptions = {}
): SemanticQuantizeResult {
  const {
    maxColors = 40,
    dither = false,
    ditherStrength = 0.75,
    confettiMinRatio = 0,
  } = options;

  // Pre-compute OKLab for palette if missing.
  palette.forEach((c) => {
    if (!c.oklab) c.oklab = rgbToOklab(c.rgb);
  });

  const width = Math.max(1, ...pixels.map((p) => p.x)) + 1;
  const height = Math.max(1, ...pixels.map((p) => p.y)) + 1;

  let grid: (BrandColor | null)[][];

  if (dither && ditherStrength > 0) {
    grid = ditherQuantize(pixels, palette, width, height, ditherStrength);
  } else {
    grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => null)
    );
    for (const pixel of pixels) {
      grid[pixel.y][pixel.x] = findNearestBrand(pixel.sourceColor, palette, pixel.semanticLabel);
    }
  }

  grid = cleanConfetti(grid, confettiMinRatio);
  grid = optimizeGlobalPalette(grid, pixels, maxColors);

  const avgDeltaE = computeAvgDeltaE(pixels, grid);

  const counts: Record<string, number> = {};
  const usedSet = new Map<string, BrandColor>();

  for (const row of grid) {
    for (const color of row) {
      if (!color) continue;
      const key = paletteKey(color);
      counts[key] = (counts[key] || 0) + 1;
      usedSet.set(key, color);
    }
  }

  const usedPalette = Array.from(usedSet.values());

  return {
    grid: grid.flat(),
    usedPalette,
    stats: {
      counts,
      total: grid.flat().filter(Boolean).length,
      actualColors: usedPalette.length,
      avgDeltaE,
    },
  };
}
