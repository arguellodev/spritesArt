// selectionOps.js — operaciones booleanas y morfológicas sobre SelectionMask.
// Todas las funciones son puras: retornan una máscara nueva, no mutan la entrada.

import { createMask, cloneMask } from './selectionMask';

/**
 * Combina dos máscaras según un modo.
 *
 * Modos soportados:
 *  - 'replace'   — devuelve b (con dimensiones de a si coinciden; sino clona b).
 *  - 'add'       — unión: a ∪ b.
 *  - 'subtract'  — resta: a - b.
 *  - 'intersect' — intersección: a ∩ b.
 *  - 'xor'       — diferencia simétrica.
 *
 * Si las dimensiones difieren, se usa el tamaño de `a` y `b` se recorta/rellena en ese marco.
 *
 * @param {import('./selectionMask').SelectionMask} a
 * @param {import('./selectionMask').SelectionMask} b
 * @param {'replace'|'add'|'subtract'|'intersect'|'xor'} mode
 * @returns {import('./selectionMask').SelectionMask}
 */
export function combineMasks(a, b, mode) {
  if (mode === 'replace') return cloneMask(b);

  // Trabajamos en el marco de a. Si b tiene distinto tamaño, se evalúa por coordenadas.
  const out = createMask(a.width, a.height);
  const aw = a.width, bw = b.width, bh = b.height;
  for (let y = 0; y < a.height; y++) {
    const aRow = y * aw;
    const bRow = y * bw;
    const inB = y < bh;
    for (let x = 0; x < a.width; x++) {
      const av = a.data[aRow + x];
      const bv = inB && x < bw ? b.data[bRow + x] : 0;
      let v = 0;
      switch (mode) {
        case 'add':       v = av || bv; break;
        case 'subtract':  v = av && !bv ? 1 : 0; break;
        case 'intersect': v = av && bv ? 1 : 0; break;
        case 'xor':       v = (av ? 1 : 0) ^ (bv ? 1 : 0); break;
        default:          v = bv; break;
      }
      out.data[aRow + x] = v;
    }
  }
  return out;
}

/**
 * Invierte una máscara (todo píxel seleccionado se deselecciona y viceversa).
 */
export function invertMask(mask) {
  const out = cloneMask(mask);
  const data = out.data;
  for (let i = 0; i < data.length; i++) data[i] = data[i] ? 0 : 1;
  return out;
}

/**
 * Dilata (grow) una máscara N píxeles. Cada paso expande 1 pixel en 4-vecinos.
 * Para anillo 8-conectado, pasar `diagonal: true`.
 *
 * @param {import('./selectionMask').SelectionMask} mask
 * @param {number} n                    Cantidad de píxeles a expandir (>=0).
 * @param {{diagonal?:boolean}} [opts]
 */
export function growMask(mask, n, { diagonal = false } = {}) {
  if (n <= 0) return cloneMask(mask);
  let current = cloneMask(mask);
  for (let step = 0; step < n; step++) {
    current = _dilateOnce(current, diagonal);
  }
  return current;
}

/**
 * Erosiona (shrink) una máscara N píxeles. Cada paso retrae 1 pixel en 4-vecinos.
 */
export function shrinkMask(mask, n, { diagonal = false } = {}) {
  if (n <= 0) return cloneMask(mask);
  let current = cloneMask(mask);
  for (let step = 0; step < n; step++) {
    current = _erodeOnce(current, diagonal);
  }
  return current;
}

/**
 * Extrae el borde (contorno) de 1px de ancho: los píxeles seleccionados
 * que tengan al menos un vecino no seleccionado (o que estén en el límite del canvas).
 * Útil para renderizar el marching ants o para operaciones tipo outline.
 */
export function maskBorder(mask) {
  const { width, height, data } = mask;
  const out = createMask(width, height);
  const outData = out.data;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!data[row + x]) continue;
      const left = x === 0 ? 0 : data[row + x - 1];
      const right = x === width - 1 ? 0 : data[row + x + 1];
      const up = y === 0 ? 0 : data[row - width + x];
      const down = y === height - 1 ? 0 : data[row + width + x];
      if (!left || !right || !up || !down) outData[row + x] = 1;
    }
  }
  return out;
}

// --- Internos ---

function _dilateOnce(mask, diagonal) {
  const { width, height, data } = mask;
  const out = createMask(width, height);
  const o = out.data;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (data[row + x]) { o[row + x] = 1; continue; }
      // 4-conectado
      if (
        (x > 0 && data[row + x - 1]) ||
        (x < width - 1 && data[row + x + 1]) ||
        (y > 0 && data[row - width + x]) ||
        (y < height - 1 && data[row + width + x])
      ) {
        o[row + x] = 1;
        continue;
      }
      if (diagonal) {
        if (
          (x > 0 && y > 0 && data[row - width + x - 1]) ||
          (x < width - 1 && y > 0 && data[row - width + x + 1]) ||
          (x > 0 && y < height - 1 && data[row + width + x - 1]) ||
          (x < width - 1 && y < height - 1 && data[row + width + x + 1])
        ) {
          o[row + x] = 1;
        }
      }
    }
  }
  return out;
}

function _erodeOnce(mask, diagonal) {
  const { width, height, data } = mask;
  const out = createMask(width, height);
  const o = out.data;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!data[row + x]) continue;
      // Si algún vecino requerido falta, se erosiona.
      const l = x === 0 ? 0 : data[row + x - 1];
      const r = x === width - 1 ? 0 : data[row + x + 1];
      const u = y === 0 ? 0 : data[row - width + x];
      const d = y === height - 1 ? 0 : data[row + width + x];
      let survives = l && r && u && d;
      if (survives && diagonal) {
        const tl = x === 0 || y === 0 ? 0 : data[row - width + x - 1];
        const tr = x === width - 1 || y === 0 ? 0 : data[row - width + x + 1];
        const bl = x === 0 || y === height - 1 ? 0 : data[row + width + x - 1];
        const br = x === width - 1 || y === height - 1 ? 0 : data[row + width + x + 1];
        survives = tl && tr && bl && br;
      }
      if (survives) o[row + x] = 1;
    }
  }
  return out;
}
