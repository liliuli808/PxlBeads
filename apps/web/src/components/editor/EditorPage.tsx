import { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useBeadWorker } from '../../hooks/useBeadWorker';
import { useColorCards } from '../../hooks/useColorCards';
import { ControlPanel } from './ControlPanel';
import { PatternCanvas } from './PatternCanvas';
import { PaletteList } from './PaletteList';
import { BeadCountList } from './BeadCountList';
import { AssemblyGuide } from './AssemblyGuide';
import { ColorCorrectionPanel } from './ColorCorrectionPanel';
import { JimengRedrawPanel } from './JimengRedrawPanel';
import type { JimengRedrawRecommendation } from './JimengRedrawPanel';
import { BrandColor, createProcessConfigForMode, PipelineOutput, ProcessConfig } from '@pxlbeads/shared';
import { applyColorReplacements, ColorReplacementMap } from '../../engine/colorReplacement';
import { renderPattern } from '../../engine/renderPattern';

const BRANDS = ['perler', 'hama', 'mard', 'coco', 'manman'];

function renderOutputPreview(result: PipelineOutput, beadStyle: ProcessConfig['beadStyle']): ImageData {
  const canvas = renderPattern(result.grid, result.width, result.height, {
    cellSize: 28,
    showGrid: true,
    showCodes: false,
    showLabels: false,
    beadStyle: beadStyle ?? 'square',
    bgColor: '#F5E6C8',
  });
  const ctx = canvas.getContext('2d')!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function EditorPage() {
  const imageData = useProjectStore((s) => s.imageData);
  const setImageData = useProjectStore((s) => s.setImageData);
  const setResult = useProjectStore((s) => s.setResult);

  const [config, setConfig] = useState<ProcessConfig>(() => createProcessConfigForMode('pattern', 'mard'));
  const [colorReplacements, setColorReplacements] = useState<ColorReplacementMap>({});

  const worker = useBeadWorker();
  const { data: palette, isLoading: isPaletteLoading } = useColorCards(config.brand);
  const autoProcessedImageRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (imageData) {
      worker.loadImageFromData(imageData);
    }
  }, [imageData]);

  useEffect(() => {
    if (palette) {
      worker.setPalette(palette);
    }
  }, [palette]);

  const displayResult = useMemo(() => {
    if (!worker.result) return null;
    const replaced = applyColorReplacements(worker.result, colorReplacements);
    if (replaced === worker.result) return worker.result;
    return {
      ...replaced,
      preview: renderOutputPreview(replaced, config.beadStyle),
    };
  }, [worker.result, colorReplacements, config.beadStyle]);

  useEffect(() => {
    setColorReplacements({});
  }, [worker.result]);

  useEffect(() => {
    setResult(displayResult);
  }, [displayResult, setResult]);

  useEffect(() => {
    if (!imageData || !palette || autoProcessedImageRef.current === imageData) return;
    autoProcessedImageRef.current = imageData;
    worker.process(config).catch(() => {
      autoProcessedImageRef.current = null;
    });
  }, [imageData, palette]);

  const handleRun = async () => {
    if (!palette) return;
    await worker.process(config);
  };

  const handleRequantize = async (updates: Partial<ProcessConfig>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    setColorReplacements({});
    if (!palette) return;
    await worker.process(next);
  };

  const handleColorReplace = (sourceKey: string, target: BrandColor) => {
    setColorReplacements((current) => ({
      ...current,
      [sourceKey]: target,
    }));
  };

  const handleJimengApply = (
    nextImageData: ImageData,
    recommendation: JimengRedrawRecommendation,
  ) => {
    const recommendedConfig: ProcessConfig = {
      ...createProcessConfigForMode(recommendation.patternMode, config.brand),
      ...recommendation.updates,
      brand: config.brand,
      beadStyle: config.beadStyle ?? 'square',
    };

    setConfig(recommendedConfig);
    setColorReplacements({});
    setImageData(nextImageData);
  };

  const [activeTab, setActiveTab] = useState<'preview' | 'assembly'>('preview');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  return (
    <div className="p-2 lg:p-6 h-full">
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-6 h-full">
        <aside
          className={[
            'order-2 lg:order-1 flex-shrink-0 space-y-4 overflow-auto transition-all duration-200',
            isLeftCollapsed ? 'hidden lg:block lg:w-12' : 'w-full lg:w-80',
          ].join(' ')}
        >
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsLeftCollapsed((v) => !v)}
              className="p-2 rounded hover:bg-gray-100 text-gray-500"
              title={isLeftCollapsed ? '展开设置' : '收起设置'}
            >
              {isLeftCollapsed ? '→' : '←'}
            </button>
          </div>

          {!isLeftCollapsed && (
            <>
              <ControlPanel
                config={config}
                brands={BRANDS}
                onChange={handleRequantize}
                onRun={handleRun}
                isLoading={worker.isProcessing || isPaletteLoading}
                progress={worker.progress}
              />
              <JimengRedrawPanel
                imageData={imageData}
                disabled={worker.isProcessing}
                onApply={handleJimengApply}
              />
              {worker.error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{worker.error}</div>
              )}
              <ColorCorrectionPanel
                result={displayResult}
                palette={palette}
                replacements={colorReplacements}
                onReplace={handleColorReplace}
                onReset={() => setColorReplacements({})}
              />
              {displayResult && <PaletteList palette={displayResult.palette} />}
              <BeadCountList stats={displayResult?.stats} />
            </>
          )}
        </aside>

        {isLeftCollapsed && (
          <button
            type="button"
            onClick={() => setIsLeftCollapsed(false)}
            className="hidden lg:flex order-2 lg:order-1 flex-shrink-0 w-8 items-start justify-center pt-2 text-gray-500 hover:text-indigo-600"
            title="展开设置"
          >
            →
          </button>
        )}

        <div className="order-1 lg:order-2 flex-1 min-h-[50vh] lg:min-h-0 bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={[
                'flex-1 py-2 px-4 text-sm font-medium transition-colors',
                activeTab === 'preview'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              完整图纸
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assembly')}
              className={[
                'flex-1 py-2 px-4 text-sm font-medium transition-colors',
                activeTab === 'assembly'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              拼图助手
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2 lg:p-4">
            {activeTab === 'preview' && (
              <div className="h-full flex items-center justify-center">
                {displayResult ? (
                  <PatternCanvas result={displayResult} />
                ) : (
                  <div className="text-center text-gray-500">
                    <p className="text-lg mb-2">暂无预览</p>
                    <p className="text-sm">
                      <a href="/" className="text-indigo-600 hover:underline">上传图片</a>
                      后生成图纸
                    </p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'assembly' && displayResult && (
              <AssemblyGuide result={displayResult} compact />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
