# `export/`

Factories (mismo patrón que `../actions/`) para toda la superficie de **export, import y persistencia**. Separadas de `actions/` porque son funcionalmente leaves: nadie dentro de `useLayerManager` las consume, sólo el `workspaceContainer` a través del return público.

## Mapa de archivos

| Archivo | Dependencias | Funciones que devuelve |
|---|---|---|
| `exportCanvas.js` | `compositeCanvasRef`, `layerCanvasesRef`, `layers`, `frames`, `currentFrame`, `width`, `height`, `viewportOffset`, `zoom` | `getFullCanvas(includeHiddenLayers)`, `getFullCanvasBlob(format, quality, includeHiddenLayers)`, `getFullCanvasDataURL(format, quality, includeHiddenLayers)`, `downloadFullCanvas(filename, format, quality, includeHiddenLayers)`, `getFullCanvasImageData(x, y, w, h, includeHiddenLayers)`, `createFullCanvasCopy(includeHiddenLayers)`. |
| `exportJson.js` | `layers`, `setLayers`, `frames`, `setFrames`, `framesResume`, `setFramesResume`, `pixelGroups`, `setPixelGroups`, `layerCanvasesRef`, `currentFrame`, `setCurrentFrame`, `clearAllHistory` | `exportLayersAndFrames()`, `importLayersAndFrames(importData)`, `exportToJSONFile(filename)`, `importFromJSONData(loadedData)`, `getJSONDataPreview(loadedData)`. |
| `folderStorage.js` | Las mismas que `exportJson.js`, más `exportLayersAndFrames` y `importLayersAndFrames` ya construidos | `saveFolderHandleToStorage(dirHandle)`, `loadFolderHandleFromStorage()`, `clearStoredFolderHandle()`, `exportToRememberedFolder(filename, options)`, `getStoredFolderInfo()`, `selectNewFolder()`, `exportToSpecificFolder(filename, folderName)`, `exportToDownloads(filename)`. |
| `dataUrlImport.js` | `layers`, `setLayers`, `frames`, `setFrames`, `framesResume`, `setFramesResume`, `layerCanvasesRef`, `currentFrame`, `width`, `height`, `compositeRender` | `createLayerAndPaintDataUrl(dataUrl, options)`, `importImageFromDataUrl(dataUrl, imageName)`, `createLayerAndPaintDataUrlCentered(dataUrl, options, layerName, maxWidth, maxHeight)`. |

## Notas importantes

- **File System Access API** — `folderStorage.js` usa `window.showDirectoryPicker()` y almacena el handle en **IndexedDB** (no en `localStorage`). Esto funciona en Chromium y Electron, **pero no en Firefox ni Safari**. Preservar la capability check `supportsFileSystemAccess` (el código original detecta la ausencia del API y cae a flujos alternativos) — no asumir disponibilidad.
- **`exportLayersAndFrames` serializa canvases a dataURLs PNG**. Importar revierte el proceso cargando cada dataURL en un canvas fresco. Esta es la razón por la que `importLayersAndFrames` es asíncrono (~190 líneas en el archivo original).
- **`clearAllHistory` se llama después de `importLayersAndFrames`**. Importar un proyecto invalida todo el undo stack — nunca dejar historia cruzada entre proyectos.
- **`nanoid`** se usa para regenerar IDs de layers/groups en import. Nunca reutilizar IDs importados directamente.
- **Sólo `exportJson.js` debe tocar `clearAllHistory`.** El resto de archivos no invalidan la historia.
