// Badge.jsx
import React from 'react';
import './Badge.css';

export const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  className = '',
}) => {
  const badgeClass = `
    badge 
    badge-${variant} 
    badge-${size} 
    ${rounded ? 'badge-rounded' : ''} 
    ${className}
  `.trim();

  return <span className={badgeClass}>{children}</span>;
};
