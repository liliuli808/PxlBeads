import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandColor, PipelineOutput } from '@pxlbeads/shared';
import {
  AssemblyColorStat,
  BoardRegion,
  buildBoardRegions,
  buildColorStats,
  colorKey,
} from '../../engine/assemblyPlanner';

interface AssemblyGuideProps {
  result: PipelineOutput;
  compact?: boolean;
}

const BOARD_SIZE_OPTIONS = [29, 57, 80];

function rgbHex(color: BrandColor): string {
  return `#${color.rgb.map((c: number) => c.toString(16).padStart(2, '0')).join('')}`;
}

function computeCellSize(containerWidth: number, gridWidth: number): number {
  const available = Math.max(240, containerWidth - 32);
  const labelSize = 28;
  const size = Math.floor((available - labelSize) / gridWidth);
  return Math.max(12, Math.min(30, size));
}

function renderBoardCanvas(
  result: PipelineOutput,
  board: BoardRegion,
  selectedColorKey: string | null,
  cellSize: number
): HTMLCanvasElement {
  const labelSize = Math.max(22, Math.round(cellSize * 0.9));
  const margin = { top: labelSize, left: labelSize, right: 2, bottom: 2 };
  const gridWidth = board.width * cellSize;
  const gridHeight = board.height * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = gridWidth + margin.left + margin.right;
  canvas.height = gridHeight + margin.top + margin.bottom;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#374151';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(10, Math.min(15, Math.round(cellSize * 0.48)))}px sans-serif`;

  for (let x = 0; x < board.width; x++) {
    ctx.fillText(String(board.x + x + 1), margin.left + x * cellSize + cellSize / 2, margin.top / 2);
  }
  for (let y = 0; y < board.height; y++) {
    ctx.fillText(String(board.y + y + 1), margin.left / 2, margin.top + y * cellSize + cellSize / 2);
  }

  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const patternX = board.x + x;
      const patternY = board.y + y;
      const color = result.grid[patternY * result.width + patternX];
      const key = color ? colorKey(color) : null;
      const isSelected = selectedColorKey === null || key === selectedColorKey;
      const px = margin.left + x * cellSize;
      const py = margin.top + y * cellSize;

      if (!color) {
        ctx.fillStyle = '#ffffff';
      } else if (isSelected) {
        ctx.fillStyle = rgbHex(color);
      } else {
        ctx.fillStyle = '#f3f4f6';
      }
      ctx.fillRect(px, py, cellSize, cellSize);

      if (color && isSelected && selectedColorKey !== null) {
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = Math.max(1, Math.round(cellSize / 14));
      } else {
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(px, py, cellSize, cellSize);
    }
  }

  return canvas;
}

function sortForCurrentBoard(stats: AssemblyColorStat[]): AssemblyColorStat[] {
  return [...stats].sort((a, b) => b.boardCount - a.boardCount || b.total - a.total || a.key.localeCompare(b.key));
}

export function AssemblyGuide({ result, compact }: AssemblyGuideProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(29);
  const [boardIndex, setBoardIndex] = useState(0);
  const [selectedColorKey, setSelectedColorKey] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(20);
  const [doneBoards, setDoneBoards] = useState<Set<number>>(() => new Set());
  const [doneColors, setDoneColors] = useState<Set<string>>(() => new Set());

  const boards = useMemo(
    () => buildBoardRegions(result.width, result.height, boardSize),
    [result.width, result.height, boardSize]
  );
  const currentBoard = boards[Math.min(boardIndex, boards.length - 1)];

  const colorStats = useMemo(
    () => (currentBoard ? buildColorStats(result.grid, result.palette, result.width, currentBoard) : []),
    [result, currentBoard]
  );
  const orderedStats = useMemo(() => sortForCurrentBoard(colorStats), [colorStats]);
  const selectedStat = colorStats.find((stat) => stat.key === selectedColorKey) ?? null;
  const boardTotal = colorStats.reduce((sum, stat) => sum + stat.boardCount, 0);
  const boardDone = currentBoard ? doneBoards.has(currentBoard.index) : false;
  const selectedColorDone = selectedColorKey ? doneColors.has(selectedColorKey) : false;

  useEffect(() => {
    setBoardIndex(0);
    setSelectedColorKey(null);
    setDoneBoards(new Set());
    setDoneColors(new Set());
  }, [result]);

  useEffect(() => {
    setBoardIndex((index) => Math.min(index, Math.max(0, boards.length - 1)));
  }, [boards.length]);

  useEffect(() => {
    if (selectedColorKey === null) return;
    if (!colorStats.some((stat) => stat.key === selectedColorKey)) {
      setSelectedColorKey(null);
    }
  }, [colorStats, selectedColorKey]);

  useEffect(() => {
    if (!containerRef.current || !currentBoard) return;

    const updateSize = () => {
      const width = containerRef.current?.clientWidth ?? 600;
      setCellSize(computeCellSize(width, currentBoard.width));
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [currentBoard]);

  useEffect(() => {
    if (!canvasRef.current || !currentBoard) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const rendered = renderBoardCanvas(result, currentBoard, selectedColorKey, cellSize);

    canvas.width = rendered.width;
    canvas.height = rendered.height;
    ctx.drawImage(rendered, 0, 0);
  }, [result, currentBoard, selectedColorKey, cellSize]);

  if (!currentBoard || orderedStats.length === 0) {
    return <div className="text-sm text-gray-500">暂无可拼装的豆子</div>;
  }

  const wrapperClass = compact
    ? 'space-y-4'
    : 'bg-white rounded-lg shadow p-4 space-y-4';

  return (
    <div className={wrapperClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">拼图助手</h3>
          <div className="text-xs text-gray-500 mt-1">
            {doneBoards.size}/{boards.length} 板 ｜ {doneColors.size}/{colorStats.length} 色 ｜ 当前板 {boardTotal} 颗
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={boardDone}
            onChange={(event) => {
              if (!currentBoard) return;
              const next = new Set(doneBoards);
              if (event.target.checked) next.add(currentBoard.index);
              else next.delete(currentBoard.index);
              setDoneBoards(next);
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          本板完成
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {BOARD_SIZE_OPTIONS.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => {
              setBoardSize(size);
              setBoardIndex(0);
              setDoneBoards(new Set());
            }}
            className={[
              'px-3 py-1 rounded border text-sm',
              boardSize === size
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
            ].join(' ')}
          >
            {size}x{size}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setBoardIndex((i) => Math.max(0, i - 1))}
          disabled={boardIndex === 0}
          className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-40"
        >
          上一板
        </button>

        <div className="text-center text-sm min-w-0">
          <div className="font-medium">
            第 {currentBoard.index + 1} / {boards.length} 板
          </div>
          <div className="text-xs text-gray-500">
            行 {currentBoard.y + 1}-{currentBoard.y + currentBoard.height} ｜ 列 {currentBoard.x + 1}-
            {currentBoard.x + currentBoard.width}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBoardIndex((i) => Math.min(boards.length - 1, i + 1))}
          disabled={boardIndex === boards.length - 1}
          className="px-3 py-1 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-40"
        >
          下一板
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
        <div ref={containerRef} className="rounded border bg-white overflow-auto">
          <canvas
            ref={canvasRef}
            className="block max-w-full h-auto"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        <div className="space-y-3">
          <div className="rounded border border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center gap-3">
              {selectedStat ? (
                <span
                  className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: rgbHex(selectedStat.color) }}
                />
              ) : (
                <span className="w-8 h-8 rounded border border-gray-300 bg-white flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {selectedStat
                    ? `${selectedStat.color.brand.toUpperCase()} ${selectedStat.color.code}`
                    : '全部颜色'}
                </div>
                <div className="text-xs text-gray-500">
                  本板 {selectedStat?.boardCount ?? boardTotal} 颗 ｜ 总计 {selectedStat?.total ?? result.stats.total} 颗
                </div>
              </div>
            </div>

            {selectedColorKey && (
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedColorDone}
                  onChange={(event) => {
                    const next = new Set(doneColors);
                    if (event.target.checked) next.add(selectedColorKey);
                    else next.delete(selectedColorKey);
                    setDoneColors(next);
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                当前色完成
              </label>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedColorKey(null)}
              className={[
                'px-2 py-1 rounded border text-xs',
                selectedColorKey === null
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              全部
            </button>
            {orderedStats.map((stat) => {
              const isActive = stat.key === selectedColorKey;
              const isDone = doneColors.has(stat.key);
              return (
                <button
                  key={stat.key}
                  type="button"
                  onClick={() => setSelectedColorKey(stat.key)}
                  className={[
                    'flex items-center gap-2 px-2 py-1 rounded border text-xs transition-colors',
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:bg-gray-50',
                    isDone ? 'opacity-50 line-through' : '',
                  ].join(' ')}
                >
                  <span
                    className="w-4 h-4 rounded border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: rgbHex(stat.color) }}
                  />
                  <span className="font-mono">{stat.color.code}</span>
                  <span className="text-gray-500">{stat.boardCount}/{stat.total}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
