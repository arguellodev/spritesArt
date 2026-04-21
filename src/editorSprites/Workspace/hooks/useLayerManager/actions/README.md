# `actions/`

Factories **que no son hooks**. Cada archivo exporta una función `createXxxActions({ ...dependencias })` que devuelve un objeto con las funciones de acción. `index.jsx` invoca cada factory una vez por render, inline, sin `useMemo`.

Por qué no son hooks:
- No poseen estado propio. Todo el estado vive en `index.jsx` o en los `sub-hooks/`.
- Hacerlos hooks añadiría una Rule-of-Hooks constraint (orden de llamada fijo) sin ganancia.

Por qué **no se memoizan** con `useMemo`:
- El React Compiler (`compilationMode: 'all'`) maneja la estabilidad.
- Memoizar con deps incorrectas produce closures obsoletas — un bug casi imposible de rastrear. Invocación inline por render con args frescos garantiza closures correctos.
- El coste de crear el objeto de funciones por render es despreciable comparado con los ciclos que ya consume el pipeline de render canvas/WebGL.

## Mapa de archivos

| Archivo | Dependencias que recibe | Funciones que devuelve |
|---|---|---|
| `layerActions.js` | `layers`, `setLayers`, `frames`, `setFrames`, `framesResume`, `setFramesResume`, `layerCanvasesRef`, `currentFrame`, `isRestoringRef`, `compositeRender`, `historyPush` | `addLayer`, `addGroupLayer`, `deleteLayer`, `duplicateLayer`, `moveLayerUp`, `moveLayerDown`, `toggleLayerVisibility`, `toggleLayerVisibilityInFrame`, `getLayerVisibility`, `renameLayer`, `clearLayer`. |
| `frameActions.js` | `frames`, `setFrames`, `framesResume`, `setFramesResume`, `currentFrame`, `setCurrentFrame`, `layers`, `layerCanvasesRef`, `isRestoringRef`, `compositeRender`, `historyPush`, `defaultFrameDuration`, `setDefaultFrameDuration` | `createFrame`, `deleteFrame`, `duplicateFrame`, `setActiveFrame`, `renameFrame`, `setFrameOpacity`, `getFrameOpacity`, `setFrameDuration`, `getFrameDuration`, `setDefaultFrameRate`, `getFrameRate`, `getFramesInfo`, `saveCurrentFrameState`. |
| `paintActions.js` | `layerCanvasesRef`, `frames`, `setFrames`, `framesResume`, `setFramesResume`, `currentFrame`, `logPixelChanges`, `isRestoringRef`, `compositeRender`, `pendingPaintOperations` (ref), `paintBatchTimer` (ref), `activeLighter`, `tempLighterCanvas`, `createTempLighterCanvas` | `drawOnLayer`, `paintPixelsRGBA`, `paintPixelsImmediate`, `erasePixels`, `processPaintBatch`, `checkIfCanvasIsPaintedViaBlob`, `getLayerPixelData`, `getCompositeLayerData`. |
| `fillActions.js` | `layerCanvasesRef`, `frames`, `currentFrame`, `width`, `height`, `logPixelChanges`, `optimizedFloodFill` (de `../utils/../optimizedFloodFill`) | `floodFill`, `gradientFloodFill`, `getMatchingPixels`. |

## Convenciones

- **Prefijo de archivo**: `xxxActions.js` (camelCase, plural).
- **Prefijo de factory**: `createXxxActions`.
- **Firma uniforme**: un solo argumento objeto con deps nombradas. Nada de argumentos posicionales.
- **`isRestoringRef`**: lo reciben todas las actions que escriben estado. Gatear escrituras con `if (isRestoringRef.current) return` donde el archivo original lo hacía.
- **`logPixelChanges`**: lo reciben paint actions y fill actions. Nunca mutar `pixelChangesStack` directamente — pasar por `logPixelChanges`.
- **No crear refs nuevos dentro de una factory.** Los refs viven en `index.jsx` o en sub-hooks y se pasan como parámetro.
