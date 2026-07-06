import { describe, expect, it } from 'vitest';
import { runPipeline } from '../../src/engine/pipeline';
import { BrandColor } from '@pxlbeads/shared';

if (typeof ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: PredefinedColorSpace;
    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number, _?: ImageDataSettings) {
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

// Minimal Canvas 2D context mock for jsdom
class MockContext {
  private width: number;
  private height: number;
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  fillRect() {}
  strokeRect() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  fillText() {}

  getImageData() {
    return new ImageData(new Uint8ClampedArray(this.width * this.height * 4), this.width, this.height);
  }
}

beforeAll(() => {
  globalThis.HTMLCanvasElement.prototype.getContext = function (type: string) {
    if (type === '2d') {
      return new MockContext(this.width, this.height) as unknown as CanvasRenderingContext2D;
    }
    return null;
  };
});

function createImageData(width: number, height: number, r: number, g: number, b: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return new ImageData(data, width, height);
}

describe('runPipeline integration', () => {
  const red: BrandColor = { brand: 'TEST', code: 'R', rgb: [255, 0, 0], lab: [53.24, 80.09, 67.20] };
  const blue: BrandColor = { brand: 'TEST', code: 'B', rgb: [0, 0, 255], lab: [32.30, 79.19, -107.86] };

  it('processes a 29x29 image with a two-color palette', async () => {
    const imageData = createImageData(100, 100, 255, 0, 0);
    const result = await runPipeline(
      {
        imageData,
        width: 29,
        height: 29,
        brand: 'TEST',
        maxColors: 2,
        mode: 'fast',
      },
      [red, blue]
    );

    expect(result.grid).toHaveLength(29 * 29);
    expect(result.stats.total).toBe(29 * 29);
    expect(result.palette.length).toBeLessThanOrEqual(2);
    expect(result.preview.width).toBeGreaterThan(29 * 12);
  });

  it('uses at most maxColors from the palette', async () => {
    const imageData = createImageData(50, 50, 0, 0, 255);
    const result = await runPipeline(
      {
        imageData,
        width: 10,
        height: 10,
        brand: 'TEST',
        maxColors: 1,
        mode: 'fast',
      },
      [red, blue]
    );

    expect(result.palette.length).toBeLessThanOrEqual(1);
    expect(result.grid.every((c) => c.code === result.palette[0].code)).toBe(true);
  });
});
