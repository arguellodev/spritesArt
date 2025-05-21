import { useState, useEffect, useRef } from "react";
import "./Navbar.css";
import { LuBrush, LuMousePointer2, LuEraser } from "react-icons/lu";

// Componente principal Navbar con estilos integrados
const NavbarLateral = ({
  logo,
  variant = "horizontal",
  lateralSide = "left",
  items =[],
  showOnlyIcons = false,
  twoColumns = false,
  theme = "light",
  onItemClick,
  className = "",
  showOnlyDropIcons = false, // Control independiente para los íconos de dropdown
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  // Reemplazamos el estado único con un objeto que almacena el ítem seleccionado por cada dropdown
  const [selectedSubitems, setSelectedSubitems] = useState({});
  const [actualIndexSelected, setActualIndexSelected] = useState(0);

  // Inicializar los subitems seleccionados al cargar el componente
  useEffect(() => {
    const initialSelectedSubitems = {};
    items.forEach((item, index) => {
      if (item.dropdown) {
        initialSelectedSubitems[index] = 0; // Por defecto, selecciona el primer subitem
      }
    });
    setSelectedSubitems(initialSelectedSubitems);
  }, [items]);
  
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
          className={`navbar-item dropdown-container ${actualIndexSelected === index ? 'item-seleccionado' : ''}`}
          onClick={() => {
            if (selectedSubitem && selectedSubitem.onClick) {
              selectedSubitem.onClick();
            }
            setActualIndexSelected(index);
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
                  className={`navbar-dropdown-item ${selectedSubitemIndex === subIndex ? 'selected' : ''}`}
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
                    
                    // Establecer este ítem como el seleccionado
                    setActualIndexSelected(index);
                    
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
          className={`navbar-item ${actualIndexSelected === index ? 'item-seleccionado' : ''}`}
          onClick={() => {
            if (item.onClick) item.onClick();
            if (item.link) window.location.href = item.link;
            handleItemClick(item);
            setActualIndexSelected(index);
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
            {logo && <div className="navbar-logo">{logo}</div>}

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
            {logo && <div className="navbar-logo">{logo}</div>}

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