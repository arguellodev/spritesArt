import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

const FillTool = ({ setToolParameters, tool, toolParameters = {} }) => {
  // Estados para las diferentes configuraciones básicas
  const [borderWidth, setBorderWidth] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [vertices, setVertices] = useState(5);
  const [rotation, setRotation] = useState(0);
  const [pattern, setPattern] = useState("solid");
  const [pressure, setPressure] = useState(50);
  const [sharpen, setSharpen] = useState(0);
  const [paintMode, setPaintMode] = useState('hybrid');
  const [velocitySensibility, setVelocitySensibility] = useState(0);

  // Estados para gradiente - configuraciones completas
  const [isGradientMode, setIsGradientMode] = useState(false);
  const [gradientStops, setGradientStops] = useState([]);
 
  
  // Estados para dithering - manteniendo nombres originales + nuevos
  const [isDitheringEnabled, setIsDitheringEnabled] = useState(false);
  const [ditheringType, setDitheringType] = useState('noise');
  const [ditheringStrength, setDitheringStrength] = useState(0.5);

  const patterns = ["solid", "dotted", "dashed", "pixel dust"];
  
  // Tipo de dithering: 'noise', 'ordered', 'checkerboard', 'horizontal', 'vertical', 'diagonal', 'random', 'halftone_radial'
  // Tipos de dithering - manteniendo los originales que funcionaban
  const ditheringTypes = [
    "noise",
    "ordered", 
    "checkerboard",
    "hotizontal",
    "vertical",
    "horizontal",
    "diagonal",
    "random",
    "halftone_radial",
    'orderedThreshold',
    'orderedColor'
  ];

  // Sincronizar con toolParameters recibidos
  useEffect(() => {
    // Configuraciones básicas de gradiente
    if (toolParameters.isGradientMode !== undefined) {
      setIsGradientMode(toolParameters.isGradientMode);
    }
    if (toolParameters.gradientStops !== undefined) {
      setGradientStops(toolParameters.gradientStops);
    }
 
 
    
    // Configuraciones de dithering
    if (toolParameters.isDitheringEnabled !== undefined) {
      setIsDitheringEnabled(toolParameters.isDitheringEnabled);
    }
    if (toolParameters.ditheringType !== undefined) {
      setDitheringType(toolParameters.ditheringType);
    }
    if (toolParameters.ditheringStrength !== undefined) {
      setDitheringStrength(toolParameters.ditheringStrength);
    }
  }, [toolParameters]);

  // Función para manejar cambios en el grosor con botones
  const handleBorderWidthChange = (increment) => {
    const currentWidth = typeof borderWidth === 'number' ? borderWidth : 3;
    const newWidth = Math.max(1, Math.min(20, currentWidth + increment));
    setBorderWidth(newWidth);
  };

  // Función para manejar input directo del grosor
  const handleBorderWidthInput = (e) => {
    const value = e.target.value;
    
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
      setBorderWidth(3);
    }
  };

  // Función para formatear el nombre del tipo de dithering
  const formatDitheringTypeName = (type) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  useEffect(() => {
    // Actualizar parámetros incluyendo configuraciones de gradiente
    if (typeof borderWidth === 'number' && 
        typeof vertices === 'number' && 
        typeof rotation === 'number') {
          setToolParameters(prev => ({
            ...prev,
            borderWidth: borderWidth,
            vertices: vertices,
            rotation: rotation,
            pattern: pattern,
            pressure: pressure,
            sharpen: sharpen,
            paintMode: paintMode,
            velocitySensibility: velocitySensibility,
            // Parámetros de gradiente
            isGradientMode: isGradientMode,
       
            dithering: isDitheringEnabled,
            ditheringType: ditheringType,
            ditheringStrength:  ditheringStrength
          }));
      
    }
  }, [borderWidth, opacity, vertices, rotation, pattern, pressure, 
      sharpen, paintMode, velocitySensibility,
      isGradientMode,
      isDitheringEnabled, ditheringType, ditheringStrength, setToolParameters]);

  return (
    <>
      <div className="polygon-tool-container">
        <div className="tool-configs">
          
          {/* Toggle para modo gradiente - solo visible si la herramienta es fill */}
          {true && (
            <div className="config-item">
              <label className="tool-label">Gradient</label>
              <div className="toggle-switch">
                <input 
                  type="checkbox" 
                  id="gradientMode" 
                  className="toggle-input"
                  checked={isGradientMode}
                  onChange={(e) => setIsGradientMode(e.target.checked)}
                />
                <label htmlFor="gradientMode" className="toggle-label"></label>
              </div>
            </div>
          )}

          {/* Controles de gradiente - solo cuando está activado */}
          {isGradientMode && (
            <>
             

              {/* Toggle para dithering */}
              <div className="config-item">
                <label className="tool-label">Dithering</label>
                <div className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="ditheringEnabled" 
                    className="toggle-input"
                    checked={isDitheringEnabled}
                    onChange={(e) => setIsDitheringEnabled(e.target.checked)}
                  />
                  <label htmlFor="ditheringEnabled" className="toggle-label"></label>
                </div>
              </div>

              {/* Controles de dithering - solo cuando está activado */}
              {isDitheringEnabled && (
                <>
                  {/* Selector de tipo de dithering */}
                  <div className="config-item">
                    <label className="tool-label">Dithering Type</label>
                    <select 
                      value={ditheringType} 
                      onChange={(e) => setDitheringType(e.target.value)}
                      className="dithering-type-selector"
                    >
                      {ditheringTypes.map((type) => (
                        <option key={type} value={type}>
                          {formatDitheringTypeName(type)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Control de intensidad del dithering */}
                  <div className="config-item">
                    <label className="tool-label">Dithering Strength</label>
                    <div className="horizontal-slider-container">
                      <div className="slider-track-horizontal">
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1"
                          value={ditheringStrength} 
                          onChange={(e) => setDitheringStrength(Number(e.target.value))} 
                          className="horizontal-slider" 
                        />
                      </div>
                      <span className="current-value-horizontal">{ditheringStrength.toFixed(1)}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
};

export default FillTool;