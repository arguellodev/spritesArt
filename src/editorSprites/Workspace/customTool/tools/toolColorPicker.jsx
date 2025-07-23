import React, { useState, useRef, useCallback, useEffect } from 'react';
import HexInput from './hexInput';
import './toolColorPicker.css'
import { usePointer } from '../../hooks/hooks';
import { LuX } from "react-icons/lu";

const ToolColorPicker = ({ color = { r: 255, g: 0, b: 0, a: 1 }, onChange, hexColor, setHexColor, closeFn }) => {
  const [currentColor, setCurrentColor] = useState(color);
  
  const colorAreaRef = useRef(null);
  const hueSliderRef = useRef(null);
  const alphaSliderRef = useRef(null);
  
  // Implementar usePointer para cada área
  const colorAreaPointer = usePointer(colorAreaRef, colorAreaRef);
  const hueSliderPointer = usePointer(hueSliderRef, hueSliderRef);
  const alphaSliderPointer = usePointer(alphaSliderRef, alphaSliderRef);

  // FIX: Sincronizar estado interno cuando cambia la prop color
  useEffect(() => {
    // Solo actualizar si realmente cambió el color para evitar loops infinitos
    if (
      color.r !== currentColor.r ||
      color.g !== currentColor.g ||
      color.b !== currentColor.b ||
      color.a !== currentColor.a
    ) {
      console.log('ToolColorPicker: Actualizando color interno desde prop:', color);
      setCurrentColor(color);
    }
  }, [color, currentColor]);

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
    console.log('ToolColorPicker: Actualizando color:', newColor);
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
      <button 
      onClick={closeFn}
      className='close-colorpicker-button'>
      <LuX />
      </button>
      <style jsx>{`
       

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

       

        .alpha-slider {
        height: 18px;
          background: 
            linear-gradient(to right, 
              rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0),
              rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 1)
            ),
            url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='checker' x='0' y='0' width='10' height='10' patternUnits='userSpaceOnUse'%3e%3crect fill='%23ccc' x='0' width='5' height='5'/%3e%3crect fill='%23ccc' x='5' y='5' width='5' height='5'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23checker)'/%3e%3c/svg%3e");
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

     
    </div>
  );
};

export default ToolColorPicker;