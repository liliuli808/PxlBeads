import { Lab, RGB } from '@pxlbeads/shared';
import { kmeans } from './kmeans';
import { rgbToLab } from './colorSpace';

export type SemanticLabel =
  | 'background'
  | 'skin'
  | 'hair'
  | 'clothes'
  | 'feature';

export interface SemanticData {
  width: number;
  height: number;
  labels: SemanticLabel[];
  importance: Float32Array;
  edgeMap: Float32Array;
}

export interface SemanticAnalyzerConfig {
  regionCount?: number;
  seed?: number;
}

function rgbToLabCached(rgb: RGB): Lab {
  return rgbToLab(rgb);
}

function computeEdgeMap(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const edges = new Float32Array(width * height);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
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
      edges[y * width + x] = Math.sqrt(sx * sx + sy * sy) / 255;
    }
  }

  return edges;
}

interface RegionStats {
  index: number;
  centroid: Lab;
  pixelCount: number;
  avgBrightness: number;
  avgA: number;
  avgB: number;
  centerX: number;
  centerY: number;
  edgeCoverage: number;
}

function assignSemanticLabels(
  regionStats: RegionStats[],
  width: number,
  height: number
): Map<number, SemanticLabel> {
  // Sort by brightness descending.
  const sorted = [...regionStats].sort((a, b) => b.avgBrightness - a.avgBrightness);
  const assignments = new Map<number, SemanticLabel>();

  // Heuristic mapping based on brightness, color, position, and edge coverage.
  for (const region of sorted) {
    const cx = region.centerX / width;
    const cy = region.centerY / height;
    const isCenter = cx > 0.25 && cx < 0.75 && cy > 0.15 && cy < 0.85;
    const isSkinLike = region.avgA > 5 && region.avgA < 35 && region.avgB > 10 && region.avgB < 40;
    const isHairDark = region.avgBrightness < 70;
    const isBackgroundBright = region.avgBrightness > 160;
    const highEdge = region.edgeCoverage > 0.15;
    const smallRegion = region.pixelCount / (width * height) < 0.08;

    let label: SemanticLabel;
    if (isBackgroundBright && !isCenter) {
      label = 'background';
    } else if (isSkinLike && isCenter && !highEdge) {
      label = 'skin';
    } else if (highEdge && smallRegion && isCenter) {
      label = 'feature';
    } else if (isHairDark && (cy < 0.55 || !isCenter)) {
      label = 'hair';
    } else {
      label = 'clothes';
    }

    assignments.set(region.index, label);
  }

  return assignments;
}

export function analyzeSemantics(
  imageData: ImageData,
  config: SemanticAnalyzerConfig = {}
): SemanticData {
  const { width, height, data } = imageData;
  const regionCount = config.regionCount ?? 6;

  const pixels: Lab[] = [];
  for (let i = 0; i < data.length; i += 4) {
    pixels.push(rgbToLabCached([data[i], data[i + 1], data[i + 2]]));
  }

  // Subsample for k-means speed.
  const sampleStep = Math.max(1, Math.floor(Math.sqrt(pixels.length / 20000)));
  const sampled: Lab[] = [];
  for (let i = 0; i < pixels.length; i += sampleStep) {
    sampled.push(pixels[i]);
  }

  const { centroids } = kmeans(sampled, Math.min(regionCount, sampled.length), 30, config.seed);

  // Build per-pixel labels using nearest centroid.
  const pixelCluster = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const lab = rgbToLabCached([data[i], data[i + 1], data[i + 2]]);
    let best = 0;
    let bestDist = Infinity;
    for (let c = 0; c < centroids.length; c++) {
      // Fast squared Lab distance is enough for cluster assignment.
      const dl = lab[0] - centroids[c][0];
      const da = lab[1] - centroids[c][1];
      const db = lab[2] - centroids[c][2];
      const dist = dl * dl + da * da + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    pixelCluster[p] = best;
  }

  // Compute region statistics.
  const regionStats: RegionStats[] = centroids.map((centroid, index) => ({
    index,
    centroid,
    pixelCount: 0,
    avgBrightness: 0,
    avgA: 0,
    avgB: 0,
    centerX: 0,
    centerY: 0,
    edgeCoverage: 0,
  }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const cluster = pixelCluster[p];
      const r = data[p * 4];
      const g = data[p * 4 + 1];
      const b = data[p * 4 + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      const lab = rgbToLabCached([r, g, b]);

      const stats = regionStats[cluster];
      stats.pixelCount++;
      stats.avgBrightness += brightness;
      stats.avgA += lab[1];
      stats.avgB += lab[2];
      stats.centerX += x;
      stats.centerY += y;
    }
  }

  const edgeMap = computeEdgeMap(imageData);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const cluster = pixelCluster[p];
      regionStats[cluster].edgeCoverage += edgeMap[p];
    }
  }

  for (const stats of regionStats) {
    if (stats.pixelCount > 0) {
      stats.avgBrightness /= stats.pixelCount;
      stats.avgA /= stats.pixelCount;
      stats.avgB /= stats.pixelCount;
      stats.centerX /= stats.pixelCount;
      stats.centerY /= stats.pixelCount;
      stats.edgeCoverage /= stats.pixelCount;
    }
  }

  const clusterToSemantic = assignSemanticLabels(regionStats, width, height);

  // Map per-pixel cluster to semantic label.
  const labels: SemanticLabel[] = new Array(width * height);
  for (let p = 0; p < width * height; p++) {
    labels[p] = clusterToSemantic.get(pixelCluster[p]) ?? 'background';
  }

  // Build importance map.
  const importance = new Float32Array(width * height);
  const cx = width / 2;
  const cy = height * 0.45;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  const labelWeights: Record<SemanticLabel, number> = {
    feature: 1.0,
    hair: 0.6,
    skin: 0.5,
    clothes: 0.3,
    background: 0.05,
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      const centerWeight = 1 - dist * 0.5;
      importance[p] = Math.min(
        1,
        edgeMap[p] * 0.35 +
          labelWeights[labels[p]] * 0.4 +
          centerWeight * 0.25
      );
    }
  }

  return {
    width,
    height,
    labels,
    importance,
    edgeMap,
  };
}
