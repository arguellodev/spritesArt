import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";
import ToolColorPicker from "./toolColorPicker";

const PolygonTool = ({ setToolParameters, tool, toolParameters, toolConfigs, setToolConfigs }) => {
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
    const polygonConfig = toolConfigs.polygon;
    
    if (polygonConfig !== null) {
      // Cargar configuración guardada
      setBorderWidth(polygonConfig.borderWidth || 1);
      setVertices(polygonConfig.vertices || 5);
      setRotation(polygonConfig.rotation || 0);
     
      
    }
  }, []); // Solo se ejecuta al montar

  // useEffect para guardar cambios en la configuración de la herramienta
  useEffect(() => {
    const currentConfig = {
      borderWidth,
      vertices,
      rotation,
      opacity,
      borderColor,
      fillColor,
      pattern,
      pressure,
      hexFillColor,
      hexBorderColor
    };

    setToolConfigs(prev => ({
      ...prev,
      polygon: currentConfig
    }));
  }, [borderWidth, vertices, rotation, opacity, borderColor, fillColor, pattern, pressure, hexFillColor, hexBorderColor, setToolConfigs]);

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

         {/* Configuración de vértices */}
         <div className="config-item">
            <label className="tool-label">Vertices</label>
            <div className="input-container">
             
              <input 
                type="number" 
                min="3" 
                max="100" 
                value={vertices} 
                onChange={(e) => {
                  const value = e.target.value;
                  
                  // Permitir string vacío temporalmente
                  if (value === '') {
                    setVertices('');
                    return;
                  }
                  
                  const numValue = Number(value);
                  if (!isNaN(numValue)) {
                    setVertices(numValue);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '' || isNaN(Number(value))) {
                    setVertices(5); // Valor por defecto
                    return;
                  }
                  
                  const numValue = Number(value);
                  if (numValue < 3) setVertices(3);
                  if (numValue > 100) setVertices(100);
                }}
                className="number-input" 
              />
              <div className="increment-buttons-container">
              <button 
                type="button"
                onClick={() => {
                  const currentVertices = typeof vertices === 'number' ? vertices : 5;
                  setVertices(Math.min(100, currentVertices + 1));
                }}
                className="increment-btn"
                disabled={(typeof vertices === 'number' ? vertices : 5) >= 100}
              >
               <LuChevronUp />
              </button>
              <button 
                type="button"
                onClick={() => {
                  const currentVertices = typeof vertices === 'number' ? vertices : 5;
                  setVertices(Math.max(3, currentVertices - 1));
                }}
                className="increment-btn"
                disabled={(typeof vertices === 'number' ? vertices : 5) <= 3}
              >
                <LuChevronDown />
              </button>
              </div>
             
            </div>
          </div>

          {/* Configuración de rotación */}
          <div className="config-item">
            <label className="tool-label">Rotation</label>
            <div className="input-container">
              
              <input 
                type="number" 
                min="0" 
                max="360" 
                value={rotation} 
                onChange={(e) => {
                  const value = e.target.value;
                  
                  // Permitir string vacío temporalmente
                  if (value === '') {
                    setRotation('');
                    return;
                  }
                  
                  const numValue = Number(value);
                  if (!isNaN(numValue)) {
                    setRotation(numValue);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '' || isNaN(Number(value))) {
                    setRotation(0); // Valor por defecto
                    return;
                  }
                  
                  const numValue = Number(value);
                  if (numValue < 0) setRotation(0);
                  if (numValue > 360) setRotation(360);
                }}
                className="number-input" 
              />
              <span className="tool-value">°</span>
              <div className="increment-buttons-container">
              <button 
                type="button"
                onClick={() => {
                  const currentRotation = typeof rotation === 'number' ? rotation : 0;
                  setRotation(Math.min(360, currentRotation + 5));
                }}
                className="increment-btn"
                disabled={(typeof rotation === 'number' ? rotation : 0) >= 360}
              >
                <LuChevronUp />
              </button>
              <button 
                type="button"
                onClick={() => {
                  const currentRotation = typeof rotation === 'number' ? rotation : 0;
                  setRotation(Math.max(0, currentRotation - 5));
                }}
                className="increment-btn"
                disabled={(typeof rotation === 'number' ? rotation : 0) <= 0}
              >
                <LuChevronDown />
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vista previa de la herramienta */}
        <div className="tool-preview">
         
          <div className="preview-container">
            <svg width="80" height="80" viewBox="0 0 80 80" className="preview-svg">
              <polygon
                points={Array.from({ length: typeof vertices === 'number' ? vertices : 5 }, (_, i) => {
                  const currentVertices = typeof vertices === 'number' ? vertices : 5;
                  const currentRotation = typeof rotation === 'number' ? rotation : 0;
                  const angle = (i * 2 * Math.PI / currentVertices) + (currentRotation * Math.PI / 180);
                  const x = 40 + 25 * Math.cos(angle);
                  const y = 40 + 25 * Math.sin(angle);
                  return `${x},${y}`;
                }).join(' ')}
                fill={`rgba(
                    ${fillColor.r},
                    ${fillColor.g},
                    ${fillColor.b},
                    ${fillColor.a}
                    )`}
                stroke={`rgba(
                    ${borderColor.r},
                    ${borderColor.g},
                    ${borderColor.b},
                    ${borderColor.a}
                    )`}
                strokeWidth={typeof borderWidth === 'number' ? borderWidth : 3}
                opacity={opacity / 100}
              />
            </svg>
          </div>
        </div>

        {/* Color Pickers */}
        {showBorderColorPicker && (
         <>
           <ToolColorPicker
            color={borderColor}
            onChange={setBorderColor}
            hexColor={hexBorderColor}
            setHexColor={setHexBorderColor}
            />
         </>
        )}

        {showFillColorPicker && (
        <>
        <ToolColorPicker
            color={fillColor}
            onChange={setFillColor}
            hexColor={hexFillColor}
            setHexColor={setFillHexColor}
            />
        </>
        )}
      </div>
    </>
  );
};

export default PolygonTool;