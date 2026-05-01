# Timeline: loop fix + tags Aseprite + bucle de rango — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que el botón de bucle de la barra de animación realmente apague el loop, exponer tags Aseprite-style desde menús contextuales y una banda visual sobre el strip de frames, y permitir reproducir cualquier rango seleccionado en bucle ad-hoc.

**Architecture:** El estado `loopEnabled` se eleva al `workspaceContainer` y se cablea a `useAnimationPlayer`, que gana una rama "no loop" en `cycleCompleted`. Tags y rango ad-hoc reusan el modelo y API que ya existen (`animation/animationTags.js` + `playAnimationRef` imperativo). Componente nuevo `TagBand.jsx` se monta en el header de `timeline.jsx`. El menú contextual existente (`customContextMenu.jsx`) se enriquece con nuevas entradas que viajan vía props.

**Tech Stack:** React 19 (con React Compiler activo), Vite, hooks custom (`useAnimationPlayer`), File System Access API para persistencia, CSS plano (no Tailwind).

**Important runtime note:** Este repo **no tiene runner de tests** (ver `CLAUDE.md`). Los pasos de "verificación" se ejecutan en el navegador con `npm run dev` (puerto 5173) — el comando ya está disponible y se usa por convención en cada cambio. Los pasos describen explícitamente qué clickear y qué observar.

---

## File Structure

| Archivo | Estado | Responsabilidad |
| --- | --- | --- |
| `src/editorSprites/Workspace/hooks/useAnimationPlayer.js` | Modify | Aceptar prop `loopEnabled`; en `cycleCompleted` con loop off → `setIsPlaying(false)`. |
| `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` | Modify | Lift de `loopEnabled` (estado + persistencia desde/hacia `meta.animation.loop`); pasarlo a memos. Memorizar también `animationTags`/`setAnimationTags`/`handlePlayTag`/`playAnimationRef` para los menús. |
| `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx` | Modify | Eliminar `useState` local de `loopEnabled`; consumir prop. Añadir entradas de tag/loop al `menuFrameActions`. Renderizar chip "Bucle: A–B ✕" cuando `frameRange` no es total. |
| `src/editorSprites/Workspace/workspaceMain/timeline.jsx` | Modify | Menú contextual nuevo en el header de frame-numbers. Montar `<TagBand>` encima del strip. Pasar `animationTags`/`handlePlayTag` a entradas de menú nuevas en su `menuFrameActions`. |
| `src/editorSprites/Workspace/animation/TagBand.jsx` | Create | Render visual de los tags como bandas alineadas con el grid de frame-numbers; click/doble-click/click derecho. |
| `src/editorSprites/Workspace/animation/TagBand.css` | Create | Estilo dark, bandas redondeadas, dos filas para overlap. |
| `src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedLayerAnimation.jsx` | Modify | Pasar las props nuevas (`loopEnabled`, `setLoopEnabled`, `animationTags`, `setAnimationTags`, `handlePlayTag`, `playerApiRef`). |
| `src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedFramesTimeline.jsx` | Modify (si existe) | Idem para FramesTimeline. |
| `src/editorSprites/Workspace/saveProject.jsx` | Modify | Leer/escribir `meta.animation.loop`. |

---

### Task 1: Soporte `loopEnabled` en `useAnimationPlayer`

**Files:**
- Modify: `src/editorSprites/Workspace/hooks/useAnimationPlayer.js:16-33` (signatura) + `:178-223` (rama de avance) + `:438-477` (return)

- [ ] **Step 1: Añadir `loopEnabled` a la signatura del hook**

En la lista de props desestructuradas, agregar `loopEnabled = true,` justo después de `setIsPlaying: setIsPlayingProp,`:

```js
export function useAnimationPlayer({
  frames,
  externalCanvasRef,
  internalCanvasRef,
  viewportOffset = { x: 0, y: 0 },
  viewportWidth = 64,
  viewportHeight = 64,
  zoom = 1,
  displaySize = 256,
  isPlaying: isPlayingProp,
  setIsPlaying: setIsPlayingProp,
  loopEnabled = true,
  onTimeUpdate,
  onFrameChange,
  syncedFrameNumber,
} = {}) {
```

- [ ] **Step 2: Añadir la rama "stop" en `animateFrames`**

Localizar el bloque dentro de `if (elapsed >= duration)` en `animateFrames` (alrededor de línea 178-223). Tras el cálculo de `nextRangeIndex` y el seteo de `cycleCompleted`, **antes** de `frameIndexRef.current = frameRange.start + nextRangeIndex;`, insertar:

```js
      // Loop apagado: si completamos un ciclo, detener al final del rango.
      // Para forward/reverse: el último frame mostrado es el cierre natural
      // del rango; nos quedamos ahí. Para pingpong: cycleCompleted se setea
      // tras el viaje de vuelta a `start`, y nos quedamos en `start`.
      if (cycleCompleted && !loopEnabled) {
        setIsPlaying(false);
        return;
      }
```

- [ ] **Step 3: Añadir `loopEnabled` a las deps del `useCallback` de `animateFrames`**

En el array de deps al final de `animateFrames` (línea ~240), añadir `loopEnabled`:

```js
  }, [frameRange, playbackSpeed, playbackMode, frames, drawFrame, onFrameChange, onTimeUpdate, loopEnabled, setIsPlaying]);
```

(`setIsPlaying` ya se usa pero no estaba en deps; al añadir esta rama nueva sí debe figurar.)

- [ ] **Step 4: Verificar manualmente**

```bash
npm run dev
```

Abrir http://localhost:5173, crear o abrir un proyecto con ≥3 frames distintos. En la barra de animación inferior:
1. Verificar que el botón ↻ (LuRotateCcw) está visualmente activo (clase `active`).
2. Click en ▶: la animación corre y loopea (último → primero, indefinido).
3. Click en ↻ para apagar; el icono pierde la clase `active`.
4. Click en ▶: la animación recorre del primero al último UNA vez y se detiene en el último frame. ✅ esperado.
5. Click en ↻ para reactivar; ▶ vuelve a loopear.

Nota: en este punto `loopEnabled` aún vive en `useState` local de `layerAnimation.jsx` y se pasa al hook por la prop nueva (lo cableamos en Task 2). Hasta que lo lift-eemos al container, sólo el panel `LayerAnimation` ve la corrección — el `<PlayAnimation>` del dock derecho seguirá loopeando siempre. Eso es expected en este task.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/hooks/useAnimationPlayer.js
git commit -m "feat(player): soporte de loop apagable

useAnimationPlayer ahora acepta una prop loopEnabled (default true).
Cuando se completa un ciclo y el loop esta apagado, llama a
setIsPlaying(false) y se queda en el frame final del rango.
Para pingpong: detiene tras un viaje completo ida-vuelta."
```

---

### Task 2: Cablear `loopEnabled` desde `layerAnimation` al hook

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx:160-181` (llamada al hook)

- [ ] **Step 1: Pasar `loopEnabled` al hook**

Localizar la llamada a `useAnimationPlayer` (línea ~160). Añadir `loopEnabled` al objeto de opciones:

```jsx
const {
  playbackSpeed,
  currentFrame: currentAnimationFrame,
  setPlaybackSpeed,
  play,
  pause,
} = useAnimationPlayer({
  frames,
  externalCanvasRef,
  internalCanvasRef,
  viewportOffset,
  viewportWidth,
  viewportHeight,
  zoom,
  displaySize,
  isPlaying,
  setIsPlaying,
  loopEnabled,
  onTimeUpdate,
  onFrameChange,
  syncedFrameNumber: currentFrame,
});
```

- [ ] **Step 2: Verificar manualmente**

`npm run dev`, escenario:
1. Apagar bucle (botón ↻). Click ▶. Debe parar al final.
2. Encender bucle. Click ▶. Debe loopear.

- [ ] **Step 3: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx
git commit -m "feat(timeline): cablear loopEnabled al motor de animacion"
```

---

### Task 3: Lift de `loopEnabled` al `workspaceContainer`

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` — añadir `useState` en el bloque de estados (~línea 303), exportarlo a los memos.
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx:211` — eliminar el `useState` local; consumir prop.
- Modify: `src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedLayerAnimation.jsx` — añadir `loopEnabled`/`setLoopEnabled` al pass-through.

- [ ] **Step 1: Añadir el estado en el container**

En `workspaceContainer.jsx`, justo después de la línea `const [animationTags, setAnimationTags] = useState([]);` (~303):

```jsx
// Bucle global de la animacion. Se lift-ea aqui (no en LayerAnimation)
// para que tanto el panel de timeline como el reproductor del dock derecho
// (PlayAnimation) compartan el mismo estado y se persista en .pixcalli.
const [loopEnabled, setLoopEnabled] = useState(true);
```

- [ ] **Step 2: Pasar `loopEnabled`/`setLoopEnabled` al builder de `LayerAnimation`**

En `MemoizedLayerAnimation` (alrededor de línea 10330, donde están `isPlaying`/`setIsPlaying`), añadir:

```jsx
        isPlaying,
        setIsPlaying,
        loopEnabled,
        setLoopEnabled,
```

Y en el array de deps del `useMemo` (~10350-10378), añadir `loopEnabled` y `setLoopEnabled`:

```jsx
    [
      frozenProps,
      isPlaying,
      loopEnabled,
      setLoopEnabled,
      handleAnimationFrameChange,
      // ... resto igual
    ]
```

- [ ] **Step 3: Pasar `loopEnabled`/`setLoopEnabled` al builder de `PlayAnimation`**

Buscar `MemoizedPlayAnimation` en `workspaceContainer.jsx` (con grep: `grep -n "MemoizedPlayAnimation" workspaceContainer.jsx`). En el constructor del builder, añadir las dos props. En sus deps, añadir `loopEnabled`. (Si el builder hoy no destructura props pero recibe argumentos directos, simplemente añadir el par.)

- [ ] **Step 4: Reflejar las props nuevas en `memoizedLayerAnimation.jsx`**

Editar `src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedLayerAnimation.jsx`. Después de `isPlaying={props.isPlaying}` y `setIsPlaying={props.setIsPlaying}` (líneas 91-92), añadir:

```jsx
      loopEnabled={props.loopEnabled}
      setLoopEnabled={props.setLoopEnabled}
```

- [ ] **Step 5: Reflejar las props nuevas en `playAnimation.jsx`**

Editar `src/editorSprites/Workspace/hooks/playAnimation.jsx`. En la signatura del componente (~línea 12-25), añadir `loopEnabled` y `setLoopEnabled` a las props destructuradas:

```jsx
const PlayAnimation = forwardRef(function PlayAnimation(
  {
    frames,
    onTimeUpdate,
    onFrameChange,
    externalCanvasRef,
    viewportOffset = { x: 0, y: 0 },
    viewportWidth = 64,
    viewportHeight = 64,
    zoom = 1,
    displaySize = 256,
    isPlaying: isPlayingProp,
    setIsPlaying: setIsPlayingProp,
    loopEnabled,
    setLoopEnabled,
  },
  ref
) {
```

Y en la llamada interna a `useAnimationPlayer` (~línea 29-42), añadir `loopEnabled`:

```jsx
  const player = useAnimationPlayer({
    frames,
    externalCanvasRef,
    internalCanvasRef,
    viewportOffset,
    viewportWidth,
    viewportHeight,
    zoom,
    displaySize,
    isPlaying: isPlayingProp,
    setIsPlaying: setIsPlayingProp,
    loopEnabled,
    onTimeUpdate,
    onFrameChange,
  });
```

- [ ] **Step 6: Eliminar el `useState` local en `layerAnimation.jsx`**

En `layerAnimation.jsx:211`, **eliminar**:

```jsx
const [loopEnabled, setLoopEnabled] = useState(true);
```

Y consumir las props en su lugar. En la signatura (~línea 50-131) añadir:

```jsx
  // Control de reproducción (compartido con padre)
  isPlaying,
  setIsPlaying,

  // Bucle global (compartido con PlayAnimation)
  loopEnabled,
  setLoopEnabled,
```

(Insertar `loopEnabled` / `setLoopEnabled` después de `setIsPlaying`.)

- [ ] **Step 7: Verificar manualmente**

`npm run dev`. Escenario doble panel:
1. Abrir el panel `Play Animation` del dock derecho (icono de play en el panel lateral).
2. Apagar el bucle desde la barra de animación inferior (↻).
3. Click ▶ en el reproductor del dock: debe correr una sola vez y detenerse.
4. Encender bucle desde abajo, ▶ en el dock: loopea.
5. Inverso: si el reproductor del dock tuviera control de loop, también funcionaría. (En este momento solo lo controla el botón de la barra inferior — está bien, es la fuente de verdad.)

- [ ] **Step 8: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx \
        src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx \
        src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedLayerAnimation.jsx \
        src/editorSprites/Workspace/hooks/playAnimation.jsx
git commit -m "refactor(timeline): lift loopEnabled al workspaceContainer

Compartido entre el panel de timeline y el PlayAnimation del dock
derecho. Misma fuente de verdad para ambos motores."
```

---

### Task 4: Persistir `loop` en `.pixcalli`

**Files:**
- Modify: `src/editorSprites/Workspace/saveProject.jsx` (lectura + escritura de `meta.animation.loop`)
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` — pasar `loopEnabled` a `<SaveProject>` y restaurarlo desde `handleProjectLoaded`.

- [ ] **Step 1: Aceptar `loopEnabled` como prop en SaveProject**

Buscar la signatura de `SaveProject` en `saveProject.jsx`. Añadir `loopEnabled` a las props destructuradas (cerca de las otras de animación) con default `true`:

```jsx
loopEnabled = true,
```

- [ ] **Step 2: Escribir `meta.animation.loop` al guardar**

Buscar las dos ocurrencias `loop: true,` en `saveProject.jsx` (líneas 35 y 200). Reemplazarlas por `loop: loopEnabled,`:

```jsx
animation: { defaultFrameDuration: 100, frameRate: 10, loop: loopEnabled },
```

- [ ] **Step 3: Restaurar `loopEnabled` al cargar proyecto**

En `workspaceContainer.jsx`, localizar `handleProjectLoaded` (busca `if (Array.isArray(ext.animationTags))` ~línea 669). Añadir, después del bloque de tags:

```jsx
      // meta.animation.loop: si el proyecto lo trae, restaurarlo. Default true
      // para compat con .pixcalli antiguos donde la clave existia hardcoded.
      const loopFromMeta = ext?.meta?.animation?.loop;
      if (typeof loopFromMeta === 'boolean') setLoopEnabled(loopFromMeta);
```

(Si la estructura de `ext` en este flujo no expone `meta.animation` directamente, búscalo en el objeto `loaded` o equivalente. Verificar leyendo el archivo de carga; el camino exacto depende de cómo `loadProject.js` lo aplane.)

- [ ] **Step 4: Pasar `loopEnabled` al render de SaveProject**

Localizar `<SaveProject ...>` en `workspaceContainer.jsx` (~línea 11703). Añadir:

```jsx
loopEnabled={loopEnabled}
```

- [ ] **Step 5: Verificar manualmente**

`npm run dev`:
1. Apagar el loop.
2. Guardar proyecto (`Ctrl+S` o equivalente).
3. Cerrar y reabrir el proyecto.
4. Verificar: el icono ↻ aparece **inactivo** y al ▶ no loopea. ✅
5. Activar loop, guardar, recargar. Debe quedar activo.

- [ ] **Step 6: Commit**

```bash
git add src/editorSprites/Workspace/saveProject.jsx \
        src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx
git commit -m "feat(save): persistir loop en meta.animation.loop"
```

---

### Task 5: Pasar `animationTags` y `playAnimationRef` a los memos

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` — añadir props a builders y deps.
- Modify: `src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedLayerAnimation.jsx` — pass-through.
- Modify: el builder equivalente para FramesTimeline (buscar `renderFramesTimeline`).

- [ ] **Step 1: Añadir props al builder de LayerAnimation**

En el `MemoizedLayerAnimation` `useMemo` (~línea 10250), añadir antes del cierre del objeto (justo antes de `isCollapsed: isLayerAnimationCollapsed,`):

```jsx
        animationTags,
        setAnimationTags,
        handlePlayTag,
        playerApiRef: playAnimationRef,
```

Y en las deps, añadir `animationTags`. (`setAnimationTags` y `handlePlayTag` y `playAnimationRef` son estables por identidad, no necesitan ir en deps.)

- [ ] **Step 2: Reflejar en `memoizedLayerAnimation.jsx`**

Tras `setLoopEnabled={props.setLoopEnabled}` (Task 3), añadir:

```jsx
      animationTags={props.animationTags}
      setAnimationTags={props.setAnimationTags}
      handlePlayTag={props.handlePlayTag}
      playerApiRef={props.playerApiRef}
```

- [ ] **Step 3: Idem para FramesTimeline**

Localizar `MemoizedFramesTimeline` (~línea 10381) y añadir las mismas 4 props. Buscar el `renderFramesTimeline` builder (probablemente en el mismo dir `memoized/`); si no existe el archivo separado, está inline. Reflejar.

```bash
grep -rn "renderFramesTimeline" src/
```

Editar el builder y añadir las cuatro props del mismo modo que `memoizedLayerAnimation.jsx`.

- [ ] **Step 4: Aceptar las props en `layerAnimation.jsx` y `timeline.jsx`**

En la signatura de `LayerAnimation` (`layerAnimation.jsx:50-131`), añadir tras `setLoopEnabled`:

```jsx
  // Tags + API imperativo del player (para reproducir tags / rangos ad-hoc)
  animationTags = [],
  setAnimationTags,
  handlePlayTag,
  playerApiRef,
```

En la signatura de `FramesTimeline` (`timeline.jsx:43-97`), añadir las mismas:

```jsx
  // Tags + API imperativo del player
  animationTags = [],
  setAnimationTags,
  handlePlayTag,
  playerApiRef,
```

- [ ] **Step 5: Verificar manualmente que no rompe nada**

`npm run dev`. La aplicación debe arrancar sin warnings de PropTypes/destructure. El comportamiento existente (playback, edición, tags vía panel derecho) sigue intacto.

- [ ] **Step 6: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx \
        src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx \
        src/editorSprites/Workspace/workspaceMain/timeline.jsx \
        src/editorSprites/Workspace/workspaceMain/container/components/memoized/memoizedLayerAnimation.jsx
git commit -m "chore(timeline): cablear animationTags y playerApiRef a los memos"
```

---

### Task 6: Entradas de menú contextual — "Crear tag con selección"

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/timeline.jsx` (`menuFrameActions` ~línea 166-276) — añadir un "header context menu" para el strip de frame-numbers (que hoy no tiene click-derecho propio).
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx` (`menuFrameActions` ~línea 253-363) — añadir entrada equivalente.

- [ ] **Step 1: Importar `createTag` / `addTag` en timeline.jsx**

En el bloque de imports al inicio del archivo (línea 1-39), tras los imports de iconos:

```jsx
import { createTag, addTag, removeTag } from '../animation/animationTags';
```

- [ ] **Step 2: Añadir state para el "header context menu"**

En `timeline.jsx`, junto a los otros `useState` de menú (~línea 134-142), agregar:

```jsx
const [contextMenuHeader, setContextMenuHeader] = useState({
  isVisible: false,
  position: { x: 0, y: 0 }
});
```

- [ ] **Step 3: Añadir handler de click derecho en celdas del header**

En `timeline.jsx`, en el `<FrameNumberCell>` del JSX (~línea 1121), envolver con un `onContextMenu`:

```jsx
              <FrameNumberCell
                key={frameNumber}
                frameNumber={frameNumber}
                isCurrent={isCurrent}
                isSelected={isSelected}
                onMouseDown={stableHeaderFrameMouseDown}
                onMouseEnter={stableHeaderFrameMouseEnter}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Si el frame no esta en la seleccion, lo seleccionamos
                  // antes de abrir el menu (UX consistente con otras DAW/timelines).
                  if (!selectedFrames.includes(frameNumber)) {
                    setSelectedFrames([frameNumber]);
                    setActiveFrame(frameNumber);
                  }
                  setContextMenuHeader({
                    isVisible: true,
                    position: { x: e.clientX, y: e.clientY }
                  });
                }}
              />
```

- [ ] **Step 4: Añadir `onContextMenu` a `FrameNumberCell`**

Editar `src/editorSprites/Workspace/workspaceMain/layerRow.jsx`. Localizar la definición de `FrameNumberCell` (export named). Añadir `onContextMenu` a las props del componente y pasarla al `<div>` raíz:

```jsx
export const FrameNumberCell = React.memo(function FrameNumberCell({
  frameNumber,
  isCurrent,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onContextMenu,
}) {
  return (
    <div
      className={`frame-number-cell ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''}`}
      onMouseDown={(e) => onMouseDown?.(frameNumber, e)}
      onMouseEnter={() => onMouseEnter?.(frameNumber)}
      onContextMenu={onContextMenu}
    >
      {frameNumber}
    </div>
  );
});
```

(La estructura interna real puede diferir; mantener el resto igual y solo añadir `onContextMenu={onContextMenu}` al JSX raíz.)

- [ ] **Step 5: Construir `menuHeaderActions`**

En `timeline.jsx`, después de `menuFrameActions` (~línea 277), añadir un nuevo array:

```jsx
const focusFrame = selectedFrames.length === 1 ? selectedFrames[0] : currentFrame;
const tagsHere = animationTags.filter(t => focusFrame >= t.from && focusFrame <= t.to);
const selRange = selectedFrames.length >= 1
  ? { from: Math.min(...selectedFrames), to: Math.max(...selectedFrames) }
  : null;

const menuHeaderActions = [
  {
    label: selRange
      ? `Crear tag (frames ${selRange.from}–${selRange.to})`
      : 'Crear tag con seleccion',
    icon: '+',
    disabled: !selRange,
    type: 'text',
    placeholder: 'Nombre del tag (p. ej. walk)',
    getValue: () => '',
    setValue: (name) => {
      const trimmed = String(name).trim();
      if (!trimmed || !selRange) return;
      const tag = createTag({ name: trimmed, from: selRange.from, to: selRange.to });
      setAnimationTags?.(addTag(animationTags, tag));
    }
  },
  {
    label: selRange && selectedFrames.length >= 2
      ? `Reproducir ${selRange.from}–${selRange.to} en bucle`
      : 'Reproducir rango en bucle',
    icon: '↻',
    disabled: !(selRange && selectedFrames.length >= 2),
    onClick: () => {
      if (!selRange) return;
      const api = playerApiRef?.current;
      if (!api) return;
      setLoopEnabled?.(true);
      api.setFrameRange?.({ start: selRange.from, end: selRange.to });
      api.setPlaybackMode?.('forward');
      api.setFrame?.(selRange.from);
      api.play?.();
      setContextMenuHeader(prev => ({ ...prev, isVisible: false }));
    }
  },
  ...tagsHere.flatMap(tag => [
    {
      label: `Reproducir tag «${tag.name}»`,
      icon: '▶',
      onClick: () => {
        handlePlayTag?.(tag);
        setContextMenuHeader(prev => ({ ...prev, isVisible: false }));
      }
    },
    {
      label: `Eliminar tag «${tag.name}»`,
      icon: '×',
      danger: true,
      onClick: () => {
        setAnimationTags?.(removeTag(animationTags, tag.id));
        setContextMenuHeader(prev => ({ ...prev, isVisible: false }));
      }
    }
  ])
];
```

- [ ] **Step 6: Renderizar el `<CustomContextMenu>` del header**

En `timeline.jsx`, junto a los otros dos `<CustomContextMenu>` (~línea 1022-1041), añadir un tercero:

```jsx
<CustomContextMenu
  isVisible={contextMenuHeader.isVisible}
  position={contextMenuHeader.position}
  onClose={() => setContextMenuHeader(prev => ({ ...prev, isVisible: false }))}
  actions={menuHeaderActions}
  header={{
    title: selRange && selectedFrames.length >= 2
      ? `Frames ${selRange.from}–${selRange.to}`
      : `Frame ${focusFrame}`
  }}
/>
```

Y aprovechar la prop nueva `setLoopEnabled` (Task 3) — añadirla a la signatura de `FramesTimeline` si no está ya:

```jsx
  // Bucle global (para acciones del menu contextual)
  loopEnabled,
  setLoopEnabled,
```

- [ ] **Step 7: Verificar manualmente**

`npm run dev`:
1. En el strip de frame-numbers (header del grid), seleccionar frames 2–5 (shift-click).
2. Click derecho en uno de ellos → debe aparecer el menú con las dos entradas habilitadas.
3. "Reproducir 2–5 en bucle" → arranca el playback solo entre esos frames, en loop.
4. "Crear tag con selección" → input inline → escribir "walk" → Enter. El tag aparece en el panel derecho `Animation tags`.
5. Volver a click derecho en frame 3 → ahora el submenú "Reproducir tag «walk»" / "Eliminar tag «walk»" aparece.

- [ ] **Step 8: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/timeline.jsx \
        src/editorSprites/Workspace/workspaceMain/layerRow.jsx
git commit -m "feat(timeline): menu contextual del header con tag/range loop"
```

---

### Task 7: Replicar las entradas en el menú contextual de frame por capa

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx` (`menuFrameActions` ~línea 253-363)

- [ ] **Step 1: Importar helpers**

En `layerAnimation.jsx`, tras los iconos:

```jsx
import { createTag, addTag, removeTag } from '../animation/animationTags';
```

- [ ] **Step 2: Construir bloque de entradas de tag**

Justo antes del `const menuFrameActions = [` (~línea 253), añadir:

```jsx
const focusFrame = selectedFrames.length === 1 ? selectedFrames[0] : currentFrame;
const tagsAtFocus = animationTags.filter(t => focusFrame >= t.from && focusFrame <= t.to);
const selRange = selectedFrames.length >= 1
  ? { from: Math.min(...selectedFrames), to: Math.max(...selectedFrames) }
  : null;
```

- [ ] **Step 3: Añadir entradas al final de `menuFrameActions`**

Después de la entrada "Limpiar Frame" (último item del array, ~línea 260), añadir antes del `]`:

```jsx
,
{
  label: selRange
    ? `Crear tag (frames ${selRange.from}–${selRange.to})`
    : 'Crear tag con seleccion',
  icon: '+',
  disabled: !selRange,
  type: 'text',
  placeholder: 'Nombre del tag',
  getValue: () => '',
  setValue: (name) => {
    const trimmed = String(name).trim();
    if (!trimmed || !selRange) return;
    setAnimationTags?.(addTag(animationTags, createTag({
      name: trimmed,
      from: selRange.from,
      to: selRange.to,
    })));
  }
},
{
  label: selRange && selectedFrames.length >= 2
    ? `Reproducir ${selRange.from}–${selRange.to} en bucle`
    : 'Reproducir rango en bucle',
  icon: '↻',
  disabled: !(selRange && selectedFrames.length >= 2),
  onClick: () => {
    if (!selRange) return;
    const api = playerApiRef?.current;
    if (!api) return;
    setLoopEnabled?.(true);
    api.setFrameRange?.({ start: selRange.from, end: selRange.to });
    api.setPlaybackMode?.('forward');
    api.setFrame?.(selRange.from);
    api.play?.();
    handleCloseMenu();
  }
},
...tagsAtFocus.flatMap(tag => [
  {
    label: `Reproducir tag «${tag.name}»`,
    icon: '▶',
    onClick: () => { handlePlayTag?.(tag); handleCloseMenu(); }
  },
  {
    label: `Eliminar tag «${tag.name}»`,
    icon: '×',
    danger: true,
    onClick: () => {
      setAnimationTags?.(removeTag(animationTags, tag.id));
      handleCloseMenu();
    }
  }
])
```

- [ ] **Step 4: Verificar manualmente**

`npm run dev`:
1. Click derecho sobre la celda de frame de una capa (no el header). Las nuevas entradas aparecen al final del menú.
2. "Crear tag con selección" funciona igual que en Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx
git commit -m "feat(timeline): tag/range loop en menu de frame por capa"
```

---

### Task 8: Componente `TagBand` — modelo y CSS

**Files:**
- Create: `src/editorSprites/Workspace/animation/TagBand.jsx`
- Create: `src/editorSprites/Workspace/animation/TagBand.css`

- [ ] **Step 1: Crear `TagBand.css`**

Estilo dark base (la skill `ui-ux-pro-max` afinará detalles en Task 11; este es el esqueleto funcional):

```css
.tag-band-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
  background: transparent;
  pointer-events: none;
}

.tag-band-row {
  position: relative;
  height: 14px;
}

.tag-band-item {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 14px;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  user-select: none;
  pointer-events: auto;
  border: 1px solid rgba(255,255,255,0.15);
  transition: filter 120ms ease, transform 120ms ease;
}

.tag-band-item:hover { filter: brightness(1.15); }
.tag-band-item:active { transform: translateY(1px); }
```

- [ ] **Step 2: Crear `TagBand.jsx`**

```jsx
// TagBand — render visual de animation tags como bandas alineadas con el strip
// de frame-numbers. Cada tag ocupa columnas [from..to] con su propio color.
//
// Props:
//   tags: AnimationTag[]
//   frameNumbers: number[]      // valores 1..N en el orden del strip
//   cellWidth: number           // ancho en px de cada FrameNumberCell
//   gapPx?: number              // separacion horizontal entre celdas (default 0)
//   onClickTag?: (tag) => void
//   onDoubleClickTag?: (tag) => void
//   onContextMenuTag?: (tag, evt) => void

import React, { useMemo } from 'react';
import './TagBand.css';

const MAX_ROWS = 2;

// Asigna a cada tag una "fila visual" para que tags solapados no se pisen.
// Algoritmo greedy: por cada tag (orden de entrada), busca la primera fila
// libre en su rango; si no hay (>= MAX_ROWS), descarta el tag (no se renderiza).
function packIntoRows(tags) {
  const rows = []; // rows[i] = array de tags ya colocados
  const placement = []; // [{ tag, rowIndex }]
  for (const tag of tags) {
    let placed = false;
    for (let r = 0; r < rows.length; r++) {
      const collides = rows[r].some(t => !(tag.to < t.from || tag.from > t.to));
      if (!collides) {
        rows[r].push(tag);
        placement.push({ tag, rowIndex: r });
        placed = true;
        break;
      }
    }
    if (!placed && rows.length < MAX_ROWS) {
      rows.push([tag]);
      placement.push({ tag, rowIndex: rows.length - 1 });
    }
    // Si no cabe en MAX_ROWS, simplemente se omite del render.
  }
  return { rows: Math.min(rows.length, MAX_ROWS), placement };
}

const TagBand = ({
  tags = [],
  frameNumbers = [],
  cellWidth,
  gapPx = 0,
  onClickTag,
  onDoubleClickTag,
  onContextMenuTag,
}) => {
  const { rows, placement } = useMemo(() => packIntoRows(tags), [tags]);

  if (!tags.length || !cellWidth || !frameNumbers.length) return null;

  // Map frameNumber -> indice en el strip. Se asume que frameNumbers esta
  // ordenado y es contiguo (lo cual es el caso del editor: 1..N).
  const indexOf = (frameN) => frameNumbers.indexOf(frameN);

  return (
    <div className="tag-band-container" style={{ minHeight: rows * 16 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="tag-band-row">
          {placement
            .filter(p => p.rowIndex === r)
            .map(({ tag }) => {
              const startIdx = indexOf(tag.from);
              const endIdx = indexOf(tag.to);
              if (startIdx < 0 || endIdx < 0) return null;
              const left = startIdx * (cellWidth + gapPx);
              const width = (endIdx - startIdx + 1) * cellWidth
                          + (endIdx - startIdx) * gapPx;
              return (
                <div
                  key={tag.id}
                  className="tag-band-item"
                  style={{ left, width, background: tag.color }}
                  title={`${tag.name} (${tag.from}–${tag.to})`}
                  onClick={() => onClickTag?.(tag)}
                  onDoubleClick={() => onDoubleClickTag?.(tag)}
                  onContextMenu={(e) => { e.preventDefault(); onContextMenuTag?.(tag, e); }}
                >
                  {tag.name}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
};

export default TagBand;
```

- [ ] **Step 3: Verificar manualmente que el archivo compila sin errores**

`npm run dev`. Aún no se monta el componente, solo verificamos que no hay errores de import en el bundle.

- [ ] **Step 4: Commit**

```bash
git add src/editorSprites/Workspace/animation/TagBand.jsx \
        src/editorSprites/Workspace/animation/TagBand.css
git commit -m "feat(timeline): TagBand — bandas Aseprite-style sobre frames"
```

---

### Task 9: Montar `TagBand` en el header de `timeline.jsx`

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/timeline.jsx` — montar `<TagBand>` y manejar interacciones.

- [ ] **Step 1: Importar `TagBand`**

En `timeline.jsx`, tras los iconos:

```jsx
import TagBand from '../animation/TagBand';
```

- [ ] **Step 2: Determinar el ancho de celda**

`FrameNumberCell` usa CSS para su ancho. Leer `getComputedStyle` de la primera celda en un `useLayoutEffect` y guardar en state. En `timeline.jsx`, junto al state `isDraggingHeader` (~línea 820):

```jsx
const [headerCellWidth, setHeaderCellWidth] = useState(28);
const headerFramesRef = useRef(null);

useLayoutEffect(() => {
  const el = headerFramesRef.current?.querySelector('.frame-number-cell');
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setHeaderCellWidth(rect.width);
  }
}, [frameNumbers.length]);
```

(`useLayoutEffect` debe importarse de React si no está ya: ajustar la línea 1.)

- [ ] **Step 3: Montar `<TagBand>` y conectar `ref`**

Modificar el JSX del header (~línea 1067-1132). Envolver `.timeline-header-frames` para tener acceso al ref y montar la banda encima:

```jsx
        <div className="timeline-header-row">
          <div className="timeline-header-left-placeholder">
            {/* ... botones existentes ... */}
          </div>
          <div className="timeline-header-frames-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            <TagBand
              tags={animationTags}
              frameNumbers={frameNumbers}
              cellWidth={headerCellWidth}
              onClickTag={(tag) => {
                const range = [];
                for (let f = tag.from; f <= tag.to; f++) range.push(f);
                setSelectedFrames(range);
                setActiveFrame(tag.to);
              }}
              onDoubleClickTag={(tag) => handlePlayTag?.(tag)}
              onContextMenuTag={(tag, e) => {
                // Reusa el menu del header con el tag pre-enfocado.
                if (!selectedFrames.includes(tag.from)) setSelectedFrames([tag.from]);
                setContextMenuHeader({
                  isVisible: true,
                  position: { x: e.clientX, y: e.clientY }
                });
              }}
            />
            <div className="timeline-header-frames" ref={headerFramesRef}>
              {/* el .map(frameNumbers) existente sigue aqui sin cambios */}
            </div>
          </div>
        </div>
```

- [ ] **Step 4: Verificar manualmente**

`npm run dev`:
1. Crear un tag desde el menú contextual del header (Task 6) sobre frames 2–5 con nombre "walk".
2. Sobre el strip de frame-numbers debe aparecer una banda morada con texto "walk", alineada exactamente sobre las celdas 2–5.
3. Click en la banda → selecciona frames 2–5.
4. Doble-click → arranca playback en bucle de 2–5.
5. Crear otro tag "blink" en 4–6: las dos bandas se apilan en dos filas (overlap detectado).
6. Click derecho en la banda → menú con "Reproducir / Eliminar" del tag.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/timeline.jsx
git commit -m "feat(timeline): montar TagBand sobre el header de frames"
```

---

### Task 10: Chip "Bucle: A–B ✕" en la barra de animación

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx` — exponer/leer `frameRange` del player y renderizar chip.
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.css` — estilo del chip (clase mínima; afina luego con ui-ux-pro-max).

- [ ] **Step 1: Exponer `frameRange` y `setFrameRange` desde el hook**

Editar la llamada a `useAnimationPlayer` en `layerAnimation.jsx` (~línea 160) para destructurar `frameRange` y `setFrameRange`:

```jsx
const {
  playbackSpeed,
  currentFrame: currentAnimationFrame,
  setPlaybackSpeed,
  play,
  pause,
  frameRange,
  setFrameRange,
} = useAnimationPlayer({ /* ... */ });
```

- [ ] **Step 2: Calcular si hay rango activo**

En el render body, antes del `return`:

```jsx
const totalFrames = frameNumbers.length;
const isFullRange = frameRange.start === 0 && frameRange.end === Math.max(0, totalFrames - 1);
const rangeFromFrame = frameNumbers[frameRange.start];
const rangeToFrame = frameNumbers[frameRange.end];
```

(Convierte índices del player → frameNumbers visibles.)

- [ ] **Step 3: Renderizar el chip**

En el JSX, dentro de `.toolbar-group` de "Velocidad + loop" (~línea 1162-1185), después del `<select>`:

```jsx
            {!isFullRange && rangeFromFrame != null && rangeToFrame != null && (
              <div className="loop-range-chip" title={`Bucle activo: frames ${rangeFromFrame}–${rangeToFrame}`}>
                <span className="loop-range-chip__label">Bucle</span>
                <span className="loop-range-chip__value">{rangeFromFrame}–{rangeToFrame}</span>
                <button
                  className="loop-range-chip__close"
                  onClick={() => setFrameRange({ start: 0, end: Math.max(0, totalFrames - 1) })}
                  title="Reproducir todo el rango"
                  aria-label="Limpiar rango de bucle"
                >
                  ✕
                </button>
              </div>
            )}
```

- [ ] **Step 4: Estilo base en `layerAnimation.css`**

Buscar el final del archivo y añadir:

```css
.loop-range-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 6px 0 8px;
  border-radius: 11px;
  background: rgba(120, 80, 220, 0.18);
  border: 1px solid rgba(150, 110, 240, 0.45);
  color: #d8c8ff;
  font-size: 11px;
  font-weight: 600;
  user-select: none;
}

.loop-range-chip__label { opacity: 0.75; }
.loop-range-chip__value { color: #fff; font-variant-numeric: tabular-nums; }

.loop-range-chip__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #d8c8ff;
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
  padding: 0;
}
.loop-range-chip__close:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
```

- [ ] **Step 5: Verificar manualmente**

`npm run dev`:
1. Estado inicial: el chip no aparece (rango = total).
2. Selección 3–7 + click derecho → "Reproducir 3–7 en bucle". El chip aparece: `Bucle 3–7 ✕`.
3. La animación corre 3→7→3→7→...
4. Click en `✕`: el chip desaparece, próximo ▶ usa el rango total.

- [ ] **Step 6: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx \
        src/editorSprites/Workspace/workspaceMain/layerAnimation.css
git commit -m "feat(timeline): chip 'Bucle: A-B' para rango ad-hoc"
```

---

### Task 11: Pasada visual con `ui-ux-pro-max`

**Files:**
- Touch: `src/editorSprites/Workspace/animation/TagBand.css`
- Touch: `src/editorSprites/Workspace/workspaceMain/layerAnimation.css`
- Touch: `src/editorSprites/Workspace/workspaceMain/customContextMenu.css`

- [ ] **Step 1: Invocar la skill `ui-ux-pro-max`**

```
Skill: ui-ux-pro-max
```

Brief para la skill:
> Tengo tres elementos UI nuevos en un editor de pixel art (paleta dark, ya existente: fondos `#1f1f24` / `#2a2a33`, acentos morado violeta, bordes `#4a4a55`). Necesito refinar:
> 1. Bandas de tags Aseprite-style sobre el strip de frame-numbers (CSS en `TagBand.css`). Quiero buen contraste con cualquier color hexadecimal del usuario, indicador hover sutil, y dos filas que se compriman bien.
> 2. Chip "Bucle: A–B ✕" en la barra inferior (CSS en `layerAnimation.css`, clase `.loop-range-chip`). Estilo coherente con los demás `setting-btn` / `frame-control-btn`.
> 3. Submenú dinámico de tags en `CustomContextMenu` (CSS en `customContextMenu.css`). Cada entrada tiene `icon` `▶` o `×`. El icono de tag debería usar el `tag.color` como swatch.
>
> No diseñes layout nuevo: refina solo tipografía, espaciados, hover states, transiciones, contrast guarantees. Los componentes ya están renderizando.

- [ ] **Step 2: Aplicar los cambios sugeridos**

Editar los CSS según las recomendaciones que devuelva la skill. **No tocar JSX/JS** — solo CSS.

- [ ] **Step 3: Verificar manualmente**

`npm run dev`:
1. Todas las superficies nuevas (bandas, chip, submenú) son legibles, con hover/focus claros.
2. Crear un tag con color rojo intenso vs verde lima: el texto blanco sigue legible en ambos.
3. El chip se distingue claramente del resto de la toolbar.

- [ ] **Step 4: Commit**

```bash
git add src/editorSprites/Workspace/animation/TagBand.css \
        src/editorSprites/Workspace/workspaceMain/layerAnimation.css \
        src/editorSprites/Workspace/workspaceMain/customContextMenu.css
git commit -m "style(timeline): pulir bandas, chip y submenu con ui-ux-pro-max"
```

---

### Task 12: Smoke test final + lint

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Esperado: 0 errores. Si aparecen warnings nuevos en archivos tocados, arreglarlos.

- [ ] **Step 2: Smoke test E2E**

`npm run dev`. Recorrer toda la matriz de Pruebas Manuales del spec (sección "Pruebas manuales"):
1. Loop off termina ✓
2. Loop on continúa ✓
3. Tag desde header ✓
4. Reproducir tag desde banda ✓
5. Reproducir rango ad-hoc ✓
6. Tags solapados ✓
7. Persistencia ✓

- [ ] **Step 3: Commit final si hubo fixes de lint**

Si el lint requirió cambios:

```bash
git add -A
git commit -m "chore: lint fixes para timeline-loop-tags"
```

Si no, no hay commit.

---

## Self-review

**Spec coverage:**
- Bug del bucle → Tasks 1-3 ✓
- Persistencia en `meta.animation.loop` → Task 4 ✓
- Menú contextual del header (crear tag, reproducir rango, submenú tags) → Task 6 ✓
- Replicación en menú de frame por capa → Task 7 ✓
- Banda visual de tags → Tasks 8-9 ✓
- Chip de loop range → Task 10 ✓
- Pasada visual con ui-ux-pro-max → Task 11 ✓
- 7 pruebas manuales del spec → Task 12 ✓

**Placeholder scan:** todos los pasos contienen código completo; las búsquedas con `grep` son explícitas; los comandos tienen output esperado.

**Type/name consistency:**
- `setLoopEnabled` se usa en Tasks 3, 4, 6, 7 — siempre con la misma firma `(boolean) => void`.
- `playerApiRef` (alias en props) → `playAnimationRef` (real en container) — clarificado en Task 5 (alias en builder).
- `animationTags`, `setAnimationTags`, `handlePlayTag` → mismas firmas en todas las tasks.
- `selRange` se construye igual en Tasks 6 y 7.

Plan listo para ejecución.
