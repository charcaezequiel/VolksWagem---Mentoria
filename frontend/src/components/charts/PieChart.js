import React from 'react';
import { PieChart as RePie, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export default function PieChart({ data, nameKey = 'name', valueKey = 'value', title }) {
  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <RePie>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={95}
            dataKey={valueKey}
            nameKey={nameKey}
            minAngle={2}
            label={({ percent }) => (percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : '')}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `${v} kWh`} />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        </RePie>
      </ResponsiveContainer>
    </div>
  );
}