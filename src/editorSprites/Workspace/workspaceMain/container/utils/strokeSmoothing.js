"use no memo";

// Algoritmos de suavizado de trazo para el modo "pencil perfect".
// Puros: solo operan sobre arrays de puntos `{x, y}`.

// Distancia de un punto (px, py) al segmento (x1,y1)-(x2,y2).
function distanceToLine(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return Math.sqrt(A * A + B * B);

  const param = dot / lenSq;

  let xx;
  let yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

// Verifica que todos los puntos entre `start` y `end` estén a menos de
// `threshold` del segmento extremo.
function isNearlyStraightLine(points, start, end, threshold) {
  const x1 = points[start].x;
  const y1 = points[start].y;
  const x2 = points[end - 1].x;
  const y2 = points[end - 1].y;

  for (let i = start + 1; i < end - 1; i++) {
    const distance = distanceToLine(points[i].x, points[i].y, x1, y1, x2, y2);
    if (distance > threshold) return false;
  }
  return true;
}

// Detecta segmentos casi rectos y los sustituye por una línea recta
// interpolada entre extremos. Más agresivo con `perfectionLevel` alto.
export function straightenNearStraightSegments(points, perfectionLevel) {
  if (points.length < 3) return points;

  const threshold = 2 * (2 - perfectionLevel);
  const result = [points[0]];
  let i = 0;

  while (i < points.length - 1) {
    let j = i + 2;

    while (j < points.length) {
      if (isNearlyStraightLine(points, i, j, threshold)) {
        j++;
      } else {
        break;
      }
    }

    if (j > i + 2) {
      const steps = j - i - 1;
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        result.push({
          x: Math.round(points[i].x + t * (points[j - 1].x - points[i].x)),
          y: Math.round(points[i].y + t * (points[j - 1].y - points[i].y)),
        });
      }
      i = j - 1;
    } else {
      result.push(points[i + 1]);
      i++;
    }
  }

  return result;
}

// Promedio móvil gaussiano + enderezado opcional. `perfectionLevel` es
// un número en [0, 1]: 0 = sin suavizado, 1 = máximo.
export function smoothStroke(points, perfectionLevel) {
  if (!points || points.length < 3 || perfectionLevel === 0) {
    return points;
  }

  const windowSize = Math.max(3, Math.floor(5 + perfectionLevel * 10));
  const smoothedPoints = [];

  for (let i = 0; i < points.length; i++) {
    let sumX = 0;
    let sumY = 0;
    let weightSum = 0;

    for (let j = -windowSize; j <= windowSize; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < points.length) {
        const weight = Math.exp(
          -(j * j) / ((2 * windowSize * windowSize) / 4)
        );
        sumX += points[idx].x * weight;
        sumY += points[idx].y * weight;
        weightSum += weight;
      }
    }

    smoothedPoints.push({
      x: Math.round(sumX / weightSum),
      y: Math.round(sumY / weightSum),
    });
  }

  if (perfectionLevel > 0.5) {
    return straightenNearStraightSegments(smoothedPoints, perfectionLevel);
  }

  return smoothedPoints;
}

// Suavizado adicional mediante splines Catmull-Rom simplificados.
// Añade interpolación t = 0..1 paso 0.1 entre puntos consecutivos y elimina
// duplicados finales.
export function applyCurveSmoothing(points, perfectionLevel) {
  if (points.length < 4) return points;

  const result = [];
  // `tension` no se usa en la versión actual pero se conserva el parámetro
  // por compatibilidad con la ergonomía original de la función.
  void (0.5 * perfectionLevel);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let t = 0; t < 1; t += 0.1) {
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      result.push({
        x: Math.round(x),
        y: Math.round(y),
      });
    }
  }

  result.push(points[points.length - 1]);

  return result.filter(
    (point, index) =>
      index === 0 ||
      point.x !== result[index - 1].x ||
      point.y !== result[index - 1].y
  );
}
