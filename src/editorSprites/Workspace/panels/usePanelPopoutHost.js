"use no memo";

import { useEffect, useRef } from "react";
import { usePanel } from "./panelContext";
import {
  iniciarBridge,
  publicar,
  registrarCallback,
  suscribir,
} from "./panelBridge";

// Sanitiza un objeto para que pase el structuredClone que hace Electron IPC.
// Elimina funciones, DOM nodes, refs, Symbols y cualquier referencia circular.
// Preserva primitivos, arrays, objetos planos, typed arrays y ArrayBuffers.
function sanitizarParaIPC(valor, profundidadMax = 8) {
  const seen = new WeakSet();
  function limpiar(v, depth) {
    if (v == null) return v;
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean" || t === "bigint") return v;
    if (t === "function" || t === "symbol") return undefined;
    if (depth > profundidadMax) return undefined;
    // Typed arrays / ArrayBuffer → structuredClone los soporta
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return v;
    if (v instanceof Date) return v.getTime();
    if (v && typeof v === "object") {
      if (seen.has(v)) return undefined;
      seen.add(v);
      // Nodos DOM / React / Pixi / WebGL → tirar
      if (typeof Node !== "undefined" && v instanceof Node) return undefined;
      if (v.$$typeof || v._reactInternals || v._owner) return undefined;
      if (Array.isArray(v)) {
        return v.map((x) => limpiar(x, depth + 1));
      }
      const out = {};
      for (const k of Object.keys(v)) {
        const cleaned = limpiar(v[k], depth + 1);
        if (cleaned !== undefined) out[k] = cleaned;
      }
      return out;
    }
    return undefined;
  }
  return limpiar(valor, 0);
}

// Hook que corre en la ventana host. Para cada panel, cuando pasa a modo
// "popped":
//  - Registra los callbacks pasados en `callbacks` y obtiene sus fnIds
//  - Publica state/snapshot con props + fnIds
//  - Re-publica state/snapshot cada vez que cambian `props`
//  - Responde state/pedir re-publicando el snapshot actual
//  - Si se provee `bitmapProvider`, lanza un loop que publica canvas/frame
//    a `fps` fps (default 30)
//  - Cuando la ventana popped se cierra (evento panel/cerrado desde main.js),
//    vuelve el modo a 'flotante' para que reaparezca en el host.
//
// Cuando el panel no está popped, el hook no hace nada — costo cero.
export function usePanelPopoutHost({
  panelId,
  props,
  callbacks,
  bitmapProvider,
  fps = 30,
}) {
  const { estado, setModo } = usePanel(panelId);
  const modo = estado ? estado.modo : null;

  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const fnIdsRef = useRef(null);
  const snapshotRef = useRef(null);

  // Registrar/desregistrar callbacks al entrar/salir de popped
  useEffect(() => {
    if (modo !== "popped") return undefined;
    iniciarBridge();

    const registros = {};
    const fnIds = {};
    if (callbacks) {
      for (const nombre of Object.keys(callbacks)) {
        const fn = callbacks[nombre];
        if (typeof fn !== "function") continue;
        const r = registrarCallback((...args) => fn(...args));
        registros[nombre] = r;
        fnIds[nombre] = r.fnId;
      }
    }
    fnIdsRef.current = fnIds;

    const publicarSnapshot = () => {
      const propsLimpias = sanitizarParaIPC(propsRef.current || {});
      const payload = { ...(propsLimpias || {}), panelId, fnIds };
      snapshotRef.current = payload;
      try {
        publicar({ tipo: "state/snapshot", panelId, payload });
      } catch (err) {
        console.error(`[popout:${panelId}] error publicando snapshot:`, err);
      }
    };

    publicarSnapshot();
    const interval = setInterval(publicarSnapshot, 2000); // keep-alive

    const desuscribir = suscribir((msg) => {
      if (!msg) return;
      if (msg.tipo === "state/pedir" && msg.panelId === panelId) {
        publicarSnapshot();
      }
      if (msg.tipo === "panel/cerrado" && msg.panelId === panelId) {
        setModo("flotante");
      }
      if (msg.tipo === "panel/standalone-cerrado" && msg.panelId === panelId) {
        setModo("flotante");
      }
    });

    return () => {
      clearInterval(interval);
      desuscribir();
      for (const r of Object.values(registros)) {
        r.desregistrar();
      }
      fnIdsRef.current = null;
    };
  // callbacks/bitmapProvider se capturan en el closure por diseño — evitamos
  // reregistrar cada render (lo cual invalidaría los fnIds). Las últimas
  // props están siempre disponibles via propsRef.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, panelId]);

  // Re-publicar snapshot cuando cambian props (sin reregistrar callbacks)
  useEffect(() => {
    if (modo !== "popped") return;
    const fnIds = fnIdsRef.current;
    if (!fnIds) return;
    const propsLimpias = sanitizarParaIPC(props || {});
    const payload = { ...(propsLimpias || {}), panelId, fnIds };
    snapshotRef.current = payload;
    try {
      publicar({ tipo: "state/snapshot", panelId, payload });
    } catch (err) {
      console.error(`[popout:${panelId}] error publicando snapshot en update:`, err);
    }
  }, [modo, panelId, props]);

  // Loop de bitmaps (opcional)
  useEffect(() => {
    if (modo !== "popped" || typeof bitmapProvider !== "function") return undefined;
    let cancelado = false;
    const intervaloMs = Math.max(16, Math.round(1000 / Math.max(1, fps)));

    const tick = async () => {
      if (cancelado) return;
      try {
        const bmp = await bitmapProvider();
        if (!cancelado && bmp) {
          publicar({ tipo: "canvas/frame", panelId, bitmap: bmp });
        }
      } catch {
        // ignorar — el provider podría fallar si el canvas aún no está listo
      }
    };

    const timer = setInterval(tick, intervaloMs);
    tick();

    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [modo, panelId, bitmapProvider, fps]);
}
