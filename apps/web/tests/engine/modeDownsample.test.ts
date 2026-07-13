import { describe, expect, it } from 'vitest';
import { modeDownsample } from '../../src/engine/downsample';

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

function makeImageData(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y);
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }
  return new ImageData(data, width, height);
}

describe('modeDownsample', () => {
  it('returns the most frequent color in a fully opaque cell', () => {
    const image = makeImageData(4, 4, (x) => (x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
    const grid = modeDownsample(image, 2, 2, 0.4);
    // 255 & 0xF8 === 248 due to 32-level quantization
    expect(grid[0][0]).toEqual([248, 0, 0]); // left column majority red
    expect(grid[0][1]).toEqual([0, 0, 248]); // right column majority blue
  });

  it('returns null for cells with too little foreground', () => {
    const image = makeImageData(4, 4, (x, y) => (x === 0 && y === 0 ? [255, 0, 0, 255] : [0, 0, 0, 0]));
    const grid = modeDownsample(image, 2, 2, 0.4);
    // top-left cell has 1/4 foreground (25%) < 40%
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBeNull();
    expect(grid[1][0]).toBeNull();
    expect(grid[1][1]).toBeNull();
  });

  it('respects fgThreshold', () => {
    // 4x4 image, top-left cell has 1 red pixel out of 4 (25% foreground)
    const image = makeImageData(4, 4, (x, y) => (x === 0 && y === 0 ? [255, 0, 0, 255] : [0, 0, 0, 0]));
    const lowThreshold = modeDownsample(image, 2, 2, 0.1);
    expect(lowThreshold[0][0]).toEqual([248, 0, 0]);

    const highThreshold = modeDownsample(image, 2, 2, 0.5);
    expect(highThreshold[0][0]).toBeNull();
  });

  it('quantizes colors to 32 levels', () => {
    // 0xF8 mask keeps top 5 bits, so 255 stays 255, 250 becomes 248
    const image = makeImageData(2, 2, () => [250, 250, 250, 255]);
    const grid = modeDownsample(image, 1, 1, 0.4);
    expect(grid[0][0]).toEqual([248, 248, 248]);
  });

  it('supports 16-level quantization for realistic photos', () => {
    const image = makeImageData(2, 2, () => [250, 180, 90, 255]);
    const grid = modeDownsample(image, 1, 1, 0.3, 0xf0);
    expect(grid[0][0]).toEqual([240, 176, 80]);
  });
});
