  // Timeline.jsx
  import React from 'react';
  import './Timeline.css';
  
  export const Timeline = ({ children, className = '', alternate = false }) => {
    return (
      <div className={`timeline ${alternate ? 'timeline-alternate' : ''} ${className}`}>
        {React.Children.map(children, (child, index) => {
          return React.cloneElement(child, {
            position: alternate ? (index % 2 === 0 ? 'left' : 'right') : child.props.position,
          });
        })}
      </div>
    );
  };
  
  export const TimelineItem = ({ 
    children, 
    dot, 
    position = 'left', 
    color = 'blue', 
    className = ''
  }) => {
    return (
      <div className={`timeline-item timeline-item-${position} ${className}`}>
        <div className="timeline-item-tail"></div>
        <div className={`timeline-item-dot timeline-item-dot-${color}`}>
          {dot || <span></span>}
        </div>
        <div className="timeline-item-content">{children}</div>
      </div>
    );
  };