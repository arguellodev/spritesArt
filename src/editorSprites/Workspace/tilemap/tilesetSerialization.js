// tilesetSerialization.js — convierte un tileset en memoria a/desde una
// representación serializable en JSON para el formato .pixcalli.
//
// Los canvases DOM no son serializables; los convertimos a dataURL (PNG) al
// guardar, y reconstruimos `HTMLCanvasElement` al cargar.

/**
 * Serializa un tileset (shape de createTileset) a un objeto JSON-compatible.
 * @returns {{tileWidth:number, tileHeight:number, tiles: Array<{id:string, hash:string, dataURL:string}>}}
 */
export function serializeTileset(tileset) {
  if (!tileset) return null;
  return {
    tileWidth: tileset.tileWidth,
    tileHeight: tileset.tileHeight,
    tiles: tileset.tiles.map((t) => ({
      id: t.id,
      hash: t.hash,
      dataURL: t.canvas?.toDataURL ? t.canvas.toDataURL('image/png') : null,
    })),
  };
}

/**
 * Reconstruye un tileset desde el formato serializado. Devuelve una Promise
 * porque hay que cargar imágenes desde dataURL asíncronamente.
 *
 * @returns {Promise<{tileWidth:number,tileHeight:number,tiles:Array}>}
 */
export async function deserializeTileset(serialized) {
  if (!serialized) return null;
  const { tileWidth, tileHeight, tiles = [] } = serialized;

  const restored = await Promise.all(tiles.map(async (t) => {
    const canvas = document.createElement('canvas');
    canvas.width = tileWidth;
    canvas.height = tileHeight;
    if (!t.dataURL) return { id: t.id, hash: t.hash ?? '#', canvas };
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = t.dataURL;
    });
    return { id: t.id, hash: t.hash ?? '#', canvas };
  }));

  // Asegurar que siempre existe el tile "vacío" canónico al inicio.
  if (!restored.some((t) => t.id === 'tile_empty')) {
    const emptyCanvas = document.createElement('canvas');
    emptyCanvas.width = tileWidth;
    emptyCanvas.height = tileHeight;
    restored.unshift({ id: 'tile_empty', hash: '#', canvas: emptyCanvas });
  }

  return { tileWidth, tileHeight, tiles: restored };
}
