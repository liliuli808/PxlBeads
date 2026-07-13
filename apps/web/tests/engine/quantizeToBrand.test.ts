import { describe, expect, it, vi } from 'vitest';
import { quantizeToBrand } from '../../src/engine/quantizeToBrand';
import { BrandColor } from '@pxlbeads/shared';

if (typeof ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: PredefinedColorSpace;
    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height ?? 1;
      }
      this.colorSpace = 'srgb';
    }
  } as unknown as typeof ImageData;
}

describe('quantizeToBrand', () => {
  const red: BrandColor = { brand: 'TEST', code: 'R', rgb: [255, 0, 0], lab: [53.24, 80.09, 67.20] };
  const blue: BrandColor = { brand: 'TEST', code: 'B', rgb: [0, 0, 255], lab: [32.30, 79.19, -107.86] };
  const green: BrandColor = { brand: 'TEST', code: 'G', rgb: [0, 255, 0], lab: [87.70, -86.18, 83.18] };
  const white: BrandColor = { brand: 'TEST', code: 'W', rgb: [255, 255, 255], lab: [100, 0, 0] };
  const black: BrandColor = { brand: 'TEST', code: 'K', rgb: [0, 0, 0], lab: [0, 0, 0] };

  it('maps two-color grid with two-color palette exactly', () => {
    const grid: ([number, number, number] | null)[][] = [
      [red.rgb, red.rgb],
      [blue.rgb, blue.rgb],
    ];
    const { grid: flatGrid, usedPalette, stats } = quantizeToBrand(grid, [red, blue], 2);
    expect(flatGrid).toHaveLength(4);
    expect(usedPalette).toHaveLength(2);
    expect(stats.total).toBe(4);
    expect(stats.counts[`TEST:R`]).toBe(2);
    expect(stats.counts[`TEST:B`]).toBe(2);
    expect(stats.avgDeltaE).toBeDefined();
  });

  it('reduces palette to maxColors', () => {
    const grid: ([number, number, number] | null)[][] = [
      [red.rgb, red.rgb],
      [red.rgb, blue.rgb],
    ];
    const { usedPalette } = quantizeToBrand(grid, [red, blue, white, black], 1);
    expect(usedPalette.length).toBeLessThanOrEqual(1);
  });

  it('uses only allowed brand colors', () => {
    const grid: ([number, number, number] | null)[][] = [[[128, 128, 128]]];
    const { grid: flatGrid, usedPalette } = quantizeToBrand(grid, [white, black], 2);
    expect(usedPalette.length).toBe(1);
    expect(['W', 'K']).toContain(flatGrid[0]?.code);
  });

  it('ignores null cells in stats', () => {
    const grid: ([number, number, number] | null)[][] = [
      [red.rgb, null],
      [null, blue.rgb],
    ];
    const { grid: flatGrid, stats } = quantizeToBrand(grid, [red, blue], 2);
    expect(flatGrid).toHaveLength(4);
    expect(stats.total).toBe(2);
    expect(stats.avgDeltaE).toBeDefined();
  });

  it('cleans low-ratio confetti colors into the nearest kept color', () => {
    const grid: ([number, number, number] | null)[][] = [
      [red.rgb, red.rgb],
      [red.rgb, blue.rgb],
    ];
    const { stats } = quantizeToBrand(grid, [red, blue], 4, { confettiMinRatio: 0.3 });

    expect(stats.total).toBe(4);
    expect(stats.actualColors).toBe(1);
    expect(stats.counts['TEST:R']).toBe(4);
  });

  it('dithers only non-null low-resolution cells with allowed palette colors', () => {
    const grid: ([number, number, number] | null)[][] = [
      [[230, 20, 20], null],
      [[120, 20, 140], [20, 20, 230]],
    ];
    const { grid: flatGrid, stats } = quantizeToBrand(grid, [red, blue], 2, {
      dither: true,
      ditherStrength: 1,
    });

    expect(flatGrid[1]).toBeNull();
    expect(stats.total).toBe(3);
    expect(flatGrid.filter(Boolean).every((color) => ['R', 'B'].includes(color!.code))).toBe(true);
  });

  it('can snap cells to the nearest reduced palette color after color reduction', () => {
    const grid: ([number, number, number] | null)[][] = [
      [[250, 20, 20], [20, 20, 250]],
      [[230, 30, 30], [30, 30, 230]],
    ];
    const mapped = quantizeToBrand(grid, [red, blue], 2, {
      snapToReducedPalette: true,
    });

    expect(mapped.stats.counts['TEST:R']).toBe(2);
    expect(mapped.stats.counts['TEST:B']).toBe(2);
    expect(mapped.grid.map((color) => color?.code)).toEqual(['R', 'B', 'R', 'B']);
  });

  it('preserves obvious nearest brand colors before reducing the palette', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const grid: ([number, number, number] | null)[][] = [
        [[250, 10, 10], [245, 20, 20], [240, 30, 30]],
        [[20, 20, 240], [30, 230, 30], [250, 20, 20]],
      ];
      const mapped = quantizeToBrand(grid, [red, blue, green], 2);

      expect(mapped.grid.map((color) => color?.code)).toContain('B');
      expect(mapped.stats.counts['TEST:R']).toBe(4);
      expect(mapped.stats.counts['TEST:B']).toBe(2);
      expect(mapped.usedPalette.map((color) => color.code)).toEqual(['R', 'B']);
    } finally {
      random.mockRestore();
    }
  });
});
