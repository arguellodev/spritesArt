# pixelMask.js

## Propósito
Helpers para la máscara de "píxeles aislados" del editor (modo *isolate*), que restringe las operaciones de dibujo a un conjunto concreto de coordenadas. Convierte el array `[{x, y}, ...]` en un `Set` para lookup O(1) y expone las funciones de consulta.

## API pública
- **`buildIsolatedPixelsSet(isolatedPixels)`** — `Set<string> | null`. Construye el índice `"x,y"`. Retorna `null` si no hay aislamiento.
- **`isPixelIsolated(x, y, isolatedPixels)`** — `boolean`. Versión lineal (recorre el array). Solo para paridad legacy; prefiere el Set.
- **`isPixelIsolatedOptimized(x, y, isolatedPixelsSet)`** — `boolean`. Consulta con Set.
- **`canPaintAtPixel(x, y, isolatedPixelsSet)`** — `boolean`. Alias semántico de `isPixelIsolatedOptimized`, usado en la ruta de pintura.

## Dependencias
- **Importa de:** nada.
- **Es importado por:**
  - `workspaceContainer.jsx` (reemplaza las versiones inline).

## Estado gestionado
No aplica.

## Efectos secundarios
Ninguno.

## Notas de performance
- El patrón recomendado en el consumidor es envolver `buildIsolatedPixelsSet(isolatedPixels)` en un `useMemo` dependiente de `isolatedPixels`, y pasar ese Set a `canPaintAtPixel` en el hot-path del dibujo.
- `isPixelIsolated` (versión lineal) es O(n) en el tamaño de la máscara; evitarla en el bucle de pintura.
- Las tres funciones son puras, sin refs ni setters; seguras dentro de `useCallback` con dependencias vacías.
