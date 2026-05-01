"use no memo";

// textRasterizer.js — rasteriza un string usando una fuente bitmap a píxeles lógicos.
// Soporta múltiples líneas (separadas por '\n') y espaciado configurable.

import { GLYPHS, GLYPH_WIDTH, GLYPH_HEIGHT, getGlyph } from './bitmap5x7';

/**
 * Rasteriza un texto a una lista de píxeles on.
 *
 * @param {string} text   Texto a rasterizar. '\n' crea salto de línea.
 * @param {object} [opts]
 * @param {number} [opts.scale=1]        Multiplica el tamaño de cada pixel lógico (útil para pixel-art).
 * @param {number} [opts.letterSpacing=1] Píxeles lógicos entre glifos (antes de aplicar scale).
 * @param {number} [opts.lineSpacing=1]   Píxeles lógicos entre líneas (antes de aplicar scale).
 * @returns {{ width:number, height:number, pixels: Array<{x:number,y:number}> }}
 *          width/height en píxeles lógicos tras aplicar scale. pixels son los pixeles a pintar.
 */
export function rasterizeText(text, opts = {}) {
  const { scale = 1, letterSpacing = 1, lineSpacing = 1 } = opts;
  const lines = (text ?? '').split('\n');

  // Ancho = max de la línea más ancha
  let maxLineWidth = 0;
  for (const line of lines) {
    const chars = Array.from(line);
    if (chars.length === 0) continue;
    const w = chars.length * GLYPH_WIDTH + Math.max(0, chars.length - 1) * letterSpacing;
    if (w > maxLineWidth) maxLineWidth = w;
  }

  const logicalHeight =
    lines.length * GLYPH_HEIGHT + Math.max(0, lines.length - 1) * lineSpacing;

  const pixels = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const chars = Array.from(line);
    const yOffsetLine = li * (GLYPH_HEIGHT + lineSpacing);
    for (let ci = 0; ci < chars.length; ci++) {
      const glyph = getGlyph(chars[ci]);
      const xOffsetChar = ci * (GLYPH_WIDTH + letterSpacing);
      for (let gy = 0; gy < GLYPH_HEIGHT; gy++) {
        const row = glyph[gy];
        for (let gx = 0; gx < GLYPH_WIDTH; gx++) {
          if (row.charCodeAt(gx) === 49) {
            // '1' = pixel on. Emitir scale² píxeles por pixel lógico.
            const baseX = (xOffsetChar + gx) * scale;
            const baseY = (yOffsetLine + gy) * scale;
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                pixels.push({ x: baseX + sx, y: baseY + sy });
              }
            }
          }
        }
      }
    }
  }

  return {
    width: maxLineWidth * scale,
    height: logicalHeight * scale,
    pixels,
  };
}

/**
 * Rasteriza texto directamente sobre un canvas nuevo del tamaño justo.
 *
 * @param {string} text
 * @param {{r:number,g:number,b:number,a?:number}} color
 * @param {object} [opts]  Igual que rasterizeText.
 * @returns {HTMLCanvasElement}
 */
export function renderTextToCanvas(text, color, opts = {}) {
  const { width, height, pixels } = rasterizeText(text, opts);
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const a = color.a ?? 255;
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${a / 255})`;
  for (const { x, y } of pixels) {
    ctx.fillRect(x, y, 1, 1);
  }
  return canvas;
}

// Re-exportar por conveniencia
export { GLYPHS };
