import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LuChevronRight } from 'react-icons/lu';
import './topToolbar.css';

const EMPTY_MENUS = [];
// Ventana de gracia (ms) antes de cerrar el submenu cuando el ratón sale de
// la zona "viva" (parent + panel). Permite movimientos diagonales entre el
// item parent y el submenu sin que se cierre por accidente.
const SUBMENU_CLOSE_DELAY = 140;

// Barra superior. Tres slots:
//  - izquierda: menus desplegables (solo si `menus` trae items)
//  - centro:    children (acciones principales)
//  - derecha:   `rightSlot` custom o branding "Powered by"
//
// Estructura de un menu (extendida):
//   { key, label, items: [
//       { type: 'header', name: 'Sección' },
//       { type: 'separator' },
//       { name, icon?, shortcut?, onClick?, disabled?, hint?, danger?,
//         submenu?: [items], checked? },
//   ]}
//
// `submenu` permite anidar hasta un nivel — suficiente para Importar,
// Exportar, Idioma, Tema, etc. Si necesitas más profundidad, refactoriza
// el componente para ser recursivo.
const TopToolbar = ({
  children,
  companyName = 'Argánion',
  companyLogo = null,
  menus = EMPTY_MENUS,
  rightSlot = null,
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null); // `${menuKey}-${index}`
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRefs = useRef({});
  const menuItemRefs = useRef({});
  const submenuPanelRef = useRef(null);
  const submenuAnchorRef = useRef(null);
  const dropdownPanelRef = useRef(null);
  const submenuCloseTimerRef = useRef(null);
  const [submenuPos, setSubmenuPos] = useState({ left: 0, top: 0, placement: 'right', visible: false });
  // Alineación horizontal del dropdown principal: 'left' (default) o 'right'
  // si el panel se sale por el borde derecho del viewport.
  const [dropdownAlign, setDropdownAlign] = useState('left');

  const hasMenus = Array.isArray(menus) && menus.length > 0;

  const cancelPendingSubmenuClose = () => {
    if (submenuCloseTimerRef.current) {
      clearTimeout(submenuCloseTimerRef.current);
      submenuCloseTimerRef.current = null;
    }
  };

  const scheduleSubmenuClose = () => {
    cancelPendingSubmenuClose();
    submenuCloseTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      submenuCloseTimerRef.current = null;
    }, SUBMENU_CLOSE_DELAY);
  };

  const closeDropdowns = () => {
    cancelPendingSubmenuClose();
    setActiveDropdown(null);
    setActiveSubmenu(null);
    setFocusedIndex(-1);
    setDropdownAlign('left');
    setSubmenuPos((p) => ({ ...p, visible: false }));
  };

  // Limpieza del timer al desmontar — evita setState sobre componente muerto.
  useEffect(() => () => cancelPendingSubmenuClose(), []);

  // Cierre al hacer click fuera (mousedown > click para atrapar antes)
  useEffect(() => {
    if (!activeDropdown) return undefined;
    const handleMouseDown = (event) => {
      // El submenu se renderiza vía portal (position: fixed) como hijo de
      // `.topToolbar-left`, así que `containerRef.contains` lo cubre. Aun así
      // chequeamos también el panel del submenu para defendernos de un futuro
      // refactor que mueva el portal a `document.body`.
      const inContainer = containerRef.current?.contains(event.target);
      const inSubmenu = submenuPanelRef.current?.contains(event.target);
      if (!inContainer && !inSubmenu) closeDropdowns();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
    // `closeDropdowns` se recrea en cada render — añadirlo aquí re-engancharía
    // el listener constantemente. El listener sólo necesita re-engancharse
    // cuando cambia `activeDropdown`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDropdown]);

  // Mueve el foco al item enfocado (navegación por teclado)
  useEffect(() => {
    if (!activeDropdown || focusedIndex < 0) return;
    const el = menuItemRefs.current[`${activeDropdown}-${focusedIndex}`];
    if (el) el.focus();
  }, [activeDropdown, focusedIndex]);

  // ── Posicionamiento del dropdown principal ────────────────
  // Si el panel se sale por la derecha, alinear al borde derecho del wrapper.
  useLayoutEffect(() => {
    if (!activeDropdown || !dropdownPanelRef.current) {
      setDropdownAlign('left');
      return;
    }
    const panel = dropdownPanelRef.current;
    // Reset a 'left' antes de medir, para evitar arrastrar la decisión del
    // dropdown anterior cuando cambias de menú.
    panel.style.removeProperty('right');
    panel.style.left = '0';
    const rect = panel.getBoundingClientRect();
    const margin = 8;
    if (rect.right + margin > window.innerWidth) {
      setDropdownAlign('right');
    } else {
      setDropdownAlign('left');
    }
  }, [activeDropdown]);

  // ── Posicionamiento del submenu (no se sale del viewport) ─
  useLayoutEffect(() => {
    if (!activeSubmenu || !submenuAnchorRef.current || !submenuPanelRef.current) {
      setSubmenuPos((p) => ({ ...p, visible: false }));
      return;
    }
    const anchor = submenuAnchorRef.current.getBoundingClientRect();
    const panel = submenuPanelRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    // Por defecto a la derecha del anchor; si no cabe, a la izquierda.
    let left = anchor.right + 4;
    let placement = 'right';
    if (left + panel.width + margin > vw) {
      left = Math.max(margin, anchor.left - panel.width - 4);
      placement = 'left';
    }
    let top = anchor.top;
    if (top + panel.height + margin > vh) {
      top = Math.max(margin, vh - panel.height - margin);
    }
    setSubmenuPos({ left, top, placement, visible: true });
  }, [activeSubmenu]);

  const toggleDropdown = (key) => {
    cancelPendingSubmenuClose();
    setActiveDropdown((prev) => (prev === key ? null : key));
    setActiveSubmenu(null);
    setFocusedIndex(-1);
    setDropdownAlign('left');
  };

  // Salta separadores, headers y disabled en navegación por teclado
  const isFocusable = (item) =>
    item.type !== 'separator' && item.type !== 'header' && !item.disabled;

  const findNextEnabled = (items, start, step) => {
    const len = items.length;
    if (len === 0) return -1;
    let idx = start;
    for (let i = 0; i < len; i += 1) {
      idx = (idx + step + len) % len;
      if (isFocusable(items[idx])) return idx;
    }
    return -1;
  };

  const handleTriggerKeyDown = (e, key, items) => {
    if (e.key === 'Escape') {
      closeDropdowns();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveDropdown(key);
      const firstIdx = findNextEnabled(items, -1, 1);
      setFocusedIndex(firstIdx);
    }
  };

  const handleMenuKeyDown = (e, key, items) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdowns();
      const trigger = triggerRefs.current[key];
      if (trigger) trigger.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => findNextEnabled(items, prev, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => findNextEnabled(items, prev, -1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(findNextEnabled(items, -1, 1));
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(findNextEnabled(items, 0, -1));
    } else if (e.key === 'ArrowRight') {
      const item = items[focusedIndex];
      if (item?.submenu) {
        e.preventDefault();
        setActiveSubmenu(`${key}-${focusedIndex}`);
      }
    } else if (e.key === 'ArrowLeft') {
      if (activeSubmenu) {
        e.preventDefault();
        setActiveSubmenu(null);
      }
    } else if (e.key === 'Tab') {
      closeDropdowns();
    }
  };

  const handleItemClick = (e, item) => {
    if (item.disabled) return;
    if (item.submenu) {
      // Click en un parent con submenu: lo abre/cierra (toggle), no propaga.
      e.stopPropagation();
      setActiveSubmenu((cur) => (cur === item._submenuKey ? null : item._submenuKey));
      return;
    }
    // Disparamos primero el callback, luego cerramos. Si la app necesita
    // mostrar un modal modal y cerrar el dropdown, ambas cosas suceden en
    // este tick sin pasar por una animación intermedia incoherente.
    if (item.onClick) item.onClick();
    closeDropdowns();
  };

  const renderShortcut = (shortcut) => {
    if (!shortcut) return null;
    // Renderiza "Ctrl+S" como chips separados <kbd>Ctrl</kbd><kbd>S</kbd>.
    const parts = shortcut.split('+').map((p) => p.trim()).filter(Boolean);
    return (
      <span className="dropdown-item-shortcut">
        {parts.map((p, i) => (
          <kbd key={`${p}-${i}`} className="dropdown-kbd">
            {p}
          </kbd>
        ))}
      </span>
    );
  };

  // `inSubmenu`: cuando true el item está dentro del panel del submenu.
  // Su hover NO debe cerrar el submenu (sería self-destruction). Sólo los
  // items top-level pueden cambiar/cerrar el submenu activo.
  const renderDropdownItem = (item, index, menuKey, { inSubmenu = false } = {}) => {
    if (item.type === 'separator') {
      return (
        <div
          key={`${menuKey}-sep-${index}`}
          className="dropdown-separator"
          role="separator"
        />
      );
    }
    if (item.type === 'header') {
      return (
        <div
          key={`${menuKey}-hdr-${index}`}
          className="dropdown-section-header"
          role="presentation"
        >
          {item.name}
        </div>
      );
    }

    const itemKey = `${menuKey}-${index}`;
    const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
    // El submenu activo se identifica por la `itemKey` exacta del parent.
    const submenuOpen = hasSubmenu && activeSubmenu === itemKey;
    // Pasamos la submenuKey al item para que `handleItemClick` la use al
    // hacer click en un parent con submenu (toggle).
    const enrichedItem = hasSubmenu ? { ...item, _submenuKey: itemKey } : item;

    return (
      <button
        key={itemKey}
        type="button"
        role="menuitem"
        className={
          'dropdown-item' +
          (item.danger ? ' dropdown-item--danger' : '') +
          (item.checked ? ' dropdown-item--checked' : '') +
          (submenuOpen ? ' dropdown-item--submenu-open' : '')
        }
        disabled={item.disabled}
        title={item.hint || undefined}
        aria-haspopup={hasSubmenu ? 'menu' : undefined}
        aria-expanded={hasSubmenu ? submenuOpen : undefined}
        ref={(el) => {
          menuItemRefs.current[itemKey] = el;
          if (submenuOpen) submenuAnchorRef.current = el;
        }}
        onClick={(e) => handleItemClick(e, enrichedItem)}
        onMouseEnter={() => {
          if (inSubmenu) {
            // Estamos dentro del submenu — sólo actualizar el foco visual.
            // Cualquier intento de cerrarlo aquí lo destruiría antes del click.
            cancelPendingSubmenuClose();
            return;
          }
          if (hasSubmenu) {
            cancelPendingSubmenuClose();
            setActiveSubmenu(itemKey);
            setFocusedIndex(index);
          } else {
            // Item top-level sin submenu: cierra cualquier submenu abierto
            // de un hermano y mueve el foco aquí.
            cancelPendingSubmenuClose();
            setActiveSubmenu(null);
            setFocusedIndex(index);
          }
        }}
      >
        <span className="dropdown-item-icon" aria-hidden="true">
          {item.icon || (item.checked ? <span className="dropdown-checkmark">✓</span> : null)}
        </span>
        <span className="dropdown-item-name">{item.name}</span>
        {hasSubmenu ? (
          <LuChevronRight className="dropdown-item-chevron" aria-hidden="true" />
        ) : (
          renderShortcut(item.shortcut)
        )}
      </button>
    );
  };

  // Renderiza el panel del submenu del item activo (si hay).
  const renderActiveSubmenu = () => {
    if (!activeDropdown || !activeSubmenu) return null;
    const menu = menus.find((m) => (m.key || m.label) === activeDropdown);
    if (!menu) return null;
    const idx = parseInt(activeSubmenu.split('-').pop(), 10);
    const parent = menu.items[idx];
    if (!parent || !parent.submenu) return null;

    // Mientras el layout effect aún no calculó la posición, mantenemos el
    // panel oculto (visibility: hidden) para que no parpadee en (0,0).
    const style = {
      position: 'fixed',
      left: submenuPos.left,
      top: submenuPos.top,
      zIndex: 1003,
      visibility: submenuPos.visible ? 'visible' : 'hidden',
    };

    return (
      <div
        ref={submenuPanelRef}
        className={`dropdown-menu dropdown-submenu dropdown-submenu--${submenuPos.placement}`}
        role="menu"
        style={style}
        onMouseEnter={cancelPendingSubmenuClose}
        onMouseLeave={scheduleSubmenuClose}
      >
        {parent.submenu.map((item, i) =>
          renderDropdownItem(item, i, `${activeDropdown}-sub-${idx}`, { inSubmenu: true })
        )}
      </div>
    );
  };

  const renderRightSlot = () => {
    if (rightSlot !== null) return rightSlot;
    if (!companyName && !companyLogo) return null;
    return (
      <div className="powered-by" aria-hidden="true">
        <span>Powered by</span>
        {companyLogo && (
          <img src={companyLogo} alt="" className="company-logo" />
        )}
        {companyName && <span className="company-name">{companyName}</span>}
      </div>
    );
  };

  return (
    <div className="topToolbar-container" ref={containerRef}>
      {hasMenus && (
        <div className="topToolbar-left" role="menubar">
          {menus.map((menu) => {
            const key = menu.key || menu.label;
            const isOpen = activeDropdown === key;
            return (
              <div key={key} className="dropdown-wrapper">
                <button
                  type="button"
                  ref={(el) => {
                    triggerRefs.current[key] = el;
                  }}
                  className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown(key);
                  }}
                  onMouseEnter={() => {
                    // Si ya hay un menú abierto, hover en otro trigger lo cambia.
                    if (activeDropdown && activeDropdown !== key) {
                      cancelPendingSubmenuClose();
                      setActiveDropdown(key);
                      setActiveSubmenu(null);
                      setFocusedIndex(-1);
                      setDropdownAlign('left');
                    }
                  }}
                  onKeyDown={(e) => handleTriggerKeyDown(e, key, menu.items)}
                >
                  {menu.icon && (
                    <span className="dropdown-trigger-icon" aria-hidden="true">
                      {menu.icon}
                    </span>
                  )}
                  {menu.label}
                </button>
                {isOpen && (
                  <div
                    ref={dropdownPanelRef}
                    className={
                      'dropdown-menu' +
                      (dropdownAlign === 'right' ? ' dropdown-menu--align-right' : '')
                    }
                    role="menu"
                    aria-label={menu.label}
                    onKeyDown={(e) => handleMenuKeyDown(e, key, menu.items)}
                  >
                    {menu.items.map((item, idx) =>
                      renderDropdownItem(item, idx, key),
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {renderActiveSubmenu()}
        </div>
      )}

      <div className="topToolbar-center">{children}</div>

      <div className="topToolbar-right">{renderRightSlot()}</div>
    </div>
  );
};

export default TopToolbar;
