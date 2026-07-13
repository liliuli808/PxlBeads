import { describe, expect, it } from 'vitest';
import { rgbToOklab, oklabToRgb, deltaEOklab } from '../../src/engine/oklab';

describe('oklab', () => {
  it('converts sRGB white to high lightness OKLab', () => {
    const oklab = rgbToOklab([255, 255, 255]);
    expect(oklab[0]).toBeGreaterThan(0.95);
    expect(Math.abs(oklab[1])).toBeLessThan(0.05);
    expect(Math.abs(oklab[2])).toBeLessThan(0.05);
  });

  it('converts sRGB black to near-zero lightness OKLab', () => {
    const oklab = rgbToOklab([0, 0, 0]);
    expect(oklab[0]).toBeLessThan(0.05);
  });

  it('round-trips RGB through OKLab within tolerance', () => {
    const original: [number, number, number] = [123, 200, 80];
    const oklab = rgbToOklab(original);
    const recovered = oklabToRgb(oklab);
    expect(recovered[0]).toBeCloseTo(original[0], -1);
    expect(recovered[1]).toBeCloseTo(original[1], -1);
    expect(recovered[2]).toBeCloseTo(original[2], -1);
  });

  it('computes larger distance for more perceptually different colors', () => {
    const white = rgbToOklab([255, 255, 255]);
    const black = rgbToOklab([0, 0, 0]);
    const darkGray = rgbToOklab([64, 64, 64]);
    expect(deltaEOklab(white, black)).toBeGreaterThan(deltaEOklab(white, darkGray));
  });
});
