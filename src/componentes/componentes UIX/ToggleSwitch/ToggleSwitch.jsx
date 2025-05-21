// ToggleSwitch.jsx
import React from 'react';
import './ToggleSwitch.css';

export const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
  className = '',
  id,
  name,
}) => {
  const switchId = id || Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={`switch-container ${disabled ? 'switch-disabled' : ''} ${className}`}>
      <label htmlFor={switchId} className="switch">
        <input
          id={switchId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="switch-input"
          name={name}
        />
        <span className={`switch-slider switch-${size}`}></span>
      </label>
      {label && <span className="switch-label">{label}</span>}
    </div>
  );
};
