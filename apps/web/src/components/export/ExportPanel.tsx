import { useProjectStore } from '../../store/projectStore';
import { PngExportButton } from './PngExportButton';
import { PdfExportButton } from './PdfExportButton';

export function ExportPanel() {
  const imageData = useProjectStore((s) => s.imageData);
  const result = useProjectStore((s) => s.result);

  if (!imageData) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">请先上传图片并生成图纸。</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">请在编辑器中生成图纸后再导出。</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">导出图纸</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <PngExportButton result={result} />
          <PdfExportButton result={result} />
        </div>
      </div>
    </div>
  );
}
