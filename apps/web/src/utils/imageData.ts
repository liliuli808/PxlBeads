export const MAX_WORKING_IMAGE_DIMENSION = 512;

export function imageDataToPngDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建图片画布');
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function imageBitmapToImageData(
  bitmap: ImageBitmap,
  maxDimension = MAX_WORKING_IMAGE_DIMENSION,
): ImageData {
  let { width, height } = bitmap;

  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建图片画布');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export async function imageSourceToImageData(
  source: string,
  maxDimension = MAX_WORKING_IMAGE_DIMENSION,
): Promise<ImageData> {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error('无法读取生成图片');
  }

  const bitmap = await createImageBitmap(await response.blob());
  try {
    return imageBitmapToImageData(bitmap, maxDimension);
  } finally {
    bitmap.close?.();
  }
}
