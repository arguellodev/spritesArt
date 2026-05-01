'use no memo';
// pixelBlender — composita una capa source sobre un canvas destination.
//
// API pública:
//   drawLayerBlended(ctx, layerCanvas, mode, opacity, srcRect, dstRect)
//
// Estrategia HÍBRIDA (perf-first):
//
//  - 17 modos en FAST PATH usando Canvas2D globalCompositeOperation nativo
//    (hardware-acelerado, sub-millisegundo). Cubre todos los modos del spec
//    W3C Compositing Level 1 + 'lighter' (≡ Aseprite "addition" per canal
//    con clamp para pixeles opacos, que es el caso típico de pixel art).
//
//  - 2 modos en SLOW PATH pixel-by-pixel (subtract, divide): no existen en
//    Canvas2D ni se pueden derivar combinando ops nativas. JS puro con
//    bounding-box de pixeles no-transparentes para evitar trabajo en zonas
//    vacias. Solo se ejecuta cuando el usuario elige explicitamente uno
//    de estos 2 modos.
//
// Trade-off conocido: Addition via 'lighter' difiere ligeramente de la
// formula Aseprite en pixeles SEMI-transparentes (αs<1 o αd<1). Para
// pixel art opaco da resultados visualmente identicos. Si en el futuro
// aparece un caso donde importa, mover 'addition' al slow path.

import {
  SEPARABLE_BLEND_FUNCS,
  NON_SEPARABLE_BLEND_FUNCS,
  isSeparableBlendMode,
  isNonSeparableBlendMode,
} from './blendFormulas';

// Mapeo id-blend → string que acepta Canvas2D globalCompositeOperation.
// Si el id no está aquí, va al pixel fallback.
const NATIVE_COMPOSITE_OP = {
  'normal':       'source-over',
  'multiply':     'multiply',
  'screen':       'screen',
  'overlay':      'overlay',
  'darken':       'darken',
  'lighten':      'lighten',
  'color-dodge':  'color-dodge',
  'color-burn':   'color-burn',
  'hard-light':   'hard-light',
  'soft-light':   'soft-light',
  'difference':   'difference',
  'exclusion':    'exclusion',
  'hue':          'hue',
  'saturation':   'saturation',
  'color':        'color',
  'luminosity':   'luminosity',
  // Addition: 'lighter' = additive Co = αs·Cs + αd·Cd, αo = αs+αd (clamped).
  // Para pixeles opacos esto colapsa a min(1, src+dst) per canal = formula
  // Aseprite addition. Match perfecto en pixel art opaco.
  'addition':     'lighter',
  // Subtract / divide: NO mapeados — caen al pixel fallback.
};

// Cache de canvas temporales reusables (evita allocation por frame).
// Se indexa por "wxh" para reciclar si la geometria coincide.
const tempCanvasPool = new Map();
function getTempCanvas(w, h) {
  const key = `${w}x${h}`;
  let c = tempCanvasPool.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    tempCanvasPool.set(key, c);
  }
  return c;
}

// Limpia el pool si ocupa demasiada memoria (~16 entradas máx).
function pruneCanvasPool() {
  if (tempCanvasPool.size <= 16) return;
  const keys = Array.from(tempCanvasPool.keys());
  for (let i = 0; i < keys.length - 16; i++) tempCanvasPool.delete(keys[i]);
}

/**
 * Dibuja `layerCanvas` (recortado por srcRect, escalado a dstRect) sobre `ctx`
 * aplicando blend mode + opacity. dstRect.x/y siempre son 0,0 en el ctx destino
 * (asumimos que el caller ya posicionó el ctx — los renders del editor lo hacen).
 *
 * @param {CanvasRenderingContext2D} ctx - destino (compositeCanvas o exporter)
 * @param {HTMLCanvasElement} layerCanvas - source layer canvas (full size)
 * @param {string} mode - blend mode id (de blendFormulas.SEPARABLE/NON_SEPARABLE)
 * @param {number} opacity - [0,1]
 * @param {{x,y,w,h}} srcRect - region del layerCanvas a leer (viewport)
 * @param {{w,h}} dstRect - tamaño en el destino (con zoom aplicado)
 */
export function drawLayerBlended(ctx, layerCanvas, mode, opacity, srcRect, dstRect) {
  const nativeOp = NATIVE_COMPOSITE_OP[mode];

  // FAST PATH (17 modos) — Canvas2D nativo, hardware-acelerado.
  if (nativeOp !== undefined) {
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = nativeOp;
    ctx.drawImage(
      layerCanvas,
      srcRect.x, srcRect.y, srcRect.w, srcRect.h,
      0, 0, dstRect.w, dstRect.h
    );
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = prevAlpha;
    return;
  }

  // SLOW PATH — solo subtract / divide (sin equivalente nativo).
  if (!isSeparableBlendMode(mode) && !isNonSeparableBlendMode(mode)) {
    // Modo desconocido: fallback a normal para no romper.
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(
      layerCanvas,
      srcRect.x, srcRect.y, srcRect.w, srcRect.h,
      0, 0, dstRect.w, dstRect.h
    );
    ctx.globalAlpha = prevAlpha;
    return;
  }

  // 1. Render source layer en un temp canvas (mismo tamaño que dst).
  const temp = getTempCanvas(dstRect.w, dstRect.h);
  const tempCtx = temp.getContext('2d', { willReadFrequently: true });
  tempCtx.globalCompositeOperation = 'source-over';
  tempCtx.globalAlpha = 1.0;
  tempCtx.clearRect(0, 0, dstRect.w, dstRect.h);
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(
    layerCanvas,
    srcRect.x, srcRect.y, srcRect.w, srcRect.h,
    0, 0, dstRect.w, dstRect.h
  );

  const srcImg = tempCtx.getImageData(0, 0, dstRect.w, dstRect.h);

  // 2. Bounding box de pixeles no-transparentes en source. Para pixel art
  //    sparse (la mayoria del canvas vacio), reduce trabajo de O(W·H) al
  //    area realmente pintada. Saltamos getImageData del dst entero si no
  //    hay nada que blendear.
  const bbox = computeNonEmptyBBox(srcImg.data, dstRect.w, dstRect.h);
  if (!bbox) return; // Source totalmente transparente, nada que dibujar.

  // 3. Lee solo el slice del dst que necesitamos.
  const w = bbox.x1 - bbox.x0;
  const h = bbox.y1 - bbox.y0;
  const dstSlice = ctx.getImageData(bbox.x0, bbox.y0, w, h);

  // 4. Crea un ImageData del slice del src (mas barato que pasar el full).
  const srcSlice = sliceImageData(srcImg.data, dstRect.w, bbox.x0, bbox.y0, w, h);

  // 5. Blend pixel-by-pixel sobre el slice.
  blendImageData(srcSlice, dstSlice.data, mode, opacity);

  // 6. Escribe el slice de vuelta.
  ctx.putImageData(dstSlice, bbox.x0, bbox.y0);

  pruneCanvasPool();
}

// Calcula bounding box de pixeles con alpha > 0. Devuelve {x0,y0,x1,y1} o null
// si todo transparente. O(W·H) en el peor caso pero early-exit por filas.
function computeNonEmptyBBox(data, w, h) {
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  let found = false;
  for (let y = 0; y < h; y++) {
    const rowOff = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[rowOff + x * 4 + 3] !== 0) {
        if (!found) { found = true; x0 = x; y0 = y; x1 = x + 1; y1 = y + 1; }
        else {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x + 1 > x1) x1 = x + 1;
          if (y + 1 > y1) y1 = y + 1;
        }
      }
    }
  }
  return found ? { x0, y0, x1, y1 } : null;
}

// Extrae una sub-region de `data` (Uint8ClampedArray, RGBA full-canvas wxh) en
// un nuevo Uint8ClampedArray del tamaño del slice. Mas barato que copiar el
// full y luego ignorar la mayoria.
function sliceImageData(data, fullW, x0, y0, w, h) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcOff = ((y + y0) * fullW + x0) * 4;
    const dstOff = y * w * 4;
    out.set(data.subarray(srcOff, srcOff + w * 4), dstOff);
  }
  return out;
}

/**
 * Aplica blend mode pixel-by-pixel mutando dstData IN-PLACE.
 * srcData y dstData son Uint8ClampedArray (RGBA, 4 bytes por pixel).
 * Asumen igual longitud.
 */
function blendImageData(srcData, dstData, mode, opacity) {
  const len = srcData.length;
  const isNonSep = isNonSeparableBlendMode(mode);
  const sepFn = SEPARABLE_BLEND_FUNCS[mode];
  const nonSepFn = NON_SEPARABLE_BLEND_FUNCS[mode];

  // Alpha compositing constante: opacity multiplica el alpha del source.
  const op = opacity;

  for (let i = 0; i < len; i += 4) {
    // Source: convertir a [0,1]. Saltamos pixels totalmente transparentes
    // (común en pixel art: la mayoría del canvas es transparente).
    const sa_byte = srcData[i + 3];
    if (sa_byte === 0) continue;
    const sa = (sa_byte / 255) * op;
    if (sa <= 0) continue;

    const sr = srcData[i] / 255;
    const sg = srcData[i + 1] / 255;
    const sb = srcData[i + 2] / 255;

    const dr = dstData[i] / 255;
    const dg = dstData[i + 1] / 255;
    const db = dstData[i + 2] / 255;
    const da = dstData[i + 3] / 255;

    // Calcula color blendeado B(Cd, Cs).
    let br, bg, bb;
    if (isNonSep) {
      const out = nonSepFn(dr, dg, db, sr, sg, sb);
      br = out[0]; bg = out[1]; bb = out[2];
    } else {
      br = sepFn(dr, sr);
      bg = sepFn(dg, sg);
      bb = sepFn(db, sb);
    }

    // W3C non-isolated compositing:
    //   αo = αs + αd − αs·αd
    //   Co = (αs·(1−αd)·Cs + αs·αd·B + (1−αs)·αd·Cd) / αo
    const ao = sa + da - sa * da;
    if (ao <= 0) {
      dstData[i] = 0;
      dstData[i + 1] = 0;
      dstData[i + 2] = 0;
      dstData[i + 3] = 0;
      continue;
    }

    const inv_sa = 1 - sa;
    const inv_da = 1 - da;
    const f1 = sa * inv_da;       // peso del source-puro
    const f2 = sa * da;           // peso del blend
    const f3 = inv_sa * da;       // peso del destination-puro

    const ro = (f1 * sr + f2 * br + f3 * dr) / ao;
    const go = (f1 * sg + f2 * bg + f3 * dg) / ao;
    const bo = (f1 * sb + f2 * bb + f3 * db) / ao;

    // Clamp + write back. Uint8ClampedArray maneja clamp automático en write,
    // pero hacemos round explícito para evitar truncate.
    dstData[i]     = ro >= 1 ? 255 : ro <= 0 ? 0 : Math.round(ro * 255);
    dstData[i + 1] = go >= 1 ? 255 : go <= 0 ? 0 : Math.round(go * 255);
    dstData[i + 2] = bo >= 1 ? 255 : bo <= 0 ? 0 : Math.round(bo * 255);
    dstData[i + 3] = ao >= 1 ? 255 : Math.round(ao * 255);
  }
}
