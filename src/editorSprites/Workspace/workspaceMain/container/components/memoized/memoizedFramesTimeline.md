# memoizedFramesTimeline.jsx

## Propósito
Builder de JSX para `<FramesTimeline/>` con el mapa completo de props. Simétrico a `memoizedLayerAnimation.jsx`: la memoización (`useMemo`) vive en el padre; aquí solo se saca el JSX del flujo principal para aligerar `workspaceContainer.jsx`.

## API pública
- **`renderFramesTimeline(props)`** — retorna `<FramesTimeline ... />`.

Uso típico:
```js
const MemoizedFramesTimeline = useMemo(
  () => renderFramesTimeline({ ...allProps }),
  [frozenProps, isPlaying, viewportOffset, zoom, framesResume,
   selectedPixels, dragOffset, layers, eyeDropperColor,
   initialHeight, initialWidth]
);
```

## Dependencias
- **Importa de:** `../../../timeline` (el componente real).
- **Es importado por:** `workspaceContainer.jsx`.

## Estado gestionado
Ninguno.

## Efectos secundarios
Ninguno.

## Notas de performance
- Mismas advertencias que `memoizedLayerAnimation`: no convertir a `React.memo` sin revisar el patrón `frozenProps` del padre.
- `FramesTimeline` comparte la mayoría de las props con `LayerAnimation` (gestión de capas + animación), pero renderiza la línea de tiempo horizontal en lugar del panel lateral.
