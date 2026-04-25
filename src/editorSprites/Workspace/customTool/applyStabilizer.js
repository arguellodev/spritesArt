// applyStabilizer.js — aplica el valor de estabilizador (0..100) al path del trazo.
// Separado del componente UI para que el fast-refresh de Vite no interfiera.
//
// Se importa `smoothStroke` lazy para evitar dependencia circular si el motor
// de suavizado no existe en el entorno (o fue renombrado).

/**
 * @param {Array<{x:number,y:number}>} pointsPath
 * @param {number} value    0..100
 * @returns {Promise<Array<{x:number,y:number}>>}
 */
export async function applyStabilizerToPath(pointsPath, value) {
  if (!value || value <= 0) return pointsPath;
  try {
    const mod = await import('../rasterizers/strokeSmoothing');
    const smoothStroke = mod.smoothStroke;
    if (typeof smoothStroke !== 'function') return pointsPath;
    return smoothStroke(pointsPath, value / 100);
  } catch {
    return pointsPath;
  }
}
