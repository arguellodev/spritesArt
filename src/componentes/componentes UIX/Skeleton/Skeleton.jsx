  // Skeleton.jsx
  import React from 'react';
  import './Skeleton.css';
  
  export const Skeleton = ({ 
    type = 'text', 
    rows = 3, 
    height, 
    width, 
    circle = false, 
    className = '',
    active = true
  }) => {
    if (type === 'avatar' || circle) {
      return (
        <div 
          className={`skeleton skeleton-circle ${active ? 'skeleton-active' : ''} ${className}`} 
          style={{ 
            width: width || '3rem', 
            height: height || '3rem'
          }}
        ></div>
      );
    }
  
    if (type === 'button') {
      return (
        <div 
          className={`skeleton ${active ? 'skeleton-active' : ''} ${className}`} 
          style={{ 
            width: width || '5rem', 
            height: height || '2rem',
            borderRadius: '0.25rem'
          }}
        ></div>
      );
    }
  
    if (type === 'image') {
      return (
        <div 
          className={`skeleton ${active ? 'skeleton-active' : ''} ${className}`} 
          style={{ 
            width: width || '100%', 
            height: height || '12rem',
            borderRadius: '0.25rem'
          }}
        ></div>
      );
    }
  
    if (type === 'text') {
      return (
        <div className={`skeleton-text ${className}`}>
          {Array(rows)
            .fill()
            .map((_, index) => (
              <div 
                key={index} 
                className={`skeleton ${active ? 'skeleton-active' : ''}`} 
                style={{ 
                  width: index === rows - 1 && rows > 1 ? '80%' : '100%',
                  height: height || '0.875rem'
                }}
              ></div>
            ))}
        </div>
      );
    }
  
    return (
      <div 
        className={`skeleton ${active ? 'skeleton-active' : ''} ${className}`} 
        style={{ width, height }}
      ></div>
    );
  };