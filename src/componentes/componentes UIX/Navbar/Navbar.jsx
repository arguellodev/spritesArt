import { useState, useEffect, useRef } from 'react';
import './Navbar.css'

// Componente principal Navbar con estilos integrados
const Navbar = ({
  logo,
  items = [],
  variant = 'horizontal',
  showOnlyIcons = false,
  twoColumns = false,
  theme = 'light',
  onItemClick,
  className = '',
  showOnlyDropIcons = false  // Control independiente para los íconos de dropdown
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  
  // Manejar clicks fuera de los dropdowns para cerrarlos
  const navbarRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setOpenDropdowns({});
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Manejar toggles de dropdowns
  const toggleDropdown = (id) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [id]: !prev[id]
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
    ${showOnlyIcons ? 'navbar-icons-only' : ''}
    ${twoColumns ? 'navbar-two-columns' : ''}
  `;
  
  // Renderizar un ítem del menú
  const renderMenuItem = (item, index) => {
    // Si el ítem tiene un dropdown
    if (item.dropdown) {
      return (
        <div 
          key={`item-${index}`} 
          className="navbar-item dropdown-container"
        >
          <div 
            className="navbar-dropdown-trigger"
            onClick={() => toggleDropdown(index)}
          >
            {item.icon && <span className="navbar-icon">{item.icon}</span>}
            {(!showOnlyIcons || variant === 'mobile') && <span className="navbar-label">{item.label}</span>}
            {variant === 'horizontal' && 
             <span className="dropdown-arrow">{openDropdowns[index] ? '▲' : '▼'}</span>
            }
           
          </div>
          
          {openDropdowns[index] && (
            <div className="navbar-dropdown">
              {item.dropdown.map((subItem, subIndex) => (
                <div 
                  key={`subitem-${index}-${subIndex}`}
                  className="navbar-dropdown-item"
                  onClick={() => {
                    if (subItem.onClick) subItem.onClick();
                    if (subItem.link) window.location.href = subItem.link;
                    handleItemClick(subItem);
                  }}
                >
                  {subItem.icon && (
                    <span className="navbar-icon" title={showOnlyDropIcons ? subItem.label : ''}>
                      {subItem.icon}
                    </span>
                  )}
                  {/* IMPORTANTE: Solo afectado por showOnlyDropIcons, independiente del showOnlyIcons */}
                  {(!showOnlyDropIcons || variant === 'mobile') && (
                    <span className="navbar-label">{subItem.label}</span>
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
          className="navbar-item"
          onClick={() => {
            if (item.onClick) item.onClick();
            if (item.link) window.location.href = item.link;
            handleItemClick(item);
          }}
        >
          {item.icon && (
            <span className="navbar-icon" title={showOnlyIcons ? item.label : ''}>
              {item.icon}
            </span>
          )}
          {(!showOnlyIcons || variant === 'mobile') && (
            <span className="navbar-label">{item.label}</span>
          )}
        </div>
      );
    }
  };

  // Renderizar componentes según orientación
  return (
    <>
      {variant === 'horizontal' ? (
        <nav className={`${navbarClasses} horizontal-navbar`} ref={navbarRef}>
          <div className="navbar-container">
            {logo && <div className="navbar-logo">{logo}</div>}
            
            {/* Botón de menú móvil */}
            <div className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? 'X' : '☰'}
            </div>
            
            {/* Menú de escritorio */}
            <div className={`navbar-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
              {items.map(renderMenuItem)}
            </div>
          </div>
        </nav>
      ) : (
        <aside className={`${navbarClasses} vertical-navbar`} ref={navbarRef}>
          <div className="navbar-container">
            {logo && <div className="navbar-logo">{logo}</div>}
            
            <div className={`navbar-menu ${twoColumns ? 'two-columns' : ''}`}>
              {items.map(renderMenuItem)}
            </div>
          </div>
        </aside>
      )}
    </>
  );
};

export default Navbar;