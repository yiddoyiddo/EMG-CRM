import React from 'react';

interface HeatmapProps {
  data: number[][]; // 7 × 24 matrix, Monday index 0
  max?: number; // max value to normalise
}

const hours = Array.from({ length: 24 }, (_, i) => i);
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Heatmap: React.FC<HeatmapProps> = ({ data, max }) => {
  const maxVal = max ?? Math.max(...data.flat());
  const getBg = (v: number) => {
    if (maxVal === 0) return 'bg-muted dark:bg-muted/20';
    const intensity = v / maxVal; // 0..1
    if (intensity === 0) return 'bg-muted dark:bg-muted/20';
    if (intensity < 0.25) return 'bg-blue-100 dark:bg-blue-900/40 text-foreground';
    if (intensity < 0.5) return 'bg-blue-300 dark:bg-blue-800/60 text-foreground';
    if (intensity < 0.75) return 'bg-blue-500 dark:bg-blue-700/80 text-primary-foreground';
    return 'bg-blue-700 dark:bg-blue-600 text-primary-foreground';
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-xs"></th>
            {hours.map((h) => (
              <th key={h} className="p-1 text-xs font-normal text-center text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, dIdx) => (
            <tr key={dIdx}>
              <td className="p-1 text-xs pr-2 whitespace-nowrap font-medium text-muted-foreground">{days[dIdx]}</td>
              {row.map((v, hIdx) => (
                <td
                  key={hIdx}
                  className={`w-6 h-6 ${getBg(v)} text-center text-[10px]`}
                  title={`${days[dIdx]} ${hIdx}:00 – ${v} calls`}
                >
                  {v > 0 ? v : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Heatmap; 