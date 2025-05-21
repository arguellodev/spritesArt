  import React from 'react';
  import './Tag.css';
  
  export const Tag = ({ 
    children, 
    color = 'gray', 
    size = 'md', 
    closable = false, 
    onClose, 
    className = '' 
  }) => {
    return (
      <div className={`tag tag-${color} tag-${size} ${className}`}>
        <span className="tag-text">{children}</span>
        {closable && (
          <button type="button" className="tag-close" onClick={onClose}>
            &times;
          </button>
        )}
      </div>
    );
  };