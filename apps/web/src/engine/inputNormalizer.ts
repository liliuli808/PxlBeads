import { bilateralFilter } from './bilateral';

export interface NormalizeConfig {
  maxDimension?: number;
  backgroundColor?: string;
  bilateralSpatialSigma?: number;
  bilateralColorSigma?: number;
  applyBilateral?: boolean;
}

export interface NormalizedImage {
  imageData: ImageData;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    scaledWidth: number;
    scaledHeight: number;
  };
}

function parseBackgroundColor(color: string): [number, number, number] {
  const normalized = color.replace('#', '');
  return [
    parseInt(normalized.substring(0, 2), 16),
    parseInt(normalized.substring(2, 4), 16),
    parseInt(normalized.substring(4, 6), 16),
  ];
}

function resizeImageData(src: ImageData, targetW: number, targetH: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = src.width;
  srcCanvas.height = src.height;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(src, 0, 0);

  ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH);
}

export function normalizeImage(
  imageData: ImageData,
  config: NormalizeConfig = {}
): NormalizedImage {
  const {
    maxDimension = 1024,
    backgroundColor = '#ffffff',
    bilateralSpatialSigma = 2,
    bilateralColorSigma = 32,
    applyBilateral = true,
  } = config;

  const { width, height, data } = imageData;
  const [bgR, bgG, bgB] = parseBackgroundColor(backgroundColor);

  // Compose transparent pixels onto background color.
  const composed = new ImageData(new Uint8ClampedArray(data), width, height);
  for (let i = 0; i < composed.data.length; i += 4) {
    const alpha = composed.data[i + 3] / 255;
    if (alpha < 1) {
      composed.data[i] = Math.round(composed.data[i] * alpha + bgR * (1 - alpha));
      composed.data[i + 1] = Math.round(composed.data[i + 1] * alpha + bgG * (1 - alpha));
      composed.data[i + 2] = Math.round(composed.data[i + 2] * alpha + bgB * (1 - alpha));
      composed.data[i + 3] = 255;
    }
  }

  // Clamp to max processing dimension while keeping aspect ratio.
  let scaled = composed;
  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    scaled = resizeImageData(composed, targetW, targetH);
  }

  // Mild bilateral denoising to remove skin/background speckles while
  // preserving eyes, hairlines and clothing edges.
  const denoised = applyBilateral
    ? bilateralFilter(scaled, bilateralSpatialSigma, bilateralColorSigma)
    : scaled;

  return {
    imageData: denoised,
    metadata: {
      originalWidth: width,
      originalHeight: height,
      scaledWidth: denoised.width,
      scaledHeight: denoised.height,
    },
  };
}
