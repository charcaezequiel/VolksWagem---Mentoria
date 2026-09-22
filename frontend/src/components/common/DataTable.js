import React from 'react';
import { useTranslation } from '../../context/LanguageContext';

export default function DataTable({ columns, data, onRowClick, emptyMessage }) {
  const { t } = useTranslation();
  const empty = emptyMessage ?? t('common.no_data');
  if (!data || data.length === 0) {
    return (
      <div className="data-table-empty">
        <p>{empty}</p>
      </div>
    );
  }
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
