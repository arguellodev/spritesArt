// Schema y defaults para metadata de capas 3D.
//
// La metadata vive en `framesResume.extensions.threeDLayers[layerId]`. Un
// proyecto sin esta clave (v2.0.0) abre normalmente y simplemente no tiene
// capas 3D. Una capa 3D sin asset cargado todavía es válida — muestra un
// estado vacío en el panel hasta que el usuario seleccione un GLB.

/**
 * @typedef {object} ThreeDLayerAsset
 * @property {string} sha1 - hash del archivo GLB para deduplicar y referenciar
 * @property {string} filename - nombre original visible para el usuario
 * @property {string} relativePath - ubicación en el proyecto (assets/3d/<sha1>.glb)
 *   o null si el modelo está en memoria pero aún no persistido.
 * @property {string} [dataUrl] - SOLO en proyectos antiguos / fallback in-memory.
 *   El path normal usa relativePath sobre File System Access API.
 */

/**
 * @typedef {object} ThreeDLayerBase
 * Todos los campos que aplican globalmente a la capa (todos los frames).
 *
 * @property {{ type: 'perspective' | 'orthographic', distance: number, fov: number }} camera
 * @property {number} brightness
 * @property {{ r: number, g: number, b: number, a: number }} background - rgba 0-255
 * @property {1|2|4|6|8} renderScale - divisor de resolución (look pixelado)
 * @property {'none'|'poster'|'toon'|'contrast'} colorMode
 * @property {'none'|'flatten-x'|'flatten-y'|'flatten-z'} flattenMode
 * @property {number} flattenAmount - 0..1
 * @property {boolean} antiAlias
 * @property {{
 *   enabled: boolean,
 *   depthStrength: number,
 *   depthColor: string,
 *   normalStrength: number,
 *   normalColor: string,
 *   normalThreshold: number,
 *   detectOccluded: boolean,
 * }} outline
 * @property {{
 *   clipIndex: number,        // -1 = sin animación
 *   autoTimeline: boolean,    // si true, mapea frame index → tiempo de clip
 *   speed: number,            // multiplicador
 * }} animation
 */

/**
 * @typedef {object} ThreeDFrameOverride
 * Sparse — solo claves que difieran del base. Si autoTimeline=true en base
 * y este override no incluye animationTime, el tiempo se calcula automático
 * desde el frame index.
 *
 * @property {[number, number, number]} [rotation] - euler XYZ aditivo en radianes
 * @property {number} [animationTime] - segundos absolutos en el clip activo
 * @property {[number, number, number]} [cameraTarget] - origen del orbit
 */

/**
 * @typedef {object} ThreeDLayerMetadata
 * @property {ThreeDLayerAsset|null} asset
 * @property {ThreeDLayerBase} base
 * @property {Record<number, ThreeDFrameOverride>} frameOverrides
 */

/** @returns {ThreeDLayerBase} */
export function makeDefault3DLayerBase() {
  return {
    camera: {
      type: 'perspective',
      // distance se sobrescribe al cargar el modelo (auto-fit en cameraFit.js).
      distance: 5,
      fov: 80,
    },
    brightness: 1.0,
    // Fondo transparente por defecto — la capa 3D se mezcla con las que estén
    // debajo en el composite. El visor modal usa background sólido (alpha=1).
    background: { r: 0, g: 0, b: 0, a: 0 },
    renderScale: 4,
    colorMode: 'none',
    flattenMode: 'none',
    flattenAmount: 0.5,
    antiAlias: false,
    outline: {
      enabled: true,
      depthStrength: 0.7,
      depthColor: '#000000',
      normalStrength: 0.5,
      normalColor: '#000000',
      normalThreshold: 0.15,
      detectOccluded: true,
    },
    animation: {
      clipIndex: -1,
      autoTimeline: true,
      speed: 1.0,
    },
  };
}

/** @returns {ThreeDLayerMetadata} */
export function makeDefault3DLayerMetadata() {
  return {
    asset: null,
    base: makeDefault3DLayerBase(),
    frameOverrides: {},
  };
}

// Hash determinístico de un base+override → string corto para invalidar cache
// del renderer. Si dos llamadas producen el mismo hash, no hace falta re-render.
export function hashLayerRenderState(layerId, frameNumber, base, override) {
  // Implementación simple: stringify ordenado. Para 99% de los casos basta.
  // En el hot path (slider drag) se llama 60 veces/seg pero JSON.stringify
  // de un objeto pequeño es <0.1ms.
  const o = override || {};
  return JSON.stringify({
    layerId,
    frameNumber,
    base,
    o,
  });
}
