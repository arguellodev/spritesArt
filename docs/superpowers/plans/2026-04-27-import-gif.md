# Import GIF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir importar archivos `.gif` animados al editor — el GIF reemplaza el proyecto activo, se generan N frames del editor (uno por frame del GIF) en una sola capa, preservando las duraciones nativas.

**Architecture:** Paralelo total al import de `.aseprite`. Nuevo módulo `formats/gif.js` con `loadGifFile()` + `gifDocToPixcalli()`. Nuevo handler `handleImportGif` en `workspaceContainer.jsx` (clon estructural reducido de `handleImportAseprite`). Nuevo botón `.gif` en el grupo de import de la toolbar. La composición de frames respeta los disposal types del GIF; los frames del editor son canvases planos del tamaño del documento.

**Tech Stack:** `gifuct-js` (decoder GIF), `nanoid` (ya en deps, para layer ID), Canvas2D para composición, React 19.

**Spec:** `docs/superpowers/specs/2026-04-27-import-gif-design.md`

---

## Notas de testing

El proyecto **no tiene test runner configurado** (ver `CLAUDE.md`). Las verificaciones por tarea son:
- `npm run lint` (debe pasar sin nuevos errores).
- Smoke test manual al final con `npm run dev` y un GIF real (Task 5).

No se escribirán tests automatizados — sería contradecir las convenciones del proyecto. Cada tarea incluye los criterios manuales/lint específicos.

---

## Task 1: Instalar `gifuct-js`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto)

- [ ] **Step 1: Instalar la dependencia**

Run:
```bash
npm install gifuct-js
```

Expected: instalación exitosa, `gifuct-js` aparece en `dependencies` de `package.json` con versión `^2.x`.

- [ ] **Step 2: Verificar que sigue lintando**

Run:
```bash
npm run lint
```

Expected: PASS (mismos warnings/errors que antes; no nuevos por la dependencia).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add gifuct-js for GIF import"
```

---

## Task 2: Crear `formats/gif.js` con parse + composición + conversión a shape PixCalli

**Files:**
- Create: `src/editorSprites/Workspace/formats/gif.js`

Este archivo es el núcleo del import. Expone dos funciones:
- `loadGifFile(file)` → lee el File, decodea con gifuct-js, **compone** los frames respetando disposal types, devuelve un GifDocument intermedio.
- `gifDocToPixcalli(doc)` → mapea el GifDocument a la shape `{ width, height, layers, frames }` que `restoreFromProjectData` consume (la misma que `asepriteDocToPixcalli`).

- [ ] **Step 1: Crear el archivo con todo el contenido**

Crea `src/editorSprites/Workspace/formats/gif.js` con exactamente este contenido:

```js
// gif.js — parser + composer de archivos .gif animados.
// Usa gifuct-js para decodear; compone los patches por frame respetando
// los disposal types y devuelve canvases planos del tamaño del documento.
//
// Paralelo a formats/aseprite.js (loadAsepriteFile + asepriteDocToPixcalli).

import { parseGIF, decompressFrames } from 'gifuct-js';
import { nanoid } from 'nanoid';

/**
 * @typedef {object} GifComposedFrame
 * @property {HTMLCanvasElement} canvas    Canvas plano del tamaño del documento.
 * @property {number}            duration  Duración en ms (ya con clamp >= 100 si era <20).
 */

/**
 * @typedef {object} GifDocument
 * @property {number}              width
 * @property {number}              height
 * @property {number}              framesCount
 * @property {string}              fileName        Nombre sin extensión (vacío → "GIF").
 * @property {GifComposedFrame[]}  composedFrames  En orden (índice 0 = primer frame).
 */

/**
 * Carga un File .gif y devuelve un GifDocument con frames ya compuestos.
 *
 * @param {File} file
 * @returns {Promise<GifDocument>}
 */
export async function loadGifFile(file) {
  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = parseGIF(buffer);
  } catch (err) {
    throw new Error(`Archivo no es un GIF válido: ${err.message ?? err}`);
  }

  // decompressFrames(true) → cada frame trae .patch (Uint8ClampedArray RGBA),
  // .dims {left,top,width,height}, .delay (ms), .disposalType (0|1|2|3).
  const rawFrames = decompressFrames(parsed, true);
  if (!rawFrames.length) {
    throw new Error('GIF no contiene frames decodificables');
  }

  const width = parsed.lsd.width;
  const height = parsed.lsd.height;
  const composedFrames = composeFrames(rawFrames, width, height);

  const fileName = file.name.replace(/\.gif$/i, '') || 'GIF';

  return {
    width,
    height,
    framesCount: composedFrames.length,
    fileName,
    composedFrames,
  };
}

/**
 * Compone los frames patch-by-patch sobre un canvas acumulador del tamaño
 * del documento, respetando los disposal types del GIF. Devuelve un canvas
 * plano (snapshot) por frame.
 *
 * disposalType:
 *   0 / 1 → do-not-dispose (acumulador se mantiene tras pintar el frame)
 *   2     → restore-to-background (limpiar el área del frame antes del siguiente)
 *   3     → restore-to-previous (snapshot ANTES de pintar; restaurar después)
 *
 * @param {Array} rawFrames  Frames de gifuct-js con patch/dims/delay/disposalType.
 * @param {number} width
 * @param {number} height
 * @returns {GifComposedFrame[]}
 */
function composeFrames(rawFrames, width, height) {
  const accum = makeCanvas(width, height);
  const accumCtx = accum.getContext('2d');
  // putImageData NO compone con alpha: reemplaza píxeles. Por eso
  // pasamos el patch por un canvas temporal y usamos drawImage.
  let restoreSnapshot = null;

  const out = [];

  for (const f of rawFrames) {
    if (f.disposalType === 3) {
      restoreSnapshot = cloneCanvas(accum);
    }

    // Patch RGBA listo (gifuct-js ya resolvió el transparent index).
    const patchCanvas = makeCanvas(f.dims.width, f.dims.height);
    const imageData = new ImageData(
      new Uint8ClampedArray(f.patch),
      f.dims.width,
      f.dims.height,
    );
    patchCanvas.getContext('2d').putImageData(imageData, 0, 0);
    accumCtx.drawImage(patchCanvas, f.dims.left, f.dims.top);

    // Snapshot del estado actual = frame del editor.
    const snapshot = cloneCanvas(accum);
    out.push({
      canvas: snapshot,
      duration: clampDelay(f.delay),
    });

    // Preparar accumCanvas para el SIGUIENTE frame según disposal del actual.
    if (f.disposalType === 2) {
      accumCtx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
    } else if (f.disposalType === 3 && restoreSnapshot) {
      accumCtx.clearRect(0, 0, width, height);
      accumCtx.drawImage(restoreSnapshot, 0, 0);
    }
    // disposalType 0 o 1 → no hacer nada (acumulador se mantiene).
  }

  return out;
}

/**
 * Clamp del delay del GIF.
 * gifuct-js entrega .delay en ms (ya multiplicado x10 desde los cs del archivo).
 * Algunos GIFs declaran delay 0 (o casi 0), que los browsers renderizan a ~100ms
 * para evitar reproducción inestable. Aplicamos la misma regla.
 *
 * @param {number} delayMs
 * @returns {number}
 */
function clampDelay(delayMs) {
  if (!Number.isFinite(delayMs) || delayMs < 20) return 100;
  return Math.round(delayMs);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function cloneCanvas(src) {
  const c = makeCanvas(src.width, src.height);
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/**
 * Convierte un GifDocument a la shape consumida por restoreFromProjectData:
 *   { width, height, layers, frames: { [n]: { duration, canvases: { [layerId]: canvas } } } }
 *
 * Los frames se indexan desde 0 (igual que asepriteDocToPixcalli).
 *
 * @param {GifDocument} doc
 * @returns {{ width: number, height: number, layers: object[], frames: object }}
 */
export function gifDocToPixcalli(doc) {
  const layerId = `layer_${nanoid(8)}`;
  const layers = [{
    id: layerId,
    name: doc.fileName,
    visible: true,
    opacity: 1,
    zIndex: 0,
    blendMode: 'normal',
  }];

  const frames = {};
  doc.composedFrames.forEach((entry, i) => {
    frames[i] = {
      duration: entry.duration,
      canvases: { [layerId]: entry.canvas },
    };
  });

  return {
    width: doc.width,
    height: doc.height,
    layers,
    frames,
  };
}
```

- [ ] **Step 2: Verificar que linta**

Run:
```bash
npm run lint
```

Expected: PASS sin nuevos errores en `formats/gif.js`. Si hay warnings de `no-unused-vars`, revisa el JSDoc — no debe haber imports muertos. La regla del proyecto ignora identificadores que empiezan con mayúscula o `_` (`varsIgnorePattern: '^[A-Z_]'`).

- [ ] **Step 3: Verificar que el build pasa**

Run:
```bash
npm run build
```

Expected: build exitoso. Confirma que Vite resuelve `gifuct-js` correctamente.

- [ ] **Step 4: Commit**

```bash
git add src/editorSprites/Workspace/formats/gif.js
git commit -m "feat(formats): add gif.js — decode + compose con disposal types"
```

---

## Task 3: Wire `handleImportGif` en `workspaceContainer.jsx`

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx:135` (añadir import)
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx:850` (insertar handler tras `handleImportAseprite`)

- [ ] **Step 1: Añadir el import al lado del de aseprite**

Encuentra esta línea (línea ~135):

```js
import { loadAsepriteFile, asepriteDocToPixcalli } from "../formats/aseprite";
```

Añade **después** de ella:

```js
import { loadGifFile, gifDocToPixcalli } from "../formats/gif";
```

- [ ] **Step 2: Insertar el handler `handleImportGif`**

Encuentra el final de `handleImportAseprite` (línea ~850, justo antes del bloque `// --- Importar imagen como capa de referencia ---`):

```js
    };
    input.click();
  }, [handleProjectLoaded]);

  // --- Importar imagen como capa de referencia ---
```

Inserta **entre** `}, [handleProjectLoaded]);` y `// --- Importar imagen como capa de referencia ---` el siguiente bloque:

```js

  // --- Importar .gif animado ---
  // Abre file picker, decodea con loadGifFile (gifuct-js + composición de
  // disposal types), y aplica el documento al canvas mediante
  // restoreFromProjectData (mismo camino que cargar un .pixcalli o .ase).
  // Modelo: una sola capa, N frames del editor (uno por frame del GIF),
  // duraciones nativas del archivo.
  const handleImportGif = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gif,image/gif';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const doc = await loadGifFile(file);
        const pix = gifDocToPixcalli(doc);

        // Construir el payload con la shape que restoreFromProjectData espera.
        const framesResumeShape = {
          frames: {},
          metadata: { defaultFrameDuration: 100, frameRate: 10 },
          computed: { frameSequence: [] },
        };
        const restoredCanvases = {};

        for (const [frameKeyStr, frameData] of Object.entries(pix.frames)) {
          const frameN = Number(frameKeyStr);
          framesResumeShape.frames[frameN] = {
            duration: frameData.duration ?? 100,
            tags: [],
          };
          framesResumeShape.computed.frameSequence.push(frameN);
          for (const layer of pix.layers) {
            const celCanvas = frameData.canvases[layer.id];
            if (celCanvas) {
              restoredCanvases[`frame_${frameN}_${layer.id}`] = celCanvas;
            } else {
              const empty = document.createElement('canvas');
              empty.width = pix.width;
              empty.height = pix.height;
              restoredCanvases[`frame_${frameN}_${layer.id}`] = empty;
            }
          }
        }

        // frameRate global a partir del promedio de duraciones reales.
        const totalMs = Object.values(framesResumeShape.frames)
          .reduce((sum, fr) => sum + (fr.duration ?? 100), 0);
        const avgMs = totalMs / Math.max(1, Object.keys(framesResumeShape.frames).length);
        const frameRate = Math.max(1, Math.round(1000 / avgMs));
        framesResumeShape.metadata.frameRate = frameRate;

        const projectData = {
          format: { name: 'PixCalli Studio', version: '2.0.0', migratedFrom: 'gif' },
          metadata: { title: doc.fileName },
          viewport: {
            zoom: 1,
            panOffset: { x: 0, y: 0 },
            activeLayerId: pix.layers[0]?.id ?? null,
            currentFrame: framesResumeShape.computed.frameSequence[0] ?? 1,
          },
          animation: { defaultFrameDuration: 100, frameRate },
          framesResume: framesResumeShape,
          layers: pix.layers.map((l) => ({
            id: l.id,
            name: l.name,
            visible: l.visible,
            opacity: l.opacity ?? 1,
            zIndex: l.zIndex ?? 0,
            blendMode: l.blendMode ?? 'normal',
            isGroupLayer: false,
            parentLayerId: null,
          })),
          canvases: {},
          palette: {
            foreground: { r: 0, g: 0, b: 0, a: 255 },
            background: { r: 255, g: 255, b: 255, a: 255 },
            fillColor: { r: 0, g: 0, b: 0, a: 255 },
            borderColor: { r: 0, g: 0, b: 0, a: 255 },
            recentColors: [],
          },
          onionSkin: { enabled: false, settings: null, framesConfig: null },
          dimensions: { width: pix.width, height: pix.height },
        };

        await handleProjectLoaded({ success: true, projectData, restoredCanvases });

        invalidateCacheRef.current?.();
        compositeRenderRef.current?.();

        console.log(
          `[gif] Import OK — ${doc.framesCount} frames, ${doc.width}×${doc.height}, ` +
          `frameRate≈${frameRate}fps`,
        );
      } catch (err) {
        console.error('Error importando .gif:', err);
        alert(`No se pudo importar el GIF: ${err.message ?? err}`);
      }
    };
    input.click();
  }, [handleProjectLoaded]);
```

- [ ] **Step 3: Verificar que linta**

Run:
```bash
npm run lint
```

Expected: PASS. Si aparece warning de `react-hooks/exhaustive-deps` por las refs `invalidateCacheRef` / `compositeRenderRef`, ignóralo — `handleImportAseprite` tiene la misma estructura y los refs son estables por diseño (ver `useEffect` en línea ~609 que sincroniza `compositeRenderRef.current` con `compositeRender`).

- [ ] **Step 4: Verificar que el build pasa**

Run:
```bash
npm run build
```

Expected: build exitoso, sin errores de import.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx
git commit -m "feat(import): handler handleImportGif (paralelo a aseprite)"
```

---

## Task 4: Añadir botón `.gif` a la toolbar de import

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx:11267` (insertar botón nuevo después del botón `.ase`)

- [ ] **Step 1: Insertar el botón en el grupo de import**

Encuentra el botón `.ase` (línea ~11267):

```jsx
            <button
              type="button"
              className="grid-control active"
              title="Importar .ase / .aseprite"
              aria-label="Importar Aseprite"
              onClick={handleImportAseprite}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, fontFamily: 'monospace' }}>.ase</span>
              <p>.ase</p>
            </button>
```

Inserta **inmediatamente después** del `</button>` de cierre y antes del siguiente `<button>` (que es el de `IMG / Ref`):

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

- [ ] **Step 2: Verificar que linta**

Run:
```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Verificar que el build pasa**

Run:
```bash
npm run build
```

Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx
git commit -m "feat(ui): boton .gif en toolbar de import"
```

---

## Task 5: Smoke test manual end-to-end

**Files:** ninguno (solo verificación).

**Setup:** Necesitas 4 GIFs de prueba. Si no tienes a mano:
- GIF típico animado: cualquiera de [tenor.com](https://tenor.com) o [giphy.com](https://giphy.com) (descargar el archivo `.gif` real, no el `.mp4`).
- GIF estático: exportar un PNG como GIF en cualquier herramienta, o renombrar uno animado y editarlo a 1 frame.
- GIF con disposal type 2: la mayoría de GIFs animados con fondo transparente usan disposal 2.
- GIF con disposal type 3: más raro; puedes encontrar uno en https://onlinegiftools.com/ generando uno con "leave background unchanged".

Si solo dispones de uno o dos, prioriza el caso 1 (típico) y el 6 (archivo no-GIF).

- [ ] **Step 1: Levantar el dev server**

Run:
```bash
npm run dev
```

Expected: Vite arranca en `http://localhost:5173`. Abre esa URL en Chrome/Edge (no Firefox — el editor usa File System Access API en otros flujos, aunque el import de GIF no lo requiere).

- [ ] **Step 2: Crear o abrir un proyecto**

Crea un proyecto nuevo de cualquier tamaño (e.g., 32×32) para tener un punto de partida.

- [ ] **Step 3: Test 1 — GIF animado típico**

Click en el botón `.gif` en la toolbar (grupo de import, después de `.ase`).
Selecciona un GIF animado de prueba (ej. 64×64 con ~12 frames).

Expected:
- El editor se reinicia con el tamaño exacto del GIF.
- La timeline muestra N frames (uno por frame del GIF).
- Hay **una sola capa** llamada como el archivo (sin `.gif`).
- Pulsar Play reproduce la animación a velocidad consistente con el GIF original.
- En consola: `[gif] Import OK — N frames, WxH, frameRate≈Xfps`.

- [ ] **Step 4: Test 2 — GIF estático**

Importa un GIF de un solo frame.

Expected:
- 1 frame en la timeline.
- 1 capa con la imagen.
- Duración del frame respeta el delay del archivo (o 100ms si era 0).

- [ ] **Step 5: Test 3 — Disposal type 2 (restore-to-background)**

Importa un GIF animado con fondo transparente (ej. un loader spinner).

Expected:
- Cada frame se ve "limpio" sin restos del frame anterior en las áreas que deberían estar transparentes.
- Si ves residuos visuales del frame previo, hay un bug en el `clearRect` post-disposal-2 — revisar `composeFrames` en `formats/gif.js`.

- [ ] **Step 6: Test 4 — Disposal type 3 (restore-to-previous)**

Importa un GIF con disposal 3 (si tienes uno).

Expected:
- Frames intermedios restauran correctamente al estado anterior. No hay rastros incrementales acumulándose.

Si no consigues un GIF con disposal 3, **anótalo como pendiente** — no es bloqueante para mergear, pero debe verificarse antes de release.

- [ ] **Step 7: Test 5 — Archivo no-GIF**

Renombra un PNG/TXT a `.gif` e intenta importarlo.

Expected:
- Aparece un `alert` con `No se pudo importar el GIF: …`.
- El proyecto previo permanece **intacto** (no se reinicia el editor).

- [ ] **Step 8: Test 6 — Verificar persistencia post-import**

Tras importar un GIF, dibuja un trazo en cualquier frame y luego cambia de frame y vuelve.

Expected:
- El trazo se conserva en el frame correcto.
- No hay artefactos del proyecto previo (onion skin, preview, composite render).

Si ves artefactos visuales, falta una invalidación de cache — verificar que `invalidateCacheRef.current?.()` y `compositeRenderRef.current?.()` se llamaron tras `handleProjectLoaded` (paralelo a aseprite).

- [ ] **Step 9: Documentar resultados (no commit)**

En el resumen final del trabajo, indica:
- Qué tests pasaron / fallaron.
- Qué casos no se pudieron probar (ej. disposal 3 si no se consiguió GIF de prueba).
- Cualquier comportamiento inesperado.

No hay commit en este task — es pura verificación.

---

## Self-review (post-plan, fix inline si encuentras issues)

1. **Spec coverage:**
   - Reemplaza proyecto activo → Task 3 usa `handleProjectLoaded` (mismo camino que aseprite). ✅
   - Tamaño canvas = tamaño GIF → `parsed.lsd.width/height` en Task 2. ✅
   - Una sola capa → Task 2 (`gifDocToPixcalli` crea un solo layer). ✅
   - N frames con duración nativa → Task 2 (`composedFrames`). ✅
   - Clamp delay <20ms → 100ms → Task 2 (`clampDelay`). ✅
   - frameRate global = 1000/avg(duration) → Task 3. ✅
   - Composición con disposal types → Task 2 (`composeFrames`). ✅
   - UI: botón `.gif` después de `.ase` → Task 4. ✅
   - Errores → alert + proyecto intacto → Task 3 (catch + no llamada a `handleProjectLoaded`). ✅
   - Out of scope (worker, paleta, transparent index, DnD, confirm dialog) → no implementados. ✅

2. **Placeholder scan:** Sin "TBD"/"TODO" sin contenido. Code blocks completos en cada step. ✅

3. **Type consistency:**
   - `loadGifFile` retorna `GifDocument` con `composedFrames`, consumido por `gifDocToPixcalli` que usa `doc.composedFrames`. ✅
   - `gifDocToPixcalli` retorna `{width, height, layers, frames}`, `handleImportGif` usa `pix.width`, `pix.height`, `pix.layers`, `pix.frames`. ✅
   - Layer fields (`id, name, visible, opacity, zIndex, blendMode`) coinciden con los que `restoreFromProjectData` y los demás importers consumen. ✅
   - Frame index 0-based en `gifDocToPixcalli`, `handleImportGif` usa `Number(frameKeyStr)` que preserva el indexing — match con `asepriteDocToPixcalli`. ✅

Sin issues encontrados.

---

## Resumen de archivos

| Archivo | Acción | Tasks |
|---|---|---|
| `package.json` | Modificar (add `gifuct-js`) | 1 |
| `package-lock.json` | Auto | 1 |
| `src/editorSprites/Workspace/formats/gif.js` | Crear | 2 |
| `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` | Modificar (3 inserciones: import, handler, botón) | 3, 4 |

**Commits esperados:** 4 (uno por Task 1–4). Task 5 no commitea.
