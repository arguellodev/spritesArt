"use no memo";

// Kernels de filtro reutilizables para blur / smudge / light / dark.
//
// Todos trabajan sobre Uint8ClampedArray con layout RGBA (ImageData.data).
// Los kernels de blur son *separables*: dos passes 1D (H y V) en lugar de
// una convolución 2D. Para radio k, complejidad O(n·k) vs O(n·k²).

// ---------- Gaussian separable ----------

export function buildGaussianKernel(radius, sigma) {
  radius = Math.max(1, radius | 0);
  sigma = sigma > 0 ? sigma : radius / 2;
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  const twoSigmaSq = 2 * sigma * sigma;
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / twoSigmaSq);
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}

export function gaussianBlurRGBA(src, width, height, radius, sigma) {
  const kernel = buildGaussianKernel(radius, sigma);
  const tmp = new Uint8ClampedArray(src.length);
  const out = new Uint8ClampedArray(src.length);
  convolveRow(src, tmp, width, height, kernel, radius);
  convolveCol(tmp, out, width, height, kernel, radius);
  return out;
}

function convolveRow(src, dst, w, h, k, r) {
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      let accR = 0, accG = 0, accB = 0, accA = 0;
      for (let i = -r; i <= r; i++) {
        let sx = x + i;
        if (sx < 0) sx = 0; else if (sx >= w) sx = w - 1;
        const idx = rowOffset + sx * 4;
        const weight = k[i + r];
        accR += src[idx]     * weight;
        accG += src[idx + 1] * weight;
        accB += src[idx + 2] * weight;
        accA += src[idx + 3] * weight;
      }
      const o = rowOffset + x * 4;
      dst[o]     = accR;
      dst[o + 1] = accG;
      dst[o + 2] = accB;
      dst[o + 3] = accA;
    }
  }
}

function convolveCol(src, dst, w, h, k, r) {
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let accR = 0, accG = 0, accB = 0, accA = 0;
      for (let i = -r; i <= r; i++) {
        let sy = y + i;
        if (sy < 0) sy = 0; else if (sy >= h) sy = h - 1;
        const idx = (sy * w + x) * 4;
        const weight = k[i + r];
        accR += src[idx]     * weight;
        accG += src[idx + 1] * weight;
        accB += src[idx + 2] * weight;
        accA += src[idx + 3] * weight;
      }
      const o = (y * w + x) * 4;
      dst[o]     = accR;
      dst[o + 1] = accG;
      dst[o + 2] = accB;
      dst[o + 3] = accA;
    }
  }
}

// ---------- Box blur por integral image (O(n) independiente de radio) ----------
//
// Ideal para radios grandes. 2–3 passes de box blur aproximan un gaussiano.

export function boxBlurRGBA(src, width, height, radius) {
  const n = width * height;
  // 4 integrales (R, G, B, A). Uint32Array suficiente para canvas <65535² con
  // acumulados hasta 255*n ≤ 4GB — usar Float64 para seguridad sin sacrificar
  // mucho rendimiento.
  const intR = new Float64Array(n);
  const intG = new Float64Array(n);
  const intB = new Float64Array(n);
  const intA = new Float64Array(n);

  // Integral image: intX(x,y) = sum of src over rect [0,0]..[x,y]
  for (let y = 0; y < height; y++) {
    let rowR = 0, rowG = 0, rowB = 0, rowA = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rowR += src[idx];
      rowG += src[idx + 1];
      rowB += src[idx + 2];
      rowA += src[idx + 3];
      const i = y * width + x;
      if (y === 0) {
        intR[i] = rowR; intG[i] = rowG; intB[i] = rowB; intA[i] = rowA;
      } else {
        const up = i - width;
        intR[i] = rowR + intR[up];
        intG[i] = rowG + intG[up];
        intB[i] = rowB + intB[up];
        intA[i] = rowA + intA[up];
      }
    }
  }

  const out = new Uint8ClampedArray(src.length);
  const sumRect = (arr, x0, y0, x1, y1) => {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    x1 = Math.min(width - 1, x1); y1 = Math.min(height - 1, y1);
    const a = arr[y1 * width + x1];
    const b = x0 > 0 ? arr[y1 * width + (x0 - 1)] : 0;
    const c = y0 > 0 ? arr[(y0 - 1) * width + x1] : 0;
    const d = x0 > 0 && y0 > 0 ? arr[(y0 - 1) * width + (x0 - 1)] : 0;
    return a - b - c + d;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = x - radius, x1 = x + radius;
      const y0 = y - radius, y1 = y + radius;
      const xA = Math.max(0, x0), yA = Math.max(0, y0);
      const xB = Math.min(width - 1, x1), yB = Math.min(height - 1, y1);
      const area = (xB - xA + 1) * (yB - yA + 1);
      const o = (y * width + x) * 4;
      out[o]     = sumRect(intR, x0, y0, x1, y1) / area;
      out[o + 1] = sumRect(intG, x0, y0, x1, y1) / area;
      out[o + 2] = sumRect(intB, x0, y0, x1, y1) / area;
      out[o + 3] = sumRect(intA, x0, y0, x1, y1) / area;
    }
  }
  return out;
}

// ---------- Motion blur direccional ----------
//
// Kernel 1D a lo largo del vector (dx, dy). Pensado para trazo del pointer.

export function motionBlurRGBA(src, width, height, length, angleRad) {
  length = Math.max(1, length | 0);
  const out = new Uint8ClampedArray(src.length);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let accR = 0, accG = 0, accB = 0, accA = 0, count = 0;
      for (let i = -length; i <= length; i++) {
        const sx = Math.round(x + i * cos);
        const sy = Math.round(y + i * sin);
        if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
        const idx = (sy * width + sx) * 4;
        accR += src[idx]; accG += src[idx + 1];
        accB += src[idx + 2]; accA += src[idx + 3];
        count++;
      }
      const o = (y * width + x) * 4;
      out[o]     = accR / count;
      out[o + 1] = accG / count;
      out[o + 2] = accB / count;
      out[o + 3] = accA / count;
    }
  }
  return out;
}

// ---------- Radial blur ----------
//
// Blur que crece con la distancia al centro. length es el máximo en el borde.

export function radialBlurRGBA(src, width, height, length, cx, cy) {
  length = Math.max(1, length | 0);
  cx = cx ?? width / 2;
  cy = cy ?? height / 2;
  const maxDist = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
  const out = new Uint8ClampedArray(src.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const localLen = Math.max(1, Math.round((dist / maxDist) * length));
      const dirX = dist > 0 ? dx / dist : 0;
      const dirY = dist > 0 ? dy / dist : 0;

      let accR = 0, accG = 0, accB = 0, accA = 0, count = 0;
      for (let i = -localLen; i <= localLen; i++) {
        const sx = Math.round(x + i * dirX);
        const sy = Math.round(y + i * dirY);
        if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
        const idx = (sy * width + sx) * 4;
        accR += src[idx]; accG += src[idx + 1];
        accB += src[idx + 2]; accA += src[idx + 3];
        count++;
      }
      const o = (y * width + x) * 4;
      out[o]     = accR / count;
      out[o + 1] = accG / count;
      out[o + 2] = accB / count;
      out[o + 3] = accA / count;
    }
  }
  return out;
}

// ---------- Sample-and-smear (smudge estilo Aseprite) ----------
//
// Mantiene un "sample" del bounding box del pincel bajo cursor. En cada
// movimiento compone el sample sobre el destino con opacity variable y
// re-muestrea desde la nueva composición. Esto produce el look de smudge
// clásico: arrastra el color sin promediarlo plano.
//
// Uso:
//   const smear = createSmearState(imageData, x, y, brushRadius);
//   // en cada pointermove:
//   smear.step(imageData, x, y, strength);  // strength 0..1
//   // el imageData queda modificado in-place.

export function createSmearState(imageData, x, y, brushRadius) {
  const sample = sampleCircle(imageData, x, y, brushRadius);
  return {
    sample,
    radius: brushRadius,
    lastX: x | 0,
    lastY: y | 0,

    step(targetImageData, nextX, nextY, strength) {
      nextX = nextX | 0; nextY = nextY | 0;
      strength = Math.max(0, Math.min(1, strength));
      blendCircle(targetImageData, this.sample, nextX, nextY, this.radius, strength);
      this.sample = sampleCircle(targetImageData, nextX, nextY, this.radius);
      this.lastX = nextX;
      this.lastY = nextY;
    },
  };
}

function sampleCircle(imageData, cx, cy, r) {
  const { data, width, height } = imageData;
  const size = r * 2 + 1;
  const out = new Uint8ClampedArray(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = i - r, dy = j - r;
      const sx = cx + dx, sy = cy + dy;
      const o = (j * size + i) * 4;
      if (dx * dx + dy * dy > r * r || sx < 0 || sx >= width || sy < 0 || sy >= height) {
        out[o + 3] = 0;
        continue;
      }
      const s = (sy * width + sx) * 4;
      out[o]     = data[s];
      out[o + 1] = data[s + 1];
      out[o + 2] = data[s + 2];
      out[o + 3] = data[s + 3];
    }
  }
  return { buf: out, size };
}

function blendCircle(imageData, sample, cx, cy, r, strength) {
  const { data, width, height } = imageData;
  const { buf, size } = sample;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = i - r, dy = j - r;
      if (dx * dx + dy * dy > r * r) continue;
      const tx = cx + dx, ty = cy + dy;
      if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue;
      const s = (j * size + i) * 4;
      const t = (ty * width + tx) * 4;
      if (buf[s + 3] === 0) continue;
      const inv = 1 - strength;
      data[t]     = data[t]     * inv + buf[s]     * strength;
      data[t + 1] = data[t + 1] * inv + buf[s + 1] * strength;
      data[t + 2] = data[t + 2] * inv + buf[s + 2] * strength;
      data[t + 3] = data[t + 3] * inv + buf[s + 3] * strength;
    }
  }
}
