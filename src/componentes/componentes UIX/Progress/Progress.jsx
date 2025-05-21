// Progress.jsx
import React from 'react';
import './Progress.css';

export const Progress = ({
  value = 0,
  max = 100,
  showLabel = true,
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={`progress-container ${className}`}>
      <div className={`progress progress-${size} progress-${color}`}>
        <div 
          className="progress-bar" 
          style={{ width: `${percentage}%` }}
          role="progressbar" 
          aria-valuenow={value} 
          aria-valuemin="0" 
          aria-valuemax={max}
        ></div>
      </div>
      {showLabel && <span className="progress-label">{Math.round(percentage)}%</span>}
    </div>
  );
};
