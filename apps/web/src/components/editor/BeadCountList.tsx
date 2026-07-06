import { BeadStats } from '@pxlbeads/shared';

interface BeadCountListProps {
  stats: BeadStats | undefined;
}

export function BeadCountList({ stats }: BeadCountListProps) {
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">数豆清单</h3>
        <p className="text-sm text-gray-500">生成图纸后将显示每种色号所需豆子数量。</p>
      </div>
    );
  }

  const entries = Object.entries(stats.counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">数豆清单</h3>
      <div className="text-xs text-gray-500 mb-2">
        总豆数：<span className="font-medium text-gray-900">{stats.total}</span>
        ，实际使用色数：
        <span className="font-medium text-gray-900">{stats.actualColors}</span>
      </div>
      <ul className="divide-y divide-gray-100 max-h-64 overflow-auto">
        {entries.map(([key, count]) => (
          <li key={key} className="flex justify-between py-2 text-sm">
            <span className="font-mono">{key}</span>
            <span className="font-medium">{count} 颗</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
