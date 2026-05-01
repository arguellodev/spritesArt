// layerMasks.js — máscaras de capa (aplican una cutout a la capa antes de compositar).
//
// Cada capa puede tener OPCIONALMENTE un maskCanvas del mismo tamaño que su canvas
// principal. El pipeline de render aplica la máscara vía `destination-in` sobre un
// buffer offscreen, compositando luego el resultado sobre la capa de abajo.
//
// "Clip to layer below" es un alias: usa la alpha de la capa inferior como máscara
// automática (se puede implementar re-usando composeWithMask con el canvas inferior
// como maskCanvas).

/**
 * @typedef {object} LayerMask
 * @property {HTMLCanvasElement} canvas     Mismo tamaño que la capa principal.
 *                                           El canal alpha actúa como máscara (0..255).
 * @property {boolean} [enabled=true]
 * @property {boolean} [inverted=false]
 */

/**
 * Crea una máscara vacía del tamaño de la capa.
 */
export function createEmptyMask(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, enabled: true, inverted: false };
}

/**
 * Crea una máscara llena (todo visible). Útil como estado inicial tras "Add Mask".
 */
export function createFullMask(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  return { canvas, enabled: true, inverted: false };
}

/**
 * Compone `layerCanvas` respetando `mask` y lo dibuja en `destCtx`.
 * Retorna un canvas nuevo con el contenido ya recortado (útil para caching).
 *
 * @param {HTMLCanvasElement} layerCanvas
 * @param {LayerMask} mask
 * @returns {HTMLCanvasElement}   Canvas resultado ya enmascarado.
 */
export function applyMaskToCanvas(layerCanvas, mask) {
  if (!mask?.enabled) return layerCanvas;
  const out = document.createElement('canvas');
  out.width = layerCanvas.width;
  out.height = layerCanvas.height;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(layerCanvas, 0, 0);
  if (mask.inverted) {
    // Invertir: destination-out quita donde la máscara tiene alpha.
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    // Normal: destination-in conserva donde la máscara tiene alpha.
    ctx.globalCompositeOperation = 'destination-in';
  }
  ctx.drawImage(mask.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

/**
 * "Apply mask" destructivo: funde la máscara en el canvas y retorna el nuevo
 * canvas resultado. Tras esto el consumidor suele descartar el mask.
 */
export function bakeMask(layerCanvas, mask) {
  return applyMaskToCanvas(layerCanvas, mask);
}

/**
 * "Clip to layer below": genera una máscara usando el alpha de la capa inferior.
 * El consumidor la guarda en la capa superior o la aplica en vivo en el pipeline.
 */
export function buildClippingMaskFromLayerBelow(lowerCanvas) {
  const canvas = document.createElement('canvas');
  canvas.width = lowerCanvas.width;
  canvas.height = lowerCanvas.height;
  canvas.getContext('2d').drawImage(lowerCanvas, 0, 0);
  return { canvas, enabled: true, inverted: false };
}

/**
 * Toggle inverted (útil como acción desde UI).
 */
export function invertMaskCanvas(mask) {
  const { canvas } = mask;
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  for (let i = 3; i < data.length; i += 4) data[i] = 255 - data[i];
  ctx.putImageData(img, 0, 0);
  return { ...mask };
}

/**
 * "Fill mask": pinta toda la máscara con alpha=255 (todo visible).
 */
export function fillMask(mask) {
  const ctx = mask.canvas.getContext('2d');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, mask.canvas.width, mask.canvas.height);
  return { ...mask };
}

/**
 * "Clear mask": todo transparente (todo oculto).
 */
export function clearMask(mask) {
  const ctx = mask.canvas.getContext('2d');
  ctx.clearRect(0, 0, mask.canvas.width, mask.canvas.height);
  return { ...mask };
}
