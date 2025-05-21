import React from 'react';
import './Card.css';

export const Card = ({
  title,
  children,
  footer,
  className = '',
  elevation = 'md',
}) => {
  return (
    <div className={`card elevation-${elevation} ${className}`}>
      {title && <div className="card-header">{title}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};