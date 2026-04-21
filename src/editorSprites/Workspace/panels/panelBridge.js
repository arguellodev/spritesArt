"use no memo";

// panelBridge — capa unificada para comunicación cross-window entre la ventana
// host (el editor) y las ventanas popped (paneles arrastrados fuera).
//
// Transportes:
//   - Electron: window.pixcalliBridge (expuesto por preload.cjs via contextBridge)
//   - Web/fallback: BroadcastChannel('pixcalli-paneles')
//
// Tipos de mensaje:
//   { tipo: 'state/patch',  panelId, patch }
//   { tipo: 'action/call',  fnId, args, callId }
//   { tipo: 'action/reply', callId, result, error? }
//   { tipo: 'canvas/frame', panelId, bitmap }  // bitmap transferido
//   { tipo: 'panel/cerrado', panelId }

const CANAL = "pixcalli-paneles";

let transporte = null;
let canalWeb = null;
const listeners = new Set();
const callbacksHost = new Map(); // fnId -> fn (registrados por el host)
const replyWaiters = new Map(); // callId -> { resolve, reject, timeoutId }
let nextCallId = 1;

function inicializar() {
  if (transporte !== null) return transporte;
  if (typeof window !== "undefined" && window.pixcalliBridge && window.pixcalliBridge.esElectron) {
    transporte = "electron";
    window.pixcalliBridge.onEvento((msg) => distribuir(msg));
    console.log("[panelBridge] transporte = electron (IPC via preload)");
    return transporte;
  }
  if (typeof BroadcastChannel !== "undefined") {
    transporte = "broadcast";
    canalWeb = new BroadcastChannel(CANAL);
    canalWeb.addEventListener("message", (ev) => distribuir(ev.data));
    console.log("[panelBridge] transporte = broadcast (BroadcastChannel)");
    return transporte;
  }
  transporte = "none";
  console.warn("[panelBridge] transporte = none — no hay preload ni BroadcastChannel");
  return transporte;
}

function distribuir(msg) {
  if (!msg || typeof msg !== "object") return;
  // Manejo interno de action/reply
  if (msg.tipo === "action/reply" && typeof msg.callId === "number") {
    const waiter = replyWaiters.get(msg.callId);
    if (waiter) {
      replyWaiters.delete(msg.callId);
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
      if (msg.error) waiter.reject(new Error(msg.error));
      else waiter.resolve(msg.result);
    }
    return;
  }
  // Manejo interno de action/call en el host (si la fn está registrada aquí)
  if (msg.tipo === "action/call" && callbacksHost.has(msg.fnId)) {
    const fn = callbacksHost.get(msg.fnId);
    Promise.resolve()
      .then(() => fn(...(msg.args || [])))
      .then(
        (result) => enviarSinIda({ tipo: "action/reply", callId: msg.callId, result }),
        (err) => enviarSinIda({ tipo: "action/reply", callId: msg.callId, error: String(err && err.message || err) })
      );
    return;
  }
  // Notificar a listeners externos
  for (const cb of listeners) {
    try {
      cb(msg);
    } catch (err) {
      console.error("panel bridge listener error:", err);
    }
  }
}

function enviarSinIda(msg) {
  const t = inicializar();
  if (t === "electron") {
    try {
      window.pixcalliBridge.sendEvento(msg);
    } catch (err) {
      console.error("[panelBridge] sendEvento falló (IPC structured clone):", err, {
        tipo: msg && msg.tipo,
        panelId: msg && msg.panelId,
      });
    }
    return;
  }
  if (t === "broadcast" && canalWeb) {
    try {
      canalWeb.postMessage(msg);
    } catch (err) {
      console.error("[panelBridge] BroadcastChannel postMessage falló:", err, {
        tipo: msg && msg.tipo,
        panelId: msg && msg.panelId,
      });
    }
    return;
  }
  if (t === "none") {
    console.warn("[panelBridge] sin transporte — msg descartado:", msg && msg.tipo);
  }
}

export function iniciarBridge() {
  return inicializar();
}

export function transporteActual() {
  return transporte;
}

export function esPoppedWindow() {
  if (typeof window === "undefined") return false;
  try {
    const p = new URLSearchParams(window.location.search);
    return !!p.get("panel");
  } catch {
    return false;
  }
}

export function panelIdDeUrl() {
  if (typeof window === "undefined") return null;
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("panel");
  } catch {
    return null;
  }
}

export function suscribir(cb) {
  inicializar();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function publicar(msg) {
  enviarSinIda(msg);
}

export function publicarPatch(panelId, patch) {
  enviarSinIda({ tipo: "state/patch", panelId, patch });
}

export function publicarFrame(panelId, bitmap) {
  // Transferible solo útil en BroadcastChannel con MessageChannel real; para
  // simpleza lo mandamos por la misma vía que el resto.
  enviarSinIda({ tipo: "canvas/frame", panelId, bitmap });
}

// Registra una función callable desde ventanas popped. Devuelve fnId y una
// función para desregistrar.
export function registrarCallback(fn) {
  const fnId = `fn_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  callbacksHost.set(fnId, fn);
  return {
    fnId,
    desregistrar() {
      callbacksHost.delete(fnId);
    },
  };
}

// Llama una función registrada en el host desde una ventana popped.
// Retorna Promise con el resultado (si aplica).
export function llamarCallback(fnId, args = [], timeoutMs = 5000) {
  inicializar();
  const callId = nextCallId++;
  return new Promise((resolve, reject) => {
    const timeoutId = timeoutMs
      ? setTimeout(() => {
          replyWaiters.delete(callId);
          reject(new Error(`panelBridge: timeout esperando respuesta de ${fnId}`));
        }, timeoutMs)
      : null;
    replyWaiters.set(callId, { resolve, reject, timeoutId });
    enviarSinIda({ tipo: "action/call", fnId, args, callId });
  });
}

// Abre una ventana popped. En Electron usa IPC; en web, window.open().
export async function abrirVentanaPanel(panelId, opciones) {
  inicializar();
  if (typeof window === "undefined") return null;
  if (window.pixcalliBridge && window.pixcalliBridge.esElectron) {
    return window.pixcalliBridge.abrirPanel(panelId, opciones || {});
  }
  const ancho = (opciones && opciones.width) || 340;
  const alto = (opciones && opciones.height) || 520;
  const x = (opciones && opciones.x) || 120;
  const y = (opciones && opciones.y) || 120;
  const features = `popup,width=${ancho},height=${alto},left=${x},top=${y}`;
  const url = `${window.location.pathname}?panel=${encodeURIComponent(panelId)}`;
  const w = window.open(url, `pixcalli_${panelId}`, features);
  return w ? true : false;
}

// Cierra la ventana popped de un panelId (Electron). En web, el usuario la
// cierra desde la ventana misma.
export async function cerrarVentanaPanel(panelId) {
  inicializar();
  if (typeof window === "undefined") return false;
  if (window.pixcalliBridge && window.pixcalliBridge.esElectron) {
    return window.pixcalliBridge.cerrarPanel(panelId);
  }
  return false;
}
