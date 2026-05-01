// historyPanel.jsx — panel visual del stack de historia.
// Recibe el array de entries y callbacks: onJumpTo, onClear.
//
// Las entries tienen el formato que usa el workspace:
//   { type: 'pixel_changes' | 'frame_state' | 'custom', label?, timestamp, ...payload }
//
// Si no hay `label`, se genera uno humano-legible a partir del tipo.

import React from 'react';
import './historyPanel.css';

const humanLabel = (entry) => {
  if (entry.label) return entry.label;
  switch (entry.type) {
    case 'pixel_changes': return `Trazo (${entry.changes?.length ?? '?'} pixeles)`;
    case 'frame_state':   return 'Cambio estructural';
    case 'add_layer':     return 'Añadir capa';
    case 'delete_layer':  return 'Eliminar capa';
    case 'add_frame':     return 'Añadir frame';
    case 'delete_frame':  return 'Eliminar frame';
    case 'filter':        return `Filtro: ${entry.filter ?? ''}`;
    default: return entry.type || 'Acción';
  }
};

const formatTime = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const HistoryPanel = ({
  history = [],
  currentIndex = -1,
  onJumpTo,
  onClear,
  maxDepth = 200,
}) => {
  return (
    <div className="history-panel">
      <div className="history-panel__header">
        <span className="history-panel__title">Historia</span>
        <span className="history-panel__count">
          {history.length}/{maxDepth}
        </span>
        <button
          type="button"
          className="history-panel__clear"
          onClick={onClear}
          title="Limpiar historia"
          disabled={history.length === 0}
        >
          Limpiar
        </button>
      </div>
      <ul className="history-panel__list">
        {history.length === 0 && (
          <li className="history-panel__empty">Sin operaciones registradas.</li>
        )}
        {history.map((entry, i) => {
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;
          return (
            <li
              key={i}
              className={
                'history-panel__item' +
                (isCurrent ? ' is-current' : '') +
                (isFuture ? ' is-future' : '')
              }
              onClick={() => onJumpTo?.(i)}
            >
              <span className="history-panel__item-index">{i + 1}</span>
              <span className="history-panel__item-label">{humanLabel(entry)}</span>
              <span className="history-panel__item-time">{formatTime(entry.timestamp)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default HistoryPanel;
