// tiledMode.js — wrap-edges para trabajar tiles seamless.
//
// El modo tiled hace que:
//   1. El canvas se muestre en preview con un patrón 3×3 (tileable preview).
//   2. Las herramientas wrapeen coordenadas con mod(canvasW/H) al pintar.
//   3. Los trazos que crucen bordes se escriban wrapped, permitiendo seamless tiles.

/**
 * @typedef {'none'|'x'|'y'|'both'} TiledMode
 */

export function wrapCoord(mode, x, y, width, height) {
  let wx = x, wy = y;
  if (mode === 'x' || mode === 'both') {
    wx = ((x % width) + width) % width;
  }
  if (mode === 'y' || mode === 'both') {
    wy = ((y % height) + height) % height;
  }
  return [wx, wy];
}

/**
 * Genera un canvas de preview 3×3 del canvas dado, según el modo tiled.
 * Útil para mostrar en un sidebar una vista del tile repetido.
 */
export function buildTiledPreview(sourceCanvas, mode) {
  if (mode === 'none') return sourceCanvas;
  const W = sourceCanvas.width, H = sourceCanvas.height;
  const canvas = document.createElement('canvas');
  const copies = {
    none: [[0, 0]],
    x: [[-1, 0], [0, 0], [1, 0]],
    y: [[0, -1], [0, 0], [0, 1]],
    both: [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0], [0,  0], [1,  0],
      [-1,  1], [0,  1], [1,  1],
    ],
  }[mode];

  const xs = copies.map(([x]) => x);
  const ys = copies.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  canvas.width = (maxX - minX + 1) * W;
  canvas.height = (maxY - minY + 1) * H;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const [dx, dy] of copies) {
    ctx.drawImage(sourceCanvas, (dx - minX) * W, (dy - minY) * H);
  }
  return canvas;
}

/**
 * Pinta un pixel con wrapping: útil dentro del pointer pipeline.
 * @param {CanvasRenderingContext2D} ctx
 * @param {TiledMode} mode
 */
export function paintPixelWrapped(ctx, mode, x, y, fillStyle, W, H) {
  const [wx, wy] = wrapCoord(mode, x, y, W, H);
  ctx.fillStyle = fillStyle;
  ctx.fillRect(wx, wy, 1, 1);
}

/**
 * Emite las N "copias" de un punto (x, y) según el modo tiled, incluyendo el
 * original. Sirve para que las herramientas que no son pixel-a-pixel (brush,
 * stamp) dibujen en los bordes en las posiciones wrapeadas.
 */
export function emitTiledCopies(mode, x, y, W, H) {
  const copies = [[0, 0]];
  if (mode === 'x' || mode === 'both') copies.push([-W, 0], [W, 0]);
  if (mode === 'y' || mode === 'both') copies.push([0, -H], [0, H]);
  if (mode === 'both') copies.push([-W, -H], [W, -H], [-W, H], [W, H]);
  return copies.map(([dx, dy]) => [x + dx, y + dy]);
}
