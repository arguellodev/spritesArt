import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";
import ToolColorPicker from "./toolColorPicker";

const SquareTool = ({ setToolParameters, tool, toolParameters, toolConfigs, setToolConfigs }) => {
  // Estados para las diferentes configuraciones
  const [borderWidth, setBorderWidth] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [borderColor, setBorderColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  const [fillColor, setFillColor] = useState({ r: 255, g: 0, b: 0, a: 1 });
  const [borderRadius, setborderRadius] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [pattern, setPattern] = useState("solid");
  const [pressure, setPressure] = useState(50);
  const [hexFillColor, setFillHexColor] = useState('#FF0000');
  const [hexBorderColor, setHexBorderColor] = useState('#FF0000');

  // useEffect para cargar configuración guardada al montar el componente
  useEffect(() => {
    const squareConfig = toolConfigs.square;
    
    if (squareConfig !== null) {
      // Cargar configuración guardada
      setBorderWidth(squareConfig.borderWidth || 1);
      setborderRadius(squareConfig.borderRadius || 0);
     
    }
  }, []); // Solo se ejecuta al montar

  // useEffect para guardar cambios en la configuración de la herramienta
  useEffect(() => {
    const currentConfig = {
      borderWidth,
      borderRadius,
      opacity,
      borderColor,
      fillColor,
      rotation,
      pattern,
      pressure,
      hexFillColor,
      hexBorderColor
    };

    setToolConfigs(prev => ({
      ...prev,
      square: currentConfig
    }));
  }, [borderWidth, borderRadius, opacity, borderColor, fillColor, rotation, pattern, pressure, hexFillColor, hexBorderColor, setToolConfigs]);

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
        typeof borderRadius === 'number' && 
        typeof rotation === 'number') {
    
      setToolParameters(prev => ({
        ...prev,
        borderWidth: borderWidth,
        borderRadius: borderRadius,
        rotation: rotation,
        pattern: pattern,
        pressure: pressure
      }));

    }
  }, [borderWidth, opacity, borderColor, fillColor, borderRadius, rotation, pattern, pressure, setToolParameters]);

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

         {/* Configuración de vértices */}
         <div className="config-item">
            <label className="tool-label">Border Radius</label>
            <div className="input-container">
             
              <input 
                type="number" 
                min="0" 
                max="12" 
                value={borderRadius} 
                onChange={(e) => {
                  const value = e.target.value;
                  
                  // Permitir string vacío temporalmente
                  if (value === '') {
                    setborderRadius('');
                    return;
                  }
                  
                  const numValue = Number(value);
                  if (!isNaN(numValue)) {
                    setborderRadius(numValue);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '' || isNaN(Number(value))) {
                    setborderRadius(5); // Valor por defecto
                    return;
                  }
                  
                  const numValue = Number(value);
                  if (numValue < 0) setborderRadius(1);
                  if (numValue > 12) setborderRadius(12);
                }}
                className="number-input" 
              />
              <span className="tool-value">px</span>
              <div className="increment-buttons-container">
              <button 
                type="button"
                onClick={() => {
                  const currentborderRadius = typeof borderRadius === 'number' ? borderRadius : 5;
                  setborderRadius(Math.min(12, currentborderRadius + 1));
                }}
                className="increment-btn"
                disabled={(typeof borderRadius === 'number' ? borderRadius : 5) >= 12}
              >
               <LuChevronUp />
              </button>
              <button 
                type="button"
                onClick={() => {
                  const currentborderRadius = typeof borderRadius === 'number' ? borderRadius : 5;
                  setborderRadius(Math.max(0, currentborderRadius - 1));
                }}
                className="increment-btn"
                disabled={(typeof borderRadius === 'number' ? borderRadius : 5) <= 0}
              >
                <LuChevronDown />
              </button>
              </div>
             
            </div>
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

export default SquareTool;