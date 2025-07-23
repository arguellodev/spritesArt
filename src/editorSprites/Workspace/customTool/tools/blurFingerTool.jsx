import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

const BlurFingerTool = ({ setToolParameters, tool, toolParameters }) => {
  // Estados para las diferentes configuraciones del BlurFinger
  const [width, setWidth] = useState(5);
  const [blurIntensity, setBlurIntensity] = useState(0.5);
  const [blurRadius, setBlurRadius] = useState(1);
  const [preserveOpacity, setPreserveOpacity] = useState(true);
  const [blurMode, setBlurMode] = useState('gaussian');

  // Función para manejar cambios en el grosor con botones
  const handleWidthChange = (increment) => {
    const currentWidth = typeof width === 'number' ? width : 5;
    const newWidth = Math.max(1, Math.min(20, currentWidth + increment));
    setWidth(newWidth);
  };

  // Función para manejar input directo del grosor
  const handleWidthInput = (e) => {
    const value = e.target.value;
    
    if (value === '') {
      setWidth('');
      return;
    }
    
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setWidth(Math.max(1, Math.min(20, numValue)));
    }
  };

  // Función para manejar cuando se pierde el foco en width
  const handleWidthBlur = (e) => {
    const value = e.target.value;
    if (value === '' || isNaN(parseInt(value))) {
      setWidth(5); // Valor por defecto
    }
  };

  // Función para manejar cambios en la intensidad con botones
  const handleIntensityChange = (increment) => {
    const currentIntensity = typeof blurIntensity === 'number' ? blurIntensity : 0.5;
    const newIntensity = Math.max(0.1, Math.min(1.0, parseFloat((currentIntensity + increment).toFixed(2))));
    setBlurIntensity(newIntensity);
  };

  // Función para manejar input directo de la intensidad
  const handleIntensityInput = (e) => {
    const value = e.target.value;
    
    if (value === '') {
      setBlurIntensity('');
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setBlurIntensity(Math.max(0.1, Math.min(1.0, numValue)));
    }
  };

  // Función para manejar cuando se pierde el foco en intensity
  const handleIntensityBlur = (e) => {
    const value = e.target.value;
    if (value === '' || isNaN(parseFloat(value))) {
      setBlurIntensity(0.5); // Valor por defecto
    }
  };

  // Función para manejar cambios en el radio con botones
  const handleRadiusChange = (increment) => {
    const currentRadius = typeof blurRadius === 'number' ? blurRadius : 1;
    const newRadius = Math.max(1, Math.min(5, currentRadius + increment));
    setBlurRadius(newRadius);
  };

  // Función para manejar input directo del radio
  const handleRadiusInput = (e) => {
    const value = e.target.value;
    
    if (value === '') {
      setBlurRadius('');
      return;
    }
    
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setBlurRadius(Math.max(1, Math.min(5, numValue)));
    }
  };

  // Función para manejar cuando se pierde el foco en radius
  const handleRadiusBlur = (e) => {
    const value = e.target.value;
    if (value === '' || isNaN(parseInt(value))) {
      setBlurRadius(1); // Valor por defecto
    }
  };

  // useEffect para actualizar los parámetros de la herramienta
  useEffect(() => {
    // Solo actualizar si todos los valores son números válidos
    if (typeof width === 'number' && 
        typeof blurIntensity === 'number' && 
        typeof blurRadius === 'number') {
     
      setToolParameters(prev => ({
        ...prev,
        width: width,
        blurIntensity: blurIntensity,
        blurRadius: blurRadius,
        preserveOpacity: preserveOpacity,
        blurMode: blurMode
      }));
    }
  }, [width, blurIntensity, blurRadius, preserveOpacity, blurMode, setToolParameters]);

  return (
    <div className="polygon-tool-container">
      <div className="tool-configs">
        
        {/* Configuración de grosor del pincel */}
        <div className="config-item">
          <label className="tool-label">Brush Size</label>
          <div className="input-container">
            <input 
              type="number"
              min="1"
              max="20"
              value={width}
              onChange={handleWidthInput}
              onBlur={handleWidthBlur}
              className="number-input" 
            />
            <span className="tool-value">px</span>
            <div className="increment-buttons-container">
              <button 
                className="increment-btn"
                onClick={() => handleWidthChange(1)}
                disabled={(typeof width === 'number' ? width : 5) >= 20}
              >
                <LuChevronUp />
              </button>
              <button 
                className="increment-btn"
                onClick={() => handleWidthChange(-1)}
                disabled={(typeof width === 'number' ? width : 5) <= 1}
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        {/* Configuración de intensidad del blur */}
        <div className="config-item">
          <label className="tool-label">Blur Intensity</label>
          <div className="input-container">
            <input 
              type="number" 
              min="0.1" 
              max="1.0" 
              step="0.1"
              value={blurIntensity} 
              onChange={handleIntensityInput}
              onBlur={handleIntensityBlur}
              className="number-input" 
            />
            <span className="tool-value">%</span>
            <div className="increment-buttons-container">
              <button 
                type="button"
                onClick={() => handleIntensityChange(0.1)}
                className="increment-btn"
                disabled={blurIntensity >= 1.0}
              >
                <LuChevronUp />
              </button>
              <button 
                type="button"
                onClick={() => handleIntensityChange(-0.1)}
                className="increment-btn"
                disabled={blurIntensity <= 0.1}
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        {/* Configuración del radio de blur */}
        <div className="config-item">
          <label className="tool-label">Blur Radius</label>
          <div className="input-container">
            <input 
              type="number"
              min="1"
              max="5"
              value={blurRadius}
              onChange={handleRadiusInput}
              onBlur={handleRadiusBlur}
              className="number-input" 
            />
            <span className="tool-value">px</span>
            <div className="increment-buttons-container">
              <button 
                className="increment-btn"
                onClick={() => handleRadiusChange(1)}
                disabled={(typeof blurRadius === 'number' ? blurRadius : 1) >= 5}
              >
                <LuChevronUp />
              </button>
              <button 
                className="increment-btn"
                onClick={() => handleRadiusChange(-1)}
                disabled={(typeof blurRadius === 'number' ? blurRadius : 1) <= 1}
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        {/* Configuración para preservar opacidad */}
        <div className="config-item">
          <label className="tool-label">Preserve Opacity</label>
          <div className="input-container">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={preserveOpacity}
                onChange={(e) => setPreserveOpacity(e.target.checked)}
                className="checkbox-input"
              />
              <span className="checkbox-checkmark"></span>
              <span className="checkbox-label">
                {preserveOpacity ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>
        </div>

        {/* Configuración del modo de blur */}
        <div className="config-item">
          <label className="tool-label">Blur Mode</label>
          <div className="input-container">
            <select
              value={blurMode}
              onChange={(e) => setBlurMode(e.target.value)}
              className="select-input"
            >
              <option value="gaussian">🌀 Gaussian Blur</option>
              <option value="box">⬜ Box Blur</option>
              <option value="motion">➡️ Motion Blur</option>
              <option value="radial">🎯 Radial Blur</option>
            </select>
          </div>
        </div>

     

      </div>
    </div>
  );
};

export default BlurFingerTool;