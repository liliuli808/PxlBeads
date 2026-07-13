export type RGB = [number, number, number];
export type Lab = [number, number, number];

export interface BrandColor {
  brand: string;
  code: string;
  name?: string;
  rgb: RGB;
  lab: Lab;
}

export interface BeadStats {
  counts: Record<string, number>;
  total: number;
  actualColors: number;
  avgDeltaE?: number;
}

export type PatternMode = 'pattern' | 'subject' | 'logo';

export interface PatternModeConfig {
  label: string;
  size: number;
  maxColors: number;
  mode: 'fast' | 'smart';
  subjectFill: boolean;
  fgThreshold: number;
  quantizationMask: number;
  posterizeLevels: number;
  edgeThreshold?: number;
  edgeDarken?: number;
  dither: boolean;
  ditherStrength: number;
  confettiMinRatio: number;
  floodFillBackground: boolean;
  backgroundTolerance: number;
}

export const PATTERN_MODE_CONFIG: Record<PatternMode, PatternModeConfig> = {
  pattern: {
    label: '整图图纸',
    size: 80,
    maxColors: 40,
    mode: 'smart',
    subjectFill: false,
    fgThreshold: 0,
    quantizationMask: 0xf0,
    posterizeLevels: 0,
    dither: false,
    ditherStrength: 0.25,
    confettiMinRatio: 0,
    floodFillBackground: false,
    backgroundTolerance: 32,
  },
  subject: {
    label: '主体特写',
    size: 90,
    maxColors: 28,
    mode: 'smart',
    subjectFill: true,
    fgThreshold: 0.2,
    quantizationMask: 0xf0,
    posterizeLevels: 8,
    edgeThreshold: 80,
    edgeDarken: 0.7,
    dither: false,
    ditherStrength: 0.35,
    confettiMinRatio: 0,
    floodFillBackground: false,
    backgroundTolerance: 32,
  },
  logo: {
    label: '卡通/Logo',
    size: 57,
    maxColors: 16,
    mode: 'fast',
    subjectFill: false,
    fgThreshold: 0,
    quantizationMask: 0xf8,
    posterizeLevels: 4,
    dither: false,
    ditherStrength: 0.2,
    confettiMinRatio: 0,
    floodFillBackground: false,
    backgroundTolerance: 32,
  },
};

export interface ProcessConfig {
  width: number;
  height: number;
  brand: string;
  maxColors: number;
  mode: 'fast' | 'smart';
  patternMode?: PatternMode;
  detailEnhance?: boolean;
  fgThreshold?: number;
  quantizationMask?: number;
  posterizeLevels?: number;
  edgeThreshold?: number;
  edgeDarken?: number;
  dither?: boolean;
  ditherStrength?: number;
  confettiMinRatio?: number;
  floodFillBackground?: boolean;
  backgroundTolerance?: number;
  beadStyle?: 'square' | 'round';
}

export function createProcessConfigForMode(patternMode: PatternMode, brand = 'mard'): ProcessConfig {
  const preset = PATTERN_MODE_CONFIG[patternMode];

  return {
    width: preset.size,
    height: preset.size,
    brand,
    maxColors: preset.maxColors,
    mode: preset.mode,
    patternMode,
    detailEnhance: patternMode === 'subject',
    fgThreshold: preset.fgThreshold,
    quantizationMask: preset.quantizationMask,
    posterizeLevels: preset.posterizeLevels,
    edgeThreshold: preset.edgeThreshold,
    edgeDarken: preset.edgeDarken,
    dither: preset.dither,
    ditherStrength: preset.ditherStrength,
    confettiMinRatio: preset.confettiMinRatio,
    floodFillBackground: preset.floodFillBackground,
    backgroundTolerance: preset.backgroundTolerance,
    beadStyle: 'square',
  };
}

export interface PipelineInput extends ProcessConfig {
  imageData: ImageData;
}

export interface PipelineOutput {
  grid: (BrandColor | null)[];
  width: number;
  height: number;
  palette: BrandColor[];
  stats: BeadStats;
  preview: ImageData;
  beadStyle?: 'square' | 'round';
}

export interface RenderOptions {
  cellSize: number;
  showGrid: boolean;
  showCodes: boolean;
  showLabels?: boolean;
  bgColor?: string;
  beadStyle?: 'square' | 'round';
  showLegend?: boolean;
  legendPalette?: BrandColor[];
  legendCounts?: Record<string, number>;
  gridColor?: string;
  gridLineWidth?: number;
}

export type WorkerRequest =
  | { type: 'LOAD_IMAGE'; payload: { imageData: ImageData } }
  | { type: 'SET_PALETTE'; payload: { palette: BrandColor[] } }
  | { type: 'PROCESS'; payload: ProcessConfig }
  | { type: 'REQUANTIZE'; payload: { brand: string; maxColors: number; mode: 'fast' | 'smart' } }
  | { type: 'EXPORT_PREVIEW'; payload: RenderOptions };

export type WorkerResponse =
  | { type: 'IMAGE_LOADED'; payload: { width: number; height: number } }
  | { type: 'PALETTE_SET'; payload: { count: number } }
  | { type: 'PROGRESS'; payload: { phase: string; percent: number } }
  | { type: 'RESULT'; payload: PipelineOutput }
  | { type: 'EXPORT_READY'; payload: { blob: Blob } }
  | { type: 'ERROR'; payload: { message: string } };

export interface ColorCardRecord {
  id: number;
  brand: string;
  code: string;
  name: string | null;
  rgbHex: string;
  labL: number;
  labA: number;
  labB: number;
  source: string | null;
  isApproximate: boolean;
}
