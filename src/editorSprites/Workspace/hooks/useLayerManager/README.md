# `useLayerManager/`

Subsistema que sustituye al monolito `hooks.jsx` para todo lo relativo a **capas, frames, pintado, undo/redo, onion skin, pixel groups, isolation mask, lighter mode y export/import**. El hook `usePointer` vive fuera de esta carpeta porque es una preocupación independiente (tracking de puntero, sin estado de capas).

`hooks.jsx` queda como barrel: `export { usePointer } from './usePointer'; export { useLayerManager } from './useLayerManager';`. Los 4 consumidores (`workspaceContainer.jsx`, `workspaceContainer2.jsx`, `toolColorPicker.jsx`, `RotationCircle.jsx`) siguen importando desde `hooks/hooks` sin ningún cambio.

## Mapa de archivos

| Archivo | Qué es |
|---|---|
| `index.jsx` | Hook principal `useLayerManager({ width, height, viewportWidth, viewportHeight, zoom, isPressed, isolatedPixels })`. Dueño del estado central (`layers`, `frames`, `framesResume`, `currentFrame`, `viewportOffset`, `activeLayerId`, `activeLighter`, `compositeCanvasRef`, `layerCanvasesRef`, caches en `useRef`). Compone los sub-hooks, instancia las factories de actions y retorna el objeto público (~90 claves) que consume el editor. |
| `sub-hooks/` | Hooks que **poseen** estado propio + efectos. Ver `sub-hooks/README.md`. |
| `actions/` | Factories (no son hooks) que reciben el estado del hook padre y devuelven funciones de acción. Ver `actions/README.md`. |
| `export/` | Factories de export/import (JSON, dataURL, File System Access API). Ver `export/README.md`. |
| `utils/` | Helpers puros sin React. Ver `utils/README.md`. |

## Flujo de dependencias

```
            ┌────────────────────────────────────────────────┐
            │                   index.jsx                     │
            │  (dueño del estado central + compositeRender)   │
            └────────────────────────────────────────────────┘
                │           │           │              │
                ▼           ▼           ▼              ▼
            sub-hooks/   actions/    export/         utils/
           (estado +    (factories  (factories    (puros, sin
            efectos)    sobre el     sobre el     React ni
                        estado del   estado del   estado)
                        padre)       padre)
                │           │           │              ▲
                └───────────┴───────────┴──────────────┘
                      (todos pueden importar utils/)
```

Reglas de import:
- `utils/` no importa de ninguna otra carpeta de `useLayerManager/`, ni importa React.
- `sub-hooks/`, `actions/`, `export/` pueden importar de `utils/`.
- `sub-hooks/` no importan de `actions/` ni `export/`, ni al revés — toda coordinación pasa por `index.jsx`.

## Invariantes (leer antes de tocar cualquier cosa)

1. **`isRestoringRef` es único.** Se crea en `sub-hooks/useUndoRedo.js` y se pasa por parámetro a todos los factories/sub-hooks que lo necesiten (paint actions, frame actions, layer actions, etc.). Cualquier `useRef(false)` duplicado rompe undo/redo silenciosamente.
2. **Orden de declaración de sub-hooks en `index.jsx`**: `layers`/`frames` state → `usePixelGroups` → `useOnionSkin` → `useUndoRedo` → `useIsolationMask` → `useLighterMode` → `useEffect` de `compositeRender`. Los efectos corren en orden de declaración — reordenar rompe el pipeline de render.
3. **No memoizar manualmente** (`useMemo`/`useCallback`) a menos que el React Compiler lo requiera explícitamente. `vite.config.js` tiene `compilationMode: 'all'`. Las factories se invocan inline en cada render — eso es intencional para evitar closures obsoletas.
4. **Caches vía `useRef`** (`renderCache`, `tintedCanvasCache`, `canvasCache`, `isolationMaskCache`, `pendingPaintOperations`, `paintBatchTimer`, `tempLighterCanvas`, `lastModifiedLayer`) existen exactamente una vez. `grep` antes de añadir cualquier `useRef` nuevo.
5. **Las claves del objeto `return` de `index.jsx` son contrato público** con `workspaceContainer`. Perder una clave rompe el editor sin error en tiempo de compilación. Diff contra el snapshot cada vez que se toque el return.
6. **`setLayers` y `setPixelGroups` están expuestos deliberadamente**. `workspaceContainer` los consume directamente. No "arreglar" esto — es behavior change.
