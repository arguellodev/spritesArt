import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import "./customSelect.css";

const CustomSelect = ({ 
  options = {}, 
  placeholder = "Selecciona una opción",
  onSelect = () => {},
  defaultValue = null,
  value = null, // NUEVO: prop para valor controlado
  disabled = false,
  width = "200px",
  renderOption = null,
  renderSelected = null,
  position = "bottom", // "top", "bottom", "left", "right"
  maxHeight = "300px",
  enableColumns = true, // Habilitar columnas automáticas
  minColumnWidth = "200px" // Ancho mínimo de columna
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(value || defaultValue); // Usar value si está disponible
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [actualPosition, setActualPosition] = useState(position);
  const [menuStyle, setMenuStyle] = useState({});
  const [useColumns, setUseColumns] = useState(false);
  const [columnsCount, setColumnsCount] = useState(1);
  // Rect del botón para anclar el portal. Lo guardamos para que el menú,
  // renderizado en document.body vía createPortal, siga la posición del
  // select aun si el panel derecho hace scroll o la ventana cambia de
  // tamaño. Portal elegido para escapar el `overflow: hidden` del panel
  // que antes recortaba el menú.
  const [selectRect, setSelectRect] = useState(null);

  const selectRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  // NUEVO: useEffect para actualizar selectedItem cuando value cambie (valor controlado)
  useEffect(() => {
    if (value !== null) {
      setSelectedItem(value);
    }
  }, [value]);

  // Flatten options for keyboard navigation
  const flattenedOptions = Object.entries(options).reduce((acc, [category, items]) => {
    acc.push({ type: 'category', label: category });
    items.forEach(item => {
      acc.push({ type: 'item', ...item, category });
    });
    return acc;
  }, []);

  // Filter options based on search
  const filteredOptions = Object.entries(options).reduce((acc, [category, items]) => {
    const filteredItems = items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredItems.length > 0) {
      acc[category] = filteredItems;
    }
    return acc;
  }, {});

  // Calcular posición inteligente del menú
  const calculateMenuPosition = () => {
    if (!selectRef.current || !menuRef.current) return;

    const selectRect = selectRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition = position;
    let style = {};
    let shouldUseColumns = false;
    let columns = 1;

    // Calcular espacio disponible en cada dirección
    const spaces = {
      top: selectRect.top,
      bottom: viewport.height - selectRect.bottom,
      left: selectRect.left,
      right: viewport.width - selectRect.right
    };

    // Determinar la mejor posición si no cabe en la posición preferida
    if (position === "bottom" && spaces.bottom < menuRect.height) {
      newPosition = spaces.top > spaces.bottom ? "top" : "bottom";
    } else if (position === "top" && spaces.top < menuRect.height) {
      newPosition = spaces.bottom > spaces.top ? "bottom" : "top";
    } else if (position === "right" && spaces.right < menuRect.width) {
      newPosition = spaces.left > spaces.right ? "left" : "right";
    } else if (position === "left" && spaces.left < menuRect.width) {
      newPosition = spaces.right > spaces.left ? "right" : "left";
    }

    // Calcular estilos según la posición
    switch (newPosition) {
      case "top":
        style = {
          bottom: '100%',
          left: '0',
          marginBottom: '4px',
          width: width
        };
        // Verificar si necesita columnas por altura
        if (enableColumns && menuRect.height > spaces.top) {
          shouldUseColumns = true;
          columns = Math.min(Math.ceil(menuRect.height / spaces.top), 3);
        }
        break;
        
      case "bottom":
        style = {
          top: '100%',
          left: '0',
          marginTop: '4px',
          width: width
        };
        // Verificar si necesita columnas por altura
        if (enableColumns && menuRect.height > spaces.bottom) {
          shouldUseColumns = true;
          columns = Math.min(Math.ceil(menuRect.height / spaces.bottom), 3);
        }
        break;
        
      case "left":
        style = {
          top: '0',
          right: '100%',
          marginRight: '4px',
          minWidth: width
        };
        // Verificar si necesita columnas por ancho
        if (enableColumns && menuRect.width > spaces.left) {
          shouldUseColumns = true;
          columns = Math.min(Math.ceil(menuRect.width / parseInt(minColumnWidth)), 3);
        }
        break;
        
      case "right":
        style = {
          top: '0',
          left: '100%',
          marginLeft: '4px',
          minWidth: width
        };
        // Verificar si necesita columnas por ancho
        if (enableColumns && menuRect.width > spaces.right) {
          shouldUseColumns = true;
          columns = Math.min(Math.ceil(menuRect.width / parseInt(minColumnWidth)), 3);
        }
        break;
    }

    // Ajustar maxHeight si es necesario
    if (newPosition === "top" || newPosition === "bottom") {
      const availableHeight = newPosition === "top" ? spaces.top - 20 : spaces.bottom - 20;
      style.maxHeight = `${Math.min(parseInt(maxHeight), availableHeight)}px`;
    }

    setActualPosition(newPosition);
    setMenuStyle(style);
    setUseColumns(shouldUseColumns);
    setColumnsCount(columns);
  };

  // Recalcular posición cuando se abre el menú
  useEffect(() => {
    if (isMenuOpen) {
      // Usar setTimeout para asegurar que el menú se haya renderizado
      const timer = setTimeout(calculateMenuPosition, 10);
      return () => clearTimeout(timer);
    }
  }, [isMenuOpen, options, searchTerm]);

  // Medir el rect del botón al abrir y mantenerlo sincronizado con el
  // scroll/resize, para que el portal del menú siga al botón.
  useLayoutEffect(() => {
    if (!isMenuOpen || !selectRef.current) return;
    const r = selectRef.current.getBoundingClientRect();
    setSelectRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const update = () => {
      if (!selectRef.current) return;
      const r = selectRef.current.getBoundingClientRect();
      setSelectRect((prev) => {
        if (
          prev &&
          prev.top === r.top &&
          prev.left === r.left &&
          prev.width === r.width &&
          prev.height === r.height
        ) return prev;
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isMenuOpen]);

  // Close menu when clicking outside. Ahora el menú vive en un portal,
  // así que también comprobamos menuRef para no cerrar al clickear dentro.
  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideSelect = selectRef.current && selectRef.current.contains(event.target);
      const insideMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!insideSelect && !insideMenu) {
        setIsMenuOpen(false);
        setSearchTerm("");
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when menu opens
  useEffect(() => {
    if (isMenuOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isMenuOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isMenuOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsMenuOpen(true);
      }
      return;
    }

    const selectableItems = flattenedOptions.filter(item => item.type === 'item');

    switch (e.key) {
      case 'Escape':
        setIsMenuOpen(false);
        setSearchTerm("");
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < selectableItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : selectableItems.length - 1
        );
        break;
      case 'Enter':
        if (focusedIndex >= 0 && selectableItems[focusedIndex]) {
          handleSelect(selectableItems[focusedIndex]);
        }
        break;
    }
  };

  const handleSelect = (item) => {
    // Solo actualizar estado interno si no es controlado
    if (value === null) {
      setSelectedItem(item);
    }
    setIsMenuOpen(false);
    setSearchTerm("");
    setFocusedIndex(-1);
    onSelect(item);
  };

  const toggleMenu = () => {
    if (disabled) return;
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      setSearchTerm("");
      setFocusedIndex(-1);
    }
  };

  return (
    <div 
      className={`custom-select ${disabled ? 'disabled' : ''}`}
      ref={selectRef}
      style={{ width }}
    >
      <button 
        className={`custom-select-button ${isMenuOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isMenuOpen}
        aria-haspopup="listbox"
      >
        <span className="custom-select-label">
          {selectedItem ? (
            renderSelected ? renderSelected(selectedItem) : selectedItem.label
          ) : placeholder}
        </span>
        <div className={`custom-select-arrow ${isMenuOpen ? 'open' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path 
              d="M3 4.5L6 7.5L9 4.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {isMenuOpen && selectRect && createPortal(
        <div
          style={{
            position: 'fixed',
            top: selectRect.top,
            left: selectRect.left,
            width: selectRect.width,
            height: selectRect.height,
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        >
          <div
            className={`custom-select-menu position-${actualPosition} ${useColumns ? 'columns' : ''}`}
            ref={menuRef}
            style={{
              ...menuStyle,
              '--columns-count': columnsCount,
              pointerEvents: 'auto',
            }}
          >
            <div className="custom-select-search">
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="custom-select-search-input"
              />
            </div>

            <div className={`custom-select-options ${useColumns ? 'columns-layout' : ''}`}>
              {Object.keys(filteredOptions).length === 0 ? (
                <div className="custom-select-no-results">
                  No se encontraron resultados
                </div>
              ) : (
                Object.entries(filteredOptions).map(([category, items]) => (
                  <div key={category} className="custom-select-category">
                    <div className="custom-select-category-header">
                      {category}
                    </div>
                    {items.map((item, index) => {
                      const globalIndex = flattenedOptions
                        .filter(opt => opt.type === 'item')
                        .findIndex(opt => opt.value === item.value);

                      return (
                        <button
                          key={item.value}
                          className={`custom-select-option ${
                            selectedItem?.value === item.value ? 'selected' : ''
                          } ${focusedIndex === globalIndex ? 'focused' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setFocusedIndex(globalIndex)}
                        >
                          {renderOption ? (
                            renderOption(item)
                          ) : (
                            <>
                              {item.icon && (
                                <span className="custom-select-option-icon">
                                  {item.icon}
                                </span>
                              )}
                              <span className="custom-select-option-label">
                                {item.label}
                              </span>
                              {item.description && (
                                <span className="custom-select-option-description">
                                  {item.description}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;