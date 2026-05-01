# memoizedLayerColor.jsx

## Propósito
Builder de JSX para `<LayerColor/>` (panel de color por capa). El padre lo memoiza con `useMemo` dependiendo de `[tool, toolParameters, currentFrame, activeLayerId, isPressed]`.

## API pública
- **`renderLayerColor({ tool, toolParameters, setToolParameters, getLayerPixelData, paintPixelsRGBA, currentFrame, activeLayerId, isPressed, eyeDropperColor })`** — retorna `<LayerColor .../>`.

## Dependencias
- **Importa de:** `../../../../customTool/layerColor`.
- **Es importado por:** `workspaceContainer.jsx`.

## Estado gestionado
Ninguno.

## Efectos secundarios
Ninguno.

## Notas de performance
- `eyeDropperColor` no está en la dep list del `useMemo` del padre — es intencional: `LayerColor` lo lee internamente vía props pero no lo usa para decisiones de render, así que incluirlo forzaría memos inútiles.
