// Select.jsx
import React from 'react';
import './Select.css';

export const Select = ({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
  disabled = false,
  error,
  label,
  required = false,
  className = '',
  id,
  name,
}) => {
  const selectId = id || name || Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={`select-wrapper ${className}`}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`select ${error ? 'select-error' : ''}`}
        name={name}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};