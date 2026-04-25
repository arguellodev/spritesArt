// tileTool.jsx — panel de parámetros de la herramienta Tile (pinta tiles en un tilemapLayer).
// La lógica de pintado vive en tilemap/tilemapLayer.js::paintTile; este panel expone
// los controles (tile activo, flip, rotación) al usuario y propaga cambios via onChange.

import React from 'react';
import { LuFlipHorizontal, LuFlipVertical, LuRotateCw } from 'react-icons/lu';
import './tileTool.css';

const TileTool = ({ parameters, onChange }) => {
  const p = parameters ?? { flipH: false, flipV: false, rotation: 0, paintMode: 'single' };
  const set = (partial) => onChange?.({ ...p, ...partial });
  const cycleRotation = () => set({ rotation: (p.rotation + 90) % 360 });

  return (
    <div className="tile-tool">
      <div className="tile-tool__header">Tile tool</div>

      <div className="tile-tool__row">
        <span>Modo</span>
        <div className="tile-tool__btn-group">
          {[
            { id: 'single', label: 'Click' },
            { id: 'drag', label: 'Arrastrar' },
            { id: 'rect', label: 'Rectángulo' },
            { id: 'fill', label: 'Relleno' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => set({ paintMode: m.id })}
              className={`tile-tool__mode${p.paintMode === m.id ? ' is-active' : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tile-tool__row">
        <span>Transform</span>
        <div className="tile-tool__btn-group">
          <button
            type="button"
            onClick={() => set({ flipH: !p.flipH })}
            className={`tile-tool__toggle${p.flipH ? ' is-active' : ''}`}
            title="Espejo horizontal"
          >
            <LuFlipHorizontal size={14} />
          </button>
          <button
            type="button"
            onClick={() => set({ flipV: !p.flipV })}
            className={`tile-tool__toggle${p.flipV ? ' is-active' : ''}`}
            title="Espejo vertical"
          >
            <LuFlipVertical size={14} />
          </button>
          <button
            type="button"
            onClick={cycleRotation}
            className="tile-tool__toggle"
            title={`Rotación actual: ${p.rotation}° (click rota 90°)`}
          >
            <LuRotateCw size={14} /> {p.rotation}°
          </button>
        </div>
      </div>

      <div className="tile-tool__hint">
        Selecciona un tile en el panel de Tileset y click en el tilemap para pintarlo.
      </div>
    </div>
  );
};

export default TileTool;
