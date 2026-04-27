# Import de archivos GIF

**Fecha:** 2026-04-27
**Branch:** `feat/import-gif` (rama nueva desde `main`)
**Estado:** spec aprobada — pendiente plan

## Resumen

Permitir importar archivos `.gif` animados al editor. El comportamiento es paralelo al import de `.aseprite` ya existente: el GIF **reemplaza** el proyecto activo, generando N frames del editor (uno por frame del GIF) en una sola capa, preservando las duraciones nativas del archivo.

## Motivación

Actualmente la única vía para abrir una animación externa es `.aseprite`. Los GIFs son el formato más común para sprites animados en internet, y muchos artistas tienen su trabajo histórico en `.gif`. Sin import nativo, el flow alternativo es exportar el GIF como sprite-sheet en una herramienta externa, recortar manualmente cada frame, y reconstruir las duraciones — fricción inaceptable para una operación cotidiana.

## Comportamiento (decidido)

### Modelo de import

- **Reemplaza el proyecto activo** (no merge, no nueva capa). Misma semántica que `handleImportAseprite`: pasa por `handleProjectLoaded` con un `projectData` v2.
- **Tamaño del canvas resultante** = tamaño del GIF (`logicalScreenWidth × logicalScreenHeight`).
- **Una sola capa** llamada con el nombre del archivo sin extensión, `blendMode: 'normal'`, `opacity: 1`, `visible: true`.
- **N frames del editor**, uno por frame del GIF, en orden, `currentFrame: 1`.
- **Duración por frame** = delay nativo del GIF en ms. Si `delay < 20ms` (lo que GIF llama "delay 0" o casi-cero), forzar **100 ms** — convención de Chromium/Firefox/Aseprite para evitar reproducción inestable.
- `frameRate` global = `1000 / promedio(durations)`, redondeado.
- Sin tags, sin slices, sin onion skin.
- Paleta foreground/background = defaults del editor.

### Composición de frames

Un GIF entrega cada frame como un **patch** (sub-rect ImageData con offset `dims.left/top/width/height`) que debe componerse sobre el frame anterior según el **disposal type**:

- `disposalType 0` (no especificado) → tratar como `1`.
- `disposalType 1` (do-not-dispose) → el frame previo permanece como base.
- `disposalType 2` (restore-to-background) → limpiar el área del frame previo a transparente antes de aplicar el siguiente patch.
- `disposalType 3` (restore-to-previous) → restaurar al estado **anterior** al frame previo.

El decoder produce los patches; **PixCalli compone cada frame en un canvas completo (W×H)** respetando disposal y guarda ese canvas plano en el frame del editor. Los patches no se exponen al resto del editor — el resto del código asume canvases del tamaño del documento.

### UI

Nuevo botón `.gif` en el grupo "Import" de la toolbar (`workspaceContainer.jsx` ~ línea 11266), inmediatamente después de `.ase`, con el mismo estilo `grid-control active`:

```jsx
<button
  type="button"
  className="grid-control active"
  title="Importar .gif animado"
  aria-label="Importar GIF"
  onClick={handleImportGif}
>
  <span aria-hidden="true" style={{ fontWeight: 700, fontFamily: 'monospace' }}>.gif</span>
  <p>.gif</p>
</button>
```

Sin diálogos intermedios: un único file picker con `accept=".gif,image/gif"`. Igual que el flow Aseprite.

### Errores

- Archivo no es GIF válido → `alert('No se pudo importar: …')` con el mensaje del decoder. No revierte el proyecto previo (no se llegó a llamar a `handleProjectLoaded`).
- GIF estático (un solo frame) → se importa igual: 1 frame del editor, 1 capa, duración = la regla general (delay del archivo, mínimo 100 ms si `<20ms`).
- GIF con dimensiones absurdas (e.g., > 8192px) → se importa sin warning. Igual que Aseprite. El usuario decide.

## Decisiones técnicas

### Librería de decode: `gifuct-js`

- **Por qué:** decoder puro de GIF (no encode), ~9 KB minificado, mantenido, expone disposal types y delays sin envolverlos. Devuelve frames con `patch` (Uint8ClampedArray RGBA), `dims`, `delay` (cs), `disposalType`.
- **API usada:** `parseGIF(buffer)` → `decompressFrames(parsed, true)` (el `true` activa la generación de patches RGBA listos para `ImageData`).
- **Alternativa descartada:** `omggif` requiere ~3× más glue code para componer patches y no expone disposal types directamente.

### Composición sin worker

La composición de frames se hace en el main thread con `OffscreenCanvas` o `<canvas>` regulares:

- N suele ser pequeño (< 200 frames en GIFs típicos).
- Cada frame es solo un `putImageData` + `drawImage` sobre un canvas acumulador.
- El cuello de botella es el `decompressFrames` (que ya es síncrono y rápido), no la composición.
- Si en el futuro se ven GIFs gigantes, se puede mover a worker — patrón ya existente en `boundsWorker.js`. **Out of scope** para esta entrega.

### Canvas resultante: HTMLCanvasElement (no OffscreenCanvas)

`handleProjectLoaded` y `restoreFromProjectData` esperan `HTMLCanvasElement` en `restoredCanvases`. Mantener consistencia con el resto del pipeline.

## Arquitectura

### Archivos nuevos

#### `src/editorSprites/Workspace/formats/gif.js`

Sigue el patrón de `formats/aseprite.js`. Exporta:

- `loadGifFile(file: File): Promise<GifDocument>` — lee el `File` como `ArrayBuffer`, parsea con `gifuct-js`, compone frames.
- `gifDocToPixcalli(doc: GifDocument): PixcalliShape` — convierte la shape interna del decoder a `{ width, height, layers, frames }`, estructura ya consumida por `restoreFromProjectData`.

```js
// shape de retorno de loadGifFile
{
  width: number,
  height: number,
  framesCount: number,
  layers: [{ id, name, visible: true, opacity: 1, zIndex: 0, blendMode: 'normal' }],
  frames: {
    1: { duration: 100, canvases: { [layerId]: HTMLCanvasElement } },
    2: { ... },
    ...
  },
}
```

### Archivos modificados

#### `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx`

- Importar `loadGifFile` y `gifDocToPixcalli` desde `../formats/gif.js`.
- Nuevo handler `handleImportGif` (~70 líneas), clon estructural reducido de `handleImportAseprite`. Diferencias:
  - `accept` = `.gif,image/gif`.
  - No hay tags ni slices que importar.
  - `migratedFrom: 'gif'` en `projectData.format`.
- Nuevo botón en el grupo de import (líneas ~11266+), justo después del botón `.ase`.

#### `package.json`

- Añadir dependencia `gifuct-js` (última versión estable, `^2.x`).

## Flujo de datos

```
File (.gif)
  │ FileReader.readAsArrayBuffer
  ▼
ArrayBuffer
  │ parseGIF + decompressFrames (gifuct-js)
  ▼
ParsedGif { frames: [{ patch, dims, delay, disposalType }, ...], lsd: { width, height } }
  │ composición secuencial respetando disposal
  ▼
GifDocument { width, height, frames: { N: { duration, canvases: {layerId: HTMLCanvas} } } }
  │ gifDocToPixcalli
  ▼
PixcalliShape { width, height, layers, frames }
  │ construir projectData v2 + restoredCanvases
  ▼
handleProjectLoaded → restoreFromProjectData
  ▼
Editor cargado con el GIF como proyecto activo.
```

## Pseudo-algoritmo de composición

```
restoreCanvas = null   // snapshot para disposal 3
accumCanvas = nuevo canvas W×H transparente

for cada frame f en frames del GIF:
  if f.disposalType === 3:
    restoreCanvas = clonar(accumCanvas)  // ANTES de pintar f

  // aplicar patch (RGBA ya resuelto por el decoder)
  ctx.putImageData(new ImageData(f.patch, f.dims.width, f.dims.height),
                   f.dims.left, f.dims.top)

  // snapshot del canvas compuesto y guardarlo como frame del editor
  guardar clonar(accumCanvas) como frame del editor

  // preparar accumCanvas para el SIGUIENTE frame según disposal del frame ACTUAL
  switch f.disposalType:
    case 0:
    case 1: no hacer nada (accumCanvas se mantiene)
    case 2: clearRect(f.dims) sobre accumCanvas
    case 3: accumCanvas = restoreCanvas
```

Notas:
- `putImageData` ignora alpha-blend; reemplaza píxeles. Eso es correcto para GIF, donde el patch ya viene con transparencia resuelta por el decoder (`decompressFrames(parsed, true)` devuelve RGBA con alpha=0 en píxeles transparentes del LZW).
- "Clonar" un canvas = `new canvas` + `drawImage(src, 0, 0)`. Sin `getImageData/putImageData` (más lento y sin alpha-blend).

## Out of scope

- **Decodificación en worker.** GIFs típicos (<200 frames, <512px) decodean en <100ms en el main thread.
- **Preservar la paleta del GIF en `recentColors`.** El editor regenera paletas al pintar; importar la paleta como base es ruido.
- **Detección/preservación del color "transparent index" del GIF.** El decoder ya lo aplica (alpha=0). El editor trabaja en RGBA full.
- **Re-exportar el GIF importado byte-a-byte idéntico.** Round-trip lossless no es objetivo (re-encoder ya existe en `gifExporter.js` y produce un GIF nuevo de los frames del editor).
- **Drag-and-drop de `.gif` sobre el editor.** Solo file picker. Si en el futuro se quiere DnD, será un follow-up que afecte también `.ase` y `.png`.
- **Diálogo de confirmación "esto sobrescribirá tu proyecto".** Aseprite tampoco lo tiene; mantener consistencia.

## Testing

No hay test runner configurado en el proyecto (ver `CLAUDE.md`). La validación es manual:

1. Importar un GIF animado típico (ej. 64×64, ~12 frames, loop) → ver N frames en la timeline con duraciones correctas y reproducción consistente con el original.
2. Importar un GIF con `disposalType 2` (cada frame se borra) → cada frame del editor debe verse "limpio" sin restos del anterior.
3. Importar un GIF con `disposalType 3` (restore-to-previous) → frames intermedios deben restaurar el estado previo correctamente.
4. Importar un GIF estático (1 frame) → 1 frame de 100ms.
5. Importar un GIF con `delay = 0` → frame de 100ms.
6. Importar un archivo no-GIF (renombrado) → alert con mensaje de error, proyecto previo intacto.
7. Verificar que tras importar, `compositeRender` y `invalidateCache` se llamen — onion skin / preview no deben tener artefactos del proyecto previo.

## Riesgos

- **`gifuct-js` no expone tipos TS.** El proyecto es JS puro, no es bloqueante.
- **Memoria con GIFs grandes.** Un GIF 1024×1024 × 200 frames = ~800 MB en RAM (canvases sin compresión). El comportamiento será lento pero correcto. Mismo riesgo que Aseprite ya tiene; no se mitiga aquí.
- **Disposal type 3 ("restore-to-previous").** Es el caso más raro y difícil de testear. Si el GIF de prueba no usa disposal 3, el bug pasaría sin detectar hasta que un usuario importe uno. Mitigación: incluir un GIF con disposal 3 en el testing manual.
