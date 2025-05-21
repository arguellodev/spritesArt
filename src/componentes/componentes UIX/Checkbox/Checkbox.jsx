// Checkbox.jsx
import React from 'react';
import './Checkbox.css';

export const Checkbox = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  id,
  name,
}) => {
  const checkboxId = id || Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={`checkbox-container ${disabled ? 'checkbox-disabled' : ''} ${className}`}>
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="checkbox"
        name={name}
      />
      <label htmlFor={checkboxId} className="checkbox-label">
        {label}
      </label>
    </div>
  );
};
