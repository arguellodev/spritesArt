# MirrorCornerHandles.jsx

## Propósito
Renderiza los dos handles (esquina superior-izquierda y esquina inferior-derecha) que permiten redimensionar el rectángulo del "custom area" del modo espejo. Se monta solo cuando `mirrorState.customArea` es `true`.

## API pública
Componente React. Export default.

Props:
- `mirrorState`: objeto con `customArea: boolean` y `bounds: {x1, y1, x2, y2}`.
- `leftMirrorCornerRef`, `rightMirrorCornerRef`: refs DOM que el padre conecta a `usePointer` para trackear el arrastre.
- `positionCorners`: `{x1, y1, x2, y2}` posición actual de las esquinas (en coordenadas de canvas).
- `viewportOffset`: `{x, y}`.
- `zoom`: `number`.
- `leftIsPressedMirror`, `rightIsPressedMirror`: `boolean` → controlan el feedback visual (color, escala).

## Dependencias
- **Importa de:** `react-icons/gr`.
- **Es importado por:** `workspaceContainer.jsx` (sustituye el bloque JSX inline de los handles del mirror).

## Estado gestionado
Ninguno — es presentacional. Los refs apuntan a los nodos DOM pero el tracking de puntero se delega al padre vía `usePointer`.

## Efectos secundarios
Ninguno.

## Notas de performance
- **Importante:** los refs (`leftMirrorCornerRef`, `rightMirrorCornerRef`) se crean en el padre y se conectan aquí. El `usePointer` del padre sigue siendo la fuente de verdad del tracking, por lo que la fluidez del arrastre se preserva: los re-renders de este componente no reinician el pointer capture.
- Los valores `leftIsPressedMirror` / `rightIsPressedMirror` cambian en cada frame del drag; eso provoca un re-render de este componente por cada tick. Es aceptable porque solo actualiza 2 divs y sus estilos; el canvas principal no depende de este componente.
- Usa CSS externo (`workspaceContainer.css` → `.canvas-resize-handle-container`, `.resize-handle-wrapper`, `.resize-handle`, `.area-canvas-size-text`).
