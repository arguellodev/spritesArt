// ColorPicker.jsx
import { useState, useEffect, useRef } from 'react';
import './ColorPicker.css';

const ColorPicker = ({ initialColor = '#000000', onChange }) => {
  // Color states in different formats
  const [colorHex, setColorHex] = useState(initialColor);
  const [colorRgba, setColorRgba] = useState({ r: 0, g: 0, b: 0, a: 255 });
  const [colorHsl, setColorHsl] = useState({ h: 0, s: 0, l: 0, a: 1 });
  const [recentColors, setRecentColors] = useState(['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff']);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const canvasRef = useRef(null);
  
  // Convert hex to rgba
  const hexToRgba = (hex) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b, a: colorRgba.a };
  };
  
  // Convert rgba to hex
  const rgbaToHex = ({ r, g, b }) => {
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  };
  
  // Convert rgba to rgba string
  const rgbaToString = ({ r, g, b, a }) => {
    const alphaValue = a / 255;
    return `rgba(${r}, ${g}, ${b}, ${alphaValue.toFixed(2)})`;
  };
  
  // Convert rgb to hsl
  const rgbToHsl = ({ r, g, b, a }) => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }
    
    return { 
      h: Math.round(h * 360), 
      s: Math.round(s * 100), 
      l: Math.round(l * 100), 
      a: a / 255 
    };
  };
  
  // Convert hsl to rgb
  const hslToRgb = ({ h, s, l, a }) => {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
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
      a: Math.round(a * 255) 
    };
  };
  
  // HSL to string
  const hslToString = ({ h, s, l, a }) => {
    return `hsla(${h}, ${s}%, ${l}%, ${a.toFixed(2)})`;
  };
  
  // Update all color formats based on hex
  useEffect(() => {
    const rgba = hexToRgba(colorHex);
    setColorRgba(rgba);
    setColorHsl(rgbToHsl(rgba));
    
    if (onChange) {
      onChange(rgba);
    }
  }, [colorHex]);
  
  // Handle color change from hex input
  const handleHexChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith('#')) value = '#' + value;
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setColorHex(value);
      addToRecentColors(value);
    }
  };
  
  // Handle RGBA changes
  const handleRgbaChange = (component, value) => {
    const newRgba = { ...colorRgba, [component]: parseInt(value, 10) };
    setColorRgba(newRgba);
    setColorHex(rgbaToHex(newRgba));
    setColorHsl(rgbToHsl(newRgba));
    addToRecentColors(rgbaToHex(newRgba));
  };
  
  // Handle HSL changes
  const handleHslChange = (component, value) => {
    const newHsl = { ...colorHsl, [component]: parseInt(value, 10) };
    setColorHsl(newHsl);
    const newRgba = hslToRgb(newHsl);
    setColorRgba(newRgba);
    setColorHex(rgbaToHex(newRgba));
    addToRecentColors(rgbaToHex(newRgba));
  };
  
  // Handle alpha change
  const handleAlphaChange = (value) => {
    const alphaValue = Math.round(value * 2.55);
    handleRgbaChange('a', alphaValue);
    setColorHsl(prev => ({ ...prev, a: value / 100 }));
  };
  
  // Add to recent colors
  const addToRecentColors = (color) => {
    if (!recentColors.includes(color)) {
      setRecentColors(prev => [color, ...prev.slice(0, 4)]);
    }
  };
  
  // Handle color dropper
  const activateColorDropper = () => {
    setIsPickerActive(true);
    
    // Create a full screen canvas for the color dropper
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    
    // Take screenshot of the current page
    html2canvas(document.body).then(screenshot => {
      ctx.drawImage(screenshot, 0, 0);
      
      // Add event listeners for mouse movement and clicks
      canvas.style.display = 'block';
      
      const handleMouseMove = (e) => {
        const x = e.clientX;
        const y = e.clientY;
        
        // Draw magnifier
        ctx.drawImage(screenshot, 0, 0);
        
        // Get pixel color under cursor
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        
        // Show magnifier
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Show color preview
        ctx.beginPath();
        ctx.arc(x + 30, y - 30, 15);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
        ctx.stroke();
      };
      
      const handleClick = (e) => {
        const x = e.clientX;
        const y = e.clientY;
        
        // Get pixel color
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const color = `#${[pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('')}`;
        
        // Update color
        setColorHex(color);
        addToRecentColors(color);
        
        // Cleanup
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
        canvas.style.display = 'none';
        setIsPickerActive(false);
      };
      
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleClick);
    });
  };
  
  // Mock html2canvas function (would need the actual library in production)
  const html2canvas = (element) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      resolve(canvas);
    });
  };
  
  // Close picker on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPickerActive) {
        canvasRef.current.style.display = 'none';
        setIsPickerActive(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPickerActive]);

  return (
    <div className="color-picker-container">
      <div className="color-picker-content">
        {/* Preview section */}
        <div className="color-preview-section">
          <div 
            className="preview-box"
            style={{ backgroundColor: rgbaToString(colorRgba) }}
          ></div>
          
          <div className="preview-info">
            <h3>Color Selector</h3>
            <p>Selector de color avanzado</p>
          </div>
        </div>
        
        {/* Color format display */}
        <div className="formats-container">
          {/* HEX */}
          <div className="format-item">
            <label>HEX</label>
            <input 
              type="text" 
              value={colorHex}
              onChange={handleHexChange}
              className="format-input"
            />
          </div>
          
          {/* RGBA */}
          <div className="format-item">
            <label>RGBA</label>
            <input 
              type="text" 
              value={rgbaToString(colorRgba)}
              readOnly
              className="format-input"
            />
          </div>
          
          {/* HSL */}
          <div className="format-item">
            <label>HSL</label>
            <input 
              type="text" 
              value={hslToString(colorHsl)}
              readOnly
              className="format-input"
            />
          </div>
        </div>
        
        {/* RGB sliders */}
        <div className="rgb-sliders">
          <h4>RGB Values</h4>
          <div className="slider-grid">
            <div className="slider-item">
              <label>R</label>
              <input
                type="range"
                min="0"
                max="255"
                value={colorRgba.r}
                onChange={(e) => handleRgbaChange('r', e.target.value)}
                className="slider red-slider"
              />
              <div className="slider-value">{colorRgba.r}</div>
            </div>
            <div className="slider-item">
              <label>G</label>
              <input
                type="range"
                min="0"
                max="255"
                value={colorRgba.g}
                onChange={(e) => handleRgbaChange('g', e.target.value)}
                className="slider green-slider"
              />
              <div className="slider-value">{colorRgba.g}</div>
            </div>
            <div className="slider-item">
              <label>B</label>
              <input
                type="range"
                min="0"
                max="255"
                value={colorRgba.b}
                onChange={(e) => handleRgbaChange('b', e.target.value)}
                className="slider blue-slider"
              />
              <div className="slider-value">{colorRgba.b}</div>
            </div>
          </div>
        </div>
        
        {/* HSL sliders */}
        <div className="hsl-sliders">
          <h4>HSL Values</h4>
          <div className="slider-grid">
            <div className="slider-item">
              <label>H</label>
              <input
                type="range"
                min="0"
                max="360"
                value={colorHsl.h}
                onChange={(e) => handleHslChange('h', e.target.value)}
                className="slider hue-slider"
              />
              <div className="slider-value">{colorHsl.h}°</div>
            </div>
            <div className="slider-item">
              <label>S</label>
              <input
                type="range"
                min="0"
                max="100"
                value={colorHsl.s}
                onChange={(e) => handleHslChange('s', e.target.value)}
                className="slider saturation-slider"
              />
              <div className="slider-value">{colorHsl.s}%</div>
            </div>
            <div className="slider-item">
              <label>L</label>
              <input
                type="range"
                min="0"
                max="100"
                value={colorHsl.l}
                onChange={(e) => handleHslChange('l', e.target.value)}
                className="slider lightness-slider"
              />
              <div className="slider-value">{colorHsl.l}%</div>
            </div>
          </div>
        </div>
        
        {/* Alpha slider */}
        <div className="alpha-slider-container">
          <h4>Opacity</h4>
          <div className="alpha-slider-wrapper">
            <div className="checker-background"></div>
            <div 
              className="alpha-gradient" 
              style={{
                background: `linear-gradient(to right, rgba(${colorRgba.r}, ${colorRgba.g}, ${colorRgba.b}, 0), rgba(${colorRgba.r}, ${colorRgba.g}, ${colorRgba.b}, 1))`
              }}
            ></div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(colorRgba.a / 2.55)}
              onChange={(e) => handleAlphaChange(Number(e.target.value))}
              className="slider alpha-slider"
            />
          </div>
          <div className="alpha-labels">
            <span>0%</span>
            <span>{Math.round(colorRgba.a / 2.55)}%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Color palette */}
        <div className="color-palette">
          <h4>Color palette</h4>
          <div className="palette-grid">
            {['#ff0000', '#ff8000', '#ffff00', '#80ff00', 
              '#00ff00', '#00ff80', '#00ffff', '#0080ff',
              '#0000ff', '#8000ff', '#ff00ff', '#ff0080',
              '#000000', '#444444', '#888888', '#cccccc'
            ].map(color => (
              <button
                key={color}
                className="color-swatch"
                style={{ backgroundColor: color }}
                onClick={() => {
                  setColorHex(color);
                  addToRecentColors(color);
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Recent colors */}
        <div className="recent-colors">
          <h4>Colores recientes</h4>
          <div className="recent-colors-grid">
            {recentColors.map((color, index) => (
              <button
                key={index}
                className="color-swatch"
                style={{ backgroundColor: color }}
                onClick={() => setColorHex(color)}
              />
            ))}
          </div>
        </div>
        
        {/* Tools */}
        <div className="color-tools">
          <button
            onClick={activateColorDropper}
            className="tool-button dropper-button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 14V8L14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="14" r="4" fill="currentColor"/>
            </svg>
            <span>Gotero</span>
          </button>
          
          <button
            className="tool-button copy-button"
            onClick={() => {
              const text = `HEX: ${colorHex}\nRGBA: ${rgbaToString(colorRgba)}\nHSL: ${hslToString(colorHsl)}`;
              navigator.clipboard.writeText(text);
            }}
          >
            Copiar todos los formatos
          </button>
        </div>
      </div>
      
      {/* Canvas for color picker */}
      <canvas 
        ref={canvasRef}
        className="color-dropper-canvas"
        style={{ display: 'none' }}
      />
    </div>
  );
};

// Example usage
export default function EnhancedColorPicker() {
  const [currentColor, setCurrentColor] = useState({ r: 41, g: 121, b: 255, a: 255 });
  
  return (
    <div className="app-container">
      <ColorPicker 
        initialColor="#2979ff" 
        onChange={(color) => setCurrentColor(color)} 
      />
      
      <div className="color-preview-panel">
        <h3>Color seleccionado</h3>
        <div 
          className="selected-color-box"
          style={{ 
            backgroundColor: `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a/255})` 
          }}
        ></div>
      </div>
    </div>
  );
}