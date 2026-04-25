// animationTags.js — tags nombrados sobre rangos de frames.
// Compatible con Aseprite: cada tag tiene nombre, rango, dirección y color.

// React Compiler corre con compilationMode:'all' (vite.config.js); la directiva
// le dice que NO compile este modulo. Sin ella, una mutacion top-level
// (let _idCounter++) hacia que el compiler envolviera `createTag` con
// semantica de hook y reventaba con "Invalid hook call" al invocarlo desde
// un onClick de menu contextual (i.e. fuera del render).
"use no memo";

// ID generator puro: sin estado mutable de modulo. Suficiente entropia para
// no colisionar dentro de un mismo proceso (Date.now ms + 6 chars random).
const newId = () => `tag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * @typedef {object} AnimationTag
 * @property {string} id
 * @property {string} name
 * @property {number} from                  Frame inicial (inclusivo).
 * @property {number} to                    Frame final (inclusivo).
 * @property {'forward'|'reverse'|'pingpong'|'pingpong-reverse'} direction
 * @property {number} [repeat=0]            0 = infinito.
 * @property {string} color                 Hex para visualización en timeline.
 */

export function createTag({ name, from, to, direction = 'forward', repeat = 0, color = '#4a90e2' }) {
  return {
    id: newId(),
    name: name || `tag_${from}_${to}`,
    from,
    to,
    direction,
    repeat,
    color,
  };
}

export function addTag(tags, tag) {
  return [...tags, tag];
}

export function updateTag(tags, tagId, patch) {
  return tags.map((t) => (t.id === tagId ? { ...t, ...patch } : t));
}

export function removeTag(tags, tagId) {
  return tags.filter((t) => t.id !== tagId);
}

/**
 * Filtra tags que cubren un frame dado (útil para UI: "mostrar tags activos aquí").
 */
export function tagsAtFrame(tags, frameN) {
  return tags.filter((t) => frameN >= t.from && frameN <= t.to);
}

/**
 * Calcula la secuencia de frames a reproducir para un tag según dirección/repeat.
 * Útil para el reproductor de animación: recibe un tag y devuelve array de frames
 * en el orden de reproducción.
 *
 * Si `repeat` es 0 (infinito), devuelve un solo ciclo — el reproductor
 * deberá repetir externamente.
 */
export function buildPlaybackSequence(tag) {
  const { from, to, direction } = tag;
  const cycle = [];
  if (direction === 'forward') {
    for (let f = from; f <= to; f++) cycle.push(f);
  } else if (direction === 'reverse') {
    for (let f = to; f >= from; f--) cycle.push(f);
  } else if (direction === 'pingpong') {
    for (let f = from; f <= to; f++) cycle.push(f);
    for (let f = to - 1; f > from; f--) cycle.push(f);
  } else if (direction === 'pingpong-reverse') {
    for (let f = to; f >= from; f--) cycle.push(f);
    for (let f = from + 1; f < to; f++) cycle.push(f);
  }
  return cycle;
}

/**
 * Exporta tags en formato Aseprite sheet JSON (`meta.frameTags`).
 */
export function exportAsepriteCompatible(tags) {
  return tags.map((t) => ({
    name: t.name,
    from: t.from,
    to: t.to,
    direction: t.direction,
    ...(t.color ? { color: t.color } : {}),
  }));
}
