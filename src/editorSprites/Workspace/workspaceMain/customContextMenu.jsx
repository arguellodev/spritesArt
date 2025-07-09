import React, { useState, useRef, useEffect, useCallback } from 'react';
import './customContextMenu.css';

const CustomContextMenu = ({ 
  isVisible, 
  position, 
  onClose, 
  actions = [],
  header = null
}) => {
  const menuRef = useRef(null);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(position);
  const [activeInput, setActiveInput] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [originalValue, setOriginalValue] = useState('');

  console.log("se renderizo");
  // Calcular posición del menú para evitar que se salga de la pantalla
  const calculateMenuPosition = useCallback(() => {
    
    if (!isVisible || !menuRef.current || !position) return;
    
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let { x, y } = position;
    
    // Determinar si abrir hacia la izquierda o derecha
    const shouldOpenLeft = x + rect.width > viewportWidth - 20;
    
    if (shouldOpenLeft) {
      x = Math.max(10, x - rect.width);
      menu.classList.add('position-left');
      menu.classList.remove('position-right');
    } else {
      x = Math.min(x, viewportWidth - rect.width - 10);
      menu.classList.add('position-right');
      menu.classList.remove('position-left');
    }
    
    // Ajustar verticalmente
    if (y + rect.height > viewportHeight - 20) {
      y = Math.max(10, viewportHeight - rect.height - 10);
    }
    
    // Asegurar límites mínimos
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setMenuPosition({ x, y });
  }, [isVisible, position]);

  // Calcular posición inicial y cuando cambia el input activo
  useEffect(() => {
    calculateMenuPosition();
  }, [calculateMenuPosition]);

  useEffect(() => {
    if (activeInput) {
      requestAnimationFrame(() => {
        calculateMenuPosition();
      });
    }
  }, [activeInput, calculateMenuPosition]);

  // Enfocar input cuando se activa
  useEffect(() => {
    if (activeInput && inputRef.current) {
      inputRef.current.focus();
      if (activeInput.type !== 'slider') {
        inputRef.current.select();
      }
    }
  }, [activeInput]);

  // Confirmar valor del input
  const confirmInputValue = useCallback(() => {
    if (!activeInput) return;

    let finalValue = inputValue;

    // Validaciones según el tipo
    if (activeInput.type === 'number') {
      const numValue = parseFloat(inputValue);
      if (isNaN(numValue)) {
        finalValue = originalValue;
      } else {
        finalValue = numValue;
      }
    } else if (activeInput.type === 'slider') {
      const numValue = parseFloat(inputValue);
      if (isNaN(numValue)) {
        finalValue = parseFloat(originalValue);
      } else {
        const min = activeInput.min || 0;
        const max = activeInput.max || 100;
        finalValue = Math.min(Math.max(numValue, min), max);
      }
    } else if (activeInput.type === 'text') {
      if (finalValue.trim() === '') {
        finalValue = originalValue;
      }
    }

    // Llamar la función de actualización
    if (activeInput.setValue) {
      activeInput.setValue(finalValue);
    }

    setActiveInput(null);
    setInputValue('');
    setOriginalValue('');
  }, [activeInput, inputValue, originalValue]);

  // Cancelar input
  const cancelInput = useCallback(() => {
    setActiveInput(null);
    setInputValue('');
    setOriginalValue('');
  }, []);

  // Manejar clics fuera del menú - MEJORADO
  const handleOutsideClick = useCallback((event) => {
    if (!isVisible || !menuRef.current) return;
    
    const { clientX, clientY } = event;
    const menuRect = menuRef.current.getBoundingClientRect();
    
    // Verificar si el clic está dentro del menú
    const isInsideMenu = (
      clientX >= menuRect.left &&
      clientX <= menuRect.right &&
      clientY >= menuRect.top &&
      clientY <= menuRect.bottom
    );
    
    const isInsideMenuElement = menuRef.current.contains(event.target);
    
    if (isInsideMenu || isInsideMenuElement) {
      return; // No cerrar si el clic es dentro del menú
    }
    
    // CAMBIO IMPORTANTE: Solo cerrar si NO hay input activo
    if (!activeInput) {
      onClose();
    }
    // Si hay input activo, no hacer nada - el menú permanece abierto
  }, [isVisible, activeInput, onClose]);

  // Manejar tecla Escape
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && isVisible) {
      event.preventDefault();
      if (activeInput) {
        cancelInput();
      } else {
        onClose();
      }
    }
  }, [isVisible, activeInput, onClose, cancelInput]);

  // Event listeners
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('pointerdown', handleOutsideClick, true);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('pointerdown', handleOutsideClick, true);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isVisible, handleOutsideClick, handleKeyDown]);

  // Activar input
  const activateInput = (action) => {
    const currentValue = action.getValue ? action.getValue() : '';
    setActiveInput(action);
    setInputValue(String(currentValue));
    setOriginalValue(String(currentValue));
  };

  // Manejar cambio en el input
  const handleInputChange = (event) => {
    const value = event.target.value;
    
    if (activeInput?.type === 'number' || activeInput?.type === 'slider') {
      if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
        setInputValue(value);
      }
    } else {
      setInputValue(value);
    }
  };

  // Manejar Enter en el input
  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmInputValue();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelInput();
    }
  };

  // Manejar clic en item del menú
  const handleItemClick = (action) => {
    if (action.disabled) return;

    // Si es un input, activarlo
    if (action.type && ['text', 'number', 'slider'].includes(action.type)) {
      activateInput(action);
      return;
    }

    // Si es una acción normal, ejecutar y cerrar
    if (action.onClick) {
      action.onClick();
      onClose();
    }
  };

  // Prevenir propagación de eventos en el contenedor del input
  const handleInputContainerPointerDown = (event) => {
    event.stopPropagation();
  };

  // Manejar clic directo en el botón X para cerrar
  const handleCloseClick = (event) => {
    event.stopPropagation();
    if (activeInput) {
      cancelInput();
    }
    onClose();
  };

  if (!isVisible || !position) return null;

  return (
    <>
      {/* Overlay - MODIFICADO para no cerrar con input activo */}
      <div
        ref={overlayRef}
        className={`context-menu-overlay ${activeInput ? 'has-active-input' : ''}`}
        style={{ 
          pointerEvents: activeInput ? 'none' : 'auto' // Desactivar overlay cuando hay input activo
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Menú contextual */}
      <div
        ref={menuRef}
        className="context-menu"
        style={{
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="context-menu-content">
          {/* Botón de cerrar - AGREGADO */}
          <button 
            className="context-menu-close-button"
            onClick={handleCloseClick}
            title="Cerrar menú"
          >
            ✕
          </button>

          {/* Header opcional */}
          {header && (header.title || header.subtitle) && (
            <>
              <div className="context-menu-header">
                <div className="context-menu-header-content">
                  {header.title && (
                    <span className="context-menu-title">{header.title}</span>
                  )}
                  {header.subtitle && (
                    <span className="context-menu-subtitle">{header.subtitle}</span>
                  )}
                </div>
              </div>
              <div className="context-menu-separator"></div>
            </>
          )}
          
          {/* Items del menú */}
          {actions.map((action, index) => {
            const isInputType = action.type && ['text', 'number', 'slider'].includes(action.type);
            const isActiveInput = activeInput && activeInput === action;
            
            return (
              <div key={action.id || index}>
                {/* Item del menú */}
                <button
                  className={`context-menu-item ${action.disabled ? 'disabled' : ''} ${action.danger ? 'danger' : ''} ${isActiveInput ? 'active-input' : ''}`}
                  onClick={() => handleItemClick(action)}
                  disabled={action.disabled}
                >
                  <span className="context-menu-icon">
                    {action.icon || action.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="context-menu-label">{action.label}</span>
                  {action.shortcut && !isInputType && (
                    <span className="context-menu-shortcut">{action.shortcut}</span>
                  )}
                  {isInputType && !isActiveInput && (
                    <span className="context-menu-input-indicator">
                      {action.getValue ? String(action.getValue()) : ''}
                    </span>
                  )}
                </button>

                {/* Contenedor de input activo */}
                {isActiveInput && (
                  <div 
                    className="context-menu-input-container"
                    onPointerDown={handleInputContainerPointerDown}
                  >
                    <div className="context-menu-input-wrapper">
                      {activeInput.type === 'slider' ? (
                        <div className="context-menu-slider-container">
                          <input
                            ref={inputRef}
                            type="range"
                            min={activeInput.min || 0}
                            max={activeInput.max || 100}
                            step={activeInput.step || 1}
                            value={inputValue}
                            onChange={handleInputChange}
                            className="context-menu-slider"
                          />
                          <div className="context-menu-slider-value">
                            <input
                              type="text"
                              value={inputValue}
                              onChange={handleInputChange}
                              onKeyDown={handleInputKeyDown}
                              className="context-menu-slider-input"
                            />
                          </div>
                        </div>
                      ) : (
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputValue}
                          onChange={handleInputChange}
                          onKeyDown={handleInputKeyDown}
                          placeholder={activeInput.placeholder || `Ingrese ${activeInput.type === 'number' ? 'número' : 'texto'}`}
                          className="context-menu-input"
                        />
                      )}
                      
                      <div className="context-menu-input-actions">
                        <button
                          className="context-menu-input-button confirm"
                          onClick={confirmInputValue}
                          title="Confirmar (Enter)"
                        >
                          ✓
                        </button>
                        <button
                          className="context-menu-input-button cancel"
                          onClick={cancelInput}
                          title="Cancelar (Esc)"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default CustomContextMenu;