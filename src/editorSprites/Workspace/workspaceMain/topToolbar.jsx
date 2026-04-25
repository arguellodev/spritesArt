import { useEffect, useRef, useState } from 'react';
import './topToolbar.css';

const EMPTY_MENUS = [];

// Barra superior. Tres slots:
//  - izquierda: menus desplegables (solo si `menus` trae items)
//  - centro:    children (acciones principales)
//  - derecha:   `rightSlot` custom o branding "Powered by"
const TopToolbar = ({
  children,
  companyName = 'Argánion',
  companyLogo = null,
  menus = EMPTY_MENUS,
  rightSlot = null,
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRefs = useRef({});
  const menuItemRefs = useRef({});

  const hasMenus = Array.isArray(menus) && menus.length > 0;

  const closeDropdowns = () => {
    setActiveDropdown(null);
    setFocusedIndex(-1);
  };

  // Cierre al hacer click fuera (mousedown > click para atrapar antes)
  useEffect(() => {
    if (!activeDropdown) return undefined;
    const handleMouseDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeDropdowns();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [activeDropdown]);

  // Mueve el foco al item enfocado (navegacion por teclado)
  useEffect(() => {
    if (!activeDropdown || focusedIndex < 0) return;
    const el = menuItemRefs.current[`${activeDropdown}-${focusedIndex}`];
    if (el) el.focus();
  }, [activeDropdown, focusedIndex]);

  const toggleDropdown = (key) => {
    setActiveDropdown((prev) => (prev === key ? null : key));
    setFocusedIndex(-1);
  };

  // Salta separadores y disabled en navegacion por teclado
  const findNextEnabled = (items, start, step) => {
    const len = items.length;
    if (len === 0) return -1;
    let idx = start;
    for (let i = 0; i < len; i += 1) {
      idx = (idx + step + len) % len;
      if (items[idx].type !== 'separator' && !items[idx].disabled) return idx;
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
    } else if (e.key === 'Tab') {
      closeDropdowns();
    }
  };

  const handleItemClick = (item) => {
    if (item.disabled) return;
    if (item.onClick) item.onClick();
    closeDropdowns();
  };

  const renderDropdownItem = (item, index, menuKey) => {
    if (item.type === 'separator') {
      return (
        <div
          key={`${menuKey}-sep-${index}`}
          className="dropdown-separator"
          role="separator"
        />
      );
    }

    return (
      <button
        key={`${menuKey}-${index}`}
        type="button"
        role="menuitem"
        className="dropdown-item"
        disabled={item.disabled}
        ref={(el) => {
          menuItemRefs.current[`${menuKey}-${index}`] = el;
        }}
        onClick={() => handleItemClick(item)}
      >
        <span className="dropdown-item-name">{item.name}</span>
        {item.shortcut && (
          <span className="dropdown-item-shortcut">{item.shortcut}</span>
        )}
      </button>
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
                  onKeyDown={(e) => handleTriggerKeyDown(e, key, menu.items)}
                >
                  {menu.label}
                </button>
                {isOpen && (
                  <div
                    className="dropdown-menu"
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
        </div>
      )}

      <div className="topToolbar-center">{children}</div>

      <div className="topToolbar-right">{renderRightSlot()}</div>
    </div>
  );
};

export default TopToolbar;
