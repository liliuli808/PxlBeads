import { useEffect, useMemo, useState } from 'react';
import { BrandColor, PipelineOutput } from '@pxlbeads/shared';
import { ColorReplacementMap } from '../../engine/colorReplacement';
import { colorKey } from '../../engine/assemblyPlanner';

interface ColorCorrectionPanelProps {
  result: PipelineOutput | null;
  palette: BrandColor[] | undefined;
  replacements: ColorReplacementMap;
  onReplace: (sourceKey: string, target: BrandColor) => void;
  onReset: () => void;
}

function rgbHex(color: BrandColor): string {
  return `#${color.rgb.map((c: number) => c.toString(16).padStart(2, '0')).join('')}`;
}

function labelFor(color: BrandColor): string {
  return `${color.brand.toUpperCase()} ${color.code}${color.name ? ` ${color.name}` : ''}`;
}

export function ColorCorrectionPanel({
  result,
  palette,
  replacements,
  onReplace,
  onReset,
}: ColorCorrectionPanelProps) {
  const sourceColors = result?.palette ?? [];
  const targetColors = palette ?? [];
  const [sourceKey, setSourceKey] = useState('');
  const [targetKey, setTargetKey] = useState('');

  const source = useMemo(
    () => sourceColors.find((color) => colorKey(color) === sourceKey) ?? null,
    [sourceColors, sourceKey]
  );
  const target = useMemo(
    () => targetColors.find((color) => colorKey(color) === targetKey) ?? null,
    [targetColors, targetKey]
  );
  const replacementCount = Object.keys(replacements).length;

  useEffect(() => {
    if (sourceColors.length === 0) {
      setSourceKey('');
      return;
    }
    if (!sourceColors.some((color) => colorKey(color) === sourceKey)) {
      setSourceKey(colorKey(sourceColors[0]));
    }
  }, [sourceColors, sourceKey]);

  useEffect(() => {
    if (targetColors.length === 0) {
      setTargetKey('');
      return;
    }
    if (!targetColors.some((color) => colorKey(color) === targetKey)) {
      setTargetKey(colorKey(targetColors[0]));
    }
  }, [targetColors, targetKey]);

  if (!result) {
    return null;
  }

  const canApply = Boolean(source && target && sourceKey !== targetKey);

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-700">颜色校正</h3>
        {replacementCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-indigo-600 hover:underline"
          >
            重置 {replacementCount} 项
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">要替换的当前色号</label>
        <select
          value={sourceKey}
          onChange={(event) => setSourceKey(event.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          {sourceColors.map((color) => (
            <option key={colorKey(color)} value={colorKey(color)}>
              {labelFor(color)} ｜ {result.stats.counts[colorKey(color)] ?? 0} 颗
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">替换为</label>
        <select
          value={targetKey}
          onChange={(event) => setTargetKey(event.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          {targetColors.map((color) => (
            <option key={colorKey(color)} value={colorKey(color)}>
              {labelFor(color)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: source ? rgbHex(source) : '#ffffff' }}
          />
          <span className="truncate">{source ? source.code : '-'}</span>
        </div>
        <span>→</span>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: target ? rgbHex(target) : '#ffffff' }}
          />
          <span className="truncate">{target ? target.code : '-'}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!canApply}
        onClick={() => {
          if (source && target) onReplace(sourceKey, target);
        }}
        className="w-full px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-40"
      >
        应用全局替换
      </button>
    </div>
  );
}
