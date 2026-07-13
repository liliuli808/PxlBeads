import { RGB } from '@pxlbeads/shared';

export type OKLab = [number, number, number];

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function fromLinear(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function rgbToOklab(rgb: RGB): OKLab {
  const r = toLinear(rgb[0] / 255);
  const g = toLinear(rgb[1] / 255);
  const b = toLinear(rgb[2] / 255);

  // Linear sRGB to LMS
  const lms0 = 0.8189330101 * r + 0.3618667424 * g - 0.1288597137 * b;
  const lms1 = 0.0329845436 * r + 0.9293118715 * g + 0.0361456387 * b;
  const lms2 = 0.0482003018 * r + 0.2643662691 * g + 0.6338517070 * b;

  const l = Math.cbrt(lms0);
  const m = Math.cbrt(lms1);
  const s = Math.cbrt(lms2);

  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

export function oklabToRgb(oklab: OKLab): RGB {
  const l = oklab[0] + 0.3963377774 * oklab[1] + 0.2158037573 * oklab[2];
  const m = oklab[0] - 0.1055613458 * oklab[1] - 0.0638541728 * oklab[2];
  const s = oklab[0] - 0.0894841775 * oklab[1] - 1.2914855480 * oklab[2];

  const lms0 = Math.pow(l, 3);
  const lms1 = Math.pow(m, 3);
  const lms2 = Math.pow(s, 3);

  const r = 1.227013851 * lms0 - 0.557799288 * lms1 + 0.281256149 * lms2;
  const g = -0.040580178 * lms0 + 1.112256869 * lms1 - 0.071676678 * lms2;
  const b = -0.076381284 * lms0 - 0.421481978 * lms1 + 1.586163220 * lms2;

  return [
    Math.round(fromLinear(r) * 255),
    Math.round(fromLinear(g) * 255),
    Math.round(fromLinear(b) * 255),
  ];
}

export function deltaEOklab(a: OKLab, b: OKLab): number {
  const dL = a[0] - b[0];
  const dA = a[1] - b[1];
  const dB = a[2] - b[2];
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}
