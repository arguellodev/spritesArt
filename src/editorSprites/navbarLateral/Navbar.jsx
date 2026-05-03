import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import { useViewport } from "../Workspace/hooks/useViewport";
import "./Navbar.css";

// Componente principal Navbar con estilos integrados
const NavbarLateral = ({
  logo,
  variant = "horizontal",
  lateralSide = "left",
  items = [],
  showOnlyIcons = false,
  twoColumns = false,
  theme = "light",
  onItemClick,
  className = "",
  showOnlyDropIcons = false, // Control independiente para los íconos de dropdown
  activeTool, // Nueva prop para detectar herramienta activa
  // Modo colapsado controlado desde el padre. Si no se provee `collapsed`,
  // se cae a estado interno (modo no controlado) y el render colapsado vive
  // dentro del propio Navbar como cuadro flotante. Si se provee, el padre
  // decide dónde pintar el indicador (p. ej. dentro de la TopToolbar).
  collapsed: collapsedProp,
  onCollapseChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [selectedSubitems, setSelectedSubitems] = useState({});
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  // Drawer del modo mobile: cuando viewport es ≤767px, la navbar lateral se
  // vuelve un FAB en esquina inferior izquierda; al tocarlo se abre un
  // overlay con grid de todas las herramientas. Tap en una la activa y
  // cierra el drawer.
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const vp = useViewport();
  const isControlled = collapsedProp !== undefined;
  const collapsed = isControlled ? collapsedProp : collapsedInternal;
  const requestCollapse = (next) => {
    if (!isControlled) setCollapsedInternal(next);
    if (onCollapseChange) onCollapseChange(next);
  };

  // Inicializar los subitems seleccionados al cargar el componente
  useEffect(() => {
    const initialSelectedSubitems = {};
    items.forEach((item, index) => {
      if (item.dropdown) {
        // Buscar si algún subitem está activo
        const activeSubitemIndex = item.dropdown.findIndex(
          subItem => subItem.toolValue === activeTool
        );
        initialSelectedSubitems[index] = activeSubitemIndex >= 0 ? activeSubitemIndex : 0;
      }
    });
    setSelectedSubitems(initialSelectedSubitems);
  }, [items, activeTool]);
  
  // Manejar clicks fuera de los dropdowns para cerrarlos
  const navbarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setOpenDropdowns({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ESC cierra el drawer mobile.
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileDrawerOpen]);

  // Manejar toggles de dropdowns
  const toggleDropdown = (id) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Manejar click en items
  const handleItemClick = (item) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // Función para verificar si un item está activo
  const isItemActive = (item) => {
    if (item.dropdown) {
      // Para dropdowns, verificar si algún subitem está activo
      return item.dropdown.some(subItem => subItem.toolValue === activeTool);
    } else {
      // Para items normales, verificar directamente
      return item.toolValue === activeTool;
    }
  };

  // Función para verificar si un subitem está activo
  const isSubItemActive = (subItem) => {
    return subItem.toolValue === activeTool;
  };

  // Determinar clases CSS basadas en las props
  const navbarClasses = `
    navbar 
    navbar-${variant} 
    navbar-${theme} 
    ${className}
    ${showOnlyIcons ? "navbar-icons-only" : ""}
    ${twoColumns ? "navbar-two-columns" : ""}
  `;

  // Renderizar un ítem del menú
  const renderMenuItem = (item, index) => {
    // Si el ítem tiene un dropdown
    if (item.dropdown) {
      // Obtener el índice del subitem seleccionado o usar 0 si no existe
      const selectedSubitemIndex = selectedSubitems[index] !== undefined ? selectedSubitems[index] : 0;
      const selectedSubitem = item.dropdown[selectedSubitemIndex];
      
      return (
        <div
          key={`item-${index}`}
          className={`navbar-item dropdown-container ${isItemActive(item) ? 'item-seleccionado' : ''}`}
          onClick={() => {
            if (selectedSubitem && selectedSubitem.onClick) {
              selectedSubitem.onClick();
            }
          }}
        >
          <div className="navbar-dropdown-trigger">
            {/* Mostrar icono del subitem seleccionado actualmente */}
            {selectedSubitem && selectedSubitem.icon && (
              <span className="navbar-icon">{selectedSubitem.icon}</span>
            )}
            {(!showOnlyIcons || variant === "mobile") && selectedSubitem && (
              <span className="navbar-label">{selectedSubitem.label}</span>
            )}
           
            <span 
              className="dropdown-arrow"
              onClick={(e) => {
                e.stopPropagation(); // Evitar que el click se propague
                toggleDropdown(index);
              }}
            >
              {openDropdowns[index] ? "▲" : "▼"}
            </span>
          </div>

          {openDropdowns[index] && (
            <div className="navbar-dropdown">
              {item.dropdown.map((subItem, subIndex) => (
                <div
                  key={`subitem-${index}-${subIndex}`}
                  className={`navbar-dropdown-item ${isSubItemActive(subItem) ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation(); // Evitar que el click se propague al contenedor padre
                    
                    // Actualizar el subitem seleccionado solo para este dropdown específico
                    setSelectedSubitems(prev => ({
                      ...prev,
                      [index]: subIndex
                    }));
                    
                    // Cerrar el dropdown después de seleccionar
                    setOpenDropdowns(prev => ({
                      ...prev,
                      [index]: false
                    }));
                    
                    // Ejecutar el onClick del subitem si existe
                    if (subItem.onClick) {
                      subItem.onClick();
                    }
                  }}
                >
                  {subItem.icon && (
                    <span
                      className="navbar-icon"
                      title={showOnlyDropIcons ? subItem.label : ""}
                    >
                      {subItem.icon}
                    </span>
                  )}
                  {/* IMPORTANTE: Solo afectado por showOnlyDropIcons, independiente del showOnlyIcons */}
                  {(!showOnlyDropIcons || variant === "mobile") && (
                    <span className="navbar-label-subitem">{subItem.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    // Si el ítem es normal (sin dropdown)
    else {
      return (
        <div
          key={`item-${index}`}
          className={`navbar-item ${isItemActive(item) ? 'item-seleccionado' : ''}`}
          onClick={() => {
            if (item.onClick) item.onClick();
            if (item.link) window.location.href = item.link;
            handleItemClick(item);
          }}
        >
          {item.icon && (
            <span
              className="navbar-icon"
              title={showOnlyIcons ? item.label : ""}
            >
              {item.icon}
            </span>
          )}
          {(!showOnlyIcons || variant === "mobile") && (
            <span className="navbar-label">{item.label}</span>
          )}
        </div>
      );
    }
  };

  // Busca el item (o subitem de dropdown) cuyo toolValue coincide con la
  // herramienta activa. Solo se usa para pintar el cuadro flotante en modo
  // colapsado — el resto de la barra ya tiene su propio resaltado.
  const findActiveItem = () => {
    for (const item of items) {
      if (item.dropdown) {
        const sub = item.dropdown.find((s) => s.toolValue === activeTool);
        if (sub) return sub;
      } else if (item.toolValue === activeTool) {
        return item;
      }
    }
    return null;
  };

  // ── MODO MOBILE (≤767px) ──
  // En pantallas pequeñas la barra lateral con todas las herramientas en
  // columna no cabe. Reemplazamos por un FAB esquina inferior izquierda
  // que abre un drawer slide-up con las tools en grid 4 columnas.
  // Esto sobrescribe cualquier valor de `collapsed` controlado por el
  // padre — el padre se entera del cambio via onCollapseChange si
  // necesita ajustar otra UI.
  if (vp.isMobileL) {
    const activeItem = findActiveItem();
    // Aplanar items: convertir cada `dropdown` en items individuales para
    // que todos sean tappeables en el grid sin niveles anidados.
    const flatItems = [];
    items.forEach((item) => {
      if (item.dropdown) {
        item.dropdown.forEach((sub) => flatItems.push(sub));
      } else {
        flatItems.push(item);
      }
    });
    return (
      <>
        <button
          type="button"
          className={`navbar-mobile-trigger navbar-${theme}`}
          onClick={() => setMobileDrawerOpen(true)}
          title={activeItem?.label || "Herramientas"}
          aria-label={activeItem?.label
            ? `Herramienta actual: ${activeItem.label}. Toca para abrir el panel de herramientas.`
            : "Abrir panel de herramientas"}
          aria-haspopup="dialog"
          aria-expanded={mobileDrawerOpen}
        >
          {activeItem?.icon ? (
            <span className="navbar-mobile-trigger__icon" aria-hidden="true">
              {activeItem.icon}
            </span>
          ) : (
            <span className="navbar-mobile-trigger__placeholder" aria-hidden="true">≡</span>
          )}
        </button>
        {mobileDrawerOpen && createPortal(
          <div
            className="navbar-mobile-drawer-overlay"
            onClick={() => setMobileDrawerOpen(false)}
            role="presentation"
          >
            <div
              className={`navbar-mobile-drawer navbar-${theme}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Panel de herramientas"
            >
              <div className="navbar-mobile-drawer__header">
                <span className="navbar-mobile-drawer__title">Herramientas</span>
                <button
                  type="button"
                  className="navbar-mobile-drawer__close"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Cerrar panel de herramientas"
                >
                  <LuX size={18} />
                </button>
              </div>
              <div className="navbar-mobile-drawer__grid">
                {flatItems.map((it, i) => {
                  const active = it.toolValue === activeTool;
                  return (
                    <button
                      key={`${it.toolValue || it.label}-${i}`}
                      type="button"
                      className={`navbar-mobile-tool${active ? " is-active" : ""}`}
                      onClick={() => {
                        if (typeof it.onClick === "function") it.onClick();
                        if (onItemClick) onItemClick(it);
                        setMobileDrawerOpen(false);
                      }}
                      aria-pressed={active}
                      title={it.label}
                    >
                      {it.icon && (
                        <span className="navbar-mobile-tool__icon" aria-hidden="true">
                          {it.icon}
                        </span>
                      )}
                      <span className="navbar-mobile-tool__label">{it.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  // Modo colapsado.
  //  - Controlado: devolvemos null. El padre decide dónde pintar el
  //    indicador (típicamente dentro de la TopToolbar superior).
  //  - No controlado: pintamos un cuadro flotante en la esquina superior
  //    izquierda del workspace (position:absolute respecto a
  //    `.workspace2-container`).
  if (collapsed) {
    if (isControlled) return null;
    const activeItem = findActiveItem();
    const labelTxt = activeItem?.label || "Ninguna";
    return (
      <div
        className={`navbar-collapsed-floating navbar-${theme}`}
        role="region"
        aria-label="Barra de herramientas colapsada"
      >
        <button
          type="button"
          className="navbar-collapsed-current"
          onClick={() => requestCollapse(false)}
          title={`${labelTxt} — clic para expandir la barra`}
          aria-label={`Expandir barra de herramientas. Herramienta actual: ${labelTxt}`}
          aria-expanded="false"
        >
          {activeItem?.icon ? (
            <span className="navbar-icon" aria-hidden="true">
              {activeItem.icon}
            </span>
          ) : (
            <span className="navbar-collapsed-placeholder" aria-hidden="true">
              ≡
            </span>
          )}
          <span className="navbar-collapsed-expand-hint" aria-hidden="true">
            ›
          </span>
        </button>
      </div>
    );
  }

  // Renderizar componentes según orientación
  return (
    <>
      {variant === "horizontal" ? (
        <nav className={`${navbarClasses} horizontal-navbar `} ref={navbarRef}>
          <div className="navbar-container">
            
            {/* Botón de menú móvil */}
            <div
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? "X" : "☰"}
            </div>

            {/* Menú de escritorio */}
            <div
              className={`navbar-menu ${mobileMenuOpen ? "mobile-open" : ""}`}
            >
              {items.map(renderMenuItem)}
            </div>
          </div>
        </nav>
      ) : (
        <aside
          className={`${navbarClasses} vertical-navbar ${lateralSide}`}
          ref={navbarRef}
        >
          <div className="navbar-container">
            <button
              type="button"
              className="navbar-collapse-toggle"
              onClick={() => requestCollapse(true)}
              title="Colapsar barra de herramientas"
              aria-label="Colapsar barra de herramientas"
              aria-expanded="true"
            >
              <span aria-hidden="true">‹</span>
            </button>

            <div className={`navbar-menu ${twoColumns ? "two-columns" : ""}`}>
              {items.map(renderMenuItem)}
            </div>
          </div>
        </aside>
      )}
    </>
  );
};

export default NavbarLateral;