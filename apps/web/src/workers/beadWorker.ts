import { BrandColor, PipelineOutput, ProcessConfig, RenderOptions, WorkerRequest, WorkerResponse } from '@pxlbeads/shared';
import { runPipeline } from '../engine/pipeline';
import { renderPattern } from '../engine/renderPattern';

let cachedImageData: ImageData | null = null;
let cachedPalette: BrandColor[] | null = null;
let cachedConfig: ProcessConfig | null = null;
let cachedResult: PipelineOutput | null = null;

function post(msg: WorkerResponse) {
  console.log('[worker] send', msg.type, msg);
  self.postMessage(msg);
}

async function renderPreviewBlob(result: PipelineOutput, options: RenderOptions): Promise<Blob> {
  const canvas = renderPattern(result.grid, result.width, result.height, options);
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/png' });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export preview'));
    }, 'image/png');
  });
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, payload } = event.data;
  console.log('[worker] receive', type, payload);

  try {
    switch (type) {
      case 'LOAD_IMAGE': {
        cachedImageData = payload.imageData;
        cachedConfig = null;
        cachedResult = null;
        post({ type: 'IMAGE_LOADED', payload: { width: payload.imageData.width, height: payload.imageData.height } });
        break;
      }

      case 'SET_PALETTE': {
        cachedPalette = payload.palette;
        post({ type: 'PALETTE_SET', payload: { count: payload.palette.length } });
        break;
      }

      case 'PROCESS': {
        if (!cachedImageData) throw new Error('No image loaded');
        if (!cachedPalette) throw new Error('No palette set');
        cachedConfig = payload;
        const result = await runPipeline(
          { ...payload, imageData: cachedImageData },
          cachedPalette,
          (phase, percent) => post({ type: 'PROGRESS', payload: { phase, percent } })
        );
        cachedResult = result;
        post({ type: 'RESULT', payload: result });
        break;
      }

      case 'REQUANTIZE': {
        if (!cachedConfig || !cachedImageData) throw new Error('No previous process run');
        if (!cachedPalette) throw new Error('No palette set');
        const config: ProcessConfig = {
          ...cachedConfig,
          brand: payload.brand,
          maxColors: payload.maxColors,
          mode: payload.mode,
        };
        cachedConfig = config;
        const result = await runPipeline(
          { ...config, imageData: cachedImageData },
          cachedPalette,
          (phase, percent) => post({ type: 'PROGRESS', payload: { phase, percent } })
        );
        cachedResult = result;
        post({ type: 'RESULT', payload: result });
        break;
      }

      case 'EXPORT_PREVIEW': {
        if (!cachedResult) throw new Error('No result to export');
        const blob = await renderPreviewBlob(cachedResult, payload);
        post({ type: 'EXPORT_READY', payload: { blob } });
        break;
      }

      default: {
        throw new Error(`Unknown worker message type: ${type as string}`);
      }
    }
  } catch (err) {
    post({ type: 'ERROR', payload: { message: err instanceof Error ? err.message : String(err) } });
  }
};

export {};
