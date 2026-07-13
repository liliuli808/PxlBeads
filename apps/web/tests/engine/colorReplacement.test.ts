import { describe, expect, it } from 'vitest';
import { BrandColor, PipelineOutput } from '@pxlbeads/shared';
import { applyColorReplacements } from '../../src/engine/colorReplacement';

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

describe('colorReplacement', () => {
  const red: BrandColor = { brand: 'TEST', code: 'R', rgb: [255, 0, 0], lab: [53, 80, 67] };
  const blue: BrandColor = { brand: 'TEST', code: 'B', rgb: [0, 0, 255], lab: [32, 79, -108] };
  const brown: BrandColor = { brand: 'TEST', code: 'BR', rgb: [120, 72, 40], lab: [35, 18, 25] };

  function makeResult(): PipelineOutput {
    return {
      grid: [red, blue, red, null],
      width: 2,
      height: 2,
      palette: [red, blue],
      stats: {
        counts: {
          'TEST:R': 2,
          'TEST:B': 1,
        },
        total: 3,
        actualColors: 2,
      },
      preview: new ImageData(1, 1),
    };
  }

  it('replaces a used color and rebuilds palette statistics', () => {
    const replaced = applyColorReplacements(makeResult(), {
      'TEST:R': brown,
    });

    expect(replaced.grid).toEqual([brown, blue, brown, null]);
    expect(replaced.palette.map((color) => color.code)).toEqual(['BR', 'B']);
    expect(replaced.stats.counts).toEqual({
      'TEST:BR': 2,
      'TEST:B': 1,
    });
    expect(replaced.stats.total).toBe(3);
    expect(replaced.stats.actualColors).toBe(2);
  });
});
