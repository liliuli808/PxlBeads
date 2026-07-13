import { describe, expect, it } from 'vitest';
import { createProcessConfigForMode, PATTERN_MODE_CONFIG } from '@pxlbeads/shared';
import { preprocessStable } from '../../src/engine/pipeline';

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

function onePixel(r: number, g: number, b: number): ImageData {
  return new ImageData(new Uint8ClampedArray([r, g, b, 255]), 1, 1);
}

describe('photo color fidelity defaults', () => {
  it('uses higher color count and flat preview by default for photo patterns', () => {
    const config = createProcessConfigForMode('pattern');

    expect(config.maxColors).toBe(40);
    expect(config.posterizeLevels).toBe(0);
    expect(config.beadStyle).toBe('square');
  });

  it('does not posterize muted photo colors in default pattern mode', () => {
    const source = onePixel(157, 143, 126);
    const config = { ...createProcessConfigForMode('pattern'), imageData: source };
    const processed = preprocessStable(source, config, PATTERN_MODE_CONFIG.pattern);

    expect(Array.from(processed.data.slice(0, 4))).toEqual([157, 143, 126, 255]);
  });
});
