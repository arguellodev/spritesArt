import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

import BrushSelect from "./brushSelect";

const DarkTool = ({ setToolParameters, tool, toolParameters, toolConfigs, setToolConfigs }) => {
  // Estados para las diferentes configuraciones
  const [borderWidth, setBorderWidth] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [vertices, setVertices] = useState(5);
  const [rotation, setRotation] = useState(0);
  const [pattern, setPattern] = useState("solid");
  const [pressure, setPressure] = useState(50);
  const [sharpen, setSharpen] = useState(0);
  const [paintMode, setPaintMode] = useState('manual');
  const [velocitySensibility, setVelocitySensibility] = useState(0);
  const [patternAlignment, setPatternAlignment] = useState('normal');
  const [intensity, setIntensity] = useState(0.5); // Control de intensidad del oscurecimiento
  
  // Estado para el tipo de brocha seleccionada
  const [selectedBrushType, setSelectedBrushType] = useState('estandar');

  // Definición completa de todas las brochas
  const brushTypes = {
    estandar: {
      name: "Oscurecedor Estándar",
      customBrush: false,
      useCurrentColor: true,
      data: []
    },
    cruz: {
      name: "Cruz (3x3)",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: 0, y: -1, color: null },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: 0, y: 1, color: null }
      ]
    },
    estrella: {
      name: "Estrella (3x3)",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: -1, color: null, opacity: 0.7 },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null, opacity: 0.7 },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: -1, y: 1, color: null, opacity: 0.7 },
        { x: 0, y: 1, color: null },
        { x: 1, y: 1, color: null, opacity: 0.7 }
      ]
    },
    arcoiris: {
      name: "Cruz Arcoíris",
      customBrush: true,
      useCurrentColor: false,
      data: [
        { x: 0, y: -1, color: { r: 255, g: 0, b: 0, a: 255 } },
        { x: -1, y: 0, color: { r: 0, g: 255, b: 0, a: 255 } },
        { x: 0, y: 0, color: { r: 255, g: 255, b: 255, a: 255 } },
        { x: 1, y: 0, color: { r: 0, g: 0, b: 255, a: 255 } },
        { x: 0, y: 1, color: { r: 255, g: 255, b: 0, a: 255 } }
      ]
    },
    linea_horizontal: {
      name: "Línea Horizontal",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -2, y: 0, color: null },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: 2, y: 0, color: null }
      ]
    },
    linea_vertical: {
      name: "Línea Vertical",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: 0, y: -2, color: null },
        { x: 0, y: -1, color: null },
        { x: 0, y: 0, color: null },
        { x: 0, y: 1, color: null },
        { x: 0, y: 2, color: null }
      ]
    },
    diagonal_derecha: {
      name: "Diagonal Derecha",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: -1, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 1, color: null }
      ]
    },
    diagonal_izquierda: {
      name: "Diagonal Izquierda",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: 1, y: -1, color: null },
        { x: 0, y: 0, color: null },
        { x: -1, y: 1, color: null }
      ]
    },
    cuadrado_3x3: {
      name: "Cuadrado (3x3)",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: -1, color: null },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: -1, y: 1, color: null },
        { x: 0, y: 1, color: null },
        { x: 1, y: 1, color: null }
      ]
    },
    cuadrado_5x5: {
      name: "Cuadrado (5x5)",
      customBrush: true,
      useCurrentColor: true,
      data: [
        // Fila superior
        { x: -2, y: -2, color: null },
        { x: -1, y: -2, color: null },
        { x: 0, y: -2, color: null },
        { x: 1, y: -2, color: null },
        { x: 2, y: -2, color: null },
        // Fila superior-media
        { x: -2, y: -1, color: null },
        { x: -1, y: -1, color: null },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: 2, y: -1, color: null },
        // Fila central
        { x: -2, y: 0, color: null },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: 2, y: 0, color: null },
        // Fila inferior-media
        { x: -2, y: 1, color: null },
        { x: -1, y: 1, color: null },
        { x: 0, y: 1, color: null },
        { x: 1, y: 1, color: null },
        { x: 2, y: 1, color: null },
        // Fila inferior
        { x: -2, y: 2, color: null },
        { x: -1, y: 2, color: null },
        { x: 0, y: 2, color: null },
        { x: 1, y: 2, color: null },
        { x: 2, y: 2, color: null }
      ]
    },
    borde_cuadrado: {
      name: "Borde Cuadrado (3x3)",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: -1, color: null },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: -1, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: -1, y: 1, color: null },
        { x: 0, y: 1, color: null },
        { x: 1, y: 1, color: null }
      ]
    },
    circulo_pequeño: {
      name: "Círculo Pequeño",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: 0, y: -1, color: null },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: 0, y: 1, color: null }
      ]
    },
    circulo_mediano: {
      name: "Círculo Mediano",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: -2, color: null },
        { x: 0, y: -2, color: null },
        { x: 1, y: -2, color: null },
        { x: -2, y: -1, color: null },
        { x: -1, y: -1, color: null },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: 2, y: -1, color: null },
        { x: -2, y: 0, color: null },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: 2, y: 0, color: null },
        { x: -2, y: 1, color: null },
        { x: -1, y: 1, color: null },
        { x: 0, y: 1, color: null },
        { x: 1, y: 1, color: null },
        { x: 2, y: 1, color: null },
        { x: -1, y: 2, color: null },
        { x: 0, y: 2, color: null },
        { x: 1, y: 2, color: null }
      ]
    },
    diamante: {
      name: "Diamante",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: 0, y: -2, color: null },
        { x: -1, y: -1, color: null },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: -2, y: 0, color: null },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: 2, y: 0, color: null },
        { x: -1, y: 1, color: null },
        { x: 0, y: 1, color: null },
        { x: 1, y: 1, color: null },
        { x: 0, y: 2, color: null }
      ]
    },
    textura_puntos: {
      name: "Textura de Puntos",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: 0, y: 0, color: null },
        { x: -1, y: 1, color: null },
        { x: 1, y: 1, color: null }
      ]
    },
    salpicadura: {
      name: "Salpicadura",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -2, y: -1, color: null, opacity: 0.6 },
        { x: -1, y: -1, color: null, opacity: 0.8 },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null, opacity: 0.7 },
        { x: -1, y: 0, color: null, opacity: 0.9 },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null, opacity: 0.8 },
        { x: 2, y: 0, color: null, opacity: 0.5 },
        { x: -1, y: 1, color: null, opacity: 0.7 },
        { x: 0, y: 1, color: null, opacity: 0.9 },
        { x: 1, y: 1, color: null, opacity: 0.6 }
      ]
    },
    degradado_horizontal: {
      name: "Degradado Horizontal",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -2, y: 0, color: null, opacity: 0.2 },
        { x: -1, y: 0, color: null, opacity: 0.5 },
        { x: 0, y: 0, color: null, opacity: 1.0 },
        { x: 1, y: 0, color: null, opacity: 0.5 },
        { x: 2, y: 0, color: null, opacity: 0.2 }
      ]
    },
    degradado_vertical: {
      name: "Degradado Vertical",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: 0, y: -2, color: null, opacity: 0.2 },
        { x: 0, y: -1, color: null, opacity: 0.5 },
        { x: 0, y: 0, color: null, opacity: 1.0 },
        { x: 0, y: 1, color: null, opacity: 0.5 },
        { x: 0, y: 2, color: null, opacity: 0.2 }
      ]
    },
    esquinas: {
      name: "Solo Esquinas",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: 0, y: 0, color: null },
        { x: -1, y: 1, color: null },
        { x: 1, y: 1, color: null }
      ]
    },
    flecha_arriba: {
      name: "Flecha Arriba",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: 0, y: -2, color: null },
        { x: -1, y: -1, color: null },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: 0, y: 0, color: null },
        { x: 0, y: 1, color: null }
      ]
    },
    flecha_derecha: {
      name: "Flecha Derecha",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: 2, y: 0, color: null },
        { x: 1, y: -1, color: null },
        { x: 1, y: 1, color: null }
      ]
    },
    corazon: {
      name: "Corazón",
      customBrush: true,
      useCurrentColor: true,
      data: [
        { x: -1, y: -1, color: null },
        { x: 0, y: -1, color: null },
        { x: 1, y: -1, color: null },
        { x: -2, y: 0, color: null },
        { x: -1, y: 0, color: null },
        { x: 0, y: 0, color: null },
        { x: 1, y: 0, color: null },
        { x: 2, y: 0, color: null },
        { x: -1, y: 1, color: null },
        { x: 0, y: 1, color: null },
        { x: 1, y: 1, color: null },
        { x: 0, y: 2, color: null }
      ]
    }
  };

  // useEffect para cargar configuración guardada al montar el componente
  useEffect(() => {
    const darkConfig = toolConfigs.dark;
    
    if (darkConfig !== null) {
      // Cargar configuración guardada
      setBorderWidth(darkConfig.borderWidth || 1);
      setOpacity(darkConfig.opacity || 100);
      setVertices(darkConfig.vertices || 5);
      setRotation(darkConfig.rotation || 0);
      setPattern(darkConfig.pattern || "solid");
      setPressure(darkConfig.pressure || 50);
      setSharpen(darkConfig.sharpen || 0);
      setPaintMode(darkConfig.paintMode || 'manual');
      setVelocitySensibility(darkConfig.velocitySensibility || 0);
      setPatternAlignment(darkConfig.patternAlignment || 'normal');
      setIntensity(darkConfig.intensity || 0.5);
      setSelectedBrushType(darkConfig.selectedBrushType || 'estandar');
    }
  }, []); // Solo se ejecuta al montar

  // useEffect para guardar cambios en la configuración de la herramienta
  useEffect(() => {
    const currentConfig = {
      borderWidth,
      opacity,
      vertices,
      rotation,
      pattern,
      pressure,
      sharpen,
      paintMode,
      velocitySensibility,
      patternAlignment,
      intensity,
      selectedBrushType
    };

    setToolConfigs(prev => ({
      ...prev,
      dark: currentConfig
    }));
  }, [borderWidth, opacity, vertices, rotation, pattern, pressure, sharpen, paintMode, velocitySensibility, patternAlignment, intensity, selectedBrushType, setToolConfigs]);

  // Función para procesar los datos de la brocha según el color actual
  const processCustomBrushData = (brushType, currentColor) => {
    if (!brushType.customBrush) return [];
    
    return brushType.data.map(pixel => {
      if (brushType.useCurrentColor && pixel.color === null) {
        const alpha = pixel.opacity ? Math.round(currentColor.a * 255 * pixel.opacity) : Math.round(currentColor.a * 255);
        
        return {
          ...pixel,
          color: {
            r: currentColor.r,
            g: currentColor.g,
            b: currentColor.b,
            a: alpha
          }
        };
      }
      
      return pixel;
    });
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

  // Función para manejar el cambio de tipo de brocha
  const handleBrushTypeChange = (e) => {
    setSelectedBrushType(e.target.value);
  };

  // Función para manejar el cambio de intensidad
  const handleIntensityChange = (e) => {
    const value = parseFloat(e.target.value);
    setIntensity(value);
  };

  useEffect(() => {
    if (typeof borderWidth === 'number' && 
        typeof vertices === 'number' && 
        typeof rotation === 'number') {
     
      const selectedBrush = brushTypes[selectedBrushType];
      
      setToolParameters(prev => ({
        ...prev,
        width: borderWidth,
        vertices: vertices,
        rotation: rotation,
        pattern: pattern,
        pressure: pressure,
        smoothness: 0,
        blur: sharpen,
        paintMode: paintMode,
        velocitySensibility: velocitySensibility,
        patternAlignment: patternAlignment,
        intensity: intensity, // Control de intensidad del oscurecimiento
        customBrush: selectedBrush.customBrush,
        customBrushData: selectedBrush.data,
        customBrushType: selectedBrush,
        processCustomBrushData: (color) => processCustomBrushData(selectedBrush, color)
      }));
    }
  }, [borderWidth, opacity, vertices, rotation, pattern, pressure, setToolParameters, sharpen, paintMode, velocitySensibility, patternAlignment, selectedBrushType, intensity]);

  const currentBrush = brushTypes[selectedBrushType];

  return (
    <>
      <div className="polygon-tool-container">
        <div className="tool-configs">
          
          {/* Selector de tipo de brocha */}
          <BrushSelect 
            brushTypes={brushTypes}
            selectedBrushType={selectedBrushType}
            onBrushTypeChange={handleBrushTypeChange}
            toolParameters={toolParameters}
          />

          {/* Configuración de grosor (solo para brocha estándar) */}
          {!currentBrush.customBrush && (
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
          )}

          {/* Configuración de Intensidad - Control del oscurecimiento */}
          <div className="config-item">
            <label className="tool-label">Intensidad</label>
            <div className="intensity-slider-container">
              <div className="slider-track-horizontal">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={intensity}
                  onChange={handleIntensityChange}
                  className="intensity-slider"
                />
              </div>
              <div className="current-value-horizontal">
                {Math.round(intensity * 100)}%
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default DarkTool;