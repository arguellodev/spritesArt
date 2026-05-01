// tileset.js — modelo de datos del tileset y operaciones puras.
//
// Un tileset es una lista ordenada de tiles (canvas MxM px). Cada tile guarda:
//   { id: string, canvas: HTMLCanvasElement, hash: string }
//
// El `hash` permite deduplicar tiles idénticos rápidamente cuando el usuario pinta.
// Los ids son estables (UUID-lite) para que los tilemapLayer puedan referenciarlos
// incluso cuando se reordena o elimina un tile (dejamos un tile "placeholder" en su
// lugar para no romper referencias en mapas existentes — el consumidor decide si
// eliminar de raíz o marcar como tombstone).
//
// Todas las funciones que mutan (setTileAt, addTile, replaceTile, removeTile)
// retornan un objeto NUEVO del tileset; no mutan el original. Esto encaja con
// el patrón React/useState y facilita undo/redo.

let _idCounter = 0;
const newId = () => `tile_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

/**
 * @typedef {object} Tile
 * @property {string} id
 * @property {HTMLCanvasElement} canvas
 * @property {string} hash              // '#' para tile vacío
 */

/**
 * @typedef {object} Tileset
 * @property {number} tileWidth
 * @property {number} tileHeight
 * @property {Tile[]} tiles              // índice 0 = tile "vacío" canónico
 */

/**
 * Crea un tileset vacío. Siempre incluye un tile 0 "vacío" (transparente) como
 * sentinel, útil para celdas sin contenido en el tilemap.
 */
export function createTileset(tileWidth = 16, tileHeight = 16) {
  const emptyCanvas = document.createElement('canvas');
  emptyCanvas.width = tileWidth;
  emptyCanvas.height = tileHeight;
  const empty = { id: 'tile_empty', canvas: emptyCanvas, hash: hashCanvas(emptyCanvas) };
  return { tileWidth, tileHeight, tiles: [empty] };
}

/**
 * Hash rápido del contenido pixel-data. No es criptográfico — solo dedupe.
 * FNV-1a de 32 bits sobre el ImageData.
 */
export function hashCanvas(canvas) {
  if (!canvas || !canvas.getContext) return '#';
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let h = 0x811c9dc5; // FNV offset
  for (let i = 0; i < data.length; i++) {
    h ^= data[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * Busca un tile por hash. Devuelve el primer match o null.
 */
export function findTileByHash(tileset, hash) {
  return tileset.tiles.find((t) => t.hash === hash) || null;
}

/**
 * Añade un tile al tileset. Si ya existe un tile con el mismo hash, reutiliza
 * ese (dedupe automático) y devuelve su id. Retorna { tileset, tileId }.
 */
export function addTile(tileset, canvas) {
  if (canvas.width !== tileset.tileWidth || canvas.height !== tileset.tileHeight) {
    throw new Error(
      `Tile dimensions mismatch: expected ${tileset.tileWidth}×${tileset.tileHeight}, got ${canvas.width}×${canvas.height}`
    );
  }
  const hash = hashCanvas(canvas);
  const existing = findTileByHash(tileset, hash);
  if (existing) return { tileset, tileId: existing.id };

  const id = newId();
  const tile = { id, canvas: cloneCanvas(canvas), hash };
  return {
    tileset: { ...tileset, tiles: [...tileset.tiles, tile] },
    tileId: id,
  };
}

/**
 * Reemplaza el contenido de un tile existente. Usado cuando el usuario
 * edita un tile que se comparte entre muchas celdas del tilemap (modo "actualiza
 * todas las instancias"). Si el consumidor quiere fork, debe llamar addTile con
 * el nuevo canvas y actualizar las celdas manualmente.
 */
export function replaceTile(tileset, tileId, newCanvas) {
  if (newCanvas.width !== tileset.tileWidth || newCanvas.height !== tileset.tileHeight) {
    throw new Error('Tile dimensions mismatch');
  }
  const hash = hashCanvas(newCanvas);
  return {
    ...tileset,
    tiles: tileset.tiles.map((t) =>
      t.id === tileId ? { ...t, canvas: cloneCanvas(newCanvas), hash } : t
    ),
  };
}

/**
 * Elimina un tile del tileset. Deja un placeholder vacío en su índice si el
 * consumidor lo pide (`replaceWithEmpty: true`), para que los tilemaps que
 * lo referenciaban no queden con ids huérfanos — aunque el id ya no existirá,
 * así que los consumidores deben limpiar referencias.
 */
export function removeTile(tileset, tileId) {
  if (tileId === 'tile_empty') return tileset; // protegido
  return { ...tileset, tiles: tileset.tiles.filter((t) => t.id !== tileId) };
}

/**
 * Reordena tiles (para UI drag-reorder).
 */
export function reorderTiles(tileset, fromIdx, toIdx) {
  if (fromIdx === toIdx) return tileset;
  const tiles = [...tileset.tiles];
  const [moved] = tiles.splice(fromIdx, 1);
  tiles.splice(toIdx, 0, moved);
  return { ...tileset, tiles };
}

/**
 * Genera un atlas (canvas único con todos los tiles en grilla) para export o preview.
 * Útil para exportar sprite sheet Aseprite-compatible.
 */
export function tilesetToAtlas(tileset, columns = 16) {
  const { tileWidth, tileHeight, tiles } = tileset;
  const cols = Math.min(columns, Math.max(1, tiles.length));
  const rows = Math.ceil(tiles.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * tileWidth;
  canvas.height = rows * tileHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  tiles.forEach((tile, i) => {
    const x = (i % cols) * tileWidth;
    const y = Math.floor(i / cols) * tileHeight;
    ctx.drawImage(tile.canvas, x, y);
  });
  return { canvas, cols, rows };
}

function cloneCanvas(source) {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  c.getContext('2d').drawImage(source, 0, 0);
  return c;
}
