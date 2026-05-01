// slicesPanel.jsx — panel del dock para listar/crear/editar slices.
// Consume el modelo de sliceLayer.js. Self-contained: recibe `slices` + callbacks.

import React, { useState, useCallback } from 'react';
import './slicesPanel.css';

let _idCounter = 0;
const newSliceId = () => `slice_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

const SlicesPanel = ({ slices = [], onChange, canvasWidth = 64, canvasHeight = 64 }) => {
  const [draft, setDraft] = useState({ name: '', x: 0, y: 0, w: 16, h: 16 });

  const handleCreate = useCallback(() => {
    if (!draft.name.trim()) return;
    const s = {
      id: newSliceId(),
      name: draft.name.trim(),
      color: '#ffcc44',
      bounds: {
        x: Math.max(0, draft.x),
        y: Math.max(0, draft.y),
        w: Math.max(1, draft.w),
        h: Math.max(1, draft.h),
      },
    };
    onChange?.([...slices, s]);
    setDraft({ name: '', x: 0, y: 0, w: 16, h: 16 });
  }, [draft, slices, onChange]);

  const update = (id, patch) => onChange?.(slices.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateBounds = (id, key, val) =>
    onChange?.(slices.map((s) =>
      s.id === id ? { ...s, bounds: { ...s.bounds, [key]: Number(val) } } : s
    ));
  const remove = (id) => onChange?.(slices.filter((s) => s.id !== id));

  return (
    <div className="slices-panel">
      <div className="slices-panel__header">
        <span className="slices-panel__title">Slices</span>
        <span className="slices-panel__count">{slices.length}</span>
      </div>

      <div className="slices-panel__creator">
        <input
          className="slices-panel__name"
          placeholder="Nombre (p. ej. hitbox)"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <div className="slices-panel__coords">
          {['x', 'y', 'w', 'h'].map((k) => (
            <label key={k}>
              {k}
              <input
                type="number"
                min={0}
                max={k === 'x' || k === 'w' ? canvasWidth : canvasHeight}
                value={draft[k]}
                onChange={(e) => setDraft((d) => ({ ...d, [k]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
        <button className="slices-panel__btn" onClick={handleCreate}>+ Crear</button>
      </div>

      <ul className="slices-panel__list">
        {slices.length === 0 && (
          <li className="slices-panel__empty">Sin slices. Definí hitboxes, pivots o regiones.</li>
        )}
        {slices.map((s) => (
          <li key={s.id} className="slices-panel__item" style={{ borderLeftColor: s.color }}>
            <input
              className="slices-panel__item-name"
              value={s.name}
              onChange={(e) => update(s.id, { name: e.target.value })}
            />
            <div className="slices-panel__item-bounds">
              {['x', 'y', 'w', 'h'].map((k) => (
                <input
                  key={k}
                  type="number"
                  value={s.bounds[k]}
                  min={0}
                  onChange={(e) => updateBounds(s.id, k, e.target.value)}
                  title={k}
                />
              ))}
            </div>
            <input
              type="color"
              className="slices-panel__item-color"
              value={s.color}
              onChange={(e) => update(s.id, { color: e.target.value })}
            />
            <button
              className="slices-panel__btn slices-panel__btn--danger"
              onClick={() => remove(s.id)}
              title="Eliminar"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SlicesPanel;
