import { ProcessConfig } from '@pxlbeads/shared';

interface ControlPanelProps {
  config: ProcessConfig;
  brands: string[];
  onChange: (updates: Partial<ProcessConfig>) => void;
  onRun: () => void;
  isLoading: boolean;
  progress: { phase: string; percent: number } | null;
}

export function ControlPanel({ config, brands, onChange, onRun, isLoading, progress }: ControlPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h2 className="text-lg font-semibold">生成设置</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">珠盘尺寸</label>
        <div className="flex gap-2">
          {[29, 57].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onChange({ width: size, height: size })}
              className={[
                'px-3 py-1 rounded border text-sm',
                config.width === size && config.height === size
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            >
              {size}×{size}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">宽度</label>
          <input
            type="number"
            min={5}
            max={200}
            value={config.width}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">高度</label>
          <input
            type="number"
            min={5}
            max={200}
            value={config.height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
            className="w-full border rounded px-2 py-1"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">品牌色卡</label>
        <select
          value={config.brand}
          onChange={(e) => onChange({ brand: e.target.value })}
          className="w-full border rounded px-2 py-1"
        >
          {brands.map((b) => (
            <option key={b} value={b}>
              {b.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          最大色数：{config.maxColors}
        </label>
        <input
          type="range"
          min={2}
          max={50}
          value={config.maxColors}
          onChange={(e) => onChange({ maxColors: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">模式</label>
        <div className="flex gap-2">
          {(['fast', 'smart'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ mode })}
              className={[
                'flex-1 px-3 py-1 rounded border text-sm',
                config.mode === mode
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            >
              {mode === 'fast' ? '快速' : '智能'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={config.removeBackground ?? false}
            onChange={(e) => onChange({ removeBackground: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          去除背景色
        </label>

        {config.removeBackground && (
          <div className="flex items-center gap-3 pl-6">
            <input
              type="color"
              value={config.backgroundColor ?? '#ffffff'}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="w-10 h-10 p-0 border rounded cursor-pointer"
              title="选择背景色"
            />
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">
                容差：{config.backgroundThreshold ?? 40}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={config.backgroundThreshold ?? 40}
                onChange={(e) => onChange({ backgroundThreshold: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onRun}
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '处理中...' : '生成图纸'}
      </button>

      {progress && (
        <div className="space-y-1">
          <div className="text-xs text-gray-600">{progress.phase} {Math.round(progress.percent * 100)}%</div>
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${progress.percent * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
