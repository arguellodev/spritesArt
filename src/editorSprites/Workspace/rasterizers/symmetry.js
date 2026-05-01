"use no memo";

// Decorador de simetría para el callback plot(x, y) que reciben los
// rasterizadores. Envolver una vez, reutiliza la maquinaria para todas las
// herramientas (pencil, shapes, curves, polygon).
//
// opts: {
//   horizontal: number | null,  // eje X de reflexión vertical (espejo left/right)
//   vertical:   number | null,  // eje Y de reflexión horizontal (espejo top/bottom)
//   diagonal:   boolean,        // reflexión por la diagonal y=x que pasa por el centro
//   center:     { x, y } | null // centro para rotaciones de 4 y 8 vías
//   fourfold:   boolean,        // rotación de 4 vías alrededor de center
//   eightfold:  boolean,        // rotación de 8 vías (requiere center)
// }

export function withSymmetry(plot, opts = {}) {
  const {
    horizontal = null,
    vertical = null,
    diagonal = false,
    center = null,
    fourfold = false,
    eightfold = false,
  } = opts;

  if (
    horizontal === null && vertical === null && !diagonal &&
    !fourfold && !eightfold
  ) {
    return plot;
  }

  return (x, y) => {
    const emitted = new Set();
    const emit = (px, py) => {
      px = px | 0; py = py | 0;
      const k = (px << 16) ^ py;
      if (emitted.has(k)) return;
      emitted.add(k);
      plot(px, py);
    };

    const points = [[x | 0, y | 0]];

    if (horizontal !== null) {
      const axis = horizontal | 0;
      const len = points.length;
      for (let i = 0; i < len; i++) {
        const [px, py] = points[i];
        points.push([2 * axis - px, py]);
      }
    }

    if (vertical !== null) {
      const axis = vertical | 0;
      const len = points.length;
      for (let i = 0; i < len; i++) {
        const [px, py] = points[i];
        points.push([px, 2 * axis - py]);
      }
    }

    if (diagonal && center) {
      const cx = center.x | 0, cy = center.y | 0;
      const len = points.length;
      for (let i = 0; i < len; i++) {
        const [px, py] = points[i];
        // Reflexión por y - cy = x - cx.
        points.push([cy + (px - cx), cx + (py - cy)]);
      }
    }

    if ((fourfold || eightfold) && center) {
      const cx = center.x | 0, cy = center.y | 0;
      const len = points.length;
      for (let i = 0; i < len; i++) {
        const [px, py] = points[i];
        const dx = px - cx, dy = py - cy;
        points.push([cx - dy, cy + dx]);
        points.push([cx - dx, cy - dy]);
        points.push([cx + dy, cy - dx]);
        if (eightfold) {
          points.push([cx + dy, cy + dx]);
          points.push([cx - dx, cy + dy]);
          points.push([cx - dy, cy - dx]);
          points.push([cx + dx, cy - dy]);
        }
      }
    }

    for (const [px, py] of points) emit(px, py);
  };
}
