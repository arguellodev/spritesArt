import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";
import ToolColorPicker from "./toolColorPicker";

// Simulación del ColorPicker component

const FillTool = ({ setToolParameters, tool }) => {
  // Estados para las diferentes configuraciones
  const [borderWidth, setBorderWidth] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [borderColor, setBorderColor] = useState({ r: 255, g: 0, b: 0, a: 1 });
  const [fillColor, setFillColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  const [vertices, setVertices] = useState(5);
  const [rotation, setRotation] = useState(0);
  const [pattern, setPattern] = useState("solid");
  const [pressure, setPressure] = useState(50);
  const [hexFillColor, setFillHexColor] = useState('#FF0000');
  const [hexBorderColor, setHexBorderColor] = useState('#FF0000');
  const [sharpen, setSharpen] = useState(0);
  const [paintMode, setPaintMode] = useState('hybrid');
  const [velocitySensibility, setVelocitySensibility] = useState(0)

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
  }, [borderWidth, opacity, borderColor, fillColor, vertices, rotation, pattern, pressure, setToolParameters,sharpen, paintMode, velocitySensibility]);

  return (
    <>
      <div className="polygon-tool-container">
        <div className="tool-configs">
          {/* Configuración de colores */}
          <div className="color-section">
           
            
            {/* Color de borde */}
            <div className="config-item color-config">
              <label className="tool-label">Border Color</label>
              <div className="color-input-container">
                <div 
                  className={`color-button ${showBorderColorPicker ? 'active' : ''}`}
                  style={{ backgroundColor: `
                    rgba(${borderColor.r}, 
                    ${borderColor.g}, 
                    ${borderColor.b}, 
                    ${borderColor.a})` }}

                  onClick={() => {
                    setShowBorderColorPicker(!showBorderColorPicker);
                    setShowFillColorPicker(false);
                  }}
                >
                  {showBorderColorPicker && <div className="color-arrow"></div>}
                </div>
                <span className="color-value">{hexBorderColor}</span>
              </div>
            </div>

            {/* Color de relleno */}
            <div className="config-item color-config">
              <label className="tool-label">Fill Color</label>
              <div className="color-input-container">
                <div 
                  className={`color-button ${showFillColorPicker ? 'active' : ''}`}
                  style={{ backgroundColor: `
                    rgba(${fillColor.r}, 
                    ${fillColor.g}, 
                    ${fillColor.b}, 
                    ${fillColor.a})` }}
                  onClick={() => {
                    setShowFillColorPicker(!showFillColorPicker);
                    setShowBorderColorPicker(false);
                  }}
                >
                  {showFillColorPicker && <div className="color-arrow"></div>}
                </div>
                <span className="color-value">{hexFillColor}</span>
              </div>
            </div>
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

        {/* Configuración de Sharpen */}
<div className="config-item">
  <label className="tool-label">Sharpen</label>
  <div className="input-container">
    <input 
      type="number" 
      min="0" 
      max="1" 
      step="0.1"
      value={sharpen} 
      onChange={(e) => {
        const value = e.target.value;
        if (value === '') {
          setSharpen('');
          return;
        }
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          setSharpen(numValue);
        }
      }}
      onBlur={(e) => {
        const value = e.target.value;
        if (value === '' || isNaN(Number(value))) {
          setSharpen(1); // Valor por defecto
          return;
        }

        const numValue = Number(value);
        if (numValue < 0) setSharpen(0);
        else if (numValue > 1) setSharpen(1);
      }}
      className="number-input" 
    />
    <div className="increment-buttons-container">
      <button 
        type="button"
        onClick={() => {
          const currentSharpen = typeof sharpen === 'number' ? sharpen : 1;
          setSharpen(Math.min(1, parseFloat((currentSharpen + 0.1).toFixed(2))));
        }}
        className="increment-btn"
        disabled={sharpen >= 1}
      >
        <LuChevronUp />
      </button>
      <button 
        type="button"
        onClick={() => {
          const currentSharpen = typeof sharpen === 'number' ? sharpen : 1;
          setSharpen(Math.max(0, parseFloat((currentSharpen - 0.1).toFixed(2))));
        }}
        className="increment-btn"
        disabled={sharpen <= 0}
      >
        <LuChevronDown />
      </button>
    </div>
  </div>
</div>

          {/* Configuración de rotación */}
          <div className="config-item">
  <label className="tool-label">Paint Mode</label>
  <div className="input-container">
    <select
      value={paintMode}
      onChange={(e) => setPaintMode(e.target.value)}
      className="select-input"
    >
      <option value="manual">Manual</option>
      <option value="composite">Composite</option>
      <option value="hybrid">Hybrid</option>
    </select>
  </div>
</div>

{/*COnfiguracion de velcoidad */}

<div className="config-item">
  <label className="tool-label">Velocity Sensibility</label>
  <div className="horizontal-slider-container">
    <div className="slider-track-horizontal">
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={velocitySensibility}
        onChange={(e) => setVelocitySensibility(parseInt(e.target.value))}
        className="horizontal-slider"
      />
      <div className="slider-marks-horizontal">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            className={`slider-mark-horizontal ${velocitySensibility === i ? 'active' : ''}`}
            style={{ left: `${(i / 10) * 100}%` }}
          >
            <span className="mark-value-horizontal">{i}</span>
          </div>
        ))}
      </div>
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

        {/* Vista previa de la herramienta */}
        <div className="tool-preview">
          <div className="preview-label">Preview</div>
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

export default FillTool;