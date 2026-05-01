# RotationCircle.jsx

## Propósito
Renderiza el círculo punteado, la línea al handle y el "nub" arrastrable que permite rotar una selección activa en el editor. Sustituye al antiguo `RotationCircleComponent` definido inline dentro del render de `CanvasTracker` — la versión inline violaba las reglas de hooks al declarar `useState`/`useRef`/`useEffect` dentro de una función definida en el cuerpo del padre.

## API pública
Componente React. Export default.

Props:
- `croppedSelectionBounds`: `{x, y, width, height} | null`.
- `selectionActive`: `boolean`.
- `selectedPixels`: `Array<Pixel>`. Se oculta si tiene menos de 2 elementos.
- `artboardRef`: ref del artboard, se pasa a `usePointer` como contenedor de referencia para el seguimiento de coordenadas.
- `viewportOffset`: `{x, y}`.
- `zoom`: `number`.
- `dragOffset`: `{x, y}`.
- `rotationHandlerRadius`: `number` (px en pantalla).
- `rotationAngleSelection`: `number` (grados 0-360).
- `setRotationAngleSelection(angle)`: setter del padre.
- `setIsRotationHandlerActive(active)`: setter del padre.
- `isRotationHandlerActive`: `boolean` (para colorear el estado activo).

## Dependencias
- **Importa de:**
  - `react` (`useEffect`, `useRef`).
  - `../../../hooks/hooks` (`usePointer`).
  - `../utils/geometry` (`calculateRotationAngle`, `getRotationHandlerPosition`).
- **Es importado por:**
  - `workspaceContainer.jsx` (reemplaza la función interna `RotationCircleComponent`).

## Estado gestionado
- `localRotationHandlerRef` (useRef): referencia al div del "nub" arrastrable. Se pasa a `usePointer` como target.
- Todo el resto del estado vive en el padre y se sincroniza vía setters.

## Efectos secundarios
- **Effect 1:** mientras se presiona el handle y hay posición relativa, calcula el nuevo ángulo y lo publica al padre con `setRotationAngleSelection` + `setIsRotationHandlerActive(true)`.
- **Effect 2:** al soltar el handle, llama `setIsRotationHandlerActive(false)`.

## Notas de performance
- El `usePointer` local está **encapsulado dentro del componente**. Esto es importante: el ref de puntero queda aislado, y cualquier re-render del padre no recrea el tracking del drag. Esto preserva la fluidez del arrastre tal como existía antes del refactor.
- El componente retorna `null` cuando no hay selección activa o hay menos de 2 píxeles seleccionados, evitando montar los nodos absolutos innecesariamente.
- No se memoiza con `React.memo` porque prácticamente todas sus props cambian durante el arrastre; la memoización sería trabajo inútil.
