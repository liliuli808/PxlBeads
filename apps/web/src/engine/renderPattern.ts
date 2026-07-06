import { BrandColor, RenderOptions } from '@pxlbeads/shared';

export function renderPattern(
  grid: (BrandColor | null)[],
  width: number,
  height: number,
  options: RenderOptions
): HTMLCanvasElement | OffscreenCanvas {
  const { cellSize, showGrid, showCodes, showLabels, bgColor = '#ffffff' } = options;
  const labelSize = showLabels ? Math.max(18, cellSize) : 0;
  const margin = { top: labelSize, left: labelSize, right: 2, bottom: 2 };
  const gridWidth = width * cellSize;
  const gridHeight = height * cellSize;
  const canvasWidth = gridWidth + margin.left + margin.right;
  const canvasHeight = gridHeight + margin.top + margin.bottom;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof document === 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw labels
  if (showLabels) {
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(12, Math.min(18, cellSize / 1.4))}px sans-serif`;

    // Column numbers (top)
    for (let x = 0; x < width; x++) {
      const label = String(x + 1);
      ctx.fillText(label, margin.left + x * cellSize + cellSize / 2, margin.top / 2);
    }

    // Row numbers (left)
    for (let y = 0; y < height; y++) {
      const label = String(y + 1);
      ctx.fillText(label, margin.left / 2, margin.top + y * cellSize + cellSize / 2);
    }
  }

  // Draw grid cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = grid[y * width + x];
      const px = margin.left + x * cellSize;
      const py = margin.top + y * cellSize;

      if (!color) {
        // Empty/transparent cell: subtle background only
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(px, py, cellSize, cellSize);
      } else {
        const rgbHex = `#${color.rgb.map((c: number) => c.toString(16).padStart(2, '0')).join('')}`;
        ctx.fillStyle = rgbHex;
        ctx.fillRect(px, py, cellSize, cellSize);

        if (showCodes) {
          ctx.fillStyle = color.rgb[0] * 0.299 + color.rgb[1] * 0.587 + color.rgb[2] * 0.114 > 128 ? '#000000' : '#ffffff';
          ctx.font = `${Math.max(8, cellSize / 3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(color.code, px + cellSize / 2, py + cellSize / 2);
        }
      }
    }
  }

  if (showGrid) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(margin.left + x * cellSize, margin.top);
      ctx.lineTo(margin.left + x * cellSize, margin.top + gridHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top + y * cellSize);
      ctx.lineTo(margin.left + gridWidth, margin.top + y * cellSize);
      ctx.stroke();
    }
  }

  return canvas;
}
