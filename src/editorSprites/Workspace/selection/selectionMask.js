// selectionMask.js — máscara de selección basada en Uint8Array.
//
// La máscara es un bitmap por píxel: 1 = seleccionado, 0 = fuera.
// Usar Uint8Array (no bits empaquetados) simplifica enormemente las ops booleanas
// y morfológicas sin afectar memoria de forma significativa en canvases pixel-art
// típicos (64x64 = 4KB, 256x256 = 64KB).

/**
 * @typedef {object} SelectionMask
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array} data     Tamaño = width * height. 0 = off, 1 = on.
 */

/**
 * Crea una máscara vacía (todos los píxeles deseleccionados).
 * @param {number} width
 * @param {number} height
 * @returns {SelectionMask}
 */
export function createMask(width, height) {
  return { width, height, data: new Uint8Array(width * height) };
}

/**
 * Clon profundo de una máscara.
 * @param {SelectionMask} mask
 */
export function cloneMask(mask) {
  return { width: mask.width, height: mask.height, data: new Uint8Array(mask.data) };
}

export function setPixel(mask, x, y, value = 1) {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return;
  mask.data[y * mask.width + x] = value ? 1 : 0;
}

export function getPixel(mask, x, y) {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return 0;
  return mask.data[y * mask.width + x];
}

/**
 * ¿La máscara está vacía (sin píxeles seleccionados)?
 * Lineal por ahora; para canvases grandes podría usarse un contador incremental.
 */
export function isEmpty(mask) {
  const data = mask.data;
  for (let i = 0; i < data.length; i++) if (data[i]) return false;
  return true;
}

/**
 * Cuenta píxeles seleccionados.
 */
export function countSelected(mask) {
  const data = mask.data;
  let n = 0;
  for (let i = 0; i < data.length; i++) if (data[i]) n++;
  return n;
}

/**
 * Llena una máscara por completo (select all).
 */
export function selectAll(width, height) {
  const m = createMask(width, height);
  m.data.fill(1);
  return m;
}

/**
 * Calcula el bounding box de una máscara (útil para render del marching ants).
 * Retorna null si la máscara está vacía.
 * @returns {{minX:number,minY:number,maxX:number,maxY:number}|null}
 */
export function getBounds(mask) {
  const { width, height, data } = mask;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (data[row + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Magic wand: selecciona píxeles del canvas cuyo color coincide con el del pixel semilla.
 *
 * @param {HTMLCanvasElement|OffscreenCanvas|ImageData} source
 *        Fuente de pixeles. Si es ImageData, width/height provienen de él.
 * @param {number} seedX    Coordenada x del pixel clickeado.
 * @param {number} seedY    Coordenada y del pixel clickeado.
 * @param {object} [opts]
 * @param {number}  [opts.tolerance=0]   Tolerancia por canal (Euclidian² en RGBA).
 * @param {boolean} [opts.contiguous=true]
 *                  Si true, solo selecciona píxeles conectados (4-vecinos) al seed.
 *                  Si false, selecciona TODOS los píxeles del canvas con ese color.
 * @param {boolean} [opts.matchAlpha=true]
 *                  Si true, compara también el canal alpha (importante para pixel-art).
 * @returns {SelectionMask}
 */
export function maskFromMagicWand(source, seedX, seedY, opts = {}) {
  const { tolerance = 0, contiguous = true, matchAlpha = true } = opts;
  let width, height, pixels;
  if (source instanceof ImageData) {
    ({ width, height } = source);
    pixels = source.data;
  } else {
    width = source.width;
    height = source.height;
    const ctx = source.getContext('2d');
    pixels = ctx.getImageData(0, 0, width, height).data;
  }

  const mask = createMask(width, height);
  if (seedX < 0 || seedY < 0 || seedX >= width || seedY >= height) return mask;

  const seedIdx = (seedY * width + seedX) * 4;
  const sR = pixels[seedIdx];
  const sG = pixels[seedIdx + 1];
  const sB = pixels[seedIdx + 2];
  const sA = pixels[seedIdx + 3];

  const tolSq = tolerance * tolerance * (matchAlpha ? 4 : 3);
  const exact = tolerance === 0;

  const sameColor = (idx) => {
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const a = pixels[idx + 3];
    if (exact) {
      if (r !== sR || g !== sG || b !== sB) return false;
      if (matchAlpha && a !== sA) return false;
      return true;
    }
    const dr = r - sR, dg = g - sG, db = b - sB;
    let sum = dr * dr + dg * dg + db * db;
    if (matchAlpha) {
      const da = a - sA;
      sum += da * da;
    }
    return sum <= tolSq;
  };

  if (!contiguous) {
    // Global scan: TODOS los píxeles con el mismo color.
    for (let i = 0; i < pixels.length; i += 4) {
      if (sameColor(i)) mask.data[i >> 2] = 1;
    }
    return mask;
  }

  // Flood fill 4-vecinos con stack (evita recursión profunda).
  const stack = [[seedX, seedY]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const maskIdx = y * width + x;
    if (mask.data[maskIdx]) continue;
    const pxIdx = maskIdx * 4;
    if (!sameColor(pxIdx)) continue;
    mask.data[maskIdx] = 1;
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }
  return mask;
}

/**
 * Construye una máscara rectangular (útil para select rect o para los tests).
 */
export function maskFromRect(width, height, x, y, w, h) {
  const mask = createMask(width, height);
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(width, x + w);
  const y1 = Math.min(height, y + h);
  for (let py = y0; py < y1; py++) {
    const row = py * width;
    for (let px = x0; px < x1; px++) {
      mask.data[row + px] = 1;
    }
  }
  return mask;
}
