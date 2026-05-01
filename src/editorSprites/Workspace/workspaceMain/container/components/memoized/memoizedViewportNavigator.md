# memoizedViewportNavigator.jsx

## Propósito
Builder de JSX para `<ViewportNavigator/>` (el minimapa de navegación del canvas). El padre lo memoiza con `useMemo` dependiendo solo de `[viewportOffset, zoom]`.

## API pública
- **`renderViewportNavigator({ totalWidth, totalHeight, viewportWidth, viewportHeight, viewportOffset, zoom, moveViewport, handleZoomChange, compositeCanvasRef, getFullCanvas })`** — retorna `<ViewportNavigator .../>`.

## Dependencias
- **Importa de:** `../../../viewportNavigator`.
- **Es importado por:** `workspaceContainer.jsx`.

## Estado gestionado
Ninguno.

## Efectos secundarios
Ninguno.

## Notas de performance
- `ViewportNavigator` pinta un preview del canvas completo: su render es costoso. Por eso el padre lo memoiza con una dep list corta (`[viewportOffset, zoom]`); cambiar esa dep list para agregar otras dependencias reintroduce renders caros a 60fps durante el dibujo.
