// marchingAnts.jsx — overlay animado que dibuja el contorno de una SelectionMask
// con líneas dashed que "se mueven" (clásicas marching ants de cualquier editor).
//
// Uso:
//   <MarchingAnts
//     mask={magicWandMask}
//     zoom={zoom}
//     offset={{ x: screenOffsetX, y: screenOffsetY }}
//     canvasWidth={viewportWidth}
//     canvasHeight={viewportHeight}
//   />
//
// El componente monta un canvas absoluto sobre el área de dibujo (pointer-events
// none), y usa RAF para animar el dashOffset. El contorno se calcula una vez por
// cambio de mask usando `maskBorder` (selection/selectionOps.js) — no se
// recalcula en cada frame de animación.
//
// El overlay es "baja prioridad": si `mask` es null/empty no renderiza nada y
// el RAF se detiene, para no consumir GPU inútilmente.

import React, { useEffect, useMemo, useRef } from 'react';
import { maskBorder } from '../selection/selectionOps';
import { isEmpty } from '../selection/selectionMask';

const MarchingAnts = ({
  mask,
  zoom = 1,
  offset = { x: 0, y: 0 },
  canvasWidth,
  canvasHeight,
  dashLength = 4,
  speedPxPerSec = 12,
}) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startTsRef = useRef(null);

  // Calcular el contorno una sola vez por cambio de mask.
  const borderMask = useMemo(() => {
    if (!mask || isEmpty(mask)) return null;
    return maskBorder(mask);
  }, [mask]);

  // Lista plana de puntos de borde (coord lógicos) para redibujar rápido cada tick.
  const borderPixels = useMemo(() => {
    if (!borderMask) return null;
    const { width, height, data } = borderMask;
    const pts = [];
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        if (data[row + x]) pts.push([x, y]);
      }
    }
    return pts;
  }, [borderMask]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!borderPixels || borderPixels.length === 0) {
      // Nada que animar: limpiar y parar.
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return undefined;
    }

    const tick = (ts) => {
      if (!startTsRef.current) startTsRef.current = ts;
      const elapsedSec = (ts - startTsRef.current) / 1000;
      drawFrame(canvasRef.current, borderPixels, zoom, offset, dashLength, elapsedSec, speedPxPerSec);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Desempacamos offset.x/y (no el objeto entero) para no relanzar el RAF
    // cuando el caller pasa un objeto nuevo con los mismos valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borderPixels, zoom, offset.x, offset.y, dashLength, speedPxPerSec]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.max(1, Math.round(canvasWidth * zoom))}
      height={Math.max(1, Math.round(canvasHeight * zoom))}
      style={{
        position: 'absolute',
        left: offset.x,
        top: offset.y,
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        zIndex: 100,
      }}
    />
  );
};

/**
 * Dibuja los píxeles de borde como pequeños rects con dashed alternante.
 * Para la "animación", alternamos blanco/negro según un offset creciente en el tiempo.
 */
function drawFrame(canvas, borderPixels, zoom, offset, dashLength, elapsedSec, speed) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  // Offset dinámico: cuántos pixels de "dash" hemos avanzado desde t=0.
  // Lo usamos como shift en el índice, logrando que el patrón se desplace.
  const shift = Math.floor(elapsedSec * speed) % (dashLength * 2);

  // Usamos 2 colores alternantes por segmento `dashLength`.
  // Cada pixel del borde se pinta entero con el color correspondiente a su
  // posición relativa acumulada sobre el contorno.
  //
  // Optimización: hacer zoom * 1 fillRect por pixel. Aceptable para contornos
  // de <10k pixeles (máscaras típicas 256x256).
  borderPixels.forEach(([x, y], i) => {
    const bucket = ((i + shift) >> Math.log2(dashLength || 1)) & 1;
    ctx.fillStyle = bucket === 0 ? '#ffffff' : '#000000';
    const sx = Math.floor(x * zoom);
    const sy = Math.floor(y * zoom);
    // Tamaño 1 pixel lógico, round para no dejar gaps ni solapes (regla pixel-grid).
    const w = Math.floor((x + 1) * zoom) - sx;
    const h = Math.floor((y + 1) * zoom) - sy;
    ctx.fillRect(sx, sy, w, h);
  });
}

export default MarchingAnts;
