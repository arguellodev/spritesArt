# Mejora UI/UX barra de animación: panel de capas y onion skin

**Fecha:** 2026-04-30
**Branch sugerida:** `feat/onion-skin-popover` (sobre `feat/blend-modes`)
**Alcance:** UI/CSS y JSX. Sin cambios a la lógica de estado de `useLayerManager` ni a la API pública del hook.

---

## 1. Problema

Tres defectos en la barra de animación reportados por el usuario:

1. **Transparencia del panel de capas (sticky-left)** — al hacer scroll vertical/horizontal con muchos frames, los frames se ven *a través* de la columna sticky de capas seleccionadas. Causa: `.layer-info.selected` aplica un `linear-gradient` de `rgba(140,82,255,0.28)` a `rgba(140,82,255,0.06)` que **sobrescribe** el `background: var(--bg-secondary)` opaco de `.layer-info`. El degradado es traslúcido sin capa base.
2. **El popover de configuración de Onion Skin no aparece al click** — `configOnionSkin.css:35` usa `position: absolute; right: 0; transform: translateY(calc(-100% - 10px))`, pero `<ConfigOnionSkin>` se renderiza como hermano de `.animation-bar-unified` dentro de un fragment, sin ningún ancestor `position: relative`. Resultado: se ancla al body y termina fuera del viewport.
3. **Interfaz poco intuitiva del panel de Onion Skin** — el modal actual mezcla en un mismo espacio: tabs (Frames/Presets), selector tipo (Anteriores/Siguientes), lista expandible con 4 sliders por frame, y un bloque "Configuración Actual" que duplica información ya visible.

---

## 2. Decisiones de diseño (acordadas con el usuario)

| Decisión | Elección | Razón |
|----------|----------|-------|
| Tipo de UI | **Popover anclado al botón ⚙** | Permite ajustar onion skin viendo el canvas en vivo; resuelve el bug de posicionamiento de manera natural |
| Estructura interna | **Híbrido**: vista compacta + disclosure "Personalizar" por frame | Lo común (cantidad/preset/opacidad global) al frente; sliders HSL avanzados ocultos hasta que se necesiten |
| Fix transparencia capas | **Multi-background** (gradiente + capa opaca debajo) | Preserva el efecto visual original sin transparencia parásita |
| Dirección de apertura | **Hacia arriba** | La barra de animación está en la parte inferior del workspace |
| Eliminar | Tab "Presets" como vista separada · bloque "Configuración Actual" · emojis 🎨🔥👁️⚡📝 | Redundancia + regla `no-emoji-icons` de la skill |
| Mantener | Stats "N anteriores · N siguientes" en el header | Confirmación visual útil |

---

## 3. Arquitectura del cambio

Tres trabajos independientes, ordenados de menor a mayor riesgo:

| # | Trabajo | Archivos | Riesgo |
|---|---------|----------|--------|
| A | Fix transparencia panel de capas | `layerAnimation.css` | Mínimo — CSS-only, ~10 líneas |
| B | Fix posicionamiento popover | `layerAnimation.jsx` + `configOnionSkin.css` | Bajo — wrapper DOM + ~6 líneas CSS |
| C | Rediseño UI del popover | `configOnionSkin.jsx` + `configOnionSkin.css` | Medio — refactor ~60% del archivo |

Sin tocar: `useLayerManager`, `unified-timeline-left/right`, el toggle on/off, los límites/rangos de sliders.

---

## 4. Trabajo A — Fix transparencia panel de capas

### 4.1 Cambio en `layerAnimation.css`

**Regla afectada (~línea 2107):**

```css
/* ANTES */
.animation-layer-row .layer-info.selected {
  background: linear-gradient(
    90deg,
    rgba(140, 82, 255, 0.28) 0%,
    rgba(140, 82, 255, 0.12) 60%,
    rgba(140, 82, 255, 0.06) 100%
  );
  box-shadow:
    inset 4px 0 0 0 var(--accent-color),
    2px 0 8px -2px rgba(140, 82, 255, 0.45);
}

/* DESPUÉS */
.animation-layer-row .layer-info.selected {
  background:
    linear-gradient(
      90deg,
      rgba(140, 82, 255, 0.28) 0%,
      rgba(140, 82, 255, 0.12) 60%,
      rgba(140, 82, 255, 0.06) 100%
    ),
    var(--bg-secondary);            /* ← capa base opaca */
  box-shadow:
    inset 4px 0 0 0 var(--accent-color),
    2px 0 8px -2px rgba(140, 82, 255, 0.45);
}
```

### 4.2 Aplicar misma fix a `:hover` de selected (~línea 2119)

```css
.animation-layer-row .layer-info.selected:hover {
  background:
    linear-gradient(
      90deg,
      rgba(140, 82, 255, 0.36) 0%,
      rgba(140, 82, 255, 0.16) 60%,
      rgba(140, 82, 255, 0.08) 100%
    ),
    var(--bg-secondary);
}
```

### 4.3 Verificación adicional

Revisar `.layer-item.selected` (línea 176) — usa `linear-gradient(135deg, var(--layer-selected), rgba(140,82,255,0.2))`. `var(--layer-selected)` es `#4b3c7a` (opaco según `:root`), pero el segundo stop sí es translúcido. Si esta regla se aplica al panel sticky en alguna vista, aplicar el mismo patrón multi-bg. Si solo aplica al `layerManager.jsx` aislado (no sticky), dejar igual.

---

## 5. Trabajo B — Fix posicionamiento popover

### 5.1 Cambio en `layerAnimation.jsx`

Mover `<ConfigOnionSkin>` desde el fragment hermano de `.animation-bar-unified` al interior de un wrapper `position: relative` que envuelve el botón ⚙ en `.unified-timeline-right`:

```jsx
{/* ANTES — orden actual ~líneas 1358-1372 y 1660-1666 */}
<ConfigOnionSkin isOpen={openOnion} ... />
<div className="animation-bar-unified">
  ...
  <div className="unified-timeline-right">
    <div className="onion-skin-toggle">...</div>
    <button
      className="config-button"
      onClick={() => { setOpenOnion(true); }}
      title="Configurar Onion Skin"
    >
      <LuSettings />
    </button>
  </div>
</div>

{/* DESPUÉS */}
<div className="animation-bar-unified">
  ...
  <div className="unified-timeline-right">
    <div className="onion-skin-toggle">...</div>
    <div className="onion-config-anchor">
      <button
        className="config-button"
        onClick={() => setOpenOnion(v => !v)}        /* toggle, no solo open */
        aria-expanded={openOnion}
        aria-haspopup="dialog"
        title="Configurar Onion Skin"
      >
        <LuSettings />
      </button>
      <ConfigOnionSkin
        isOpen={openOnion}
        onClose={() => setOpenOnion(false)}
        onionFramesConfig={onionFramesConfig}
        setOnionFramesConfig={setOnionFramesConfig}
        updateFrameConfig={updateFrameConfig}
        addPreviousFrame={addPreviousFrame}
        addNextFrame={addNextFrame}
        removeFrame={removeFrame}
        toggleOnionFrames={toggleOnionFrames}
        applyOnionFramesPreset={applyOnionFramesPreset}
        clearTintCache={clearTintCache}
      />
    </div>
  </div>
</div>
```

### 5.2 Cambio en CSS

```css
/* layerAnimation.css — añadir */
.unified-timeline-right .onion-config-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* configOnionSkin.css — reemplaza la regla actual de .onion-config__overlay */
.onion-config__overlay {
  position: absolute;
  bottom: calc(100% + 8px);   /* abre hacia arriba */
  right: 0;
  z-index: 1000;
  /* eliminar: transform, display: flex, align-items, justify-content, backdrop-filter */
}
```

### 5.3 Comportamientos nuevos del popover

Dentro de `configOnionSkin.jsx`:

- **Toggle al click** del botón ⚙ — ya garantizado por el cambio de `setOpenOnion(true)` → `setOpenOnion(v => !v)`.
- **Click outside cierra** — `useEffect` con listener `pointerdown` global; si `event.target` no está dentro del `.onion-config-anchor` (referenciado vía ref pasado como prop o detectado vía `closest('.onion-config-anchor')`), invocar `onClose()`.
- **Escape cierra** — `useEffect` con listener `keydown` mientras `isOpen`.

```jsx
// patrón sugerido dentro de ConfigOnionSkin
const modalRef = useRef(null);

useEffect(() => {
  if (!isOpen) return;

  const handlePointer = (e) => {
    const anchor = modalRef.current?.closest('.onion-config-anchor');
    if (anchor && !anchor.contains(e.target)) onClose();
  };
  const handleKey = (e) => {
    if (e.key === 'Escape') onClose();
  };

  document.addEventListener('pointerdown', handlePointer);
  document.addEventListener('keydown', handleKey);
  return () => {
    document.removeEventListener('pointerdown', handlePointer);
    document.removeEventListener('keydown', handleKey);
  };
}, [isOpen, onClose]);

// y en el JSX:
<div className="onion-config__overlay" ref={modalRef} role="dialog">
  ...
</div>
```

### 5.4 Edge case responsive

El popover mide 420px × ~auto. Las media queries existentes en `configOnionSkin.css` (≤768px → 95vw, ≤480px → 100vw fullscreen) se conservan. Ajustar la regla ≤480px para que **no** tenga `position: fixed` (eso reintroduciría el bug); en su lugar, usar `right: -10px` y `width: calc(100vw - 20px)`.

---

## 6. Trabajo C — Rediseño UI del popover

### 6.1 Estado React

```js
// ANTES
const [activeTab, setActiveTab] = useState('frames');
const [selectedFrameType, setSelectedFrameType] = useState('previous');
const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
const [draggedFrame, setDraggedFrame] = useState(null);

// DESPUÉS
const [expandedFrame, setExpandedFrame] = useState(null);
// expandedFrame: { type: 'previousFrames' | 'nextFrames', index: number } | null
```

### 6.2 Layout JSX

```
┌──────────────────────────────────────────────┐
│ [LuLayers]  Onion Skin   ●Activo        [×] │  Header compacto
├──────────────────────────────────────────────┤
│  [────●]  Activar onion skin                 │  Master toggle
│      2 anteriores  ·  1 siguiente            │  Stats inline
├──────────────────────────────────────────────┤
│ Estilo                                       │
│ [LuPalette Clásico][LuFlame Cálido]          │  Presets como chips
│ [LuEye Sutil][LuZap Neón]                    │
├──────────────────────────────────────────────┤
│ Frames anteriores              [+ Añadir]    │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ -1   ●  60%   [👁][⚙][×]             │   │  Chip compacto
│ └──────────────────────────────────────┘   │
│ ┌──────────────────────────────────────┐   │
│ │ -2   ●  30%   [👁][⚙][×]             │   │
│ │ ┌────────────────────────────────┐   │   │  Disclosure expandido
│ │ │ Opacidad   ━━●━━━  30%         │   │   │  cuando ⚙ está activo
│ │ │ Matiz      ━━━●━━  240°        │   │   │
│ │ │ Saturación ━━━●━━  70%         │   │   │
│ │ │ Brillo     ━━━●━━  50%         │   │   │
│ │ └────────────────────────────────┘   │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ Frames siguientes              [+ Añadir]    │
│ ┌──────────────────────────────────────┐   │
│ │ +1   ●  60%   [👁][⚙][×]             │   │
│ └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### 6.3 Componentes y comportamientos

- **Header** (`.onion-config__header`): icono `LuLayers` + título "Onion Skin" + status pill (Activo/Inactivo, igual que actualmente) + close button.
- **Quick controls**: master toggle (igual) + stats en una sola línea bajo el toggle ("2 anteriores · 1 siguiente").
- **Presets row**: 4 chips horizontales con flex-wrap. Iconos de lucide-react reemplazando emojis:
  - 🎨 → `LuPalette`
  - 🔥 → `LuFlame`
  - 👁️ → `LuEye`
  - ⚡ → `LuZap`
  - Hover: tint sutil + cursor-pointer. Click: `applyOnionFramesPreset(name)`.
- **Frame chips** — un chip por frame con:
  - Badge offset (`-1`, `+1`, etc.)
  - Color preview circular (24×24, `hsl(...)` con opacity)
  - % de opacidad como texto pequeño
  - Botón `LuEye/LuEyeOff` (toggle enabled — igual a `toggleFrameEnabled`)
  - Botón `LuSettings` (toggle expandedFrame — abre/cierra el panel inline de sliders solo para este frame)
  - Botón `LuMinus` (eliminar — igual a `handleRemoveFrame`)
- **Disclosure inline**: cuando `expandedFrame.type === <type> && expandedFrame.index === i`, debajo del chip se muestran los 4 sliders (opacity, hue, saturation, brightness) con las mismas reglas/animación que actualmente. Solo un frame expandido a la vez.
- **Botón "+ Añadir"** por sección — invoca `addPreviousFrame` o `addNextFrame`.
- **Empty state**: si no hay frames de un tipo, mostrar un texto sutil ("Sin frames anteriores") sin tarjeta gigante; el botón "+ Añadir" sigue visible.

### 6.4 CSS — clases a eliminar

Borrar de `configOnionSkin.css`:

- `.onion-config__tabs` y `.onion-config__tab-btn*` (no más tabs).
- `.onion-config__frame-type-selector`, `.onion-config__type-btn*`, `.onion-config__type-arrow`, `.onion-config__type-info`, `.onion-config__type-label`, `.onion-config__type-count` (no más selector previous/next).
- `.onion-config__current-config*`, `.onion-config__config-summary`, `.onion-config__summary-*` (bloque eliminado).
- `.onion-config__presets-tab` (la tab ya no existe; los presets se renderizan inline en main).
- `.onion-config__empty-state`, `.onion-config__empty-icon`, `.onion-config__empty-text`, `.onion-config__empty-add-btn` (el empty state nuevo es de una línea, sin tarjeta grande).

### 6.5 CSS — clases nuevas

```css
.onion-config__preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.onion-config__preset-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--onion-config-button-bg);
  border: 1px solid var(--onion-config-button-border);
  border-radius: var(--onion-config-border-radius-small);
  color: var(--onion-config-text-primary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.onion-config__preset-chip:hover {
  background: var(--onion-config-button-hover);
  border-color: var(--onion-config-accent-color);
  color: var(--onion-config-accent-color);
}

.onion-config__preset-chip svg {
  width: 16px;
  height: 16px;
}

.onion-config__frame-chip {
  display: flex;
  flex-direction: column;
  background: var(--onion-config-button-bg);
  border: 1px solid var(--onion-config-button-border);
  border-radius: var(--onion-config-border-radius);
  overflow: hidden;
  transition: all 0.2s ease;
}

.onion-config__frame-chip-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
}

.onion-config__frame-chip[data-disabled="true"] {
  opacity: 0.5;
}
/* En el JSX: <div className="onion-config__frame-chip" data-disabled={!frame.enabled} ...> */

.onion-config__frame-chip-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.onion-config__frame-chip-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* ...resto igual al .onion-config__frame-toggle actual */
}

.onion-config__advanced {
  border-top: 1px solid var(--onion-config-border-color);
  padding: 12px;
  animation: onionConfigExpandIn 0.2s ease-out;  /* keyframe ya existe */
}
```

### 6.6 Reglas UI/UX aplicadas (skill `ui-ux-pro-max`)

- `no-emoji-icons` — todos los emojis reemplazados por iconos de `react-icons/lu`.
- `cursor-pointer` — chips, swatches, botones-icono.
- `touch-target-size` — botones-icono `min-width: 32px; min-height: 32px`.
- `duration-timing` — transiciones `200ms ease`.
- `color-contrast` — texto sobre `bg-secondary` (`#2a2a2a`) ya cumple 4.5:1 con `#f0f0f0`.
- `focus-states` — preservar `box-shadow: 0 0 0 3px rgba(140,82,255,0.3)` en focus-visible para todos los chips/botones nuevos.
- `loading-states` — N/A (no hay async aquí).

---

## 7. Plan de verificación

Para cada trabajo:

1. **Trabajo A** (transparencia capas):
   - Crear sprite con ≥8 frames y ≥6 capas.
   - Seleccionar una capa.
   - Scroll horizontal: el panel sticky-left de esa capa debe estar opaco (no se ven frames detrás).
   - Scroll vertical: hover/selected siguen opacos.
   - Verificar en light theme (si existe) y dark.
2. **Trabajo B** (popover aparece):
   - Click en botón ⚙ → popover aparece justo encima del botón.
   - Click otra vez en ⚙ → popover se cierra.
   - Click fuera del popover → se cierra.
   - Tecla Escape → se cierra.
   - Resize a 768px / 480px: popover sigue visible y dentro del viewport.
3. **Trabajo C** (rediseño):
   - Aplicar preset Clásico: configura los frames preestablecidos visibles en los chips.
   - Click en `LuSettings` (⚙) de un chip: expande sliders inline; click en otro chip ⚙: cierra el anterior y abre el nuevo (solo uno expandido a la vez).
   - Toggle `LuEye` de un chip: chip se atenúa (`opacity: 0.5`), `frame.enabled = false`.
   - Añadir/quitar frames: contadores del header reflejan los cambios.
   - Verificar que `clearTintCache` se invoca al cerrar (ya gestionado en el `useEffect` actual con `[isOpen, clearTintCache]`).

---

## 8. Fuera de alcance (no incluido)

- Animaciones de entrada/salida del popover más allá de las existentes.
- Drag-and-drop para reordenar frames (la state actual `draggedFrame` se elimina, no estaba implementado).
- Internacionalización del popover (los strings siguen en español).
- Cambios en la lógica de tinting / render del onion skin (worker, GL).
- Light theme / theme switcher.
- Persistir el último preset aplicado entre sesiones.
