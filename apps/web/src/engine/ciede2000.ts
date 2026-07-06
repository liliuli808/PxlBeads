import { Lab } from '@pxlbeads/shared';

/**
 * CIEDE2000 color difference.
 * Reference: Sharma, G. (2004) "The CIEDE2000 Color-Difference Formula"
 */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const CBar = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(CBar, 7) / (Math.pow(CBar, 7) + Math.pow(25, 7))));

  const a1Prime = a1 * (1 + G);
  const a2Prime = a2 * (1 + G);

  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  const h1Prime = (Math.atan2(b1, a1Prime) * 180) / Math.PI;
  const h2Prime = (Math.atan2(b2, a2Prime) * 180) / Math.PI;

  const H1Prime = h1Prime < 0 ? h1Prime + 360 : h1Prime;
  const H2Prime = h2Prime < 0 ? h2Prime + 360 : h2Prime;

  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  let deltaHPrime: number;
  if (C1Prime === 0 || C2Prime === 0) {
    deltaHPrime = 0;
  } else {
    if (Math.abs(H1Prime - H2Prime) <= 180) {
      deltaHPrime = H2Prime - H1Prime;
    } else if (H2Prime <= H1Prime) {
      deltaHPrime = H2Prime - H1Prime + 360;
    } else {
      deltaHPrime = H2Prime - H1Prime - 360;
    }
  }

  const deltaHPrimeRad = (deltaHPrime * Math.PI) / 180;

  const LBarPrime = (L1 + L2) / 2;
  const CBarPrime = (C1Prime + C2Prime) / 2;

  let HBarPrime: number;
  if (C1Prime === 0 || C2Prime === 0) {
    HBarPrime = H1Prime + H2Prime;
  } else {
    if (Math.abs(H1Prime - H2Prime) <= 180) {
      HBarPrime = (H1Prime + H2Prime) / 2;
    } else if (H1Prime + H2Prime < 360) {
      HBarPrime = (H1Prime + H2Prime + 360) / 2;
    } else {
      HBarPrime = (H1Prime + H2Prime - 360) / 2;
    }
  }

  const T =
    1 -
    0.17 * Math.cos(((HBarPrime - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * HBarPrime * Math.PI) / 180) +
    0.32 * Math.cos(((3 * HBarPrime + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * HBarPrime - 63) * Math.PI) / 180);

  const theta = 30 * Math.exp(-Math.pow((HBarPrime - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(CBarPrime, 7) / (Math.pow(CBarPrime, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(LBarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LBarPrime - 50, 2));
  const SC = 1 + 0.045 * CBarPrime;
  const SH = 1 + 0.015 * CBarPrime * T;
  const RT = -Math.sin((2 * theta * Math.PI) / 180) * Rc;

  const dL = deltaLPrime / (kL * SL);
  const dC = deltaCPrime / (kC * SC);
  const dH = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(deltaHPrimeRad / 2) / (kH * SH);

  return Math.sqrt(dL * dL + dC * dC + dH * dH + RT * dC * dH);
}
