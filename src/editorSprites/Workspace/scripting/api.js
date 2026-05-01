// api.js — API pública del sistema de scripting de PixCalli.
//
// El script corre en un Web Worker sandbox (ver sandbox.js). La API se monta
// en `self.app` dentro del worker, y el host la intermedia por postMessage.
//
// Diseño:
//  - API síncrona desde la perspectiva del script (await bajo el capó).
//  - Trabaja sobre una snapshot del estado del documento al inicio del script.
//  - Al final, las modificaciones se devuelven como un "patch" que el host
//    aplica dentro de una transacción (UN solo undo).
//
// Ejemplo de script del usuario:
//   // Script: colorea cada frame con un tono distinto (animación day/night)
//   for (let i = 0; i < app.frames.length; i++) {
//     const frame = app.frames[i];
//     for (const layer of frame.layers) {
//       app.hueShift(layer, i * 15);
//     }
//   }
//   app.commit();
//
// Las funciones DEBEN terminar con app.commit() o el patch se descarta.

/**
 * Tipos expuestos al script (cliente-side):
 *
 * interface AppApi {
 *   width: number;
 *   height: number;
 *   palette: RGBA[];
 *   frames: FrameHandle[];
 *   layers: LayerHandle[];
 *   activeLayer: LayerHandle;
 *   activeFrame: number;
 *
 *   pixel(layer, x, y, color?): RGBA | void;
 *   fill(layer, color): void;
 *   hueShift(layer, degrees): void;
 *   replaceColor(layer, from, to, tolerance?): void;
 *
 *   commit(): void;
 *   log(...args): void;
 * }
 */

export const SCRIPTING_API_VERSION = 1;

/**
 * Snapshot que el host envía al worker al iniciar un script.
 * Contiene datos serializables (no canvases; en su lugar, ImageData).
 */
export function buildScriptSnapshot({ width, height, palette, frames, layers, activeFrame, activeLayerId }) {
  const framesArr = Object.entries(frames)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([n, data]) => {
      const celsArr = Object.entries(data.canvases || {}).map(([layerId, canvas]) => {
        const ctx = canvas.getContext('2d');
        return {
          layerId,
          imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
          width: canvas.width,
          height: canvas.height,
        };
      });
      return { frameN: Number(n), duration: data.frameDuration ?? 100, cels: celsArr };
    });

  return {
    apiVersion: SCRIPTING_API_VERSION,
    width,
    height,
    palette,
    layers: layers.map((l) => ({
      id: l.id,
      name: l.name,
      opacity: l.opacity,
      zIndex: l.zIndex,
      blendMode: l.blendMode,
    })),
    frames: framesArr,
    activeFrame,
    activeLayerId,
  };
}

/**
 * Aplica un patch devuelto por un script a la estructura del workspace.
 * Se espera que el host llame a esto dentro de una transacción de undo.
 *
 * patch = [{ frameN, layerId, imageData }, ...]
 *
 * @param {Record<number, {canvases: Record<string, HTMLCanvasElement>}>} frames
 * @param {Array<{frameN:number,layerId:string,imageData:ImageData}>} patch
 */
export function applyScriptPatch(frames, patch) {
  for (const entry of patch) {
    const frame = frames[entry.frameN];
    if (!frame) continue;
    const canvas = frame.canvases[entry.layerId];
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(entry.imageData, 0, 0);
  }
}
