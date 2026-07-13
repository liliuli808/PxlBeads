import { BrandColor } from '@pxlbeads/shared';
import { SemanticLabel } from './semanticAnalyzer';
import { findConnectedComponents } from './connectedComponents';
import { rgbToOklab, deltaEOklab, OKLab } from './oklab';

export interface BeadabilityConfig {
  minComponentSize?: number;
  protectedLabels?: SemanticLabel[];
  maxIterations?: number;
  enableMajorityFilter?: boolean;
  enableHoleRepair?: boolean;
}

function ensureOklab(color: BrandColor): OKLab {
  return color.oklab ?? rgbToOklab(color.rgb);
}

function paletteKey(color: BrandColor): string {
  return `${color.brand}:${color.code}`;
}

function getNeighbors(
  x: number,
  y: number,
  width: number,
  height: number,
  connectivity: 4 | 8 = 8
): { x: number; y: number }[] {
  const directions =
    connectivity === 4
      ? [
          { dx: 0, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
        ]
      : [
          { dx: 0, dy: -1 },
          { dx: 1, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 1, dy: 1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: -1, dy: -1 },
        ];

  return directions
    .map(({ dx, dy }) => ({ x: x + dx, y: y + dy }))
    .filter((n) => n.x >= 0 && n.y >= 0 && n.x < width && n.y < height);
}

function mergeSmallComponents(
  grid: (BrandColor | null)[],
  labels: SemanticLabel[],
  width: number,
  height: number,
  config: BeadabilityConfig
): (BrandColor | null)[] {
  const minSize = config.minComponentSize ?? 3;
  const protectedSet = new Set(config.protectedLabels ?? ['feature']);

  let result = grid.slice();
  let changed = true;
  let iterations = 0;

  while (changed && iterations < (config.maxIterations ?? 3)) {
    changed = false;
    iterations++;

    const components = findConnectedComponents(result, width, height, 8);

    for (const component of components) {
      if (component.size >= minSize) continue;

      // Do not merge protected semantic regions.
      const regionLabel = labels[component.pixels[0].y * width + component.pixels[0].x];
      if (protectedSet.has(regionLabel)) continue;

      // Collect neighbor colors with their boundary contact counts.
      const neighborCounts = new Map<string, { color: BrandColor; count: number }>();
      for (const { x, y } of component.pixels) {
        for (const n of getNeighbors(x, y, width, height, 8)) {
          const nIdx = n.y * width + n.x;
          const neighbor = result[nIdx];
          if (!neighbor) continue;
          const key = paletteKey(neighbor);
          if (key === component.colorKey) continue;

          const existing = neighborCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            neighborCounts.set(key, { color: neighbor, count: 1 });
          }
        }
      }

      if (neighborCounts.size === 0) continue;

      // Pick the neighbor color that minimizes color error plus boundary agreement.
      const sourceOklab = ensureOklab(component.color);
      let bestKey: string | null = null;
      let bestScore = Infinity;

      neighborCounts.forEach(({ color, count }, key) => {
        const dist = deltaEOklab(sourceOklab, ensureOklab(color));
        const score = dist - count * 0.5;
        if (score < bestScore) {
          bestScore = score;
          bestKey = key;
        }
      });

      if (!bestKey) continue;
      const replacement = neighborCounts.get(bestKey)!.color;

      for (const { x, y } of component.pixels) {
        const idx = y * width + x;
        result[idx] = replacement;
      }
      changed = true;
    }
  }

  return result;
}

function majorityFilter(
  grid: (BrandColor | null)[],
  labels: SemanticLabel[],
  width: number,
  height: number,
  protectedLabels: SemanticLabel[]
): (BrandColor | null)[] {
  const result = grid.slice();
  const protectedSet = new Set(protectedLabels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const current = grid[idx];
      if (!current) continue;

      const regionLabel = labels[idx];
      if (protectedSet.has(regionLabel)) continue;

      const counts = new Map<string, { color: BrandColor; count: number }>();

      for (const n of getNeighbors(x, y, width, height, 8)) {
        const nIdx = n.y * width + n.x;
        const neighbor = grid[nIdx];
        if (!neighbor) continue;
        // Only consider neighbors within the same semantic region.
        if (labels[nIdx] !== regionLabel) continue;

        const key = paletteKey(neighbor);
        const existing = counts.get(key);
        if (existing) {
          existing.count++;
        } else {
          counts.set(key, { color: neighbor, count: 1 });
        }
      }

      if (counts.size === 0) continue;

      const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
      if (sorted[0].count >= 5) {
        result[idx] = sorted[0].color;
      }
    }
  }

  return result;
}

function repairOneCellHoles(
  grid: (BrandColor | null)[],
  width: number,
  height: number
): (BrandColor | null)[] {
  const result = grid.slice();

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const current = grid[idx];
      if (current) continue;

      const neighbors = getNeighbors(x, y, width, height, 4);
      const counts = new Map<string, { color: BrandColor; count: number }>();
      for (const n of neighbors) {
        const nIdx = n.y * width + n.x;
        const neighbor = grid[nIdx];
        if (!neighbor) continue;
        const key = paletteKey(neighbor);
        const existing = counts.get(key);
        if (existing) {
          existing.count++;
        } else {
          counts.set(key, { color: neighbor, count: 1 });
        }
      }

      if (counts.size === 1) {
        const only = Array.from(counts.values())[0];
        if (only.count >= 4) {
          result[idx] = only.color;
        }
      }
    }
  }

  return result;
}

export function optimizeBeadability(
  grid: (BrandColor | null)[],
  labels: SemanticLabel[],
  width: number,
  height: number,
  config: BeadabilityConfig = {}
): (BrandColor | null)[] {
  let result = mergeSmallComponents(grid, labels, width, height, config);

  if (config.enableMajorityFilter !== false) {
    result = majorityFilter(result, labels, width, height, config.protectedLabels ?? ['feature']);
  }

  if (config.enableHoleRepair !== false) {
    result = repairOneCellHoles(result, width, height);
  }

  return result;
}
