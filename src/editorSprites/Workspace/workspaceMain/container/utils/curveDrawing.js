"use no memo";

// Dibuja una curva cuadrática de Bezier pixel-perfect sobre un
// `CanvasRenderingContext2D`. Función pura: muta solo el ctx recibido.
//
// Usa los rasterizadores canónicos (rasterLine + pixelPerfect) en lugar de
// reimplementar Bresenham y el filtro de L-corner localmente.

import { pixelPerfectPath } from "../../../rasterizers/pixelPerfect";

// Estampa un bloque de ancho × ancho centrado en (x, y), con dedup por Set
// para evitar repintar pixels superpuestos en trazos anchos.
function makeThickStamp(ctx, width, drawnPixels) {
  const offset = (width / 2) | 0;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  return (x, y) => {
    for (let dy = 0; dy < width; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const px = x + dx - offset;
        const py = y + dy - offset;
        if (px < 0 || px >= cw || py < 0 || py >= ch) continue;
        const key = (px << 16) ^ py;
        if (drawnPixels.has(key)) continue;
        drawnPixels.add(key);
        ctx.fillRect(px, py, 1, 1);
      }
    }
  };
}

// Dibuja una curva cuadrática definida por `start`, `control`, `end`
// sobre `ctx` usando un color RGBA y un ancho entero en píxeles.
export function drawQuadraticCurve(ctx, start, end, control, width, color) {
  ctx.save();
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

  const distance = Math.max(
    Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
    Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
    Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
  );

  const steps = Math.max(distance * 3, 50);
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(
      (1 - t) * (1 - t) * start.x +
        2 * (1 - t) * t * control.x +
        t * t * end.x
    );
    const y = Math.round(
      (1 - t) * (1 - t) * start.y +
        2 * (1 - t) * t * control.y +
        t * t * end.y
    );
    const last = points[points.length - 1];
    if (!last || last.x !== x || last.y !== y) points.push({ x, y });
  }

  // pixelPerfectPath rasteriza con Bresenham entre muestras (cerrando los gaps
  // que deja el sampling del bezier) y después aplica el filtro L-corner.
  // Pasar `points` directamente a pixelPerfect() fallaría porque el filtro
  // sólo detecta esquinas entre pixels 1-adyacentes.
  const adjustedPoints = pixelPerfectPath(points);
  const drawnPixels = new Set();
  const stamp = makeThickStamp(ctx, width, drawnPixels);

  for (let i = 0; i < adjustedPoints.length; i++) {
    stamp(adjustedPoints[i].x, adjustedPoints[i].y);
  }

  // Reforzar extremos con el mismo ancho (cubre puntos aislados tras pixelPerfect).
  stamp(start.x | 0, start.y | 0);
  stamp(end.x | 0, end.y | 0);

  ctx.restore();
}
