// tilemapLayer.js — tipo de capa basado en tiles.
//
// A diferencia de las capas pixel, un tilemapLayer no guarda píxeles por frame:
// guarda una grilla de celdas donde cada celda es { tileId, flipH, flipV, rotation }.
// El render resuelve cada celda consultando al tileset.
//
// Dimensiones: la grilla tiene `cols × rows` celdas. El tamaño píxel efectivo
// es `cols * tileWidth × rows * tileHeight`.

/**
 * @typedef {object} TileCell
 * @property {string} tileId               'tile_empty' para celdas vacías.
 * @property {boolean} [flipH=false]
 * @property {boolean} [flipV=false]
 * @property {0|90|180|270} [rotation=0]
 */

/**
 * @typedef {object} TilemapLayer
 * @property {string} id
 * @property {'tilemap'} type
 * @property {string} name
 * @property {number} cols
 * @property {number} rows
 * @property {string} tilesetId            Referencia al tileset.
 * @property {TileCell[]} cells            length = cols * rows. Orden row-major.
 * @property {boolean} visible
 * @property {number} opacity
 * @property {number} zIndex
 */

export function createTilemapLayer({
  id,
  name = 'Tilemap',
  cols,
  rows,
  tilesetId,
  zIndex = 0,
}) {
  const cells = new Array(cols * rows);
  for (let i = 0; i < cells.length; i++) cells[i] = { tileId: 'tile_empty' };
  return {
    id,
    type: 'tilemap',
    name,
    cols,
    rows,
    tilesetId,
    cells,
    visible: true,
    opacity: 1,
    zIndex,
  };
}

export function getCell(layer, col, row) {
  if (col < 0 || row < 0 || col >= layer.cols || row >= layer.rows) return null;
  return layer.cells[row * layer.cols + col];
}

/**
 * Devuelve una capa nueva con la celda (col, row) reemplazada.
 */
export function setCell(layer, col, row, cell) {
  if (col < 0 || row < 0 || col >= layer.cols || row >= layer.rows) return layer;
  const cells = layer.cells.slice();
  cells[row * layer.cols + col] = cell;
  return { ...layer, cells };
}

/**
 * Pinta un tile en (col, row). Shortcut de setCell con {tileId, flipH, flipV, rotation}.
 */
export function paintTile(layer, col, row, tileId, { flipH = false, flipV = false, rotation = 0 } = {}) {
  return setCell(layer, col, row, { tileId, flipH, flipV, rotation });
}

/**
 * Borra (col, row) → tileId empty.
 */
export function eraseCell(layer, col, row) {
  return setCell(layer, col, row, { tileId: 'tile_empty' });
}

/**
 * Rellena un área rectangular de celdas con un tile (bucket-fill rect).
 * Útil para la herramienta "rect" dentro de un tilemap.
 */
export function fillRect(layer, col0, row0, col1, row1, tileId, opts) {
  const xa = Math.min(col0, col1);
  const xb = Math.max(col0, col1);
  const ya = Math.min(row0, row1);
  const yb = Math.max(row0, row1);
  const cells = layer.cells.slice();
  for (let r = ya; r <= yb; r++) {
    for (let c = xa; c <= xb; c++) {
      if (c < 0 || r < 0 || c >= layer.cols || r >= layer.rows) continue;
      cells[r * layer.cols + c] = { tileId, ...opts };
    }
  }
  return { ...layer, cells };
}

/**
 * Render de un tilemap a un canvas píxel. Útil para preview, export y snapshot.
 * El tileset se resuelve consultando `lookupTile(tileId) → tile | null`.
 *
 * @param {TilemapLayer} layer
 * @param {{tileWidth:number, tileHeight:number}} tileDims
 * @param {(tileId:string) => ({canvas:HTMLCanvasElement}|null)} lookupTile
 * @returns {HTMLCanvasElement}
 */
export function renderTilemapToCanvas(layer, tileDims, lookupTile) {
  const { cols, rows, cells } = layer;
  const { tileWidth, tileHeight } = tileDims;
  const canvas = document.createElement('canvas');
  canvas.width = cols * tileWidth;
  canvas.height = rows * tileHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c];
      if (!cell || cell.tileId === 'tile_empty') continue;
      const tile = lookupTile(cell.tileId);
      if (!tile) continue;
      _drawTile(ctx, tile.canvas, c * tileWidth, r * tileHeight, tileWidth, tileHeight, cell);
    }
  }
  return canvas;
}

function _drawTile(ctx, tileCanvas, dx, dy, w, h, { flipH = false, flipV = false, rotation = 0 }) {
  ctx.save();
  ctx.translate(dx + w / 2, dy + h / 2);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  if (flipH || flipV) ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(tileCanvas, -w / 2, -h / 2, w, h);
  ctx.restore();
}
