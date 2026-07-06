import { describe, expect, it } from 'vitest';
import { cleanIsolatedPoints } from '../../src/engine/cleanIsolatedPoints';
import { BrandColor } from '@pxlbeads/shared';

describe('cleanIsolatedPoints', () => {
  const red: BrandColor = { brand: 'TEST', code: 'R', rgb: [255, 0, 0], lab: [53.24, 80.09, 67.20] };
  const blue: BrandColor = { brand: 'TEST', code: 'B', rgb: [0, 0, 255], lab: [32.30, 79.19, -107.86] };

  it('replaces a single isolated point with its most frequent neighbor', () => {
    // 3x3 grid with a single blue point in the center
    const grid = Array(9).fill(red);
    grid[4] = blue;
    const cleaned = cleanIsolatedPoints(grid, 3, 3, 1);
    expect(cleaned[4]).toBe(red);
  });

  it('does not modify connected regions', () => {
    // 2x2 blue block in a 3x3 red grid
    const grid = Array(9).fill(red);
    grid[3] = blue;
    grid[4] = blue;
    grid[6] = blue;
    grid[7] = blue;
    const cleaned = cleanIsolatedPoints(grid, 3, 3, 1);
    expect(cleaned[3]).toBe(blue);
    expect(cleaned[4]).toBe(blue);
  });
});
