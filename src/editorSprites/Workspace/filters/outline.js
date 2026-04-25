// outline.js — añade un contorno de N píxeles al contenido opaco de un ImageData.
//
// Algoritmo: para cada píxel transparente, si alguno de sus vecinos (4 u 8-conectado)
// dentro del radio N tiene alpha > umbral, se pinta ese píxel con `color`. Mantiene
// la imagen original intacta (el outline se añade por detrás en modo 'outer', por
// delante en 'inner').

/**
 * @typedef {{r:number,g:number,b:number,a?:number}} RGBA
 */

/**
 * @param {ImageData} source
 * @param {object} opts
 * @param {RGBA}    opts.color         Color del contorno.
 * @param {number}  [opts.thickness=1] Grosor en píxeles (>=1).
 * @param {'outer'|'inner'|'center'} [opts.position='outer']
 *                                     'outer'  — fuera del sprite (sin cubrir líneas internas).
 *                                     'inner'  — dentro (reemplaza el borde interno).
 *                                     'center' — ambos, centrado.
 * @param {boolean} [opts.diagonal=true] Incluir 8-vecinos (esquinas redondeadas) o solo 4.
 * @param {number}  [opts.alphaThreshold=1]
 *                                     Alpha mínima para considerar un pixel "dentro" del sprite.
 * @returns {ImageData}
 */
export function outline(source, opts) {
  const {
    color,
    thickness = 1,
    position = 'outer',
    diagonal = true,
    alphaThreshold = 1,
  } = opts;

  const { width: W, height: H } = source;
  const srcData = source.data;

  // Máscara de "dentro del sprite": 1 si alpha >= umbral.
  const inside = new Uint8Array(W * H);
  for (let i = 0, j = 0; j < srcData.length; i++, j += 4) {
    inside[i] = srcData[j + 3] >= alphaThreshold ? 1 : 0;
  }

  const out = new ImageData(new Uint8ClampedArray(srcData), W, H);
  const outData = out.data;

  const r = color.r | 0;
  const g = color.g | 0;
  const b = color.b | 0;
  const a = (color.a ?? 255) | 0;

  // Función: ¿pixel (x,y) tiene un vecino INSIDE dentro del radio?
  const neighborsInside = (x, y, radius) => {
    const x0 = Math.max(0, x - radius);
    const y0 = Math.max(0, y - radius);
    const x1 = Math.min(W - 1, x + radius);
    const y1 = Math.min(H - 1, y + radius);
    for (let ny = y0; ny <= y1; ny++) {
      for (let nx = x0; nx <= x1; nx++) {
        if (nx === x && ny === y) continue;
        const dx = nx - x, dy = ny - y;
        if (!diagonal && dx !== 0 && dy !== 0) continue;
        if (dx * dx + dy * dy > radius * radius) continue; // círculo
        if (inside[ny * W + nx]) return true;
      }
    }
    return false;
  };

  // Función: ¿pixel (x,y) tiene un vecino FUERA dentro del radio?
  const neighborsOutside = (x, y, radius) => {
    const x0 = Math.max(0, x - radius);
    const y0 = Math.max(0, y - radius);
    const x1 = Math.min(W - 1, x + radius);
    const y1 = Math.min(H - 1, y + radius);
    for (let ny = y0; ny <= y1; ny++) {
      for (let nx = x0; nx <= x1; nx++) {
        if (nx === x && ny === y) continue;
        const dx = nx - x, dy = ny - y;
        if (!diagonal && dx !== 0 && dy !== 0) continue;
        if (dx * dx + dy * dy > radius * radius) continue;
        if (!inside[ny * W + nx]) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const pxIdx = i * 4;
      const isInside = inside[i];

      if (position === 'outer') {
        if (!isInside && neighborsInside(x, y, thickness)) {
          outData[pxIdx] = r;
          outData[pxIdx + 1] = g;
          outData[pxIdx + 2] = b;
          outData[pxIdx + 3] = a;
        }
      } else if (position === 'inner') {
        if (isInside && neighborsOutside(x, y, thickness)) {
          outData[pxIdx] = r;
          outData[pxIdx + 1] = g;
          outData[pxIdx + 2] = b;
          outData[pxIdx + 3] = a;
        }
      } else {
        // center: outer + inner, repartiendo grosor.
        const innerT = Math.floor(thickness / 2);
        const outerT = thickness - innerT;
        if (!isInside && outerT > 0 && neighborsInside(x, y, outerT)) {
          outData[pxIdx] = r;
          outData[pxIdx + 1] = g;
          outData[pxIdx + 2] = b;
          outData[pxIdx + 3] = a;
        } else if (isInside && innerT > 0 && neighborsOutside(x, y, innerT)) {
          outData[pxIdx] = r;
          outData[pxIdx + 1] = g;
          outData[pxIdx + 2] = b;
          outData[pxIdx + 3] = a;
        }
      }
    }
  }

  return out;
}
