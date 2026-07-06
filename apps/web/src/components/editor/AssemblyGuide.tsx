import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandColor, PipelineOutput } from '@pxlbeads/shared';

interface AssemblyGuideProps {
  result: PipelineOutput;
  compact?: boolean;
}

function renderStepCanvas(
  grid: (BrandColor | null)[],
  width: number,
  height: number,
  target: BrandColor,
  cellSize: number
): HTMLCanvasElement {
  const labelSize = Math.max(18, Math.round(cellSize * 0.8));
  const margin = { top: labelSize, left: labelSize, right: 2, bottom: 2 };
  const gridWidth = width * cellSize;
  const gridHeight = height * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = gridWidth + margin.left + margin.right;
  canvas.height = gridHeight + margin.top + margin.bottom;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw labels
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(10, Math.min(16, Math.round(cellSize * 0.5)))}px sans-serif`;

  for (let x = 0; x < width; x++) {
    ctx.fillText(String(x + 1), margin.left + x * cellSize + cellSize / 2, margin.top / 2);
  }
  for (let y = 0; y < height; y++) {
    ctx.fillText(String(y + 1), margin.left / 2, margin.top + y * cellSize + cellSize / 2);
  }

  // Draw grid cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = grid[y * width + x];
      const isTarget = color?.brand === target.brand && color?.code === target.code;
      const px = margin.left + x * cellSize;
      const py = margin.top + y * cellSize;

      if (isTarget && color) {
        const rgbHex = `#${color.rgb.map((c: number) => c.toString(16).padStart(2, '0')).join('')}`;
        ctx.fillStyle = rgbHex;
        ctx.fillRect(px, py, cellSize, cellSize);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, cellSize, cellSize);
      }

      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, cellSize, cellSize);
    }
  }

  return canvas;
}

function computeCellSize(containerWidth: number, gridWidth: number): number {
  const available = Math.max(200, containerWidth - 40);
  const labelSize = 18;
  const size = Math.floor((available - labelSize) / gridWidth);
  return Math.max(10, Math.min(36, size));
}

export function AssemblyGuide({ result, compact }: AssemblyGuideProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(24);

  const steps = useMemo(() => {
    const entries = result.palette.map((color) => ({
      color,
      count: result.stats.counts[`${color.brand}:${color.code}`] ?? 0,
    }));
    return entries.sort((a, b) => b.count - a.count);
  }, [result]);

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const width = containerRef.current?.clientWidth ?? 600;
      setCellSize(computeCellSize(width, result.width));
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [result.width]);

  useEffect(() => {
    if (!canvasRef.current || !currentStep) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const rendered = renderStepCanvas(
      result.grid,
      result.width,
      result.height,
      currentStep.color,
      cellSize
    );

    canvas.width = rendered.width;
    canvas.height = rendered.height;
    ctx.drawImage(rendered, 0, 0);
  }, [result, currentStep, cellSize]);

  if (steps.length === 0) {
    return <div className="text-sm text-gray-500">暂无可拼装的豆子</div>;
  }

  const wrapperClass = compact
    ? 'space-y-4'
    : 'bg-white rounded-lg shadow p-4 space-y-4';

  return (
    <div className={wrapperClass}>
      {!compact && <h3 className="text-lg font-semibold">分步拼装</h3>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
          className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-40"
        >
          上一步
        </button>

        <div className="text-center text-sm">
          <div className="font-medium">
            第 {stepIndex + 1} / {steps.length} 步
          </div>
          <div className="text-gray-500">共 {currentStep.count} 颗</div>
        </div>

        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
          disabled={stepIndex === steps.length - 1}
          className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-40"
        >
          下一步
        </button>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
        <div
          className="w-8 h-8 rounded border border-gray-200 flex-shrink-0"
          style={{
            backgroundColor: `#${currentStep.color.rgb
              .map((c: number) => c.toString(16).padStart(2, '0'))
              .join('')}`,
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {currentStep.color.brand.toUpperCase()} {currentStep.color.code}
          </div>
          {currentStep.color.name && (
            <div className="text-xs text-gray-500 truncate">{currentStep.color.name}</div>
          )}
        </div>
      </div>

      <div ref={containerRef} className="rounded border bg-white">
        <canvas
          ref={canvasRef}
          className="block w-full h-auto"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
        {steps.map((step, idx) => {
          const isActive = idx === stepIndex;
          const rgbHex = `#${step.color.rgb
            .map((c: number) => c.toString(16).padStart(2, '0'))
            .join('')}`;
          return (
            <button
              key={`${step.color.brand}:${step.color.code}`}
              type="button"
              onClick={() => setStepIndex(idx)}
              className={[
                'flex items-center gap-2 px-2 py-1 rounded border text-xs transition-colors',
                isActive
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              <span
                className="w-4 h-4 rounded border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: rgbHex }}
              />
              <span className="truncate max-w-[80px]">
                {step.color.code}
              </span>
              <span className="text-gray-400 flex-shrink-0">{step.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
