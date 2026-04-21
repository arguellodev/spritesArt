# memoizedLayerAnimation.jsx

## Propósito
Builder de JSX que construye el árbol `<LayerAnimation/>` con todas sus ~80 props explícitas. Se extrae del padre para sacar el ruido visual de la definición; la **memoización (`useMemo`) sigue viviendo en `workspaceContainer.jsx`** porque depende del patrón `frozenProps` (congela layer/frame data durante `isPressed` para evitar re-renders durante el arrastre del puntero).

## API pública
- **`renderLayerAnimation(props)`** — retorna `<LayerAnimation ... />` con el mapa completo de props. Uso típico:
  ```js
  const MemoizedLayerAnimation = useMemo(
    () => renderLayerAnimation({ ...allProps }),
    [frozenProps, isPlaying, viewportOffset, zoom, framesResume, selectedPixels, dragOffset, layers, eyeDropperColor, initialHeight, initialWidth, onionFramesConfig]
  );
  ```

## Dependencias
- **Importa de:** `../../../layerAnimation` (el componente real).
- **Es importado por:** `workspaceContainer.jsx`.

## Estado gestionado
Ninguno. Es una función pura que devuelve un elemento React.

## Efectos secundarios
Ninguno.

## Notas de performance
- **Crítico:** no convertir a `React.memo(LayerAnimation)` sin refactorizar también `frozenProps`. El patrón actual congela ciertas props mientras `isPressed` es true para evitar que `LayerAnimation` se vuelva a renderizar durante el arrastre del puntero; `React.memo` con shallow compare perdería esa semántica al comparar arrays/objetos por referencia.
- La memoización con `useMemo + dep list` específica está en el padre; este archivo solo elimina ~120 líneas de JSX de allí.
