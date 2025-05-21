import React from 'react';
import './RadioButton.css';

export const RadioButton = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  id,
  name,
  value,
}) => {
  const radioId = id || Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={`radio-container ${disabled ? 'radio-disabled' : ''} ${className}`}>
      <input
        id={radioId}
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="radio"
        name={name}
        value={value}
      />
      <label htmlFor={radioId} className="radio-label">
        {label}
      </label>
    </div>
  );
};
