"use no memo";

// Helpers de geometría puros, sin dependencias de React ni del DOM.
// Extraídos desde workspaceContainer.jsx para reuso en lógica de selección
// (lazo, recorte, rotación) sin arrastrar el ciclo de vida del componente.

// Test punto-en-polígono por algoritmo ray-casting.
// Equivalente al antiguo `isPointInPolygon` inline.
export function isPointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Calcula los límites rectangulares de una lista de puntos del lazo.
// Retorna `null` si el polígono tiene menos de 3 puntos.
export function calculateLassoBoundsFromPoints(lassoPoints) {
  if (!lassoPoints || lassoPoints.length < 3) return null;

  const xCoords = lassoPoints.map((p) => p.x);
  const yCoords = lassoPoints.map((p) => p.y);

  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

// Recorre un ImageData buscando el bounding-box de píxeles con alfa > 0.
// Retorna `null` si no hay ningún píxel visible.
export function findNonEmptyBounds(imageData, width, height) {
  const data = imageData.data;

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;
  let found = false;

  for (; top < height; top++) {
    for (let x = 0; x < width; x++) {
      if (data[(top * width + x) * 4 + 3] > 0) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  found = false;
  for (; bottom >= top; bottom--) {
    for (let x = 0; x < width; x++) {
      if (data[(bottom * width + x) * 4 + 3] > 0) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  found = false;
  for (; left < width; left++) {
    for (let y = top; y <= bottom; y++) {
      if (data[(y * width + left) * 4 + 3] > 0) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  found = false;
  for (; right >= left; right--) {
    for (let y = top; y <= bottom; y++) {
      if (data[(y * width + right) * 4 + 3] > 0) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (left > right || top > bottom) return null;

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

// Restringe unas coordenadas dentro de un rectángulo [0, maxW-1] x [0, maxH-1].
export function clampCoordinates(coords, maxWidth, maxHeight) {
  return {
    x: Math.max(0, Math.min(maxWidth - 1, coords.x)),
    y: Math.max(0, Math.min(maxHeight - 1, coords.y)),
  };
}

// Ángulo en grados (0-360) desde el centro al punto del mouse,
// con 0° apuntando hacia arriba.
export function calculateRotationAngle(mouseX, mouseY, centerX, centerY) {
  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;
  let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  angle = angle + 90;
  if (angle < 0) angle += 360;
  return Math.round(angle);
}

// Posición del punto de control del círculo de rotación en coordenadas
// de canvas. `radiusInScreenPx / zoom` lo convierte a unidades de canvas.
export function getRotationHandlerPosition({
  croppedSelectionBounds,
  dragOffset,
  rotationAngleSelection,
  rotationHandlerRadius,
  zoom,
}) {
  if (!croppedSelectionBounds) return { x: 0, y: 0 };

  const centerX =
    croppedSelectionBounds.x +
    croppedSelectionBounds.width / 2 +
    dragOffset.x;
  const centerY =
    croppedSelectionBounds.y +
    croppedSelectionBounds.height / 2 +
    dragOffset.y;

  const angleRad = (rotationAngleSelection - 90) * (Math.PI / 180);
  const radiusInCanvas = rotationHandlerRadius / zoom;
  const handleX = centerX + Math.cos(angleRad) * radiusInCanvas;
  const handleY = centerY + Math.sin(angleRad) * radiusInCanvas;

  return { x: handleX, y: handleY };
}
