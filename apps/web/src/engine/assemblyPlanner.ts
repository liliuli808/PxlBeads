import { BrandColor } from '@pxlbeads/shared';

export interface BoardRegion {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AssemblyColorStat {
  key: string;
  color: BrandColor;
  total: number;
  boardCount: number;
}

export function colorKey(color: BrandColor): string {
  return `${color.brand}:${color.code}`;
}

export function buildBoardRegions(width: number, height: number, boardSize: number): BoardRegion[] {
  const safeSize = Math.max(1, Math.floor(boardSize));
  const cols = Math.ceil(width / safeSize);
  const rows = Math.ceil(height / safeSize);
  const regions: BoardRegion[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * safeSize;
      const y = row * safeSize;
      regions.push({
        index: regions.length,
        row,
        col,
        x,
        y,
        width: Math.min(safeSize, width - x),
        height: Math.min(safeSize, height - y),
      });
    }
  }

  return regions;
}

function countByColor(
  grid: (BrandColor | null)[],
  patternWidth: number,
  region?: BoardRegion
): Map<string, number> {
  const counts = new Map<string, number>();
  const startX = region?.x ?? 0;
  const startY = region?.y ?? 0;
  const width = region?.width ?? patternWidth;
  const height = region?.height ?? Math.ceil(grid.length / patternWidth);

  for (let y = startY; y < startY + height; y++) {
    for (let x = startX; x < startX + width; x++) {
      const color = grid[y * patternWidth + x];
      if (!color) continue;
      const key = colorKey(color);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return counts;
}

export function buildColorStats(
  grid: (BrandColor | null)[],
  palette: BrandColor[],
  patternWidth: number,
  board?: BoardRegion
): AssemblyColorStat[] {
  const totalCounts = countByColor(grid, patternWidth);
  const boardCounts = board ? countByColor(grid, patternWidth, board) : totalCounts;

  return palette
    .map((color) => {
      const key = colorKey(color);
      return {
        key,
        color,
        total: totalCounts.get(key) ?? 0,
        boardCount: boardCounts.get(key) ?? 0,
      };
    })
    .filter((stat) => stat.total > 0)
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}
