import { describe, expect, it } from 'vitest';
import { hexToRgb, labToRgb, rgbToHex, rgbToLab } from '../../src/engine/colorSpace';

describe('rgbToLab / labToRgb', () => {
  it('converts white to Lab(100, 0, 0)', () => {
    const [l, a, b] = rgbToLab([255, 255, 255]);
    expect(l).toBeCloseTo(100, 0);
    expect(a).toBeCloseTo(0, 0);
    expect(b).toBeCloseTo(0, 0);
  });

  it('converts red approximately', () => {
    const [l, a, b] = rgbToLab([255, 0, 0]);
    expect(l).toBeCloseTo(53.24, 1);
    expect(a).toBeCloseTo(80.09, 1);
    expect(b).toBeCloseTo(67.20, 1);
  });

  it('round-trips RGB within tolerance', () => {
    const original: [number, number, number] = [123, 200, 45];
    const lab = rgbToLab(original);
    const recovered = labToRgb(lab);
    expect(recovered[0]).toBeCloseTo(original[0], -1);
    expect(recovered[1]).toBeCloseTo(original[1], -1);
    expect(recovered[2]).toBeCloseTo(original[2], -1);
  });
});

describe('hex helpers', () => {
  it('converts hex to rgb', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255]);
  });

  it('converts rgb to hex', () => {
    expect(rgbToHex([255, 0, 0])).toBe('#ff0000');
    expect(rgbToHex([0, 255, 0])).toBe('#00ff00');
    expect(rgbToHex([0, 0, 255])).toBe('#0000ff');
  });
});
