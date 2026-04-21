"use no memo";

// Helpers para máscaras de "píxeles aislados" (isolate mode del editor).
// `isolatedPixels` es un array `[{x, y}, ...]` con los píxeles a los que se
// restringen las operaciones de dibujo. Si la lista es vacía o nula, no hay
// máscara activa y se puede pintar en cualquier parte del lienzo.

// Construye un Set indexado por "x,y" para lookup O(1).
// Retorna `null` si no hay aislamiento activo.
export function buildIsolatedPixelsSet(isolatedPixels) {
  if (!isolatedPixels || isolatedPixels.length === 0) return null;
  return new Set(isolatedPixels.map((pixel) => `${pixel.x},${pixel.y}`));
}

// Versión "dumb" que recorre la lista linealmente. Se mantiene solo para
// paridad con la API antigua; el nuevo código debe preferir el Set.
export function isPixelIsolated(x, y, isolatedPixels) {
  if (!isolatedPixels || isolatedPixels.length === 0) {
    return true;
  }
  return isolatedPixels.some((pixel) => pixel.x === x && pixel.y === y);
}

// Versión optimizada con el Set pre-construido.
export function isPixelIsolatedOptimized(x, y, isolatedPixelsSet) {
  if (!isolatedPixelsSet) return true;
  return isolatedPixelsSet.has(`${x},${y}`);
}

// Alias explícito para dejar claro en el punto de uso que estamos
// validando permiso de pintura (y no otra semántica de "aislado").
export function canPaintAtPixel(x, y, isolatedPixelsSet) {
  if (!isolatedPixelsSet) return true;
  return isolatedPixelsSet.has(`${x},${y}`);
}
