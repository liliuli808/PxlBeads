import { describe, expect, it } from 'vitest';
import { quantizeToBrand } from '../../src/engine/quantizeToBrand';
import { BrandColor } from '@pxlbeads/shared';

describe('quantizeToBrand', () => {
  const red: BrandColor = { brand: 'TEST', code: 'R', rgb: [255, 0, 0], lab: [53.24, 80.09, 67.20] };
  const blue: BrandColor = { brand: 'TEST', code: 'B', rgb: [0, 0, 255], lab: [32.30, 79.19, -107.86] };
  const white: BrandColor = { brand: 'TEST', code: 'W', rgb: [255, 255, 255], lab: [100, 0, 0] };
  const black: BrandColor = { brand: 'TEST', code: 'K', rgb: [0, 0, 0], lab: [0, 0, 0] };

  it('maps two-color synthetic image with two-color palette exactly in fast mode', () => {
    const pixels: [number, number, number][] = [
      [255, 0, 0],
      [255, 0, 0],
      [0, 0, 255],
      [0, 0, 255],
    ];
    const { grid, usedPalette, stats } = quantizeToBrand(pixels, [red, blue], 2, 'fast');
    expect(grid).toHaveLength(4);
    expect(usedPalette).toHaveLength(2);
    expect(stats.total).toBe(4);
    expect(stats.counts[`TEST:R`]).toBe(2);
    expect(stats.counts[`TEST:B`]).toBe(2);
  });

  it('reduces palette to maxColors in fast mode', () => {
    const pixels: [number, number, number][] = [
      [255, 0, 0],
      [255, 0, 0],
      [255, 0, 0],
      [0, 0, 255],
    ];
    const { usedPalette } = quantizeToBrand(pixels, [red, blue, white, black], 2, 'fast');
    expect(usedPalette.length).toBeLessThanOrEqual(2);
  });

  it('uses only allowed brand colors', () => {
    const pixels: [number, number, number][] = [[128, 128, 128]];
    const { grid, usedPalette } = quantizeToBrand(pixels, [white, black], 2, 'fast');
    expect(usedPalette.length).toBe(1);
    expect(['W', 'K']).toContain(grid[0].code);
  });
});
