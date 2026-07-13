import { Lab } from '@pxlbeads/shared';
import { deltaE2000 } from './ciede2000';

export interface KMeansResult {
  centroids: Lab[];
  labels: number[];
}

function distanceSq(a: Lab, b: Lab): number {
  return deltaE2000(a, b) ** 2;
}

function kMeansPlusPlus(pixels: Lab[], k: number): Lab[] {
  const centroids: Lab[] = [];
  const firstIdx = Math.floor(Math.random() * pixels.length);
  centroids.push(pixels[firstIdx]);

  while (centroids.length < k) {
    const distances = pixels.map((p) => {
      const minDist = Math.min(...centroids.map((c) => distanceSq(p, c)));
      return minDist;
    });

    const total = distances.reduce((sum, d) => sum + d, 0);
    let threshold = Math.random() * total;
    let selected = 0;
    for (let i = 0; i < distances.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        selected = i;
        break;
      }
    }

    centroids.push(pixels[selected]);
  }

  return centroids;
}

export function kmeans(
  pixels: Lab[],
  k: number,
  maxIterations = 30,
  seed?: number
): KMeansResult {
  if (seed !== undefined) {
    // Deterministic seed not implemented; k-means++ uses Math.random
    void seed;
  }

  if (k >= pixels.length) {
    return { centroids: pixels.slice(0, k), labels: pixels.map((_, i) => i) };
  }

  let centroids = kMeansPlusPlus(pixels, k);
  let labels = new Array(pixels.length).fill(0);
  let changed = true;
  let iteration = 0;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Assignment step with CIEDE2000
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestDist = deltaE2000(pixels[i], centroids[0]);
      for (let j = 1; j < centroids.length; j++) {
        const dist = deltaE2000(pixels[i], centroids[j]);
        if (dist < bestDist) {
          bestDist = dist;
          best = j;
        }
      }
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    }

    // Update step: mean Lab of assigned pixels
    const sums: Lab[] = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Array(k).fill(0);

    for (let i = 0; i < pixels.length; i++) {
      const label = labels[i];
      sums[label][0] += pixels[i][0];
      sums[label][1] += pixels[i][1];
      sums[label][2] += pixels[i][2];
      counts[label]++;
    }

    for (let j = 0; j < k; j++) {
      if (counts[j] > 0) {
        centroids[j] = [
          sums[j][0] / counts[j],
          sums[j][1] / counts[j],
          sums[j][2] / counts[j],
        ];
      }
    }
  }

  return { centroids, labels };
}
