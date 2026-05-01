// magicWandTool.jsx — panel de parámetros de la herramienta Magic Wand.
//
// Propósito: exponer los parámetros configurables (tolerance, contiguous, matchAlpha,
// booleanOp) al usuario, y propagarlos al pipeline del workspaceContainer. La lógica
// de selección vive en `selection/selectionMask.js::maskFromMagicWand`; esta tool
// solo produce la configuración activa.
//
// Integración esperada (patrón idéntico a las otras tools):
//   1) Añadir `magicWand` al objeto TOOLS de workspaceContainer.
//   2) En el pointer pipeline: al click, invocar maskFromMagicWand(canvasActivo, x, y, params).
//   3) Combinar la máscara resultante con la máscara actual usando combineMasks:
//        - Sin modifier:   'replace'
//        - Shift:          'add'
//        - Alt (Option):   'subtract'
//        - Shift+Alt:      'intersect'
//      (`booleanOp` del panel establece el default cuando no hay modifier activo.)

import { LuWandSparkles } from 'react-icons/lu';
import './magicWandTool.css';

const MagicWandTool = ({ parameters, onChange }) => {
  const p = parameters ?? {
    tolerance: 0,
    contiguous: true,
    matchAlpha: true,
    booleanOp: 'replace',
  };

  const set = (partial) => onChange?.({ ...p, ...partial });

  return (
    <div className="magic-wand-tool">
      <div className="magic-wand-tool__header">
        <LuWandSparkles size={14} />
        <span>Varita Mágica</span>
      </div>

      <label className="magic-wand-tool__row">
        <span>Tolerancia: {p.tolerance}</span>
        <input
          type="range"
          min={0}
          max={128}
          value={p.tolerance}
          onChange={(e) => set({ tolerance: Number(e.target.value) })}
        />
      </label>

      <label className="magic-wand-tool__row magic-wand-tool__row--check">
        <input
          type="checkbox"
          checked={!!p.contiguous}
          onChange={(e) => set({ contiguous: e.target.checked })}
        />
        <span>Contiguo (solo píxeles conectados)</span>
      </label>

      <label className="magic-wand-tool__row magic-wand-tool__row--check">
        <input
          type="checkbox"
          checked={!!p.matchAlpha}
          onChange={(e) => set({ matchAlpha: e.target.checked })}
        />
        <span>Comparar alpha</span>
      </label>

      <div className="magic-wand-tool__row magic-wand-tool__row--col">
        <span>Operación por defecto</span>
        <div className="magic-wand-tool__ops">
          {[
            { id: 'replace',   label: 'Reemplazar' },
            { id: 'add',       label: 'Sumar (Shift)' },
            { id: 'subtract',  label: 'Restar (Alt)' },
            { id: 'intersect', label: 'Intersectar (Shift+Alt)' },
          ].map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => set({ booleanOp: op.id })}
              className={`magic-wand-tool__op${p.booleanOp === op.id ? ' is-active' : ''}`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="magic-wand-tool__hint">
        Tip: Shift = sumar · Alt = restar · Shift+Alt = intersectar (al hacer click).
      </div>
    </div>
  );
};

export default MagicWandTool;
