import React, { useState, useRef, useEffect, useCallback } from 'react';

// Utilidades de conversión de colores
const rgbaToHsla = (r, g, b, a = 1) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: Math.round(a * 100)
  };
};

const hslaToRgba = (h, s, l, a = 100) => {
  h /= 360;
  s /= 100;
  l /= 100;
  
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: a / 100 // Alpha siempre entre 0 y 1
  };
};

const ColorPicker = ({ color = { r: 255, g: 0, b: 0, a: 1 }, onChange, defaultMinimized = true }) => {
  const [currentColor, setCurrentColor] = useState(color);
  const [colorMode, setColorMode] = useState('rgba');
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragType: null // 'colorArea', 'hue', 'alpha'
  });
  
  const colorAreaRef = useRef(null);
  const hueSliderRef = useRef(null);
  const alphaSliderRef = useRef(null);

//Manejar el minimizado automatico: 
const colorPickerRef = useRef(null);

// Agregar este useEffect
useEffect(() => {
  const handleClickOutside = (event) => {
    if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
      setIsMinimized(true);
    }
  };

  if (!isMinimized) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isMinimized]);

  // Convertir color actual según el modo
  const getCurrentValues = () => {
    if (colorMode === 'rgba') {
      return {
        first: currentColor.r,
        second: currentColor.g,
        third: currentColor.b,
        alpha: Math.round(currentColor.a * 255) // Mostrar de 0 a 255
      };
    } else {
      const hsla = rgbaToHsla(currentColor.r, currentColor.g, currentColor.b, currentColor.a);
      return {
        first: hsla.h,
        second: hsla.s,
        third: hsla.l,
        alpha: Math.round(hsla.a * 255 / 100) // Convertir de porcentaje HSLA a 0-255
      };
    }
  };

  const updateColor = (newColor) => {
    setCurrentColor(newColor);
    onChange?.(newColor);
  };

  const handleValueChange = (index, value) => {
    const values = getCurrentValues();
    const newValues = { ...values };
    
    if (index === 0) newValues.first = Math.max(0, Math.min(colorMode === 'rgba' ? 255 : 360, value));
    else if (index === 1) newValues.second = Math.max(0, Math.min(colorMode === 'rgba' ? 255 : 100, value));
    else if (index === 2) newValues.third = Math.max(0, Math.min(colorMode === 'rgba' ? 255 : 100, value));
  // En handleValueChange, ajustar el máximo según el modo
else if (index === 3) {
  const max = colorMode === 'rgba' ? 255 : 100;
  newValues.alpha = Math.max(0, Math.min(max, value));
}

    let newColor;
    if (colorMode === 'rgba') {
      newColor = {
        r: newValues.first,
        g: newValues.second,
        b: newValues.third,
        a: newValues.alpha / 255 // Convertir de 0-255 a 0-1
      };
    } else {
      // En HSLA, el alpha se maneja como porcentaje, convertir de 0-255 a 0-100
      const alphaPercent = colorMode === 'rgba' 
  ? (newValues.alpha / 255) * 100 
  : newValues.alpha;
      newColor = hslaToRgba(newValues.first, newValues.second, newValues.third, alphaPercent);
    }
    
    updateColor(newColor);
  };

  // Función para parsear valores RGBA del input de texto
  const parseRgbaInput = (input) => {
    // Remover espacios y convertir a minúsculas
    const cleanInput = input.replace(/\s/g, '').toLowerCase();
    
    // Intentar match con diferentes formatos RGBA
    const rgbaMatch = cleanInput.match(/rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)/);
    
    if (rgbaMatch) {
      const r = Math.max(0, Math.min(255, parseInt(rgbaMatch[1]) || 0));
      const g = Math.max(0, Math.min(255, parseInt(rgbaMatch[2]) || 0));
      const b = Math.max(0, Math.min(255, parseInt(rgbaMatch[3]) || 0));
      const a = rgbaMatch[4] ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))) : 1;
      
      return { r, g, b, a };
    }
    
    return null;
  };

  const handleRgbaInputChange = (inputValue) => {
    const parsed = parseRgbaInput(inputValue);
    if (parsed) {
      updateColor(parsed);
    }
  };

  const hsvToRgba = (h, s, v, a = 100) => {
    h /= 360;
    s /= 100;
    v /= 100;
    
    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;
    
    let r, g, b;
    
    if (h < 1/6) {
      r = c; g = x; b = 0;
    } else if (h < 2/6) {
      r = x; g = c; b = 0;
    } else if (h < 3/6) {
      r = 0; g = c; b = x;
    } else if (h < 4/6) {
      r = 0; g = x; b = c;
    } else if (h < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a: a / 100
    };
  };

  // Funciones de manejo de arrastre para el área de color
  const updateColorFromPosition = useCallback((clientX, clientY) => {
    if (!colorAreaRef.current) return;
    
    const rect = colorAreaRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    
    const saturation = (x / rect.width) * 100;
    const brightness = (1 - y / rect.height) * 100; // Cambio aquí: usar brightness en lugar de lightness
    
    const hsla = rgbaToHsla(currentColor.r, currentColor.g, currentColor.b, currentColor.a);
    
    // Usar HSV en lugar de HSL para el cálculo
    const newColor = hsvToRgba(hsla.h, saturation, brightness, currentColor.a * 100);
    newColor.a = currentColor.a;
    updateColor(newColor);
  }, [currentColor]);
  
  // Funciones de manejo de arrastre para slider de matiz
  const updateHueFromPosition = useCallback((clientX) => {
    if (!hueSliderRef.current) return;
    
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const hue = (x / rect.width) * 360;
    
    const hsla = rgbaToHsla(currentColor.r, currentColor.g, currentColor.b, currentColor.a);
    const newColor = hslaToRgba(hue, hsla.s, hsla.l, hsla.a * 100);
    newColor.a = currentColor.a; // ✅ Mantener el alpha original
  updateColor(newColor);
}, [currentColor]);

  // Funciones de manejo de arrastre para slider de alpha
  const updateAlphaFromPosition = useCallback((clientX) => {
    if (!alphaSliderRef.current) return;
    
    const rect = alphaSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const alpha = (x / rect.width); // Entre 0 y 1
    
    updateColor({ ...currentColor, a: alpha });
  }, [currentColor]);

  // Manejadores mouse down
  const handleColorAreaMouseDown = (e) => {
    setDragState({ isDragging: true, dragType: 'colorArea' });
    updateColorFromPosition(e.clientX, e.clientY);
  };

  const handleHueSliderMouseDown = (e) => {
    setDragState({ isDragging: true, dragType: 'hue' });
    updateHueFromPosition(e.clientX);
  };

  const handleAlphaSliderMouseDown = (e) => {
    setDragState({ isDragging: true, dragType: 'alpha' });
    updateAlphaFromPosition(e.clientX);
  };

  // Manejadores globales de mouse
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState.isDragging) return;
      
      e.preventDefault();
      
      switch (dragState.dragType) {
        case 'colorArea':
          updateColorFromPosition(e.clientX, e.clientY);
          break;
        case 'hue':
          updateHueFromPosition(e.clientX);
          break;
        case 'alpha':
          updateAlphaFromPosition(e.clientX);
          break;
      }
    };

    const handleMouseUp = () => {
      setDragState({ isDragging: false, dragType: null });
    };

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [dragState, updateColorFromPosition, updateHueFromPosition, updateAlphaFromPosition]);

  const values = getCurrentValues();
  const hsla = rgbaToHsla(currentColor.r, currentColor.g, currentColor.b, currentColor.a);

  const presetColors = [
    { r: 255, g: 0, b: 0, a: 1 },
    { r: 255, g: 165, b: 0, a: 1 },
    { r: 255, g: 255, b: 0, a: 1 },
    { r: 0, g: 255, b: 0, a: 1 },
    { r: 0, g: 255, b: 255, a: 1 },
    { r: 0, g: 0, b: 255, a: 1 },
    { r: 128, g: 0, b: 128, a: 1 },
    { r: 255, g: 192, b: 203, a: 1 },
    { r: 0, g: 0, b: 0, a: 1 },
    { r: 128, g: 128, b: 128, a: 1 },
    { r: 255, g: 255, b: 255, a: 1 },
    { r: 139, g: 69, b: 19, a: 1 }
  ];

  const formatRgbaString = (color) => {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a.toFixed(2)})`;
  };

  return (
    <div 
    ref={colorPickerRef}
    style={{
      '--bg-primary': '#1a1a1a',
      '--bg-secondary': '#2a2a2a',
      '--bg-tertiary': '#333333',
      '--bg-workspace': '#222222',
      '--text-primary': '#f0f0f0',
      '--text-secondary': '#b8b8b8',
      '--accent-color': '#8c52ff',
      '--accent-hover': '#9d6dff',
      '--accent-active': '#7538e8',
      '--border-color': '#444444',
      '--canvas-shadow': '0 0 20px rgba(0, 0, 0, 0.5)',
      '--panel-shadow': '0 2px 8px rgba(0, 0, 0, 0.2)',
      '--button-bg': '#3a3a3a',
      '--button-hover': '#4a4a4a',
      '--button-border': '#555555',
      '--layer-hover': '#3f3f3f',
      '--layer-selected': '#4b3c7a',
      '--danger': '#ff5252',
      '--grid-color': 'rgba(121, 121, 121, 0.164)'
    }} className={`color-picker ${isMinimized ? 'minimized' : 'expanded'}`}>
      <style jsx>{`
        .color-picker {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: var(--panel-shadow);
          transition: all 0.3s ease;
        position: relative;
         z-index: 1000;
        }

        .color-picker.minimized {
          padding: 8px;
          width: fit-content;
          
        }

        .color-picker.expanded {
        display:block;
        top:280px;
          padding: 16px;
          width: auto;
          height:auto;
        }

        .minimized-view {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-thumbnail {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          cursor: pointer;
          flex-shrink: 0;
          background: 
            linear-gradient(45deg, 
              rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a})
            ),
            conic-gradient(#808080 0deg, transparent 90deg, transparent 180deg, #808080 270deg) 0 0/8px 8px;
          transition: transform 0.2s ease;
        }

        .color-thumbnail:hover {
          transform: scale(1.05);
          border-color: var(--accent-color);
        }

        .rgba-input-minimized {
          flex: 1;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 12px;
          padding: 6px 8px;
          font-family: 'Courier New', monospace;
          min-width: 0;
        }

        .rgba-input-minimized:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(140, 82, 255, 0.2);
        }

        .expand-button {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px 8px;
          font-size: 12px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .expand-button:hover {
          background: var(--button-hover);
          color: var(--text-primary);
          border-color: var(--accent-color);
        }

        .minimize-button {
          
          top: 8px;
          right: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px 8px;
          font-size: 11px;
          transition: all 0.2s ease;
        }

        .minimize-button:hover {
          background: var(--button-hover);
          color: var(--text-primary);
          border-color: var(--accent-color);
        }

        .expanded-content {
          position: relative;
        }

        .color-area-container {
          position: relative;
          margin-bottom: 12px;
        }

  .color-area {
  width: 100%;
  height: 160px;
  border-radius: 4px;
  cursor: crosshair;
  position: relative;
  background: 
    linear-gradient(to bottom, transparent, black),
    linear-gradient(to right, white, transparent),
    hsl(${hsla.h}, 100%, 50%);
  user-select: none;
}

        .color-area.dragging {
          cursor: grabbing;
        }

     

        .color-area-cursor {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 2px solid white;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
          left: ${hsla.s}%;
          top: ${100 - hsla.l}%;
        }

        .sliders-container {
          margin-bottom: 16px;
        }

        .slider-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          gap: 8px;
        }

        .slider-container {
          flex: 1;
          height: 16px;
          border-radius: 8px;
          position: relative;
          cursor: pointer;
          border: 1px solid var(--border-color);
          user-select: none;
        }

        .slider-container.dragging {
          cursor: grabbing;
        }

        .hue-slider {
          background: linear-gradient(to right, 
            #ff0000, #ff8000, #ffff00, #80ff00, 
            #00ff00, #00ff80, #00ffff, #0080ff, 
            #0000ff, #8000ff, #ff00ff, #ff0080, #ff0000
          );
        }

        .alpha-slider {
          background: 
            linear-gradient(to right, 
              rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0),
              rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 1)
            ),
            conic-gradient(#808080 0deg, transparent 90deg, transparent 180deg, #808080 270deg) 0 0/8px 8px;
        }

        .slider-cursor {
          position: absolute;
          top: 50%;
          width: 4px;
          height: 20px;
          background: white;
          border: 1px solid #333;
          border-radius: 2px;
          transform: translate(-50%, -50%);
          pointer-events: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          cursor: pointer;
        }

        .color-mode-tabs {
          display: flex;
          margin-bottom: 12px;
          background: var(--bg-primary);
          border-radius: 4px;
          padding: 2px;
        }

        .color-mode-tab {
          flex: 1;
          padding: 6px 12px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.2s ease;
        }

        .color-mode-tab.active {
          background: var(--accent-color);
          color: white;
        }

        .color-mode-tab:hover:not(.active) {
          background: var(--button-hover);
          color: var(--text-primary);
        }

        .values-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .value-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .value-label {
          font-size: 10px;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 600;
          text-align: center;
        }

        .value-input {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 3px;
          color: var(--text-primary);
          font-size: 12px;
          padding: 4px 6px;
          text-align: center;
          width: 100%;
        }

        .value-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(140, 82, 255, 0.2);
        }

        .current-color-preview {
          width: 100%;
          height: 32px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          margin-bottom: 12px;
          background: 
            linear-gradient(45deg, 
              rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a})
            ),
            conic-gradient(#808080 0deg, transparent 90deg, transparent 180deg, #808080 270deg) 0 0/8px 8px;
        }

        .presets-container {
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }

        .presets-title {
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .presets-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
        }

        .preset-color {
          width: 32px;
          height: 24px;
          border-radius: 3px;
          cursor: pointer;
          border: 1px solid var(--border-color);
          transition: transform 0.1s ease;
        }

        .preset-color:hover {
          transform: scale(1.1);
          border-color: var(--accent-color);
        }

        .hex-input-container {
          margin-bottom: 12px;
        }

        .hex-input {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 12px;
          padding: 6px 8px;
          width: 100%;
          font-family: 'Courier New', monospace;
        }

        .hex-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(140, 82, 255, 0.2);
        }

        .rgba-output {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 8px;
          margin-top: 8px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: var(--text-secondary);
        }
      `}</style>

      
        
        <div className="minimized-view">
          <div 
            className="color-thumbnail"
            onClick={() => setIsMinimized(false)}
            title="Expandir selector de color"
          />
          <input 
            type="text"
            className="rgba-input-minimized"
            value={formatRgbaString(currentColor)}
            onChange={(e) => handleRgbaInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRgbaInputChange(e.target.value);
              }
            }}
            placeholder="rgba(255, 0, 0, 1.00)"
            title="Editar color RGBA"
          />
          <button 
            className="expand-button"
            onClick={() => setIsMinimized(false)}
            title="Expandir selector"
          >
            ⚙️
          </button>
        </div>
     {!isMinimized &&  (
        // Vista expandida (contenido original)
        <div className="expanded-content">
          
          <button 
            className="minimize-button"
            onClick={() => setIsMinimized(true)}
            title="Minimizar selector"
          >
            Minimizar
          </button>
          {/* Área principal de selección de color */}
          <div className="color-area-container">
           
            <div 
              ref={colorAreaRef}
              className={`color-area ${dragState.isDragging && dragState.dragType === 'colorArea' ? 'dragging' : ''}`}
              onMouseDown={handleColorAreaMouseDown}
            >
              <div className="color-area-cursor" />
            </div>
          </div>

          {/* Sliders de matiz y alpha */}
          <div className="sliders-container">
            <div className="slider-row">
              <div 
                ref={hueSliderRef}
                className={`slider-container hue-slider ${dragState.isDragging && dragState.dragType === 'hue' ? 'dragging' : ''}`}
                onMouseDown={handleHueSliderMouseDown}
              >
                <div 
                  className="slider-cursor" 
                  style={{ left: `${(hsla.h / 360) * 100}%` }}
                />
              </div>
            </div>
            <div className="slider-row">
              <div 
                ref={alphaSliderRef}
                className={`slider-container alpha-slider ${dragState.isDragging && dragState.dragType === 'alpha' ? 'dragging' : ''}`}
                onMouseDown={handleAlphaSliderMouseDown}
              >
                <div 
                  className="slider-cursor" 
                  style={{ left: `${currentColor.a * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pestañas de modo de color */}
          <div className="color-mode-tabs">
            <button 
              className={`color-mode-tab ${colorMode === 'rgba' ? 'active' : ''}`}
              onClick={() => setColorMode('rgba')}
            >
              RGBA
            </button>
            <button 
              className={`color-mode-tab ${colorMode === 'hsla' ? 'active' : ''}`}
              onClick={() => setColorMode('hsla')}
            >
              HSLA
            </button>
          </div>

          {/* Inputs de valores */}
          <div className="values-container">
            <div className="value-input-group">
              <label className="value-label">{colorMode === 'rgba' ? 'R' : 'H'}</label>
              <input 
                type="number"
                className="value-input"
                value={values.first}
                min="0"
                max={colorMode === 'rgba' ? 255 : 360}
                onChange={(e) => handleValueChange(0, parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="value-input-group">
              <label className="value-label">{colorMode === 'rgba' ? 'G' : 'S'}</label>
              <input 
                type="number"
                className="value-input"
                value={values.second}
                min="0"
                max={colorMode === 'rgba' ? 255 : 100}
                onChange={(e) => handleValueChange(1, parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="value-input-group">
              <label className="value-label">{colorMode === 'rgba' ? 'B' : 'L'}</label>
              <input 
                type="number"
                className="value-input"
                value={values.third}
                min="0"
                max={colorMode === 'rgba' ? 255 : 100}
                onChange={(e) => handleValueChange(2, parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="value-input-group">
              <label className="value-label">A</label>
              <input 
                type="number"
                className="value-input"
                value={values.alpha}
                min="0"
                max="100"
                onChange={(e) => handleValueChange(3, parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Input hexadecimal */}
          <div className="hex-input-container">
            <input 
              type="text"
              className="hex-input"
              value={`#${[currentColor.r, currentColor.g, currentColor.b].map(v => 
                v.toString(16).padStart(2, '0')
              ).join('').toUpperCase()}`}
              onChange={(e) => {
                const hex = e.target.value.replace('#', '');
                if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
                  const r = parseInt(hex.substring(0, 2), 16);
                  const g = parseInt(hex.substring(2, 4), 16);
                  const b = parseInt(hex.substring(4, 6), 16);
                  updateColor({ r, g, b, a: currentColor.a });
                }
              }}
              placeholder="#FFFFFF"
            />
          </div>

          {/* Vista previa del color actual */}
          <div className="current-color-preview" />

          {/* Salida RGBA (para verificar que alpha está entre 0-1) */}
          <div className="rgba-output">
            RGBA: {currentColor.r}, {currentColor.g}, {currentColor.b}, {currentColor.a.toFixed(2)}
          </div>

          {/* Colores preestablecidos */}
          <div className="presets-container">
            <div className="presets-title">Presets</div>
            <div className="presets-grid">
              {presetColors.map((preset, index) => (
                <div
                  key={index}
                  className="preset-color"
                  style={{ 
                    backgroundColor: `rgba(${preset.r}, ${preset.g}, ${preset.b}, ${preset.a})` 
                  }}
                  onClick={() => updateColor(preset)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default ColorPicker;