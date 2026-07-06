import { BrandColor } from '@pxlbeads/shared';

export function cleanIsolatedPoints(
  grid: (BrandColor | null)[],
  width: number,
  height: number,
  passes = 2
): (BrandColor | null)[] {
  const result = grid.slice();

  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const current = result[idx];
        if (!current) continue;

        const neighbors: BrandColor[] = [];

        if (x > 0) {
          const n = result[idx - 1];
          if (n) neighbors.push(n);
        }
        if (x < width - 1) {
          const n = result[idx + 1];
          if (n) neighbors.push(n);
        }
        if (y > 0) {
          const n = result[(y - 1) * width + x];
          if (n) neighbors.push(n);
        }
        if (y < height - 1) {
          const n = result[(y + 1) * width + x];
          if (n) neighbors.push(n);
        }

        if (neighbors.length === 0) continue;

        const allDifferent = neighbors.every(
          (n) => n.brand !== current.brand || n.code !== current.code
        );

        if (allDifferent) {
          // Replace with most frequent neighbor
          const counts = new Map<string, { color: BrandColor; count: number }>();
          for (const n of neighbors) {
            const key = `${n.brand}:${n.code}`;
            const existing = counts.get(key);
            if (existing) {
              existing.count++;
            } else {
              counts.set(key, { color: n, count: 1 });
            }
          }
          const best = Array.from(counts.values()).sort((a, b) => b.count - a.count)[0];
          result[idx] = best.color;
        }
      }
    }
  }

  return result;
}
