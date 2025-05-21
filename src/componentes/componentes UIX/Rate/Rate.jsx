// Rate.jsx
  import React, { useState } from 'react';
  import './Rate.css';
  
  export const Rate = ({ 
    count = 5, 
    value = 0, 
    onChange, 
    character = '★', 
    disabled = false, 
    className = '',
    allowHalf = false
  }) => {
    const [hoverValue, setHoverValue] = useState(undefined);
  
    const handleMouseMove = (event, index) => {
      if (disabled) return;
      
      if (allowHalf) {
        const position = event.nativeEvent.offsetX;
        const halfPosition = event.target.getBoundingClientRect().width / 2;
        
        if (position <= halfPosition) {
          setHoverValue(index + 0.5);
        } else {
          setHoverValue(index + 1);
        }
      } else {
        setHoverValue(index + 1);
      }
    };
  
    const handleMouseLeave = () => {
      setHoverValue(undefined);
    };
  
    const handleClick = (index, event) => {
      if (disabled) return;
      
      if (allowHalf) {
        const position = event.nativeEvent.offsetX;
        const halfPosition = event.target.getBoundingClientRect().width / 2;
        
        if (position <= halfPosition) {
          onChange(index + 0.5);
        } else {
          onChange(index + 1);
        }
      } else {
        onChange(index + 1);
      }
    };
  
    return (
      <div className={`rate ${disabled ? 'rate-disabled' : ''} ${className}`}>
        {[...Array(count)].map((_, index) => {
          const activeValue = hoverValue !== undefined ? hoverValue : value;
          
          return (
            <div
              key={index}
              className="rate-star-wrapper"
              onClick={(event) => handleClick(index, event)}
              onMouseMove={(event) => handleMouseMove(event, index)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className={`
                  rate-star 
                  ${
                    activeValue >= index + 1
                      ? 'rate-star-full'
                      : activeValue >= index + 0.5 && allowHalf
                      ? 'rate-star-half'
                      : 'rate-star-empty'
                  }
                `}
              >
                {character}
              </div>
            </div>
          );
        })}
      </div>
    );
  };