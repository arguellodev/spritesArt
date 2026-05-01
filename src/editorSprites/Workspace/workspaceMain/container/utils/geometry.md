# geometry.js

## Propósito
Helpers de geometría puros (sin React, sin DOM) usados por la lógica de selección, lazo, recorte automático y rotación del editor. Se extrajeron de `workspaceContainer.jsx` para que sean reutilizables y testeables.

## API pública
- **`isPointInPolygon(x, y, polygon)`** — `boolean`. Ray-casting estándar para test de inclusión.
- **`calculateLassoBoundsFromPoints(lassoPoints)`** — `{x,y,width,height} | null`. Bounding box del polígono del lazo. `null` si hay menos de 3 puntos.
- **`findNonEmptyBounds(imageData, width, height)`** — `{x,y,width,height} | null`. Recorre un `ImageData` en busca del bounding box mínimo con alfa > 0.
- **`clampCoordinates(coords, maxWidth, maxHeight)`** — `{x, y}`. Restringe un punto al rectángulo `[0, maxW-1] x [0, maxH-1]`.
- **`calculateRotationAngle(mouseX, mouseY, centerX, centerY)`** — `number` (grados 0-360, 0° hacia arriba).
- **`getRotationHandlerPosition({ croppedSelectionBounds, dragOffset, rotationAngleSelection, rotationHandlerRadius, zoom })`** — `{x, y}` en coordenadas de canvas.

## Dependencias
- **Importa de:** nada (funciones puras).
- **Es importado por:**
  - `workspaceContainer.jsx` (reemplaza las antiguas `isPointInPolygon`, `calculateLassoBounds`, `findNonEmptyBounds`, `clampCoordinates`, `calculateRotationAngle`, `getRotationHandlerPosition` definidas inline).
  - `container/components/RotationCircle.jsx` (para `calculateRotationAngle` y `getRotationHandlerPosition`).

## Estado gestionado
No aplica.

## Efectos secundarios
Ninguno.

## Notas de performance
- Todas las funciones son deterministas y puras; seguras para llamar dentro de un `useCallback` con array de dependencias vacío.
- `findNonEmptyBounds` es O(width × height) en el peor caso; el consumidor lo delega a un Web Worker (`boundsWorker.js`) cuando el canvas es grande.
- `calculateLassoBoundsFromPoints` reemplaza la versión inline que mutaba `croppedSelectionBounds` por un `setState`; ahora la función es pura y el consumidor decide qué hacer con el resultado.
