export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button'
}) => {
  const buttonClass = `button ${variant} ${size} ${fullWidth ? 'full-width' : ''} ${className}`;
  
  return (
    <button
      type={type}
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};