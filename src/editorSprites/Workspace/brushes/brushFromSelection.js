// brushFromSelection.js — convierte una selección + capa activa en una brocha custom.
//
// La brocha resultante usa el formato que ya consume brushSelect.jsx:
//   { id, name, pixels: Array<{x, y, color: {r,g,b,a}, opacity}>, useCurrentColor }
//
// `pixels` son coordenadas locales (origen en el bounding box de la selección).

import { getBounds } from '../selection/selectionMask';

let _idCounter = 0;
const newBrushId = () => `brush_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

/**
 * @param {HTMLCanvasElement|ImageData} source
 * @param {import('../selection/selectionMask').SelectionMask} mask
 * @param {object} [opts]
 * @param {string}  [opts.name]
 * @param {boolean} [opts.useCurrentColor=false]
 *                  Si true, la brocha usará el color foreground del editor al
 *                  pintar (ignora el color almacenado en los pixeles).
 * @returns {{id:string, name:string, pixels:Array, useCurrentColor:boolean, width:number, height:number}}
 */
export function brushFromSelection(source, mask, { name, useCurrentColor = false } = {}) {
  const bounds = getBounds(mask);
  if (!bounds) {
    return {
      id: newBrushId(),
      name: name || 'Brocha vacía',
      pixels: [],
      useCurrentColor,
      width: 0,
      height: 0,
    };
  }

  let width, height, data;
  if (source instanceof ImageData) {
    width = source.width;
    height = source.height;
    data = source.data;
  } else {
    width = source.width;
    height = source.height;
    const ctx = source.getContext('2d');
    data = ctx.getImageData(0, 0, width, height).data;
  }

  const pixels = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!mask.data[y * mask.width + x]) continue;
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a === 0) continue; // pixel transparente
      pixels.push({
        x: x - bounds.minX,
        y: y - bounds.minY,
        color: { r: data[idx], g: data[idx + 1], b: data[idx + 2], a },
        opacity: a / 255,
      });
    }
  }

  return {
    id: newBrushId(),
    name: name || `Brocha ${pixels.length}px`,
    pixels,
    useCurrentColor,
    width: bounds.maxX - bounds.minX + 1,
    height: bounds.maxY - bounds.minY + 1,
  };
}

/**
 * Persiste una brocha custom en localStorage (bajo una colección 'myBrushes').
 */
export function saveBrushToLocalStorage(brush, key = 'pixcalli.brushes.custom') {
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    list.push(brush);
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function loadBrushesFromLocalStorage(key = 'pixcalli.brushes.custom') {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteBrushFromLocalStorage(brushId, key = 'pixcalli.brushes.custom') {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const list = JSON.parse(raw).filter((b) => b.id !== brushId);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // noop
  }
}
