// Almacén en memoria de los ArrayBuffers de GLBs cargados, por sha1.
//
// Persistencia: al guardar el proyecto (.pixcalli) los GLBs se embeben como
// data URL base64 en framesResume.extensions.threeDLayers[id].asset.dataUrl.
// Trade-off: archivos +33% tamaño vs binario, pero proyecto self-contained.
// Alternativa futura: File System Access bajo `assets/3d/<sha1>.glb`.

const buffers = new Map(); // sha1 → ArrayBuffer
const filenames = new Map(); // sha1 → string original (para mostrar)

export function storeBuffer(sha1, buffer, filename) {
  buffers.set(sha1, buffer);
  if (filename) filenames.set(sha1, filename);
}

export function getBuffer(sha1) {
  return buffers.get(sha1) || null;
}

export function getFilename(sha1) {
  return filenames.get(sha1) || null;
}

export function hasBuffer(sha1) {
  return buffers.has(sha1);
}

export function clearAll() {
  buffers.clear();
  filenames.clear();
}

// Convierte un ArrayBuffer a data URL base64 — usado al serializar el
// proyecto. El GLB queda embebido dentro del JSON.
export function bufferToDataUrl(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Procesar en chunks para no colapsar el stack con buffers grandes.
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return `data:model/gltf-binary;base64,${btoa(binary)}`;
}

// Inverso: data URL → ArrayBuffer. Usado al cargar un proyecto que tiene
// modelos embebidos.
export function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.split(",")[1] || dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
