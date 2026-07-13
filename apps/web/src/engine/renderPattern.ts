import { BrandColor, RenderOptions } from '@pxlbeads/shared';

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function adjustColor(rgb: [number, number, number], amount: number): string {
  return rgbToHex([
    clamp(rgb[0] + amount),
    clamp(rgb[1] + amount),
    clamp(rgb[2] + amount),
  ]);
}

function drawRoundBead(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rgb: [number, number, number]
): void {
  const base = rgbToHex(rgb);
  const light = adjustColor(rgb, 20);
  const dark = adjustColor(rgb, -20);
  const shadow = adjustColor(rgb, -35);

  // Slight shadow below and to the right
  ctx.beginPath();
  ctx.arc(cx + radius * 0.06, cy + radius * 0.1, radius * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fill();

  // Main bead with radial gradient
  const grad = ctx.createRadialGradient(
    cx - radius * 0.3,
    cy - radius * 0.3,
    radius * 0.1,
    cx,
    cy,
    radius * 0.9
  );
  grad.addColorStop(0, light);
  grad.addColorStop(0.25, base);
  grad.addColorStop(0.75, base);
  grad.addColorStop(0.95, dark);
  grad.addColorStop(1, shadow);

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Small soft specular highlight
  ctx.beginPath();
  ctx.arc(cx - radius * 0.25, cy - radius * 0.28, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fill();
}

export function renderPattern(
  grid: (BrandColor | null)[],
  width: number,
  height: number,
  options: RenderOptions
): HTMLCanvasElement | OffscreenCanvas {
  const {
    cellSize,
    showGrid,
    showCodes,
    showLabels,
    bgColor = '#ffffff',
    beadStyle = 'square',
  } = options;
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

    for (let x = 0; x < width; x++) {
      const label = String(x + 1);
      ctx.fillText(label, margin.left + x * cellSize + cellSize / 2, margin.top / 2);
    }
    for (let y = 0; y < height; y++) {
      const label = String(y + 1);
      ctx.fillText(label, margin.left / 2, margin.top + y * cellSize + cellSize / 2);
    }
  }

  // Draw beads / grid cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = grid[y * width + x];
      const px = margin.left + x * cellSize;
      const py = margin.top + y * cellSize;

      if (!color) {
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(px, py, cellSize, cellSize);
      } else if (beadStyle === 'round') {
        const cx = px + cellSize / 2;
        const cy = py + cellSize / 2;
        const radius = (cellSize - 2) / 2;
        drawRoundBead(ctx, cx, cy, radius, color.rgb);

        if (showCodes) {
          ctx.fillStyle =
            color.rgb[0] * 0.299 + color.rgb[1] * 0.587 + color.rgb[2] * 0.114 > 128
              ? '#000000'
              : '#ffffff';
          ctx.font = `${Math.max(8, cellSize / 3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(color.code, cx, cy);
        }
      } else {
        const rgbHex = rgbToHex(color.rgb);
        ctx.fillStyle = rgbHex;
        ctx.fillRect(px, py, cellSize, cellSize);

        if (showCodes) {
          ctx.fillStyle =
            color.rgb[0] * 0.299 + color.rgb[1] * 0.587 + color.rgb[2] * 0.114 > 128
              ? '#000000'
              : '#ffffff';
          ctx.font = `${Math.max(8, cellSize / 3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(color.code, px + cellSize / 2, py + cellSize / 2);
        }
      }
    }
  }

  if (showGrid && beadStyle !== 'round') {
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = Math.max(1, Math.round(cellSize / 20));
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
