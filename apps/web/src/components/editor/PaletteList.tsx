import { BrandColor } from '@pxlbeads/shared';

interface PaletteListProps {
  palette: BrandColor[];
}

export function PaletteList({ palette }: PaletteListProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">使用色号 ({palette.length})</h3>
      <div className="flex flex-wrap gap-2">
        {palette.map((color) => {
          const hex = `#${color.rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
          return (
            <div
              key={`${color.brand}:${color.code}`}
              className="flex items-center gap-2 px-2 py-1 rounded border border-gray-200"
            >
              <div
                className="w-5 h-5 rounded border border-gray-300"
                style={{ backgroundColor: hex }}
              />
              <span className="text-xs font-mono">{color.code}</span>
              {color.name && <span className="text-xs text-gray-500">{color.name}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
