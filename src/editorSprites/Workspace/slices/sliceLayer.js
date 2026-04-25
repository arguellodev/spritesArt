// sliceLayer.js — slices al estilo Aseprite: regiones nombradas (rect + 9-slice + pivot)
// que se exportan en el JSON del sprite sheet. No contienen píxeles.
//
// Un `SliceLayer` es una lista de Slice. Cada slice:
//   { id, name, color, bounds: {x,y,w,h}, center?: {x,y,w,h}, pivot?: {x,y} }
// - bounds es el rect principal (hitbox, región de sprite, etc.)
// - center es opcional: define el área "stretcheable" en un UI 9-slice (borders NO stretchean).
// - pivot es opcional: punto de anclaje (para rotaciones, offsets de origen en motores).

let _idCounter = 0;
const newId = () => `slice_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

/**
 * @typedef {object} Slice
 * @property {string} id
 * @property {string} name
 * @property {string} color                 Hex del color del borde en editor (visual).
 * @property {{x:number,y:number,w:number,h:number}} bounds
 * @property {{x:number,y:number,w:number,h:number}} [center]
 * @property {{x:number,y:number}} [pivot]
 */

export function createSliceLayer() {
  return { id: 'slices_main', type: 'slices', name: 'Slices', slices: [], visible: true };
}

export function addSlice(layer, { name, bounds, center, pivot, color = '#ffcc44' }) {
  const slice = { id: newId(), name: name || `slice_${layer.slices.length + 1}`, color, bounds };
  if (center) slice.center = center;
  if (pivot) slice.pivot = pivot;
  return { ...layer, slices: [...layer.slices, slice] };
}

export function updateSlice(layer, sliceId, patch) {
  return {
    ...layer,
    slices: layer.slices.map((s) => (s.id === sliceId ? { ...s, ...patch } : s)),
  };
}

export function removeSlice(layer, sliceId) {
  return { ...layer, slices: layer.slices.filter((s) => s.id !== sliceId) };
}

/**
 * Exporta los slices en el mismo formato que usa Aseprite sheet JSON (`meta.slices`):
 *   { name, color, keys: [{ frame, bounds, center?, pivot? }] }
 * Versión simplificada (sin multi-frame keyframes).
 */
export function exportAsepriteCompatible(layer) {
  return layer.slices.map((s) => ({
    name: s.name,
    color: s.color,
    keys: [
      {
        frame: 0,
        bounds: s.bounds,
        ...(s.center ? { center: s.center } : {}),
        ...(s.pivot ? { pivot: s.pivot } : {}),
      },
    ],
  }));
}

/**
 * Dibuja los slices sobre un canvas overlay (útil para preview en el workspace).
 * No modifica la capa; solo renderiza su visualización.
 */
export function drawSlicesOverlay(ctx, layer, { zoom = 1, showPivot = true, showCenter = true } = {}) {
  ctx.save();
  ctx.lineWidth = 1;
  for (const s of layer.slices) {
    ctx.strokeStyle = s.color || '#ffcc44';
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(
      s.bounds.x * zoom + 0.5,
      s.bounds.y * zoom + 0.5,
      s.bounds.w * zoom - 1,
      s.bounds.h * zoom - 1
    );
    if (showCenter && s.center) {
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.strokeRect(
        (s.bounds.x + s.center.x) * zoom + 0.5,
        (s.bounds.y + s.center.y) * zoom + 0.5,
        s.center.w * zoom - 1,
        s.center.h * zoom - 1
      );
    }
    if (showPivot && s.pivot) {
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff4a6e';
      const px = (s.bounds.x + s.pivot.x) * zoom;
      const py = (s.bounds.y + s.pivot.y) * zoom;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    // etiqueta
    ctx.setLineDash([]);
    ctx.fillStyle = s.color;
    ctx.font = '10px monospace';
    ctx.fillText(s.name, s.bounds.x * zoom + 2, s.bounds.y * zoom - 2);
  }
  ctx.restore();
}
