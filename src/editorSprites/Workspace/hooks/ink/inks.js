// Jerarquía de tintas. Cada ink expone apply(buffer, idx, src, ctx) donde
// buffer es un Uint32Array (1 uint32 por pixel RGBA en orden little-endian:
// byte0=R, byte1=G, byte2=B, byte3=A). Esto iguala el layout de ImageData.
//
// El hot loop de paintPixelsRGBA calcula idx y dispatcha al ink activo.
// Usar uint32 por pixel da 4× menos operaciones que Uint8ClampedArray x4.

export const packRGBA = (r, g, b, a) =>
  (((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff)) >>> 0;

export const R = (px) => px & 0xff;
export const G = (px) => (px >>> 8) & 0xff;
export const B = (px) => (px >>> 16) & 0xff;
export const A = (px) => (px >>> 24) & 0xff;

// Blend src-over-dst estándar. Todo en enteros con redondeo por sumas.
function blendOver(dst, src) {
  const sa = A(src);
  if (sa === 0) return dst;
  if (sa === 255) return src;
  const da = A(dst);
  if (da === 0) return src;

  const sr = R(src), sg = G(src), sb = B(src);
  const dr = R(dst), dg = G(dst), db = B(dst);

  // Premultiplicado: out_a = sa + da*(1-sa)
  const invSa = 255 - sa;
  const outA = sa + ((da * invSa + 127) / 255) | 0;
  if (outA === 0) return 0;
  const outR = ((sr * sa + dr * da * invSa / 255 + 127) / outA) | 0;
  const outG = ((sg * sa + dg * da * invSa / 255 + 127) / outA) | 0;
  const outB = ((sb * sa + db * da * invSa / 255 + 127) / outA) | 0;
  return packRGBA(outR, outG, outB, outA);
}

export const InkSimple = {
  apply(buffer, idx, src /* ctx */) {
    buffer[idx] = src;
  },
};

export const InkAlpha = {
  apply(buffer, idx, src /* ctx */) {
    buffer[idx] = blendOver(buffer[idx], src) >>> 0;
  },
};

// Preserva alpha destino: solo pinta donde ya había pixel. Aseprite "Lock Alpha".
export const InkLockAlpha = {
  apply(buffer, idx, src /* ctx */) {
    const dst = buffer[idx];
    const da = A(dst);
    if (da === 0) return;
    const blended = blendOver(dst, src);
    buffer[idx] = (packRGBA(R(blended), G(blended), B(blended), da)) >>> 0;
  },
};

// Borrador: reduce alpha destino por alpha src.
export const InkEraser = {
  apply(buffer, idx, src /* ctx */) {
    const dst = buffer[idx];
    const da = A(dst);
    if (da === 0) return;
    const sa = A(src);
    if (sa === 255) { buffer[idx] = 0; return; }
    const newA = (da * (255 - sa) + 127) / 255 | 0;
    if (newA === 0) { buffer[idx] = 0; return; }
    buffer[idx] = packRGBA(R(dst), G(dst), B(dst), newA);
  },
};

// Reemplaza color: pinta solo si dst matchea ctx.target dentro de ctx.tolerance.
// ctx: { target: uint32, tolerance: 0..255 }
export const InkReplace = {
  apply(buffer, idx, src, ctx) {
    const dst = buffer[idx];
    const t = ctx?.target | 0;
    const tol = ctx?.tolerance ?? 0;
    const dr = R(dst) - R(t);
    const dg = G(dst) - G(t);
    const db = B(dst) - B(t);
    const da = A(dst) - A(t);
    // Distancia Chebyshev para que tolerance sea intuitivo (0 = exacto).
    const d = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db), Math.abs(da));
    if (d <= tol) buffer[idx] = blendOver(dst, src) >>> 0;
  },
};

// Shading: desplaza el pixel destino N pasos en la rampa de paleta activa.
// ctx: { palette: Uint32Array de la rampa ordenada, steps: entero (+ más claro, - más oscuro) }
// src ignorado — el ink usa dst y la rampa.
export const InkShading = {
  apply(buffer, idx, _src, ctx) {
    const dst = buffer[idx];
    if (A(dst) === 0) return;
    const palette = ctx?.palette;
    const steps = ctx?.steps | 0;
    if (!palette || palette.length === 0 || steps === 0) return;

    let nearest = 0;
    let bestDist = Infinity;
    const dr = R(dst), dg = G(dst), db = B(dst);
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const er = R(p) - dr, eg = G(p) - dg, eb = B(p) - db;
      const d = er * er + eg * eg + eb * eb;
      if (d < bestDist) { bestDist = d; nearest = i; }
    }
    const target = Math.max(0, Math.min(palette.length - 1, nearest + steps));
    const next = palette[target];
    buffer[idx] = packRGBA(R(next), G(next), B(next), A(dst));
  },
};

// Gradiente lineal a lo largo del trazo. ctx: { t: 0..1, colorStart, colorEnd }
export const InkGradient = {
  apply(buffer, idx, _src, ctx) {
    const t = Math.max(0, Math.min(1, ctx?.t ?? 0));
    const a = ctx?.colorStart | 0;
    const b = ctx?.colorEnd | 0;
    const r = ((R(a) * (1 - t) + R(b) * t) + 0.5) | 0;
    const g = ((G(a) * (1 - t) + G(b) * t) + 0.5) | 0;
    const bb = ((B(a) * (1 - t) + B(b) * t) + 0.5) | 0;
    const al = ((A(a) * (1 - t) + A(b) * t) + 0.5) | 0;
    buffer[idx] = blendOver(buffer[idx], packRGBA(r, g, bb, al)) >>> 0;
  },
};

export const INKS = {
  simple: InkSimple,
  alpha: InkAlpha,
  lockAlpha: InkLockAlpha,
  eraser: InkEraser,
  replace: InkReplace,
  shading: InkShading,
  gradient: InkGradient,
};

export function getInk(name) {
  return INKS[name] ?? InkAlpha;
}

// Wrap un ImageData.data (Uint8ClampedArray) como Uint32Array compartiendo el
// mismo ArrayBuffer. Mutaciones sobre el Uint32Array afectan al ImageData.
export function wrapImageData(imageData) {
  return new Uint32Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength >>> 2
  );
}
