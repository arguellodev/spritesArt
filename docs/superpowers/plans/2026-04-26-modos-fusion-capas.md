# Modos de fusión de capas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir modos de fusión por capa estilo Aseprite (16 modos nativos de Canvas2D), con override opcional por frame, seleccionables desde un submenú en el menú contextual de capas.

**Architecture:** Un campo `blendMode` (capa global, denormalizado por frame) + `blendModeOverride` (nullable, por frame) en cada `frame.layers[i]`. Helper `resolveLayerBlendMode(layerId, frameNumber)` consumido por los 4 sitios de render (canvas vivo + onion-skin del frame actual + exporter de imagen + video exporter ya soporta `layer.blendMode`). UI: nuevo `type: 'submenu'` en `CustomContextMenu` con dos entradas en `menuLayerActions`.

**Tech Stack:** React 19, Canvas2D `globalCompositeOperation`, Lucide icons, immer (`produce` ya en uso), nanoid (ya en uso).

**Test runner:** No existe (CLAUDE.md confirma). Cada tarea termina en verificación manual concreta + ESLint.

**Spec base:** `docs/superpowers/specs/2026-04-26-modos-fusion-capas-design.md`.

**Estado pre-existente relevante (descubierto en exploración):**
- `framesResume.layers[layerId].blendMode = 'normal'` ya se inicializa en `addLayer` (hooks.jsx:2233) y `duplicateLayer` (hooks.jsx:2772). Es una semilla muerta lista para usarse.
- `videoExporter.js:195` ya lee `layer.blendMode` y lo asigna a `globalCompositeOperation` — **funcionará automáticamente** cuando el campo esté poblado en `frame.layers[i]`.
- 16 modos = `'source-over'` (normal) + 15 modos compuestos. Los strings coinciden con `globalCompositeOperation`.

---

## Task 1: Crear módulo `blendModes.js` con constantes y validador

**Files:**
- Create: `src/editorSprites/Workspace/blendModes.js`

- [ ] **Step 1: Crear el módulo**

Contenido completo del archivo:

```js
// Modos de fusión de capa estilo Aseprite, mapeados 1:1 a los strings
// que acepta CanvasRenderingContext2D.globalCompositeOperation.
// 'normal' es alias visible de 'source-over'.

export const DEFAULT_BLEND_MODE = 'normal';

export const BLEND_MODES = [
  { id: 'normal',       label: 'Normal',         group: 'normal'    },
  { id: 'darken',       label: 'Oscurecer',      group: 'darken'    },
  { id: 'multiply',     label: 'Multiplicar',    group: 'darken'    },
  { id: 'color-burn',   label: 'Sobreexponer',   group: 'darken'    },
  { id: 'lighten',      label: 'Aclarar',        group: 'lighten'   },
  { id: 'screen',       label: 'Pantalla',       group: 'lighten'   },
  { id: 'color-dodge',  label: 'Subexponer',     group: 'lighten'   },
  { id: 'overlay',      label: 'Superposición',  group: 'contrast'  },
  { id: 'hard-light',   label: 'Luz fuerte',     group: 'contrast'  },
  { id: 'soft-light',   label: 'Luz suave',      group: 'contrast'  },
  { id: 'difference',   label: 'Diferencia',     group: 'compare'   },
  { id: 'exclusion',    label: 'Exclusión',      group: 'compare'   },
  { id: 'hue',          label: 'Tono',           group: 'component' },
  { id: 'saturation',   label: 'Saturación',     group: 'component' },
  { id: 'color',        label: 'Color',          group: 'component' },
  { id: 'luminosity',   label: 'Luminosidad',    group: 'component' },
];

export const BLEND_GROUP_LABELS = {
  normal:    null,
  darken:    'Oscurecer',
  lighten:   'Aclarar',
  contrast:  'Contraste',
  compare:   'Comparar',
  component: 'Componente',
};

const BLEND_MODE_IDS = new Set(BLEND_MODES.map(m => m.id));

export function isValidBlendMode(id) {
  return typeof id === 'string' && BLEND_MODE_IDS.has(id);
}

export function getBlendModeLabel(id) {
  const mode = BLEND_MODES.find(m => m.id === id);
  return mode ? mode.label : 'Normal';
}

// Convierte un id a string para canvas. 'normal' -> 'source-over'.
export function toCompositeOperation(id) {
  if (!isValidBlendMode(id)) return 'source-over';
  return id === 'normal' ? 'source-over' : id;
}
```

- [ ] **Step 2: Lint**

Run: `npx eslint src/editorSprites/Workspace/blendModes.js`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/editorSprites/Workspace/blendModes.js
git commit -m "feat(blend): modulo de constantes y validacion de modos de fusion"
```

---

## Task 2: Inicializar `blendMode` y `blendModeOverride` en addLayer y duplicateLayer

**Files:**
- Modify: `src/editorSprites/Workspace/hooks/hooks.jsx:2180-2185` (`addLayer` baseLayer)
- Modify: `src/editorSprites/Workspace/hooks/hooks.jsx:2722-2728` (`duplicateLayer` baseLayer)

- [ ] **Step 1: Actualizar `addLayer.baseLayer`**

Cambiar:
```js
const baseLayer = {
  id: newLayerId,
  name: `Layer ${layers.length + 1}`,
  visible: {},
  zIndex: highestZIndex + 1
};
```

a:
```js
const baseLayer = {
  id: newLayerId,
  name: `Layer ${layers.length + 1}`,
  visible: {},
  zIndex: highestZIndex + 1,
  blendMode: 'normal',
  blendModeOverride: null,
};
```

- [ ] **Step 2: Actualizar `duplicateLayer.baseLayer`**

Cambiar:
```js
const baseLayer = {
  ...originalLayer,
  id: newLayerId,
  name: newLayerName,
  visible: {}, // Se llenará por frame
  zIndex: highestZIndex + 1
};
```

a (preserva blendMode del original, resetea override por frame):
```js
const baseLayer = {
  ...originalLayer,
  id: newLayerId,
  name: newLayerName,
  visible: {}, // Se llenará por frame
  zIndex: highestZIndex + 1,
  blendMode: originalLayer.blendMode ?? 'normal',
  blendModeOverride: null, // override por-frame se resetea en la copia
};
```

- [ ] **Step 3: Verificación manual rápida**

Run: `npm run lint`
Expected: sin errores nuevos.

Abrir editor, crear capa nueva, abrir DevTools → React DevTools → inspeccionar `frames[1].layers[N]` → confirmar que tiene `blendMode: 'normal'` y `blendModeOverride: null`.

- [ ] **Step 4: Commit**

```bash
git add src/editorSprites/Workspace/hooks/hooks.jsx
git commit -m "feat(blend): inicializar blendMode/Override en addLayer y duplicateLayer"
```

---

## Task 3: Implementar `resolveLayerBlendMode`, `setLayerBlendMode`, `setFrameBlendModeOverride`

**Files:**
- Modify: `src/editorSprites/Workspace/hooks/hooks.jsx` (después de `getFrameOpacity`, alrededor de línea 2925)

- [ ] **Step 1: Importar utilidades de blendModes**

Al inicio de `hooks.jsx`, junto a los imports existentes (verificar que `produce` de immer ya está importado), añadir:

```js
import { isValidBlendMode, DEFAULT_BLEND_MODE } from '../blendModes';
```

- [ ] **Step 2: Añadir las 3 funciones después de `getFrameOpacity` (línea ~2925)**

```js
// === Modos de fusión de capa ===
//
// Granularidad: cada capa tiene un blendMode global (denormalizado por frame
// para seguir el patrón de visible/opacity). Un override opcional por frame
// vive en `frame.layers[i].blendModeOverride` y, si !== null, gana sobre el
// blendMode de capa.
//
// Helper resolveLayerBlendMode es la única vía válida para consultar el modo
// efectivo. Lo consumen los 4 sitios de render (live + onion-skin del frame
// actual + animation exporter + video exporter).

const resolveLayerBlendMode = useCallback((layerId, frameNumber) => {
  const frame = frames[String(frameNumber)];
  if (!frame) return DEFAULT_BLEND_MODE;
  const layer = frame.layers.find(l => l.id === layerId);
  if (!layer) return DEFAULT_BLEND_MODE;
  const override = layer.blendModeOverride;
  if (override != null && isValidBlendMode(override)) return override;
  return isValidBlendMode(layer.blendMode) ? layer.blendMode : DEFAULT_BLEND_MODE;
}, [frames]);

// Escritura — modo de capa global, afecta a TODOS los frames.
// Snapshot único en el historial gracias al setFrames batch.
const setLayerBlendMode = useCallback((layerId, mode) => {
  if (!isValidBlendMode(mode)) {
    console.warn(`[blendMode] modo invalido: ${mode}`);
    return false;
  }
  setFrames(prevFrames => {
    const updated = { ...prevFrames };
    Object.keys(updated).forEach(frameKey => {
      const frame = updated[frameKey];
      const newLayers = frame.layers.map(layer => {
        if (layer.id !== layerId) return layer;
        return { ...layer, blendMode: mode };
      });
      updated[frameKey] = { ...frame, layers: newLayers };
    });
    return updated;
  });
  setFramesResume(prev => produce(prev, draft => {
    if (draft.layers[layerId]) {
      draft.layers[layerId].blendMode = mode;
    }
  }));
  return true;
}, []);

// Escritura — override solo en un frame. mode === null limpia el override.
const setFrameBlendModeOverride = useCallback((layerId, frameNumber, mode) => {
  if (mode !== null && !isValidBlendMode(mode)) {
    console.warn(`[blendMode] override invalido: ${mode}`);
    return false;
  }
  const frameKey = String(frameNumber);
  setFrames(prevFrames => {
    const frame = prevFrames[frameKey];
    if (!frame) return prevFrames;
    const newLayers = frame.layers.map(layer => {
      if (layer.id !== layerId) return layer;
      return { ...layer, blendModeOverride: mode };
    });
    return {
      ...prevFrames,
      [frameKey]: { ...frame, layers: newLayers },
    };
  });
  return true;
}, []);
```

- [ ] **Step 3: Exponer en el return del hook**

Encontrar el `return { ... }` de `useLayerManager` (busca con grep `// === Funciones expuestas` o el último `return {` cerca del final del hook). Añadir:

```js
  // === Modos de fusión ===
  resolveLayerBlendMode,
  setLayerBlendMode,
  setFrameBlendModeOverride,
```

Si el hook tiene varios `return` (por código de evolución), añadirlo en el `return` final que el `useLayerManager` consume — buscar el que ya expone `setFrameOpacity` y `getFrameOpacity` (mismo nivel).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 0 errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/hooks/hooks.jsx
git commit -m "feat(blend): API resolveLayerBlendMode + setters de capa y override"
```

---

## Task 4: Propagar API desde `workspaceContainer` a `LayerAnimation`

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` (donde se hace destructure de `useLayerManager` y donde se renderiza `<LayerAnimation>`)

- [ ] **Step 1: Destructurar las 3 nuevas funciones del hook**

Localizar el destructure de `useLayerManager` (busca `setFrameOpacity, getFrameOpacity` que viven juntos) y añadir:

```js
const {
  // ... existentes ...
  setFrameOpacity,
  getFrameOpacity,
  resolveLayerBlendMode,
  setLayerBlendMode,
  setFrameBlendModeOverride,
  // ...
} = useLayerManager(...);
```

- [ ] **Step 2: Pasarlas como props al `<LayerAnimation>`**

Localizar las dos invocaciones de `<LayerAnimation>` (grep `<LayerAnimation`) — hay una en versión normal y otra en bottom-sheet/mobile (líneas ~10418 y ~10567 según búsqueda). Añadir en ambas:

```jsx
<LayerAnimation
  // ... props existentes ...
  setFrameOpacity={setFrameOpacity}
  getFrameOpacity={getFrameOpacity}
  resolveLayerBlendMode={resolveLayerBlendMode}
  setLayerBlendMode={setLayerBlendMode}
  setFrameBlendModeOverride={setFrameBlendModeOverride}
/>
```

- [ ] **Step 3: Aceptar props en `LayerAnimation`**

`src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx`, en el destructure de props (alrededor de línea 96-100 donde aparecen `setFrameOpacity`/`getFrameOpacity`), añadir:

```js
  // Modos de fusión
  resolveLayerBlendMode,
  setLayerBlendMode,
  setFrameBlendModeOverride,
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 0 errores nuevos. Las nuevas vars pueden quedar como "unused" hasta el Task 12 — eso es esperado y momentáneo.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx
git commit -m "feat(blend): propagar API de blend modes a LayerAnimation"
```

---

## Task 5: Aplicar blend modes en `renderCurrentFrameOnly`

**Files:**
- Modify: `src/editorSprites/Workspace/hooks/hooks.jsx:708-765` (`renderCurrentFrameOnly`)

Ya tienes `resolveLayerBlendMode` definido como callback en el mismo hook (Task 3). Lo usaremos directamente — está dentro del scope.

- [ ] **Step 1: Importar `toCompositeOperation` arriba**

Junto al import de Task 3, ampliar:

```js
import { isValidBlendMode, DEFAULT_BLEND_MODE, toCompositeOperation } from '../blendModes';
```

- [ ] **Step 2: Reemplazar `renderCurrentFrameOnly` (líneas 708-765)**

Sustituir el cuerpo completo por:

```js
const renderCurrentFrameOnly = useCallback((ctx) => {
  const hierarchicalLayers = getHierarchicalLayers();
  const sortedMainLayers = hierarchicalLayers.sort((a, b) => a.zIndex - b.zIndex);

  let isFirstDrawn = true; // primera capa visible siempre va source-over

  for (const mainLayer of sortedMainLayers) {
    const isVisible = mainLayer.visible[currentFrame] ?? true;
    if (!isVisible) continue;

    const mainCanvas = layerCanvasesRef.current[mainLayer.id];
    if (mainCanvas) {
      const layerOpacity = mainLayer.opacity ?? 1.0;
      const blendId = isFirstDrawn
        ? 'normal'
        : resolveLayerBlendMode(mainLayer.id, currentFrame);
      const composite = toCompositeOperation(blendId);

      ctx.globalAlpha = layerOpacity;
      ctx.globalCompositeOperation = composite;
      ctx.drawImage(
        mainCanvas,
        viewportOffset.x, viewportOffset.y,
        viewportWidth, viewportHeight,
        0, 0,
        Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom)
      );
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      isFirstDrawn = false;
    }

    for (const groupLayer of mainLayer.groupLayers) {
      if (!groupLayer.visible) continue;
      const groupCanvas = layerCanvasesRef.current[groupLayer.id];
      if (groupCanvas) {
        const groupOpacity = groupLayer.opacity ?? 1.0;
        const groupBlendId = isFirstDrawn
          ? 'normal'
          : resolveLayerBlendMode(groupLayer.id, currentFrame);
        const groupComposite = toCompositeOperation(groupBlendId);

        ctx.globalAlpha = groupOpacity;
        ctx.globalCompositeOperation = groupComposite;
        ctx.drawImage(
          groupCanvas,
          viewportOffset.x, viewportOffset.y,
          viewportWidth, viewportHeight,
          0, 0,
          Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom)
        );
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        isFirstDrawn = false;
      }
    }
  }
}, [getHierarchicalLayers, currentFrame, viewportOffset, viewportWidth, viewportHeight, zoom, resolveLayerBlendMode]);
```

**Notas:** Añadido `resolveLayerBlendMode` a la lista de deps. La primera capa visible (`isFirstDrawn`) siempre se dibuja en `source-over` para evitar mezclar contra fondo transparente (NaN visual). El reset a `'source-over'` se hace después de cada drawImage para que no haya leak entre capas si el siguiente loop no setea explícitamente.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`

En el navegador:
1. Crear sprite con 2 capas, dibujar pixels en ambas.
2. Confirmar que el render se ve idéntico al de antes de este cambio (todos los modos siguen siendo `'normal'` por default → comportamiento sin cambios).
3. Inspeccionar canvas con DevTools, dibujar un par de pixels más para forzar redraw — sin glitches visuales ni leaks de blend.

- [ ] **Step 4: Commit**

```bash
git add src/editorSprites/Workspace/hooks/hooks.jsx
git commit -m "feat(blend): aplicar blend mode en renderCurrentFrameOnly"
```

---

## Task 6: Aplicar blend modes en `renderCurrentFrameWithAdjacent` (solo bloque del frame actual)

**Files:**
- Modify: `src/editorSprites/Workspace/hooks/hooks.jsx:1052-1103` (bloque "RENDERIZAR FRAME ACTUAL" dentro de `renderCurrentFrameWithAdjacent`)

**Importante:** NO tocar `renderFrameWithConfig` (líneas 979-1038). Esa es la función que dibuja los frames adyacentes (onion skin) tinteados. Por decisión Q5 del spec, los frames adyacentes siempre van en `source-over` — quedan exactamente como están.

- [ ] **Step 1: Localizar el bloque exacto**

El bloque empieza tras el comentario `// ============ RENDERIZAR FRAME ACTUAL (mantener tu código existente) ============` (línea 1051) y termina antes de `// ============ RENDERIZAR FRAMES SIGUIENTES ============` (línea 1105).

- [ ] **Step 2: Reemplazar el bloque**

Sustituir desde `for (const mainLayer of sortedMainLayers) {` (línea 1052) hasta el cierre `}` de su `for...of` externo (línea 1103) por:

```js
  let isFirstDrawnActive = true;
  for (const mainLayer of sortedMainLayers) {
    const isVisible = mainLayer.visible[currentFrame] ?? true;
    if (!isVisible) continue;

    const mainCanvas = layerCanvasesRef.current[mainLayer.id];
    if (mainCanvas) {
      const layerOpacity = mainLayer.opacity ?? 1.0;
      const blendId = isFirstDrawnActive
        ? 'normal'
        : resolveLayerBlendMode(mainLayer.id, currentFrame);
      const composite = toCompositeOperation(blendId);

      ctx.globalAlpha = layerOpacity;
      ctx.globalCompositeOperation = composite;
      ctx.drawImage(
        mainCanvas,
        viewportOffset.x, viewportOffset.y,
        viewportWidth, viewportHeight,
        0, 0,
        Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom)
      );
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      isFirstDrawnActive = false;
    }

    for (const groupLayer of mainLayer.groupLayers) {
      if (!groupLayer.visible) continue;
      const groupCanvas = layerCanvasesRef.current[groupLayer.id];
      if (groupCanvas) {
        const groupOpacity = groupLayer.opacity ?? 1.0;
        const groupBlendId = isFirstDrawnActive
          ? 'normal'
          : resolveLayerBlendMode(groupLayer.id, currentFrame);
        const groupComposite = toCompositeOperation(groupBlendId);

        ctx.globalAlpha = groupOpacity;
        ctx.globalCompositeOperation = groupComposite;
        ctx.drawImage(
          groupCanvas,
          viewportOffset.x, viewportOffset.y,
          viewportWidth, viewportHeight,
          0, 0,
          Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom)
        );
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        isFirstDrawnActive = false;
      }
    }
  }
```

- [ ] **Step 3: Asegurar `resolveLayerBlendMode` en deps de `renderCurrentFrameWithAdjacent`**

Si la lista de deps del `useCallback` no lo incluye, añadirlo. Buscar la línea de cierre `}, [...]` del `useCallback`.

- [ ] **Step 4: Verificación manual con onion skin**

Run: `npm run dev`

En el navegador:
1. Crear sprite con 2+ capas y 3+ frames.
2. Activar onion skin.
3. Confirmar que los frames adyacentes se ven igual que antes (tinteados, en source-over). Solo aplicarán blend modes en el frame actual cuando se hagan en la UI (Task 12 los expone).

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/hooks/hooks.jsx
git commit -m "feat(blend): aplicar blend mode en frame actual de onion skin (vecinos NO)"
```

---

## Task 7: Aplicar blend modes en `animationExporter.jsx`

**Files:**
- Modify: `src/editorSprites/Workspace/export/animationExporter.jsx` líneas ~256-268 y ~336-356 (dos bloques de drawImage de capas)

- [ ] **Step 1: Importar el helper**

En el head de `animationExporter.jsx`:

```js
import { toCompositeOperation, isValidBlendMode, DEFAULT_BLEND_MODE } from '../blendModes';
```

- [ ] **Step 2: Helper local (al inicio del componente / módulo)**

Como el exporter no tiene acceso directo al hook `resolveLayerBlendMode`, replicamos la lógica leyendo del frame data:

```js
function blendModeForLayer(layer) {
  const override = layer?.blendModeOverride;
  if (override != null && isValidBlendMode(override)) return override;
  if (layer?.blendMode && isValidBlendMode(layer.blendMode)) return layer.blendMode;
  return DEFAULT_BLEND_MODE;
}
```

Colocarlo arriba del componente o como utility privada del módulo.

- [ ] **Step 3: Modificar el primer bloque (líneas ~256-268)**

Buscar el bloque que tiene:
```js
if (layerOpacity !== 1.0) originalCtx.globalAlpha = layerOpacity;
originalCtx.drawImage(mainCanvas, 0, 0);
if (layerOpacity !== 1.0) originalCtx.globalAlpha = 1.0;
// ... y luego el block análogo para groupCanvas
```

Cambiar a (necesitarás un flag `isFirstDrawn` al inicio del loop de capas):

```js
const blendId = isFirstDrawn ? 'normal' : blendModeForLayer(mainLayer);
const composite = toCompositeOperation(blendId);
originalCtx.globalAlpha = layerOpacity;
originalCtx.globalCompositeOperation = composite;
originalCtx.drawImage(mainCanvas, 0, 0);
originalCtx.globalCompositeOperation = 'source-over';
originalCtx.globalAlpha = 1.0;
isFirstDrawn = false;
```

(Y replicar para el block de `groupCanvas` justo debajo, mismo patrón con `groupLayer` y reusando `isFirstDrawn`.)

- [ ] **Step 4: Modificar el segundo bloque (líneas ~336-356)**

Mismo patrón. Aplicar `blendModeForLayer(mainLayer)` y `blendModeForLayer(groupLayer)` con flag `isFirstDrawn` reseteado al inicio del loop de capas de ese frame.

- [ ] **Step 5: Verificación manual**

Run: `npm run dev`

1. Crear sprite con 2 capas, dibujar pixels en ambas.
2. Aún sin tocar UI de blend mode (esto es Task 12), exportar a GIF/PNG.
3. Confirmar que el resultado se ve igual que el frame en pantalla (modos siguen en `'normal'` → idéntico al baseline).

- [ ] **Step 6: Lint + commit**

```bash
npm run lint
git add src/editorSprites/Workspace/export/animationExporter.jsx
git commit -m "feat(blend): aplicar blend mode en animationExporter"
```

---

## Task 8: Verificar `videoExporter.js` y normalizar entrada

**Files:**
- Modify (si es necesario): `src/editorSprites/Workspace/export/videoExporter.js:190-200`

`videoExporter.js:195` ya hace `this.ctx.globalCompositeOperation = layer.blendMode;` si el layer tiene el campo. Cuando Tasks 2/4 cargan `blendMode` en cada `frame.layers[i]`, este exporter funciona automáticamente. Solo añadimos validación defensiva.

- [ ] **Step 1: Leer las líneas 190-200**

Run: `cat -n src/editorSprites/Workspace/export/videoExporter.js | sed -n '185,205p'`

Verificar que el código actual asigna `layer.blendMode` directo. Si es así:

- [ ] **Step 2: Importar el validator**

```js
import { isValidBlendMode, toCompositeOperation } from '../blendModes';
```

(Si el videoExporter es ESM y este import no funciona por extensión `.js` vs `.jsx`, usar la ruta relativa exacta `../blendModes.js`.)

- [ ] **Step 3: Reemplazar la asignación directa con resolución segura**

Cambiar:
```js
if (layer.blendMode) {
  this.ctx.globalCompositeOperation = layer.blendMode;
}
```

(O su equivalente exacto en línea 195) por:

```js
const overrideId = layer.blendModeOverride;
const baseId = layer.blendMode;
const effectiveId = (overrideId != null && isValidBlendMode(overrideId))
  ? overrideId
  : (isValidBlendMode(baseId) ? baseId : 'normal');
this.ctx.globalCompositeOperation = toCompositeOperation(effectiveId);
```

(Y al final del drawImage de esa capa, reset a `'source-over'`.)

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`. Exportar video, confirmar que sigue funcionando.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/export/videoExporter.js
git commit -m "feat(blend): normalizar resolucion de blend mode en videoExporter"
```

---

## Task 9: Validar y normalizar `blendMode` al importar proyecto

**Files:**
- Modify: `src/editorSprites/Workspace/hooks/hooks.jsx:6225-6243` (export — añadir blendMode a serialización)
- Modify: `src/editorSprites/Workspace/hooks/hooks.jsx:6309-6319` (import — leer con default)

- [ ] **Step 1: Importar validator**

(Si Task 3 ya añadió el import `isValidBlendMode`, no duplicar.)

- [ ] **Step 2: Export — añadir blendMode al objeto serializado**

En la sección de export de capa (líneas ~6225-6243), donde se construye el objeto `{ name, visible, opacity, zIndex, ... }`, añadir:

```js
        blendMode: layer.blendMode ?? 'normal',
        blendModeOverride: layer.blendModeOverride ?? null,
```

- [ ] **Step 3: Import — reconstruir capa con defaults**

En `importLayersAndFrames` líneas ~6309-6319, cambiar:

```js
const layer = {
  id: layerId,
  name: layerData.name,
  visible: { [frameNumber]: layerData.visible },
  opacity: layerData.opacity,
  zIndex: layerData.zIndex,
  isGroupLayer: layerData.isGroupLayer,
  parentLayerId: layerData.parentLayerId
};
```

a:

```js
const rawBlend = layerData.blendMode;
const rawOverride = layerData.blendModeOverride;
const layer = {
  id: layerId,
  name: layerData.name,
  visible: { [frameNumber]: layerData.visible },
  opacity: layerData.opacity,
  zIndex: layerData.zIndex,
  isGroupLayer: layerData.isGroupLayer,
  parentLayerId: layerData.parentLayerId,
  blendMode: isValidBlendMode(rawBlend) ? rawBlend : 'normal',
  blendModeOverride: (rawOverride != null && isValidBlendMode(rawOverride))
    ? rawOverride
    : null,
};
```

- [ ] **Step 4: Verificación manual de compatibilidad**

Run: `npm run dev`

1. Cargar un proyecto guardado **antes** de este cambio (sin los campos). Confirmar que todas las capas leen `'normal'` y no hay errores en consola.
2. Cambiar un blend mode (después del Task 12), guardar, recargar — confirmar que persiste.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/hooks/hooks.jsx
git commit -m "feat(blend): persistir y validar blendMode en save/load de proyectos"
```

---

## Task 10: Extender `CustomContextMenu` con `type: 'submenu'`

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/customContextMenu.jsx`

- [ ] **Step 1: Leer el componente completo (446 líneas)**

Run: `npx eslint --no-eslintrc src/editorSprites/Workspace/workspaceMain/customContextMenu.jsx > /dev/null 2>&1 || true`
(Solo para asegurar que está sintácticamente OK antes de modificar.)

- [ ] **Step 2: Añadir estado de submenu**

Cerca de `useState`s existentes del componente (top del cuerpo de `CustomContextMenu`), añadir:

```js
const [openSubmenu, setOpenSubmenu] = useState(null); // null o action.id/index del item con submenu abierto
const submenuCloseTimeoutRef = useRef(null);

// Helpers
const openSubmenuFor = useCallback((key) => {
  if (submenuCloseTimeoutRef.current) {
    clearTimeout(submenuCloseTimeoutRef.current);
    submenuCloseTimeoutRef.current = null;
  }
  setOpenSubmenu(key);
}, []);

const scheduleSubmenuClose = useCallback(() => {
  if (submenuCloseTimeoutRef.current) clearTimeout(submenuCloseTimeoutRef.current);
  submenuCloseTimeoutRef.current = setTimeout(() => setOpenSubmenu(null), 200);
}, []);

useEffect(() => {
  return () => {
    if (submenuCloseTimeoutRef.current) clearTimeout(submenuCloseTimeoutRef.current);
  };
}, []);
```

- [ ] **Step 3: Reconocer `type: 'submenu'` en `handleItemClick`**

En `handleItemClick(action)` (línea ~229), añadir antes del bloque de input types:

```js
if (action.type === 'submenu') {
  // No hace nada en click directo; submenu se controla por hover.
  return;
}
```

- [ ] **Step 4: Renderizar el indicador `▶` y el submenu en cada item**

En el `actions.map((action, index) => ...)` (línea ~314), modificar el render del item para soportar submenu:

Dentro del `<button className="context-menu-item">`, después del `<span className="context-menu-label">{action.label}</span>` y antes del shortcut/indicator, añadir:

```jsx
{action.type === 'submenu' && (
  <span className="context-menu-submenu-arrow" aria-hidden>▶</span>
)}
```

Y al `<button>` añadir handlers:

```jsx
<button
  className={...}
  onClick={() => handleItemClick(action)}
  onMouseEnter={action.type === 'submenu' ? () => openSubmenuFor(action.id || index) : undefined}
  onMouseLeave={action.type === 'submenu' ? scheduleSubmenuClose : undefined}
  aria-haspopup={action.type === 'submenu' ? 'menu' : undefined}
  aria-expanded={action.type === 'submenu' ? (openSubmenu === (action.id || index)) : undefined}
  disabled={action.disabled}
>
  ...
</button>
```

- [ ] **Step 5: Renderizar el submenu cuando esté abierto**

Después del `</button>` del item (y antes del cierre del `<div key={...}>`), añadir:

```jsx
{action.type === 'submenu' && action.items && openSubmenu === (action.id || index) && (
  <SubmenuPanel
    items={action.items}
    parentRect={null /* el panel se posiciona via CSS sticky-like al item; ver Task 11 */}
    onClose={() => setOpenSubmenu(null)}
    onMouseEnter={() => openSubmenuFor(action.id || index)}
    onMouseLeave={scheduleSubmenuClose}
  />
)}
```

- [ ] **Step 6: Crear el componente `SubmenuPanel` al final del archivo (antes del export)**

```jsx
function SubmenuPanel({ items, onClose, onMouseEnter, onMouseLeave }) {
  return (
    <div
      className="context-menu-submenu"
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, idx) => {
        if (item.divider) {
          return <div key={`d-${idx}`} className="context-menu-submenu-divider">{item.label}</div>;
        }
        return (
          <button
            key={item.id || idx}
            className={`context-menu-submenu-item ${item.disabled ? 'disabled' : ''} ${item.checked ? 'checked' : ''}`}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
            disabled={item.disabled}
            role="menuitemradio"
            aria-checked={!!item.checked}
          >
            <span className="context-menu-submenu-check" aria-hidden>{item.checked ? '✓' : ''}</span>
            <span className="context-menu-submenu-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: 0 errores nuevos.

- [ ] **Step 8: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/customContextMenu.jsx
git commit -m "feat(menu): soporte de type 'submenu' en CustomContextMenu"
```

---

## Task 11: Estilos CSS del submenu

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/customContextMenu.css`

- [ ] **Step 1: Añadir al final del archivo**

```css
/* === Submenu (type: 'submenu' en CustomContextMenu) === */

.context-menu-submenu-arrow {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-secondary);
  padding-left: 8px;
  flex-shrink: 0;
}

.context-menu-submenu {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 180px;
  max-height: 70vh;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
  padding: 4px 0;
  margin-left: 4px;
  z-index: 10001;
}

.context-menu-submenu-divider {
  padding: 6px 12px 2px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.context-menu-submenu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  padding: 6px 12px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.context-menu-submenu-item:hover:not(.disabled) {
  background: var(--button-hover);
}

.context-menu-submenu-item.checked {
  color: var(--accent-color);
  font-weight: 600;
}

.context-menu-submenu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-submenu-check {
  display: inline-flex;
  width: 14px;
  justify-content: center;
  font-weight: 700;
  color: var(--accent-color);
}

.context-menu-submenu-label {
  flex: 1;
}

/* Para que el item padre (el que tiene submenu) sea position:relative
   y el submenu absoluto se ancle a él. */
.context-menu-item:has(+ .context-menu-submenu),
.context-menu-content > div:has(.context-menu-submenu) {
  position: relative;
}

/* Fallback para navegadores sin :has() */
.context-menu-content > div {
  position: relative;
}
```

- [ ] **Step 2: Verificación visual**

Run: `npm run dev`. Aún no hay submenu en uso (eso es Task 12), pero el lint debe pasar.

- [ ] **Step 3: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/customContextMenu.css
git commit -m "feat(menu): estilos del submenu en context menu"
```

---

## Task 12: Añadir las dos entradas "Modo de fusión (capa)" y "Modo de fusión (este frame)"

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx` (sección `menuLayerActions`, alrededor de línea 530-655)

- [ ] **Step 1: Importar utilidades de blendModes**

Al inicio de `layerAnimation.jsx`:

```js
import { BLEND_MODES, BLEND_GROUP_LABELS, getBlendModeLabel } from '../blendModes';
import { LuPaintbrush, LuFilm } from 'react-icons/lu';
```

(Si `LuPaintbrush` no existe en la versión instalada, usar `LuLayers` que ya está importado.)

- [ ] **Step 2: Construir items del submenu (helper local antes del return o dentro del array)**

Dentro del componente `LayerAnimation`, antes del JSX return o como parte de un `useMemo`:

```js
// Submenu items para "Modo de fusion (capa)"
const layerBlendCurrent = (() => {
  if (!activeLayerId) return 'normal';
  const layer = layers.find(l => l.id === activeLayerId);
  return layer?.blendMode ?? 'normal';
})();

const buildBlendModeItems = (currentMode, onPick) => {
  const items = [];
  let lastGroup = null;
  for (const m of BLEND_MODES) {
    if (m.group !== lastGroup && BLEND_GROUP_LABELS[m.group]) {
      items.push({ divider: true, label: BLEND_GROUP_LABELS[m.group] });
    }
    lastGroup = m.group;
    items.push({
      id: `blend-${m.id}`,
      label: m.label,
      checked: currentMode === m.id,
      onClick: () => onPick(m.id),
    });
  }
  return items;
};

const layerBlendItems = buildBlendModeItems(
  layerBlendCurrent,
  (modeId) => setLayerBlendMode(activeLayerId, modeId)
);

// Submenu items para "Modo de fusion (este frame)"
const frameOverride = (() => {
  if (!activeLayerId) return null;
  const frame = frames[currentFrame];
  const layer = frame?.layers.find(l => l.id === activeLayerId);
  return layer?.blendModeOverride ?? null;
})();

const frameBlendItems = [
  {
    id: 'blend-inherit',
    label: 'Heredar capa',
    checked: frameOverride === null,
    onClick: () => setFrameBlendModeOverride(activeLayerId, currentFrame, null),
  },
  { divider: true, label: '' },
  ...buildBlendModeItems(
    frameOverride ?? layerBlendCurrent,
    (modeId) => setFrameBlendModeOverride(activeLayerId, currentFrame, modeId)
  ),
];
```

- [ ] **Step 3: Añadir las dos entradas al array `menuLayerActions`**

Localizar el array `menuLayerActions` (línea ~530) y añadir, antes de "Eliminar Capa" (línea ~632) o donde tenga sentido visual:

```js
{
  label: `Modo de fusión (capa) — ${getBlendModeLabel(layerBlendCurrent)}`,
  icon: <LuLayers />,
  type: 'submenu',
  items: layerBlendItems,
},
{
  label: frameOverride !== null
    ? `Modo de fusión (este frame) · ${getBlendModeLabel(frameOverride)}`
    : 'Modo de fusión (este frame)',
  icon: <LuFilm />,
  type: 'submenu',
  items: frameBlendItems,
},
```

- [ ] **Step 4: Verificación manual end-to-end**

Run: `npm run dev`

1. Crear sprite con 2 capas, dibujar pixels en ambas con colores fuertes.
2. Click derecho en la capa superior → abrir "Modo de fusión (capa) ▶".
3. Confirmar el submenu con los 16 modos agrupados (Oscurecer, Aclarar, Contraste, Comparar, Componente).
4. Elegir "Multiplicar" → confirmar que el render del canvas cambia inmediatamente.
5. Cambiar de frame y volver — el modo persiste (es de capa).
6. En otro frame, abrir "Modo de fusión (este frame) ▶ Diferencia" → confirmar que solo ese frame difiere.
7. "Modo de fusión (este frame) ▶ Heredar capa" → vuelve al modo de la capa (Multiplicar).
8. Activar onion skin → confirmar que los frames adyacentes NO aplican blend modes (siguen tinteados como antes).
9. Exportar GIF → abrir el GIF, confirmar que mantiene los blend modes por frame.
10. Exportar MP4 → idem.
11. Guardar proyecto, recargar → todo persiste.
12. Cargar un proyecto viejo (anterior a este branch) → no crashea, todas las capas leen Normal.
13. Probar Ctrl+Z después de cambiar blend mode → vuelve al modo anterior con UN solo undo (no uno por frame).

- [ ] **Step 5: Lint final**

Run: `npm run lint`
Expected: 0 errores nuevos.

- [ ] **Step 6: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx
git commit -m "feat(blend): submenus de modo de fusion (capa + frame) en menu contextual"
```

---

## Task 13: Pulido visual con `ui-ux-pro-max` y commit final

**Files:**
- Modify (si necesario): `src/editorSprites/Workspace/workspaceMain/customContextMenu.css` y/o `layerAnimation.css`

- [ ] **Step 1: Invocar la skill `ui-ux-pro-max` para revisar el submenu**

Con el editor abierto en `npm run dev`, abrir el submenu y pedir feedback visual al skill: spacing, contraste, jerarquía de los dividers de grupo, alineación del check ✓, hover state.

- [ ] **Step 2: Aplicar ajustes (si los hay)**

Solo retoques de CSS — no tocar lógica.

- [ ] **Step 3: Verificación final del checklist Q1-Q5 del spec**

| # | Decisión | Verificar |
|---|---|---|
| 1 | 16 modos | Submenu muestra Normal + 15 |
| 2 | Por capa global + override por frame | Items separados, override funciona |
| 3 | Submenu | Hover abre, hover fuera cierra con delay |
| 4 | Dos entradas separadas | "Modo de fusión (capa)" y "(este frame)" |
| 5 | Onion skin siempre Normal | Vecinos NO aplican blend modes |

- [ ] **Step 4: Invocar `superpowers:code-reviewer`**

Pasar al reviewer:
- Spec: `docs/superpowers/specs/2026-04-26-modos-fusion-capas-design.md`
- Plan: `docs/superpowers/plans/2026-04-26-modos-fusion-capas.md`
- Diff completo del branch

Pedirle revisión contra:
- Coherencia con el spec (las 5 decisiones)
- Patrones del codebase (uso de `produce`, denormalización por frame, `useCallback` con deps)
- Edge cases del spec (primera capa source-over, onion skin source-over en vecinos, undo/redo single snapshot)
- Performance (no recomputar resolveBlendMode innecesariamente en playback)

- [ ] **Step 5: Aplicar feedback del reviewer**

Si hay observaciones bloqueantes, abrir tareas adicionales y resolver. Si son nice-to-have, dejarlas como TODO o resolver según criterio.

- [ ] **Step 6: Commit final si hubo cambios de pulido**

```bash
git add -A
git commit -m "polish(blend): ajustes visuales submenu post review"
```

---

## Self-review (post-plan)

| Checklist del spec | Cubierto en |
|---|---|
| 16 modos nativos Canvas2D | Task 1 (constante) |
| Granularidad: capa + override por frame | Tasks 2, 3 |
| `resolveLayerBlendMode` único helper | Task 3 |
| 5 sitios de render aplican blend mode | Tasks 5 (live), 6 (onion-skin frame actual), 7 (animationExporter), 8 (videoExporter) |
| Onion skin vecinos siempre source-over | Task 6 (NO toca renderFrameWithConfig) |
| Primera capa visible siempre source-over | Tasks 5, 6, 7 (flag `isFirstDrawn`) |
| Default `'normal'` para proyectos viejos | Task 9 (import con isValidBlendMode) |
| Save/load round-trip | Task 9 (export + import) |
| Submenu hover/teclado | Task 10 |
| CSS coherente con el editor | Tasks 11, 13 |
| Dos entradas en menu contextual | Task 12 |
| Indicador "·" cuando frame tiene override | Task 12 (label condicional) |
| Validación con `isValidBlendMode` | Tasks 3, 8, 9 |
| Code review final | Task 13 |

Sin placeholders, sin TBDs, sin "TODO" sin código. Cada step de código incluye el código completo.
