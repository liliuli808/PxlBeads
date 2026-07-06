import { PipelineOutput } from '@pxlbeads/shared';
import { useEffect, useRef } from 'react';

interface PatternCanvasProps {
  result: PipelineOutput | null;
}

export function PatternCanvas({ result }: PatternCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !result) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    canvas.width = result.preview.width;
    canvas.height = result.preview.height;
    ctx.putImageData(result.preview, 0, 0);
  }, [result]);

  if (!result) {
    return (
      <div className="text-gray-400 text-center">
        <p>点击“生成图纸”查看预览</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full max-h-full w-auto h-auto"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
