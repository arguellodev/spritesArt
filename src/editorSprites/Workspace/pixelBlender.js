'use no memo';
// pixelBlender — composita una capa source sobre un canvas destination usando
// las fórmulas exactas de blendFormulas.js + W3C non-isolated alpha compositing
// (que es lo que Aseprite y Photoshop usan internamente).
//
// API pública:
//   drawLayerBlended(ctx, layerCanvas, mode, opacity, srcRect, dstRect)
//
// Fast path: 'normal' usa Canvas2D nativo (drawImage source-over) porque es
// hardware-acelerado y matemáticamente equivalente. Resto usa pixel-by-pixel.
//
// Alpha compositing (W3C Compositing Level 1, 5.3 "Simple alpha compositing"):
//   αo = αs + αd − αs·αd
//   Co = (αs·(1−αd)·Cs + αs·αd·B(Cd,Cs) + (1−αs)·αd·Cd) / αo
//
// El overhead vs Canvas2D nativo es ~10x pero garantiza match perfecto con
// Aseprite (no hay precision loss por premultiplied alpha).

import {
  SEPARABLE_BLEND_FUNCS,
  NON_SEPARABLE_BLEND_FUNCS,
  isSeparableBlendMode,
  isNonSeparableBlendMode,
} from './blendFormulas';

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
  // Fast path: 'normal' (default) usa Canvas2D nativo con globalAlpha.
  if (mode === 'normal' || (!isSeparableBlendMode(mode) && !isNonSeparableBlendMode(mode))) {
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

  // Slow path: pixel blending exacto.
  // 1. Render source layer en un temp canvas con el viewport+zoom aplicados,
  //    para que srcData y dstData tengan el mismo tamaño.
  const temp = getTempCanvas(dstRect.w, dstRect.h);
  const tempCtx = temp.getContext('2d', { willReadFrequently: true });
  tempCtx.globalCompositeOperation = 'source-over';
  tempCtx.globalAlpha = 1.0;
  tempCtx.clearRect(0, 0, dstRect.w, dstRect.h);
  tempCtx.imageSmoothingEnabled = false; // pixel art: nearest-neighbor
  tempCtx.drawImage(
    layerCanvas,
    srcRect.x, srcRect.y, srcRect.w, srcRect.h,
    0, 0, dstRect.w, dstRect.h
  );

  // 2. Lee ImageData de ambos.
  const srcImg = tempCtx.getImageData(0, 0, dstRect.w, dstRect.h);
  const dstImg = ctx.getImageData(0, 0, dstRect.w, dstRect.h);

  // 3. Aplica blend pixel-by-pixel.
  blendImageData(srcImg.data, dstImg.data, mode, opacity);

  // 4. Escribe resultado.
  ctx.putImageData(dstImg, 0, 0);

  pruneCanvasPool();
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
