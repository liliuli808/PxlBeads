import { BrandColor } from '@pxlbeads/shared';

export interface ConnectedComponent {
  id: number;
  colorKey: string;
  color: BrandColor;
  pixels: { x: number; y: number }[];
  size: number;
  label: string;
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

export function findConnectedComponents(
  grid: (BrandColor | null)[],
  width: number,
  height: number,
  connectivity: 4 | 8 = 8
): ConnectedComponent[] {
  const visited = new Uint8Array(width * height);
  const components: ConnectedComponent[] = [];

  const directions: { dx: number; dy: number }[] =
    connectivity === 4
      ? [
          { dx: 0, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
        ]
      : [
          { dx: 0, dy: -1 },
          { dx: 1, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 1, dy: 1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: -1, dy: -1 },
        ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const color = grid[idx];
      if (!color) {
        visited[idx] = 1;
        continue;
      }

      const colorKey = `${color.brand}:${color.code}`;
      const pixels: { x: number; y: number }[] = [];
      const stack = [{ x, y }];
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      visited[idx] = 1;

      while (stack.length > 0) {
        const current = stack.pop()!;
        pixels.push(current);
        minX = Math.min(minX, current.x);
        minY = Math.min(minY, current.y);
        maxX = Math.max(maxX, current.x);
        maxY = Math.max(maxY, current.y);

        for (const { dx, dy } of directions) {
          const nx = current.x + dx;
          const ny = current.y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

          const nIdx = ny * width + nx;
          if (visited[nIdx]) continue;

          const neighbor = grid[nIdx];
          if (!neighbor) continue;
          if (`${neighbor.brand}:${neighbor.code}` !== colorKey) continue;

          visited[nIdx] = 1;
          stack.push({ x: nx, y: ny });
        }
      }

      components.push({
        id: components.length,
        colorKey,
        color,
        pixels,
        size: pixels.length,
        label: '',
        boundingBox: { minX, minY, maxX, maxY },
      });
    }
  }

  return components;
}
