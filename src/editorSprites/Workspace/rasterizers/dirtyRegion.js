"use no memo";

// Acumulador de rects sucios durante un trazo. Al commit, los fusiona en el
// mínimo conjunto de rects no solapados. Uso principal:
//
//   - Undo: guardar solo la sub-imagen del rect sucio (no el canvas entero).
//   - Compositing: redibujar solo lo que cambió en lugar de todo el viewport.
//
// El merge es agresivo por defecto: si dos rects se solapan más del mergeRatio
// del menor (50% por defecto) se fusionan en su bbox. Un overshoot pequeño de
// pixeles limpios redibujados es mucho más barato que gestionar decenas de rects.

export class DirtyRegion {
  constructor({ mergeRatio = 0.5 } = {}) {
    this.rects = [];
    this.mergeRatio = mergeRatio;
  }

  clear() {
    this.rects.length = 0;
  }

  isEmpty() {
    return this.rects.length === 0;
  }

  // Añade un rect. Expande si pegan con otro existente (merge barato en caliente).
  addRect(x, y, w, h) {
    if (w <= 0 || h <= 0) return;
    x = x | 0; y = y | 0; w = w | 0; h = h | 0;
    const r = { x, y, w, h };

    for (let i = 0; i < this.rects.length; i++) {
      if (shouldMerge(this.rects[i], r, this.mergeRatio)) {
        this.rects[i] = bboxUnion(this.rects[i], r);
        return;
      }
    }
    this.rects.push(r);
  }

  addPixel(x, y) {
    this.addRect(x | 0, y | 0, 1, 1);
  }

  // Agranda cada rect en padding pixeles (útil para kernels de blur).
  inflate(padding) {
    padding = padding | 0;
    if (padding <= 0) return;
    for (const r of this.rects) {
      r.x -= padding;
      r.y -= padding;
      r.w += padding * 2;
      r.h += padding * 2;
    }
  }

  // Clampa al bounding del canvas. Descarta los que queden vacíos.
  clamp(maxW, maxH) {
    const out = [];
    for (const r of this.rects) {
      const x = Math.max(0, r.x);
      const y = Math.max(0, r.y);
      const x1 = Math.min(maxW, r.x + r.w);
      const y1 = Math.min(maxH, r.y + r.h);
      const w = x1 - x, h = y1 - y;
      if (w > 0 && h > 0) out.push({ x, y, w, h });
    }
    this.rects = out;
  }

  // Fusiona todos los rects que se solapen según mergeRatio. Pasada O(n²) pero
  // n suele ser <10 tras los merges en caliente.
  collapse() {
    let changed = true;
    while (changed) {
      changed = false;
      outer:
      for (let i = 0; i < this.rects.length; i++) {
        for (let j = i + 1; j < this.rects.length; j++) {
          if (shouldMerge(this.rects[i], this.rects[j], this.mergeRatio)) {
            this.rects[i] = bboxUnion(this.rects[i], this.rects[j]);
            this.rects.splice(j, 1);
            changed = true;
            break outer;
          }
        }
      }
    }
  }

  // Rect que contiene a todos los rects actuales, o null si vacío.
  bounds() {
    if (this.rects.length === 0) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const r of this.rects) {
      if (r.x < x0) x0 = r.x;
      if (r.y < y0) y0 = r.y;
      if (r.x + r.w > x1) x1 = r.x + r.w;
      if (r.y + r.h > y1) y1 = r.y + r.h;
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // Snapshot inmutable de los rects actuales.
  snapshot() {
    return this.rects.map((r) => ({ ...r }));
  }
}

function intersectArea(a, b) {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  const w = x1 - x0, h = y1 - y0;
  return w > 0 && h > 0 ? w * h : 0;
}

function shouldMerge(a, b, ratio) {
  const inter = intersectArea(a, b);
  if (inter === 0) {
    // Permite merge si son adyacentes con misma dimensión en el eje común.
    if (a.x === b.x && a.w === b.w && (a.y + a.h === b.y || b.y + b.h === a.y)) return true;
    if (a.y === b.y && a.h === b.h && (a.x + a.w === b.x || b.x + b.w === a.x)) return true;
    return false;
  }
  const minArea = Math.min(a.w * a.h, b.w * b.h);
  return inter / minArea >= ratio;
}

function bboxUnion(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.w, b.x + b.w);
  const y1 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x1 - x, h: y1 - y };
}

// Extrae la sub-imagen de un ImageData dentro de un rect. Copia los bytes
// en un buffer contiguo (sin referencias al original).
export function sliceImageData(imageData, rect) {
  const { data, width } = imageData;
  const { x, y, w, h } = rect;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const srcStart = ((y + row) * width + x) * 4;
    out.set(data.subarray(srcStart, srcStart + w * 4), row * w * 4);
  }
  return new ImageData(out, w, h);
}

// Inverso: pega una sub-imagen en un ImageData destino en la posición indicada.
export function pasteImageData(dst, src, destX, destY) {
  const { width: dw, height: dh, data: dd } = dst;
  const { width: sw, height: sh, data: sd } = src;
  for (let row = 0; row < sh; row++) {
    const dy = destY + row;
    if (dy < 0 || dy >= dh) continue;
    const dx = destX;
    const copyW = Math.min(sw, dw - dx);
    if (copyW <= 0) continue;
    const srcStart = row * sw * 4;
    const dstStart = (dy * dw + dx) * 4;
    dd.set(sd.subarray(srcStart, srcStart + copyW * 4), dstStart);
  }
}
