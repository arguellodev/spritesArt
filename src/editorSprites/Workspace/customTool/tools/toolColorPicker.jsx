import React, { useState, useRef, useCallback, useEffect } from 'react';
import HexInput from './hexInput';
import { usePointer } from '../../hooks/hooks';
const ToolColorPicker = ({ color = { r: 255, g: 0, b: 0, a: 1 }, onChange, hexColor, setHexColor }) => {
  const [currentColor, setCurrentColor] = useState(color);
  
  const colorAreaRef = useRef(null);
  const hueSliderRef = useRef(null);
  const alphaSliderRef = useRef(null);
  
  // Implementar usePointer para cada área
  const colorAreaPointer = usePointer(colorAreaRef, colorAreaRef);
  const hueSliderPointer = usePointer(hueSliderRef, hueSliderRef);
  const alphaSliderPointer = usePointer(alphaSliderRef, alphaSliderRef);

  // Utilidades de conversión
  const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    if (diff !== 0) {
      if (max === r) h = ((g - b) / diff) % 6;
      else if (max === g) h = (b - r) / diff + 2;
      else h = (r - g) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : diff / max;
    const v = max;
    
    return { h, s: s * 100, v: v * 100 };
  };

  const hsvToRgb = (h, s, v) => {
    h /= 360; s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;
    
    let r, g, b;
    if (h < 1/6) [r, g, b] = [c, x, 0];
    else if (h < 2/6) [r, g, b] = [x, c, 0];
    else if (h < 3/6) [r, g, b] = [0, c, x];
    else if (h < 4/6) [r, g, b] = [0, x, c];
    else if (h < 5/6) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  const updateColor = (newColor) => {
    setCurrentColor(newColor);
    onChange?.(newColor);
  };

  // Manejadores optimizados con usePointer
  const handleColorArea = useCallback((position) => {
    if (!colorAreaRef.current) return;
    const rect = colorAreaRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, position.x));
    const y = Math.max(0, Math.min(rect.height, position.y));
    
    const hsv = rgbToHsv(currentColor.r, currentColor.g, currentColor.b);
    const s = (x / rect.width) * 100;
    const v = (1 - y / rect.height) * 100;
    
    const rgb = hsvToRgb(hsv.h, s, v);
    updateColor({ ...rgb, a: currentColor.a });
  }, [currentColor]);

  const handleHueSlider = useCallback((position) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, position.x));
    const h = (x / rect.width) * 360;
    
    const hsv = rgbToHsv(currentColor.r, currentColor.g, currentColor.b);
    const rgb = hsvToRgb(h, hsv.s, hsv.v);
    updateColor({ ...rgb, a: currentColor.a });
  }, [currentColor]);

  const handleAlphaSlider = useCallback((position) => {
    if (!alphaSliderRef.current) return;
    const rect = alphaSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, position.x));
    const alpha = x / rect.width;
    updateColor({ ...currentColor, a: alpha });
  }, [currentColor]);

  // Effects para manejar los cambios de posición con usePointer
  useEffect(() => {
    if (colorAreaPointer.isPressed) {
      handleColorArea(colorAreaPointer.position);
    }
  }, [colorAreaPointer.position, colorAreaPointer.isPressed, handleColorArea]);

  useEffect(() => {
    if (hueSliderPointer.isPressed) {
      handleHueSlider(hueSliderPointer.position);
    }
  }, [hueSliderPointer.position, hueSliderPointer.isPressed, handleHueSlider]);

  useEffect(() => {
    if (alphaSliderPointer.isPressed) {
      handleAlphaSlider(alphaSliderPointer.position);
    }
  }, [alphaSliderPointer.position, alphaSliderPointer.isPressed, handleAlphaSlider]);

  const hsv = rgbToHsv(currentColor.r, currentColor.g, currentColor.b);

  useEffect(() => {
    setHexColor(`#${[currentColor.r, currentColor.g, currentColor.b]
      .map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`);
  }, [currentColor]);

  const presetColors = [
    '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80',
    '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
    '#000000', '#404040', '#808080', '#C0C0C0', '#FFFFFF', '#8B4513'
  ];

  return (
    <div className="color-picker">
      <style jsx>{`
        .color-picker {
          position: absolute;
          right: 100%;
          margin-right: 25px;
          top: 0;
          
          background: #1a1a1a;
          border: 1px solid #444;
          border-radius: 12px;
          padding: 20px;
          width: 280px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          
          z-index: 1000;
        }

        .color-area {
          width: 100%;
          height: 180px;
          border-radius: 8px;
          cursor: crosshair;
          position: relative;
          margin-bottom: 16px;
          background: 
            linear-gradient(to bottom, transparent, black),
            linear-gradient(to right, white, transparent),
            hsl(${hsv.h}, 100%, 50%);
          user-select: none;
        }

        .color-cursor {
          position: absolute;
          width: 14px;
          height: 14px;
          border: 2px solid white;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
          left: ${hsv.s}%;
          top: ${100 - hsv.v}%;
        }

        .slider {
          height: 18px;
          border-radius: 9px;
          position: relative;
          cursor: pointer;
          margin-bottom: 12px;
          border: 1px solid #333;
          user-select: none;
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
            url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='checker' x='0' y='0' width='10' height='10' patternUnits='userSpaceOnUse'%3e%3crect fill='%23ccc' x='0' width='5' height='5'/%3e%3crect fill='%23ccc' x='5' y='5' width='5' height='5'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23checker)'/%3e%3c/svg%3e");
        }

        .slider-thumb {
          position: absolute;
          top: 50%;
          width: 4px;
          height: 22px;
          background: white;
          border: 1px solid #333;
          border-radius: 2px;
          transform: translate(-50%, -50%);
          pointer-events: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }

        .controls-row {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .input-group {
          flex: 1;
        }

        .input-label {
          display: block;
          font-size: 11px;
          color: #999;
          margin-bottom: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .input-field {
          width: 100%;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          color: #f0f0f0;
          font-size: 13px;
          padding: 8px;
          text-align: center;
          transition: border-color 0.2s ease;
        }

        .input-field:focus {
          outline: none;
          border-color: #8c52ff;
          box-shadow: 0 0 0 2px rgba(140, 82, 255, 0.2);
        }

        .hex-input {
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          color: #f0f0f0;
          font-size: 13px;
          padding: 8px 12px;
          width: 100%;
          font-family: 'Courier New', monospace;
          margin-bottom: 16px;
          transition: border-color 0.2s ease;
        }

        .hex-input:focus {
          outline: none;
          border-color: #8c52ff;
          box-shadow: 0 0 0 2px rgba(140, 82, 255, 0.2);
        }

        .color-preview {
          width: 100%;
          height: 40px;
          border-radius: 8px;
          border: 1px solid #444;
          margin-bottom: 16px;
          background: 
            rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a}),
            url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='checker' x='0' y='0' width='10' height='10' patternUnits='userSpaceOnUse'%3e%3crect fill='%23666' x='0' width='5' height='5'/%3e%3crect fill='%23999' x='5' y='5' width='5' height='5'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23checker)'/%3e%3c/svg%3e");
        }

        .presets {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
        }

        .preset {
          width: 100%;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid #444;
          transition: all 0.2s ease;
        }

        .preset:hover {
          transform: scale(1.1);
          border-color: #8c52ff;
          box-shadow: 0 2px 8px rgba(140, 82, 255, 0.3);
        }

        .rgba-display {
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          padding: 8px 12px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #999;
          text-align: center;
          margin-top: 12px;
        }
      `}</style>

      {/* Área principal de color */}
      <div 
        ref={colorAreaRef}
        className="color-area"
      >
        <div className="color-cursor" />
      </div>

      {/* Slider de matiz */}
      <div 
        ref={hueSliderRef}
        className="slider hue-slider"
      >
        <div 
          className="slider-thumb" 
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      {/* Slider de alpha */}
      <div 
        ref={alphaSliderRef}
        className="slider alpha-slider"
      >
        <div 
          className="slider-thumb" 
          style={{ left: `${currentColor.a * 100}%` }}
        />
      </div>

      {/* Controles RGBA */}
      <div className="controls-row">
        {['R', 'G', 'B', 'A'].map((label, i) => (
          <div key={label} className="input-group">
            <label className="input-label">{label}</label>
            <input 
              type="number"
              className="input-field"
              value={i === 3 ? Math.round(currentColor.a * 100) : currentColor[label.toLowerCase()]}
              min="0"
              max={i === 3 ? 100 : 255}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                if (i === 3) {
                  updateColor({ ...currentColor, a: value / 100 });
                } else {
                  const key = ['r', 'g', 'b'][i];
                  updateColor({ ...currentColor, [key]: Math.max(0, Math.min(255, value)) });
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Input hexadecimal */}
      <HexInput 
        currentColor={currentColor}
        updateColor={updateColor}
        hexColor={hexColor}
        setHexColor={setHexColor}
      />

      {/* Vista previa */}
      <div className="color-preview" />

      {/* Colores predefinidos */}
      <div className="presets">
        {presetColors.map((preset, i) => (
          <div
            key={i}
            className="preset"
            style={{ backgroundColor: preset }}
            onClick={() => {
              const r = parseInt(preset.substring(1, 3), 16);
              const g = parseInt(preset.substring(3, 5), 16);
              const b = parseInt(preset.substring(5, 7), 16);
              updateColor({ r, g, b, a: 1 });
            }}
          />
        ))}
      </div>

      {/* Display RGBA */}
      <div className="rgba-display">
        rgba({currentColor.r}, {currentColor.g}, {currentColor.b}, {currentColor.a.toFixed(2)})
      </div>
    </div>
  );
};

export default ToolColorPicker;