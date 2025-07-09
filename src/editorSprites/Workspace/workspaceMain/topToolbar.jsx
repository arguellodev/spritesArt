import React, { useState } from 'react';
import './topToolbar.css';

const TopToolbar = ({ children, companyName = "Argánion", companyLogo = null }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const topActions = {
    archivo: [
      { name: 'Nuevo', shortcut: 'Ctrl+N', action: () => console.log('Nuevo archivo') },
      { name: 'Abrir', shortcut: 'Ctrl+O', action: () => console.log('Abrir archivo') },
      { name: 'Guardar', shortcut: 'Ctrl+S', action: () => console.log('Guardar archivo') },
      { name: 'Guardar como...', shortcut: 'Ctrl+Shift+S', action: () => console.log('Guardar como') },
      { type: 'separator' },
      { name: 'Cerrar', shortcut: 'Ctrl+W', action: () => console.log('Cerrar archivo') }
    ],
    seleccion: [
      { name: 'Seleccionar todo', shortcut: 'Ctrl+A', action: () => console.log('Seleccionar todo') },
      { name: 'Deseleccionar', shortcut: 'Ctrl+D', action: () => console.log('Deseleccionar') },
      { name: 'Invertir selección', shortcut: 'Ctrl+I', action: () => console.log('Invertir selección') },
      { type: 'separator' },
      { name: 'Copiar', shortcut: 'Ctrl+C', action: () => console.log('Copiar') },
      { name: 'Pegar', shortcut: 'Ctrl+V', action: () => console.log('Pegar') }
    ],
    exportar: [
      { name: 'Exportar como PNG', action: () => console.log('Exportar PNG') },
      { name: 'Exportar como JPG', action: () => console.log('Exportar JPG') },
      { name: 'Exportar como SVG', action: () => console.log('Exportar SVG') },
      { name: 'Exportar como PDF', action: () => console.log('Exportar PDF') },
      { type: 'separator' },
      { name: 'Configurar exportación', action: () => console.log('Configurar exportación') }
    ]
  };

  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  const handleItemClick = (item) => {
    if (item.action) {
      item.action();
    }
    closeDropdowns();
  };

  const renderDropdownItem = (item, index) => {
    if (item.type === 'separator') {
      return <div key={index} className="dropdown-separator" />;
    }

    return (
      <div
        key={index}
        className="dropdown-item"
        onClick={() => handleItemClick(item)}
      >
        <span className="dropdown-item-name">{item.name}</span>
        {item.shortcut && (
          <span className="dropdown-item-shortcut">{item.shortcut}</span>
        )}
      </div>
    );
  };

  return (
    <div className="topToolbar-container" onClick={closeDropdowns}>
      {/* Sección izquierda - Menús desplegables */}
      <div className="topToolbar-left">
        {Object.entries(topActions).map(([key, items]) => (
          <div key={key} className="dropdown-wrapper">
            <button
              className={`dropdown-trigger ${activeDropdown === key ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown(key);
              }}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
            {activeDropdown === key && (
              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {items.map((item, index) => renderDropdownItem(item, index))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sección central - Botones de acción */}
      <div className="topToolbar-center">
        {children}
      </div>

      {/* Sección derecha - Powered by */}
      <div className="topToolbar-right">
        <div className="powered-by">
          <span className="powered-by-text">Powered by</span>
          <div className="company-info">
            {companyLogo && (
              <img src={companyLogo} alt={companyName} className="company-logo" />
            )}
            <span className="company-name">Argánion</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopToolbar;