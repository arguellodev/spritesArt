import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

const SmudgeTool = ({ setToolParameters, tool, toolParameters }) => {
  // Estados para las diferentes configuraciones del Smudge
  const [width, setWidth] = useState(5);
  const [smudgeStrength, setSmudgeStrength] = useState(0.8);
  const [smudgeFlow, setSmudgeFlow] = useState(0.5);
  const [smudgeMode, setSmudgeMode] = useState('normal');

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

  // Función para manejar cambios en la fuerza con botones
  const handleStrengthChange = (increment) => {
    const currentStrength = typeof smudgeStrength === 'number' ? smudgeStrength : 0.8;
    const newStrength = Math.max(0.1, Math.min(1.0, parseFloat((currentStrength + increment).toFixed(2))));
    setSmudgeStrength(newStrength);
  };

  // Función para manejar input directo de la fuerza
  const handleStrengthInput = (e) => {
    const value = e.target.value;
    
    if (value === '') {
      setSmudgeStrength('');
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setSmudgeStrength(Math.max(0.1, Math.min(1.0, numValue)));
    }
  };

  // Función para manejar cuando se pierde el foco en strength
  const handleStrengthBlur = (e) => {
    const value = e.target.value;
    if (value === '' || isNaN(parseFloat(value))) {
      setSmudgeStrength(0.8); // Valor por defecto
    }
  };

  // Función para manejar cambios en el flow con botones
  const handleFlowChange = (increment) => {
    const currentFlow = typeof smudgeFlow === 'number' ? smudgeFlow : 0.5;
    const newFlow = Math.max(0.1, Math.min(1.0, parseFloat((currentFlow + increment).toFixed(2))));
    setSmudgeFlow(newFlow);
  };

  // Función para manejar input directo del flow
  const handleFlowInput = (e) => {
    const value = e.target.value;
    
    if (value === '') {
      setSmudgeFlow('');
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setSmudgeFlow(Math.max(0.1, Math.min(1.0, numValue)));
    }
  };

  // Función para manejar cuando se pierde el foco en flow
  const handleFlowBlur = (e) => {
    const value = e.target.value;
    if (value === '' || isNaN(parseFloat(value))) {
      setSmudgeFlow(0.5); // Valor por defecto
    }
  };

  // useEffect para actualizar los parámetros de la herramienta
  useEffect(() => {
    // Solo actualizar si todos los valores son números válidos
    if (typeof width === 'number' && 
        typeof smudgeStrength === 'number' && 
        typeof smudgeFlow === 'number') {
     
      setToolParameters(prev => ({
        ...prev,
        width: width,
        smudgeStrength: smudgeStrength,
        smudgeFlow: smudgeFlow,
        smudgeMode: smudgeMode,
      }));
    }
  }, [width, smudgeStrength, smudgeFlow, smudgeMode, setToolParameters]);

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

        {/* Configuración de fuerza del smudge */}
        <div className="config-item">
          <label className="tool-label">Smudge Strength</label>
          <div className="input-container">
            <input 
              type="number" 
              min="0.1" 
              max="1.0" 
              step="0.1"
              value={smudgeStrength} 
              onChange={handleStrengthInput}
              onBlur={handleStrengthBlur}
              className="number-input" 
            />
            <span className="tool-value">%</span>
            <div className="increment-buttons-container">
              <button 
                type="button"
                onClick={() => handleStrengthChange(0.1)}
                className="increment-btn"
                disabled={smudgeStrength >= 1.0}
              >
                <LuChevronUp />
              </button>
              <button 
                type="button"
                onClick={() => handleStrengthChange(-0.1)}
                className="increment-btn"
                disabled={smudgeStrength <= 0.1}
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        {/* Configuración del flow del smudge */}
        <div className="config-item">
          <label className="tool-label">Smudge Flow</label>
          <div className="input-container">
            <input 
              type="number" 
              min="0.1" 
              max="1.0" 
              step="0.1"
              value={smudgeFlow} 
              onChange={handleFlowInput}
              onBlur={handleFlowBlur}
              className="number-input" 
            />
            <span className="tool-value">%</span>
            <div className="increment-buttons-container">
              <button 
                type="button"
                onClick={() => handleFlowChange(0.1)}
                className="increment-btn"
                disabled={smudgeFlow >= 1.0}
              >
                <LuChevronUp />
              </button>
              <button 
                type="button"
                onClick={() => handleFlowChange(-0.1)}
                className="increment-btn"
                disabled={smudgeFlow <= 0.1}
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        {/* Configuración del modo de smudge */}
        <div className="config-item">
          <label className="tool-label">Smudge Mode</label>
          <div className="input-container">
            <select
              value={smudgeMode}
              onChange={(e) => setSmudgeMode(e.target.value)}
              className="select-input"
            >
              <option value="normal">🎨 Normal</option>
              <option value="lighten">☀️ Lighten</option>
              <option value="darken">🌙 Darken</option>
              <option value="multiply">✖️ Multiply</option>
              <option value="screen">📺 Screen</option>
              <option value="overlay">🌈 Overlay</option>
            </select>
          </div>
        </div>

        {/* Información de ayuda */}
        <div className="config-item">
          <div className="help-info">
            <p><strong>🎨 Smudge Tips:</strong></p>
            <ul>
              <li><strong>Strength:</strong> Qué tan fuerte arrastra los colores</li>
              <li><strong>Flow:</strong> Qué tanto recoge color nuevo mientras arrastra</li>
              <li><strong>Normal Mode:</strong> Mezcla colores naturalmente</li>
              <li><strong>Low Flow:</strong> Mantiene el color inicial más tiempo</li>
              <li><strong>High Flow:</strong> Cambia rápidamente de color</li>
            </ul>
          </div>
        </div>

        {/* Configuración presets rápidos */}
        <div className="config-item">
          <label className="tool-label">Quick Presets</label>
          <div className="preset-buttons">
            <button 
              className="preset-btn"
              onClick={() => {
                setSmudgeStrength(0.3);
                setSmudgeFlow(0.8);
              }}
              title="Suave y fluido"
            >
              🌊 Soft
            </button>
            <button 
              className="preset-btn"
              onClick={() => {
                setSmudgeStrength(0.8);
                setSmudgeFlow(0.5);
              }}
              title="Configuración estándar"
            >
              🎯 Standard
            </button>
            <button 
              className="preset-btn"
              onClick={() => {
                setSmudgeStrength(1.0);
                setSmudgeFlow(0.2);
              }}
              title="Efecto dramático"
            >
              🔥 Intense
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SmudgeTool;