  import React from 'react';
  import './List.css';
  
  export const List = ({ 
    children, 
    type = 'default', 
    bordered = false, 
    className = '', 
    size = 'md' 
  }) => {
    return (
      <div 
        className={`
          list 
          list-${type} 
          list-${size} 
          ${bordered ? 'list-bordered' : ''} 
          ${className}
        `}
      >
        {children}
      </div>
    );
  };
  
  export const ListItem = ({ 
    children, 
    extra, 
    title, 
    description, 
    className = '', 
    onClick 
  }) => {
    return (
      <div 
        className={`list-item ${onClick ? 'list-item-clickable' : ''} ${className}`} 
        onClick={onClick}
      >
        <div className="list-item-content">
          {(title || description) ? (
            <div className="list-item-meta">
              {title && <div className="list-item-title">{title}</div>}
              {description && <div className="list-item-description">{description}</div>}
            </div>
          ) : children}
        </div>
        {extra && <div className="list-item-extra">{extra}</div>}
      </div>
    );
  };
  