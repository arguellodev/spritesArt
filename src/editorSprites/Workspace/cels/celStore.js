// celStore.js — almacén de "cels" con indirección para soportar linked cels
// (múltiples frames apuntando al mismo canvas).
//
// Modelo:
//   cels:   Map<celId, { canvas, refCount, hash? }>
//   linkMap: Map<`${layerId}:${frameN}`, celId>
//
// Ejemplo: un fondo estático enlazado a 60 frames se guarda UNA vez; los 60
// (layerId, frameN) apuntan al mismo celId. Al editar una celda linked, el
// caller decide: "actualizar todas las instancias" (mutar el canvas compartido)
// o "separar esta instancia" (clonar → nuevo celId y re-apuntar el mapping).
//
// API pensada para envolver desde useLayerManager sin romper el formato actual.
// Quienes ya trabajan con `frames[frameN].canvases[layerId]` pueden obtener el
// canvas vía `getCanvas(store, layerId, frameN)` como si fuera directo.

let _idCounter = 0;
const newCelId = () => `cel_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

/**
 * @typedef {object} CelStore
 * @property {Map<string, {canvas:HTMLCanvasElement, refCount:number}>} cels
 * @property {Map<string, string>}  linkMap   key: `${layerId}:${frameN}` → celId
 */

export function createCelStore() {
  return { cels: new Map(), linkMap: new Map() };
}

const keyOf = (layerId, frameN) => `${layerId}:${frameN}`;

/**
 * Obtiene el canvas de una celda (layer, frame). Null si no hay.
 */
export function getCanvas(store, layerId, frameN) {
  const celId = store.linkMap.get(keyOf(layerId, frameN));
  if (!celId) return null;
  const entry = store.cels.get(celId);
  return entry ? entry.canvas : null;
}

/**
 * Obtiene el celId actual de una celda (layer, frame). Null si no hay.
 * Útil para saber si dos celdas están linkeadas (mismo celId).
 */
export function getCelId(store, layerId, frameN) {
  return store.linkMap.get(keyOf(layerId, frameN)) ?? null;
}

/**
 * Asigna un canvas nuevo a (layer, frame). Crea un cel nuevo (no compartido).
 * Si ya había un cel en ese slot, decrementa su refCount y lo borra si llega a 0.
 * Retorna el celId creado.
 */
export function setCanvas(store, layerId, frameN, canvas) {
  releaseSlot(store, layerId, frameN);
  const id = newCelId();
  store.cels.set(id, { canvas, refCount: 1 });
  store.linkMap.set(keyOf(layerId, frameN), id);
  return id;
}

/**
 * Crea un link: la celda target (layerId, frameN) apunta al mismo canvas que
 * el cel `sourceCelId`. Refcuenta.
 */
export function linkCel(store, sourceCelId, layerId, frameN) {
  const src = store.cels.get(sourceCelId);
  if (!src) throw new Error(`cel ${sourceCelId} no existe`);
  releaseSlot(store, layerId, frameN);
  store.linkMap.set(keyOf(layerId, frameN), sourceCelId);
  src.refCount++;
}

/**
 * ¿Cuántas celdas apuntan al mismo canvas que la celda (layer, frame)?
 * 0 = slot vacío · 1 = instancia única · >1 = linked.
 */
export function linkedInstancesOf(store, layerId, frameN) {
  const celId = store.linkMap.get(keyOf(layerId, frameN));
  if (!celId) return 0;
  return store.cels.get(celId)?.refCount ?? 0;
}

/**
 * Separar una instancia linked: clona el canvas y crea un cel nuevo para
 * (layerId, frameN). El resto de celdas que apuntaban al cel original siguen
 * linkeadas entre sí. Retorna el nuevo celId.
 */
export function forkCel(store, layerId, frameN) {
  const key = keyOf(layerId, frameN);
  const oldCelId = store.linkMap.get(key);
  if (!oldCelId) return null;
  const oldEntry = store.cels.get(oldCelId);
  if (!oldEntry) return null;

  // Clonar canvas
  const src = oldEntry.canvas;
  const clone = document.createElement('canvas');
  clone.width = src.width;
  clone.height = src.height;
  clone.getContext('2d').drawImage(src, 0, 0);

  const newId = newCelId();
  store.cels.set(newId, { canvas: clone, refCount: 1 });

  // Decrementar refCount del original y re-apuntar
  oldEntry.refCount--;
  if (oldEntry.refCount <= 0) store.cels.delete(oldCelId);
  store.linkMap.set(key, newId);
  return newId;
}

/**
 * Libera un slot (layer, frame): decrementa refCount del cel referenciado y
 * elimina el cel si nadie más lo usa. Elimina la entrada del linkMap.
 */
export function releaseSlot(store, layerId, frameN) {
  const key = keyOf(layerId, frameN);
  const celId = store.linkMap.get(key);
  if (!celId) return;
  const entry = store.cels.get(celId);
  if (entry) {
    entry.refCount--;
    if (entry.refCount <= 0) store.cels.delete(celId);
  }
  store.linkMap.delete(key);
}

/**
 * Copia todos los enlaces de un frame a otro (útil al duplicar frame).
 * Los cels compartidos se mantienen compartidos — solo aumenta refCount.
 */
export function duplicateFrameLinks(store, fromFrameN, toFrameN) {
  const prefix = ':';
  for (const [key, celId] of store.linkMap) {
    const [layerId, fnStr] = key.split(prefix);
    if (Number(fnStr) !== fromFrameN) continue;
    releaseSlot(store, layerId, toFrameN);
    store.linkMap.set(keyOf(layerId, toFrameN), celId);
    const entry = store.cels.get(celId);
    if (entry) entry.refCount++;
  }
}

/**
 * Migra el formato actual de PixCalli (frames[frameN].canvases[layerId]) al
 * celStore. Cada canvas existente se vuelve un cel único (sin links). Esto es
 * el comportamiento pre-linked-cels — idéntico semánticamente al formato v2.
 *
 * Los usuarios pueden entonces llamar `linkCel` para compartir fondos, etc.
 *
 * @param {Record<number, {canvases: Record<string, HTMLCanvasElement>}>} frames
 * @returns {CelStore}
 */
export function importFromFramesFormat(frames) {
  const store = createCelStore();
  for (const [frameNStr, frameData] of Object.entries(frames)) {
    const frameN = Number(frameNStr);
    if (!frameData?.canvases) continue;
    for (const [layerId, canvas] of Object.entries(frameData.canvases)) {
      if (canvas) setCanvas(store, layerId, frameN, canvas);
    }
  }
  return store;
}

/**
 * Exporta de vuelta al formato actual. Los cels compartidos se materializan:
 * el canvas es el mismo objeto, así que `===` entre frames diferentes detectará
 * el sharing (útil si algún caller quiere optimizar).
 *
 * @param {CelStore} store
 * @param {number[]} frameNumbers  Lista de frames a exportar.
 * @returns {Record<number, {canvases: Record<string, HTMLCanvasElement>}>}
 */
export function exportToFramesFormat(store, frameNumbers) {
  const out = {};
  for (const frameN of frameNumbers) out[frameN] = { canvases: {} };
  for (const [key, celId] of store.linkMap) {
    const [layerId, fnStr] = key.split(':');
    const frameN = Number(fnStr);
    if (!out[frameN]) continue;
    const entry = store.cels.get(celId);
    if (entry) out[frameN].canvases[layerId] = entry.canvas;
  }
  return out;
}

/**
 * Estadísticas del store (diagnóstico).
 */
export function stats(store) {
  let shared = 0;
  for (const entry of store.cels.values()) {
    if (entry.refCount > 1) shared++;
  }
  return {
    cels: store.cels.size,
    links: store.linkMap.size,
    sharedCels: shared,
  };
}
