import { describe, expect, it } from 'vitest';
import { findConnectedComponents } from '../../src/engine/connectedComponents';

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

function makeColor(brand: string, code: string) {
  return { brand, code, rgb: [0, 0, 0] as [number, number, number], lab: [0, 0, 0] as [number, number, number] };
}

describe('findConnectedComponents', () => {
  it('finds one component for uniform color', () => {
    const color = makeColor('TEST', 'A');
    const grid = [color, color, color, color];
    const components = findConnectedComponents(grid, 2, 2, 4);
    expect(components).toHaveLength(1);
    expect(components[0].size).toBe(4);
  });

  it('finds two separate components for same color not touching', () => {
    const color = makeColor('TEST', 'A');
    const grid = [color, null, null, color];
    const components = findConnectedComponents(grid, 2, 2, 4);
    expect(components).toHaveLength(2);
    expect(components.every((c) => c.size === 1)).toBe(true);
  });

  it('treats diagonals as connected with 8-connectivity', () => {
    const color = makeColor('TEST', 'A');
    const grid = [color, null, null, color];
    const components = findConnectedComponents(grid, 2, 2, 8);
    expect(components).toHaveLength(1);
  });
});
