// Logger singleton para el DevConsolePanel embebido en la UI.
//
// Por qué fuera de React:
//   `console.log` puede dispararse cientos de veces por segundo (eventos de
//   puntero, loops de render). Si cada push gatillara un re-render de React,
//   la app se cae. Mantenemos el estado en un módulo plano + notificación
//   batched a `requestAnimationFrame` para que la UI re-renderice como mucho
//   una vez por frame, independiente del volumen de logs.
//
// Side-effects al importar:
//   1. Restaura logs previos desde localStorage.
//   2. Monkeypatchea `console.log/info/warn/error/debug` (sigue llamando al
//      original — no rompe DevTools nativas).
//   3. Engancha `error` y `unhandledrejection` globales para capturar cosas
//      que de otro modo solo verías en DevTools.
//
// API pública:
//   import { logger, subscribe, getSnapshot, clearLogs } from './logger';
//   logger.info('Algo paso', { detail: 42 });
//   logger.task('export-gif', 'Exportando GIF... 45%');

const RING_LIMIT = 1000;
const PERSIST_LIMIT = 200;
const PERSIST_DEBOUNCE_MS = 1000;
const STORAGE_KEY = "pixcalli.devConsole.logs";

// ---- Estado ----
const ring = []; // entradas, push al final, shift al inicio cuando supera RING_LIMIT
let nextId = 1;
let snapshot = { logs: [], version: 0 };
let snapshotDirty = true;

const subs = new Set();

// Anti-recursion: si un suscriptor (o console.log dentro del propio logger)
// intenta re-entrar, lo dejamos seguir pero no procesamos via el patch.
let inDispatch = false;

// ---- Formateo de args ----
// Convierte cada arg a string sin perder demasiada información. Objetos via
// JSON.stringify con depth limit y guardia anti-circular.
function safeStringify(value, depth = 0, seen = new WeakSet()) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const t = typeof value;
  if (t === "string") return value;
  if (t === "number" || t === "boolean" || t === "bigint" || t === "symbol") {
    return String(value);
  }
  if (t === "function") return `[Function ${value.name || "anonymous"}]`;
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? "\n" + value.stack : ""}`;
  }
  if (depth >= 3) return Array.isArray(value) ? "[…]" : "{…}";
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    const parts = value.slice(0, 50).map((v) => safeStringify(v, depth + 1, seen));
    if (value.length > 50) parts.push(`… +${value.length - 50}`);
    return `[${parts.join(", ")}]`;
  }
  // DOM nodes: nombre tag breve
  if (typeof window !== "undefined" && value instanceof window.Node) {
    if (value.nodeType === 1) {
      const el = value;
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className && typeof el.className === "string"
        ? "." + el.className.split(/\s+/).filter(Boolean).join(".")
        : "";
      return `<${el.tagName.toLowerCase()}${id}${cls}>`;
    }
    return `[Node ${value.nodeName}]`;
  }
  // Objeto plano
  const keys = Object.keys(value).slice(0, 30);
  const parts = keys.map((k) => `${k}: ${safeStringify(value[k], depth + 1, seen)}`);
  if (Object.keys(value).length > 30) parts.push(`… +${Object.keys(value).length - 30}`);
  return `{${parts.join(", ")}}`;
}

function formatArgs(args) {
  return args.map((a) => safeStringify(a)).join(" ");
}

// ---- Push + notify ----
function pushEntry({ level, source, args, taskTag = null }) {
  const text = formatArgs(args);
  const entry = {
    id: nextId++,
    ts: Date.now(),
    level,
    source,
    taskTag,
    text,
  };
  ring.push(entry);
  if (ring.length > RING_LIMIT) ring.shift();
  snapshotDirty = true;
  schedulePersist();
  scheduleNotify();
}

let notifyPending = false;
function scheduleNotify() {
  if (notifyPending) return;
  notifyPending = true;
  // rAF en navegador; setTimeout en SSR (no se da, pero por seguridad).
  const tick = () => {
    notifyPending = false;
    if (inDispatch) return; // siguiente frame lo intentará de nuevo via push
    inDispatch = true;
    try {
      subs.forEach((fn) => {
        try { fn(); } catch { /* sub roto no debe tumbar el resto */ }
      });
    } finally {
      inDispatch = false;
    }
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(tick);
  } else {
    setTimeout(tick, 16);
  }
}

// ---- Persistencia ----
let persistTimer = null;
function schedulePersist() {
  if (typeof localStorage === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, PERSIST_DEBOUNCE_MS);
}

function persistNow() {
  persistTimer = null;
  if (typeof localStorage === "undefined") return;
  try {
    const slice = ring.slice(-PERSIST_LIMIT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ logs: slice, savedAt: Date.now() }));
  } catch { /* localStorage lleno o privado: ignorar */ }
}

function loadFromStorage() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.logs)) return;
    for (const e of parsed.logs) {
      if (!e || typeof e !== "object") continue;
      ring.push({
        id: nextId++,
        ts: e.ts || Date.now(),
        level: e.level || "log",
        source: e.source || "console",
        taskTag: e.taskTag || null,
        text: typeof e.text === "string" ? e.text : "",
      });
    }
    snapshotDirty = true;
  } catch { /* JSON corrupto: ignorar */ }
}

// Guardar al cerrar/refresh para no perder entradas dentro del debounce window.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", persistNow);
}

// ---- Subscribe / snapshot ----
export function subscribe(fn) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

export function getSnapshot() {
  if (snapshotDirty) {
    snapshot = { logs: ring.slice(), version: snapshot.version + 1 };
    snapshotDirty = false;
  }
  return snapshot;
}

export function clearLogs() {
  ring.length = 0;
  snapshotDirty = true;
  schedulePersist();
  scheduleNotify();
}

// ---- API pública para mensajes "del app" ----
// Diferente source para que el filtro pueda ocultar el ruido de console.* y
// dejar solo lo que el código del editor empuja explícitamente.
export const logger = {
  log: (...args) => pushEntry({ level: "log", source: "app", args }),
  info: (...args) => pushEntry({ level: "info", source: "app", args }),
  warn: (...args) => pushEntry({ level: "warn", source: "app", args }),
  error: (...args) => pushEntry({ level: "error", source: "app", args }),
  debug: (...args) => pushEntry({ level: "debug", source: "app", args }),
  // Tareas largas: el taskTag agrupa mensajes (se puede pintar distinto).
  task: (taskTag, ...args) => pushEntry({ level: "info", source: "app", args, taskTag }),
};

// ---- Monkeypatch de console ----
// Hacemos esto solo una vez, idempotente por si el módulo se re-importa
// (HMR, etc).
const PATCH_FLAG = "__pixcalliDevConsolePatched";

function patchConsole() {
  if (typeof console === "undefined") return;
  if (console[PATCH_FLAG]) return;
  const levels = ["log", "info", "warn", "error", "debug"];
  for (const level of levels) {
    const orig = console[level] ? console[level].bind(console) : null;
    console[level] = (...args) => {
      if (orig) orig(...args);
      // Si estamos dentro de dispatch (un sub haciendo console.log), no
      // re-entrar al ring — cae al original y listo.
      if (inDispatch) return;
      pushEntry({ level, source: "console", args });
    };
  }
  console[PATCH_FLAG] = true;
}

function patchWindowErrors() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => {
    pushEntry({
      level: "error",
      source: "window",
      args: [`${e.message || "Error"} (${e.filename || "?"}:${e.lineno || "?"}:${e.colno || "?"})`, e.error],
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    pushEntry({
      level: "error",
      source: "window",
      args: ["Unhandled Promise rejection:", e.reason],
    });
  });
}

// ---- Init ----
loadFromStorage();
patchConsole();
patchWindowErrors();
