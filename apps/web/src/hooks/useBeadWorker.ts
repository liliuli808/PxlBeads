import { useEffect, useRef, useState } from 'react';
import { BrandColor, PipelineOutput, ProcessConfig, RenderOptions, WorkerResponse } from '@pxlbeads/shared';

export interface UseBeadWorkerReturn {
  isProcessing: boolean;
  progress: { phase: string; percent: number } | null;
  result: PipelineOutput | null;
  error: string | null;
  loadImage: (file: File) => Promise<void>;
  loadImageFromData: (imageData: ImageData) => Promise<void>;
  setPalette: (palette: BrandColor[]) => Promise<void>;
  process: (config: ProcessConfig) => Promise<void>;
  requantize: (brand: string, maxColors: number, mode: 'fast' | 'smart') => Promise<void>;
  exportPreview: (options: RenderOptions) => Promise<Blob>;
}

interface QueueItem {
  type: string;
  payload: unknown;
  resolve: (value?: any) => void;
  reject: (reason?: unknown) => void;
}

export function useBeadWorker(): UseBeadWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<QueueItem | null>(null);
  const queueRef = useRef<QueueItem[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ phase: string; percent: number } | null>(null);
  const [result, setResult] = useState<PipelineOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state in case a previous worker was terminated mid-operation (e.g. React Strict Mode).
    pendingRef.current = null;
    queueRef.current = [];
    setIsProcessing(false);
    setProgress(null);

    let worker: Worker;
    try {
      worker = new Worker(new URL('../workers/beadWorker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      console.error('[useBeadWorker] failed to create worker', err);
      setError('无法创建 Worker，请检查浏览器是否支持模块 Worker');
      return;
    }
    workerRef.current = worker;
    console.log('[useBeadWorker] worker created');

    worker.onerror = (err) => {
      console.error('[useBeadWorker] worker error', err);
      setError('Worker 发生错误');
      finishPending('reject', new Error('Worker error'));
    };

    const finishPending = (outcome: 'resolve' | 'reject', value?: unknown) => {
      const item = pendingRef.current;
      pendingRef.current = null;
      if (item) {
        item[outcome](value);
      }
      if (queueRef.current.length > 0) {
        runNext();
      } else {
        setIsProcessing(false);
        setProgress(null);
      }
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      console.log('[useBeadWorker] receive', msg.type, msg);

      if (msg.type === 'PROGRESS') {
        setProgress(msg.payload);
        return;
      }

      if (msg.type === 'RESULT') {
        setResult(msg.payload);
        finishPending('resolve');
        return;
      }

      if (msg.type === 'EXPORT_READY') {
        finishPending('resolve', msg.payload.blob);
        return;
      }

      if (msg.type === 'ERROR') {
        setError(msg.payload.message);
        finishPending('reject', new Error(msg.payload.message));
        return;
      }

      if (msg.type === 'IMAGE_LOADED' || msg.type === 'PALETTE_SET') {
        finishPending('resolve');
      }
    };

    return () => {
      console.log('[useBeadWorker] terminating worker');
      // Drop pending work silently when the component unmounts so that React
      // Strict Mode / route changes do not surface uncaught "Worker terminated"
      // rejections to the user.
      pendingRef.current = null;
      queueRef.current = [];
      worker.terminate();
    };
  }, []);

  const runNext = () => {
    const worker = workerRef.current;
    if (!worker || pendingRef.current || queueRef.current.length === 0) {
      console.log('[useBeadWorker] runNext skipped', { hasWorker: !!worker, pending: pendingRef.current?.type, queue: queueRef.current.length });
      return;
    }

    const next = queueRef.current.shift()!;
    pendingRef.current = next;
    setIsProcessing(true);
    setError(null);
    console.log('[useBeadWorker] post to worker', next.type);
    worker.postMessage({ type: next.type, payload: next.payload });
  };

  const post = async <TPayload, TResult = void>(type: string, payload: TPayload): Promise<TResult> => {
    if (!workerRef.current) throw new Error('Worker not initialized');

    return new Promise<TResult>((resolve, reject) => {
      console.log('[useBeadWorker] enqueue', type);
      queueRef.current.push({ type, payload, resolve, reject });
      runNext();
    });
  };

  const loadImageFromData = async (imageData: ImageData) => {
    await post('LOAD_IMAGE', { imageData });
  };

  const loadImage = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    await post('LOAD_IMAGE', { imageData });
  };

  const setPalette = async (palette: BrandColor[]) => {
    await post('SET_PALETTE', { palette });
  };

  const process = async (config: ProcessConfig) => {
    await post('PROCESS', config);
  };

  const requantize = async (brand: string, maxColors: number, mode: 'fast' | 'smart') => {
    await post('REQUANTIZE', { brand, maxColors, mode });
  };

  const exportPreview = async (options: RenderOptions) => {
    return post<RenderOptions, Blob>('EXPORT_PREVIEW', options);
  };

  return { isProcessing, progress, result, error, loadImage, loadImageFromData, setPalette, process, requantize, exportPreview };
}
