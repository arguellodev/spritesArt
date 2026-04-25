# Timeline: fix de loop + tags Aseprite-style + bucle de rango

**Fecha:** 2026-04-25
**Autor:** brainstorm con el usuario
**Estado:** aprobado, pendiente de plan de implementación

## Contexto

PixCalli Studio es un editor de pixel art (React 19 + Pixi/three + WebGL). La barra de animación inferior contiene un control "loop" (icono ↻), un panel de capas con tracks por frame, y reproducción vía `useAnimationPlayer.js`. Tres problemas observados durante uso:

1. **El botón ↻ de bucle está roto.** Su click solo cambia el icono `active`; el motor de animación siempre loopea.
2. **Los tags de animación (Aseprite-style) ya existen como modelo y panel** (`animation/animationTags.js`, `animation/tagsPanel.jsx`, persistidos en `.pixcalli`), pero solo son accesibles desde el dock derecho. No hay forma natural de etiquetar frames desde la propia timeline.
3. **No hay un atajo práctico para "reproducir tal rango en bucle"**, aunque el motor ya soporta `frameRange.{start,end}` y existe API imperativo (usado por `handlePlayTag`).

## Objetivo

Hacer la barra de animación coherente con un flujo Aseprite-style sin replicar Aseprite 1:1:
- El bucle se desactiva como debería.
- Tags se crean y editan desde el menú contextual de la timeline.
- Cualquier rango seleccionado se puede reproducir en bucle al instante.
- Los tags existentes se ven como bandas de color sobre el strip de frame-numbers.

## Bug raíz: el bucle

`layerAnimation.jsx:211` declara `loopEnabled` como `useState(true)` local. El handler del botón solo flipea ese state. `useAnimationPlayer.js` no recibe ni soporta `loopEnabled`: en `animateFrames` la lógica de avance es siempre cíclica (`(currentRangeIndex + 1) % len`), y `cycleCompleted` se usa solo para reiniciar `currentTime`. La copia legacy `playingAnimation.jsx:196` tenía la rama correcta (`if (loopEnabled) { nextRangeIndex = 0 } else { setIsPlaying(false); return }`); cuando se consolidó la lógica en el hook, esa rama se perdió.

## Decisiones tomadas

- **Alcance del botón ↻:** global. Aplica a la animación completa o al rango activo, sin distinción.
- **"Reproducir rango en bucle":** ad-hoc. Configura `frameRange` + `loopEnabled = true` y arranca; no crea un tag persistente. Si el usuario quiere persistirlo, debe crear un tag explícitamente desde el menú contextual.
- **Banda de tags sobre la timeline:** se incluye en este alcance. Es la diferencia entre "tengo tags" y "tengo tags Aseprite-style".
- **Persistencia:** `loop` se guarda en `meta.animation.loop` del `.pixcalli` (clave que ya existe en `saveProject.jsx:35,200` pero se ignora actualmente).

## Componentes

### 1. `useAnimationPlayer.js` — soporte de loop apagable

- Nueva prop opcional `loopEnabled` (default `true`). Controlada o interna, simétrica a cómo se maneja `isPlaying`.
- En `animateFrames`, cuando `cycleCompleted === true` y `loopEnabled === false`:
  - No avanzar el frame (`nextRangeIndex` queda en el último del rango).
  - Llamar `setIsPlaying(false)`.
- El reset de marcas en el `useEffect` de `isPlaying` se mantiene; cuando el usuario vuelva a play, parte limpio.
- Para `pingpong` con loop apagado: completar un único viaje de ida y vuelta (start → end → start) y detener al volver a `start`.

### 2. `workspaceContainer.jsx` — lift de `loopEnabled`

- Nuevo `useState` a nivel container: `[loopEnabled, setLoopEnabled]`. Inicializado desde `meta.animation.loop` al cargar proyecto, default `true`.
- Pasarlo a `MemoizedLayerAnimation` y `MemoizedPlayAnimation` (ambos usan `useAnimationPlayer`).
- `setLoopEnabled` también se pasa a ambos para que cualquiera pueda flipearlo.
- Eliminar el `useState` local en `layerAnimation.jsx:211`.
- En `saveProject.jsx`, leer y escribir `meta.animation.loop`.

### 3. Menús contextuales: nuevas entradas

#### En `timeline.jsx` (header de frame-numbers, click derecho)

Hoy no tiene menú contextual; añadir uno nuevo con estas acciones:

- **Crear tag con selección** (visible si `selectedFrames.length ≥ 1`):
  Abre input inline para nombrar; al confirmar `addTag(animationTags, createTag({ name, from: min(selectedFrames), to: max(selectedFrames) }))`.
- **Reproducir rango en bucle** (visible si `selectedFrames.length ≥ 2`):
  ```js
  setLoopEnabled(true);
  api.setFrameRange({ start: min, end: max });
  api.setPlaybackMode('forward');
  api.setFrame(min);
  api.play();
  ```
- **Tags activos** (submenú dinámico, uno por cada `tagsAtFrame(animationTags, focusFrame)` donde `focusFrame = selectedFrames.length === 1 ? selectedFrames[0] : currentFrame`):
  - Reproducir tag «X»
  - Editar tag «X» (abre el input inline para nombre)
  - Quitar tag «X»

#### En `layerAnimation.jsx` y `timeline.jsx` (menú contextual de frame por capa)

Añadir las mismas tres entradas al `menuFrameActions` existente, después de "Configurar duración" / "Cambiar Opacidad" — agrupadas bajo un separador "Tags".

### 4. Banda de tags sobre el strip de frame-numbers

Nuevo componente `TagBand.jsx` (en `animation/`) que se renderiza encima de `.timeline-header-frames` en `timeline.jsx`.

- Cada tag = un `<div>` posicionado por las mismas columnas del grid (`gridColumn: from..to+2`, mismas anchuras que `FrameNumberCell`).
- Color = `tag.color`; texto = `tag.name`.
- Click → `setSelectedFrames([from..to])`.
- Doble-click → `handlePlayTag(tag)`.
- Click derecho → mini menú "Reproducir / Editar / Eliminar".
- Si dos tags se solapan: se apilan en filas diferentes (max 2 filas; del 3º en adelante se truncan visualmente, igual que Aseprite).

### 5. Chip de "loop range" en la barra de animación

En `layerAnimation.jsx`, junto al botón ↻ y el `<select>` de velocidad:
- Si `frameRange === { start: 0, end: max }`: no se muestra nada extra.
- Si hay rango activo: aparece un chip `Bucle: 3–7 ✕`. Click en `✕` → resetea el rango al total.

## Datos / API

No cambia el modelo de tags ni `saveProject` (el array `animationTags` ya se serializa). La banda y los menús consumen lo mismo.

Las props nuevas que viajan por `memoizedLayerAnimation.jsx` y `memoizedFramesTimeline.jsx`:

- `loopEnabled: boolean`
- `setLoopEnabled: (v: boolean) => void`
- `animationTags: AnimationTag[]`
- `setAnimationTags: (tags: AnimationTag[]) => void`
- `handlePlayTag: (tag: AnimationTag) => void` (ya existe en el container)
- `playerApiRef: React.RefObject<PlayerImperativeAPI>` (ya existe como `playAnimationRef`)

## Pruebas manuales

1. **Loop off termina:** crear 5 frames, presionar ↻ para apagar, presionar ▶. La animación recorre frames 1→5 una vez y se queda en 5.
2. **Loop on continúa:** ↻ activado → ▶ corre indefinidamente.
3. **Tag desde header:** seleccionar frames 2–5 con shift-click en header, clic derecho → "Crear tag con selección" → escribir "walk" → Enter. Aparece banda morada sobre 2–5 con texto "walk".
4. **Reproducir tag desde banda:** doble-click en la banda "walk" → reproduce solo 2–5 en bucle.
5. **Reproducir rango ad-hoc:** seleccionar frames 3–7, clic derecho → "Reproducir rango en bucle". Aparece chip `Bucle: 3–7 ✕`. Animación corre 3→7→3→7. Click en ✕ → vuelve al rango completo.
6. **Tags solapados:** crear "walk" sobre 2–5 y "blink" sobre 4–6. Las bandas se renderizan en dos filas.
7. **Persistencia:** crear tag, guardar `.pixcalli`, recargar; el tag y el estado de `loopEnabled` siguen.

## Fuera de alcance

- Pingpong-reverse en el motor (`handlePlayTag` ya degrada a `pingpong`).
- Tag overlap más allá de 2 filas.
- Numeración auto de frames dentro de un tag (Aseprite la tiene).
- Filtros por tag durante onion skin.
- Reordenar tags.

## Riesgos

- **`useAnimationPlayer` es compartido por dos consumidores** (panel + reproductor). Hay que verificar que ambos pasen `loopEnabled` consistentemente o el comportamiento divergirá. El lift al container es la solución.
- **El grid del header** (`.timeline-header-frames`) usa `display: flex` con celdas de ancho fijo, no CSS Grid. Para la banda hay dos opciones: (a) cambiar a Grid de columnas iguales, (b) calcular `left/width` del tag en píxeles a partir del ancho de celda (`var(--frame-cell-width)`). Opción (b) tiene menos riesgo de regresión.
- **React Compiler + Immer en el container**: `animationTags` ya es un `useState`, no debería haber sorpresas.

## Archivos a tocar

- `src/editorSprites/Workspace/hooks/useAnimationPlayer.js` — soporte loop.
- `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` — lift de `loopEnabled`, props nuevas a memos, persistencia.
- `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx` — eliminar useState local, consumir `loopEnabled`/`setLoopEnabled` props, añadir chip de loop range.
- `src/editorSprites/Workspace/workspaceMain/timeline.jsx` — menú contextual del header, integrar TagBand.
- `src/editorSprites/Workspace/animation/TagBand.jsx` — nuevo componente.
- `src/editorSprites/Workspace/animation/TagBand.css` — estilo.
- `src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedLayerAnimation.jsx` — props nuevas.
- `src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedFramesTimeline.jsx` (si existe; si no, donde se construya) — props nuevas.
- `src/editorSprites/Workspace/saveProject.jsx` — leer/escribir `meta.animation.loop`.

## Pasos de UI con ui-ux-pro-max

Tras la implementación de la lógica, invocar `ui-ux-pro-max` para:
- Diseño visual de la banda de tags (paleta dark coherente con el editor, contraste de etiquetas, tipografía).
- Estilo del chip "Bucle: 3–7 ✕" en la barra (espaciado, colores de hover).
- Estilo y disposición de las nuevas entradas en `customContextMenu.jsx`, especialmente el submenu de "Tags activos" y el input inline de creación rápida.
