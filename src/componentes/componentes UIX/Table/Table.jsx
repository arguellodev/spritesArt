// Table.jsx
import React from 'react';
import './Table.css';

export const Table = ({
  columns,
  data,
  className = '',
  striped = true,
  hoverable = true,
  bordered = false,
  compact = false,
}) => {
  const tableClass = `
    table
    ${striped ? 'striped' : ''}
    ${hoverable ? 'hoverable' : ''}
    ${bordered ? 'bordered' : ''}
    ${compact ? 'compact' : ''}
    ${className}
  `.trim();

  return (
    <div className="table-container">
      <table className={tableClass}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={`${rowIndex}-${column.key}`}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="empty-table">
                No hay datos disponibles
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};