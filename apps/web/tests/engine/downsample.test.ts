import { describe, expect, it } from 'vitest';
import { downsample } from '../../src/engine/downsample';

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

function createSolidImageData(width: number, height: number, r: number, g: number, b: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return new ImageData(data, width, height);
}

describe('downsample', () => {
  it('downsamples a solid color image to the same color', () => {
    const imageData = createSolidImageData(100, 100, 128, 64, 192);
    const result = downsample(imageData, 10, 10);
    expect(result).toHaveLength(100);
    expect(result[0]).toEqual([128, 64, 192]);
  });

  it('returns the correct number of pixels for arbitrary sizes', () => {
    const imageData = createSolidImageData(50, 30, 255, 255, 255);
    const result = downsample(imageData, 5, 3);
    expect(result).toHaveLength(15);
  });

  it('averages a two-color horizontal split', () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x < 2) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
        } else {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
        }
        data[idx + 3] = 255;
      }
    }
    const imageData = new ImageData(data, width, height);
    const result = downsample(imageData, 2, 1);
    expect(result).toHaveLength(2);
    // Left half should be black-ish, right half white-ish
    expect(result[0][0]).toBeLessThan(50);
    expect(result[1][0]).toBeGreaterThan(200);
  });
});
