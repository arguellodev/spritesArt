# strokeSmoothing.js

## Propósito
Algoritmos de suavizado de trazos para el modo "pencil perfect". Operan sobre arrays de puntos `{x, y}` y son completamente puros.

## API pública
- **`smoothStroke(points, perfectionLevel)`** — aplica promedio móvil gaussiano y, para `perfectionLevel > 0.5`, delega en `straightenNearStraightSegments` para enderezar segmentos casi rectos.
- **`straightenNearStraightSegments(points, perfectionLevel)`** — detecta segmentos donde todos los puntos intermedios están cerca de la línea recta entre extremos y los sustituye por una interpolación lineal.
- **`applyCurveSmoothing(points, perfectionLevel)`** — suaviza con splines Catmull-Rom simplificados (interpolación `t = 0..1` paso `0.1`).

Parámetro común: `perfectionLevel ∈ [0, 1]` (0 = sin suavizado, 1 = máximo).

## Dependencias
- **Importa de:** nada.
- **Es importado por:**
  - `workspaceContainer.jsx` (reemplaza las versiones `useCallback` inline).

## Estado gestionado
No aplica.

## Efectos secundarios
Ninguno.

## Notas de performance
- Son funciones puras. El consumidor las puede usar dentro de `useCallback` con dependencias `[]`.
- `smoothStroke` es O(n × windowSize), donde `windowSize` crece con `perfectionLevel` (hasta ~15). Para trazos muy largos conviene aplicarlas solo al finalizar el stroke, no en cada tick del puntero.
- `applyCurveSmoothing` genera ~10 puntos por cada segmento original; úsalo con moderación en paths ya densos.
