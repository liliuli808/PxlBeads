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

function resizeImageDataNearestNeighbor(src: ImageData, targetW: number, targetH: number): ImageData {
  const output = new ImageData(targetW, targetH);
  const scaleX = src.width / targetW;
  const scaleY = src.height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(src.width - 1, Math.floor(x * scaleX));
      const srcY = Math.min(src.height - 1, Math.floor(y * scaleY));
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
    scaled = resizeImageDataNearestNeighbor(composed, targetW, targetH);
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
