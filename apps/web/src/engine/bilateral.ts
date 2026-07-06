export function bilateralFilter(
  imageData: ImageData,
  sigmaSpatial: number,
  sigmaColor: number,
  onProgress?: (percent: number) => void
): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const radius = Math.ceil(sigmaSpatial * 2);

  for (let y = 0; y < height; y++) {
    if (onProgress && y % 5 === 0) {
      onProgress(y / height);
    }

    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let weightSum = 0;

      const centerIdx = (y * width + x) * 4;
      const cR = data[centerIdx];
      const cG = data[centerIdx + 1];
      const cB = data[centerIdx + 2];

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const idx = (py * width + px) * 4;

          const dr = cR - data[idx];
          const dg = cG - data[idx + 1];
          const db = cB - data[idx + 2];
          const colorDistSq = dr * dr + dg * dg + db * db;
          const spatialDistSq = kx * kx + ky * ky;

          const weight =
            Math.exp(-spatialDistSq / (2 * sigmaSpatial * sigmaSpatial)) *
            Math.exp(-colorDistSq / (2 * sigmaColor * sigmaColor));

          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          weightSum += weight;
        }
      }

      output.data[centerIdx] = Math.round(r / weightSum);
      output.data[centerIdx + 1] = Math.round(g / weightSum);
      output.data[centerIdx + 2] = Math.round(b / weightSum);
      output.data[centerIdx + 3] = data[centerIdx + 3];
    }
  }

  return output;
}
