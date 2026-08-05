import React from 'react';

export default function StatCard({ icon, value, label, change, color = 'primary' }) {
  const isPositive = change >= 0;
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-content">
        <h3 className="stat-card-value">{value}</h3>
        <p className="stat-card-label">{label}</p>
        {change !== undefined && (
          <span className={`stat-card-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}
