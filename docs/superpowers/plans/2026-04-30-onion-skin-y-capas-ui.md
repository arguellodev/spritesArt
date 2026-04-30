# Onion Skin Popover + Fix Transparencia Capas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reparar la transparencia del panel sticky-left de capas, hacer que el popover de configuración de onion skin aparezca anclado al botón ⚙, y rediseñar su contenido en una vista única intuitiva (una sola vista, presets como chips, disclosure inline).

**Architecture:** Tres trabajos independientes en orden de menor a mayor riesgo. (A) Fix CSS multi-background para que el gradiente translúcido tenga capa base opaca. (B) Mover `<ConfigOnionSkin>` desde un fragment hermano de la barra al interior de un wrapper `position: relative` que envuelve el botón ⚙, reescribiendo el `.onion-config__overlay` como popover anclado (`bottom: calc(100% + 8px); right: 0`) con click-outside + Escape. (C) Refactor del JSX/CSS de `configOnionSkin` para eliminar tabs/summary/emojis y mostrar todo (master toggle + presets en chips + ambas listas de frames con disclosure inline) en una vista única.

**Tech Stack:** React 19 (compiler-on, no memoización manual), Vite, CSS plano (sin Tailwind/CSS-in-JS), iconos `react-icons/lu` (lucide). El proyecto no tiene test runner — la verificación es manual con `npm run dev` + observación en el browser. Reference spec: `docs/superpowers/specs/2026-04-30-onion-skin-y-capas-ui-design.md`.

**Branch:** Trabajar sobre `feat/blend-modes` (rama actual del usuario) — NO crear branch nueva, NO commitear los archivos modificados sin commitear que ya están en el working tree (M de `tools/*`, etc.). Cada commit de este plan debe usar `git add` con paths explícitos a los archivos del plan, nunca `git add -A` ni `git add .`.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `src/editorSprites/Workspace/workspaceMain/layerAnimation.css` | Modify | Trabajo A: añadir capa base opaca al gradiente de `.layer-info.selected` y `:selected:hover`. Trabajo B: añadir clase `.onion-config-anchor`. |
| `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx` | Modify | Trabajo B: envolver el botón ⚙ y `<ConfigOnionSkin>` en wrapper `.onion-config-anchor`; cambiar `onClick` a toggle. |
| `src/editorSprites/Workspace/workspaceMain/configOnionSkin.css` | Modify | Trabajo B: reposicionar `.onion-config__overlay` como popover anclado. Trabajo C: eliminar reglas obsoletas (tabs, summary, type-selector, empty-state grande), añadir reglas nuevas (preset-chips, frame-chip). |
| `src/editorSprites/Workspace/workspaceMain/configOnionSkin.jsx` | Modify | Trabajo B: añadir `useEffect` de click-outside y Escape, ref al overlay. Trabajo C: refactor del estado (eliminar tabs/type-selector/index, añadir `expandedFrame`), refactor del render (vista única, presets inline, frame chips). |

---

## Tareas

### Task 1 (Trabajo A): Fix transparencia `.layer-info.selected`

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.css:2107-2117` y `:2119-2126`

- [ ] **Step 1: Verificar el bug visualmente (test manual de baseline)**

Run en una terminal:
```bash
npm run dev
```

Abrir `http://localhost:5173`, crear/abrir un proyecto con ≥6 frames y ≥4 capas. Seleccionar una capa cualquiera (que muestre el gradiente morado). Hacer scroll horizontal en la timeline.

Expected: los frames de las celdas a la derecha **se ven a través** del panel sticky-left de la capa seleccionada (transparencia visible).

- [ ] **Step 2: Aplicar fix multi-background a `.layer-info.selected`**

Edit `layerAnimation.css` regla en línea ~2107:

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
    var(--bg-secondary);
  box-shadow:
    inset 4px 0 0 0 var(--accent-color),
    2px 0 8px -2px rgba(140, 82, 255, 0.45);
}
```

- [ ] **Step 3: Aplicar el mismo fix a `.layer-info.selected:hover`**

Edit la regla en línea ~2119:

```css
/* ANTES */
.animation-layer-row .layer-info.selected:hover {
  background: linear-gradient(
    90deg,
    rgba(140, 82, 255, 0.36) 0%,
    rgba(140, 82, 255, 0.16) 60%,
    rgba(140, 82, 255, 0.08) 100%
  );
}

/* DESPUÉS */
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

- [ ] **Step 4: Verificar el fix visualmente**

Con el dev server corriendo (HMR debe recargar automáticamente):
- Seleccionar una capa, scroll horizontal: la columna sticky-left ahora es **opaca**, no se ven frames detrás.
- Hover sobre la capa seleccionada: sigue opaco con un tint ligeramente más fuerte.
- Hover sobre una capa **no** seleccionada: sigue funcionando (`var(--layer-hover)` no fue tocado).
- No-seleccionada (sin hover): sigue funcionando (`var(--bg-secondary)` no fue tocado).

Expected: ningún frame detrás visible en el panel sticky en ningún estado.

- [ ] **Step 5: Commit**

```bash
git add src/editorSprites/Workspace/workspaceMain/layerAnimation.css
git commit -m "$(cat <<'EOF'
fix(layers): panel sticky no transparente en capa seleccionada

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 (Trabajo B-1): Wrapper DOM `.onion-config-anchor`

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx:1358-1372` (mover `<ConfigOnionSkin>`) y `:1660-1666` (envolver botón ⚙)
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.css` (añadir regla `.onion-config-anchor`)

- [ ] **Step 1: Localizar el render actual de `<ConfigOnionSkin>`**

Run:
```bash
grep -n "ConfigOnionSkin" src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx
```

Expected: matches en imports y en una posición ~línea 1358 dentro del fragment `<>` del return.

- [ ] **Step 2: Eliminar el render flotante actual de `<ConfigOnionSkin>` (líneas ~1358-1372)**

Edit `layerAnimation.jsx`. Localizar el bloque actual:

```jsx
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
```

Eliminarlo completamente (lo movemos al wrapper en el siguiente paso).

- [ ] **Step 3: Envolver el botón ⚙ en el nuevo wrapper y añadir `<ConfigOnionSkin>` adentro**

Edit `layerAnimation.jsx` línea ~1660. Localizar:

```jsx
          <button
            className="config-button"
            onClick={() => { setOpenOnion(true); }}
            title="Configurar Onion Skin"
          >
            <LuSettings />
          </button>
```

Reemplazar por:

```jsx
          <div className="onion-config-anchor">
            <button
              className="config-button"
              onClick={() => setOpenOnion(v => !v)}
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
```

- [ ] **Step 4: Añadir regla CSS `.onion-config-anchor` al final de `layerAnimation.css`**

Append al final del archivo:

```css
/* ============================================================================
   ANCHOR para el popover de Onion Skin: provee position: relative al botón
   ⚙ + <ConfigOnionSkin> juntos, para que el overlay del popover se ancle
   correctamente con bottom/right en lugar de irse al body.
   ============================================================================ */
.unified-timeline-right .onion-config-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
}
```

- [ ] **Step 5: Verificar que no rompe nada visualmente todavía**

Con el dev server corriendo, click en el botón ⚙. El popover seguirá apareciendo MAL POSICIONADO (probablemente fuera del viewport o tapado), porque aún no hemos cambiado el CSS del overlay. Pero la app no debe crashear ni dar errores en consola.

Expected: app sigue funcionando, sin errors en DevTools console.

NO hacer commit aquí — el commit del trabajo B se hace al final, cuando el popover se ve correcto. Continuar a Task 3.

---

### Task 3 (Trabajo B-2): Reposicionar `.onion-config__overlay` como popover anclado

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/configOnionSkin.css:35-44` (regla `.onion-config__overlay`) y media queries `:816-855` (≤768px) y `:857-886` (≤480px)

- [ ] **Step 1: Reescribir la regla `.onion-config__overlay`**

Edit `configOnionSkin.css` línea ~35. Localizar:

```css
.onion-config__overlay {
  position: absolute;
  transform: translateY(calc(-100% - 10px));
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}
```

Reemplazar por:

```css
.onion-config__overlay {
  position: absolute;
  bottom: calc(100% + 8px);   /* abre hacia arriba: la barra está abajo */
  right: 0;
  z-index: 1000;
}
```

(eliminado: `transform`, `display: flex`, `align-items`, `justify-content`, `backdrop-filter` — el overlay ya no cubre la pantalla, no necesita centrar nada ni aplicar blur global. El blur del modal interno se preserva en `.onion-config__modal { backdrop-filter: blur(10px) }`.)

- [ ] **Step 2: Ajustar media query `@media (max-width: 480px)`**

Edit `configOnionSkin.css` línea ~857. Localizar:

```css
@media (max-width: 480px) {
  .onion-config__modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    max-height: none;
  }
  ...
}
```

Reemplazar el bloque `.onion-config__modal` por una versión que NO use width/height fullscreen (eso reintroduciría el bug):

```css
@media (max-width: 480px) {
  .onion-config__overlay {
    right: -10px;
  }

  .onion-config__modal {
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px);
    max-height: 80vh;
  }
  ...
}
```

(deja el resto del bloque `@media` igual: `.onion-config__header { border-radius: 0 }` se elimina porque ya no es fullscreen; mantén `.onion-config__frame-header`, `.onion-config__frame-controls`, `.onion-config__quick-controls`, `.onion-config__frame-stats` — esos siguen siendo válidos para layout estrecho).

Resultado final del bloque @media (max-width: 480px):

```css
@media (max-width: 480px) {
  .onion-config__overlay {
    right: -10px;
  }

  .onion-config__modal {
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px);
    max-height: 80vh;
  }

  .onion-config__frame-header {
    padding: 12px;
  }

  .onion-config__frame-controls {
    padding: 0 12px 12px;
  }

  .onion-config__quick-controls {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .onion-config__frame-stats {
    justify-content: space-around;
  }
}
```

- [ ] **Step 3: Verificar el popover anclado**

Con el dev server corriendo (HMR), click en botón ⚙ en la barra de animación. El popover debe aparecer **encima** del botón, alineado a la derecha.

Expected:
- Popover visible, sin scroll del documento.
- Posición: 8px arriba del botón, alineado al borde derecho.
- Click otra vez en ⚙: el popover **se cierra** (toggle ya está implementado en Task 2).

NO hacer commit aún — falta el click-outside (Task 4). Continuar.

---

### Task 4 (Trabajo B-3): Click-outside + Escape para cerrar el popover

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/configOnionSkin.jsx:23-34` (añadir ref + nuevo `useEffect`)

- [ ] **Step 1: Añadir ref al overlay y `useEffect` para listeners**

Edit `configOnionSkin.jsx`. Localizar el bloque al inicio del componente (línea ~19-34):

```jsx
const ConfigOnionSkin = ({ ... }) => {
  const [activeTab, setActiveTab] = useState('frames');
  const [selectedFrameType, setSelectedFrameType] = useState('previous');
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [draggedFrame, setDraggedFrame] = useState(null);

  const didMountRef = useRef(false);

  useEffect(() => {
    didMountRef.current = true;
  }, []);

  useEffect(() => {
    if (!isOpen && clearTintCache) {
      clearTintCache();
    }
  }, [isOpen, clearTintCache]);
```

Añadir DESPUÉS del `useEffect` existente de `clearTintCache`:

```jsx
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (e) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const anchor = overlay.closest('.onion-config-anchor');
      if (anchor && !anchor.contains(e.target)) {
        onClose();
      }
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
```

- [ ] **Step 2: Asignar `overlayRef` al elemento `.onion-config__overlay`**

Edit `configOnionSkin.jsx`. Localizar línea ~120 donde se renderiza el overlay:

```jsx
  return (
    <div className="onion-config__overlay">
      <div className="onion-config__modal">
```

Cambiar a:

```jsx
  return (
    <div className="onion-config__overlay" ref={overlayRef} role="dialog" aria-modal="false">
      <div className="onion-config__modal">
```

- [ ] **Step 3: Verificar comportamientos**

Con dev server corriendo:
- Click en ⚙ → popover abre.
- Click otra vez en ⚙ → popover cierra (toggle ya implementado).
- Click DENTRO del popover (en cualquier control) → no cierra.
- Click FUERA del popover y del botón ⚙ → cierra.
- Tecla Escape con popover abierto → cierra.
- Tecla Escape con popover cerrado → no hace nada (`if (!isOpen) return;`).

Expected: los 5 comportamientos funcionan.

- [ ] **Step 4: Commit del trabajo B completo**

```bash
git add src/editorSprites/Workspace/workspaceMain/layerAnimation.jsx \
        src/editorSprites/Workspace/workspaceMain/layerAnimation.css \
        src/editorSprites/Workspace/workspaceMain/configOnionSkin.jsx \
        src/editorSprites/Workspace/workspaceMain/configOnionSkin.css
git commit -m "$(cat <<'EOF'
feat(onion-skin): popover anclado al boton de configuracion

- Wrapper .onion-config-anchor con position: relative
- Overlay reposicionado con bottom/right en vez de absolute al body
- Toggle del boton + click-outside + Escape para cerrar

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5 (Trabajo C-1): Refactor estado — eliminar tabs/type-selector/index, añadir `expandedFrame`

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/configOnionSkin.jsx:19-24` (estado), `:115-117` (cómputo de `currentFrameArray`), y handlers afectados

- [ ] **Step 1: Reemplazar los 4 useState antiguos por `expandedFrame`**

Edit `configOnionSkin.jsx` línea ~19. Localizar:

```jsx
  const [activeTab, setActiveTab] = useState('frames');
  const [selectedFrameType, setSelectedFrameType] = useState('previous');
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [draggedFrame, setDraggedFrame] = useState(null);
```

Reemplazar por:

```jsx
  // expandedFrame: { type: 'previousFrames' | 'nextFrames', index: number } | null
  const [expandedFrame, setExpandedFrame] = useState(null);
```

- [ ] **Step 2: Eliminar imports de iconos no usados; añadir nuevos**

Edit `configOnionSkin.jsx` línea 1-2. Localizar:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { LuPlus, LuMinus, LuEye, LuEyeOff, LuRotateCcw, LuPalette, LuSettings } from 'react-icons/lu';
```

Reemplazar por:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { LuPlus, LuMinus, LuEye, LuEyeOff, LuLayers, LuPalette, LuFlame, LuZap, LuSettings } from 'react-icons/lu';
```

(eliminado: `LuRotateCcw` — no se usaba; añadidos: `LuLayers` para el header, `LuFlame` y `LuZap` para presets.)

- [ ] **Step 3: Eliminar handlers obsoletos `handleAddFrame`, `getFrameArrayName`, `duplicateFrame`**

Edit `configOnionSkin.jsx` líneas ~42-104. Localizar y eliminar:

```jsx
  const handleAddFrame = () => {
    if (selectedFrameType === 'previous' && addPreviousFrame) {
      addPreviousFrame();
    } else if (selectedFrameType === 'next' && addNextFrame) {
      addNextFrame();
    }
  };
```

```jsx
  const duplicateFrame = (type, index) => {
    ...
  };
```

```jsx
  const getFrameArrayName = () => {
    return selectedFrameType === 'previous' ? 'previousFrames' : 'nextFrames';
  };
```

`handleAddFrame` se reemplaza por dos invocaciones directas a `addPreviousFrame()` / `addNextFrame()` desde el JSX. `duplicateFrame` no se usa en ningún lado del nuevo diseño. `getFrameArrayName` ya no aplica (no hay tipo seleccionado).

- [ ] **Step 4: Modificar `handleRemoveFrame` para aceptar tipo + index explícitos**

Edit `configOnionSkin.jsx` línea ~50. Localizar:

```jsx
  const handleRemoveFrame = (index) => {
    if (removeFrame) {
      const frameArray = selectedFrameType === 'previous' ? 'previousFrames' : 'nextFrames';
      removeFrame(frameArray, index);
      
      const maxIndex = onionFramesConfig[frameArray].length - 2;
      if (selectedFrameIndex > maxIndex && maxIndex >= 0) {
        setSelectedFrameIndex(maxIndex);
      } else if (maxIndex < 0) {
        setSelectedFrameIndex(0);
      }
    }
  };
```

Reemplazar por:

```jsx
  const handleRemoveFrame = (frameArrayName, index) => {
    if (!removeFrame) return;
    removeFrame(frameArrayName, index);
    setExpandedFrame(prev =>
      prev && prev.type === frameArrayName && prev.index === index ? null : prev
    );
  };
```

- [ ] **Step 5: Eliminar bloque `if (!isOpen || !onionFramesConfig) return null;` con cómputos obsoletos**

Edit `configOnionSkin.jsx` línea ~113-117. Localizar:

```jsx
  if (!isOpen || !onionFramesConfig) return null;

  const frameArrayName = getFrameArrayName();
  const currentFrameArray = onionFramesConfig[frameArrayName];
  const selectedFrame = currentFrameArray[selectedFrameIndex] || null;
```

Reemplazar por:

```jsx
  if (!isOpen || !onionFramesConfig) return null;

  const isExpanded = (type, index) =>
    expandedFrame !== null && expandedFrame.type === type && expandedFrame.index === index;

  const toggleExpanded = (type, index) => {
    setExpandedFrame(prev =>
      prev && prev.type === type && prev.index === index ? null : { type, index }
    );
  };
```

- [ ] **Step 6: Reemplazar la lista `presets` para no tener emojis**

Edit `configOnionSkin.jsx` línea ~106. Localizar:

```jsx
  const presets = [
    { name: 'classic', label: 'Clásico', icon: '🎨' },
    { name: 'warm', label: 'Cálido', icon: '🔥' },
    { name: 'subtle', label: 'Sutil', icon: '👁️' },
    { name: 'neon', label: 'Neón', icon: '⚡' }
  ];
```

Reemplazar por:

```jsx
  const presets = [
    { name: 'classic', label: 'Clásico', Icon: LuPalette },
    { name: 'warm', label: 'Cálido', Icon: LuFlame },
    { name: 'subtle', label: 'Sutil', Icon: LuEye },
    { name: 'neon', label: 'Neón', Icon: LuZap }
  ];
```

- [ ] **Step 7: Verificar que el archivo compila (sin renderizar todavía)**

Con `npm run dev` corriendo, abrir DevTools console. Esperar HMR.

Expected: la app no crashea pero el popover, al abrirlo, va a renderizar JSX que aún hace referencia a `activeTab`, `selectedFrameType`, etc. → errores en consola.

Esto es esperado en este punto. Continuar a Task 6 que reescribe el JSX.

NO hacer commit aún. La UI quedará rota entre Task 5 y Task 7.

---

### Task 6 (Trabajo C-2): Reescribir el JSX del popover (header + presets row + frame chips)

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/configOnionSkin.jsx:119-446` (todo el bloque de `return`)

- [ ] **Step 1: Reemplazar TODO el `return (...)` por la nueva estructura**

Edit `configOnionSkin.jsx`. Localizar el bloque que empieza en `return (` (línea ~119) y termina con `);` antes de `};` final (línea ~446). Reemplazar TODO ese bloque por:

```jsx
  return (
    <div
      className="onion-config__overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="false"
      aria-label="Configuración de Onion Skin"
    >
      <div className="onion-config__modal">

        {/* Header */}
        <div className="onion-config__header">
          <div className="onion-config__header-left">
            <LuLayers className="onion-config__header-icon" />
            <h2 className="onion-config__title">Onion Skin</h2>
            <div className="onion-config__status-indicator">
              {onionFramesConfig.enabled ? (
                <div className="onion-config__status onion-config__status--enabled">
                  <div className="onion-config__status-dot"></div>
                  Activo
                </div>
              ) : (
                <div className="onion-config__status onion-config__status--disabled">
                  <div className="onion-config__status-dot"></div>
                  Inactivo
                </div>
              )}
            </div>
          </div>
          <button className="onion-config__close-btn" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {/* Master toggle + stats */}
        <div className="onion-config__quick-controls">
          <div className="onion-config__master-toggle">
            <label className="onion-config__toggle-switch">
              <input
                type="checkbox"
                checked={onionFramesConfig.enabled}
                onChange={toggleOnionFrames}
                className="onion-config__toggle-input"
              />
              <span className="onion-config__toggle-slider"></span>
            </label>
            <span className="onion-config__toggle-text">
              {onionFramesConfig.enabled ? 'Onion Skin activo' : 'Activar Onion Skin'}
            </span>
          </div>

          <div className="onion-config__stats-inline">
            <span>{onionFramesConfig.previousFrames.filter(f => f.enabled).length} anteriores</span>
            <span className="onion-config__stats-divider">·</span>
            <span>{onionFramesConfig.nextFrames.filter(f => f.enabled).length} siguientes</span>
          </div>
        </div>

        {/* Body único — sin tabs */}
        <div className="onion-config__body">

          {/* Presets row */}
          <section className="onion-config__section">
            <h3 className="onion-config__section-title">Estilo</h3>
            <div className="onion-config__preset-chips">
              {presets.map(({ name, label, Icon }) => (
                <button
                  key={name}
                  type="button"
                  className="onion-config__preset-chip"
                  onClick={() => handlePresetApply(name)}
                  title={`Aplicar preset ${label}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Frame list — anteriores */}
          {renderFrameSection('previousFrames', 'Frames anteriores', '-', addPreviousFrame)}

          {/* Frame list — siguientes */}
          {renderFrameSection('nextFrames', 'Frames siguientes', '+', addNextFrame)}

        </div>
      </div>
    </div>
  );
```

- [ ] **Step 2: Añadir la función helper `renderFrameSection` ANTES del `return`**

Edit `configOnionSkin.jsx`. Justo antes de `return (`, añadir:

```jsx
  const renderFrameSection = (frameArrayName, sectionTitle, signPrefix, addHandler) => {
    const frames = onionFramesConfig[frameArrayName] || [];

    return (
      <section className="onion-config__section" key={frameArrayName}>
        <div className="onion-config__section-header">
          <h3 className="onion-config__section-title">{sectionTitle}</h3>
          <button
            type="button"
            className="onion-config__add-frame-btn"
            onClick={addHandler}
          >
            <LuPlus size={14} />
            Añadir
          </button>
        </div>

        {frames.length === 0 ? (
          <p className="onion-config__empty-line">Sin frames configurados</p>
        ) : (
          <div className="onion-config__frame-chips">
            {frames.map((frame, index) => {
              const expanded = isExpanded(frameArrayName, index);
              return (
                <div
                  key={index}
                  className="onion-config__frame-chip"
                  data-disabled={!frame.enabled}
                >
                  <div className="onion-config__frame-chip-row">
                    <span className="onion-config__frame-offset">
                      {signPrefix}{frame.offset}
                    </span>
                    <div
                      className="onion-config__frame-color-preview"
                      style={{
                        backgroundColor: `hsl(${frame.hue}, ${frame.saturation}%, ${frame.brightness}%)`,
                        opacity: frame.enabled ? frame.opacity : 0.3
                      }}
                    />
                    <span className="onion-config__frame-opacity-label">
                      {Math.round(frame.opacity * 100)}%
                    </span>
                    <div className="onion-config__frame-chip-actions">
                      <button
                        type="button"
                        className={`onion-config__frame-chip-btn ${frame.enabled ? 'is-on' : 'is-off'}`}
                        onClick={() => toggleFrameEnabled(frameArrayName, index)}
                        title={frame.enabled ? 'Desactivar' : 'Activar'}
                      >
                        {frame.enabled ? <LuEye size={14} /> : <LuEyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        className={`onion-config__frame-chip-btn ${expanded ? 'is-active' : ''}`}
                        onClick={() => toggleExpanded(frameArrayName, index)}
                        title="Personalizar"
                        aria-expanded={expanded}
                      >
                        <LuSettings size={14} />
                      </button>
                      <button
                        type="button"
                        className="onion-config__frame-chip-btn onion-config__frame-chip-btn--remove"
                        onClick={() => handleRemoveFrame(frameArrayName, index)}
                        title="Eliminar"
                      >
                        <LuMinus size={14} />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="onion-config__advanced">
                      <div className="onion-config__control-group">
                        <label className="onion-config__control-label">
                          Opacidad: {Math.round(frame.opacity * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={frame.opacity}
                          onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'opacity', parseFloat(e.target.value))}
                          className="onion-config__slider onion-config__slider--opacity"
                        />
                      </div>

                      <div className="onion-config__control-group">
                        <label className="onion-config__control-label">Matiz: {frame.hue}°</label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={frame.hue}
                          onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'hue', parseInt(e.target.value))}
                          className="onion-config__slider onion-config__slider--hue"
                        />
                      </div>

                      <div className="onion-config__control-row">
                        <div className="onion-config__control-group">
                          <label className="onion-config__control-label">
                            Saturación: {frame.saturation}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={frame.saturation}
                            onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'saturation', parseInt(e.target.value))}
                            className="onion-config__slider"
                          />
                        </div>
                        <div className="onion-config__control-group">
                          <label className="onion-config__control-label">
                            Brillo: {frame.brightness}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="200"
                            value={frame.brightness}
                            onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'brightness', parseInt(e.target.value))}
                            className="onion-config__slider"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };
```

- [ ] **Step 3: Verificar que `toggleFrameEnabled` sigue existiendo y es compatible**

Run:
```bash
grep -n "toggleFrameEnabled" src/editorSprites/Workspace/workspaceMain/configOnionSkin.jsx
```

Expected: hay una declaración de `toggleFrameEnabled` (línea ~70 del archivo original) con esta firma:

```jsx
  const toggleFrameEnabled = (type, index) => {
    const frameArray = onionFramesConfig[type];
    const frame = frameArray[index];
    if (frame) {
      handleFrameConfigChange(type, index, 'enabled', !frame.enabled);
    }
  };
```

Esa función ya recibe `type` (que será `'previousFrames'` o `'nextFrames'`) e `index`. Compatible. **No tocar.**

- [ ] **Step 4: Verificar el render**

Con dev server corriendo (HMR):
- Abrir el popover ⚙.
- Verificar que aparece: header con icono `LuLayers`, master toggle, stats, sección "Estilo" con 4 chips (Clásico/Cálido/Sutil/Neón cada uno con su icono lucide), sección "Frames anteriores" con + Añadir, sección "Frames siguientes" con + Añadir.
- Click en preset Cálido: aplica el preset, los frames muestran los nuevos colores.
- Click en ⚙ de un frame chip: expande inline los 4 sliders (opacity, hue, sat, bri).
- Click en ⚙ del MISMO frame: cierra (toggle).
- Click en ⚙ de OTRO frame: cierra el anterior y abre el nuevo (solo uno expandido a la vez).
- Click en 👁/👁‍🗨: toggle de enabled, el chip se atenúa cuando deshabilitado (`data-disabled="true"` aún sin estilo, eso viene en Task 7).
- Click en − de un chip: lo elimina; si era el expandido, se cierra el disclosure.
- Click en "+ Añadir" de cada sección: añade frame.

Expected: todos los comportamientos funcionan. UI funcional aunque sin estilos nuevos todavía (sigue mezclando estilos viejos de tabs/chips/etc.; eso se limpia en Task 7).

NO hacer commit aún.

---

### Task 7 (Trabajo C-3): Limpieza CSS — eliminar reglas obsoletas + añadir reglas nuevas

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/configOnionSkin.css` (eliminar bloques obsoletos, añadir nuevas reglas)

- [ ] **Step 1: Eliminar bloque "TABS" completo (líneas ~257-298)**

Edit `configOnionSkin.css`. Localizar y eliminar:

```css
/* ============ TABS ============ */
.onion-config__tabs { ... }
.onion-config__tab-btn { ... }
.onion-config__tab-btn:hover { ... }
.onion-config__tab-btn--active { ... }
.onion-config__tab-btn--active::after { ... }
```

(todo el bloque de tabs, ya no se renderiza nada con esas clases.)

- [ ] **Step 2: Eliminar bloque "FRAME TYPE SELECTOR" (líneas ~331-383)**

Edit `configOnionSkin.css`. Localizar y eliminar todo el bloque `/* ============ FRAME TYPE SELECTOR ============ */` con sus reglas:

```css
.onion-config__frame-type-selector { ... }
.onion-config__type-btn { ... }
.onion-config__type-btn:hover { ... }
.onion-config__type-btn--active { ... }
.onion-config__type-arrow { ... }
.onion-config__type-info { ... }
.onion-config__type-label { ... }
.onion-config__type-count { ... }
```

- [ ] **Step 3: Eliminar bloque "CURRENT CONFIG" (líneas ~742-813)**

Edit `configOnionSkin.css`. Localizar y eliminar todo el bloque `/* ============ CURRENT CONFIG ============ */`:

```css
.onion-config__current-config { ... }
.onion-config__current-config-title { ... }
.onion-config__config-summary { ... }
.onion-config__summary-section { ... }
.onion-config__summary-title { ... }
.onion-config__summary-frames { ... }
.onion-config__summary-frame { ... }
.onion-config__summary-offset { ... }
.onion-config__summary-color { ... }
.onion-config__summary-status--enabled { ... }
.onion-config__summary-status--disabled { ... }
```

- [ ] **Step 4: Eliminar empty-state grande y reglas .onion-config__presets-tab si existen**

Edit `configOnionSkin.css`. Localizar y eliminar:

```css
.onion-config__empty-state { ... }
.onion-config__empty-icon { ... }
.onion-config__empty-text { ... }
.onion-config__empty-add-btn { ... }
.onion-config__empty-add-btn:hover { ... }
```

Run:
```bash
grep -n "presets-tab\|frames-tab" src/editorSprites/Workspace/workspaceMain/configOnionSkin.css
```

Expected: matches en `.onion-config__frames-tab` y `.onion-config__presets-tab` (línea ~309). Eliminar el bloque que los lista juntos:

```css
.onion-config__frames-tab,
.onion-config__presets-tab {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.onion-config__frames-tab::-webkit-scrollbar,
.onion-config__presets-tab::-webkit-scrollbar { ... }
.onion-config__frames-tab::-webkit-scrollbar-track,
.onion-config__presets-tab::-webkit-scrollbar-track { ... }
.onion-config__frames-tab::-webkit-scrollbar-thumb,
.onion-config__presets-tab::-webkit-scrollbar-thumb { ... }
```

(la nueva clase `.onion-config__body` reemplaza a estas dos — ver Step 7.)

- [ ] **Step 5: Limpiar `.onion-config__content` (línea ~301)**

Edit `configOnionSkin.css`. Localizar:

```css
.onion-config__content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

Esta regla ya no se usa (`.onion-config__content` no aparece en el nuevo JSX). Eliminarla.

- [ ] **Step 6: Eliminar reglas viejas de `.onion-config__frame-list*`, `.onion-config__frame-item*`, `.onion-config__frame-header`, `.onion-config__frame-info`, `.onion-config__frame-actions`, `.onion-config__frame-toggle*`, `.onion-config__frame-remove*`, `.onion-config__frame-controls`, `.onion-config__color-controls`, `.onion-config__frame-preview`, `.onion-config__preview-swatch`, `.onion-config__preview-text`, `.onion-config__presets-grid`, `.onion-config__preset-card*`, `.onion-config__preset-icon`, `.onion-config__preset-label`**

Edit `configOnionSkin.css`. Localizar bloque "FRAME LIST" (línea ~427), "FRAME ITEMS" (línea ~474), "FRAME CONTROLS" (línea ~563), "FRAME PREVIEW" (línea ~670), "PRESETS" (línea ~695). Eliminar todas esas reglas (sus clases ya no aparecen en el JSX nuevo). Mantener solo:
- `.onion-config__control-group` (regla ~582) — REUTILIZADA por el nuevo `.onion-config__advanced`.
- `.onion-config__control-label` (regla ~586) — REUTILIZADA.
- `.onion-config__control-row` (regla ~594) — REUTILIZADA.
- Bloque "SLIDERS" (línea ~604) — REUTILIZADO.

Eliminar también la animación expandIn solo si está exclusivamente en frame-controls; si la usamos en `.onion-config__advanced`, la mantenemos. **Mantener**:

```css
@keyframes onionConfigExpandIn { ... }
```

- [ ] **Step 7: Añadir nuevas reglas al final del archivo (antes de `@media (max-width:...)` y `@media (prefers-color-scheme:...)`)**

Edit `configOnionSkin.css`. Localizar la línea anterior al primer `@media (max-width: 768px)` (línea ~816 del archivo original; el número exacto cambió tras los borrados anteriores). Insertar ANTES de ese `@media`:

```css
/* ============ BODY (vista única, sin tabs) ============ */
.onion-config__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.onion-config__body::-webkit-scrollbar {
  width: 6px;
}

.onion-config__body::-webkit-scrollbar-track {
  background: transparent;
}

.onion-config__body::-webkit-scrollbar-thumb {
  background: var(--onion-config-border-color);
  border-radius: 3px;
}

/* ============ SECTIONS ============ */
.onion-config__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* (Ya existía .onion-config__section-header — la reutilizamos.
    Ya existía .onion-config__section-title — la reutilizamos.
    Ya existía .onion-config__add-frame-btn — la reutilizamos.) */

/* ============ STATS INLINE (header bajo el master toggle) ============ */
.onion-config__stats-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--onion-config-text-secondary);
  font-variant-numeric: tabular-nums;
}

.onion-config__stats-divider {
  opacity: 0.4;
}

/* ============ PRESET CHIPS ============ */
.onion-config__preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  min-height: 32px;
}

.onion-config__preset-chip:hover {
  background: var(--onion-config-button-hover);
  border-color: var(--onion-config-accent-color);
  color: var(--onion-config-accent-color);
}

.onion-config__preset-chip:active {
  background: var(--onion-config-accent-color);
  border-color: var(--onion-config-accent-color);
  color: white;
}

/* ============ FRAME CHIPS ============ */
.onion-config__empty-line {
  margin: 0;
  font-size: 0.85rem;
  color: var(--onion-config-text-muted);
  font-style: italic;
}

.onion-config__frame-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onion-config__frame-chip {
  background: var(--onion-config-button-bg);
  border: 1px solid var(--onion-config-button-border);
  border-radius: var(--onion-config-border-radius);
  overflow: hidden;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.onion-config__frame-chip[data-disabled="true"] {
  opacity: 0.55;
}

.onion-config__frame-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  min-height: 44px;
}

.onion-config__frame-offset {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--onion-config-text-primary);
  min-width: 28px;
  font-variant-numeric: tabular-nums;
}

.onion-config__frame-color-preview {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--onion-config-border-color);
  flex-shrink: 0;
}

.onion-config__frame-opacity-label {
  font-size: 0.78rem;
  color: var(--onion-config-text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
}

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
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--onion-config-border-radius-small);
  color: var(--onion-config-text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.onion-config__frame-chip-btn:hover {
  background: var(--onion-config-button-hover);
  color: var(--onion-config-text-primary);
}

.onion-config__frame-chip-btn.is-on {
  color: var(--onion-config-success);
}

.onion-config__frame-chip-btn.is-off {
  color: var(--onion-config-text-muted);
}

.onion-config__frame-chip-btn.is-active {
  background: rgba(140, 82, 255, 0.15);
  border-color: var(--onion-config-accent-color);
  color: var(--onion-config-accent-color);
}

.onion-config__frame-chip-btn--remove:hover {
  background: rgba(255, 82, 82, 0.15);
  border-color: var(--onion-config-danger);
  color: var(--onion-config-danger);
}

/* ============ ADVANCED (disclosure inline por chip) ============ */
.onion-config__advanced {
  border-top: 1px solid var(--onion-config-border-color);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: onionConfigExpandIn 0.2s ease-out;
}

.onion-config__advanced .onion-config__control-group {
  margin-bottom: 0;
}

/* ============ FOCUS STATES (a11y) ============ */
.onion-config__preset-chip:focus-visible,
.onion-config__frame-chip-btn:focus-visible,
.onion-config__add-frame-btn:focus-visible,
.onion-config__close-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(140, 82, 255, 0.35);
}
```

- [ ] **Step 8: Verificar HMR del CSS**

Con `npm run dev` corriendo:
- Abrir popover ⚙.
- Verificar visual: header con icono `LuLayers`, master toggle ocupa la línea, stats "N anteriores · N siguientes" debajo.
- Sección "Estilo" con 4 chips horizontales (Clásico/Cálido/Sutil/Neón) con sus iconos lucide.
- Sección "Frames anteriores" con [+ Añadir] y chips compactos.
- Sección "Frames siguientes" con [+ Añadir] y chips compactos.
- Click en ⚙ de un chip: expande inline los 4 sliders, animación suave.
- Hover en chip preset: tint morado.
- Botón 👁: pinta verde cuando enabled, gris cuando disabled.
- Frame disabled: chip al 55% opacidad.
- Botón − hover: tint rojo.
- Click outside: cierra.
- Escape: cierra.

Expected: todo lo anterior funciona y se ve limpio.

- [ ] **Step 9: Commit del trabajo C completo**

```bash
git add src/editorSprites/Workspace/workspaceMain/configOnionSkin.jsx \
        src/editorSprites/Workspace/workspaceMain/configOnionSkin.css
git commit -m "$(cat <<'EOF'
feat(onion-skin): rediseño popover en vista única con chips de presets

- Elimina tabs (frames/presets), selector previous/next y bloque resumen
- Presets como chips horizontales con iconos lucide (sin emojis)
- Frame chips compactos con disclosure inline por boton ⚙
- Estado simplificado: expandedFrame único en vez de 4 useState

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Verificación final integrada

**Files:** ninguno modificado — solo verificación manual.

- [ ] **Step 1: Smoke test completo**

Con `npm run dev` corriendo en `http://localhost:5173`:

1. Abrir un proyecto con ≥6 frames y ≥4 capas.
2. **Trabajo A**: seleccionar capa, scroll horizontal — panel sticky-left no transparente. ✓
3. **Trabajo B**:
   - Click en ⚙ → popover anclado encima del botón. ✓
   - Click en ⚙ otra vez → cierra. ✓
   - Abrir, click en master toggle → activa onion skin (visible en canvas). ✓
   - Click fuera → cierra. ✓
   - Reabrir, Escape → cierra. ✓
4. **Trabajo C**:
   - Aplicar preset Cálido → frames cambian a tonos rojizos. ✓
   - ⚙ de un chip → expande sliders. ✓
   - Mover hue/sat/bri → onion skin del canvas refleja cambios en vivo. ✓
   - 👁 → toggle de enabled. ✓
   - − → elimina frame. ✓
   - + Añadir → añade frame nuevo. ✓
5. Resize la ventana a 480px de ancho: el popover sigue dentro del viewport.
6. Abrir DevTools console: sin errores de React (key warnings, prop types, etc).

- [ ] **Step 2: Confirmar git status limpio respecto al plan**

Run:
```bash
git log --oneline -5
git status --short
```

Expected:
- `git log` muestra 3 commits nuevos: trabajo A, trabajo B, trabajo C.
- `git status` muestra los mismos archivos modificados pre-existentes (los `M src/editorSprites/Workspace/customTool/tools/...` etc. que ya estaban antes de empezar este plan), pero NINGUNO de los archivos del plan en estado modificado.

- [ ] **Step 3 (opcional): Build de producción**

Run:
```bash
npm run build
```

Expected: build exitoso sin errores. (Si hay warnings de Vite sobre chunks grandes, son pre-existentes y no relacionados al plan.)

---

## Self-Review

**1. Spec coverage:**
- §3 trabajo A → Task 1 ✓
- §3 trabajo B → Tasks 2-4 ✓
- §3 trabajo C → Tasks 5-7 ✓
- §4 fix `.layer-info.selected` y `:selected:hover` → Task 1 Steps 2-3 ✓
- §5.1 wrapper DOM → Task 2 ✓
- §5.2 CSS popover anclado → Task 3 ✓
- §5.3 click-outside + Escape → Task 4 ✓
- §5.4 responsive 480px → Task 3 Step 2 ✓
- §6.1 estado React → Task 5 Step 1 ✓
- §6.2 layout JSX → Task 6 ✓
- §6.3 comportamientos chips/disclosure → Task 6 Step 2 (renderFrameSection) ✓
- §6.4 reglas a eliminar → Task 7 Steps 1-6 ✓
- §6.5 reglas nuevas → Task 7 Step 7 ✓
- §6.6 reglas UI/UX (no-emoji-icons, cursor-pointer, touch-target-size, focus-states) → cubierto en Step 7 (focus-states block, min-height 32-44px, transitions 200ms) ✓
- §7 plan de verificación → Tasks 1 step 4, 4 step 3, 6 step 4, 7 step 8, 8 ✓

**2. Placeholder scan:** no hay TBDs/TODOs/"implement later"/etc.

**3. Type/naming consistency:**
- `expandedFrame` consistente entre Task 5 y Task 6 ✓
- `frameArrayName` (string `'previousFrames'`/`'nextFrames'`) consistente ✓
- `handleRemoveFrame(frameArrayName, index)` firma actualizada en Task 5 Step 4 y usada en Task 6 Step 2 ✓
- `toggleFrameEnabled(type, index)` firma original preservada (Task 6 Step 3 lo verifica) ✓
- Iconos lucide importados en Task 5 Step 2 y usados en Task 6 (`LuLayers`, `LuFlame`, `LuZap`, `LuPalette`, `LuEye`, `LuEyeOff`, `LuPlus`, `LuMinus`, `LuSettings`) ✓

Plan listo para ejecución.
