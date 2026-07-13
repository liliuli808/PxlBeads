import { BrandColor } from '@pxlbeads/shared';
import { SemanticLabel } from './semanticAnalyzer';
import { findConnectedComponents } from './connectedComponents';
import { rgbToOklab, deltaEOklab, OKLab } from './oklab';

export interface FeatureProtectorConfig {
  minEyeWidth?: number;
  minEyeHeight?: number;
  minMouthWidth?: number;
}

function ensureOklab(color: BrandColor): OKLab {
  return color.oklab ?? rgbToOklab(color.rgb);
}

function paletteKey(color: BrandColor): string {
  return `${color.brand}:${color.code}`;
}

function findDarkestAndLightest(colors: BrandColor[]): {
  darkest: BrandColor;
  lightest: BrandColor;
} {
  const sorted = [...colors].sort((a, b) => ensureOklab(a)[0] - ensureOklab(b)[0]);
  return {
    darkest: sorted[0],
    lightest: sorted[sorted.length - 1],
  };
}

function getRegionColors(
  grid: (BrandColor | null)[],
  pixels: { x: number; y: number }[],
  width: number
): BrandColor[] {
  const seen = new Set<string>();
  const colors: BrandColor[] = [];

  for (const { x, y } of pixels) {
    const color = grid[y * width + x];
    if (!color) continue;
    const key = paletteKey(color);
    if (seen.has(key)) continue;
    seen.add(key);
    colors.push(color);
  }

  return colors;
}

function protectFeatureRegion(
  grid: (BrandColor | null)[],
  component: { pixels: { x: number; y: number }[]; boundingBox: { minX: number; minY: number; maxX: number; maxY: number } },
  width: number,
  palette: BrandColor[]
): (BrandColor | null)[] {
  const result = grid.slice();
  const colors = getRegionColors(grid, component.pixels, width);
  if (colors.length <= 1) {
    // Inject contrast: choose a darker/lighter bead from the palette.
    const existing = colors[0];
    const existingOklab = existing ? ensureOklab(existing) : [0.5, 0, 0];

    const candidates = palette.filter((c) => {
      const oklab = ensureOklab(c);
      return Math.abs(oklab[0] - existingOklab[0]) > 0.15;
    });

    if (candidates.length > 0 && existing) {
      const contrast = candidates.sort(
        (a, b) =>
          Math.abs(ensureOklab(a)[0] - existingOklab[0]) -
          Math.abs(ensureOklab(b)[0] - existingOklab[0])
      )[candidates.length - 1];

      // Place contrast color near the center of the component.
      const cx = Math.floor((component.boundingBox.minX + component.boundingBox.maxX) / 2);
      const cy = Math.floor((component.boundingBox.minY + component.boundingBox.maxY) / 2);
      const centerIdx = cy * width + cx;
      if (result[centerIdx]) {
        result[centerIdx] = contrast;
      }
    }

    return result;
  }

  // If there are multiple colors but they are all similar in brightness,
  // keep the darkest and lightest, merge the middle ones to the nearest extreme.
  const { darkest, lightest } = findDarkestAndLightest(colors);
  if (deltaEOklab(ensureOklab(darkest), ensureOklab(lightest)) < 0.15) {
    // Not enough contrast. Replace a central pixel with the palette extreme.
    const darker = palette.filter((c) => ensureOklab(c)[0] < ensureOklab(darkest)[0] - 0.1);
    if (darker.length > 0) {
      const cx = Math.floor((component.boundingBox.minX + component.boundingBox.maxX) / 2);
      const cy = Math.floor((component.boundingBox.minY + component.boundingBox.maxY) / 2);
      const centerIdx = cy * width + cx;
      if (result[centerIdx]) {
        result[centerIdx] = darker.sort((a, b) => ensureOklab(a)[0] - ensureOklab(b)[0])[0];
      }
    }
  }

  return result;
}

export function protectFeatures(
  grid: (BrandColor | null)[],
  labels: SemanticLabel[],
  width: number,
  height: number,
  palette: BrandColor[],
  config: FeatureProtectorConfig = {}
): (BrandColor | null)[] {
  const components = findConnectedComponents(grid, width, height, 8);
  let result = grid.slice();

  for (const component of components) {
    const samplePixel = component.pixels[0];
    const label = labels[samplePixel.y * width + samplePixel.x];
    if (label !== 'feature') continue;

    const boxW = component.boundingBox.maxX - component.boundingBox.minX + 1;
    const boxH = component.boundingBox.maxY - component.boundingBox.minY + 1;

    if (boxW < (config.minEyeWidth ?? 2) || boxH < (config.minEyeHeight ?? 2)) {
      continue;
    }

    result = protectFeatureRegion(result, component, width, palette);
  }

  return result;
}
