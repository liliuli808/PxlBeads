import { describe, expect, it } from 'vitest';
import { enhanceEdges, floodFillBackground, posterize } from '../../src/engine/photoProcessing';

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

function makeImageData(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]) {
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

describe('photoProcessing', () => {
  it('floodFillBackground makes continuous edge background transparent', () => {
    const image = makeImageData(5, 5, (x, y) =>
      x === 2 && y === 2 ? [200, 80, 20, 255] : [250, 250, 250, 255]
    );
    const result = floodFillBackground(image, 8);

    expect(result.data[3]).toBe(0);
    expect(result.data[(2 * 5 + 2) * 4 + 3]).toBe(255);
  });

  it('floodFillBackground keeps the source when every opaque pixel would be removed', () => {
    const image = makeImageData(4, 4, () => [180, 180, 180, 255]);
    const result = floodFillBackground(image, 8);

    expect(Array.from(result.data)).toEqual(Array.from(image.data));
  });

  it('posterize reduces channel values to fixed tonal levels', () => {
    const image = makeImageData(1, 1, () => [120, 140, 250, 255]);
    const result = posterize(image, 4);

    expect(Array.from(result.data.slice(0, 4))).toEqual([85, 170, 255, 255]);
  });

  it('enhanceEdges darkens strong Sobel edges without changing alpha', () => {
    const image = makeImageData(5, 5, (x) => (x < 2 ? [20, 20, 20, 255] : [240, 240, 240, 255]));
    const result = enhanceEdges(image, 20, 0.5);
    const edgeIdx = (2 * 5 + 2) * 4;

    expect(result.data[edgeIdx]).toBeLessThan(image.data[edgeIdx]);
    expect(result.data[edgeIdx + 3]).toBe(255);
  });
});
