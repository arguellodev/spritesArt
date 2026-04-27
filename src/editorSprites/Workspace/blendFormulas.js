'use no memo';
// Fórmulas exactas de blend modes — match Aseprite/Photoshop/W3C PDF spec.
//
// Refs:
//  - W3C Compositing and Blending Level 1: https://www.w3.org/TR/compositing-1/
//  - PDF 1.7 spec, sección 11.3.5 (Blend Functions)
//  - Aseprite blend_funcs.cpp (open source)
//
// Convención: todos los canales son floats normalizados [0,1]. Las funciones
// per-canal toman (backdrop, source) y devuelven el resultado del blend ANTES
// del alpha compositing. Las HSL toman vectores (br,bg,bb, sr,sg,sb) y
// devuelven [r,g,b].
//
// El alpha compositing W3C non-isolated se hace en pixelBlender.js — estas
// son fórmulas puras de color, no manejan alpha.

// =============================================================================
// SEPARABLE BLEND FUNCTIONS — per channel
// =============================================================================

export const blendNormal     = (b, s) => s;
export const blendMultiply   = (b, s) => b * s;
export const blendScreen     = (b, s) => b + s - b * s;
export const blendDarken     = (b, s) => b < s ? b : s;
export const blendLighten    = (b, s) => b > s ? b : s;
export const blendDifference = (b, s) => b > s ? b - s : s - b;
export const blendExclusion  = (b, s) => b + s - 2 * b * s;

export const blendOverlay = (b, s) => {
  return b <= 0.5
    ? 2 * b * s
    : 1 - 2 * (1 - b) * (1 - s);
};

export const blendHardLight = (b, s) => {
  return s <= 0.5
    ? 2 * b * s
    : 1 - 2 * (1 - b) * (1 - s);
};

// W3C/Photoshop soft-light. Aseprite usa la misma fórmula.
export const blendSoftLight = (b, s) => {
  if (s <= 0.5) {
    return b - (1 - 2 * s) * b * (1 - b);
  }
  const D = b <= 0.25
    ? ((16 * b - 12) * b + 4) * b
    : Math.sqrt(b);
  return b + (2 * s - 1) * (D - b);
};

export const blendColorDodge = (b, s) => {
  if (b <= 0) return 0;
  if (s >= 1) return 1;
  return Math.min(1, b / (1 - s));
};

export const blendColorBurn = (b, s) => {
  if (b >= 1) return 1;
  if (s <= 0) return 0;
  return 1 - Math.min(1, (1 - b) / s);
};

// === Aseprite extras (no nativos en Canvas2D) ===

export const blendAddition = (b, s) => {
  const r = b + s;
  return r > 1 ? 1 : r;
};

export const blendSubtract = (b, s) => {
  const r = b - s;
  return r < 0 ? 0 : r;
};

export const blendDivide = (b, s) => {
  if (s <= 0) {
    return b <= 0 ? 0 : 1;
  }
  return Math.min(1, b / s);
};

// =============================================================================
// NON-SEPARABLE BLEND FUNCTIONS — HSL
// =============================================================================

const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;

const clipColor = (out) => {
  const L = lum(out[0], out[1], out[2]);
  const n = Math.min(out[0], out[1], out[2]);
  const x = Math.max(out[0], out[1], out[2]);
  if (n < 0) {
    const k = L / (L - n);
    out[0] = L + (out[0] - L) * k;
    out[1] = L + (out[1] - L) * k;
    out[2] = L + (out[2] - L) * k;
  }
  if (x > 1) {
    const k = (1 - L) / (x - L);
    out[0] = L + (out[0] - L) * k;
    out[1] = L + (out[1] - L) * k;
    out[2] = L + (out[2] - L) * k;
  }
  return out;
};

const setLum = (r, g, b, L) => {
  const d = L - lum(r, g, b);
  return clipColor([r + d, g + d, b + d]);
};

const sat = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);

// Set saturation: preserva el orden de canales (max/mid/min) del color origen
// y reescala min→0, mid→proportional, max→s. Si max==min (achromatic), todo 0.
const setSat = (r, g, b, s) => {
  // Identifica indices de min/mid/max sin ordenar (más rápido)
  let imin, imid, imax;
  if (r >= g) {
    if (r >= b) { imax = 0; if (g >= b) { imid = 1; imin = 2; } else { imid = 2; imin = 1; } }
    else        { imax = 2; imid = 0; imin = 1; }
  } else {
    if (g >= b) { imax = 1; if (r >= b) { imid = 0; imin = 2; } else { imid = 2; imin = 0; } }
    else        { imax = 2; imid = 1; imin = 0; }
  }
  const ch = [r, g, b];
  const cmax = ch[imax];
  const cmin = ch[imin];
  const out = [0, 0, 0];
  if (cmax > cmin) {
    out[imid] = ((ch[imid] - cmin) * s) / (cmax - cmin);
    out[imax] = s;
  }
  // out[imin] = 0 (default)
  return out;
};

// Hue: usa el TONO del source, conserva sat + luminosidad del backdrop.
export const blendHue = (br, bg, bb, sr, sg, sb) => {
  const sb_arr = setSat(sr, sg, sb, sat(br, bg, bb));
  return setLum(sb_arr[0], sb_arr[1], sb_arr[2], lum(br, bg, bb));
};

// Saturation: usa la SAT del source, conserva tono + luminosidad del backdrop.
export const blendSaturation = (br, bg, bb, sr, sg, sb) => {
  const ss = setSat(br, bg, bb, sat(sr, sg, sb));
  return setLum(ss[0], ss[1], ss[2], lum(br, bg, bb));
};

// Color: usa tono+sat del source, conserva luminosidad del backdrop.
export const blendColor = (br, bg, bb, sr, sg, sb) => {
  return setLum(sr, sg, sb, lum(br, bg, bb));
};

// Luminosity: usa LUM del source, conserva tono+sat del backdrop.
export const blendLuminosity = (br, bg, bb, sr, sg, sb) => {
  return setLum(br, bg, bb, lum(sr, sg, sb));
};

// =============================================================================
// REGISTRY — mapea blend mode id -> función + flag de separable
// =============================================================================

// Separables: B(b,s) per canal. Más rápidas (3 calls por pixel).
export const SEPARABLE_BLEND_FUNCS = {
  'normal':       blendNormal,
  'multiply':     blendMultiply,
  'screen':       blendScreen,
  'overlay':      blendOverlay,
  'darken':       blendDarken,
  'lighten':      blendLighten,
  'color-dodge':  blendColorDodge,
  'color-burn':   blendColorBurn,
  'hard-light':   blendHardLight,
  'soft-light':   blendSoftLight,
  'difference':   blendDifference,
  'exclusion':    blendExclusion,
  'addition':     blendAddition,
  'subtract':     blendSubtract,
  'divide':       blendDivide,
};

// No-separables: B(br,bg,bb, sr,sg,sb) → [r,g,b]. 1 call por pixel.
export const NON_SEPARABLE_BLEND_FUNCS = {
  'hue':         blendHue,
  'saturation':  blendSaturation,
  'color':       blendColor,
  'luminosity':  blendLuminosity,
};

export const isNonSeparableBlendMode = (id) => id in NON_SEPARABLE_BLEND_FUNCS;
export const isSeparableBlendMode = (id) => id in SEPARABLE_BLEND_FUNCS;

// Validador wide: incluye TODOS los modos (separables + no-separables)
export const isKnownBlendMode = (id) =>
  isSeparableBlendMode(id) || isNonSeparableBlendMode(id);

// =============================================================================
// SELF-TEST: valida fórmulas contra valores conocidos al cargar el módulo
// (solo en dev — silencioso en prod)
// =============================================================================

if (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) {
  const approx = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
  const cases = [
    // Multiply: red × blue por canal
    ['multiply red×blue R', blendMultiply(1, 0), 0],
    ['multiply red×blue G', blendMultiply(0, 0), 0],
    ['multiply red×blue B', blendMultiply(0, 1), 0],
    // Screen: red + blue por canal
    ['screen red×blue R', blendScreen(1, 0), 1],
    ['screen red×blue B', blendScreen(0, 1), 1],
    // Darken/Lighten
    ['darken 0.3, 0.7', blendDarken(0.3, 0.7), 0.3],
    ['lighten 0.3, 0.7', blendLighten(0.3, 0.7), 0.7],
    // Difference / Exclusion
    ['difference 1,0', blendDifference(1, 0), 1],
    ['exclusion 0.5,0.5', blendExclusion(0.5, 0.5), 0.5],
    // Color Dodge edge: src=1 → 1
    ['dodge b=0.5,s=1', blendColorDodge(0.5, 1), 1],
    // Color Burn edge: src=0 → 0
    ['burn b=0.5,s=0', blendColorBurn(0.5, 0), 0],
    // Overlay: condicional sobre b
    ['overlay b=0.3,s=0.5', blendOverlay(0.3, 0.5), 2 * 0.3 * 0.5],         // mult
    ['overlay b=0.7,s=0.5', blendOverlay(0.7, 0.5), 1 - 2 * 0.3 * 0.5],     // screen
    // Soft light: cubic when b<=0.25 and s>0.5
    ['softlight b=0.1,s=0.7 cubic', blendSoftLight(0.1, 0.7),
      0.1 + (2*0.7-1)*(((16*0.1-12)*0.1+4)*0.1 - 0.1)],
    // Aseprite extras
    ['addition 0.5,0.7 clamp', blendAddition(0.5, 0.7), 1],
    ['subtract 0.3,0.7 clamp', blendSubtract(0.3, 0.7), 0],
    ['divide 0.5,0 → 1', blendDivide(0.5, 0), 1],
    ['divide 0.5,0.25 → 1', blendDivide(0.5, 0.25), 1], // 2.0 clamped
    // Lum helper
    ['lum white', lum(1, 1, 1), 1],
    ['lum red', lum(1, 0, 0), 0.3],
    ['lum green', lum(0, 1, 0), 0.59],
    ['lum blue', lum(0, 0, 1), 0.11],
  ];
  let failed = 0;
  for (const [name, got, expected] of cases) {
    if (!approx(got, expected, 1e-6)) {
        console.error(`[blendFormulas self-test FAIL] ${name}: got ${got}, expected ${expected}`);
      failed++;
    }
  }
  if (failed === 0) {
    console.debug('[blendFormulas] self-test pasó (' + cases.length + ' casos)');
  }
}
