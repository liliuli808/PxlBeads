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
}

export interface ProcessConfig {
  width: number;
  height: number;
  brand: string;
  maxColors: number;
  mode: 'fast' | 'smart';
  removeBackground?: boolean;
  backgroundColor?: string;
  backgroundThreshold?: number;
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
}

export interface RenderOptions {
  cellSize: number;
  showGrid: boolean;
  showCodes: boolean;
  showLabels?: boolean;
  bgColor?: string;
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
