// autoCrop.js — recorte automático / crop a selección / resize del documento.
//
// Funciones puras que devuelven estructuras nuevas. Las 3 operaciones modifican
// el tamaño del documento y requieren reubicar todas las capas/frames.

/**
 * Calcula el bounding box de píxeles opacos de un canvas (minX, minY, maxX, maxY).
 * Retorna null si el canvas está completamente vacío.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} [alphaThreshold=0]  Alpha mínimo para considerar "opaco".
 */
export function computeOpaqueBounds(canvas, { alphaThreshold = 0 } = {}) {
  if (!canvas || !canvas.width || !canvas.height) return null;
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
  const W = canvas.width;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * 4 + 3];
      if (a > alphaThreshold) {
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
 * Calcula el bounding box combinado (unión) de múltiples canvases.
 * Útil para auto-crop multi-capa multi-frame.
 */
export function computeUnionBounds(canvases, opts) {
  let min = null;
  for (const c of canvases) {
    const b = computeOpaqueBounds(c, opts);
    if (!b) continue;
    if (!min) min = { ...b };
    else {
      if (b.minX < min.minX) min.minX = b.minX;
      if (b.minY < min.minY) min.minY = b.minY;
      if (b.maxX > min.maxX) min.maxX = b.maxX;
      if (b.maxY > min.maxY) min.maxY = b.maxY;
    }
  }
  return min;
}

/**
 * Recorta un canvas a un rect (x, y, w, h) y devuelve uno nuevo.
 */
export function cropCanvas(canvas, x, y, w, h) {
  const out = document.createElement('canvas');
  out.width = Math.max(1, w);
  out.height = Math.max(1, h);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return out;
}

/**
 * Aumenta un canvas a un tamaño nuevo, manteniendo el contenido en (offsetX, offsetY).
 * Útil para resizeCanvas cuando se agranda.
 */
export function resizeCanvas(canvas, newWidth, newHeight, offsetX = 0, offsetY = 0) {
  const out = document.createElement('canvas');
  out.width = newWidth;
  out.height = newHeight;
  out.getContext('2d').drawImage(canvas, offsetX, offsetY);
  return out;
}

/**
 * Auto-crop: calcula la unión de bounds de todos los canvases y devuelve los
 * canvases recortados + las nuevas dimensiones. Los frames/capas que quedan
 * fuera del bbox se devuelven vacíos pero con el tamaño nuevo.
 *
 * @param {HTMLCanvasElement[]} canvases
 * @param {object} [opts]
 * @param {number} [opts.padding=0]        Pixels de margen extra alrededor.
 * @returns {{bounds, canvases: HTMLCanvasElement[], width: number, height: number}|null}
 */
export function autoCrop(canvases, { padding = 0 } = {}) {
  const bounds = computeUnionBounds(canvases);
  if (!bounds) return null;
  const x0 = Math.max(0, bounds.minX - padding);
  const y0 = Math.max(0, bounds.minY - padding);
  const x1 = bounds.maxX + padding;
  const y1 = bounds.maxY + padding;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  return {
    bounds,
    width: w,
    height: h,
    canvases: canvases.map((c) => cropCanvas(c, x0, y0, w, h)),
  };
}

/**
 * Crop a selección rectangular específica (no auto). Útil cuando el usuario tiene
 * una selección rect activa y escoge "Crop to selection".
 */
export function cropToRect(canvases, x, y, w, h) {
  return {
    width: w,
    height: h,
    canvases: canvases.map((c) => cropCanvas(c, x, y, w, h)),
  };
}

/**
 * Resize de documento: expande o recorta todos los canvases al nuevo tamaño.
 * `anchor` decide cómo se reubica el contenido:
 *   'top-left', 'top', 'top-right',
 *   'left',     'center', 'right',
 *   'bottom-left', 'bottom', 'bottom-right'
 */
export function resizeDocument(canvases, oldWidth, oldHeight, newWidth, newHeight, anchor = 'top-left') {
  const dx = anchorOffset(anchor, newWidth - oldWidth, true);
  const dy = anchorOffset(anchor, newHeight - oldHeight, false);
  return {
    width: newWidth,
    height: newHeight,
    canvases: canvases.map((c) => {
      const out = document.createElement('canvas');
      out.width = newWidth;
      out.height = newHeight;
      out.getContext('2d').drawImage(c, dx, dy);
      return out;
    }),
  };
}

function anchorOffset(anchor, delta, isX) {
  if (!delta) return 0;
  if (isX) {
    if (anchor.includes('left')) return 0;
    if (anchor.includes('right')) return delta;
    return Math.floor(delta / 2);
  }
  if (anchor.includes('top')) return 0;
  if (anchor.includes('bottom')) return delta;
  return Math.floor(delta / 2);
}
