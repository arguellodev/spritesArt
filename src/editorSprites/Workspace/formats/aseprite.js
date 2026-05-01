// aseprite.js — parser read-only de archivos .ase / .aseprite.
//
// Especificación oficial: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
// Este parser implementa el subset suficiente para abrir la mayoría de assets
// externos y reconstruirlos dentro de PixCalli:
//   - Header del archivo
//   - Frame headers
//   - Chunks: LAYER (0x2004), CEL (0x2005), PALETTE (0x2019), OLD PALETTE (0x0004),
//             TAGS (0x2018), SLICES (0x2022)
//   - Color depths: 32 (RGBA), 16 (grayscale), 8 (indexed)
//   - Compresión: raw (0) y zlib (2) para cel images.
//
// No soporta (aún): tilesets (0x2023), user data chunks, color profile.

import { inflate } from './zlibInflate';

// Tags de chunk usadas.
const CHUNK_OLD_PALETTE  = 0x0004;
const CHUNK_LAYER        = 0x2004;
const CHUNK_CEL          = 0x2005;
const CHUNK_TAGS         = 0x2018;
const CHUNK_PALETTE      = 0x2019;
const CHUNK_SLICES       = 0x2022;

const DEPTH_RGBA     = 32;
const DEPTH_GRAY     = 16;
const DEPTH_INDEXED  = 8;

/**
 * Parser principal. Recibe un ArrayBuffer con el contenido del archivo.
 * Devuelve un objeto con la estructura reconstruida.
 *
 * @param {ArrayBuffer} buffer
 * @returns {Promise<AsepriteDocument>}
 */
export async function parseAsepriteFile(buffer) {
  const dv = new DataView(buffer);
  const r = new Reader(dv);

  // --- Header del archivo (128 bytes) ---
  const fileSize = r.u32();                       // total size del archivo
  const magic = r.u16();
  if (magic !== 0xA5E0) {
    throw new Error(`Magic inválido: 0x${magic.toString(16)} (esperado 0xA5E0)`);
  }
  const framesCount = r.u16();
  const width = r.u16();
  const height = r.u16();
  const colorDepth = r.u16();                     // 32, 16 o 8
  const flags = r.u32();
  r.u16();                                        // speed (deprecated)
  r.u32();                                        // reserved
  r.u32();                                        // reserved
  const paletteEntrySize = r.u8();                // 0 o 1 (tamaño entry del palette en transparente)
  r.skip(3);
  r.u16();                                        // colors (old)
  const pixelWidth = r.u8();
  const pixelHeight = r.u8();
  r.i16();                                        // grid X
  r.i16();                                        // grid Y
  r.u16();                                        // grid width
  r.u16();                                        // grid height
  r.skip(84);                                     // reserved

  const doc = {
    fileSize,
    width,
    height,
    colorDepth,
    flags,
    pixelAspect: { w: pixelWidth || 1, h: pixelHeight || 1 },
    paletteEntrySize,
    framesCount,
    frames: [],
    layers: [],
    palette: [],
    tags: [],
    slices: [],
  };

  // --- Frames ---
  for (let fi = 0; fi < framesCount; fi++) {
    const frameStart = r.pos;
    const frameBytes = r.u32();
    const fmagic = r.u16();
    if (fmagic !== 0xF1FA) {
      throw new Error(`Frame magic inválido en frame ${fi}: 0x${fmagic.toString(16)}`);
    }
    const oldChunks = r.u16();
    const durationMs = r.u16();
    r.skip(2);
    const newChunks = r.u32();
    const chunkCount = newChunks > 0 ? newChunks : oldChunks;

    const frame = { duration: durationMs, cels: [] };

    for (let ci = 0; ci < chunkCount; ci++) {
      const chunkStart = r.pos;
      const chunkSize = r.u32();
      const chunkType = r.u16();
      const chunkEnd = chunkStart + chunkSize;

      if (chunkType === CHUNK_LAYER) {
        const layer = {
          flags: r.u16(),
          layerType: r.u16(),
          childLevel: r.u16(),
        };
        r.u16();                                   // default width (deprecated)
        r.u16();                                   // default height (deprecated)
        layer.blendMode = r.u16();
        layer.opacity = r.u8();
        r.skip(3);
        layer.name = r.string();
        layer.visible = (layer.flags & 1) !== 0;
        layer.locked = (layer.flags & 2) !== 0;
        doc.layers.push(layer);
      } else if (chunkType === CHUNK_CEL) {
        const cel = {
          layerIndex: r.u16(),
          x: r.i16(),
          y: r.i16(),
          opacity: r.u8(),
          celType: r.u16(),
        };
        r.i16();                                   // z-index
        r.skip(5);
        if (cel.celType === 0 || cel.celType === 2) {
          cel.width = r.u16();
          cel.height = r.u16();
          const pixelBytesCompressed = chunkEnd - r.pos;
          const raw = r.bytes(pixelBytesCompressed);
          let pixels;
          if (cel.celType === 0) {
            pixels = raw;
          } else {
            pixels = await inflate(raw);
          }
          cel.pixels = pixels;
          cel.imageData = decodePixels(pixels, cel.width, cel.height, colorDepth, doc.palette);
        } else if (cel.celType === 1) {
          cel.linkedFrame = r.u16();
        }
        frame.cels.push(cel);
      } else if (chunkType === CHUNK_PALETTE) {
        const newSize = r.u32();
        const from = r.u32();
        const to = r.u32();
        r.skip(8);
        const palette = doc.palette.slice();
        while (palette.length < newSize) palette.push({ r: 0, g: 0, b: 0, a: 255 });
        for (let i = from; i <= to; i++) {
          const entryFlags = r.u16();
          palette[i] = { r: r.u8(), g: r.u8(), b: r.u8(), a: r.u8() };
          if (entryFlags & 1) r.string(); // name
        }
        doc.palette = palette;
      } else if (chunkType === CHUNK_OLD_PALETTE && doc.palette.length === 0) {
        const numPackets = r.u16();
        const palette = [];
        let idx = 0;
        for (let p = 0; p < numPackets; p++) {
          const skip = r.u8();
          idx += skip;
          const n = r.u8() || 256;
          for (let i = 0; i < n; i++) {
            palette[idx++] = { r: r.u8(), g: r.u8(), b: r.u8(), a: 255 };
          }
        }
        doc.palette = palette;
      } else if (chunkType === CHUNK_TAGS) {
        const tagsCount = r.u16();
        r.skip(8);
        for (let t = 0; t < tagsCount; t++) {
          const tag = {
            from: r.u16(),
            to: r.u16(),
            direction: ['forward', 'reverse', 'pingpong', 'pingpong-reverse'][r.u8()] || 'forward',
          };
          r.u16();                                  // repeat
          r.skip(6);
          tag.color = `#${r.u8().toString(16).padStart(2,'0')}${r.u8().toString(16).padStart(2,'0')}${r.u8().toString(16).padStart(2,'0')}`;
          r.skip(1);
          tag.name = r.string();
          doc.tags.push(tag);
        }
      } else if (chunkType === CHUNK_SLICES) {
        const slicesCount = r.u32();
        const sflags = r.u32();
        r.u32();                                   // reserved
        const name = r.string();
        for (let s = 0; s < slicesCount; s++) {
          const slice = {
            name,
            frame: r.u32(),
            bounds: { x: r.i32(), y: r.i32(), w: r.u32(), h: r.u32() },
          };
          if (sflags & 1) {
            slice.center = { x: r.i32(), y: r.i32(), w: r.u32(), h: r.u32() };
          }
          if (sflags & 2) {
            slice.pivot = { x: r.i32(), y: r.i32() };
          }
          doc.slices.push(slice);
        }
      }

      // Avanzar al final del chunk (saltar bytes no consumidos).
      r.pos = chunkEnd;
    }

    doc.frames.push(frame);
    r.pos = frameStart + frameBytes;
  }

  return doc;
}

/**
 * Convierte un array de píxeles crudos al ImageData de canvas según colorDepth.
 */
function decodePixels(pixels, w, h, depth, palette) {
  const data = new Uint8ClampedArray(w * h * 4);
  if (depth === DEPTH_RGBA) {
    for (let i = 0; i < w * h * 4; i += 4) {
      data[i] = pixels[i];
      data[i + 1] = pixels[i + 1];
      data[i + 2] = pixels[i + 2];
      data[i + 3] = pixels[i + 3];
    }
  } else if (depth === DEPTH_GRAY) {
    for (let i = 0, j = 0; j < w * h * 2; i += 4, j += 2) {
      data[i] = data[i + 1] = data[i + 2] = pixels[j];
      data[i + 3] = pixels[j + 1];
    }
  } else if (depth === DEPTH_INDEXED) {
    for (let i = 0, j = 0; j < w * h; i += 4, j++) {
      const c = palette[pixels[j]] || { r: 0, g: 0, b: 0, a: 0 };
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = c.a;
    }
  }
  return new ImageData(data, w, h);
}

/**
 * Lector binario little-endian con cursor interno.
 */
class Reader {
  constructor(dataView) {
    this.dv = dataView;
    this.pos = 0;
    this.decoder = new TextDecoder('utf-8');
  }
  u8() { return this.dv.getUint8(this.pos++); }
  u16() { const v = this.dv.getUint16(this.pos, true); this.pos += 2; return v; }
  u32() { const v = this.dv.getUint32(this.pos, true); this.pos += 4; return v; }
  i16() { const v = this.dv.getInt16(this.pos, true); this.pos += 2; return v; }
  i32() { const v = this.dv.getInt32(this.pos, true); this.pos += 4; return v; }
  skip(n) { this.pos += n; }
  bytes(n) {
    const b = new Uint8Array(this.dv.buffer, this.dv.byteOffset + this.pos, n);
    this.pos += n;
    return b;
  }
  string() {
    const len = this.u16();
    const b = new Uint8Array(this.dv.buffer, this.dv.byteOffset + this.pos, len);
    this.pos += len;
    return this.decoder.decode(b);
  }
}

/**
 * Carga un File como AsepriteDocument.
 */
export async function loadAsepriteFile(file) {
  const buffer = await file.arrayBuffer();
  return parseAsepriteFile(buffer);
}

/**
 * Convierte un AsepriteDocument a la estructura interna PixCalli-like:
 *   { width, height, palette, frames: { [n]: { duration, canvases: { [layerId]: canvas } } }, layers, tags, slices }
 *
 * Los cels con celType=1 (linked) se resuelven siguiendo la cadena.
 */
export function asepriteDocToPixcalli(doc) {
  const layers = doc.layers.map((l, i) => ({
    id: `layer_${i}`,
    name: l.name,
    visible: l.visible,
    opacity: l.opacity / 255,
    zIndex: i,
    blendMode: asepriteBlendModeToCss(l.blendMode),
  }));

  const frames = {};
  doc.frames.forEach((frame, fi) => {
    frames[fi] = { duration: frame.duration, canvases: {} };
    for (const cel of frame.cels) {
      let resolvedCel = cel;
      if (cel.celType === 1 && cel.linkedFrame != null) {
        const linkedFrame = doc.frames[cel.linkedFrame];
        resolvedCel = linkedFrame?.cels.find((c) => c.layerIndex === cel.layerIndex) ?? cel;
      }
      if (!resolvedCel.imageData) continue;
      const layerId = layers[cel.layerIndex]?.id;
      if (!layerId) continue;
      // Compose al tamaño del documento, centrando al offset del cel.
      const canvas = document.createElement('canvas');
      canvas.width = doc.width;
      canvas.height = doc.height;
      const ctx = canvas.getContext('2d');
      const src = document.createElement('canvas');
      src.width = resolvedCel.width;
      src.height = resolvedCel.height;
      src.getContext('2d').putImageData(resolvedCel.imageData, 0, 0);
      ctx.drawImage(src, cel.x, cel.y);
      frames[fi].canvases[layerId] = canvas;
    }
  });

  return {
    width: doc.width,
    height: doc.height,
    palette: doc.palette,
    layers,
    frames,
    tags: doc.tags,
    slices: doc.slices,
  };
}

function asepriteBlendModeToCss(mode) {
  return {
    0: 'normal',
    1: 'multiply',
    2: 'screen',
    3: 'overlay',
    4: 'darken',
    5: 'lighten',
    6: 'color-dodge',
    7: 'color-burn',
    8: 'hard-light',
    9: 'soft-light',
    10: 'difference',
    11: 'exclusion',
    12: 'hue',
    13: 'saturation',
    14: 'color',
    15: 'luminosity',
  }[mode] || 'normal';
}
