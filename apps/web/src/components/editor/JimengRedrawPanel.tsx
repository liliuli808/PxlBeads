import { useState } from 'react';
import { PatternMode, ProcessConfig } from '@pxlbeads/shared';
import { redrawImageWithJimeng, type JimengRedrawRequest } from '../../api/jimeng';
import { imageDataToPngDataUrl, imageSourceToImageData } from '../../utils/imageData';

interface JimengRedrawPanelProps {
  imageData: ImageData | null;
  disabled?: boolean;
  onApply: (imageData: ImageData, recommendation: JimengRedrawRecommendation) => void;
}

export interface JimengRedrawRecommendation {
  patternMode: PatternMode;
  updates?: Partial<ProcessConfig>;
}

export type JimengRedrawModeId = 'large' | 'small' | 'portrait';

export interface JimengRedrawMode {
  id: JimengRedrawModeId;
  label: string;
  description: string;
  helper: string;
  prompt: string;
  defaultSize: string;
  recommendation: JimengRedrawRecommendation;
}

export const JIMENG_RECOMMENDED_FLOW = [
  '先用 AI 重绘整理主体和色块',
  '再生成拼豆图纸',
];

export interface JimengModelOption {
  value: string;
  label: string;
  description: string;
}

export const JIMENG_MODEL_OPTIONS: JimengModelOption[] = [
  { value: 'jimeng-image-5.0-lite', label: '即梦 5.0 Lite', description: '默认推荐，质量和速度更均衡' },
  { value: 'jimeng-image-4.7', label: '即梦 4.7', description: '新图像模型，适合通用重绘' },
  { value: 'jimeng-image-4.6', label: '即梦 4.6', description: '通用重绘备选' },
  { value: 'jimeng-image-4.5', label: '即梦 4.5', description: '旧版稳定模型' },
  { value: 'jimeng-image-4.1', label: '即梦 4.1', description: '旧版通用模型' },
  { value: 'jimeng-image-4.0', label: '即梦 4.0', description: '旧版通用模型' },
  { value: 'jimeng-image-3.1', label: '即梦 3.1', description: '1K 输出，消耗更低' },
  { value: 'jimeng-image-3.0', label: '即梦 3.0', description: '1K 输出，旧版通用模型' },
  { value: 'jimeng-image-2.0-pro', label: '即梦 2.0 Pro', description: '1K 输出，兼容旧模型' },
];

export const JIMENG_SESSION_ID_HELP_STEPS = [
  '打开 https://jimeng.jianying.com 并登录账号。',
  '按 F12 打开开发者工具，进入 Application/应用 -> Cookies -> https://jimeng.jianying.com。',
  '找到名为 sessionid 的 Cookie，复制 Value 值粘贴到这里。',
];

export const JIMENG_REDRAW_MODES: JimengRedrawMode[] = [
  {
    id: 'large',
    label: '大图图纸',
    description: '保留更多细节，适合 80x80 以上图纸',
    helper: '适合照片、复杂主体和需要保留层次的大图。',
    prompt: [
      '基于参考图重绘为适合转拼豆图纸的大尺寸清晰插画参考图。',
      '保留主体轮廓、主要色块、光影关系和可识别特征。',
      '背景简化为浅色平面，减少纹理和杂物，使用清晰边界和可分辨的大色块。',
      '不要画出拼豆网格、像素格、文字、水印或边框。',
    ].join(''),
    defaultSize: '2048x2048',
    recommendation: {
      patternMode: 'pattern',
    },
  },
  {
    id: 'small',
    label: '小图清晰',
    description: '压到 57x57 仍清楚，适合头像和图标',
    helper: '会同步推荐为 57x57、较少颜色、强边缘的卡通/Logo 参数。',
    prompt: [
      '基于参考图重绘为适合57x57拼豆小图的清晰卡通图标。',
      '只保留一个主要主体，主体居中且占画面大部分。',
      '使用粗轮廓、高对比、少量大色块，删除细小毛发、复杂纹理、背景杂物和微小装饰。',
      '背景为浅色纯色或透明感平面。',
      '不要画出拼豆网格、像素格、文字、水印或边框。',
    ].join(''),
    defaultSize: '2048x2048',
    recommendation: {
      patternMode: 'logo',
      updates: {
        width: 57,
        height: 57,
        maxColors: 16,
        mode: 'smart',
        detailEnhance: false,
        fgThreshold: 0,
        quantizationMask: 0xf8,
        posterizeLevels: 6,
        edgeThreshold: 70,
        edgeDarken: 0.65,
        dither: false,
        ditherStrength: 0.2,
        confettiMinRatio: 0.004,
        floodFillBackground: false,
        backgroundTolerance: 32,
      },
    },
  },
  {
    id: 'portrait',
    label: '主体特写',
    description: '主体居中放大，背景更干净',
    helper: '适合人像、宠物、玩偶和需要突出主体的图片。',
    prompt: [
      '基于参考图重绘为适合拼豆图纸的主体特写插画。',
      '保留脸部或主体最重要的识别特征，居中构图，主体占画面大部分。',
      '简化背景，增强边缘和主要色块，减少细碎纹理。',
      '不要画出拼豆网格、像素格、文字、水印或边框。',
    ].join(''),
    defaultSize: '2048x2048',
    recommendation: {
      patternMode: 'subject',
    },
  },
];

const SIZE_OPTIONS = [
  { label: '方图 2048', value: '2048x2048' },
  { label: '横图 2304x1728', value: '2304x1728' },
  { label: '竖图 1728x2304', value: '1728x2304' },
];

export function JimengRedrawPanel({
  imageData,
  disabled = false,
  onApply,
}: JimengRedrawPanelProps) {
  const [selectedModeId, setSelectedModeId] = useState<JimengRedrawModeId>('large');
  const [prompt, setPrompt] = useState(JIMENG_REDRAW_MODES[0].prompt);
  const [size, setSize] = useState(JIMENG_REDRAW_MODES[0].defaultSize);
  const [model, setModel] = useState(JIMENG_MODEL_OPTIONS[0].value);
  const [sessionId, setSessionId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastModel, setLastModel] = useState<string | null>(null);

  const selectedMode =
    JIMENG_REDRAW_MODES.find((mode) => mode.id === selectedModeId) ?? JIMENG_REDRAW_MODES[0];
  const canGenerate = Boolean(imageData && !disabled && !isGenerating);

  const handleModeSelect = (mode: JimengRedrawMode) => {
    setSelectedModeId(mode.id);
    setPrompt(mode.prompt);
    setSize(mode.defaultSize);
    setError(null);
    setSuccess(null);
  };

  const handleGenerate = async () => {
    if (!imageData) return;

    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const source = imageDataToPngDataUrl(imageData);
      const redrawRequest: JimengRedrawRequest = { imageDataUrl: source, prompt, size, model };
      const trimmedSessionId = sessionId.trim();
      if (trimmedSessionId) redrawRequest.sessionId = trimmedSessionId;
      const result = await redrawImageWithJimeng(redrawRequest);
      const nextImage = await imageSourceToImageData(result.imageDataUrl || result.imageUrl || '');
      onApply(nextImage, selectedMode.recommendation);
      setLastModel(result.model);
      setSuccess(`已应用 ${selectedMode.label} 重绘图，推荐参数已同步。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '即梦重绘失败');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-700">AI重绘参考图</h3>
        {lastModel && <span className="text-[11px] text-gray-400 truncate">{lastModel}</span>}
      </div>

      <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900 space-y-1">
        {JIMENG_RECOMMENDED_FLOW.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-indigo-600">
              {index + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">重绘方案</label>
        <div className="space-y-2">
          {JIMENG_REDRAW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeSelect(mode)}
              className={[
                'w-full rounded-md border px-3 py-2 text-left transition-colors',
                selectedModeId === mode.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300',
              ].join(' ')}
            >
              <span className="block text-sm font-medium text-gray-800">{mode.label}</span>
              <span className="block text-xs leading-5 text-gray-500">{mode.description}</span>
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={5}
        className="w-full border rounded px-2 py-1 text-sm leading-5 resize-y"
      />

      <div>
        <label className="block text-xs text-gray-500 mb-1">AI重绘输出尺寸</label>
        <select
          value={size}
          onChange={(event) => setSize(event.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          {SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs leading-5 text-gray-500">{selectedMode.helper}</p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">即梦模型</label>
        <select
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          {JIMENG_MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          {JIMENG_MODEL_OPTIONS.find((option) => option.value === model)?.description}
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="block text-xs text-gray-500">Session ID（可选）</label>
          <details className="relative text-xs">
            <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700">获取方式</summary>
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-md border border-gray-200 bg-white p-3 text-gray-600 shadow-lg">
              <ol className="list-decimal space-y-1 pl-4">
                {JIMENG_SESSION_ID_HELP_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </details>
        </div>
        <input
          type="password"
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
          autoComplete="off"
          placeholder="不填则使用服务器配置"
          className="w-full border rounded px-2 py-1 text-sm"
        />
        <p className="mt-1 text-xs leading-5 text-gray-500">
          只在本次生成请求中使用，可粘贴原始值或包含 sessionid 的 Cookie 字符串。
        </p>
      </div>

      <button
        type="button"
        disabled={!canGenerate}
        onClick={handleGenerate}
        className="w-full px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-40"
      >
        {isGenerating ? '重绘中...' : '生成并应用'}
      </button>

      {success && <p className="text-xs leading-5 text-emerald-700">{success}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
