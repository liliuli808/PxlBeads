import { RGB, Lab } from '@pxlbeads/shared';

export function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return [r, g, b];
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function fromLinear(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function rgbToLab(rgb: RGB): Lab {
  const r = toLinear(rgb[0] / 255);
  const g = toLinear(rgb[1] / 255);
  const b = toLinear(rgb[2] / 255);

  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

  const xRef = 0.95047;
  const yRef = 1.0;
  const zRef = 1.08883;

  const kappa = 903.3;
  const threshold = 0.008856;

  const fx = x / xRef > threshold ? Math.cbrt(x / xRef) : (kappa * x / xRef + 16) / 116;
  const fy = y / yRef > threshold ? Math.cbrt(y / yRef) : (kappa * y / yRef + 16) / 116;
  const fz = z / zRef > threshold ? Math.cbrt(z / zRef) : (kappa * z / zRef + 16) / 116;

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return [l, a, bVal];
}

export function labToRgb(lab: Lab): RGB {
  const fy = (lab[0] + 16) / 116;
  const fx = lab[1] / 500 + fy;
  const fz = fy - lab[2] / 200;

  const kappa = 903.3;

  const xRef = 0.95047;
  const yRef = 1.0;
  const zRef = 1.08883;

  const x = fx > 0.2068966 ? Math.pow(fx, 3) : (116 * fx - 16) / kappa;
  const y = lab[0] > 8 ? Math.pow((lab[0] + 16) / 116, 3) : lab[0] / kappa;
  const z = fz > 0.2068966 ? Math.pow(fz, 3) : (116 * fz - 16) / kappa;

  const xr = x * xRef;
  const yr = y * yRef;
  const zr = z * zRef;

  const r = xr * 3.2404542 + yr * -1.5371385 + zr * -0.4985314;
  const g = xr * -0.9692660 + yr * 1.8760108 + zr * 0.0415560;
  const b = xr * 0.0556434 + yr * -0.2040259 + zr * 1.0572252;

  return [
    Math.round(fromLinear(r) * 255),
    Math.round(fromLinear(g) * 255),
    Math.round(fromLinear(b) * 255),
  ];
}
