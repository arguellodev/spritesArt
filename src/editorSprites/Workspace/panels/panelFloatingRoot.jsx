"use no memo";

// Singleton container en <body> donde PanelFrame hace createPortal cuando el
// panel está en modo flotante. Usa pointer-events: none para no bloquear el
// canvas; cada panel activa pointer-events: auto en su propio frame.
// Se crea on-demand la primera vez que alguien pide el root — no hay estado
// de React involucrado para evitar re-renders innecesarios.
export const FLOATING_ROOT_ID = "pixcalli-paneles-flotantes";

export function obtenerFloatingRoot() {
  if (typeof document === "undefined") return null;
  let el = document.getElementById(FLOATING_ROOT_ID);
  if (el) return el;
  el = document.createElement("div");
  el.id = FLOATING_ROOT_ID;
  el.style.position = "fixed";
  el.style.inset = "0";
  el.style.pointerEvents = "none";
  el.style.zIndex = "10000";
  document.body.appendChild(el);
  return el;
}

// Componente marcador: su único rol es asegurar que el root exista cuando
// CanvasTracker monta. No renderiza nada visible.
export function PanelFloatingRoot() {
  obtenerFloatingRoot();
  return null;
}
