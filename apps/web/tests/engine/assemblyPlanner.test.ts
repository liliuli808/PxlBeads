import { describe, expect, it } from 'vitest';
import { BrandColor } from '@pxlbeads/shared';
import { buildBoardRegions, buildColorStats, colorKey } from '../../src/engine/assemblyPlanner';

describe('assemblyPlanner', () => {
  const red: BrandColor = { brand: 'TEST', code: 'R', rgb: [255, 0, 0], lab: [53, 80, 67] };
  const blue: BrandColor = { brand: 'TEST', code: 'B', rgb: [0, 0, 255], lab: [32, 79, -108] };

  it('splits a pattern into board regions with clipped edge boards', () => {
    expect(buildBoardRegions(5, 4, 2)).toEqual([
      { index: 0, row: 0, col: 0, x: 0, y: 0, width: 2, height: 2 },
      { index: 1, row: 0, col: 1, x: 2, y: 0, width: 2, height: 2 },
      { index: 2, row: 0, col: 2, x: 4, y: 0, width: 1, height: 2 },
      { index: 3, row: 1, col: 0, x: 0, y: 2, width: 2, height: 2 },
      { index: 4, row: 1, col: 1, x: 2, y: 2, width: 2, height: 2 },
      { index: 5, row: 1, col: 2, x: 4, y: 2, width: 1, height: 2 },
    ]);
  });

  it('summarizes total and current-board color counts', () => {
    const grid = [
      red, red, blue,
      null, blue, blue,
      red, null, blue,
    ];
    const board = buildBoardRegions(3, 3, 2)[0];
    const stats = buildColorStats(grid, [red, blue], 3, board);

    expect(stats.map((stat) => [stat.key, stat.total, stat.boardCount])).toEqual([
      [colorKey(blue), 4, 1],
      [colorKey(red), 3, 2],
    ]);
  });
});
