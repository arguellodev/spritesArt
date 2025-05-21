import React from 'react';
import './Spinner.css';

export const Spinner = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  return <div className={`spinner spinner-${size} spinner-${color} ${className}`}></div>;
};