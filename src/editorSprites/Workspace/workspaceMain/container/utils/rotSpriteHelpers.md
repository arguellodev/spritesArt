# rotSpriteHelpers.js

## Propósito
Envoltorio puro del algoritmo **RotSprite** (desde `src/editorSprites/Workspace/rotesprite.js`) para rotar un conjunto de píxeles un ángulo arbitrario preservando la estética de pixel art. Extraído desde `workspaceContainer.jsx` para desacoplar el núcleo del algoritmo del estado de React.

## API pública
- **`applyRotSprite(pixels, angle, bounds, totalWidth, totalHeight)`** — `Promise<pixels>`. Retorna los píxeles rotados.
  - `pixels`: `Array<{x, y, color: {r, g, b, a}}>`.
  - `angle`: grados.
  - `bounds`: bounding box original de `pixels` `{x, y, width, height}`.
  - `totalWidth` / `totalHeight`: dimensiones del canvas destino, para clamping.
  - Retorna los píxeles originales sin modificar si el ángulo es 0 o si `jsAlgorithm` lanza.

## Dependencias
- **Importa de:**
  - `../../../rotesprite` (`jsAlgorithm`).
- **Es importado por:**
  - `workspaceContainer.jsx` (reemplaza el núcleo del antiguo `applyRotSprite` inline).

## Estado gestionado
No aplica. La función es `async` pero no guarda estado entre llamadas.

## Efectos secundarios
- Crea canvases DOM temporales en memoria (`document.createElement("canvas")`) — no se insertan en el árbol.
- Carga una `Image` vía data URL para decodificar el PNG producido por `jsAlgorithm`.
- No toca ningún ref ni setter del componente.

## Notas de performance
- **Cambio intencional respecto a la versión original:** la función **ya no toca `setIsRotating`**. Ese flag es estado de React y debe mantenerlo el consumidor (`workspaceContainer.jsx`) envolviendo la llamada:
  ```js
  setIsRotating(true);
  const rotated = await applyRotSprite(pixels, angle, bounds, totalWidth, totalHeight);
  setIsRotating(false);
  ```
- La operación implica generar un PNG (toDataURL) y decodificarlo (`Image.onload`): es asíncrona y no trivial. Llamarla en el bucle del puntero degrada FPS — solo invocar al finalizar el arrastre del handler de rotación.
