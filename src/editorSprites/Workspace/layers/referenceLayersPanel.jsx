// referenceLayersPanel.jsx — gestión de capas de referencia en el dock.
// Recibe la lista completa (con canvas) y callbacks para mutar.

import React from 'react';
import './referenceLayersPanel.css';

const ReferenceLayersPanel = ({ layers = [], onChange }) => {
  const update = (id, patch) =>
    onChange?.(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id) =>
    onChange?.(layers.filter((l) => l.id !== id));

  return (
    <div className="ref-layers-panel">
      <div className="ref-layers-panel__header">
        <span className="ref-layers-panel__title">Referencias</span>
        <span className="ref-layers-panel__count">{layers.length}</span>
      </div>

      {layers.length === 0 && (
        <div className="ref-layers-panel__empty">
          Sin referencias. Importá una imagen desde el botón "Ref" del toolbar.
        </div>
      )}

      <ul className="ref-layers-panel__list">
        {layers.map((l) => (
          <li key={l.id} className="ref-layers-panel__item">
            <div className="ref-layers-panel__row">
              <button
                type="button"
                className={`ref-layers-panel__toggle${l.visible ? ' is-on' : ''}`}
                onClick={() => update(l.id, { visible: !l.visible })}
                title={l.visible ? 'Ocultar' : 'Mostrar'}
              >
                {l.visible ? '👁' : '—'}
              </button>
              <input
                className="ref-layers-panel__name"
                value={l.name}
                onChange={(e) => update(l.id, { name: e.target.value })}
              />
              <button
                className="ref-layers-panel__remove"
                onClick={() => remove(l.id)}
                title="Eliminar referencia"
              >
                ×
              </button>
            </div>

            <div className="ref-layers-panel__controls">
              <label>
                Opacidad: {Math.round((l.opacity ?? 0.5) * 100)}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((l.opacity ?? 0.5) * 100)}
                  onChange={(e) => update(l.id, { opacity: Number(e.target.value) / 100 })}
                />
              </label>
              <div className="ref-layers-panel__nums">
                {['x', 'y', 'scale', 'rotation'].map((k) => (
                  <label key={k}>
                    {k === 'scale' ? 'S' : k === 'rotation' ? 'θ' : k.toUpperCase()}
                    <input
                      type="number"
                      step={k === 'scale' ? 0.1 : 1}
                      value={l[k] ?? 0}
                      onChange={(e) => update(l.id, { [k]: Number(e.target.value) })}
                    />
                  </label>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReferenceLayersPanel;
