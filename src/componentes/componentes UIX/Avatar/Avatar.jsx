// Avatar.jsx
import React from 'react';
import './Avatar.css';

export const Avatar = ({
  src,
  alt,
  size = 'md',
  shape = 'circle',
  status,
  statusPosition = 'bottom-right',
  initials,
  className = '',
}) => {
  const avatarClass = `
    avatar 
    avatar-${size} 
    avatar-${shape} 
    ${className}
  `.trim();

  // Get initials from alt text if not provided
  const getInitials = () => {
    if (initials) return initials;
    if (!alt) return '';
    return alt
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`avatar-container ${statusPosition}`}>
      {src ? (
        <img src={src} alt={alt || 'Avatar'} className={avatarClass} />
      ) : (
        <div className={`${avatarClass} avatar-initials`}>
          {getInitials()}
        </div>
      )}
      {status && <span className={`avatar-status avatar-status-${status}`}></span>}
    </div>
  );
};