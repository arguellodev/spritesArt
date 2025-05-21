import React from 'react';
import './RadioGroup.css';
import { RadioButton } from './RadioButton';

export const RadioGroup = ({
  options,
  name,
  value,
  onChange,
  disabled = false,
  className = '',
  direction = 'vertical',
}) => {
  return (
    <div className={`radio-group radio-group-${direction} ${className}`}>
      {options.map((option) => (
        <RadioButton
          key={option.value}
          label={option.label}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          disabled={disabled || option.disabled}
          name={name}
          value={option.value}
        />
      ))}
    </div>
  );
};
