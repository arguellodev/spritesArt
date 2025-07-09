import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";
import ToolColorPicker from "./toolColorPicker";

// Simulación del ColorPicker component

const EllipseTool = ({ setToolParameters, tool }) => {
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

          {/* Configuración de opacidad 
          <div className="config-item">
            <label className="tool-label">Opacity</label>
            <div className="slider-container">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={opacity} 
                onChange={(e) => setOpacity(Number(e.target.value))} 
                className="slider" 
              />
              <span className="tool-value">{opacity}%</span>
            </div>
          </div>
*/}
          {/* Selector de patrón 
          <div className="config-item">
            <label className="tool-label">Pattern</label>
            <select 
              value={pattern} 
              onChange={(e) => setPattern(e.target.value)}
              className="pattern-selector"
            >
              {patterns.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>*/}

          {/* Botón para mostrar/ocultar opciones avanzadas 
          <button 
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </button>*/}

          {/* Opciones avanzadas */}
         {/* showAdvanced && (
            <div className="advanced-options">
              <div className="config-item">
                <label className="tool-label">Pressure Sensitivity</label>
                <div className="slider-container">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={pressure} 
                    onChange={(e) => setPressure(Number(e.target.value))} 
                    className="slider" 
                  />
                  <span className="tool-value">{pressure}%</span>
                </div>
              </div>

              <div className="config-item">
                <label className="tool-label">Keyboard Shortcut</label>
                <div className="shortcut-display">
                  <span className="key">P</span>
                  <button className="edit-shortcut">Edit</button>
                </div>
              </div>

              <div className="config-item">
                <label className="tool-label">Anti-aliasing</label>
                <div className="toggle-switch">
                  <input type="checkbox" id="antialiasing" className="toggle-input" />
                  <label htmlFor="antialiasing" className="toggle-label"></label>
                </div>
              </div>

              <div className="config-item">
                <label className="tool-label">Pixel Perfect</label>
                <div className="toggle-switch">
                  <input type="checkbox" id="pixelperfect" className="toggle-input" defaultChecked />
                  <label htmlFor="pixelperfect" className="toggle-label"></label>
                </div>
              </div>
            </div>
          )*/}

          
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

export default EllipseTool;