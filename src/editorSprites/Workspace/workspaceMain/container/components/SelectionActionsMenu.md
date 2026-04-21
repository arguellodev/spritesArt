# SelectionActionsMenu.jsx

## Propósito
Menú flotante de botones que se renderiza al lado de una selección activa y expone sus acciones más comunes: rotar 90° izquierda/derecha, borrar, rellenar, deseleccionar, agrupar, desagrupar, duplicar, copiar, cortar y aislar píxeles.

## API pública
Componente React. Export default.

Props:
- **Condiciones de render** (se oculta si cualquiera falla): `croppedSelectionBounds`, `selectionActive`, `!isPressed`, `!isRotationHandlerContainerPressed`, `selectedPixels.length > 0`.
- **Posicionamiento:** `selectionActionsRef`, `dragOffset`, `viewportOffset`, `zoom`.
- **Callbacks de acción:**
  - `handleRotation(direction: "left" | "right")`
  - `deleteSelection()`
  - `fillSelection()`
  - `clearCurrentSelection()`
  - `groupSelection()`
  - `ungroupSelection()`
  - `duplicateSelection()`
  - `copySelection()`
  - `cutSelection()`
  - `isolateSelection()`

## Dependencias
- **Importa de:** `react-icons/lu`, `react-icons/md`.
- **Es importado por:** `workspaceContainer.jsx` (sustituye el bloque JSX inline).

## Estado gestionado
No gestiona estado propio — es puramente presentacional. Todas las acciones ejecutan callbacks del padre.

## Efectos secundarios
Ninguno.

## Notas de performance
- Su visibilidad depende de `isPressed` y `isRotationHandlerContainerPressed`: durante un drag el menú se oculta (return null), evitando recomputar layout mientras el usuario arrastra píxeles.
- Usa CSS externo (`workspaceContainer.css` → `.workspace-selection-actions`, `.selection-actions-buttons`, `.action-button`). El CSS ya está importado por el padre, no es necesario importarlo aquí.
- No necesita memoización: es ligero y solo se renderiza cuando no hay interacción de puntero.
