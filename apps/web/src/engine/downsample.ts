import { RGB } from '@pxlbeads/shared';

export function downsampleAlpha(imageData: ImageData, targetW: number, targetH: number): number[] {
  const { width, height, data } = imageData;
  const result: number[] = [];

  const scaleX = width / targetW;
  const scaleY = height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = x * scaleX;
      const srcY = y * scaleY;
      const srcX2 = Math.min(width, (x + 1) * scaleX);
      const srcY2 = Math.min(height, (y + 1) * scaleY);

      let alpha = 0;
      let count = 0;

      for (let sy = Math.floor(srcY); sy < srcY2; sy++) {
        for (let sx = Math.floor(srcX); sx < srcX2; sx++) {
          const idx = (sy * width + sx) * 4;
          alpha += data[idx + 3];
          count++;
        }
      }

      result.push(Math.round(alpha / count));
    }
  }

  return result;
}

export function downsample(imageData: ImageData, targetW: number, targetH: number): RGB[] {
  const { width, height, data } = imageData;
  const result: RGB[] = [];

  const scaleX = width / targetW;
  const scaleY = height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = x * scaleX;
      const srcY = y * scaleY;
      const srcX2 = Math.min(width, (x + 1) * scaleX);
      const srcY2 = Math.min(height, (y + 1) * scaleY);

      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let sy = Math.floor(srcY); sy < srcY2; sy++) {
        for (let sx = Math.floor(srcX); sx < srcX2; sx++) {
          const idx = (sy * width + sx) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }

      result.push([Math.round(r / count), Math.round(g / count), Math.round(b / count)]);
    }
  }

  return result;
}

export function modeDownsample(
  imageData: ImageData,
  targetW: number,
  targetH: number,
  fgThreshold = 0.4,
  quantizationMask = 0xf8
): (RGB | null)[][] {
  const { width, height, data } = imageData;
  const grid: (RGB | null)[][] = [];

  const cellW = width / targetW;
  const cellH = height / targetH;

  for (let gy = 0; gy < targetH; gy++) {
    const row: (RGB | null)[] = [];
    for (let gx = 0; gx < targetW; gx++) {
      const counter = new Map<string, { c: RGB; n: number }>();
      let fg = 0;
      let total = 0;

      const yStart = Math.floor(gy * cellH);
      const yEnd = Math.min(height, Math.floor((gy + 1) * cellH));
      const xStart = Math.floor(gx * cellW);
      const xEnd = Math.min(width, Math.floor((gx + 1) * cellW));

      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const idx = (y * width + x) * 4;
          total++;
          if (data[idx + 3] < 128) continue;
          fg++;
          const r = data[idx] & quantizationMask;
          const g = data[idx + 1] & quantizationMask;
          const b = data[idx + 2] & quantizationMask;
          const key = `${r},${g},${b}`;
          const hit = counter.get(key);
          if (hit) hit.n++;
          else counter.set(key, { c: [r, g, b], n: 1 });
        }
      }

      if (total === 0 || fg / total < fgThreshold) {
        row.push(null);
        continue;
      }

      let best: RGB | null = null;
      let max = -1;
      counter.forEach((v) => {
        if (v.n > max) {
          max = v.n;
          best = v.c;
        }
      });
      row.push(best);
    }
    grid.push(row);
  }

  return grid;
}
