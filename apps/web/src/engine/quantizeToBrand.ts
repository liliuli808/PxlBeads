import { BrandColor, BeadStats, Lab, RGB } from '@pxlbeads/shared';
import { rgbToLab } from './colorSpace';
import { deltaE2000 } from './ciede2000';
import { kmeans } from './kmeans';

export interface QuantizeResult {
  grid: (BrandColor | null)[];
  usedPalette: BrandColor[];
  stats: BeadStats;
}

export interface QuantizeOptions {
  dither?: boolean;
  ditherStrength?: number;
  confettiMinRatio?: number;
  snapToReducedPalette?: boolean;
  strategy?: 'nearest-first' | 'cluster';
}

function findNearestBrand(lab: Lab, palette: BrandColor[]): BrandColor {
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

function findNearestRgb(rgb: RGB, palette: BrandColor[]): BrandColor {
  return findNearestBrand(rgbToLab(rgb), palette);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function ditherQuantize(
  grid: (RGB | null)[][],
  palette: BrandColor[],
  strength: number
): (BrandColor | null)[][] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const amount = Math.max(0, Math.min(1, strength));
  const buffer = grid.map((row) => row.map((c) => (c ? { r: c[0], g: c[1], b: c[2] } : null)));
  const output: (BrandColor | null)[][] = grid.map((row) => row.map(() => null));

  const spread = (y: number, x: number, er: number, eg: number, eb: number, factor: number) => {
    if (y < 0 || x < 0 || y >= height || x >= width) return;
    const cell = buffer[y][x];
    if (!cell) return;
    cell.r += er * factor * amount;
    cell.g += eg * factor * amount;
    cell.b += eb * factor * amount;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = buffer[y][x];
      if (!cell) continue;

      const current: RGB = [clampByte(cell.r), clampByte(cell.g), clampByte(cell.b)];
      const bead = findNearestRgb(current, palette);
      output[y][x] = bead;

      const er = current[0] - bead.rgb[0];
      const eg = current[1] - bead.rgb[1];
      const eb = current[2] - bead.rgb[2];
      spread(y, x + 1, er, eg, eb, 7 / 16);
      spread(y + 1, x - 1, er, eg, eb, 3 / 16);
      spread(y + 1, x, er, eg, eb, 5 / 16);
      spread(y + 1, x + 1, er, eg, eb, 1 / 16);
    }
  }

  return output;
}

function cleanConfetti(
  grid: (BrandColor | null)[][],
  palette: BrandColor[],
  minRatio: number
): (BrandColor | null)[][] {
  if (minRatio <= 0) return grid;

  const counts = new Map<string, number>();
  const colorMap = new Map<string, BrandColor>();
  let total = 0;

  for (const row of grid) {
    for (const color of row) {
      if (!color) continue;
      const key = `${color.brand}:${color.code}`;
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

    let best: BrandColor | null = null;
    let bestDist = Infinity;
    keep.forEach((key) => {
      const target = colorMap.get(key);
      if (!target) return;
      const dist = deltaE2000(source.lab, target.lab);
      if (dist < bestDist) {
        bestDist = dist;
        best = target;
      }
    });

    if (best) remap.set(orphan, best);
  }

  void palette;
  return grid.map((row) =>
    row.map((color) => {
      if (!color) return null;
      return remap.get(`${color.brand}:${color.code}`) ?? color;
    })
  );
}

function paletteKey(color: BrandColor): string {
  return `${color.brand}:${color.code}`;
}

function buildNearestFirstPalette(
  grid: (RGB | null)[][],
  palette: BrandColor[],
  maxColors: number
): { nearestGrid: (BrandColor | null)[][]; reducedPalette: BrandColor[] } {
  const counts = new Map<string, { color: BrandColor; count: number; firstSeen: number }>();
  let seen = 0;
  const nearestGrid = grid.map((row) =>
    row.map((rgb) => {
      if (!rgb) return null;
      const color = findNearestRgb(rgb, palette);
      const key = paletteKey(color);
      const current = counts.get(key);
      if (current) {
        current.count++;
      } else {
        counts.set(key, { color, count: 1, firstSeen: seen });
      }
      seen++;
      return color;
    })
  );

  const reducedPalette = Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.firstSeen - b.firstSeen)
    .slice(0, Math.max(1, maxColors))
    .map((entry) => entry.color);

  return { nearestGrid, reducedPalette };
}

function remapToPalette(
  source: (RGB | null)[][],
  palette: BrandColor[]
): (BrandColor | null)[][] {
  return source.map((row) => row.map((rgb) => (rgb ? findNearestRgb(rgb, palette) : null)));
}

function quantizeNearestFirst(
  grid: (RGB | null)[][],
  palette: BrandColor[],
  maxColors: number,
  options: QuantizeOptions
): QuantizeResult {
  const { nearestGrid, reducedPalette } = buildNearestFirstPalette(grid, palette, maxColors);

  if (reducedPalette.length === 0) {
    return buildResult(nearestGrid, 0);
  }

  if (options.dither && (options.ditherStrength ?? 0) > 0 && reducedPalette.length > 1) {
    const ditheredGrid = ditherQuantize(grid, reducedPalette, options.ditherStrength ?? 0.75);
    const cleanedGrid = cleanConfetti(ditheredGrid, reducedPalette, options.confettiMinRatio ?? 0);
    return buildResult(cleanedGrid, computeAvgDeltaE(grid, cleanedGrid));
  }

  const reducedKeys = new Set(reducedPalette.map(paletteKey));
  const mappedGrid =
    reducedPalette.length >= palette.length || nearestGrid.every((row) => row.every((color) => !color || reducedKeys.has(paletteKey(color))))
      ? nearestGrid
      : remapToPalette(grid, reducedPalette);
  const cleanedGrid = cleanConfetti(mappedGrid, reducedPalette, options.confettiMinRatio ?? 0);

  return buildResult(cleanedGrid, computeAvgDeltaE(grid, cleanedGrid));
}

export function quantizeToBrand(
  grid: (RGB | null)[][],
  palette: BrandColor[],
  maxColors: number,
  options: QuantizeOptions = {}
): QuantizeResult {
  if ((options.strategy ?? 'nearest-first') === 'nearest-first') {
    return quantizeNearestFirst(grid, palette, maxColors, options);
  }

  const cells: { y: number; x: number; lab: Lab }[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (c) cells.push({ y, x, lab: rgbToLab(c) });
    }
  }

  const outputGrid: (BrandColor | null)[][] = grid.map((row) => row.map(() => null));

  if (cells.length === 0) {
    return buildResult(outputGrid, 0);
  }

  const k = Math.min(maxColors, cells.length);
  const { centroids, labels } = kmeans(
    cells.map((c) => c.lab),
    k,
    30
  );

  const centerToBead = centroids.map((c) => findNearestBrand(c, palette));
  const reducedPalette = Array.from(
    new Map(centerToBead.map((bead) => [paletteKey(bead), bead])).values()
  );

  if (options.dither && (options.ditherStrength ?? 0) > 0 && reducedPalette.length > 1) {
    const ditheredGrid = ditherQuantize(grid, reducedPalette, options.ditherStrength ?? 0.75);
    const cleanedGrid = cleanConfetti(ditheredGrid, reducedPalette, options.confettiMinRatio ?? 0);
    return buildResult(cleanedGrid, computeAvgDeltaE(grid, cleanedGrid));
  }

  if (options.snapToReducedPalette && reducedPalette.length > 1) {
    const snappedGrid = remapToPalette(grid, reducedPalette);
    const cleanedGrid = cleanConfetti(snappedGrid, reducedPalette, options.confettiMinRatio ?? 0);
    return buildResult(cleanedGrid, computeAvgDeltaE(grid, cleanedGrid));
  }

  for (let i = 0; i < cells.length; i++) {
    const { y, x } = cells[i];
    const bead = centerToBead[labels[i]];
    outputGrid[y][x] = bead;
  }

  const cleanedGrid = cleanConfetti(outputGrid, reducedPalette, options.confettiMinRatio ?? 0);
  return buildResult(cleanedGrid, computeAvgDeltaE(grid, cleanedGrid));
}

function computeAvgDeltaE(source: (RGB | null)[][], mapped: (BrandColor | null)[][]): number {
  let total = 0;
  let deltaSum = 0;

  for (let y = 0; y < source.length; y++) {
    for (let x = 0; x < source[y].length; x++) {
      const rgb = source[y][x];
      const bead = mapped[y][x];
      if (!rgb || !bead) continue;
      deltaSum += deltaE2000(rgbToLab(rgb), bead.lab);
      total++;
    }
  }

  return total === 0 ? 0 : deltaSum / total;
}

function buildResult(grid: (BrandColor | null)[][], avgDeltaE: number): QuantizeResult {
  const counts: Record<string, number> = {};
  const usedSet = new Map<string, BrandColor>();

  for (const row of grid) {
    for (const color of row) {
      if (!color) continue;
      const key = `${color.brand}:${color.code}`;
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
