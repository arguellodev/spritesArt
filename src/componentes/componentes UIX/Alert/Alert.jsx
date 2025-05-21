// Alert.jsx
import React from 'react';
import './Alert.css';

export const Alert = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  return (
    <div className={`alert alert-${type} ${className}`}>
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">{children}</div>
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};
