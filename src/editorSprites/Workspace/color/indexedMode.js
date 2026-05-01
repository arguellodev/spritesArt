// indexedMode.js — modo color indexado (paleta → índice por píxel).
//
// En modo indexed cada píxel almacena un índice (byte 0..255) en una paleta.
// Ventajas sobre RGB:
//   1. Menor tamaño (1 byte vs 4).
//   2. "Palette shift" gratis: cambiar la paleta reindexa todos los pixeles
//      a la vez (day/night, damage flash, paletas temáticas).
//   3. Limitaciones artísticas estilo NES/GBC.
//
// Este módulo NO integra al pipeline de render WebGL — eso lo hará un shader
// separado en otro sprint. Aquí están las utilidades puras:
//  - convertRgbToIndexed(imageData, palette, {dither})
//  - convertIndexedToRgb(indexedImage, palette)
//  - IndexedImage: { width, height, indices: Uint8Array }

/**
 * @typedef {{r:number,g:number,b:number,a?:number}} RGBA
 * @typedef {{width:number,height:number,indices:Uint8Array,transparentIndex?:number}} IndexedImage
 */

export function createIndexedImage(width, height) {
  return { width, height, indices: new Uint8Array(width * height), transparentIndex: 0 };
}

/**
 * Matriz de Bayer 8x8 para dithering ordenado (valores normalizados a [0, 1]).
 */
const BAYER8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => v / 64));

/**
 * Convierte un ImageData a IndexedImage cuantizándolo contra una paleta dada.
 * @param {ImageData} imageData
 * @param {RGBA[]} palette     Paleta activa (incluye idx 0 como transparente si quieres).
 * @param {object}  [opts]
 * @param {'none'|'bayer'|'floydSteinberg'} [opts.dither='none']
 * @param {number}  [opts.ditherStrength=0.5]    0..1 para bayer; 0..1 como atenuación en FS.
 * @param {number}  [opts.transparentIndex=0]
 * @param {number}  [opts.alphaThreshold=16]     Pixeles con a < threshold se asignan a transparentIndex.
 * @returns {IndexedImage}
 */
export function convertRgbToIndexed(imageData, palette, opts = {}) {
  const {
    dither = 'none',
    ditherStrength = 0.5,
    transparentIndex = 0,
    alphaThreshold = 16,
  } = opts;
  const { width: W, height: H, data } = imageData;
  const out = createIndexedImage(W, H);
  out.transparentIndex = transparentIndex;
  const indices = out.indices;

  // Pre-calcular paleta en arrays typed para velocidad.
  const pLen = palette.length;
  const pR = new Uint8Array(pLen);
  const pG = new Uint8Array(pLen);
  const pB = new Uint8Array(pLen);
  for (let i = 0; i < pLen; i++) {
    pR[i] = palette[i].r; pG[i] = palette[i].g; pB[i] = palette[i].b;
  }

  const closestIndex = (r, g, b) => {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < pLen; i++) {
      if (i === transparentIndex) continue;
      const dr = r - pR[i], dg = g - pG[i], db = b - pB[i];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  };

  if (dither === 'none') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] < alphaThreshold) {
          indices[y * W + x] = transparentIndex;
          continue;
        }
        indices[y * W + x] = closestIndex(data[i], data[i + 1], data[i + 2]);
      }
    }
  } else if (dither === 'bayer') {
    // Ordered dithering: a cada píxel le sumamos un bias del patrón Bayer antes
    // de buscar el más cercano. El bias va en [-strength, +strength] * 255.
    const strength = ditherStrength * 255;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] < alphaThreshold) {
          indices[y * W + x] = transparentIndex;
          continue;
        }
        const bias = (BAYER8[y & 7][x & 7] - 0.5) * strength;
        const r = clamp255(data[i] + bias);
        const g = clamp255(data[i + 1] + bias);
        const b = clamp255(data[i + 2] + bias);
        indices[y * W + x] = closestIndex(r, g, b);
      }
    }
  } else if (dither === 'floydSteinberg') {
    // Error diffusion: propagamos el error de cuantización a vecinos.
    // Trabajamos en un buffer float para acumular error.
    const buf = new Float32Array(W * H * 3);
    for (let i = 0, j = 0; j < data.length; i += 3, j += 4) {
      buf[i] = data[j]; buf[i + 1] = data[j + 1]; buf[i + 2] = data[j + 2];
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const bi = (y * W + x) * 3;
        const di = (y * W + x) * 4;
        if (data[di + 3] < alphaThreshold) {
          indices[y * W + x] = transparentIndex;
          continue;
        }
        const or = clamp255(buf[bi]);
        const og = clamp255(buf[bi + 1]);
        const ob = clamp255(buf[bi + 2]);
        const idx = closestIndex(or, og, ob);
        indices[y * W + x] = idx;
        // error
        const er = (or - pR[idx]) * ditherStrength;
        const eg = (og - pG[idx]) * ditherStrength;
        const eb = (ob - pB[idx]) * ditherStrength;
        // 7/16 derecha
        if (x + 1 < W) {
          buf[bi + 3] += er * 7 / 16;
          buf[bi + 4] += eg * 7 / 16;
          buf[bi + 5] += eb * 7 / 16;
        }
        // 3/16 abajo-izq, 5/16 abajo, 1/16 abajo-der
        if (y + 1 < H) {
          if (x > 0) {
            const k = bi + (W - 1) * 3;
            buf[k] += er * 3 / 16;
            buf[k + 1] += eg * 3 / 16;
            buf[k + 2] += eb * 3 / 16;
          }
          const k2 = bi + W * 3;
          buf[k2] += er * 5 / 16;
          buf[k2 + 1] += eg * 5 / 16;
          buf[k2 + 2] += eb * 5 / 16;
          if (x + 1 < W) {
            const k3 = bi + (W + 1) * 3;
            buf[k3] += er * 1 / 16;
            buf[k3 + 1] += eg * 1 / 16;
            buf[k3 + 2] += eb * 1 / 16;
          }
        }
      }
    }
  }
  return out;
}

/**
 * Convierte IndexedImage → ImageData usando la paleta activa.
 * El índice transparente se renderiza con alpha=0.
 */
export function convertIndexedToRgb(indexedImage, palette) {
  const { width, height, indices, transparentIndex = 0 } = indexedImage;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const di = i * 4;
    if (idx === transparentIndex) {
      data[di] = 0; data[di + 1] = 0; data[di + 2] = 0; data[di + 3] = 0;
      continue;
    }
    const c = palette[idx] ?? { r: 0, g: 0, b: 0, a: 255 };
    data[di] = c.r; data[di + 1] = c.g; data[di + 2] = c.b;
    data[di + 3] = c.a ?? 255;
  }
  return new ImageData(data, width, height);
}

/**
 * Palette-shift: aplica una paleta distinta al mismo IndexedImage. Retorna un
 * IndexedImage nuevo con las mismas indices (el render final usará la paleta
 * diferente). Útil para efectos día/noche, damage flash, etc.
 *
 * NOTA: si las paletas tienen distinta longitud, los índices fuera de rango se
 * clampean a (palette.length - 1).
 */
export function applyPaletteShift(indexedImage, fromPalette, toPalette) {
  // Como los índices ya son las posiciones, el palette shift en realidad
  // solo requiere renderizar con toPalette. Si las paletas tienen distinto
  // orden/contenido, el "shift" de verdad es re-mapear índices. Esta función
  // re-mapea basándose en el color más cercano en toPalette.
  const { width, height, indices, transparentIndex = 0 } = indexedImage;
  const map = new Uint8Array(fromPalette.length);
  for (let i = 0; i < fromPalette.length; i++) {
    if (i === transparentIndex) { map[i] = transparentIndex; continue; }
    const c = fromPalette[i];
    let best = 0, bestDist = Infinity;
    for (let j = 0; j < toPalette.length; j++) {
      if (j === transparentIndex) continue;
      const t = toPalette[j];
      const dr = c.r - t.r, dg = c.g - t.g, db = c.b - t.b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) { bestDist = d; best = j; }
    }
    map[i] = best;
  }
  const newIndices = new Uint8Array(indices.length);
  for (let i = 0; i < indices.length; i++) newIndices[i] = map[indices[i]] ?? 0;
  return { width, height, indices: newIndices, transparentIndex };
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
