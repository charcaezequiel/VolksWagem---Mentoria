import React from 'react';
import { LineChart as ReLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useChartColor } from './useChartPalette';

export default function LineChart({ data, xKey = 'date', yKey = 'consumption', color, colorIndex = 1, title }) {
  const fallback = useChartColor(colorIndex);
  const stroke = color || fallback;
  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <ReLine data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {/* La clase fija el stroke en var(--border) y se adapta al tema. */}
          <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke={stroke} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </ReLine>
      </ResponsiveContainer>
    </div>
  );
}
