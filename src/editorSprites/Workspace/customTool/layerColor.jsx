import { useEffect, useState } from "react";
import { LuPencil, LuTrash2, LuPlus, LuCheck, LuX } from "react-icons/lu";
import ToolColorPicker from "./tools/toolColorPicker";
import './layerColor.css'

const LayerColor = ({ tool, toolParameters, setToolParameters }) => {
  // Estados para los colores principales
  const [foregroundColor, setForegroundColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  const [backgroundColor, setBackgroundColor] = useState({ r: 255, g: 255, b: 255, a: 1 });
  
  // Estados para colores específicos de formas
  const [fillColor, setFillColor] = useState({ r: 255, g: 0, b: 0, a: 1 });
  const [borderColor, setBorderColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  
  // Estados para los valores hex
  const [hexForeground, setHexForeground] = useState('#000000');
  const [hexBackground, setHexBackground] = useState('#FFFFFF');
  const [hexFill, setHexFill] = useState('#FF0000');
  const [hexBorder, setHexBorder] = useState('#000000');
  
  // Estados para mostrar/ocultar color pickers
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);

  // Estados para la paleta de colores
  const [actualPalette, setActualPalette] = useState([
    { r: 255, g: 0, b: 0, a: 1 },      // Rojo
    { r: 0, g: 255, b: 0, a: 1 },      // Verde
    { r: 0, g: 0, b: 255, a: 1 },      // Azul
    { r: 255, g: 255, b: 0, a: 1 },    // Amarillo
    { r: 255, g: 0, b: 255, a: 1 },    // Magenta
    { r: 0, g: 255, b: 255, a: 1 },    // Cyan
    { r: 128, g: 128, b: 128, a: 1 },  // Gris
    { r: 255, g: 165, b: 0, a: 1 },    // Naranja
    { r: 128, g: 0, b: 128, a: 1 },    // Púrpura
    { r: 0, g: 128, b: 0, a: 1 },      // Verde oscuro
    { r: 0, g: 0, b: 0, a: 1 },        // Negro
    { r: 255, g: 255, b: 255, a: 1 },  // Blanco
  ]);
  const [showPalettePicker, setShowPalettePicker] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState(null);
  const [isEditingPalette, setIsEditingPalette] = useState(false);
  const [paletteColorHex, setPaletteColorHex] = useState('#000000');

  // Herramientas que necesitan configuración de formas
  const shapeTools = ['circle', 'ellipse', 'square', 'rectangle', 'polygon', 'triangle'];
  const isShapeTool = shapeTools.includes(tool);

  // Función para convertir RGB a Hex
  const rgbToHex = ({ r, g, b }) => {
    return "#" + [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("");
  };

  // Función para convertir Hex a RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 1
    } : { r: 0, g: 0, b: 0, a: 1 };
  };

  // Actualizar valores hex cuando cambian los colores RGB
  useEffect(() => {
    setHexForeground(rgbToHex(foregroundColor));
    setHexBackground(rgbToHex(backgroundColor));
    setHexFill(rgbToHex(fillColor));
    setHexBorder(rgbToHex(borderColor));
  }, [foregroundColor, backgroundColor, fillColor, borderColor]);

  // Cerrar todos los color pickers
  const closeAllPickers = () => {
    setShowPrimaryPicker(false);
    setShowSecondaryPicker(false);
    setShowPalettePicker(false);
  };

  // Función para agregar un nuevo color a la paleta
  const addNewColor = () => {
    const newColor = { r: 128, g: 128, b: 128, a: 1 };
    const newPalette = [...actualPalette, newColor];
    setActualPalette(newPalette);
    setEditingColorIndex(newPalette.length - 1);
    setPaletteColorHex(rgbToHex(newColor));
    closeAllPickers();
    setShowPalettePicker(true);
  };

  // Función para eliminar un color de la paleta
  const removeColor = (index) => {
    if (actualPalette.length > 1) {
      const newPalette = actualPalette.filter((_, i) => i !== index);
      setActualPalette(newPalette);
      if (editingColorIndex === index) {
        setEditingColorIndex(null);
        setShowPalettePicker(false);
      }
    }
  };

  // Función para editar un color de la paleta
  const editPaletteColor = (index) => {
    setEditingColorIndex(index);
    setPaletteColorHex(rgbToHex(actualPalette[index]));
    closeAllPickers();
    setShowPalettePicker(true);
  };

  // Función para aplicar color de la paleta al color primario
  const applyPaletteColorToPrimary = (color) => {
    if (isShapeTool) {
      setBorderColor(color);
    } else {
      setForegroundColor(color);
    }
  };

  // Función para aplicar color de la paleta al color secundario (click derecho)
  const applyPaletteColorToSecondary = (color) => {
    if (isShapeTool) {
      setFillColor(color);
    } else {
      setBackgroundColor(color);
    }
  };

  // Función para manejar clicks en la paleta
  const handlePaletteColorClick = (color, index, event) => {
    event.preventDefault(); // Prevenir menú contextual
    
    if (isEditingPalette) {
      editPaletteColor(index);
    } else {
      if (event.button === 2) { // Click derecho
        applyPaletteColorToSecondary(color);
      } else { // Click izquierdo
        applyPaletteColorToPrimary(color);
      }
    }
  };

  // Función para actualizar color de la paleta
  const updatePaletteColor = (color) => {
    if (editingColorIndex !== null) {
      const newPalette = [...actualPalette];
      newPalette[editingColorIndex] = color;
      setActualPalette(newPalette);
    }
  };

  // Función para prevenir menú contextual
  const preventContextMenu = (event) => {
    event.preventDefault();
  };

  // Obtener los colores y labels actuales según la herramienta
  const getPrimaryColorData = () => {
    if (isShapeTool) {
      return {
        color: borderColor,
        setColor: setBorderColor,
        hex: hexBorder,
        setHex: setHexBorder,
        label: 'Border'
      };
    } else {
      return {
        color: foregroundColor,
        setColor: setForegroundColor,
        hex: hexForeground,
        setHex: setHexForeground,
        label: 'Foreground'
      };
    }
  };

  const getSecondaryColorData = () => {
    if (isShapeTool) {
      return {
        color: fillColor,
        setColor: setFillColor,
        hex: hexFill,
        setHex: setHexFill,
        label: 'Fill'
      };
    } else {
      return {
        color: backgroundColor,
        setColor: setBackgroundColor,
        hex: hexBackground,
        setHex: setHexBackground,
        label: 'Background'
      };
    }
  };

  const primaryColorData = getPrimaryColorData();
  const secondaryColorData = getSecondaryColorData();

  // Actualizar parámetros de herramienta
  useEffect(() => {
    if (isShapeTool) {
      setToolParameters(prev => ({
        ...prev,
        borderColor: borderColor,
        fillColor: fillColor
      }));
    } else {
      setToolParameters(prev => ({
        ...prev,
        foregroundColor: foregroundColor,
        backgroundColor: backgroundColor
      }));
    }
  }, [
    foregroundColor, 
    backgroundColor, 
    fillColor, 
    borderColor, 
    isShapeTool, 
    setToolParameters
  ]);

  return (
    <div className="layer-color-container" onContextMenu={preventContextMenu}>
      <div className="layer-color-header">
        <h3 className="layer-color-title">Colors</h3>
      </div>

      <div className="layer-color-content">
        {/* Colores principales */}
        <div className="primary-colors-section">
          <div className="primary-colors-row">
            {/* Color Primario (Foreground/Border) */}
            <div className="layer-color-item">
              <label className="layer-color-label">{primaryColorData.label}</label>
              <div className="layer-color-input-wrapper">
                <div 
                  className={`layer-color-button ${showPrimaryPicker ? 'layer-active' : ''}`}
                  style={{ backgroundColor: `rgba(${primaryColorData.color.r}, ${primaryColorData.color.g}, ${primaryColorData.color.b}, ${primaryColorData.color.a})` }}
                  onClick={() => {
                    closeAllPickers();
                    setShowPrimaryPicker(!showPrimaryPicker);
                  }}
                >
                  {showPrimaryPicker && <div className="layer-color-arrow"></div>}
                </div>
                <span className="layer-color-hex">{primaryColorData.hex}</span>
              </div>
            </div>

            {/* Color Secundario (Background/Fill) */}
            <div className="layer-color-item">
              <label className="layer-color-label">{secondaryColorData.label}</label>
              <div className="layer-color-input-wrapper">
                <div 
                  className={`layer-color-button ${showSecondaryPicker ? 'layer-active' : ''}`}
                  style={{ backgroundColor: `rgba(${secondaryColorData.color.r}, ${secondaryColorData.color.g}, ${secondaryColorData.color.b}, ${secondaryColorData.color.a})` }}
                  onClick={() => {
                    closeAllPickers();
                    setShowSecondaryPicker(!showSecondaryPicker);
                  }}
                >
                  {showSecondaryPicker && <div className="layer-color-arrow"></div>}
                </div>
                <span className="layer-color-hex">{secondaryColorData.hex}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paleta de colores */}
      <div className="color-palette-container">
        <div className="color-palette-header">
          <h4 className="color-palette-title">Color Palette</h4>
          <button
            className={`palette-edit-btn ${isEditingPalette ? 'active' : ''}`}
            onClick={() => setIsEditingPalette(!isEditingPalette)}
            title={isEditingPalette ? 'Finalizar edición' : 'Editar paleta'}
          >
            {isEditingPalette ? <LuCheck size={14} /> : <LuPencil size={14} />}
          </button>
        </div>

        <div className="color-palette-grid">
          {actualPalette.map((color, index) => (
            <div
              key={index}
              className={`palette-color-item ${editingColorIndex === index ? 'editing' : ''}`}
            >
              <div
                className="palette-color-swatch"
                style={{
                  backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
                }}
                onClick={(e) => handlePaletteColorClick(color, index, e)}
                onMouseDown={(e) => handlePaletteColorClick(color, index, e)}
                onContextMenu={preventContextMenu}
                title={isEditingPalette ? 'Editar color' : `Click izquierdo: ${primaryColorData.label} | Click derecho: ${secondaryColorData.label}`}
              >
                {editingColorIndex === index && (
                  <div className="editing-indicator">
                    <div className="editing-dot"></div>
                  </div>
                )}
              </div>

              {isEditingPalette && (
                <button
                  className="palette-delete-btn"
                  onClick={() => removeColor(index)}
                  title="Eliminar color"
                  disabled={actualPalette.length <= 1}
                >
                  <LuTrash2 size={10} />
                </button>
              )}
            </div>
          ))}

          {isEditingPalette && (
            <div className="palette-add-color">
              <button
                className="palette-add-btn"
                onClick={addNewColor}
                title="Agregar nuevo color"
              >
                <LuPlus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Color Pickers */}
      {showPrimaryPicker && (
         <ToolColorPicker
          color={primaryColorData.color}
          onChange={primaryColorData.setColor}
          hexColor={primaryColorData.hex}
          setHexColor={primaryColorData.setHex}
        />
      )}

      {showSecondaryPicker && (
        <ToolColorPicker
          color={secondaryColorData.color}
          onChange={secondaryColorData.setColor}
          hexColor={secondaryColorData.hex}
          setHexColor={secondaryColorData.setHex}
        />
      )}

      {showPalettePicker && editingColorIndex !== null && (
        <ToolColorPicker
          color={actualPalette[editingColorIndex]}
          onChange={updatePaletteColor}
          hexColor={paletteColorHex}
          setHexColor={setPaletteColorHex}
        />
      )}

      <style jsx>{`
        /* Estilos de la paleta de colores */
        .color-palette-container {
          padding: 16px;
          background: var(--layer-bg-primary);
          border-radius: 12px;
          border: 1px solid var(--layer-border-color);
          transition: all 0.2s ease;
        }

        .color-palette-container:hover {
          border-color: rgba(124, 77, 255, 0.3);
          background: linear-gradient(135deg, var(--layer-bg-primary) 0%, rgba(124, 77, 255, 0.05) 100%);
        }

        .color-palette-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--layer-border-color);
        }

        .color-palette-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--layer-text-primary);
          margin: 0;
          letter-spacing: 0px;
        }

        .palette-edit-btn {
          background: var(--layer-bg-secondary);
          border: 1px solid var(--layer-border-color);
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--layer-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .palette-edit-btn:hover {
          background: var(--layer-accent-color);
          color: white;
          border-color: var(--layer-accent-color);
        }

        .palette-edit-btn.active {
          background: var(--layer-success-color);
          color: white;
          border-color: var(--layer-success-color);
        }

        .color-palette-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .palette-color-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .palette-color-item.editing {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(124, 77, 255, 0.4);
        }

        .palette-color-swatch {
          width: 100%;
          height: 100%;
          border: 2px solid var(--layer-border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          user-select: none;
        }

        .palette-color-swatch:hover {
          border-color: var(--layer-accent-color);
          transform: scale(1.05);
        }

        .editing-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .editing-dot {
          width: 6px;
          height: 6px;
          background: var(--layer-accent-color);
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .palette-delete-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ff4757;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          transition: all 0.2s ease;
        }

        .palette-delete-btn:hover:not(:disabled) {
          background: #ff3838;
          transform: scale(1.1);
        }

        .palette-delete-btn:disabled {
          background: #666;
          cursor: not-allowed;
        }

        .palette-add-color {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .palette-add-btn {
          width: 100%;
          height: 100%;
          background: var(--layer-bg-secondary);
          border: 2px dashed var(--layer-border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--layer-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .palette-add-btn:hover {
          background: var(--layer-accent-color);
          border-color: var(--layer-accent-color);
          color: white;
        }

        .palette-info {
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid var(--layer-border-color);
        }

        .palette-count {
          font-size: 11px;
          color: var(--layer-text-secondary);
          font-weight: 500;
        }

        /* Responsive design */
        @media (max-width: 480px) {
          .color-palette-grid {
            grid-template-columns: repeat(auto-fill, minmax(28px, 1fr));
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default LayerColor;