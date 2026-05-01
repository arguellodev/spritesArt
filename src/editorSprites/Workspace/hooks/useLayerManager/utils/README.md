# `utils/`

Helpers **puros**. Sin React, sin estado, sin closures sobre el hook. Reciben todo por parámetro y devuelven valores (o mutan un `ctx` de canvas pasado como argumento).

## Reglas

- **Prohibido importar React.** Ni `useState`, ni `useEffect`, ni `useRef`, ni nada de `react`.
- **Prohibido importar de otras carpetas de `useLayerManager/`** (ni `sub-hooks/`, ni `actions/`, ni `export/`). `utils/` es hoja del grafo de dependencias.
- **Permitido importar**: otros archivos de `utils/`, librerías externas (`nanoid`), y módulos vecinos de `hooks/` (como `optimizedFloodFill` si hiciera falta — aunque normalmente es mejor pasar la función ya construida como argumento desde `index.jsx`).
- **Funciones puras cuando sea razonable.** Los renderers de canvas no son matemáticamente puros (mutan un `ctx`), pero sí deben ser idempotentes respecto a sus inputs — mismo `ctx` vacío + mismos args = mismo resultado pintado.

## Mapa de archivos

| Archivo | Qué exporta |
|---|---|
| `colors.js` | `normalizeToRGBA(color)` — parsea CSS/hex/rgba a `{r,g,b,a}`. `isValidRGBAValue(value)` — chequea rango `[0, 255]`. `colorsEqual(c1, c2, tolerance)` — compara con tolerancia. `rgbaToString(rgba)` — serializa a `rgba(...)`. `createRGBA(r, g, b, a)` — constructor con clamping. |
| `tinting.js` | `applyTintToCanvas(sourceCanvas, config, frameNumber, layerId, cacheRef)` — aplica tintado HSL sobre un canvas. `rgbToHsl(r, g, b)` y `hslToRgb(h, s, l)` — conversiones de color space. El cache (`tintedCanvasCache`) se recibe como argumento; no vive en el módulo. |
| `coordinates.js` | `getCanvasCoordsFromPointer(pointerX, pointerY, { viewportOffset, zoom })` y `getPointerCoordsFromCanvas(canvasX, canvasY, { viewportOffset, zoom })`. Transformaciones puras entre sistemas de coordenadas del puntero y del canvas lógico. |
| `layerHierarchy.js` | `getHierarchicalLayers(layers)`, `getMainLayers(layers)`, `getGroupLayersForParent(layers, parentLayerId)`. Toman el array `layers` como argumento y devuelven arrays filtrados/estructurados. |
| `throttleDebounce.js` | `throttle(func, limit)` y `debounce(func, delay)`. Reutilizado también por `../../usePointer.jsx`. |
| `renderHelpers.js` | `renderCurrentFrameOnly(ctx, { ... })`, `renderCurrentFrameWithAdjacent(ctx, { ... })`, `renderCachedIsolationMask(ctx, { isolationMaskCache, ... })`, `mergeLighterCanvas(targetCtx, tempCanvas, ...)`. Rutinas de pintado sobre `ctx`. Reciben todo estado necesario (`layers`, `frames`, `currentFrame`, `layerCanvasesRef`, `viewportOffset`, `zoom`, `onionSkinSettings`, `onionFramesConfig`, `tintedCanvasCache`, etc.) como parámetros explícitos — nada vía closure. |

## Nota sobre `renderHelpers.js`

Es el archivo más delicado de esta carpeta porque tiene muchos parámetros. Vale la pena a pesar del ruido porque:

1. Evita inyectar las APIs de todos los sub-hooks en un sub-hook de render (recrea el problema del god-hook).
2. Hace explícitas las deps de `compositeRender` — la lista original de deps del `useCallback` en `hooks.jsx` (líneas ~1,501–1,513 pre-refactor) debe matchear 1:1 los parámetros que `index.jsx` le pasa a estos helpers.
3. Facilita iterar sobre el pipeline de render sin tocar el orquestador.

Si un parámetro empieza a sentirse redundante, probablemente indica que dos helpers pueden fusionarse — no que haya que esconderlo en una closure.
