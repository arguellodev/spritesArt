  import React from 'react';
  import './Empty.css';
  
  export const Empty = ({ 
    image, 
    description = 'No hay datos disponibles', 
    children, 
    className = '' 
  }) => {
    return (
      <div className={`empty ${className}`}>
        {image && <div className="empty-image">{image}</div>}
        {!image && (
          <div className="empty-default-image">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 56C45.2548 56 56 45.2548 56 32C56 18.7452 45.2548 8 32 8C18.7452 8 8 18.7452 8 32C8 45.2548 18.7452 56 32 56Z" stroke="#D1D5DB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M32 45.3333V45.3467" stroke="#D1D5DB" strokeWidth="5.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M32 37.3333V18.6667" stroke="#D1D5DB" strokeWidth="5.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        <div className="empty-description">{description}</div>
        {children && <div className="empty-footer">{children}</div>}
      </div>
    );
  };