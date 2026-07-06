import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PipelineOutput } from '@pxlbeads/shared';
import { renderPattern } from '../../engine/renderPattern';

interface PdfExportButtonProps {
  result: PipelineOutput;
  filename?: string;
}

export function PdfExportButton({ result, filename = 'pxlbeads-pattern.pdf' }: PdfExportButtonProps) {
  const handleClick = () => {
    const cellSize = 14;
    const canvas = renderPattern(result.grid, result.width, result.height, {
      cellSize,
      showGrid: true,
      showCodes: false,
      showLabels: true,
    }) as HTMLCanvasElement;
    const imageData = canvas.toDataURL('image/png');

    const patternWidth = result.width * cellSize;
    const patternHeight = result.height * cellSize;
    const isLandscape = patternWidth > patternHeight;

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    doc.setFontSize(16);
    doc.text('PxlBeads 拼豆图纸', margin, margin + 6);
    doc.setFontSize(10);
    doc.text(`品牌：${result.palette[0]?.brand ?? ''} ｜ 尺寸：${result.width}×${result.height} ｜ 总豆数：${result.stats.total}`, margin, margin + 12);

    const maxImgWidth = pageWidth - margin * 2;
    const maxImgHeight = pageHeight * 0.55;
    const scale = Math.min(maxImgWidth / patternWidth, maxImgHeight / patternHeight);
    const imgWidth = patternWidth * scale;
    const imgHeight = patternHeight * scale;

    doc.addImage(imageData, 'PNG', margin, margin + 18, imgWidth, imgHeight);

    const tableData = Object.entries(result.stats.counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => {
        const color = result.palette.find((c) => `${c.brand}:${c.code}` === code);
        return [
          code,
          color?.name ?? '',
          count,
        ];
      });

    autoTable(doc, {
      startY: margin + 18 + imgHeight + 8,
      head: [['色号', '名称', '数量']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(filename);
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
    >
      导出 PDF
    </button>
  );
}
