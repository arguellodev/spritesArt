"use no memo";

const STORAGE_KEY = "pixcalli.paneles.v1";
const DEBOUNCE_MS = 500;

let timeoutId = null;
let pendiente = null;

function esNavegador() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function cargarLayout() {
  if (!esNavegador()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function guardarLayout(paneles) {
  if (!esNavegador()) return;
  try {
    const serializable = {};
    for (const id of Object.keys(paneles)) {
      const p = paneles[id];
      serializable[id] = {
        modo: p.modo,
        pos: p.pos,
        tam: p.tam,
        visible: p.visible,
      };
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // ignorar (quota, etc.)
  }
}

export function guardarLayoutDebounced(paneles) {
  pendiente = paneles;
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (pendiente) guardarLayout(pendiente);
    timeoutId = null;
    pendiente = null;
  }, DEBOUNCE_MS);
}
