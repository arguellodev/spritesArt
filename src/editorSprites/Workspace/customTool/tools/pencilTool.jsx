import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";


import BrushSelect from "./brushSelect";

const PencilTool = ({ setToolParameters, tool, toolParameters, toolConfigs, setToolConfigs, myBrushes }) => {
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
  const [perfectCurves, setPerfectCurves] = useState(false);

  
  // Estado para el tipo de brocha seleccionada
  const [selectedBrushType, setSelectedBrushType] = useState('estandar');

  // Definición completa de todas las brochas
  const brushTypes = {
    estandar: {
      name: "Pincel Estándar",
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
        { x: 0, y: -1, color: { r: 255, g: 0, b: 0, a: 255 } }, // Rojo
        { x: -1, y: 0, color: { r: 0, g: 255, b: 0, a: 255 } }, // Verde
        { x: 0, y: 0, color: { r: 255, g: 255, b: 255, a: 255 } }, // Blanco
        { x: 1, y: 0, color: { r: 0, g: 0, b: 255, a: 255 } }, // Azul
        { x: 0, y: 1, color: { r: 255, g: 255, b: 0, a: 255 } } // Amarillo
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

  // Función para combinar brochas predefinidas con brochas personalizadas
  const getAllBrushTypes = () => {
    const allBrushes = { ...brushTypes };
    
    // Agregar My Brushes si existen
    if (myBrushes && Array.isArray(myBrushes) && myBrushes.length > 0) {
      myBrushes.forEach((brush, index) => {
        const brushId = `my_brush_${brush.id || index}`;
        allBrushes[brushId] = {
          name: brush.name || `Mi Brocha ${index + 1}`,
          customBrush: true,
          useCurrentColor: brush.useCurrentColor !== undefined ? brush.useCurrentColor : true,
          data: brush.data || [],
          isMyBrush: true // Marcador para identificar brochas personalizadas
        };
      });
    }
    
    return allBrushes;
  };

  // useEffect para cargar configuración guardada al montar el componente
  useEffect(() => {
    const pencilConfig = toolConfigs.pencil;
    
    if (pencilConfig !== null) {
      // Cargar configuración guardada
      setBorderWidth(pencilConfig.borderWidth || 1);
      setOpacity(pencilConfig.opacity || 100);
      setVertices(pencilConfig.vertices || 5);
      setRotation(pencilConfig.rotation || 0);
      setPattern(pencilConfig.pattern || "solid");
      setPressure(pencilConfig.pressure || 50);
      setSharpen(pencilConfig.sharpen || 0);
      setPaintMode(pencilConfig.paintMode || 'manual');
      setVelocitySensibility(pencilConfig.velocitySensibility || 0);
      setPatternAlignment(pencilConfig.patternAlignment || 'normal');
      setSelectedBrushType(pencilConfig.selectedBrushType || 'estandar');
      setPerfectCurves(pencilConfig.perfectCurves || false);
    }
  }, []); // Solo se ejecuta al montar

  // useEffect para verificar que la brocha seleccionada aún existe
  useEffect(() => {
    const allBrushes = getAllBrushTypes();
    if (!allBrushes[selectedBrushType]) {
      // Si la brocha seleccionada no existe, volver a la estándar
      setSelectedBrushType('estandar');
    }
  }, [myBrushes, selectedBrushType]);

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
      selectedBrushType,
      perfectCurves
    };

    setToolConfigs(prev => ({
      ...prev,
      pencil: currentConfig
    }));
  }, [borderWidth, opacity, vertices, rotation, pattern, pressure, sharpen, paintMode, velocitySensibility, patternAlignment, selectedBrushType,perfectCurves, setToolConfigs]);

  // Función para procesar los datos de la brocha según el color actual
  const processCustomBrushData = (brushType, currentColor) => {
    if (!brushType.customBrush) return [];
    
    return brushType.data.map(pixel => {
      if (brushType.useCurrentColor && pixel.color === null) {
        // Usar el color pasado como parámetro (foreground o background)
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
      
      // Usar el color definido en la brocha
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

  // Función para manejar el cambio de tipo de brocha
  const handleBrushTypeChange = (e) => {
    setSelectedBrushType(e.target.value);
  };

  useEffect(() => {
    // Solo actualizar si todos los valores son números válidos
    if (typeof borderWidth === 'number' && 
        typeof vertices === 'number' && 
        typeof rotation === 'number') {
     
      const allBrushes = getAllBrushTypes();
      const selectedBrush = allBrushes[selectedBrushType];
      
      // NO establecemos colores aquí - solo configuraciones de la brocha
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
        customBrush: selectedBrush.customBrush,
        customBrushData: selectedBrush.data, // Datos sin procesar
        customBrushType: selectedBrush, // Información completa de la brocha
        perfectCurves: perfectCurves,
        // Función para procesar la brocha con cualquier color
        processCustomBrushData: (color) => processCustomBrushData(selectedBrush, color)
        // NO establecemos foregroundColor ni backgroundColor aquí
      }));
    }
  }, [borderWidth, opacity, vertices, rotation, pattern, pressure, setToolParameters, sharpen, paintMode, velocitySensibility, patternAlignment, selectedBrushType, perfectCurves, myBrushes]);

  const allBrushes = getAllBrushTypes();
  const currentBrush = allBrushes[selectedBrushType];

  return (
    <>
      <div className="polygon-tool-container">
        <div className="tool-configs">
          
          {/* Selector de tipo de brocha */}
          <BrushSelect 
            brushTypes={allBrushes}
            selectedBrushType={selectedBrushType}
            onBrushTypeChange={handleBrushTypeChange}
            toolParameters={toolParameters}
            myBrushes={myBrushes}
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

          {/* Configuración de Sharpen (solo para brocha estándar) */}
          {false && (
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
                      setSharpen(1);
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
          )}

          {/* Configuración de Paint Mode */}
          <div className="config-item">
            <label className="tool-label">Alpha Mode</label>
            <div className="input-container">
              <select
                value={paintMode}
                onChange={(e) => setPaintMode(e.target.value)}
                className="select-input"
              >
                <option value="manual">Manual</option>
                <option value="composite">Composite</option>
              </select>
            </div>
          </div>

          {/* Configuración de Pattern Alignment */}
          <div className="config-item">
            <label className="tool-label">Pattern Alignment</label>
            <div className="input-container">
              <select
                value={patternAlignment}
                onChange={(e) => setPatternAlignment(e.target.value)}
                className="select-input"
              >
                <option value="normal">Normal</option>
                <option value="source">Source</option>
                <option value="destination">Destination</option>
              </select>
            </div>
          </div>

            {/* Toggle para dithering */}
            <div className="config-item">
                <label className="tool-label">Perfect curves</label>
                <div className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="perfectCurvesEnabled" 
                    className="toggle-input"
                    checked={perfectCurves} // Cambiar esta línea
                    onChange={(e) => setPerfectCurves(e.target.checked)} // Cambiar esta línea
                  />
                  <label htmlFor="perfectCurvesEnabled" className="toggle-label"></label>
                </div>
              </div>


        </div>
      </div>
    </>
  );
};

export default PencilTool;