// tagsPanel.jsx — UI para crear/editar tags de animación sobre el timeline.
// Self-contained: recibe `tags` + `onChange(tags)` y el total de frames.

import React, { useState, useCallback } from 'react';
import { createTag, addTag, updateTag, removeTag } from './animationTags';
import './tagsPanel.css';

const DIRECTION_LABELS = {
  forward: '→',
  reverse: '←',
  pingpong: '↔',
  'pingpong-reverse': '↔ inv',
};

const TagsPanel = ({ tags, onChange, frameCount, onPlayTag }) => {
  const [draft, setDraft] = useState({ name: '', from: 0, to: Math.max(0, (frameCount ?? 1) - 1) });

  const handleCreate = useCallback(() => {
    if (!draft.name.trim()) return;
    const tag = createTag({
      name: draft.name.trim(),
      from: Math.max(0, Math.min(draft.from, frameCount - 1)),
      to: Math.max(0, Math.min(draft.to, frameCount - 1)),
    });
    onChange?.(addTag(tags, tag));
    setDraft({ name: '', from: 0, to: frameCount - 1 });
  }, [draft, tags, onChange, frameCount]);

  return (
    <div className="tags-panel">
      <div className="tags-panel__header">
        <span className="tags-panel__title">Animation tags</span>
        <span className="tags-panel__count">{tags.length}</span>
      </div>

      {/* Crear tag */}
      <div className="tags-panel__creator">
        <input
          className="tags-panel__name-input"
          placeholder="Nombre (p. ej. walk, idle)"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <input
          className="tags-panel__num-input"
          type="number"
          min={0}
          max={frameCount - 1}
          value={draft.from}
          onChange={(e) => setDraft((d) => ({ ...d, from: Number(e.target.value) }))}
        />
        <input
          className="tags-panel__num-input"
          type="number"
          min={0}
          max={frameCount - 1}
          value={draft.to}
          onChange={(e) => setDraft((d) => ({ ...d, to: Number(e.target.value) }))}
        />
        <button className="tags-panel__btn" onClick={handleCreate}>+ Crear</button>
      </div>

      {/* Lista */}
      <ul className="tags-panel__list">
        {tags.map((tag) => (
          <li key={tag.id} className="tags-panel__item" style={{ borderLeftColor: tag.color }}>
            <input
              className="tags-panel__item-name"
              value={tag.name}
              onChange={(e) => onChange?.(updateTag(tags, tag.id, { name: e.target.value }))}
            />
            <div className="tags-panel__item-range">
              <input
                type="number"
                min={0}
                max={frameCount - 1}
                value={tag.from}
                onChange={(e) => onChange?.(updateTag(tags, tag.id, { from: Number(e.target.value) }))}
              />
              <span>-</span>
              <input
                type="number"
                min={0}
                max={frameCount - 1}
                value={tag.to}
                onChange={(e) => onChange?.(updateTag(tags, tag.id, { to: Number(e.target.value) }))}
              />
            </div>
            <select
              className="tags-panel__item-dir"
              value={tag.direction}
              onChange={(e) => onChange?.(updateTag(tags, tag.id, { direction: e.target.value }))}
            >
              {Object.entries(DIRECTION_LABELS).map(([dir, label]) => (
                <option key={dir} value={dir}>{label} {dir}</option>
              ))}
            </select>
            <input
              type="color"
              className="tags-panel__item-color"
              value={tag.color}
              onChange={(e) => onChange?.(updateTag(tags, tag.id, { color: e.target.value }))}
              title="Color del tag"
            />
            <button
              className="tags-panel__btn tags-panel__btn--small"
              onClick={() => onPlayTag?.(tag)}
              title="Reproducir solo este tag"
            >
              ▶
            </button>
            <button
              className="tags-panel__btn tags-panel__btn--danger"
              onClick={() => onChange?.(removeTag(tags, tag.id))}
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

export default TagsPanel;
