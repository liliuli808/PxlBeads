import { createProcessConfigForMode, PATTERN_MODE_CONFIG, PatternMode, ProcessConfig } from '@pxlbeads/shared';

interface ControlPanelProps {
  config: ProcessConfig;
  brands: string[];
  onChange: (updates: Partial<ProcessConfig>) => void;
  onRun: () => void;
  isLoading: boolean;
  progress: { phase: string; percent: number } | null;
}

export function ControlPanel({
  config,
  brands,
  onChange,
  onRun,
  isLoading,
  progress,
}: ControlPanelProps) {
  const patternMode = config.patternMode ?? 'pattern';
  const presetConfig = PATTERN_MODE_CONFIG[patternMode];
  const ditherEnabled = config.dither === true;

  const applyMode = (nextMode: PatternMode) => {
    const next = createProcessConfigForMode(nextMode, config.brand);
    onChange({
      ...next,
      beadStyle: config.beadStyle ?? next.beadStyle,
      style: config.style ?? next.style,
      detailLevel: config.detailLevel ?? next.detailLevel,
      faceEnhance: config.faceEnhance ?? next.faceEnhance,
      useSemanticPipeline: config.useSemanticPipeline ?? next.useSemanticPipeline,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h2 className="text-lg font-semibold">生成设置</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">新增强流水线</label>
        <div className="flex gap-2">
          {([
            { value: true, label: '语义感知' },
            { value: false, label: '经典' },
          ] as const).map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange({ useSemanticPipeline: option.value })}
              className={[
                'flex-1 px-3 py-1 rounded border text-sm',
                (config.useSemanticPipeline ?? true) === option.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">风格</label>
        <div className="flex gap-2">
          {(['realistic', 'illustration'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ style })}
              className={[
                'flex-1 px-3 py-1 rounded border text-sm',
                (config.style ?? 'illustration') === style
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            >
              {style === 'realistic' ? '写实' : '柔化插画'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">细节等级</label>
        <div className="flex gap-2">
          {(['simple', 'standard', 'fine'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onChange({ detailLevel: level })}
              className={[
                'flex-1 px-3 py-1 rounded border text-sm',
                (config.detailLevel ?? 'standard') === level
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            >
              {level === 'simple' ? '简洁' : level === 'standard' ? '标准' : '精细'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">五官增强</label>
        <div className="flex gap-2">
          {(['off', 'natural', 'strong'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onChange({ faceEnhance: level })}
              className={[
                'flex-1 px-3 py-1 rounded border text-sm',
                (config.faceEnhance ?? 'natural') === level
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            >
              {level === 'off' ? '关闭' : level === 'natural' ? '自然' : '明显'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">生成类型</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PATTERN_MODE_CONFIG) as PatternMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => applyMode(mode)}
              className={[
                'px-3 py-1.5 rounded border text-sm',
                patternMode === mode
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            >
              {PATTERN_MODE_CONFIG[mode].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">珠盘尺寸</label>
        <div className="flex flex-wrap gap-2">
          {[29, 57, 80, 90].map((size) => (
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
              {size}x{size}
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
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          减色色数 K：{config.maxColors}
        </label>
        <input
          type="range"
          min={8}
          max={40}
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
              {mode === 'fast' ? '快速' : '精细'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">珠子样式</label>
        <div className="flex gap-2">
          {(['square', 'round'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ beadStyle: style })}
              className={[
                'flex-1 px-3 py-1 rounded border text-sm',
                (config.beadStyle ?? 'square') === style
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            >
              {style === 'square' ? '方块' : '圆珠'}
            </button>
          ))}
        </div>
      </div>

      <details className="border-t border-gray-100 pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-gray-800">高级设置</summary>

        <div className="space-y-3 pt-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              颜色归桶：0x{(config.quantizationMask ?? presetConfig.quantizationMask).toString(16).toUpperCase()}
            </label>
            <select
              value={config.quantizationMask ?? presetConfig.quantizationMask}
              onChange={(e) => onChange({ quantizationMask: Number(e.target.value) })}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value={0xf0}>16 级</option>
              <option value={0xf8}>32 级</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Posterize：{config.posterizeLevels ?? presetConfig.posterizeLevels}
            </label>
            <input
              type="range"
              min={0}
              max={12}
              value={config.posterizeLevels ?? presetConfig.posterizeLevels}
              onChange={(e) => onChange({ posterizeLevels: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              边缘阈值：{config.edgeThreshold ?? presetConfig.edgeThreshold ?? 90}
            </label>
            <input
              type="range"
              min={20}
              max={160}
              value={config.edgeThreshold ?? presetConfig.edgeThreshold ?? 90}
              onChange={(e) => onChange({ edgeThreshold: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={ditherEnabled}
              onChange={(e) => onChange({ dither: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            实验：Floyd-Steinberg 抖动
          </label>

          {ditherEnabled && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                抖动强度：{Math.round((config.ditherStrength ?? presetConfig.ditherStrength) * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.ditherStrength ?? presetConfig.ditherStrength}
                onChange={(e) => onChange({ ditherStrength: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              实验：Confetti 阈值 {((config.confettiMinRatio ?? 0) * 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min={0}
              max={0.03}
              step={0.001}
              value={config.confettiMinRatio ?? 0}
              onChange={(e) => onChange({ confettiMinRatio: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </details>

      <button
        type="button"
        onClick={onRun}
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '处理中...' : '生成图纸'}
      </button>

      {progress && (
        <div className="space-y-1">
          <div className="text-xs text-gray-600">
            {progress.phase} {Math.round(progress.percent * 100)}%
          </div>
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
