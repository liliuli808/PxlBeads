import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { useBeadWorker } from '../../hooks/useBeadWorker';
import { useColorCards } from '../../hooks/useColorCards';
import { ControlPanel } from './ControlPanel';
import { PatternCanvas } from './PatternCanvas';
import { PaletteList } from './PaletteList';
import { BeadCountList } from './BeadCountList';
import { AssemblyGuide } from './AssemblyGuide';
import { ProcessConfig } from '@pxlbeads/shared';

const BRANDS = ['perler', 'hama', 'mard', 'coco', 'manman'];

export function EditorPage() {
  const navigate = useNavigate();
  const imageData = useProjectStore((s) => s.imageData);
  const setResult = useProjectStore((s) => s.setResult);

  const [config, setConfig] = useState<ProcessConfig>({
    width: 29,
    height: 29,
    brand: 'perler',
    maxColors: 16,
    mode: 'smart',
    removeBackground: false,
    backgroundColor: '#ffffff',
    backgroundThreshold: 40,
  });

  const worker = useBeadWorker();
  const { data: palette, isLoading: isPaletteLoading } = useColorCards(config.brand);

  useEffect(() => {
    if (!imageData) {
      navigate('/');
      return;
    }
    worker.loadImageFromData(imageData);
  }, [imageData]);

  useEffect(() => {
    if (palette) {
      worker.setPalette(palette);
    }
  }, [palette]);

  useEffect(() => {
    if (worker.result) {
      setResult(worker.result);
    }
  }, [worker.result, setResult]);

  const handleRun = async () => {
    if (!palette) return;
    await worker.process(config);
  };

  const handleRequantize = async (updates: Partial<ProcessConfig>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    if (!palette) return;
    await worker.process(next);
  };

  const [activeTab, setActiveTab] = useState<'preview' | 'assembly'>('preview');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  if (!imageData) {
    return null;
  }

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
              {worker.error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{worker.error}</div>
              )}
              {worker.result && <PaletteList palette={worker.result.palette} />}
              <BeadCountList stats={worker.result?.stats} />
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
              分步拼装
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2 lg:p-4">
            {activeTab === 'preview' && (
              <div className="h-full flex items-center justify-center">
                <PatternCanvas result={worker.result} />
              </div>
            )}
            {activeTab === 'assembly' && worker.result && (
              <AssemblyGuide result={worker.result} compact />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
