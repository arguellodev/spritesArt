  import React from 'react';
  import './Stepper.css';
  
  export const Stepper = ({ steps, activeStep, className = '' }) => {
    return (
      <div className={`stepper ${className}`}>
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;
          const isLast = index === steps.length - 1;
  
          return (
            <React.Fragment key={index}>
              <div
                className={`
                  stepper-step 
                  ${isActive ? 'stepper-active' : ''} 
                  ${isCompleted ? 'stepper-completed' : ''}
                `}
              >
                <div className="stepper-indicator">
                  {isCompleted ? (
                    <span className="stepper-check">✓</span>
                  ) : (
                    <span className="stepper-number">{index + 1}</span>
                  )}
                </div>
                <div className="stepper-label">{step}</div>
              </div>
              {!isLast && <div className={`stepper-line ${isCompleted ? 'stepper-line-completed' : ''}`} />}
            </React.Fragment>
          );
        })}
      </div>
    );
  };
  