# Modos de fusión de capas (estilo Aseprite)

**Fecha:** 2026-04-26
**Estado:** Diseño aprobado por usuario, pendiente plan de implementación.

## Objetivo

Implementar modos de fusión por capa para PixCalli Studio, seleccionables desde el menú contextual de capas. La capa puede tener un modo global y, opcionalmente, un override por frame.

## Decisiones de alcance

| # | Decisión | Elegido |
|---|---|---|
| 1 | Set de modos | 16 nativos de Canvas2D (Normal + 15 mezcla: Darken, Multiply, Color burn, Lighten, Screen, Color dodge, Overlay, Hard light, Soft light, Difference, Exclusion, Hue, Saturation, Color, Luminosity). NO Addition, Subtract, Divide, Linear burn. |
| 2 | Granularidad | Por capa global + override opcional por frame |
| 3 | UI | Submenú con hover/teclado (extender `CustomContextMenu`) |
| 4 | Override por frame | Dos entradas separadas en el menú: "Modo de fusión (capa)" y "Modo de fusión (este frame)" |
| 5 | Onion skin | Frames adyacentes siempre en `'source-over'`, ignoran blend modes |

## Arquitectura

### Punto de inserción único

Un helper puro nuevo `resolveLayerBlendMode(layerId, frameNumber)` en `useLayerManager` (hooks.jsx):

```js
resolveLayerBlendMode(layerId, frameNumber)
  → frame.layers[i].blendModeOverride  // si !== null
  → frame.layers[i].blendMode           // si existe
  → 'normal'                            // fallback
```

### Sitios consumidores (5)

Todos hoy hacen `ctx.drawImage(layerCanvas, ...)` solo con `globalAlpha`. Cada uno cambia a:

```js
ctx.globalAlpha = opacity;
ctx.globalCompositeOperation = isFirstLayer
  ? 'source-over'
  : resolveLayerBlendMode(layer.id, frameNumber);
ctx.drawImage(layerCanvas, ...);
ctx.globalCompositeOperation = 'source-over';
```

1. `hooks.jsx` → `renderCurrentFrameOnly()` (línea ~720) — render principal
2. `hooks.jsx` → `renderCurrentFrameWithAdjacent()` — capas del frame actual SÍ aplican; vecinos onion-skin NO
3. `hooks.jsx` → `compositeRender()` — orquestador
4. `animationExporter.jsx:174-200` — export GIF/PNG
5. `videoExporter.js:137-150` — export MP4/WebM

**La primera capa visible se dibuja siempre con `'source-over'`** (no hay nada bajo ella para mezclar). Los blend modes solo tienen efecto a partir de la segunda capa apilada.

## Modelo de datos

### Campos nuevos en `frame.layers[i]`

```js
frame.layers[i] = {
  // ... campos existentes ...
  blendMode: 'normal',          // valor de capa global
  blendModeOverride: null,      // null = heredar; string = override
}
```

### Compatibilidad y migración

- **Lectura:** `frame.layers[i].blendMode ?? 'normal'`. Proyectos viejos sin el campo leen `'normal'`. **Sin migración.**
- **Escritura inicial:** `addLayer`, `duplicateLayer`, `createPixelGroup` inicializan con `blendMode: 'normal'`, `blendModeOverride: null`.
- **Save/load:** ningún cambio en `saveProject.jsx` ni `loadProject` — los campos viajan en el objeto layer ya serializado. En `loadProject` validar con `isValidBlendMode` y normalizar a `'normal'` si inválido.

### Reflejo en `framesResume`

- `framesResume.layers[layerId].blendMode` — ya existe el campo, lo poblamos desde el primer frame que tenga la capa.
- **Nuevo cache** `framesResume.computed.resolvedFrames[N].blendMode[layerId]` — modo efectivo por frame ya resuelto, evita recomputar en cada tick de playback.

### Constante única

Módulo nuevo `editorSprites/Workspace/blendModes.js`:

```js
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

export const BLEND_GROUPS = {
  normal:    null,           // sin label de grupo
  darken:    'Oscurecer',
  lighten:   'Aclarar',
  contrast:  'Contraste',
  compare:   'Comparar',
  component: 'Componente',
};

export const DEFAULT_BLEND_MODE = 'normal';
export const isValidBlendMode = (id) => BLEND_MODES.some(m => m.id === id);
```

Los `id` son exactamente los strings que acepta `globalCompositeOperation`.

## API

Nuevas funciones en `useLayerManager` (hooks.jsx), expuestas en su return y propagadas vía `workspaceContainer.jsx` a `LayerAnimation`:

```js
// Lectura
resolveLayerBlendMode(layerId, frameNumber) → string

// Escritura — modo de capa global (afecta todos los frames)
setLayerBlendMode(layerId, mode) → void
  // Itera frames, escribe blendMode en cada copia.
  // Valida con isValidBlendMode; inválido = no-op + console.warn.
  // Snapshot único de undo/redo.

// Escritura — override solo en un frame
setFrameBlendModeOverride(layerId, frameNumber, mode | null) → void
  // null limpia el override (vuelve a heredar de la capa).
  // Mismo patrón que setFrameOpacity.
```

Helper UI-side en `LayerAnimation`:

```js
hasFrameBlendOverride(layerId, frameNumber) → boolean
```

Para indicador "·" en el item del menú cuando el frame actual tiene override.

## UI

### Extensión a `CustomContextMenu`

Nuevo `type: 'submenu'` para acciones. Comportamiento:

- Item se renderiza como `Label ▶`
- Apertura: hover (delay 120ms anti-flicker), flecha derecha, o Enter
- Posición: a la derecha del padre. Fallback a la izquierda si se sale del viewport. Ajusta `top` si no cabe vertical.
- Cierre: hover fuera (delay 200ms), Esc, flecha izquierda, click fuera, o seleccionar item
- Items del submenú: mismos campos que items normales (`label`, `icon`, `onClick`, `disabled`, `danger`, divider)
- Render: `<div position: fixed>`, mismo estilo visual que el menú principal (reusa CSS de `customContextMenu.css`)
- Accesibilidad: `role="menu"`, `role="menuitemradio"` con `aria-checked`, `aria-haspopup="menu"` en el padre

### Dos entradas nuevas en `menuLayerActions` (layerAnimation.jsx)

```
─────────────────────
🎨 Modo de fusión (capa) — Multiplicar ▶
   ✓ Normal
   ─── Oscurecer ───
     Oscurecer
     Multiplicar
     Sobreexponer
   ─── Aclarar ───
     Aclarar
     Pantalla
     Subexponer
   ─── Contraste ───
     Superposición
     Luz fuerte
     Luz suave
   ─── Comparar ───
     Diferencia
     Exclusión
   ─── Componente ───
     Tono
     Saturación
     Color
     Luminosidad

🎨 Modo de fusión (este frame) ·  ▶
   ✓ Heredar capa
   ──────
     Normal
     ... (mismos 15 modos agrupados) ...
```

### Indicadores visuales

- **✓** a la izquierda del modo activo en el submenú
- **Modo actual entre paréntesis** en el item padre del menú principal: `Modo de fusión (capa) — Multiplicar ▶`
- **·** a la derecha del label "Modo de fusión (este frame)" cuando el frame tiene override (no está heredando)

### Iconos (Lucide, ya en uso)

- `LuLayers` para "Modo de fusión (capa)"
- `LuFilm` o `LuLayers2` para "Modo de fusión (este frame)"
- Grupos del submenú sin ícono — solo divider con label en gris

### Estilo

Reutilizar tokens existentes (`--bg-secondary`, `--button-hover`, `--accent-color`, `--border-color`). Aplicar refinamiento posterior con `ui-ux-pro-max` para asegurar coherencia con el resto del editor.

## Edge cases

| Caso | Comportamiento |
|---|---|
| Capas de grupo (`isGroupLayer: true`) | Igual que capas normales — su blend mode aplica a su propio canvas. La capa padre no propaga a hijos. |
| Primera capa visible | Siempre dibuja con `'source-over'` aunque tenga blend mode no-Normal. Blend modes solo desde la 2ª capa apilada. |
| Capas ocultas | Omitidas del render como hoy. Blend mode no se aplica. |
| Onion skin | Capas del frame actual aplican blend mode. Frames adyacentes (anterior/siguiente) siempre `'source-over'`. |
| `duplicateLayer` | Copia hereda `blendMode` y `blendModeOverride` por frame. |
| `duplicateFrame` | Copia del frame hereda `blendModeOverride` por capa. |
| `clearLayer(frameNumber)` | No toca `blendMode` / `blendModeOverride`. Solo borra píxeles. |
| Undo/redo | Cada `setLayerBlendMode` o `setFrameBlendModeOverride` produce un único snapshot. |
| Performance | `globalCompositeOperation` es nativo, ≤ 1 ms extra por frame en sprites 256×256. Cache `resolvedFrames[N].blendMode[layerId]` evita recomputar en cada tick. |
| Validación al cargar | `loadProject` normaliza con `isValidBlendMode`; valor inválido → `'normal'`. |

## Fuera de alcance (v1)

- Modos no-nativos: Addition, Subtract, Divide, Linear burn (decisión Q1)
- Aplicar blend mode en onion skin (decisión Q5)
- Picker visual con preview en miniatura del resultado — solo lista textual agrupada
- Atajos de teclado para ciclar modos
- Per-grupo blend mode con propagación a hijos

## Verificación manual (no hay test runner)

1. Crear sprite con 2+ capas, asignar Multiply a la capa superior, verificar que el resultado se mezcla.
2. Cambiar el modo de la capa, verificar que afecta a todos los frames.
3. Aplicar override en un frame, verificar que solo ese frame difiere.
4. Limpiar override (Heredar capa), verificar que vuelve al modo de capa.
5. Activar onion skin, verificar que los frames adyacentes NO aplican blend modes.
6. Exportar GIF/PNG/MP4, verificar que el resultado mantiene los blend modes.
7. Guardar proyecto, recargar, verificar persistencia.
8. Cargar un proyecto viejo (sin los campos), verificar que no crashea y todas las capas leen `'normal'`.
9. Undo/redo de cambio de blend mode produce una sola entrada en el historial.
10. Submenú: hover abre, hover fuera cierra con delay, flechas y Esc funcionan, posición cambia si está cerca del borde.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Drift del campo entre frames si código futuro edita `frame.layers[i]` directo | Centralizar todas las escrituras en `setLayerBlendMode`. Code review puntual. |
| Cache `resolvedFrames[N].blendMode` se desincroniza | Invalidar el cache cuando cambia `blendMode` o `blendModeOverride` (mismo flujo que invalida el cache de visibilidad/opacidad existente). |
| Submenu se oculta detrás de elementos con `z-index` alto | Reusar el `z-index` de `CustomContextMenu` actual; submenu es elemento hermano en el mismo portal. |
| Reset de `globalCompositeOperation` olvidado tras la última capa | El reset a `'source-over'` se hace después de cada `drawImage` (no solo al final), eliminando la posibilidad de leak fuera del loop. |
