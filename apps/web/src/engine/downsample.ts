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
