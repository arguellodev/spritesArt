# tools.js

## Propósito
Tabla constante que enumera todas las herramientas de dibujo/edición disponibles en `CanvasTracker`. Sirve como fuente única de verdad para despachar el comportamiento del puntero en `workspaceContainer.jsx`.

## API pública
- **`TOOLS`** (export nombrado y default): objeto `{ clave: identificador }` con 23 entradas (paint, pencilPerfect, eyeDropper, erase, select, lassoSelect, move, fill, line, curve, square, triangle, circle, ellipse, polygon, polygonPencil, light, dark, selectByColor, blurFinger, smudge, deblur, paint2).

Los valores son los identificadores string que otras partes del editor comparan contra `tool` para decidir qué pipeline ejecutar.

## Dependencias
- **Importa de:** nada (constante pura).
- **Es importado por:**
  - `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` (tras la refactorización).

## Estado gestionado
No aplica. Es una constante inmutable.

## Efectos secundarios
Ninguno.

## Notas de performance
- Es un objeto literal: no genera re-renders ni se recrea por montaje.
- **Deuda técnica conocida:** `src/editorSprites/Workspace/customTool/toolsMap.jsx` existe como mapa legacy con solo `pencil` y `eraser`. Ambos conviven porque la tabla legacy se usa por otras rutas viejas del despacho. No se unificó en esta refactorización para mantener el alcance conservador; queda pendiente para una fase posterior.
