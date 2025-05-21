import { useState, useRef, useEffect } from 'react';
import { LuChevronDown, LuPipette, LuHistory, LuPlus } from "react-icons/lu";
import './colorSelector.css';
// Componente principal ColorSelector
export default function ColorSelector({selectedColor,setSelectedColor}) {
  const [activeTab, setActiveTab] = useState('swatches');

  const [recentColors, setRecentColors] = useState(['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3']);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const pickerRef = useRef(null);
  
  // Convertir HSL a Hex
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c/2;
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`.toUpperCase();
  };

  // Actualizar color seleccionado cuando cambian los valores HSL
  useEffect(() => {
    const hexColor = hslToHex(hue, saturation, lightness);
    setSelectedColor(hexColor);
  }, [hue, saturation, lightness]);

  // Cerrar el picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsPickerOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Manejar selección de color
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    
    // Agregar a colores recientes si no está ya
    if (!recentColors.includes(color)) {
      setRecentColors(prev => [color, ...prev.slice(0, 4)]);
    }
  };

  // Conjunto de colores predefinidos
  const swatchColors = [
    ['#FF0000', '#FF4500', '#FFA500', '#FFD700', '#FFFF00', '#ADFF2F'],
    ['#00FF00', '#00FA9A', '#00FFFF', '#1E90FF', '#0000FF', '#8A2BE2'],
    ['#FF00FF', '#C71585', '#FF1493', '#FF69B4', '#FFC0CB', '#FFFFFF'],
    ['#F5F5F5', '#D3D3D3', '#A9A9A9', '#696969', '#2F4F4F', '#000000']
  ];

  return (
    <div className="color-selector">
      <div className="color-header">
        <div className="color-preview" style={{ backgroundColor: selectedColor }}></div>
        <div className="color-info">
          <div className="color-value">{selectedColor}</div>
          <button 
            className="color-picker-toggle"
            onClick={() => setIsPickerOpen(!isPickerOpen)}
          >
            <LuChevronDown size={16} />
          </button>
        </div>
      </div>
      
      {isPickerOpen && (
        <div className="color-picker-dropdown" ref={pickerRef}>
          <div className="picker-tabs">
            <button 
              className={`tab-button ${activeTab === 'swatches' ? 'active' : ''}`}
              onClick={() => setActiveTab('swatches')}
            >
              Muestras
            </button>
            <button 
              className={`tab-button ${activeTab === 'slider' ? 'active' : ''}`}
              onClick={() => setActiveTab('slider')}
            >
              Sliders
            </button>
            <button 
              className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              Recientes
            </button>
          </div>
          
          <div className="picker-content">
            {activeTab === 'swatches' && (
              <div className="swatches-tab">
                <div className="swatches-grid">
                  {swatchColors.map((row, rowIndex) => (
                    <div key={rowIndex} className="swatch-row">
                      {row.map((color, colIndex) => (
                        <button
                          key={`${rowIndex}-${colIndex}`}
                          className={`swatch-button ${selectedColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorSelect(color)}
                          aria-label={`Color ${color}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'slider' && (
              <div className="slider-tab">
                <div className="slider-control">
                  <label>Matiz</label>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={hue}
                    onChange={(e) => setHue(parseInt(e.target.value))}
                    className="hue-slider"
                    style={{
                      background: `linear-gradient(to right, 
                        #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)`
                    }}
                  />
                  <span>{hue}°</span>
                </div>
                
                <div className="slider-control">
                  <label>Saturación</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="saturation-slider"
                    style={{
                      background: `linear-gradient(to right, 
                        ${hslToHex(hue, 0, lightness)}, ${hslToHex(hue, 100, lightness)})`
                    }}
                  />
                  <span>{saturation}%</span>
                </div>
                
                <div className="slider-control">
                  <label>Luminosidad</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lightness}
                    onChange={(e) => setLightness(parseInt(e.target.value))}
                    className="lightness-slider"
                    style={{
                      background: `linear-gradient(to right, 
                        ${hslToHex(hue, saturation, 0)}, 
                        ${hslToHex(hue, saturation, 50)}, 
                        ${hslToHex(hue, saturation, 100)})`
                    }}
                  />
                  <span>{lightness}%</span>
                </div>
                
                <div className="color-result">
                  <div 
                    className="result-preview" 
                    style={{ backgroundColor: selectedColor }}
                  ></div>
                  <div className="result-value">{selectedColor}</div>
                </div>
              </div>
            )}
            
            {activeTab === 'recent' && (
              <div className="recent-tab">
                <div className="recent-colors">
                  {recentColors.map((color, index) => (
                    <button
                      key={index}
                      className={`recent-color-button ${selectedColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(color)}
                      aria-label={`Color reciente ${color}`}
                    >
                      <span className="color-tooltip">{color}</span>
                    </button>
                  ))}
                  <button className="add-color-button">
                    <LuPlus size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="picker-tools">
            <button className="tool-button">
              <LuPipette size={16} />
              <span>Cuentagotas</span>
            </button>
            <button className="tool-button">
              <LuHistory size={16} />
              <span>Historial</span>
            </button>
          </div>
        </div>
      )}
      
    
    </div>
  );
}