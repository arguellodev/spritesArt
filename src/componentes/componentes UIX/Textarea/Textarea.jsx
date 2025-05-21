import React from 'react';
import './Textarea.css';

export const Textarea = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 4,
  error,
  label,
  required = false,
  className = '',
  id,
  name,
  maxLength,
}) => {
  const textareaId = id || name || Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={`textarea-wrapper ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="textarea-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`textarea ${error ? 'textarea-error' : ''}`}
        name={name}
        maxLength={maxLength}
      ></textarea>
      {error && <p className="error-message">{error}</p>}
      {maxLength && (
        <div className="textarea-counter">
          {value ? value.length : 0}/{maxLength}
        </div>
      )}
    </div>
  );
};
