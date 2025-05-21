import React from 'react';
import './FormGroup.css';

export const FormGroup = ({ children, className = '', title }) => {
  return (
    <div className={`form-group ${className}`}>
      {title && <h3 className="form-group-title">{title}</h3>}
      <div className="form-group-content">
        {children}
      </div>
    </div>
  );
};
