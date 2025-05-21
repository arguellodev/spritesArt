// Input.jsx
import React from 'react';
import './Input.css';

export const Input = ({
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  required = false,
  name,
  id,
  className = '',
}) => {
  const inputId = id || name || Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input ${error ? 'input-error' : ''}`}
      />
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};