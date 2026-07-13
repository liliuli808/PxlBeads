export function floodFillBackground(src: ImageData, tolerance = 32): ImageData {
  const { width, height, data } = src;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const visited = new Uint8Array(width * height);
  const stack: { pos: number; seed: [number, number, number] }[] = [];

  const sample = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2]];
  };

  const nearSeed = (x: number, y: number, seed: [number, number, number]) => {
    const current = sample(x, y);
    return (
      Math.abs(current[0] - seed[0]) +
        Math.abs(current[1] - seed[1]) +
        Math.abs(current[2] - seed[2]) <=
      tolerance * 3
    );
  };

  const pushIf = (x: number, y: number, seed: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pos = y * width + x;
    if (visited[pos]) return;
    if (!nearSeed(x, y, seed)) return;
    visited[pos] = 1;
    stack.push({ pos, seed });
  };

  for (let x = 0; x < width; x++) {
    pushIf(x, 0, sample(x, 0) as [number, number, number]);
    pushIf(x, height - 1, sample(x, height - 1) as [number, number, number]);
  }
  for (let y = 0; y < height; y++) {
    pushIf(0, y, sample(0, y) as [number, number, number]);
    pushIf(width - 1, y, sample(width - 1, y) as [number, number, number]);
  }

  while (stack.length) {
    const { pos, seed } = stack.pop()!;
    const x = pos % width;
    const y = (pos / width) | 0;
    out.data[pos * 4 + 3] = 0;
    pushIf(x + 1, y, seed);
    pushIf(x - 1, y, seed);
    pushIf(x, y + 1, seed);
    pushIf(x, y - 1, seed);
  }

  let cleared = 0;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= 128) opaque++;
  }
  for (let i = 3; i < out.data.length; i += 4) {
    if (data[i] >= 128 && out.data[i] < 128) cleared++;
  }

  if (opaque === 0 || cleared === opaque || cleared / opaque > 0.98) {
    return src;
  }

  return out;
}

export function posterize(src: ImageData, levels = 8): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const safeLevels = Math.max(2, levels);
  const step = 255 / (safeLevels - 1);
  const { data } = out;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    data[i] = Math.round(Math.round(data[i] / step) * step);
    data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
    data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
  }

  return out;
}

export function enhanceEdges(src: ImageData, threshold = 90, darken = 0.55): ImageData {
  const { width, height, data } = src;
  const gray = new Float32Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = data[i + 3] < 128 ? 255 : 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const factor = Math.max(0, Math.min(1, darken));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const centerIdx = (y * width + x) * 4;
      if (out.data[centerIdx + 3] < 128) continue;

      let sx = 0;
      let sy = 0;
      let k = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++, k++) {
          const value = gray[(y + oy) * width + (x + ox)];
          sx += value * gx[k];
          sy += value * gy[k];
        }
      }

      if (Math.sqrt(sx * sx + sy * sy) > threshold) {
        out.data[centerIdx] = Math.round(out.data[centerIdx] * factor);
        out.data[centerIdx + 1] = Math.round(out.data[centerIdx + 1] * factor);
        out.data[centerIdx + 2] = Math.round(out.data[centerIdx + 2] * factor);
      }
    }
  }

  return out;
}
