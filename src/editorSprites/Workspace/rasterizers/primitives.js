"use no memo";

// Rutinas geométricas canónicas para pixel art.
// Todas reciben un plot(x, y) callback — el ink decide qué hacer con el pixel.
// Coordenadas enteras; entradas flotantes se truncan al entrar.

export function rasterLine(x0, y0, x1, y1, plot) {
  x0 = x0 | 0; y0 = y0 | 0; x1 = x1 | 0; y1 = y1 | 0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = err << 1;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function rasterRect(x, y, w, h, plot, fill = false) {
  x = x | 0; y = y | 0; w = Math.max(1, w | 0); h = Math.max(1, h | 0);
  const x1 = x + w - 1;
  const y1 = y + h - 1;
  if (fill) {
    for (let j = y; j <= y1; j++)
      for (let i = x; i <= x1; i++) plot(i, j);
    return;
  }
  for (let i = x; i <= x1; i++) { plot(i, y); if (y1 !== y) plot(i, y1); }
  for (let j = y + 1; j <= y1 - 1; j++) { plot(x, j); if (x1 !== x) plot(x1, j); }
}

// Tabla de offsets para círculos pequeños (ajuste Capello, Aseprite PR #1664).
// Evita protuberancias en r=1..5 donde midpoint clásico produce bumps asimétricos.
// Cada entrada es el cuadrante superior-derecho; la simetría cubre el resto.
// Para r>5 se usa midpoint clásico: sus "bumps" de 2 px no-cardinales son más
// fieles al círculo real que cualquier diagonal estricta (que produce forma
// octagonal visible en radios medianos/grandes).
const SMALL_CIRCLE_QUADRANT = {
  1: [[1, 0], [0, 1]],
  2: [[2, 0], [2, 1], [1, 2], [0, 2]],
  3: [[3, 0], [3, 1], [2, 2], [1, 3], [0, 3]],
  4: [[4, 0], [4, 1], [4, 2], [3, 3], [2, 4], [1, 4], [0, 4]],
  5: [[5, 0], [5, 1], [5, 2], [4, 3], [3, 4], [2, 5], [1, 5], [0, 5]],
};

function plotCircleSymmetric(cx, cy, x, y, plot, seen) {
  const key1 = ((cx + x) << 16) | (cy + y);
  const key2 = ((cx - x) << 16) | (cy + y);
  const key3 = ((cx + x) << 16) | (cy - y);
  const key4 = ((cx - x) << 16) | (cy - y);
  if (!seen.has(key1)) { seen.add(key1); plot(cx + x, cy + y); }
  if (!seen.has(key2)) { seen.add(key2); plot(cx - x, cy + y); }
  if (!seen.has(key3)) { seen.add(key3); plot(cx + x, cy - y); }
  if (!seen.has(key4)) { seen.add(key4); plot(cx - x, cy - y); }
}

export function rasterEllipse(cx, cy, rx, ry, plot, fill = false) {
  cx = cx | 0; cy = cy | 0;
  rx = Math.abs(rx | 0);
  ry = Math.abs(ry | 0);

  if (rx === 0 && ry === 0) { plot(cx, cy); return; }
  if (rx === 0) { for (let j = -ry; j <= ry; j++) plot(cx, cy + j); return; }
  if (ry === 0) { for (let i = -rx; i <= rx; i++) plot(cx + i, cy); return; }

  if (rx === ry && rx <= 5 && SMALL_CIRCLE_QUADRANT[rx]) {
    const pts = SMALL_CIRCLE_QUADRANT[rx];
    if (fill) {
      const rowMax = new Map();
      for (const [dx, dy] of pts) {
        rowMax.set(dy, Math.max(rowMax.get(dy) ?? 0, dx));
        rowMax.set(-dy, Math.max(rowMax.get(-dy) ?? 0, dx));
      }
      for (const [row, maxX] of rowMax) {
        for (let i = -maxX; i <= maxX; i++) plot(cx + i, cy + row);
      }
      return;
    }
    const seen = new Set();
    for (const [dx, dy] of pts) plotCircleSymmetric(cx, cy, dx, dy, plot, seen);
    return;
  }

  const emit = fill
    ? (x, y) => {
        for (let i = cx - x; i <= cx + x; i++) {
          plot(i, cy + y);
          if (y !== 0) plot(i, cy - y);
        }
      }
    : (() => {
        const seen = new Set();
        return (x, y) => plotCircleSymmetric(cx, cy, x, y, plot, seen);
      })();

  let x = 0, y = ry;
  const rx2 = rx * rx, ry2 = ry * ry;
  const tworx2 = rx2 << 1, twory2 = ry2 << 1;
  let px = 0, py = tworx2 * y;

  let p = Math.round(ry2 - rx2 * ry + 0.25 * rx2);
  emit(x, y);
  while (px < py) {
    x++; px += twory2;
    if (p < 0) p += ry2 + px;
    else { y--; py -= tworx2; p += ry2 + px - py; }
    emit(x, y);
  }

  p = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);
  while (y > 0) {
    y--; py -= tworx2;
    if (p > 0) p += rx2 - py;
    else { x++; px += twory2; p += rx2 - py + px; }
    emit(x, y);
  }
}

function flatEnough(p0, p1, p2, p3, tol) {
  // Distancia de p1, p2 a la cuerda p0-p3: si ambas < tol, el tramo es plano.
  const ax = p3.x - p0.x, ay = p3.y - p0.y;
  const len = Math.hypot(ax, ay) || 1;
  const nx = -ay / len, ny = ax / len;
  const d1 = Math.abs((p1.x - p0.x) * nx + (p1.y - p0.y) * ny);
  const d2 = Math.abs((p2.x - p0.x) * nx + (p2.y - p0.y) * ny);
  return d1 < tol && d2 < tol;
}

export function rasterBezier(p0, p1, p2, p3, plot, tol = 0.5) {
  const stack = [[p0, p1, p2, p3]];
  let last = null;
  while (stack.length) {
    const [a, b, c, d] = stack.pop();
    if (flatEnough(a, b, c, d, tol)) {
      const x0 = a.x | 0, y0 = a.y | 0;
      const x1 = d.x | 0, y1 = d.y | 0;
      if (last === null || last.x !== x0 || last.y !== y0) {
        rasterLine(x0, y0, x1, y1, plot);
      } else {
        rasterLine(x0, y0, x1, y1, (x, y) => {
          if (x === x0 && y === y0) return;
          plot(x, y);
        });
      }
      last = { x: x1, y: y1 };
      continue;
    }
    const ab  = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    const bc  = { x: (b.x + c.x) * 0.5, y: (b.y + c.y) * 0.5 };
    const cd  = { x: (c.x + d.x) * 0.5, y: (c.y + d.y) * 0.5 };
    const abc = { x: (ab.x + bc.x) * 0.5, y: (ab.y + bc.y) * 0.5 };
    const bcd = { x: (bc.x + cd.x) * 0.5, y: (bc.y + cd.y) * 0.5 };
    const abcd = { x: (abc.x + bcd.x) * 0.5, y: (abc.y + bcd.y) * 0.5 };
    stack.push([abcd, bcd, cd, d]);
    stack.push([a, ab, abc, abcd]);
  }
}

export function rasterPolygon(points, plot, fill = false) {
  const n = points.length;
  if (n === 0) return;
  if (n === 1) { plot(points[0].x | 0, points[0].y | 0); return; }

  if (!fill) {
    for (let i = 0; i < n; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      rasterLine(a.x | 0, a.y | 0, b.x | 0, b.y | 0, plot);
    }
    return;
  }

  let minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    const y = p.y | 0;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // Scanline con active edge table. Regla par-impar.
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < n; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      const ay = a.y | 0, by = b.y | 0;
      if (ay === by) continue;
      const yMin = Math.min(ay, by);
      const yMax = Math.max(ay, by);
      if (y < yMin || y >= yMax) continue;
      const t = (y - ay) / (by - ay);
      xs.push(a.x + t * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k < xs.length; k += 2) {
      const xl = Math.ceil(xs[k]);
      const xr = Math.floor(xs[k + 1]);
      for (let x = xl; x <= xr; x++) plot(x, y);
    }
  }

  // Los bordes completan la silueta (el scanline pierde pixeles en y==yMax).
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    rasterLine(a.x | 0, a.y | 0, b.x | 0, b.y | 0, plot);
  }
}
