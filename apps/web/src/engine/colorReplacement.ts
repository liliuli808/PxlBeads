import { BrandColor, PipelineOutput } from '@pxlbeads/shared';
import { colorKey } from './assemblyPlanner';

export type ColorReplacementMap = Record<string, BrandColor>;

function rebuildStatsAndPalette(grid: (BrandColor | null)[]) {
  const counts: Record<string, number> = {};
  const palette = new Map<string, BrandColor>();
  let total = 0;

  for (const color of grid) {
    if (!color) continue;
    const key = colorKey(color);
    counts[key] = (counts[key] ?? 0) + 1;
    palette.set(key, color);
    total++;
  }

  return {
    palette: Array.from(palette.values()),
    stats: {
      counts,
      total,
      actualColors: palette.size,
    },
  };
}

export function applyColorReplacements(
  result: PipelineOutput,
  replacements: ColorReplacementMap
): PipelineOutput {
  if (Object.keys(replacements).length === 0) return result;

  const grid = result.grid.map((color) => {
    if (!color) return null;
    return replacements[colorKey(color)] ?? color;
  });
  const { palette, stats } = rebuildStatsAndPalette(grid);

  return {
    ...result,
    grid,
    palette,
    stats: {
      ...stats,
      avgDeltaE: result.stats.avgDeltaE,
    },
  };
}
