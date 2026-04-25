// replaceColor.js — filtro puro que sustituye un color por otro en un ImageData.
// Función pura: recibe ImageData y devuelve ImageData nuevo (no muta el original).
// Pensada para correr en main thread para capas pequeñas (<256×256 típico de pixel-art)
// o en un Web Worker si la capa es grande.

/**
 * Reemplaza un color por otro dentro de un ImageData.
 *
 * @param {ImageData} source        ImageData fuente (intacto tras la llamada).
 * @param {{r:number,g:number,b:number,a?:number}} from   Color a buscar.
 * @param {{r:number,g:number,b:number,a?:number}} to     Color de reemplazo.
 * @param {object}  [opts]
 * @param {number}  [opts.tolerance=0]
 *                  Tolerancia 0..255 por canal. 0 = reemplazo exacto,
 *                  valores altos = reemplazo por similitud (distancia Euclidiana en RGB).
 * @param {boolean} [opts.matchAlpha=false]
 *                  Si true, `from.a` también se compara (default ignora alpha en la
 *                  comparación — cualquier alpha > 0 es candidato).
 * @param {boolean} [opts.preserveAlpha=true]
 *                  Si true, conserva el alpha original del píxel (no el de `to`).
 *                  Útil para no romper anti-aliasing a los bordes.
 * @returns {ImageData}
 */
export function replaceColor(source, from, to, opts = {}) {
  const { tolerance = 0, matchAlpha = false, preserveAlpha = true } = opts;
  const out = new ImageData(
    new Uint8ClampedArray(source.data),
    source.width,
    source.height
  );
  const data = out.data;

  const fR = from.r | 0;
  const fG = from.g | 0;
  const fB = from.b | 0;
  const fA = (from.a ?? 255) | 0;

  const tR = to.r | 0;
  const tG = to.g | 0;
  const tB = to.b | 0;
  const tA = (to.a ?? 255) | 0;

  // Tolerancia como distancia cuadrada para evitar sqrt por píxel.
  // tolerance=0 implica coincidencia exacta (tolSq=0).
  const tolSq = tolerance * tolerance * 3; // 3 canales
  const exact = tolerance === 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Por defecto ignora píxeles totalmente transparentes (evita "pintar" fondo vacío).
    if (!matchAlpha && a === 0) continue;
    if (matchAlpha && a !== fA) continue;

    let matches;
    if (exact) {
      matches = r === fR && g === fG && b === fB;
    } else {
      const dr = r - fR;
      const dg = g - fG;
      const db = b - fB;
      matches = dr * dr + dg * dg + db * db <= tolSq;
    }

    if (matches) {
      data[i] = tR;
      data[i + 1] = tG;
      data[i + 2] = tB;
      data[i + 3] = preserveAlpha ? a : tA;
    }
  }

  return out;
}

/**
 * Helper: aplica `replaceColor` sobre un canvas y devuelve un canvas nuevo con el resultado.
 * No muta el canvas fuente.
 */
export function replaceColorOnCanvas(sourceCanvas, from, to, opts) {
  const { width, height } = sourceCanvas;
  const ctx = sourceCanvas.getContext('2d');
  const src = ctx.getImageData(0, 0, width, height);
  const out = replaceColor(src, from, to, opts);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  outCtx.putImageData(out, 0, 0);
  return outCanvas;
}
