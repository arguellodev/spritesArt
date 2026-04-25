// hueSaturation.js — filtro HSL (Hue / Saturation / Lightness).
//
// Acepta deltas de cada canal HSL y devuelve un nuevo ImageData.
// - hue:         rotación en grados, [-180, 180].
// - saturation:  delta aditivo en [-100, 100] sobre el valor S (0..100).
// - lightness:   delta aditivo en [-100, 100] sobre el valor L (0..100).
//
// Píxeles con alpha=0 se ignoran (no tienen color significativo).

/**
 * @param {ImageData} source
 * @param {{hue?:number, saturation?:number, lightness?:number, colorize?:boolean, colorizeHue?:number}} opts
 * @returns {ImageData}
 */
export function hueSaturation(source, opts = {}) {
  const {
    hue = 0,
    saturation = 0,
    lightness = 0,
    colorize = false,
    colorizeHue = 0,
  } = opts;

  const { width, height, data } = source;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const o = out.data;

  const hueShift = hue / 360; // normalizado a [-0.5, 0.5]
  const satDelta = saturation / 100;
  const lightDelta = lightness / 100;
  const fixedHue = ((colorizeHue % 360) + 360) % 360 / 360;

  for (let i = 0; i < o.length; i += 4) {
    const a = o[i + 3];
    if (a === 0) continue;
    const r = o[i] / 255;
    const g = o[i + 1] / 255;
    const b = o[i + 2] / 255;
    const [h0, s0, l0] = rgbToHsl(r, g, b);

    let h = colorize ? fixedHue : (h0 + hueShift + 1) % 1;
    let s = colorize ? clamp01(satDelta >= 0 ? satDelta : 0) : clamp01(s0 + satDelta);
    let l = clamp01(l0 + lightDelta);

    const [nr, ng, nb] = hslToRgb(h, s, l);
    o[i] = Math.round(nr * 255);
    o[i + 1] = Math.round(ng * 255);
    o[i + 2] = Math.round(nb * 255);
    // alpha intacto
  }
  return out;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Conversiones estándar RGB<->HSL, todas en [0, 1].
export function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

export function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
