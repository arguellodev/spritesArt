import React, { useState, useEffect } from 'react';

const HexInput = ({ currentColor, updateColor, hexColor, setHexColor }) => {
  const [inputValue, setInputValue] = useState(hexColor);
  const [isValid, setIsValid] = useState(true);

  // Actualizar el input cuando cambie el color externamente
  useEffect(() => {
    const newHex = `#${[currentColor.r, currentColor.g, currentColor.b]
      .map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    
    // Solo actualizar si no está siendo editado por el usuario
    if (document.activeElement !== document.querySelector('.hex-input')) {
      setInputValue(newHex);
      setHexColor(newHex);
    }
  }, [currentColor.r, currentColor.g, currentColor.b, setHexColor]);

  // Validar formato hex
  const validateHex = (value) => {
    const cleanValue = value.replace('#', '');
    // Permitir 3, 4, 6 u 8 caracteres (RGB, RGBA, RRGGBB, RRGGBBAA)
    return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{4}$|^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{8}$/.test(cleanValue);
  };

  // Convertir hex a RGBA
  const hexToRgba = (hex) => {
    const cleanHex = hex.replace('#', '');
    let r, g, b, a = 1;

    if (cleanHex.length === 3) {
      // RGB formato corto: #RGB -> #RRGGBB
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 4) {
      // RGBA formato corto: #RGBA -> #RRGGBBAA
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
      a = parseInt(cleanHex[3] + cleanHex[3], 16) / 255;
    } else if (cleanHex.length === 6) {
      // RGB formato largo: #RRGGBB
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    } else if (cleanHex.length === 8) {
      // RGBA formato largo: #RRGGBBAA
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
      a = parseInt(cleanHex.substring(6, 8), 16) / 255;
    }

    return { r, g, b, a };
  };

  // Manejar cambios en el input
  const handleInputChange = (e) => {
    let value = e.target.value;
    
    // Asegurar que empiece con #
    if (value && !value.startsWith('#')) {
      value = '#' + value;
    }

    // Limitar longitud máxima (# + 8 caracteres)
    if (value.length > 9) {
      value = value.substring(0, 9);
    }

    // Permitir solo caracteres hexadecimales
    const cleanValue = value.replace('#', '');
    if (cleanValue && !/^[0-9A-Fa-f]*$/.test(cleanValue)) {
      return; // No actualizar si contiene caracteres inválidos
    }

    setInputValue(value);
    const valid = validateHex(value);
    setIsValid(valid);

    // Si es válido, actualizar el color inmediatamente para feedback visual
    if (valid && cleanValue.length >= 3) {
      const rgba = hexToRgba(value);
      updateColor(rgba);
    }
  };

  // Manejar cuando el usuario sale del input
  const handleBlur = () => {
    if (isValid && inputValue) {
      const rgba = hexToRgba(inputValue);
      updateColor(rgba);
      
      // Normalizar el formato (siempre mostrar formato largo)
      const normalizedHex = `#${[rgba.r, rgba.g, rgba.b]
        .map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      
      setInputValue(normalizedHex);
      setHexColor(normalizedHex);
    } else {
      // Si no es válido, revertir al último valor válido
      const revertHex = `#${[currentColor.r, currentColor.g, currentColor.b]
        .map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      
      setInputValue(revertHex);
      setHexColor(revertHex);
      setIsValid(true);
    }
  };

  // Manejar Enter para confirmar
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Activar handleBlur
    }
  };

  return (
    <>
      <style jsx>{`
        .hex-input {
          background: #2a2a2a;
          border: 1px solid ${isValid ? '#444' : '#ff4444'};
          border-radius: 6px;
          color: #f0f0f0;
          font-size: 13px;
          padding: 8px 12px;
          width: 100%;
          font-family: 'Courier New', monospace;
          margin-bottom: 16px;
          transition: border-color 0.2s ease;
          text-transform: uppercase;
        }

        .hex-input:focus {
          outline: none;
          border-color: ${isValid ? '#8c52ff' : '#ff6666'};
          box-shadow: 0 0 0 2px ${isValid ? 'rgba(140, 82, 255, 0.2)' : 'rgba(255, 68, 68, 0.2)'};
        }

        .hex-input::placeholder {
          color: #666;
          text-transform: none;
        }

        .hex-input.invalid {
          background: rgba(255, 68, 68, 0.1);
        }
      `}</style>
      
      <input 
        type="text"
        className={`hex-input ${!isValid ? 'invalid' : ''}`}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="#FFFFFF o #FFFFFFFF"
        maxLength={9}
        autoComplete="off"
        spellCheck="false"
      />
    </>
  );
};

export default HexInput;