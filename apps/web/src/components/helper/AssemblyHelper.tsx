import { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { BrandColor } from '@pxlbeads/shared';

export function AssemblyHelper() {
  const result = useProjectStore((s) => s.result);
  const [currentRow, setCurrentRow] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());

  if (!result) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">请在编辑器中生成图纸后再使用拼装辅助。</p>
      </div>
    );
  }

  const { grid, width, height } = result;
  const rowStart = currentRow * width;
  const rowColors = grid.slice(rowStart, rowStart + width);

  const toggleBead = (index: number) => {
    const next = new Set(done);
    const globalIndex = rowStart + index;
    if (next.has(globalIndex)) {
      next.delete(globalIndex);
    } else {
      next.add(globalIndex);
    }
    setDone(next);
  };

  const markRowDone = () => {
    const next = new Set(done);
    for (let i = 0; i < width; i++) {
      next.add(rowStart + i);
    }
    setDone(next);
  };

  const prevRow = () => setCurrentRow((r) => Math.max(0, r - 1));
  const nextRow = () => setCurrentRow((r) => Math.min(height - 1, r + 1));

  const colorKey = (c: BrandColor) => `${c.brand}:${c.code}`;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-center">逐行拼装辅助</h1>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevRow} disabled={currentRow === 0} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">
          上一行
        </button>
        <span className="font-medium">第 {currentRow + 1} / {height} 行</span>
        <button onClick={nextRow} disabled={currentRow === height - 1} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">
          下一行
        </button>
      </div>

      <div className="grid gap-1 mb-4" style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}>
        {rowColors.map((color, i) => {
          const globalIndex = rowStart + i;
          const isDone = done.has(globalIndex);
          if (!color) {
            return (
              <div
                key={i}
                className="aspect-square rounded border border-dashed border-gray-200 bg-gray-50"
                title="无需拼豆"
              />
            );
          }
          const hex = `#${color.rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
          return (
            <button
              key={i}
              onClick={() => toggleBead(i)}
              className={[
                'aspect-square rounded border border-gray-300 flex items-center justify-center text-xs',
                isDone ? 'opacity-30 line-through' : '',
              ].join(' ')}
              style={{ backgroundColor: hex }}
            >
              {color.code}
            </button>
          );
        })}
      </div>

      <button
        onClick={markRowDone}
        className="w-full py-3 bg-green-600 text-white rounded font-medium mb-6"
      >
        标记整行完成
      </button>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold mb-2">当前行数豆</h3>
        <ul className="space-y-1">
          {Object.entries(
            rowColors.reduce((acc, color) => {
              if (!color) return acc;
              const key = colorKey(color);
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          )
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => (
              <li key={key} className="flex justify-between text-sm">
                <span className="font-mono">{key}</span>
                <span>{count} 颗</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
