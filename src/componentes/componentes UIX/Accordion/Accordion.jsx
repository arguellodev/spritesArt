import React, { useState } from 'react';
import './Accordion.css';

export const AccordionItem = ({
  title,
  children,
  isOpen: controlledIsOpen,
  onChange,
  className = '',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const toggleAccordion = () => {
    if (isControlled) {
      onChange && onChange(!isOpen);
    } else {
      setInternalIsOpen(!isOpen);
    }
  };

  return (
    <div className={`accordion-item ${isOpen ? 'accordion-open' : ''} ${className}`}>
      <div className="accordion-header" onClick={toggleAccordion}>
        <span className="accordion-title">{title}</span>
        <span className="accordion-icon">{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
};

export const Accordion = ({ children, className = '' }) => {
  return <div className={`accordion ${className}`}>{children}</div>;
};
