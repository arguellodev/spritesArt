"use no memo";

import { rasterLine } from "./primitives";

// Filtro "pixel-perfect" de Aseprite: post-procesa una polilínea 1-adyacente
// eliminando el pixel intermedio cuando tres puntos consecutivos forman una L
// (unit-ortho + unit-ortho en ejes distintos). Resultado: líneas sin las
// escaleras de esquina que se ven "gordas" en pixel art.
//
// IMPORTANTE: El filtro sólo detecta corners si los puntos consecutivos están
// a **1 pixel de distancia**. Si le pasas pointer events crudos (que saltan
// varios pixeles entre frames), no hará nada. Usa `pixelPerfectPath` para eso:
// rasteriza primero con Bresenham y después filtra.

function isLCorner(prev, cur, next) {
  const dxPrev = cur.x - prev.x;
  const dyPrev = cur.y - prev.y;
  const dxNext = next.x - cur.x;
  const dyNext = next.y - cur.y;
  return (
    Math.abs(dxPrev) + Math.abs(dyPrev) === 1 &&
    Math.abs(dxNext) + Math.abs(dyNext) === 1 &&
    (dxPrev !== dxNext || dyPrev !== dyNext)
  );
}

export function pixelPerfect(points, closed = false) {
  if (!points || points.length < 3) return points ? points.slice() : [];

  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = out[out.length - 1];
    const cur = points[i];
    const next = points[i + 1];

    // Dedup: si el pointer no se movió, skip.
    if (cur.x === prev.x && cur.y === prev.y) continue;

    if (!isLCorner(prev, cur, next)) out.push(cur);
  }

  // Añadir el último si no duplica (evita repetirlo cuando la cola quedó
  // pegada al punto final tras descartar la L previa).
  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (last.x !== tail.x || last.y !== tail.y) out.push(last);

  // Trazo cerrado: el filtro base no ve la unión entre out[N-1] y out[0],
  // así que las L-corners en el seam quedan sin tocar y se ve un pixel de
  // más al cerrar la figura. Aquí las removemos iterativamente — cada borrado
  // puede exponer un corner nuevo en el mismo extremo.
  if (closed && out.length >= 3) {
    // Dedup del cierre: si arranque y final caen sobre el mismo pixel, el
    // loop implícito ya los representa una sola vez.
    while (
      out.length >= 2 &&
      out[0].x === out[out.length - 1].x &&
      out[0].y === out[out.length - 1].y
    ) {
      out.pop();
    }

    let changed = true;
    while (changed && out.length >= 3) {
      changed = false;
      // Corner en out[N-1]: prev=out[N-2], cur=out[N-1], next=out[0]
      const a = out[out.length - 2];
      const b = out[out.length - 1];
      const c = out[0];
      if (isLCorner(a, b, c)) {
        out.pop();
        changed = true;
        continue;
      }
      // Corner en out[0]: prev=out[N-1], cur=out[0], next=out[1]
      const p = out[out.length - 1];
      const q = out[0];
      const r = out[1];
      if (isLCorner(p, q, r)) {
        out.shift();
        changed = true;
      }
    }
  }

  return out;
}

// Versión "end-to-end" para datos del pointer: primero interpola con Bresenham
// entre puntos consecutivos (cerrando cualquier gap), luego deduplica y aplica
// el filtro L-corner. Resultado listo para estampar píxel-a-píxel.
//
// Auto-detecta forma cerrada: si el último pixel del path cae cerca del primero
// (Chebyshev ≤ 2 px y el trazo es lo bastante largo para parecer una forma),
// se considera cerrado. En ese caso:
//   1) Se rasteriza el segmento de cierre para que el filtro vea la unión
//      como un corner 1-adyacente más.
//   2) El resultado final deja el pixel inicial duplicado al final, de modo
//      que cualquier caller que dibuje con Bresenham entre puntos consecutivos
//      pinte también el tramo de cierre.
const CLOSE_THRESHOLD = 2;      // Chebyshev máximo para considerar cierre.
const CLOSE_MIN_LENGTH = 8;     // Dense path mínimo para que aplique auto-close.

export function pixelPerfectPath(points, closed) {
  if (!points || points.length === 0) return [];

  const dense = [];
  const pushUnique = (x, y) => {
    const last = dense[dense.length - 1];
    if (!last || last.x !== x || last.y !== y) dense.push({ x, y });
  };

  if (points.length === 1) {
    pushUnique(points[0].x | 0, points[0].y | 0);
    return dense;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    rasterLine(a.x | 0, a.y | 0, b.x | 0, b.y | 0, pushUnique);
  }

  if (closed === undefined && dense.length >= CLOSE_MIN_LENGTH) {
    const first = dense[0];
    const last = dense[dense.length - 1];
    const dx = Math.abs(last.x - first.x);
    const dy = Math.abs(last.y - first.y);
    closed = Math.max(dx, dy) <= CLOSE_THRESHOLD;
  }

  if (closed) {
    const first = dense[0];
    const last = dense[dense.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
      rasterLine(last.x, last.y, first.x, first.y, pushUnique);
    }
  }

  const filtered = pixelPerfect(dense, closed);

  if (closed && filtered.length >= 2) {
    const head = filtered[0];
    const tail = filtered[filtered.length - 1];
    if (head.x !== tail.x || head.y !== tail.y) {
      filtered.push({ x: head.x, y: head.y });
    }
  }

  return filtered;
}

// Versión streaming: cada vez que llega un punto nuevo del pointer, decide si
// confirma el penúltimo o lo descarta. Pensada para pencil en vivo cuando
// quieres emisión incremental (no hay flush hasta pointerup).
//
// OJO: asume input 1-adyacente. Si vas a usarla con pointer raw, interpola
// tú mismo con rasterLine entre frames y alimenta el stream con cada pixel.
export function createPixelPerfectStream(plot) {
  const buf = [];

  const emit = (p) => plot(p.x, p.y);

  return {
    push(x, y) {
      x = x | 0; y = y | 0;
      const last = buf[buf.length - 1];
      if (last && last.x === x && last.y === y) return;

      buf.push({ x, y });
      if (buf.length < 3) return;

      const a = buf[buf.length - 3];
      const b = buf[buf.length - 2];
      const c = buf[buf.length - 1];
      if (isLCorner(a, b, c)) {
        buf.splice(buf.length - 2, 1);
      } else {
        emit(a);
        buf.splice(0, buf.length - 2);
      }
    },
    flush() {
      for (const p of buf) emit(p);
      buf.length = 0;
    },
  };
}
