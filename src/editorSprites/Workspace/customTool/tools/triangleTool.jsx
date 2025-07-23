import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";
import ToolColorPicker from "./toolColorPicker";

const TriangleTool = ({ setToolParameters, tool, toolParameters, toolConfigs, setToolConfigs }) => {
  // Estados para las diferentes configuraciones
  const [borderWidth, setBorderWidth] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [borderColor, setBorderColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  const [fillColor, setFillColor] = useState({ r: 255, g: 0, b: 0, a: 1 });
  const [vertices, setVertices] = useState(5);
  const [rotation, setRotation] = useState(0);
  const [pattern, setPattern] = useState("solid");
  const [pressure, setPressure] = useState(50);
  const [hexFillColor, setFillHexColor] = useState('#FF0000');
  const [hexBorderColor, setHexBorderColor] = useState('#FF0000');

  // useEffect para cargar configuración guardada al montar el componente
  useEffect(() => {
    const triangleConfig = toolConfigs.triangle;
    
    if (triangleConfig !== null) {
      // Cargar configuración guardada
      setBorderWidth(triangleConfig.borderWidth || 1);
      
    }
  }, []); // Solo se ejecuta al montar

  // useEffect para guardar cambios en la configuración de la herramienta
  useEffect(() => {
    const currentConfig = {
      borderWidth,
      rotation,
      opacity,
      borderColor,
      fillColor,
      vertices,
      pattern,
      pressure,
      hexFillColor,
      hexBorderColor
    };

    setToolConfigs(prev => ({
      ...prev,
      triangle: currentConfig
    }));
  }, [borderWidth, rotation, opacity, borderColor, fillColor, vertices, pattern, pressure, hexFillColor, hexBorderColor, setToolConfigs]);

  const rgbToHex = ({ r, g, b }) => {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  };
  
  useEffect(() => {
    setHexBorderColor(rgbToHex(borderColor));
    setFillHexColor(rgbToHex(fillColor));
  }, [borderColor, fillColor]);
  
  // Estados para color pickers
  const [showBorderColorPicker, setShowBorderColorPicker] = useState(false);
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);

  // Estados para opciones avanzadas
  const [showAdvanced, setShowAdvanced] = useState(false);

  const patterns = ["solid", "dotted", "dashed", "pixel dust"];

  // Función para convertir hex a rgb
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Función para manejar cambios en el grosor con botones
  const handleBorderWidthChange = (increment) => {
    const currentWidth = typeof borderWidth === 'number' ? borderWidth : 3;
    const newWidth = Math.max(1, Math.min(20, currentWidth + increment));
    setBorderWidth(newWidth);
  };

  // Función para manejar input directo del grosor
  const handleBorderWidthInput = (e) => {
    const value = e.target.value;
    
    // Permitir string vacío temporalmente
    if (value === '') {
      setBorderWidth('');
      return;
    }
    
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setBorderWidth(Math.max(1, Math.min(20, numValue)));
    }
  };

  // Función para manejar cuando se pierde el foco en border width
  const handleBorderWidthBlur = (e) => {
    const value = e.target.value;
    if (value === '' || isNaN(parseInt(value))) {
      setBorderWidth(3); // Valor por defecto
    }
  };

  useEffect(() => {
    // Solo actualizar si todos los valores son números válidos
    if (typeof borderWidth === 'number' && 
        typeof vertices === 'number' && 
        typeof rotation === 'number') {
          setToolParameters(prev => ({
            ...prev,
            borderWidth: borderWidth,
            vertices: vertices,
            rotation: rotation,
            pattern: pattern,
            pressure: pressure
          }));
    }
  }, [borderWidth, opacity, borderColor, fillColor, vertices, rotation, pattern, pressure, setToolParameters]);

  return (
    <>
      <div className="polygon-tool-container">
        <div className="tool-configs">
          {/* Configuración de colores */}
          <div className="color-section">
          </div>

          {/* Configuración de grosor */}
          <div className="config-item">
            <label className="tool-label">Border Width</label>
            <div className="input-container">
             
              <input 
                type="number"
                min="1"
                max="20"
                value={borderWidth}
                onChange={handleBorderWidthInput}
                onBlur={handleBorderWidthBlur}
                className="number-input" 
              />
              <span className="tool-value">px</span>
               <div className="increment-buttons-container">
               <button 
                 className="increment-btn"
                onClick={() => handleBorderWidthChange(1)}
                disabled={(typeof borderWidth === 'number' ? borderWidth : 3) >= 20}
              >
                <LuChevronUp />
              </button>
              <button 
                className="increment-btn"
                onClick={() => handleBorderWidthChange(-1)}
                disabled={(typeof borderWidth === 'number' ? borderWidth : 3) <= 1}
              >
               <LuChevronDown />
              </button>
               </div>
            </div>
          </div>

        
        </div>
      </div>
    </>
  );
};

export default TriangleTool;