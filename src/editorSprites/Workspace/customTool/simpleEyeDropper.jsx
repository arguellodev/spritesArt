import React, { useState } from 'react';

const SimpleEyedropper = ({ onColorSelect, isShapeTool, setBorderColor, setForegroundColor }) => {
  const [isActive, setIsActive] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [inputColor, setInputColor] = useState('#ff0000');

  // Convertir hex a RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 1
    } : { r: 0, g: 0, b: 0, a: 1 };
  };

  // Eyedropper dentro de la ventana solamente
  const startWindowEyedropper = () => {
    setIsActive(true);

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 999999; cursor: crosshair; background: rgba(0,0,0,0.1);
      user-select: none;
    `;
    
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.9); color: white; padding: 12px 20px;
      border-radius: 6px; font-size: 14px; z-index: 1000000;
      pointer-events: none; font-family: Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    instructions.innerHTML = `
      <div style="text-align: center;">
        <div style="font-weight: bold; margin-bottom: 4px;">🎨 Selector de Color Interno</div>
        <div style="font-size: 12px; opacity: 0.9;">
          Haz clic en cualquier elemento de la aplicación • ESC para cancelar
        </div>
      </div>
    `;

    const colorInfo = document.createElement('div');
    colorInfo.style.cssText = `
      position: fixed; background: rgba(0,0,0,0.95); color: white;
      padding: 10px 15px; border-radius: 6px; font-size: 11px;
      pointer-events: none; z-index: 1000002; display: none;
      font-family: monospace; border: 2px solid #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4); min-width: 160px;
    `;

    const cleanup = () => {
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
      if (document.body.contains(instructions)) document.body.removeChild(instructions);
      if (document.body.contains(colorInfo)) document.body.removeChild(colorInfo);
      document.removeEventListener('keydown', handleKeyDown);
      setIsActive(false);
    };

    const getElementColor = (element) => {
      const computedStyle = window.getComputedStyle(element);
      
      // Intentar obtener color de diferentes propiedades
      const colors = [
        computedStyle.backgroundColor,
        computedStyle.color,
        computedStyle.borderColor,
        computedStyle.fill,
        computedStyle.stroke
      ];

      for (let colorString of colors) {
        if (colorString && colorString !== 'rgba(0, 0, 0, 0)' && colorString !== 'transparent') {
          const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (match) {
            return {
              r: parseInt(match[1]),
              g: parseInt(match[2]),
              b: parseInt(match[3]),
              a: match[4] ? parseFloat(match[4]) : 1,
              source: getColorSource(colorString, computedStyle)
            };
          }
        }
      }

      // Si no encuentra color, buscar en elemento padre
      if (element.parentElement && element.parentElement !== document.body) {
        return getElementColor(element.parentElement);
      }

      // Fallback
      return { r: 255, g: 255, b: 255, a: 1, source: 'fallback' };
    };

    const getColorSource = (colorString, style) => {
      if (colorString === style.backgroundColor) return 'background';
      if (colorString === style.color) return 'text';
      if (colorString === style.borderColor) return 'border';
      if (colorString === style.fill) return 'svg-fill';
      if (colorString === style.stroke) return 'svg-stroke';
      return 'css';
    };

    const rgbToHex = (r, g, b) => "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

    const getElementDescription = (element) => {
      let desc = element.tagName.toLowerCase();
      if (element.id) desc += `#${element.id}`;
      if (element.className && typeof element.className === 'string') {
        const firstClass = element.className.split(' ')[0];
        if (firstClass) desc += `.${firstClass}`;
      }
      return desc;
    };

    const handleMouseMove = (e) => {
      overlay.style.pointerEvents = 'none';
      const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = 'auto';
      
      if (elementUnder) {
        const color = getElementColor(elementUnder);
        const elementDesc = getElementDescription(elementUnder);
        
        const infoX = Math.min(e.clientX + 15, window.innerWidth - 200);
        const infoY = Math.max(e.clientY - 80, 10);
        
        colorInfo.style.display = 'block';
        colorInfo.style.left = infoX + 'px';
        colorInfo.style.top = infoY + 'px';
        
        colorInfo.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="
              width: 30px; height: 30px; 
              background: rgba(${color.r}, ${color.g}, ${color.b}, ${color.a}); 
              border: 2px solid #fff; border-radius: 4px;
              box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
            "></div>
            <div style="line-height: 1.3;">
              <div style="font-weight: bold;">RGB(${color.r}, ${color.g}, ${color.b})</div>
              <div style="opacity: 0.8;">${rgbToHex(color.r, color.g, color.b)}</div>
            </div>
          </div>
          <div style="font-size: 10px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px;">
            <div>Element: ${elementDesc}</div>
            <div>Source: ${color.source}</div>
          </div>
        `;
      }
    };

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      overlay.style.pointerEvents = 'none';
      const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = 'auto';
      
      if (elementUnder) {
        const color = getElementColor(elementUnder);

        const cleanColor = { r: color.r, g: color.g, b: color.b, a: color.a };
        
        if (isShapeTool) {
          setBorderColor(cleanColor);
        } else {
          setForegroundColor(cleanColor);
        }
        
        if (onColorSelect) {
          onColorSelect(cleanColor);
        }
        
        cleanup();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
      }
    };

    overlay.addEventListener('click', handleClick);
    overlay.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);

    document.body.appendChild(overlay);
    document.body.appendChild(instructions);
    document.body.appendChild(colorInfo);
  };

  // Input manual de color
  const handleManualColorInput = (hex) => {
    const color = hexToRgb(hex);
    
    if (isShapeTool) {
      setBorderColor(color);
    } else {
      setForegroundColor(color);
    }
    
    if (onColorSelect) {
      onColorSelect(color);
    }
    
    setShowColorPicker(false);
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {/* Eyedropper interno */}
      <button
        onClick={startWindowEyedropper}
        disabled={isActive}
        title="Selector de color interno - Solo funciona dentro de la ventana"
        style={{
          padding: '6px 10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: isActive ? '#e3f2fd' : '#fff',
          cursor: isActive ? 'wait' : 'pointer',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {isActive ? '🎯' : '🎨'}
      </button>

      {/* Separador */}
      <div style={{ width: '1px', height: '20px', backgroundColor: '#ddd' }}></div>

      {/* Input manual de color */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Introducir color manualmente"
          style={{
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          🎪 Manual
        </button>

        {showColorPicker && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            zIndex: '1000',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '200px'
          }}>
            <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
              Introducir color:
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="color"
                value={inputColor}
                onChange={(e) => setInputColor(e.target.value)}
                style={{ width: '40px', height: '30px', border: 'none', borderRadius: '4px' }}
              />
              <input
                type="text"
                value={inputColor}
                onChange={(e) => setInputColor(e.target.value)}
                placeholder="#FF0000"
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowColorPicker(false)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleManualColorInput(inputColor)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #007bff',
                  borderRadius: '3px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default SimpleEyedropper;