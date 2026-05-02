# UI Responsiva para Móvil/Tablet + Fix Multi-Touch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer el editor utilizable en pantallas móviles (≤480px) y tablet portrait (≤900px), donde hoy el `topToolbar`, la `Navbar lateral` de herramientas y la `timeline` no caben. Como blocker de pinch-to-zoom: arreglar el bug multi-touch en `usePointer` que permite que el segundo dedo "robe" la pipeline de drawing del primero.

**Architecture:** Cinco áreas independientes en orden de blocker → menor riesgo → mayor riesgo. (1) Fix surgical en `usePointer` — trackear `pointerId` para que solo el primer puntero activo dibuje. (2) Establecer breakpoints + variables CSS responsive (sin tocar JSX todavía). (3) `topToolbar` colapsa items que no caben a un menú overflow (botón "···"). (4) `NavbarLateral` se transforma en bottom drawer en móvil — tap en el botón colapsado abre un overlay con todas las herramientas en grid. (5) `RightPanel` se vuelve bottom-sheet en móvil. (6) `timeline` adopta modo compacto en móvil con tab switcher Frames/Capas. Cada fase es un commit standalone — usuario puede mergear cualquiera independientemente.

**Tech Stack:** React 19 (compiler-on, `'use no memo'` para módulos no-componente), Vite, CSS plano, iconos `react-icons/lu`. Sin tests automáticos — verificación con DevTools mobile emulation (iPhone SE 375×667, iPad 768×1024) + dispositivo real desde `http://192.168.1.42:5173`.

**Branch:** Continuar en `feat/blend-modes`. Cada task de este plan es 1 commit independiente con paths explícitos en `git add` (NO `-A`/`.`). Si una task se trabaja en una sesión separada, branchear desde el último commit de la fase anterior.

**Breakpoints standard (acordados en este plan):**
| Nombre | Rango | Audiencia | Layout target |
|---|---|---|---|
| `desktop` | `≥ 1280px` | Workstation | Layout actual sin cambios |
| `laptop` | `1024–1279px` | Laptop pequeño | Igual que desktop, paneles más estrechos |
| `tablet` | `768–1023px` | iPad portrait, tablet Android | Sidebars compactas, paneles colapsables por default |
| `mobile-l` | `481–767px` | Tablet pequeña, fold cerrado | Single-pane: paneles como bottom-sheet/drawer |
| `mobile` | `≤ 480px` | Celular portrait | Full single-pane + drawers + tabs |

CSS vars expuestas en `:root`: `--bp-tablet: 768px;`, `--bp-mobile-l: 481px;`, `--bp-mobile: 320px;`. Usar `@media (max-width: 767px)` para mobile-y-mobile-l, `@media (max-width: 480px)` para mobile estricto.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/editorSprites/Workspace/hooks/hooks.jsx` | Modify | Task 1: trackear `activePointerId` en `usePointer` para rechazar pointers concurrentes |
| `src/index.css` o `src/App.css` | Modify | Task 2: variables CSS de breakpoints + `prefers-reduced-motion` global |
| `src/editorSprites/Workspace/workspaceMain/topToolbar.jsx` | Modify | Task 3: detectar overflow de items + render menú `···` con resto |
| `src/editorSprites/Workspace/workspaceMain/topToolbar.css` | Modify | Task 3: hide labels de quick-actions en mobile, hit area 44px |
| `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` | Modify | Task 3+4+5: pasar prop `viewport` a Navbar, decidir mount mode del RightPanel |
| `src/editorSprites/navbarLateral/Navbar.jsx` | Modify | Task 4: nuevo modo `mobileDrawer` — botón colapsado abre overlay con grid |
| `src/editorSprites/navbarLateral/Navbar.css` | Modify | Task 4: estilos del overlay grid + animación slide-up |
| `src/editorSprites/Workspace/panels/rightPanel.jsx` | Modify | Task 5: ya tiene `useIsMobile` para drawer — extender a bottom-sheet con drag-handle funcional |
| `src/editorSprites/Workspace/panels/rightPanel.css` | Modify | Task 5: estilos bottom-sheet con altura ajustable |
| `src/editorSprites/Workspace/workspaceMain/timeline.jsx` | Modify | Task 6: tab switcher Frames/Capas en móvil + altura adaptativa |
| `src/editorSprites/Workspace/workspaceMain/layerAnimation.css` | Modify | Task 6: media queries para timeline compacto |

---

## Tareas

### Task 1 (Blocker): Fix multi-touch — un solo puntero dibuja a la vez

**Por qué primero:** Sin esto, el pinch-to-zoom del modo tableta falla porque el segundo dedo sobreescribe el path del primero. Es un bug pre-existente que mi commit `2d8cb69` (gestos) destapó. Ya pediste el fix.

**Files:**
- Modify: `src/editorSprites/Workspace/hooks/hooks.jsx` — función `usePointer` (~líneas 46–360)

- [ ] **Step 1: Reproducir el bug**

  Run `npm run dev`, abrir desde tablet/mobile. Activar modo Tableta + tomar la herramienta lápiz. Apoyar 1 dedo y mientras está apoyado, tocar con un 2do dedo. Expected: ahora pinta una raya nueva desde la posición del 2do dedo. Lo correcto: el 2do dedo no debería afectar nada (o disparar gesto si hay 2 simultáneos).

- [ ] **Step 2: Añadir `activePointerIdRef` y filtros por ID**

  En `usePointer` (después de los demás refs), agregar:

  ```js
  // Solo el primer puntero que aterriza queda "captured" hasta que sale.
  // Pointers adicionales (segundo dedo, palm, etc) son descartados — fix
  // de bug donde 2 dedos en tablet hacían pisotearse el path.
  const activePointerIdRef = useRef(null);
  ```

  En `handlePointerDown`, después del `isPointerTypeRejected` y `isInsideIgnore`, antes de `getButtonType`:

  ```js
  if (activePointerIdRef.current !== null) return;
  activePointerIdRef.current = e.pointerId;
  ```

  En `handlePointerMove`, al inicio (después de los rejects):

  ```js
  // Solo procesar el puntero capturado si hay uno. Si no hay (preview de
  // hover), todos los punteros pueden actualizar la posición visual.
  if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
    return;
  }
  ```

  En `handlePointerUp`, antes del check `if (!isPressedRef.current) return`:

  ```js
  if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
  activePointerIdRef.current = null;
  ```

  En `handlePointerLeave` y dentro de `endPress`, también resetear: `activePointerIdRef.current = null`.

- [ ] **Step 3: Verificar que tools que dependen de path siguen funcionando**

  Test manual con: pencil, eraser, line, fillTool, selectTool, smudgeTool — un puntero, un trazo continuo. Deben funcionar idéntico. Confirmar que tras un pointerUp, el siguiente pointerdown sí inicia un nuevo path (el ID se resetea).

- [ ] **Step 4: Verificar pinch-to-zoom en modo tableta**

  Activar Tableta. 2 dedos en el canvas → solo se debe disparar gesto (zoom/pan), NO trazo. El primer dedo NO inicia path porque… espera — sí lo inicia (el primer dedo tiene activePointerId capturado). Hmm.

  **Caveat de diseño:** este fix evita que el 2do dedo robe el path, pero el 1er dedo sí pinta antes de que aterrice el 2do. Para evitar esto la pipeline debería esperar un short delay (~50ms) o cancelar el path retroactivamente si en ese período aparece un 2do touch. Decisión: **dejar el caveat fuera de scope de este plan** — se documenta como `KNOWN_LIMITATION` en el CHANGELOG. Workaround para usuario: usar modo Stylus (palm rejection completa) o aceptar el micro-trazo del primer dedo. Esto se ataca propiamente cuando se rediseñe la pipeline de drawing.

  Alternativa baja-fricción: si tabletMode + 2do touch aparece en <100ms del 1ro, llamar `endPress()` + descartar path. Implementación opcional adicional en este task — añadir solo si las pruebas muestran que es muy notorio.

- [ ] **Step 5: Commit**

  ```
  fix(pointer): trackear activePointerId — un solo puntero dibuja a la vez

  Bug: con 2 dedos en pantalla, el 2do pointerdown reseteaba isPressed y
  pathRef → path migraba a la posición del 2do dedo. Visible en modo
  tableta con pinch (gesture detector + pipeline de drawing competían).
  ```

---

### Task 2: Variables CSS responsive + audit de hardcoded sizes

**Files:**
- Modify: `src/index.css` (raíz de variables globales)
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.css` (depende del audit)

- [ ] **Step 1: Establecer variables y media-query helper en `:root`**

  Agregar al final de `src/index.css`:

  ```css
  :root {
    /* Breakpoints — usar SOLO para CSS custom JS (matchMedia) y referencia.
     * Las @media queries deben usar literales para que el preprocesador
     * y devtools los detecten. */
    --bp-mobile: 480px;
    --bp-mobile-l: 767px;
    --bp-tablet: 1023px;
    --bp-laptop: 1279px;

    /* Touch target mínimo (criterio WCAG 2.5.5 + Material). */
    --touch-target-min: 44px;
  }

  /* Defaults responsive globales: previene horizontal scroll en cualquier
   * breakpoint salvo que un componente lo pida explícitamente. */
  html, body {
    overflow-x: hidden;
    -webkit-text-size-adjust: 100%;
  }

  /* Touch target enforce: cualquier <button> bajo .quick-actions, .navbar,
   * .toolbar debe respetar 44px mínimo en pantallas táctiles. */
  @media (pointer: coarse) {
    .quick-actions button,
    .navbar button,
    .top-toolbar button {
      min-width: var(--touch-target-min);
      min-height: var(--touch-target-min);
    }
  }
  ```

- [ ] **Step 2: Audit de horizontal-scroll en mobile**

  Run `npm run dev`. Abrir Chrome DevTools mobile mode con preset iPhone SE (375×667). Cargar el editor con un proyecto. Observar:
  - ¿Hay barra de scroll horizontal? Si sí, ¿qué elemento la causa? (overflow del topToolbar / timeline / etc)
  - Anotar para usar en Tasks 3, 4, 5, 6.

- [ ] **Step 3: Verificar `viewport` meta tag**

  Open `index.html`. Confirmar que existe:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  ```

  Si falta `viewport-fit=cover` o `initial-scale=1`, añadirlo.

- [ ] **Step 4: Commit**

  ```
  chore(responsive): variables CSS de breakpoints + touch target enforce

  Sin cambios visibles todavia — solo scaffolding para tasks siguientes.
  ```

---

### Task 3: TopToolbar — overflow menu en móvil

**Goal:** En pantallas estrechas, los items del topToolbar (`Archivo`, `Editar`, `Selección`, `Vista`, `Tools`, `Configuración`, `Idioma`) + las quick-actions (IA, 3D, Tableta, Stylus, Pantalla) no caben. Solución: en mobile, los menús dropdown se colapsan a un solo botón "···" que abre un panel con todos los menús apilados verticalmente. Las quick-actions críticas (Tableta, Pantalla) quedan visibles; el resto se mueve al panel también.

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/topToolbar.jsx`
- Modify: `src/editorSprites/Workspace/workspaceMain/topToolbar.css`
- Modify: `src/editorSprites/Workspace/workspaceMain/workspaceContainer.jsx` (decidir qué quick-actions son "primary" en mobile)

- [ ] **Step 1: Añadir `useIsMobile` reusable**

  El `RightPanel` ya tiene `useIsMobile` interno (línea ~11 de `rightPanel.jsx`). Extraerlo a un hook compartido `src/editorSprites/Workspace/hooks/useViewport.js`:

  ```js
  "use no memo";
  import { useEffect, useState } from "react";

  // Hook reusable: detecta breakpoints. Usa matchMedia con listener para
  // reaccionar a rotaciones / resize sin re-renders innecesarios.
  export function useViewport() {
    const [vp, setVp] = useState(() => computeViewport());
    useEffect(() => {
      const mqls = [
        window.matchMedia("(max-width: 480px)"),
        window.matchMedia("(max-width: 767px)"),
        window.matchMedia("(max-width: 1023px)"),
      ];
      const handler = () => setVp(computeViewport());
      mqls.forEach(m => m.addEventListener?.("change", handler));
      return () => mqls.forEach(m => m.removeEventListener?.("change", handler));
    }, []);
    return vp;
  }

  function computeViewport() {
    if (typeof window === "undefined") return { isMobile: false, isMobileL: false, isTablet: false };
    return {
      isMobile: window.matchMedia("(max-width: 480px)").matches,
      isMobileL: window.matchMedia("(max-width: 767px)").matches,
      isTablet: window.matchMedia("(max-width: 1023px)").matches,
    };
  }
  ```

  Reemplazar el `useIsMobile` interno de `rightPanel.jsx` con esta versión (importarla).

- [ ] **Step 2: TopToolbar — render condicional en mobile**

  En `topToolbar.jsx`, importar `useViewport`. En mobile (`vp.isMobileL`), en vez de pintar todos los `menus` inline, agruparlos en un solo dropdown llamado "Menú" con icono `···`. Mantener `children` (los quick-actions) y `rightSlot`.

  La estructura JSX en mobile:
  ```jsx
  {hasMenus && vp.isMobileL && (
    <button className="topToolbar-overflow-trigger" onClick={...} title="Menús">
      <LuMoreHorizontal />
    </button>
  )}
  {hasMenus && vp.isMobileL && overflowOpen && (
    <div className="topToolbar-overflow-panel">
      {menus.map(m => <DropdownButton {...} />)}
    </div>
  )}
  {hasMenus && !vp.isMobileL && /* render normal de menus */}
  ```

  El panel overflow se posiciona con `position: fixed; top: 56px; left: 0; right: 0; max-height: 70vh; overflow-y: auto;` con backdrop semi-transparente (al estilo del bottomSheet de RightPanel).

- [ ] **Step 3: Quick-actions en mobile — esconder labels, mantener iconos**

  En `workspaceContainer.jsx` (o `topToolbar.css`):
  ```css
  @media (max-width: 767px) {
    .quick-action__label { display: none; }
    .quick-action {
      padding: 8px;
      min-width: 44px;
      min-height: 44px;
      gap: 0;
    }
    .quick-actions {
      gap: 4px;
      /* Permitir wrap a segunda línea si todavía no caben */
      flex-wrap: wrap;
      justify-content: center;
    }
  }
  ```

  Con esto, las 5 quick-actions (IA, 3D, Tableta, Stylus, Pantalla) caben en 5×44 = 220px, y se mantienen sus iconos identificables.

- [ ] **Step 4: Verificación visual**

  En DevTools mobile mode (iPhone SE 375px):
  - Top bar: `··· Menú` + 5 iconos de quick-actions sin labels.
  - Tap en `···` abre panel descendente con `Archivo`, `Editar`, etc.
  - Todos los botones miden ≥44×44px (verificar con DevTools rulers).

- [ ] **Step 5: Commit**

  ```
  feat(responsive): topToolbar con overflow menu en mobile (≤767px)

  - Menus se colapsan a boton "···"
  - Quick-actions pierden labels y respetan touch target 44px
  - Hook compartido useViewport extraido del rightPanel
  ```

---

### Task 4: NavbarLateral — tool drawer en móvil

**Goal:** En desktop la barra lateral de herramientas tiene ~20+ tools en columna. En mobile no caben verticalmente. Solución: en mobile, la barra colapsada del Navbar (que ya implementaste — botón con icono de tool actual) abre un **drawer overlay** con todas las herramientas en grid 4×N. Tap en una herramienta la selecciona y cierra el drawer.

**Files:**
- Modify: `src/editorSprites/navbarLateral/Navbar.jsx`
- Modify: `src/editorSprites/navbarLateral/Navbar.css`

- [ ] **Step 1: Detectar móvil dentro de Navbar**

  Importar `useViewport` (creado en Task 3). En `Navbar.jsx`:
  ```js
  const vp = useViewport();
  ```

  Si `vp.isMobileL`, forzar `collapsed=true` siempre (independiente del `collapsedProp` del padre) Y cambiar el comportamiento del botón colapsado: en lugar de simplemente "expandir la barra completa", abre el drawer.

- [ ] **Step 2: Estado `drawerOpen` y nuevo render**

  ```js
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (vp.isMobileL) {
    const activeItem = findActiveItem();
    return (
      <>
        <button
          className="navbar-mobile-trigger"
          onClick={() => setDrawerOpen(true)}
          title={activeItem?.label || "Herramienta actual"}
          aria-haspopup="dialog"
        >
          {activeItem?.icon}
        </button>
        {drawerOpen && createPortal(
          <div className="navbar-mobile-drawer-overlay" onClick={() => setDrawerOpen(false)}>
            <div className="navbar-mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="navbar-mobile-drawer__header">
                <span>Herramientas</span>
                <button onClick={() => setDrawerOpen(false)}><LuX /></button>
              </div>
              <div className="navbar-mobile-drawer__grid">
                {flattenItems(items).map(it => (
                  <button
                    key={it.id}
                    className={`navbar-mobile-tool ${it.toolValue === activeTool ? 'is-active' : ''}`}
                    onClick={() => { it.onClick(); setDrawerOpen(false); }}
                  >
                    {it.icon}
                    <span>{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }
  ```

  `flattenItems` debe expandir los items con `dropdown` a items individuales — ej. `[{label:'Pincel'}, {label:'Selector'}, ...]` para que todos sean tappeables en el grid.

- [ ] **Step 3: CSS drawer**

  ```css
  .navbar-mobile-trigger {
    position: fixed;
    bottom: 16px;
    left: 16px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    display: grid;
    place-items: center;
    z-index: 9000;
    cursor: pointer;
  }

  .navbar-mobile-drawer-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    z-index: 9500;
    animation: fadeIn 200ms;
  }

  .navbar-mobile-drawer {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    max-height: 70vh;
    background: var(--bg-secondary);
    border-radius: 16px 16px 0 0;
    padding: 16px;
    overflow-y: auto;
    animation: slideUp 220ms ease-out;
  }

  .navbar-mobile-drawer__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .navbar-mobile-tool {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 4px;
    background: var(--bg-tertiary);
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 11px;
    min-height: 64px;
  }

  .navbar-mobile-tool.is-active {
    background: rgba(140,82,255,0.18);
    border-color: var(--accent-color);
  }

  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  ```

- [ ] **Step 4: Verificación**

  En DevTools mobile mode: el botón flotante esquina inferior izquierda muestra herramienta actual. Tap → grid 4-columnas slide-up. Tap en herramienta → cambia tool + cierra. Tap fuera → cierra. ESC también cierra (añadir si quedó tiempo).

- [ ] **Step 5: Commit**

  ```
  feat(responsive): NavbarLateral como tool drawer en mobile (≤767px)

  - FAB esquina inferior izquierda con icono de tool actual
  - Tap abre drawer slide-up con grid 4-columnas de todas las tools
  - Activa portal a body, cierra con backdrop click o ESC
  ```

---

### Task 5: RightPanel — bottom-sheet en móvil

**Goal:** El RightPanel ya tiene un modo mobile (`useIsMobile` con drawer). Mejorar: convertirlo en un proper bottom-sheet con:
- drag handle funcional (no solo decorativo) que permita arrastrar para cerrar.
- Snap points: cerrado, half (40vh), full (90vh).
- Backdrop tappable para cerrar (ya existe).

**Files:**
- Modify: `src/editorSprites/Workspace/panels/rightPanel.jsx`
- Modify: `src/editorSprites/Workspace/panels/rightPanel.css`

- [ ] **Step 1: Reemplazar `useIsMobile` interno por `useViewport`**

  Por consistencia con Tasks 3 y 4. Cambiar imports y derivar `isMobile = vp.isMobileL`.

- [ ] **Step 2: Drag handle funcional con touch / pointer**

  Añadir `useRef` al drawer y handlers `onPointerDown`/`onPointerMove`/`onPointerUp` al `.pc-rp-drag-handle`:
  - Pointerdown: capturar y, snapshot de translateY actual.
  - Pointermove: aplicar translateY = snapshot + (currentY - startY), clamp a [0, 100vh].
  - Pointerup: si translateY > 60vh → cerrar (`setExpandido(false)`); si < 20vh → snap a 0; entre → snap al más cercano (half / full).

  Persistir el snap point preferido del usuario en `localStorage` (`pixcalli.rightPanel.mobileSnap`).

- [ ] **Step 3: CSS — sheet sticky con snap**

  ```css
  @media (max-width: 767px) {
    .pc-right-panel-mobile {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      width: 100vw;
      max-height: 90vh;
      height: var(--rp-mobile-height, 50vh);
      border-radius: 16px 16px 0 0;
      transition: transform 220ms ease, height 220ms ease;
      transform: translateY(0);
      will-change: transform;
    }
    .pc-rp-drag-handle {
      width: 40px;
      height: 4px;
      background: rgba(255,255,255,0.3);
      border-radius: 2px;
      margin: 8px auto;
      cursor: grab;
      touch-action: none;
    }
  }
  ```

- [ ] **Step 4: Verificación**

  Mobile mode: tap en algún módulo del aside-collapsed → sheet slide-up a 50vh. Drag desde handle → sheet sigue dedo. Soltar arriba → snap full. Soltar abajo → cierra. Cualquier scroll dentro de un módulo (ej. paleta) sigue funcionando.

- [ ] **Step 5: Commit**

  ```
  feat(responsive): RightPanel como bottom-sheet con drag-snap en mobile

  - Hook useIsMobile reemplazado por useViewport compartido
  - Drag handle funcional: snap a 0/50vh/90vh
  - Estado del snap persistido en localStorage
  ```

---

### Task 6: Timeline — tabs Frames/Capas + altura adaptativa en móvil

**Goal:** En escritorio la timeline muestra panel-izquierdo (capas) + grid (frames) lado a lado. En móvil portrait no hay ancho para ambos. Solución: tab switcher en móvil — usuario alterna entre ver "Frames" o "Capas". Además: altura de la timeline reducida a 30vh (vs ~200px fijos) y permitir colapsar.

**Files:**
- Modify: `src/editorSprites/Workspace/workspaceMain/timeline.jsx`
- Modify: `src/editorSprites/Workspace/workspaceMain/layerAnimation.css`

- [ ] **Step 1: Estado de tab en móvil**

  En `timeline.jsx`, añadir `useViewport`. En mobile (`vp.isMobileL`), añadir state `mobileTab` (`'frames' | 'layers'`, default `'frames'`).

  Renderizar un toggle pequeño arriba de la timeline:
  ```jsx
  {vp.isMobileL && (
    <div className="timeline-mobile-tabs">
      <button className={mobileTab === 'frames' ? 'is-active' : ''} onClick={() => setMobileTab('frames')}>Frames</button>
      <button className={mobileTab === 'layers' ? 'is-active' : ''} onClick={() => setMobileTab('layers')}>Capas</button>
    </div>
  )}
  ```

  Renderizar condicionalmente el `.layer-info` (panel izquierdo) o el grid de frames basado en `mobileTab`. Si `mobileTab === 'layers'`, el `.layer-info` toma todo el ancho. Si `'frames'`, el grid toma todo el ancho.

- [ ] **Step 2: Altura adaptativa**

  CSS:
  ```css
  @media (max-width: 767px) {
    .timeline-container {
      height: 30vh;
      max-height: 30vh;
      min-height: 200px;
    }
    .layer-info { width: 100% !important; }
    .timeline-mobile-tabs {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--bg-tertiary);
    }
    .timeline-mobile-tabs button {
      flex: 1;
      min-height: 44px;
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
    }
    .timeline-mobile-tabs button.is-active {
      background: var(--accent-color);
      color: white;
      border-color: var(--accent-color);
    }
  }
  ```

- [ ] **Step 3: Botón colapsar timeline (opcional pero recomendado)**

  Añadir botón pequeño "↓" que oculta la timeline (excepto los tabs y un thumbnail-strip de frames). Usuario tappea otra vez para expandir. Persistir en `localStorage`.

- [ ] **Step 4: Verificación**

  Mobile mode con proyecto multi-capa multi-frame: ambos tabs cargan instantáneo (ya están memoized por React.memo en `LayerRow`). Auto-scroll del frame actual sigue funcionando. Scroll horizontal del grid de frames funciona. Tap en una capa la activa.

- [ ] **Step 5: Commit**

  ```
  feat(responsive): timeline con tabs Frames/Capas en mobile

  - Switcher mostrando un panel a la vez (no caben lado a lado en <768px)
  - Altura de la timeline 30vh adaptativa
  - Boton de colapsar persistido en localStorage
  ```

---

## Verificación Final (post-Task 6)

- [ ] **Test full en dispositivo real**

  Desde un celular (≤480px) y desde una tablet portrait (≤767px), conectar a `http://192.168.1.42:5173` (ajustar IP según dev server). Crear proyecto pequeño, dibujar con un dedo, hacer pinch zoom, abrir cada panel/drawer, alternar tabs de timeline. Sin scrolls horizontales, sin botones imposibles de tappear, sin contenido cortado.

- [ ] **Verificar accesibilidad básica**
  - Navegación con teclado (laptop pequeño): Tab cicla por todos los menus visibles, ESC cierra drawers/sheets.
  - Contraste de texto: light/dark theme en pantalla pequeña sigue legible.
  - aria-labels en los botones nuevos (FAB del Navbar, tabs de timeline, drag handle).

- [ ] **Bundle size check**

  `npm run build` → revisar que el bundle no creció >10KB. Los cambios son CSS + JSX condicional; no debería haber bibliotecas nuevas.

---

## Riesgos y consideraciones

1. **Multi-touch fix sutil:** el caveat de "primer dedo dibuja antes que llegue el 2do" es real. Si en pruebas se nota mucho, añadir delay de 80ms al inicio del path o cancelarlo si en ese período aparece un 2do touch — pero eso afecta UX en mouse/desktop también. Out of scope ahora.

2. **React Compiler + nuevos hooks:** `useViewport` no debería tener problema (usa solo `useState/useEffect`). Si surge "Invalid hook call" en producción, añadir `'use no memo'` al archivo (mismo patrón que `logger.js`, `blendModes.js`).

3. **Layout shift:** entrar/salir de mobile mode al rotar puede causar repaint costoso. La transición CSS de `width` en `.pc-right-panel` y de `height` en timeline puede stutter en Android viejo. Si pasa, sustituir `transition: all` por `transform/opacity`.

4. **createPortal en drawers:** el patrón ya está en uso (DevConsolePanel, ConfigOnionSkin popover) — bajo riesgo. Verificar que `document.body` tiene `pixcalli-tablet-mode` para que el `touch-action: none` aplique también a las áreas de gestos en los drawers.

5. **No tests automáticos:** verificación es 100% manual. Cada commit debe pasar por checklist `npm run build` (sin errores) + DevTools mobile mode + tablet real.

6. **Compatibilidad iOS:** Apple Pencil reporta `pointerType:'touch'` en Safari, no `'pen'`. El modo Stylus actual no funciona en iOS. Documentar como `KNOWN_LIMITATION` cuando se haga la sección de docs móvil. Fix futuro: tratar `e.pressure > 0 && pointerType === 'touch' && !isMultitouch` como pen en iOS.

7. **Gestos vs drawing en non-stylus tablet:** el bug del primer dedo existe ya — Task 1 lo mitiga (no se pisa entre dedos) pero el primer dedo igual inicia un trazo. La UX óptima requiere refactor mayor de la pipeline, fuera del alcance de este plan.

---

## Estimación de esfuerzo

| Task | LOC neta | Tiempo (con review/iteración) |
|---|---|---|
| 1. Multi-touch fix | ~20 | 30min |
| 2. Variables + audit | ~30 | 30min |
| 3. TopToolbar overflow | ~150 | 1.5h |
| 4. Navbar drawer | ~200 | 2h |
| 5. RightPanel bottom-sheet | ~120 | 1.5h |
| 6. Timeline tabs | ~80 | 1h |
| **Total** | ~600 | ~7h |

Cada task es 1 commit independiente. Mergeables por separado — Task 1 puede shipearse hoy mismo, Tasks 3-6 escalonadas.
