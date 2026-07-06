import { BrandColor, PipelineInput, PipelineOutput } from '@pxlbeads/shared';
import { bilateralFilter } from './bilateral';
import { cleanIsolatedPoints } from './cleanIsolatedPoints';
import { downsample, downsampleAlpha } from './downsample';
import { quantizeToBrand } from './quantizeToBrand';
import { renderPattern } from './renderPattern';
import { hexToRgb } from './colorSpace';

function hasTransparency(imageData: ImageData): boolean {
  const { data } = imageData;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function fitImageToSize(
  imageData: ImageData,
  targetW: number,
  targetH: number,
  transparentFill: boolean
): ImageData {
  const output = new ImageData(targetW, targetH);
  const bg = transparentFill ? [255, 255, 255, 0] : [...hexToRgb('#ffffff'), 255];

  for (let i = 0; i < targetW * targetH; i++) {
    output.data[i * 4] = bg[0];
    output.data[i * 4 + 1] = bg[1];
    output.data[i * 4 + 2] = bg[2];
    output.data[i * 4 + 3] = bg[3];
  }

  const scale = Math.min(targetW / imageData.width, targetH / imageData.height);
  const drawW = Math.round(imageData.width * scale);
  const drawH = Math.round(imageData.height * scale);
  const offsetX = Math.floor((targetW - drawW) / 2);
  const offsetY = Math.floor((targetH - drawH) / 2);

  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const srcX = Math.min(imageData.width - 1, Math.round(x / scale));
      const srcY = Math.min(imageData.height - 1, Math.round(y / scale));
      const srcIdx = (srcY * imageData.width + srcX) * 4;
      const dstIdx = ((offsetY + y) * targetW + (offsetX + x)) * 4;
      output.data[dstIdx] = imageData.data[srcIdx];
      output.data[dstIdx + 1] = imageData.data[srcIdx + 1];
      output.data[dstIdx + 2] = imageData.data[srcIdx + 2];
      output.data[dstIdx + 3] = imageData.data[srcIdx + 3];
    }
  }

  return output;
}

function removeBackgroundColor(
  imageData: ImageData,
  bgColorHex: string,
  threshold: number
): ImageData {
  const output = new ImageData(imageData.width, imageData.height);
  output.data.set(imageData.data);
  const bg = hexToRgb(bgColorHex);

  for (let i = 0; i < imageData.width * imageData.height; i++) {
    const idx = i * 4;
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];

    const dist = Math.sqrt(
      (r - bg[0]) ** 2 +
      (g - bg[1]) ** 2 +
      (b - bg[2]) ** 2
    );

    if (dist <= threshold) {
      output.data[idx + 3] = 0;
    }
  }

  return output;
}

function computeStats(grid: (BrandColor | null)[]): { counts: Record<string, number>; total: number; actualColors: number } {
  const counts: Record<string, number> = {};
  const usedSet = new Map<string, BrandColor>();
  let total = 0;

  for (const color of grid) {
    if (!color) continue;
    const key = `${color.brand}:${color.code}`;
    counts[key] = (counts[key] || 0) + 1;
    usedSet.set(key, color);
    total++;
  }

  return { counts, total, actualColors: usedSet.size };
}

export async function runPipeline(
  input: PipelineInput,
  palette: BrandColor[],
  onProgress?: (phase: string, percent: number) => void
): Promise<PipelineOutput> {
  const { imageData, width, height, maxColors, mode } = input;
  const shouldRemoveBackground = !!(input.removeBackground && input.backgroundColor);
  const transparentFill = hasTransparency(imageData) || shouldRemoveBackground;

  onProgress?.('预处理', 0.1);
  let processed = imageData;
  if (mode === 'smart') {
    processed = bilateralFilter(imageData, 2, 40, (p) => onProgress?.('预处理', 0.1 + p * 0.2));
  }

  onProgress?.('下采样', 0.3);
  let fitted = fitImageToSize(processed, width, height, transparentFill);
  if (shouldRemoveBackground) {
    fitted = removeBackgroundColor(fitted, input.backgroundColor!, input.backgroundThreshold ?? 40);
  }
  const pixels = downsample(fitted, width, height);
  const alpha = downsampleAlpha(fitted, width, height);

  onProgress?.('量化', 0.5);
  const { grid, usedPalette } = quantizeToBrand(pixels, palette, maxColors, mode, alpha);

  onProgress?.('清理孤点', 0.8);
  const cleaned = cleanIsolatedPoints(grid, width, height, 2);

  onProgress?.('渲染', 0.95);
  const canvas = renderPattern(cleaned, width, height, {
    cellSize: 28,
    showGrid: true,
    showCodes: false,
    showLabels: true,
  });
  const ctx = canvas.getContext('2d')!;
  const preview = ctx.getImageData(0, 0, canvas.width, canvas.height);

  onProgress?.('完成', 1);

  const stats = computeStats(cleaned);

  return {
    grid: cleaned,
    width,
    height,
    palette: usedPalette,
    stats,
    preview,
  };
}
