# curveDrawing.js

## Propósito
Dibuja una curva cuadrática de Bezier pixel-perfect sobre un `CanvasRenderingContext2D`. Se encarga de muestrear la curva, eliminar duplicados consecutivos, quitar escalones en L (característicos de las curvas cuantizadas a píxeles) y dibujar líneas Bresenham con un ancho fijo entre los puntos resultantes.

## API pública
- **`drawQuadraticCurve(ctx, start, end, control, width, color)`** — `void`. Muta el `ctx` pintando con `fillStyle = rgba(color)` la curva cuadrática definida por los tres puntos.
  - `start`, `end`, `control`: `{x, y}` (coordenadas en píxeles del canvas).
  - `width`: ancho entero en píxeles del trazo.
  - `color`: `{ r, g, b, a }` (a en 0..1).

## Dependencias
- **Importa de:** nada.
- **Es importado por:**
  - `workspaceContainer.jsx` (reemplaza la callback inline `drawQuadraticCurve`).

## Estado gestionado
No aplica.

## Efectos secundarios
- Muta el contexto 2D pasado (`save`/`fillRect`/`restore`).

## Notas de performance
- La función es determinista; dado el mismo `(start, end, control, width, color)` y un `ctx` limpio, produce el mismo trazo.
- `steps = max(distance * 3, 50)` puede generar muchos puntos para curvas muy largas; la limpieza por `Set` en `drawPixelPerfectLine` evita redibujar el mismo píxel, pero el bucle sigue siendo lineal en el número de puntos.
- El trazo de curvas se hace solo al **soltar** el puntero (no en cada tick del drag), así que el coste no afecta a la fluidez del cursor.
