// tilesetPanel.jsx — panel visual del tileset.
// Muestra la grilla de tiles, permite seleccionar uno (se convierte en el "tile activo"
// para la herramienta tileTool), renombrar/borrar, y re-ordenar con drag.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { tilesetToAtlas, removeTile, reorderTiles } from './tileset';
import './tilesetPanel.css';

const TilesetPanel = ({
  tileset,
  activeTileId,
  onSelectTile,
  onTilesetChange,
  atlasColumns = 8,
  previewZoom = 2,
}) => {
  const atlasRef = useRef(null);
  const [dragSrcIdx, setDragSrcIdx] = useState(null);

  // Render del atlas: redibuja cuando el tileset cambia.
  useEffect(() => {
    if (!atlasRef.current) return;
    const canvas = atlasRef.current;
    const { canvas: atlas, cols, rows } = tilesetToAtlas(tileset, atlasColumns);
    canvas.width = atlas.width * previewZoom;
    canvas.height = atlas.height * previewZoom;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, 0, 0, canvas.width, canvas.height);

    // Dibujar rejilla de separación entre tiles.
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let i = 1; i < cols; i++) {
      const x = i * tileset.tileWidth * previewZoom + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let i = 1; i < rows; i++) {
      const y = i * tileset.tileHeight * previewZoom + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }, [tileset, atlasColumns, previewZoom]);

  const handleAtlasClick = useCallback(
    (e) => {
      if (!atlasRef.current) return;
      const rect = atlasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const col = Math.floor(x / (tileset.tileWidth * previewZoom));
      const row = Math.floor(y / (tileset.tileHeight * previewZoom));
      const idx = row * atlasColumns + col;
      const tile = tileset.tiles[idx];
      if (tile) onSelectTile?.(tile.id);
    },
    [tileset, atlasColumns, previewZoom, onSelectTile]
  );

  const handleRemove = useCallback(
    (tileId) => {
      if (!confirm('¿Eliminar este tile? Las celdas que lo usen mostrarán vacío.')) return;
      onTilesetChange?.(removeTile(tileset, tileId));
    },
    [tileset, onTilesetChange]
  );

  const handleDragStart = (idx) => setDragSrcIdx(idx);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (toIdx) => {
    if (dragSrcIdx == null || dragSrcIdx === toIdx) return;
    onTilesetChange?.(reorderTiles(tileset, dragSrcIdx, toIdx));
    setDragSrcIdx(null);
  };

  return (
    <div className="tileset-panel">
      <div className="tileset-panel__header">
        <span className="tileset-panel__title">Tileset</span>
        <span className="tileset-panel__dims">
          {tileset.tileWidth}×{tileset.tileHeight} · {tileset.tiles.length} tiles
        </span>
      </div>

      <div className="tileset-panel__atlas-wrap">
        <canvas ref={atlasRef} onClick={handleAtlasClick} className="tileset-panel__atlas" />
        {/* Overlay de selección activa */}
        {(() => {
          const idx = tileset.tiles.findIndex((t) => t.id === activeTileId);
          if (idx < 0) return null;
          const col = idx % atlasColumns;
          const row = Math.floor(idx / atlasColumns);
          return (
            <div
              className="tileset-panel__sel"
              style={{
                width: tileset.tileWidth * previewZoom,
                height: tileset.tileHeight * previewZoom,
                transform: `translate(${col * tileset.tileWidth * previewZoom}px, ${row * tileset.tileHeight * previewZoom}px)`,
              }}
            />
          );
        })()}
      </div>

      {/* Lista con drag & borrar */}
      <ul className="tileset-panel__list">
        {tileset.tiles.map((t, i) => (
          <li
            key={t.id}
            className={`tileset-panel__item${activeTileId === t.id ? ' is-active' : ''}`}
            draggable={t.id !== 'tile_empty'}
            onDragStart={() => handleDragStart(i)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(i)}
            onClick={() => onSelectTile?.(t.id)}
          >
            <span className="tileset-panel__item-id">{t.id}</span>
            {t.id !== 'tile_empty' && (
              <button
                type="button"
                className="tileset-panel__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(t.id);
                }}
                title="Eliminar tile"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TilesetPanel;
