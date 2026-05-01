// rulers.jsx — overlay de reglas superior e izquierda + guías arrastrables.
//
// Uso:
//   <Rulers
//     width={viewportWidth * zoom}
//     height={viewportHeight * zoom}
//     zoom={zoom}
//     panOffset={panOffset}
//     guides={guides}
//     onGuidesChange={setGuides}
//   />
//
// Las guías son líneas H/V en coordenadas de píxel lógico (no screen):
//   { id, axis: 'x' | 'y', position: number }

import React, { useRef, useEffect, useState, useCallback } from 'react';
import './rulers.css';

const RULER_SIZE = 18; // alto/ancho en pixels pantalla

let _guideIdCounter = 0;
const newGuideId = () => `guide_${Date.now().toString(36)}_${(_guideIdCounter++).toString(36)}`;

const Rulers = ({
  width,
  height,
  zoom,
  panOffset = { x: 0, y: 0 },
  guides = [],
  onGuidesChange,
  cursorPos = null,
}) => {
  const topRef = useRef(null);
  const leftRef = useRef(null);
  const [draggingAxis, setDraggingAxis] = useState(null);

  // Redibuja reglas al cambiar zoom/pan/tamaño/cursor.
  useEffect(() => { drawRuler(topRef.current, 'x', width, zoom, panOffset, cursorPos); }, [width, zoom, panOffset, cursorPos]);
  useEffect(() => { drawRuler(leftRef.current, 'y', height, zoom, panOffset, cursorPos); }, [height, zoom, panOffset, cursorPos]);

  const handleRulerMouseDown = useCallback((e, axis) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = axis === 'x'
      ? Math.round((e.clientX - rect.left - panOffset.x) / zoom)
      : Math.round((e.clientY - rect.top - panOffset.y) / zoom);
    const guide = { id: newGuideId(), axis, position: pos };
    onGuidesChange?.([...guides, guide]);
    setDraggingAxis({ axis, id: guide.id });
  }, [guides, onGuidesChange, panOffset, zoom]);

  useEffect(() => {
    if (!draggingAxis) return;
    const move = (e) => {
      const target = draggingAxis.axis === 'x' ? topRef.current : leftRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const pos = draggingAxis.axis === 'x'
        ? Math.round((e.clientX - rect.left - panOffset.x) / zoom)
        : Math.round((e.clientY - rect.top - panOffset.y) / zoom);
      onGuidesChange?.(
        guides.map((g) => (g.id === draggingAxis.id ? { ...g, position: pos } : g))
      );
    };
    const up = () => setDraggingAxis(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [draggingAxis, guides, onGuidesChange, panOffset, zoom]);

  const removeGuide = (id) => onGuidesChange?.(guides.filter((g) => g.id !== id));

  return (
    <div className="rulers" style={{ width: width + RULER_SIZE, height: height + RULER_SIZE }}>
      <div className="rulers__corner" />
      <canvas
        ref={topRef}
        className="rulers__top"
        width={width}
        height={RULER_SIZE}
        onMouseDown={(e) => handleRulerMouseDown(e, 'y')}
        title="Arrastra desde aquí para crear una guía horizontal"
      />
      <canvas
        ref={leftRef}
        className="rulers__left"
        width={RULER_SIZE}
        height={height}
        onMouseDown={(e) => handleRulerMouseDown(e, 'x')}
        title="Arrastra desde aquí para crear una guía vertical"
      />
      {/* Área con guías renderizadas */}
      <div className="rulers__canvas-area" style={{ width, height }}>
        {guides.map((g) =>
          g.axis === 'x' ? (
            <div
              key={g.id}
              className="rulers__guide rulers__guide--v"
              style={{ left: g.position * zoom + panOffset.x }}
              onDoubleClick={() => removeGuide(g.id)}
              title="Doble click: eliminar"
            />
          ) : (
            <div
              key={g.id}
              className="rulers__guide rulers__guide--h"
              style={{ top: g.position * zoom + panOffset.y }}
              onDoubleClick={() => removeGuide(g.id)}
              title="Doble click: eliminar"
            />
          )
        )}
      </div>
    </div>
  );
};

function drawRuler(canvas, axis, length, zoom, panOffset, cursorPos) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#141418';
  ctx.fillRect(0, 0, w, h);

  // Elegir step tick según zoom: si zoom<1 muestra cada 10, sino cada 1.
  const majorStep = zoom >= 2 ? 5 : zoom >= 1 ? 10 : zoom >= 0.5 ? 25 : 50;

  ctx.strokeStyle = '#3a3a45';
  ctx.fillStyle = '#cfcfdc';
  ctx.font = '9px monospace';
  ctx.lineWidth = 1;

  const offset = axis === 'x' ? panOffset.x : panOffset.y;
  // Pos píxel lógico → pos pantalla: screen = pos*zoom + offset.
  const startPos = Math.floor(-offset / zoom / majorStep) * majorStep;
  const endPos = Math.ceil((length - offset) / zoom / majorStep + 1) * majorStep;

  for (let p = startPos; p <= endPos; p += majorStep) {
    const screen = p * zoom + offset;
    if (screen < 0 || screen > (axis === 'x' ? w : h)) continue;
    ctx.beginPath();
    if (axis === 'x') {
      ctx.moveTo(screen + 0.5, h - 6);
      ctx.lineTo(screen + 0.5, h);
      ctx.stroke();
      ctx.fillText(String(p), screen + 2, h - 8);
    } else {
      ctx.moveTo(w - 6, screen + 0.5);
      ctx.lineTo(w, screen + 0.5);
      ctx.stroke();
      ctx.save();
      ctx.translate(w - 8, screen + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(String(p), 0, 0);
      ctx.restore();
    }
  }

  // Marcador del cursor
  if (cursorPos) {
    const screenPos = axis === 'x' ? cursorPos.x * zoom + offset : cursorPos.y * zoom + offset;
    ctx.fillStyle = '#ffd84a';
    if (axis === 'x') ctx.fillRect(screenPos - 1, 0, 2, h);
    else ctx.fillRect(0, screenPos - 1, w, 2);
  }
}

export default Rulers;
