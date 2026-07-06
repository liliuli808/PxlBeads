import { PipelineOutput } from '@pxlbeads/shared';
import { renderPattern } from '../../engine/renderPattern';
import { downloadBlob } from '../../utils/download';

interface PngExportButtonProps {
  result: PipelineOutput;
  filename?: string;
}

export function PngExportButton({ result, filename = 'pxlbeads-pattern.png' }: PngExportButtonProps) {
  const handleClick = () => {
    const canvas = renderPattern(result.grid, result.width, result.height, {
      cellSize: 24,
      showGrid: true,
      showCodes: true,
      showLabels: true,
    }) as HTMLCanvasElement;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
    });
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
    >
      导出 PNG
    </button>
  );
}
