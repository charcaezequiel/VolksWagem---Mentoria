import React from 'react';
import { BarChart as ReBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartColor } from './useChartPalette';

/**
 * Mismo criterio que LineChart: una sola serie, sin leyenda, y `label` para que
 * el tooltip no muestre el dataKey crudo ("consumption", "amount").
 */
export default function BarChart({
  data, xKey = 'month', yKey = 'consumption', color, colorIndex = 1, title, label, unit,
}) {
  const fallback = useChartColor(colorIndex);
  const fill = color || fallback;
  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <ReBar data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {/* La clase fija el stroke en var(--border) y se adapta al tema. */}
          <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(valor) => [unit ? `${valor} ${unit}` : valor, label]}
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Bar dataKey={yKey} name={label} fill={fill} radius={[4, 4, 0, 0]} />
        </ReBar>
      </ResponsiveContainer>
    </div>
  );
}
