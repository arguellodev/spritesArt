// referenceLayer.js — capa de referencia 2D.
// Una imagen importada por el usuario (PNG/JPEG) que se muestra sobre el canvas
// con opacidad reducida, bloqueada por defecto y no incluida en el export.
// Útil para calcar poses, referencias anatómicas, concept art, etc.

let _idCounter = 0;
const newId = () => `ref_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

export function createReferenceLayer({ name = 'Referencia', image }) {
  // `image` puede ser un HTMLImageElement o un canvas. Si es Image, lo dibujamos
  // en un canvas propio para poder escalar/rotar sin tocar la imagen original.
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  canvas.getContext('2d').drawImage(image, 0, 0);
  return {
    id: newId(),
    type: 'reference',
    name,
    canvas,
    visible: true,
    locked: true,          // bloqueada: no se puede pintar encima
    exportable: false,     // no incluir al exportar PNG/video/GIF
    opacity: 0.5,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  };
}

/**
 * Carga un File/Blob como capa de referencia. Devuelve una Promise con la layer.
 */
export function loadReferenceFromFile(file, { name } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(createReferenceLayer({ name: name || file.name, image: img }));
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Renderiza una referencia sobre un contexto 2D respetando sus transforms.
 */
export function drawReferenceLayer(ctx, layer, { zoom = 1 } = {}) {
  if (!layer.visible) return;
  const { canvas, opacity, x, y, scale, rotation } = layer;
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.imageSmoothingEnabled = false;
  ctx.translate((x + w / 2) * zoom, (y + h / 2) * zoom);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(canvas, (-w / 2) * zoom, (-h / 2) * zoom, w * zoom, h * zoom);
  ctx.restore();
}

/**
 * Updates inmutables.
 */
export function setReferenceOpacity(layer, opacity) {
  return { ...layer, opacity: Math.max(0, Math.min(1, opacity)) };
}
export function setReferenceTransform(layer, { x, y, scale, rotation }) {
  return {
    ...layer,
    x: x ?? layer.x,
    y: y ?? layer.y,
    scale: scale ?? layer.scale,
    rotation: rotation ?? layer.rotation,
  };
}
export function setReferenceVisibility(layer, visible) {
  return { ...layer, visible };
}
export function setReferenceLocked(layer, locked) {
  return { ...layer, locked };
}
