'use no memo';
// gif.js — parser + composer de archivos .gif animados.
// Usa gifuct-js para decodear; compone los patches por frame respetando
// los disposal types y devuelve canvases planos del tamaño del documento.
//
// Paralelo a formats/aseprite.js (loadAsepriteFile + asepriteDocToPixcalli).
//
// Nota: 'use no memo' al tope del archivo opta-out del React Compiler
// (compilationMode: 'all' en vite.config.js). Sin esto, el compilador inyecta
// _c() de react-compiler-runtime en funciones del modulo, lo que dispara
// "Invalid hook call" cuando se llama desde un onchange handler async.

import { parseGIF, decompressFrames } from 'gifuct-js';
import { nanoid } from 'nanoid';

/**
 * @typedef {object} GifComposedFrame
 * @property {HTMLCanvasElement} canvas    Canvas plano del tamaño del documento.
 * @property {number}            duration  Duración en ms (ya con clamp >= 100 si era <20).
 */

/**
 * @typedef {object} GifDocument
 * @property {number}              width
 * @property {number}              height
 * @property {number}              framesCount
 * @property {string}              fileName        Nombre sin extensión (vacío → "GIF").
 * @property {GifComposedFrame[]}  composedFrames  En orden (índice 0 = primer frame).
 */

/**
 * Carga un File .gif y devuelve un GifDocument con frames ya compuestos.
 *
 * @param {File} file
 * @returns {Promise<GifDocument>}
 */
export async function loadGifFile(file) {
  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = parseGIF(buffer);
  } catch (err) {
    throw new Error(`Archivo no es un GIF válido: ${err.message ?? err}`);
  }

  // decompressFrames(true) → cada frame trae .patch (Uint8ClampedArray RGBA),
  // .dims {left,top,width,height}, .delay (ms), .disposalType (0|1|2|3).
  const rawFrames = decompressFrames(parsed, true);
  if (!rawFrames.length) {
    throw new Error('GIF no contiene frames decodificables');
  }

  const width = parsed.lsd.width;
  const height = parsed.lsd.height;
  const composedFrames = composeFrames(rawFrames, width, height);

  const fileName = file.name.replace(/\.gif$/i, '') || 'GIF';

  return {
    width,
    height,
    framesCount: composedFrames.length,
    fileName,
    composedFrames,
  };
}

/**
 * Compone los frames patch-by-patch sobre un canvas acumulador del tamaño
 * del documento, respetando los disposal types del GIF. Devuelve un canvas
 * plano (snapshot) por frame.
 *
 * disposalType:
 *   0 / 1 → do-not-dispose (acumulador se mantiene tras pintar el frame)
 *   2     → restore-to-background (limpiar el área del frame antes del siguiente)
 *   3     → restore-to-previous (snapshot ANTES de pintar; restaurar después)
 *
 * @param {Array} rawFrames  Frames de gifuct-js con patch/dims/delay/disposalType.
 * @param {number} width
 * @param {number} height
 * @returns {GifComposedFrame[]}
 */
function composeFrames(rawFrames, width, height) {
  const accum = makeCanvas(width, height);
  const accumCtx = accum.getContext('2d');
  // putImageData NO compone con alpha: reemplaza píxeles. Por eso
  // pasamos el patch por un canvas temporal y usamos drawImage.
  let restoreSnapshot = null;

  const out = [];

  for (const f of rawFrames) {
    if (f.disposalType === 3) {
      restoreSnapshot = cloneCanvas(accum);
    }

    // Patch RGBA listo (gifuct-js ya resolvió el transparent index).
    const patchCanvas = makeCanvas(f.dims.width, f.dims.height);
    const imageData = new ImageData(
      new Uint8ClampedArray(f.patch),
      f.dims.width,
      f.dims.height,
    );
    patchCanvas.getContext('2d').putImageData(imageData, 0, 0);
    accumCtx.drawImage(patchCanvas, f.dims.left, f.dims.top);

    // Snapshot del estado actual = frame del editor.
    const snapshot = cloneCanvas(accum);
    out.push({
      canvas: snapshot,
      duration: clampDelay(f.delay),
    });

    // Preparar accumCanvas para el SIGUIENTE frame según disposal del actual.
    if (f.disposalType === 2) {
      accumCtx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
    } else if (f.disposalType === 3 && restoreSnapshot) {
      accumCtx.clearRect(0, 0, width, height);
      accumCtx.drawImage(restoreSnapshot, 0, 0);
    }
    // disposalType 0 o 1 → no hacer nada (acumulador se mantiene).
  }

  return out;
}

/**
 * Clamp del delay del GIF.
 * gifuct-js entrega .delay en ms (ya multiplicado x10 desde los cs del archivo).
 * Algunos GIFs declaran delay 0 (o casi 0), que los browsers renderizan a ~100ms
 * para evitar reproducción inestable. Aplicamos la misma regla.
 * Nota: frames sin extensión GCE (e.g., GIFs estáticos) llegan con delay === undefined.
 * isFinite captura ese caso y fuerza 100ms.
 *
 * @param {number} delayMs
 * @returns {number}
 */
function clampDelay(delayMs) {
  if (!Number.isFinite(delayMs) || delayMs < 20) return 100;
  return Math.round(delayMs);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function cloneCanvas(src) {
  const c = makeCanvas(src.width, src.height);
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/**
 * Convierte un GifDocument a la shape consumida por restoreFromProjectData:
 *   { width, height, layers, frames: { [n]: { duration, canvases: { [layerId]: canvas } } } }
 *
 * Los frames se indexan desde 1 — convención del editor (currentFrame arranca
 * en 1, ver useState(1) en hooks.jsx). asepriteDocToPixcalli indexa desde 0
 * por arrastre histórico; el handler aseprite tiene el mismo bug latente.
 *
 * @param {GifDocument} doc
 * @returns {{ width: number, height: number, layers: object[], frames: object }}
 */
export function gifDocToPixcalli(doc) {
  const layerId = `layer_${nanoid(8)}`;
  const layers = [{
    id: layerId,
    name: doc.fileName,
    visible: true,
    opacity: 1,
    zIndex: 0,
    blendMode: 'normal',
  }];

  const frames = {};
  doc.composedFrames.forEach((entry, i) => {
    frames[i + 1] = {
      duration: entry.duration,
      canvases: { [layerId]: entry.canvas },
    };
  });

  return {
    width: doc.width,
    height: doc.height,
    layers,
    frames,
  };
}
