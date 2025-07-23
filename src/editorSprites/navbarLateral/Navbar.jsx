import { useState, useEffect, useRef } from "react";
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
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [selectedSubitems, setSelectedSubitems] = useState({});

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
          <div className="navbar-logo">
              <img src="./pixcalli-serpiente.svg"></img>
            </div>


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