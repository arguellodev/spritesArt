// animationTags.js — utilidades puras para gestionar el array de tags de
// animación. Sin estado propio: cada función recibe el array actual y devuelve
// uno nuevo (inmutable), listo para pasar a `setAnimationTags`.
//
// Estructura de un tag:
//   { id: string, name: string, from: number, to: number, color?: string,
//     direction?: 'forward' | 'reverse' | 'pingpong' | 'pingpong-reverse' }

let _nextId = 1;

/**
 * Crea un objeto tag nuevo con un id único.
 * @param {{ name: string, from: number, to: number, color?: string, direction?: string }} opts
 */
// Paleta default coherente con el path de import Aseprite (workspaceContainer
// genera tags con #4a90e2 al cargar .ase). Hacer null aqui haria invisible la
// banda en TagBand cuando se crea desde el menu contextual.
const DEFAULT_TAG_COLOR = '#4a90e2';

export function createTag({ name, from, to, color, direction = 'forward' }) {
  return {
    id: `tag-${Date.now()}-${_nextId++}`,
    name: String(name).trim(),
    from: Math.min(from, to),
    to:   Math.max(from, to),
    color: color ?? DEFAULT_TAG_COLOR,
    direction,
  };
}

/**
 * Añade un tag al array. No mutaría el original: devuelve un array nuevo.
 * @param {Array} tags  Array actual de tags.
 * @param {Object} tag  Tag a añadir (resultado de `createTag`).
 * @returns {Array}
 */
export function addTag(tags, tag) {
  return [...tags, tag];
}

/**
 * Elimina un tag por id. Devuelve un array nuevo.
 * @param {Array}  tags Array actual de tags.
 * @param {string} id   Id del tag a eliminar.
 * @returns {Array}
 */
export function removeTag(tags, id) {
  return tags.filter(t => t.id !== id);
}

/**
 * Actualiza un tag existente (fusión parcial). Devuelve un array nuevo.
 * @param {Array}  tags    Array actual de tags.
 * @param {string} id      Id del tag a actualizar.
 * @param {Object} partial Campos a sobreescribir.
 * @returns {Array}
 */
export function updateTag(tags, id, partial) {
  return tags.map(t => (t.id === id ? { ...t, ...partial } : t));
}
