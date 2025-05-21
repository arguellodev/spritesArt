import React, { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

export const Dropdown = ({
  trigger,
  children,
  position = 'bottom-left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef}>
      <div className="dropdown-trigger" onClick={toggleDropdown}>
        {trigger}
      </div>
      {isOpen && (
        <div className={`dropdown-menu dropdown-${position}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({ children, onClick, disabled = false, className = '' }) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`dropdown-item ${disabled ? 'dropdown-item-disabled' : ''} ${className}`}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

export const DropdownDivider = () => <div className="dropdown-divider"></div>;
