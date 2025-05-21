
 // Divider.jsx
  import React from 'react';
  import './Divider.css';
  
  export const Divider = ({ 
    children, 
    orientation = 'center', 
    dashed = false, 
    className = '',
    type = 'horizontal' 
  }) => {
    if (type === 'vertical') {
      return <div className={`divider-vertical ${dashed ? 'divider-dashed' : ''} ${className}`}></div>;
    }
  
    if (children) {
      return (
        <div className={`divider divider-with-text divider-with-text-${orientation} ${className}`}>
          <span className="divider-inner-text">{children}</span>
        </div>
      );
    }
  
    return (
      <div className={`divider ${dashed ? 'divider-dashed' : ''} ${className}`}></div>
    );
  };
  