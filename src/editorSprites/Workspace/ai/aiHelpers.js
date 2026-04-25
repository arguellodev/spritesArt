// aiHelpers.js — utilidades "AI" para sprite editing.
// Este módulo NO llama a modelos remotos. Son helpers deterministas/heurísticos
// que cubren lo que un "AI helper" suele hacer en editores pixel-art:
//
//   1. paletteFromReference(imageData, k)     — k-means sobre colores frecuentes
//   2. tweenFrames(aFrame, bFrame, t, method) — morph lineal o warp entre 2 cels
//   3. upscalePixelArt(imageData, factor, alg) — nearest / hqx-style dupes
//
// (Si el producto más adelante quiere llamar a un modelo remoto, estos helpers
// son el wrapper local y los fallbacks.)

// ============================================================================
// 1) paletteFromReference — extrae una paleta de N colores
// ============================================================================

/**
 * Quantiza una imagen a N colores mediante k-means ligero.
 * Empieza sembrando con los N colores más frecuentes y converge ≤ iterMax veces.
 *
 * @param {ImageData} imageData
 * @param {number}    k             Colores objetivo (2..64 recomendado).
 * @param {number}    [iterMax=8]
 * @returns {Array<{r:number,g:number,b:number,a:255}>}
 */
export function paletteFromReference(imageData, k = 16, iterMax = 8) {
  const data = imageData.data;
  // Sampling: cada píxel opaco aporta; ignoramos transparentes.
  const sampleR = [];
  const sampleG = [];
  const sampleB = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    sampleR.push(data[i]);
    sampleG.push(data[i + 1]);
    sampleB.push(data[i + 2]);
  }
  if (sampleR.length === 0) return [];

  // Seeds: histogram-based top-k (groseramente buckets 8^3).
  const buckets = new Map();
  for (let i = 0; i < sampleR.length; i++) {
    const key = (sampleR[i] >> 5) * 64 + (sampleG[i] >> 5) * 8 + (sampleB[i] >> 5);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const sortedBuckets = [...buckets.entries()].sort(([, a], [, b]) => b - a);
  const seeds = sortedBuckets.slice(0, k).map(([key]) => ({
    r: ((key / 64) | 0) * 32 + 16,
    g: (((key / 8) | 0) % 8) * 32 + 16,
    b: (key % 8) * 32 + 16,
  }));
  while (seeds.length < k) {
    seeds.push({
      r: Math.random() * 256 | 0,
      g: Math.random() * 256 | 0,
      b: Math.random() * 256 | 0,
    });
  }

  // K-means
  for (let iter = 0; iter < iterMax; iter++) {
    const sums = seeds.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (let i = 0; i < sampleR.length; i++) {
      let best = 0, bestD = Infinity;
      for (let j = 0; j < seeds.length; j++) {
        const dr = sampleR[i] - seeds[j].r;
        const dg = sampleG[i] - seeds[j].g;
        const db = sampleB[i] - seeds[j].b;
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = j; }
      }
      const s = sums[best];
      s.r += sampleR[i]; s.g += sampleG[i]; s.b += sampleB[i]; s.n++;
    }
    let moved = false;
    for (let j = 0; j < seeds.length; j++) {
      if (sums[j].n === 0) continue;
      const nr = (sums[j].r / sums[j].n) | 0;
      const ng = (sums[j].g / sums[j].n) | 0;
      const nb = (sums[j].b / sums[j].n) | 0;
      if (nr !== seeds[j].r || ng !== seeds[j].g || nb !== seeds[j].b) {
        seeds[j] = { r: nr, g: ng, b: nb };
        moved = true;
      }
    }
    if (!moved) break;
  }

  return seeds.map((c) => ({ ...c, a: 255 }));
}

// ============================================================================
// 2) tweenFrames — interpola entre 2 cels (in-betweening)
// ============================================================================

/**
 * In-betweening simple entre 2 ImageData del mismo tamaño.
 * @param {ImageData} a
 * @param {ImageData} b
 * @param {number}    t           0..1 (0 = a, 1 = b)
 * @param {'lerp'|'threshold'} [method='lerp']
 *                                - 'lerp'      promedio pesado (genera anti-alias)
 *                                - 'threshold' elige a si t<0.5, sino b (no smooth, pero pixel-art-friendly)
 * @returns {ImageData}
 */
export function tweenFrames(a, b, t, method = 'lerp') {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error('tweenFrames: dimensions mismatch');
  }
  const { width, height } = a;
  const out = new ImageData(width, height);
  const ad = a.data, bd = b.data, od = out.data;
  if (method === 'threshold') {
    const src = t < 0.5 ? ad : bd;
    for (let i = 0; i < od.length; i++) od[i] = src[i];
    return out;
  }
  for (let i = 0; i < od.length; i++) {
    od[i] = Math.round(ad[i] * (1 - t) + bd[i] * t);
  }
  return out;
}

/**
 * Genera N frames intermedios entre 2 cels.
 */
export function generateTweenedFrames(a, b, count, method = 'lerp') {
  const out = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    out.push(tweenFrames(a, b, t, method));
  }
  return out;
}

// ============================================================================
// 3) upscalePixelArt — upscaling preservando look pixel-art
// ============================================================================

/**
 * Upscale por factor entero. Algoritmos:
 *  - 'nearest' — clásica duplicación (100% pixel-art fiel).
 *  - 'eagle'   — 2x mejorado: esquinas suavizadas, conserva bordes.
 */
export function upscalePixelArt(imageData, factor = 2, alg = 'nearest') {
  if (factor < 1) throw new Error('factor debe ser >=1');
  if (alg === 'eagle' && factor === 2) return _eagle2x(imageData);
  return _nearestUpscale(imageData, factor);
}

function _nearestUpscale(imageData, factor) {
  const { width: W, height: H, data } = imageData;
  const out = new ImageData(W * factor, H * factor);
  const od = out.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 4;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const di = ((y * factor + dy) * W * factor + (x * factor + dx)) * 4;
          od[di] = data[si];
          od[di + 1] = data[si + 1];
          od[di + 2] = data[si + 2];
          od[di + 3] = data[si + 3];
        }
      }
    }
  }
  return out;
}

function _eagle2x(imageData) {
  const { width: W, height: H, data } = imageData;
  const out = new ImageData(W * 2, H * 2);
  const od = out.data;
  const get = (x, y) => {
    x = Math.max(0, Math.min(W - 1, x));
    y = Math.max(0, Math.min(H - 1, y));
    return (y * W + x) * 4;
  };
  const same = (a, b) =>
    data[a] === data[b] && data[a + 1] === data[b + 1] &&
    data[a + 2] === data[b + 2] && data[a + 3] === data[b + 3];

  const copyPixel = (srcIdx, dx, dy) => {
    const di = (dy * W * 2 + dx) * 4;
    od[di] = data[srcIdx];
    od[di + 1] = data[srcIdx + 1];
    od[di + 2] = data[srcIdx + 2];
    od[di + 3] = data[srcIdx + 3];
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const P = get(x, y);
      const TL = get(x - 1, y - 1), T = get(x, y - 1), TR = get(x + 1, y - 1);
      const L = get(x - 1, y),                          R = get(x + 1, y);
      const BL = get(x - 1, y + 1), B = get(x, y + 1), BR = get(x + 1, y + 1);

      // Eagle: cada subpixel toma el vecino de la esquina si coinciden.
      const E0 = (same(T, TL) && same(TL, L)) ? TL : P;
      const E1 = (same(T, TR) && same(TR, R)) ? TR : P;
      const E2 = (same(B, BL) && same(BL, L)) ? BL : P;
      const E3 = (same(B, BR) && same(BR, R)) ? BR : P;

      copyPixel(E0, x * 2,     y * 2);
      copyPixel(E1, x * 2 + 1, y * 2);
      copyPixel(E2, x * 2,     y * 2 + 1);
      copyPixel(E3, x * 2 + 1, y * 2 + 1);
    }
  }
  return out;
}
