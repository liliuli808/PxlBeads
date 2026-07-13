import { BrandColor, PATTERN_MODE_CONFIG, PatternMode, PatternModeConfig, PipelineInput, PipelineOutput } from '@pxlbeads/shared';
import { modeDownsample } from './downsample';
import { enhanceEdges, floodFillBackground, posterize } from './photoProcessing';
import { QuantizeOptions } from './quantizeToBrand';
import { quantizeToBrand } from './quantizeToBrand';
import { renderPattern } from './renderPattern';
import { normalizeImage } from './inputNormalizer';
import { analyzeSemantics } from './semanticAnalyzer';
import { semanticDownsample } from './semanticDownsampler';
import { quantizeSemanticGrid } from './semanticQuantizer';
import { optimizeBeadability } from './beadabilityOptimizer';
import { protectFeatures } from './featureProtector';
import { evaluateQuality } from './qualityEvaluator';

const WORK_SCALE = 4;

function getForegroundBounds(imageData: ImageData): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const { width, height, data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] >= 128) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function trimForeground(imageData: ImageData): ImageData {
  const bounds = getForegroundBounds(imageData);
  if (!bounds) return imageData;

  const { width, data } = imageData;
  const { minX, minY, maxX, maxY } = bounds;
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const output = new ImageData(cropW, cropH);
  output.data.fill(0);

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = ((minY + y) * width + (minX + x)) * 4;
      const dstIdx = (y * cropW + x) * 4;
      output.data[dstIdx] = data[srcIdx];
      output.data[dstIdx + 1] = data[srcIdx + 1];
      output.data[dstIdx + 2] = data[srcIdx + 2];
      output.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return output;
}

function resizeCropManual(src: ImageData, targetSize: number, padPx: number): ImageData {
  const output = new ImageData(targetSize, targetSize);
  output.data.fill(0);

  const inner = Math.max(1, targetSize - padPx * 2);
  const scale = Math.max(inner / src.width, inner / src.height);
  const drawW = Math.max(1, Math.round(src.width * scale));
  const drawH = Math.max(1, Math.round(src.height * scale));
  const offsetX = padPx + Math.floor((inner - drawW) / 2);
  const offsetY = padPx + Math.floor((inner - drawH) / 2);

  for (let y = padPx; y < targetSize - padPx; y++) {
    for (let x = padPx; x < targetSize - padPx; x++) {
      const srcX = Math.floor((x - offsetX) / scale);
      const srcY = Math.floor((y - offsetY) / scale);
      if (srcX < 0 || srcY < 0 || srcX >= src.width || srcY >= src.height) {
        continue;
      }
      const srcIdx = (srcY * src.width + srcX) * 4;
      const dstIdx = (y * targetSize + x) * 4;
      output.data[dstIdx] = src.data[srcIdx];
      output.data[dstIdx + 1] = src.data[srcIdx + 1];
      output.data[dstIdx + 2] = src.data[srcIdx + 2];
      output.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }

  return output;
}

function drawImageDataToCanvas(
  src: ImageData,
  targetW: number,
  targetH: number,
  fit: 'cover' | 'contain',
  fill: [number, number, number, number] = [255, 255, 255, 255]
): ImageData {
  if (typeof OffscreenCanvas === 'undefined') {
    return resizeImageDataManual(src, targetW, targetH, fit, fill);
  }

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `rgba(${fill[0]}, ${fill[1]}, ${fill[2]}, ${fill[3] / 255})`;
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = false;

  const scale =
    fit === 'cover'
      ? Math.max(targetW / src.width, targetH / src.height)
      : Math.min(targetW / src.width, targetH / src.height);
  const drawW = Math.max(1, Math.round(src.width * scale));
  const drawH = Math.max(1, Math.round(src.height * scale));
  const offsetX = Math.floor((targetW - drawW) / 2);
  const offsetY = Math.floor((targetH - drawH) / 2);

  const srcCanvas = new OffscreenCanvas(src.width, src.height);
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(src, 0, 0);
  ctx.drawImage(srcCanvas, offsetX, offsetY, drawW, drawH);
  return ctx.getImageData(0, 0, targetW, targetH);
}

function resizeImageDataManual(
  src: ImageData,
  targetW: number,
  targetH: number,
  fit: 'cover' | 'contain',
  fill: [number, number, number, number]
): ImageData {
  const output = new ImageData(targetW, targetH);
  for (let i = 0; i < targetW * targetH; i++) {
    output.data[i * 4] = fill[0];
    output.data[i * 4 + 1] = fill[1];
    output.data[i * 4 + 2] = fill[2];
    output.data[i * 4 + 3] = fill[3];
  }

  const scale =
    fit === 'cover'
      ? Math.max(targetW / src.width, targetH / src.height)
      : Math.min(targetW / src.width, targetH / src.height);
  const drawW = Math.max(1, Math.round(src.width * scale));
  const drawH = Math.max(1, Math.round(src.height * scale));
  const offsetX = Math.floor((targetW - drawW) / 2);
  const offsetY = Math.floor((targetH - drawH) / 2);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.floor((x - offsetX) / scale);
      const srcY = Math.floor((y - offsetY) / scale);
      if (srcX < 0 || srcY < 0 || srcX >= src.width || srcY >= src.height) continue;
      const srcIdx = (srcY * src.width + srcX) * 4;
      const dstIdx = (y * targetW + x) * 4;
      output.data[dstIdx] = src.data[srcIdx];
      output.data[dstIdx + 1] = src.data[srcIdx + 1];
      output.data[dstIdx + 2] = src.data[srcIdx + 2];
      output.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }

  return output;
}

export function subjectFill(src: ImageData, targetSize: number, padRatio = 0.04): ImageData {
  const cropped = trimForeground(src);
  const padPx = Math.max(0, Math.floor(targetSize * padRatio));

  if (typeof OffscreenCanvas === 'undefined') {
    return resizeCropManual(cropped, targetSize, padPx);
  }

  const inner = Math.max(1, targetSize - padPx * 2);
  const scale = Math.max(inner / cropped.width, inner / cropped.height);
  const drawW = Math.max(1, Math.round(cropped.width * scale));
  const drawH = Math.max(1, Math.round(cropped.height * scale));
  const offsetX = padPx + Math.floor((inner - drawW) / 2);
  const offsetY = padPx + Math.floor((inner - drawH) / 2);

  const canvas = new OffscreenCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, targetSize, targetSize);
  ctx.imageSmoothingEnabled = false;

  const srcCanvas = new OffscreenCanvas(cropped.width, cropped.height);
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(cropped, 0, 0);
  ctx.drawImage(srcCanvas, offsetX, offsetY, drawW, drawH);

  return ctx.getImageData(0, 0, targetSize, targetSize);
}

function resolvePatternMode(patternMode: PatternMode | undefined): PatternMode {
  return patternMode ?? 'pattern';
}

export function prepareFullImageCanvas(input: PipelineInput): ImageData {
  return drawImageDataToCanvas(input.imageData, input.width * WORK_SCALE, input.height * WORK_SCALE, 'cover');
}

export function prepareSubjectCanvas(input: PipelineInput): ImageData {
  let processed = input.imageData;

  if (input.floodFillBackground) {
    processed = floodFillBackground(processed, input.backgroundTolerance ?? 32);
  }

  return subjectFill(
    processed,
    Math.max(input.width, input.height) * WORK_SCALE,
    input.detailEnhance ? 0.02 : 0.04
  );
}

export function preprocessStable(input: ImageData, config: PipelineInput, preset: PatternModeConfig): ImageData {
  let processed = input;
  const posterizeLevels = config.posterizeLevels ?? preset.posterizeLevels;

  if (posterizeLevels > 0) {
    processed = posterize(processed, posterizeLevels);
  }

  const edgeThreshold = config.edgeThreshold ?? preset.edgeThreshold;
  const edgeDarken = config.edgeDarken ?? preset.edgeDarken;
  if (config.mode === 'smart' && edgeThreshold !== undefined && edgeDarken !== undefined) {
    processed = enhanceEdges(processed, edgeThreshold, edgeDarken);
  }

  return processed;
}

export function sampleGrid(input: ImageData, config: PipelineInput, preset: PatternModeConfig) {
  return modeDownsample(
    input,
    config.width,
    config.height,
    config.fgThreshold ?? preset.fgThreshold,
    config.quantizationMask ?? preset.quantizationMask
  );
}

export function quantizeGrid(
  grid: ReturnType<typeof sampleGrid>,
  palette: BrandColor[],
  config: PipelineInput,
  preset: PatternModeConfig
) {
  const options: QuantizeOptions = {};
  const ditherStrength = config.ditherStrength ?? preset.ditherStrength;
  const confettiMinRatio = config.confettiMinRatio ?? preset.confettiMinRatio;

  if (config.dither === true && ditherStrength > 0) {
    options.dither = true;
    options.ditherStrength = ditherStrength;
  }

  if (confettiMinRatio > 0) {
    options.confettiMinRatio = confettiMinRatio;
  }

  return quantizeToBrand(grid, palette, config.maxColors ?? preset.maxColors, options);
}

export function renderPreview(input: PipelineInput, grid: PipelineOutput['grid']): ImageData {
  const canvas = renderPattern(grid, input.width, input.height, {
    cellSize: 28,
    showGrid: true,
    showCodes: false,
    showLabels: false,
    beadStyle: input.beadStyle ?? 'square',
    bgColor: '#F5E6C8',
  });
  const ctx = canvas.getContext('2d')!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function runSemanticPipeline(
  input: PipelineInput,
  palette: BrandColor[],
  onProgress?: (phase: string, percent: number) => void
): PipelineOutput {
  onProgress?.('预处理', 0.1);
  const normalized = normalizeImage(input.imageData, {
    maxDimension: Math.max(input.width, input.height) * 4,
    backgroundColor: '#ffffff',
    applyBilateral: input.style !== 'realistic',
    bilateralSpatialSigma: input.style === 'illustration' ? 3 : 2,
    bilateralColorSigma: input.style === 'illustration' ? 48 : 32,
  });

  onProgress?.('语义分析', 0.25);
  const semantic = analyzeSemantics(normalized.imageData, { regionCount: 6 });

  onProgress?.('语义下采样', 0.4);
  const gridPixels = semanticDownsample(
    normalized.imageData,
    semantic,
    input.width,
    input.height
  ).flat();

  onProgress?.('量化', 0.55);
  const detailLevel = input.detailLevel ?? 'standard';
  const minComponentSize =
    detailLevel === 'simple' ? 4 : detailLevel === 'fine' ? 2 : 3;

  const { grid: flatGrid, usedPalette, stats } = quantizeSemanticGrid(gridPixels, palette, {
    maxColors: input.maxColors,
    dither: input.dither,
    ditherStrength: input.ditherStrength,
    confettiMinRatio: input.confettiMinRatio ?? 0,
  });

  onProgress?.('可拼性优化', 0.7);
  let optimizedGrid = optimizeBeadability(flatGrid, semantic.labels, input.width, input.height, {
    minComponentSize,
    protectedLabels: input.faceEnhance !== 'off' ? ['feature'] : [],
    maxIterations: detailLevel === 'fine' ? 5 : 3,
  });

  if (input.faceEnhance !== 'off') {
    onProgress?.('五官保护', 0.85);
    optimizedGrid = protectFeatures(
      optimizedGrid,
      semantic.labels,
      input.width,
      input.height,
      palette,
      {
        minEyeWidth: input.faceEnhance === 'strong' ? 3 : 2,
        minEyeHeight: input.faceEnhance === 'strong' ? 3 : 2,
        minMouthWidth: input.faceEnhance === 'strong' ? 4 : 3,
      }
    );
  }

  onProgress?.('渲染', 0.95);
  const preview = renderPreview(input, optimizedGrid);
  const quality = evaluateQuality(
    optimizedGrid,
    semantic.labels,
    input.width,
    input.height,
    input.maxColors
  );

  onProgress?.('完成', 1);

  return {
    grid: optimizedGrid,
    width: input.width,
    height: input.height,
    palette: usedPalette,
    stats,
    preview,
    beadStyle: input.beadStyle ?? 'square',
    quality,
    semanticLabels: semantic.labels,
  };
}

export async function runPipeline(
  input: PipelineInput,
  palette: BrandColor[],
  onProgress?: (phase: string, percent: number) => void
): Promise<PipelineOutput> {
  if (input.useSemanticPipeline) {
    return runSemanticPipeline(input, palette, onProgress);
  }

  const patternMode = resolvePatternMode(input.patternMode);
  const preset = PATTERN_MODE_CONFIG[patternMode];

  onProgress?.('预处理', 0.1);
  const prepared = preset.subjectFill ? prepareSubjectCanvas(input) : prepareFullImageCanvas(input);
  const processed = preprocessStable(prepared, input, preset);

  onProgress?.('下采样', 0.3);
  const grid = sampleGrid(processed, input, preset);

  onProgress?.('量化', 0.5);
  const { grid: flatGrid, usedPalette, stats } = quantizeGrid(grid, palette, input, preset);

  onProgress?.('渲染', 0.95);
  const preview = renderPreview(input, flatGrid);

  onProgress?.('完成', 1);

  return {
    grid: flatGrid,
    width: input.width,
    height: input.height,
    palette: usedPalette,
    stats,
    preview,
    beadStyle: input.beadStyle ?? 'square',
  };
}
