import { create } from 'zustand';
import { PipelineOutput } from '@pxlbeads/shared';

interface ProjectState {
  imageData: ImageData | null;
  originalImageData: ImageData | null;
  result: PipelineOutput | null;
  setImageData: (data: ImageData | null) => void;
  setSourceImageData: (data: ImageData | null) => void;
  resetImageData: () => void;
  setResult: (result: PipelineOutput | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  imageData: null,
  originalImageData: null,
  result: null,
  setImageData: (data) => set({ imageData: data, result: null }),
  setSourceImageData: (data) => set({ imageData: data, originalImageData: data, result: null }),
  resetImageData: () => set({ imageData: get().originalImageData, result: null }),
  setResult: (result) => set({ result }),
}));
