import { create } from 'zustand';
import { PipelineOutput } from '@pxlbeads/shared';

interface ProjectState {
  imageData: ImageData | null;
  result: PipelineOutput | null;
  setImageData: (data: ImageData | null) => void;
  setResult: (result: PipelineOutput | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  imageData: null,
  result: null,
  setImageData: (data) => set({ imageData: data }),
  setResult: (result) => set({ result }),
}));
