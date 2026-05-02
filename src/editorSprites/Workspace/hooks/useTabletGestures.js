"use no memo";
// Detector de gestos multi-touch para el modo tableta.
//
// Por que fuera de React (con `use no memo`): el handler de pointermove se
// dispara hasta 200x/seg en una pantalla tactil con 10 dedos. Si el React
// Compiler inyecta _c() en el callback, esos calls revientan en contextos
// async (mismo issue que vimos en logger.js / blendModes.js / gif.js).
//
// Que detecta:
//   - Pinch (2 dedos juntandose/alejandose) → emit onZoom({ delta, centerX, centerY })
//   - Pan con 2 dedos → emit onPan({ dx, dy, centerX, centerY })
//
// Que NO hace:
//   - No interfiere con drawing de un solo puntero. El detector solo activa
//     gestos cuando hay >=2 punteros tactiles simultaneos. Un solo dedo o
//     stylus pasa libre al pipeline normal.
//   - No procesa eventos pointerType:'mouse' ni 'pen' — solo 'touch'. Eso
//     evita que un trackpad o un pen interfieran con la deteccion.
//
// Integracion:
//   useTabletGestures(workspaceRef, {
//     enabled: tabletMode,
//     blockTouch: stylusMode && penActiveRef.current,  // anti-palma
//     onZoom: ({ delta, centerX, centerY }) => setZoom(z => z * delta),
//     onPan:  ({ dx, dy }) => setViewportOffset(o => ({ x: o.x + dx, y: o.y + dy })),
//   });

import { useEffect, useRef } from "react";

export function useTabletGestures(targetRef, {
  enabled = false,
  // blockTouch puede ser bool O funcion getter `() => bool`. La funcion es
  // util cuando el valor depende de un ref (ej. penActiveRef.current) que
  // cambia sin re-render — el handler la invoca al momento del evento y
  // siempre lee el valor mas fresco.
  blockTouch = false,
  onZoom,
  onPan,
  zoomSensitivity = 1.0,
  panSensitivity = 1.0,
} = {}) {
  // Refs estables: handlers y opts se actualizan SIN re-suscribir listeners.
  // El listener setup useEffect depende solo de `enabled` (y targetRef);
  // el resto de cambios fluye via estas refs en cada render.
  const handlersRef = useRef({ onZoom, onPan });
  const optsRef = useRef({ blockTouch, zoomSensitivity, panSensitivity });

  useEffect(() => {
    handlersRef.current = { onZoom, onPan };
  });

  useEffect(() => {
    optsRef.current = { blockTouch, zoomSensitivity, panSensitivity };
  });

  // Helper: resolver blockTouch sea valor o funcion.
  const isTouchBlocked = () => {
    const bt = optsRef.current.blockTouch;
    return typeof bt === "function" ? !!bt() : !!bt;
  };

  useEffect(() => {
    const target = targetRef?.current;
    if (!target || !enabled) return;

    // pointerId → { x, y } posicion mas reciente.
    // Solo poblamos con punteros tactiles (pointerType === 'touch').
    const active = new Map();
    // Estado del gesto en curso para computar deltas frame-a-frame.
    let prevDist = null;     // distancia entre los 2 primeros punteros activos
    let prevCenter = null;   // centro entre los 2 primeros punteros

    const getTwoPointers = () => {
      // Devuelve los 2 primeros punteros activos como [{id,x,y}, {id,x,y}],
      // o null si no hay 2.
      if (active.size < 2) return null;
      const it = active.entries();
      const [, a] = it.next().value;
      const [, b] = it.next().value;
      return [a, b];
    };

    const computeFrame = () => {
      const pair = getTwoPointers();
      if (!pair) {
        prevDist = null;
        prevCenter = null;
        return;
      }
      const [a, b] = pair;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;

      if (prevDist != null && prevCenter != null) {
        const o = optsRef.current;
        // Pinch: ratio de distancias = factor multiplicativo de zoom.
        // Sensitivity 1.0 = pinch nativo del SO; <1 atenua, >1 amplifica.
        if (handlersRef.current.onZoom && dist > 0 && prevDist > 0) {
          let delta = dist / prevDist;
          if (o.zoomSensitivity !== 1.0) {
            // Aplicar sensitivity como exponente: ratio^sens preserva 1.0
            // como neutro y suaviza/agresiva el factor.
            delta = Math.pow(delta, o.zoomSensitivity);
          }
          handlersRef.current.onZoom({
            delta,
            centerX: cx,
            centerY: cy,
          });
        }
        // Pan: movimiento del centro entre frames.
        if (handlersRef.current.onPan) {
          handlersRef.current.onPan({
            dx: (cx - prevCenter.x) * o.panSensitivity,
            dy: (cy - prevCenter.y) * o.panSensitivity,
            centerX: cx,
            centerY: cy,
          });
        }
      }

      prevDist = dist;
      prevCenter = { x: cx, y: cy };
    };

    const onPointerDown = (e) => {
      if (e.pointerType !== "touch") return;
      if (isTouchBlocked()) return;
      active.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
      // Reset de baseline al empezar un gesto nuevo (transicion 1 → 2 dedos).
      if (active.size === 2) {
        prevDist = null;
        prevCenter = null;
      }
    };

    const onPointerMove = (e) => {
      if (!active.has(e.pointerId)) return;
      // Si en medio del gesto se activa el bloqueo (ej. el pen aterrizo),
      // limpiamos el estado del gesto: la palma no debe mover el viewport
      // mientras el stylus dibuja.
      if (isTouchBlocked()) {
        active.clear();
        prevDist = null;
        prevCenter = null;
        return;
      }
      active.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
      if (active.size >= 2) computeFrame();
    };

    const onPointerEnd = (e) => {
      if (!active.has(e.pointerId)) return;
      active.delete(e.pointerId);
      // Al perder uno de los 2, el gesto termina; al volver a tener 2 se
      // re-establece baseline en el proximo move.
      prevDist = null;
      prevCenter = null;
    };

    target.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    return () => {
      target.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      active.clear();
    };
    // Solo re-suscribir cuando cambia targetRef o el flag enabled.
    // blockTouch fluye via optsRef y se lee fresco en cada evento.
  }, [targetRef, enabled]);
}
