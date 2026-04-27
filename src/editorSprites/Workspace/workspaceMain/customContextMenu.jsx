'use no memo';
// React Compiler (vite compilationMode:'all') tiene problemas con el patron
// useLayoutEffect+setState sincrono que usa SubmenuPanel; se opta-out el
// archivo entero para evitar interferencia (mismo motivo que blendModes.js).
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './customContextMenu.css';

// Paleta de colores para tags estilo Aseprite. Se usa cuando una accion del
// menu declara `type: 'color'`. Las swatches se complementan con un
// <input type="color"> nativo para permitir colores arbitrarios.
const ASEPRITE_TAG_COLORS = [
  '#FF1F1F', '#FF851B', '#FBA919', '#FFD700',
  '#2ECC40', '#1FE5E5', '#1F8AFF', '#9D38FF',
  '#FF6B9D', '#A0522D', '#7F8C8D', '#FFFFFF',
];

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

  // Estado del submenú
  const [openSubmenu, setOpenSubmenu] = useState(null); // null o action.id/index del item con submenu abierto
  const submenuCloseTimeoutRef = useRef(null);

  // Map de refs a buttons del menu que tienen submenu, indexed por key.
  // Lo usa SubmenuPanel (renderizado via portal) para conocer el anchor element
  // del item padre y calcular su posicion. Sin esto, el portal no tiene forma
  // de saber donde esta el button (no es DOM ancestor).
  const submenuAnchorsRef = useRef({});

  const openSubmenuFor = useCallback((key) => {
    if (submenuCloseTimeoutRef.current) {
      clearTimeout(submenuCloseTimeoutRef.current);
      submenuCloseTimeoutRef.current = null;
    }
    setOpenSubmenu(key);
  }, []);

  const scheduleSubmenuClose = useCallback(() => {
    if (submenuCloseTimeoutRef.current) clearTimeout(submenuCloseTimeoutRef.current);
    submenuCloseTimeoutRef.current = setTimeout(() => setOpenSubmenu(null), 200);
  }, []);

  useEffect(() => {
    return () => {
      if (submenuCloseTimeoutRef.current) clearTimeout(submenuCloseTimeoutRef.current);
    };
  }, []);

  // Calcular posición del menú para evitar que se salga de la pantalla
const calculateMenuPosition = useCallback(() => {
  
  if (!isVisible || !menuRef.current || !position) return;
  
  const menu = menuRef.current;
  const rect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const MARGIN = 30; // Margen consistente de 20px
  
  let { x, y } = position;
  
  // Determinar si abrir hacia la izquierda o derecha
  const shouldOpenLeft = x + rect.width > viewportWidth - MARGIN;
  
  if (shouldOpenLeft) {
    x = Math.max(MARGIN, x - rect.width);
    menu.classList.add('position-left');
    menu.classList.remove('position-right');
  } else {
    x = Math.min(x, viewportWidth - rect.width - MARGIN);
    menu.classList.add('position-right');
    menu.classList.remove('position-left');
  }
  
  // Ajustar verticalmente
  if (y + rect.height > viewportHeight - MARGIN) {
    y = Math.max(MARGIN, viewportHeight - rect.height - MARGIN);
  }
  
  // Asegurar límites mínimos (ya usando MARGIN)
  x = Math.max(MARGIN, x);
  y = Math.max(MARGIN, y);
  
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

  // Enfocar input cuando se activa. select() solo en text/number; en slider y
  // color es no-op o lanza segun el navegador, asi que lo evitamos.
  useEffect(() => {
    if (activeInput && inputRef.current) {
      inputRef.current.focus();
      if (activeInput.type !== 'slider' && activeInput.type !== 'color') {
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
    } else if (activeInput.type === 'color') {
      // Color: aceptar tal cual si parece hex valido, sino restaurar.
      if (!/^#[0-9a-fA-F]{6}$/.test(String(finalValue).trim())) {
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

  // Manejar tecla Escape: input activo > submenú abierto > cerrar todo
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && isVisible) {
      event.preventDefault();
      if (activeInput) {
        cancelInput();
      } else if (openSubmenu !== null) {
        setOpenSubmenu(null);
      } else {
        onClose();
      }
    }
  }, [isVisible, activeInput, onClose, cancelInput, openSubmenu]);

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
  const handleItemClick = (action, key) => {
    if (action.disabled) return;

    // Si es un submenú, toggle por click (además del hover) — fallback robusto
    // si el hover no se dispara (touch devices, electron, focus restaurado, etc).
    if (action.type === 'submenu') {
      setOpenSubmenu(prev => prev === key ? null : key);
      return;
    }

    // Si es un input, activarlo
    if (action.type && ['text', 'number', 'slider', 'color'].includes(action.type)) {
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
        className={`context-menu ${activeInput ? 'has-active-input' : ''}`}
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
          
          {/* Items del menú — cuando un input esta activo, ocultamos el resto
              de items para que el menu no tape la timeline mientras el usuario
              escribe (modo compacto). Solo se muestra el item activo + su
              caja de input. */}
          {actions.map((action, index) => {
            const isInputType = action.type && ['text', 'number', 'slider', 'color'].includes(action.type);
            const isActiveInput = activeInput && activeInput === action;
            // Compact mode: ocultar items que NO son el input activo.
            if (activeInput && !isActiveInput) return null;

            return (
              <div key={action.id || index}>
                {/* Item del menú */}
                <button
                  ref={action.type === 'submenu'
                    ? (el) => {
                        const k = action.id || index;
                        if (el) submenuAnchorsRef.current[k] = el;
                        else delete submenuAnchorsRef.current[k];
                      }
                    : undefined}
                  className={`context-menu-item ${action.disabled ? 'disabled' : ''} ${action.danger ? 'danger' : ''} ${isActiveInput ? 'active-input' : ''}`}
                  onClick={() => handleItemClick(action, action.id || index)}
                  disabled={action.disabled}
                  onMouseEnter={action.type === 'submenu' ? () => openSubmenuFor(action.id || index) : undefined}
                  onMouseLeave={action.type === 'submenu' ? scheduleSubmenuClose : undefined}
                  aria-haspopup={action.type === 'submenu' ? 'menu' : undefined}
                  aria-expanded={action.type === 'submenu' ? (openSubmenu === (action.id || index)) : undefined}
                >
                  <span className="context-menu-icon">
                    {action.icon || action.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="context-menu-label">{action.label}</span>
                  {action.type === 'submenu' && (
                    <span className="context-menu-submenu-arrow" aria-hidden>▶</span>
                  )}
                  {action.shortcut && !isInputType && (
                    <span className="context-menu-shortcut">{action.shortcut}</span>
                  )}
                  {isInputType && !isActiveInput && (
                    <span className="context-menu-input-indicator">
                      {action.getValue ? String(action.getValue()) : ''}
                    </span>
                  )}
                </button>

                {/* Submenú anidado: renderizado via portal a document.body
                    para escapar el containing block creado por transform de
                    .context-menu (que atrapaba al position:fixed). Recibe el
                    button como anchor para calcular su posicion. */}
                {action.type === 'submenu' && action.items && openSubmenu === (action.id || index) && (
                  <SubmenuPanel
                    anchorEl={submenuAnchorsRef.current[action.id || index]}
                    items={action.items}
                    onClose={() => { setOpenSubmenu(null); onClose(); }}
                    onMouseEnter={() => openSubmenuFor(action.id || index)}
                    onMouseLeave={scheduleSubmenuClose}
                  />
                )}

                {/* Contenedor de input activo */}
                {isActiveInput && (
                  <div
                    className="context-menu-input-container"
                    onPointerDown={handleInputContainerPointerDown}
                  >
                    {activeInput.helperText && (
                      <div className="context-menu-input-helper">
                        {activeInput.helperText}
                      </div>
                    )}
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
                      ) : activeInput.type === 'color' ? (
                        // Picker de color: 12 swatches Aseprite + input nativo para
                        // colores arbitrarios. Click en swatch actualiza el input
                        // value sin confirmar; el usuario presiona ✓ o Enter.
                        <div className="context-menu-color-container">
                          <div className="context-menu-color-swatches">
                            {ASEPRITE_TAG_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                className={`context-menu-color-swatch ${
                                  String(inputValue).toLowerCase() === c.toLowerCase()
                                    ? 'selected'
                                    : ''
                                }`}
                                style={{ background: c }}
                                onClick={() => setInputValue(c)}
                                title={c}
                                aria-label={`Color ${c}`}
                              />
                            ))}
                          </div>
                          <input
                            ref={inputRef}
                            type="color"
                            value={/^#[0-9a-fA-F]{6}$/.test(String(inputValue)) ? inputValue : '#4a90e2'}
                            onChange={handleInputChange}
                            className="context-menu-color-picker"
                            title="Color personalizado"
                          />
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

// Componente de panel de submenú anidado.
//
// IMPORTANTE — usa createPortal a document.body para escapar el containing
// block de .context-menu (que tiene transform en su animacion contextMenuAppear).
// Cualquier ancestor con `transform` se vuelve containing block para
// position:fixed descendientes — sin el portal, el "fixed" del submenu se
// posicionaba relativo a .context-menu en vez del viewport, quedando atrapado
// dentro del menu padre.
//
// `anchorEl` es el button del item padre (capturado via ref-callback en el
// map de actions). useLayoutEffect mide su rect + el panel rect, calcula
// posicion (derecha por default, izquierda como fallback si overflow), y
// hace setPos sincrono antes del paint para evitar flash.
function SubmenuPanel({ anchorEl, items, onClose, onMouseEnter, onMouseLeave }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, measured: false });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !anchorEl) return;
    const btnRect = anchorEl.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const margin = 6;
    const safe = 4;

    // Default: a la derecha del item.
    let left = btnRect.right + margin;
    if (left + panelRect.width > window.innerWidth - safe) {
      // Fallback: a la izquierda.
      left = Math.max(safe, btnRect.left - panelRect.width - margin);
    }

    // Vertical alineado al top del item; si overflow inferior, subir.
    let top = btnRect.top;
    if (top + panelRect.height > window.innerHeight - safe) {
      top = Math.max(safe, window.innerHeight - panelRect.height - safe);
    }

    setPos({ left: Math.round(left), top: Math.round(top), measured: true });
  }, [anchorEl]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      className="context-menu-submenu"
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        visibility: pos.measured ? 'visible' : 'hidden',
      }}
    >
      {items.map((item, idx) => {
        if (item.divider) {
          return <div key={`d-${idx}`} className="context-menu-submenu-divider">{item.label}</div>;
        }
        return (
          <button
            key={item.id || idx}
            className={`context-menu-submenu-item ${item.disabled ? 'disabled' : ''} ${item.checked ? 'checked' : ''}`}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
            disabled={item.disabled}
            role="menuitemradio"
            aria-checked={!!item.checked}
          >
            <span className="context-menu-submenu-check" aria-hidden>{item.checked ? '✓' : ''}</span>
            <span className="context-menu-submenu-label">{item.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}

export default CustomContextMenu;