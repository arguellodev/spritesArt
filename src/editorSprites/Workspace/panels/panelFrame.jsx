"use no memo";

import { useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { LuMinus, LuPin, LuX, LuExternalLink } from "react-icons/lu";
import { usePanel } from "./panelContext";
import { obtenerFloatingRoot } from "./panelFloatingRoot";
import { abrirVentanaPanel, cerrarVentanaPanel } from "./panelBridge";
import "./panelFrame.css";

const MIN_W = 220;
const MIN_H = 180;
const MARGEN_SEGURIDAD = 8;

// PanelFrame envuelve cualquier panel y decide cómo renderizarse según su modo
// (docked / flotante / popped). En docked se integra al layout flex normal; en
// flotante se portaliza al contenedor fijo y soporta drag + resize imperativo
// (mutación directa de style.transform durante el drag, commit al Context solo
// en pointerup). En popped retorna null (se renderiza en otra ventana — Fase 2).
export function PanelFrame({
  panelId,
  titulo,
  children,
  permitePopOut = false, // reservado para Fase 2
}) {
  const { estado, setModo, setPosTam, traerAlFrente, toggleVisible } = usePanel(panelId);

  const hacerPopOut = useCallback(async () => {
    console.log(`[host:${panelId}] hacerPopOut solicitado`);
    try {
      const ok = await abrirVentanaPanel(panelId, { width: 340, height: 520 });
      console.log(`[host:${panelId}] abrirVentanaPanel → ${ok}`);
      if (ok) setModo("popped");
    } catch (err) {
      console.error(`[host:${panelId}] abrirVentanaPanel falló:`, err);
    }
  }, [panelId, setModo]);

  const volverAlHost = useCallback(async () => {
    await cerrarVentanaPanel(panelId);
    setModo("flotante");
  }, [panelId, setModo]);

  if (!estado || !estado.visible) return null;

  if (estado.modo === "popped") {
    // La ventana secundaria se encarga de renderizar — aquí mostramos un
    // placeholder mínimo (flotante) con botón para traer de vuelta al host.
    return (
      <PoppedPlaceholder
        titulo={titulo || estado.titulo}
        pos={estado.pos}
        zIndex={estado.zIndex}
        onVolver={volverAlHost}
      />
    );
  }

  if (estado.modo === "docked") {
    return (
      <DockedFrame
        titulo={titulo || estado.titulo}
        onDesanclar={() => setModo("flotante")}
        onMinimizar={() => toggleVisible()}
        permitePopOut={permitePopOut}
        onPopOut={hacerPopOut}
      >
        {children}
      </DockedFrame>
    );
  }

  // modo === "flotante"
  return (
    <FloatingFrame
      panelId={panelId}
      titulo={titulo || estado.titulo}
      pos={estado.pos}
      tam={estado.tam}
      zIndex={estado.zIndex}
      onCambioPosTam={setPosTam}
      onTraerAlFrente={traerAlFrente}
      onAnclar={() => setModo("docked")}
      onMinimizar={() => toggleVisible()}
      permitePopOut={permitePopOut}
      onPopOut={hacerPopOut}
    >
      {children}
    </FloatingFrame>
  );
}

function PoppedPlaceholder({ titulo, pos, zIndex, onVolver }) {
  const root = obtenerFloatingRoot();
  if (!root) return null;
  const style = {
    left: pos.x,
    top: pos.y,
    width: 220,
    height: 72,
    zIndex,
  };
  const el = (
    <div className="pc-panel pc-panel-flotante pc-panel-popped" style={style}>
      <div className="pc-panel-titlebar">
        <span className="pc-panel-title">{titulo}</span>
        <div className="pc-panel-actions">
          <button
            type="button"
            className="pc-panel-btn"
            title="Volver a la ventana principal"
            onClick={onVolver}
          >
            <LuPin size={12} />
          </button>
        </div>
      </div>
      <div className="pc-panel-body" style={{ padding: 8, fontSize: 11, opacity: 0.7 }}>
        Abierto en ventana independiente.
      </div>
    </div>
  );
  return createPortal(el, root);
}

function DockedFrame({ titulo, children, onDesanclar, onMinimizar, permitePopOut, onPopOut }) {
  return (
    <div className="pc-panel pc-panel-docked">
      <div className="pc-panel-titlebar">
        <span className="pc-panel-title">{titulo}</span>
        <div className="pc-panel-actions">
          {permitePopOut && (
            <button
              type="button"
              className="pc-panel-btn"
              title="Abrir en ventana separada"
              onClick={onPopOut}
            >
              <LuExternalLink size={12} />
            </button>
          )}
          <button
            type="button"
            className="pc-panel-btn"
            title="Desanclar panel"
            onClick={onDesanclar}
          >
            <LuPin size={12} />
          </button>
          <button
            type="button"
            className="pc-panel-btn"
            title="Ocultar panel"
            onClick={onMinimizar}
          >
            <LuMinus size={12} />
          </button>
        </div>
      </div>
      <div className="pc-panel-body">{children}</div>
    </div>
  );
}

function FloatingFrame({
  panelId,
  titulo,
  pos,
  tam,
  zIndex,
  onCambioPosTam,
  onTraerAlFrente,
  onAnclar,
  onMinimizar,
  permitePopOut,
  onPopOut,
  children,
}) {
  const frameRef = useRef(null);
  const dragStateRef = useRef(null);
  // obtenerFloatingRoot() es idempotente y crea el DOM la primera vez. Seguro
  // llamarlo en render.
  const root = obtenerFloatingRoot();

  const commitPosTam = useCallback(
    (nuevaPos, nuevoTam) => {
      onCambioPosTam(panelId, nuevaPos, nuevoTam);
    },
    [onCambioPosTam, panelId]
  );

  const iniciarDrag = useCallback(
    (e) => {
      if (e.button !== 0) return;
      const el = frameRef.current;
      if (!el) return;
      onTraerAlFrente();
      const rect = el.getBoundingClientRect();
      dragStateRef.current = {
        tipo: "drag",
        startX: e.clientX,
        startY: e.clientY,
        inicioPos: { x: rect.left, y: rect.top },
        tam: { w: rect.width, h: rect.height },
        pointerId: e.pointerId,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // no-op
      }
      e.preventDefault();
    },
    [onTraerAlFrente]
  );

  const iniciarResize = useCallback(
    (e, direccion) => {
      if (e.button !== 0) return;
      const el = frameRef.current;
      if (!el) return;
      onTraerAlFrente();
      const rect = el.getBoundingClientRect();
      dragStateRef.current = {
        tipo: "resize",
        direccion,
        startX: e.clientX,
        startY: e.clientY,
        inicioPos: { x: rect.left, y: rect.top },
        tam: { w: rect.width, h: rect.height },
        pointerId: e.pointerId,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // no-op
      }
      e.preventDefault();
      e.stopPropagation();
    },
    [onTraerAlFrente]
  );

  const onPointerMove = useCallback((e) => {
    const s = dragStateRef.current;
    const el = frameRef.current;
    if (!s || !el) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (s.tipo === "drag") {
      let nx = s.inicioPos.x + dx;
      let ny = s.inicioPos.y + dy;
      nx = Math.max(MARGEN_SEGURIDAD - s.tam.w * 0.5, Math.min(vw - MARGEN_SEGURIDAD - s.tam.w * 0.5, nx));
      ny = Math.max(0, Math.min(vh - MARGEN_SEGURIDAD, ny));
      el.style.left = `${nx}px`;
      el.style.top = `${ny}px`;
      return;
    }

    if (s.tipo === "resize") {
      let { x, y } = s.inicioPos;
      let w = s.tam.w;
      let h = s.tam.h;
      const d = s.direccion;
      if (d.includes("e")) w = Math.max(MIN_W, s.tam.w + dx);
      if (d.includes("s")) h = Math.max(MIN_H, s.tam.h + dy);
      if (d.includes("w")) {
        const nuevoW = Math.max(MIN_W, s.tam.w - dx);
        x = s.inicioPos.x + (s.tam.w - nuevoW);
        w = nuevoW;
      }
      if (d.includes("n")) {
        const nuevoH = Math.max(MIN_H, s.tam.h - dy);
        y = s.inicioPos.y + (s.tam.h - nuevoH);
        h = nuevoH;
      }
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      return;
    }
  }, []);

  const terminarDrag = useCallback(
    (e) => {
      const s = dragStateRef.current;
      const el = frameRef.current;
      if (!s || !el) return;
      dragStateRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(s.pointerId);
      } catch {
        // no-op
      }
      const rect = el.getBoundingClientRect();
      commitPosTam({ x: rect.left, y: rect.top }, { w: rect.width, h: rect.height });
    },
    [commitPosTam]
  );

  if (!root) return null;

  const style = {
    left: pos.x,
    top: pos.y,
    width: tam.w,
    height: tam.h,
    zIndex,
  };

  const frame = (
    <div
      ref={frameRef}
      className="pc-panel pc-panel-flotante"
      style={style}
      onPointerDownCapture={onTraerAlFrente}
    >
      <div
        className="pc-panel-titlebar pc-panel-drag"
        onPointerDown={iniciarDrag}
        onPointerMove={onPointerMove}
        onPointerUp={terminarDrag}
        onPointerCancel={terminarDrag}
      >
        <span className="pc-panel-title">{titulo}</span>
        <div className="pc-panel-actions">
          {permitePopOut && (
            <button
              type="button"
              className="pc-panel-btn"
              title="Abrir en ventana separada"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onPopOut}
            >
              <LuExternalLink size={12} />
            </button>
          )}
          <button
            type="button"
            className="pc-panel-btn"
            title="Anclar al dock"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onAnclar}
          >
            <LuPin size={12} />
          </button>
          <button
            type="button"
            className="pc-panel-btn"
            title="Ocultar panel"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMinimizar}
          >
            <LuMinus size={12} />
          </button>
          <button
            type="button"
            className="pc-panel-btn"
            title="Cerrar"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMinimizar}
          >
            <LuX size={12} />
          </button>
        </div>
      </div>
      <div className="pc-panel-body">{children}</div>
      {/* Grips de resize */}
      {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((dir) => (
        <div
          key={dir}
          className={`pc-panel-grip pc-panel-grip-${dir}`}
          onPointerDown={(e) => iniciarResize(e, dir)}
          onPointerMove={onPointerMove}
          onPointerUp={terminarDrag}
          onPointerCancel={terminarDrag}
        />
      ))}
    </div>
  );

  return createPortal(frame, root);
}
