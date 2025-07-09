import { useEffect, useState } from "react";
import { LuPencil, LuTrash2, LuPlus, LuCheck, LuX, LuPalette, LuRefreshCw } from "react-icons/lu";
import ToolColorPicker from "./tools/toolColorPicker";
import { PiMouseLeftClickFill } from "react-icons/pi";
import { PiMouseRightClickFill } from "react-icons/pi";

import './layerColor.css'

const LayerColor = ({ tool, toolParameters, setToolParameters, getLayerPixelData, currentFrame=1, activeLayerId, paintPixelsRGBA,isPressed }) => {
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

// Estados para la edición de colores indexados
const [editingIndexedColor, setEditingIndexedColor] = useState(null);
const [showIndexedColorPicker, setShowIndexedColorPicker] = useState(false);
const [indexedColorHex, setIndexedColorHex] = useState('#000000');

const [includeAlpha, setIncludeAlpha] = useState(false);

  // Estados para la paleta de colores por defecto
  const [defaultPalette] = useState([
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

  // Estados para la paleta de colores
  const [actualPalette, setActualPalette] = useState(defaultPalette);
  const [showPalettePicker, setShowPalettePicker] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState(null);
  const [isEditingPalette, setIsEditingPalette] = useState(false);
  const [paletteColorHex, setPaletteColorHex] = useState('#000000');

  // Estados para el indexed palette
  const [isIndexedMode, setIsIndexedMode] = useState(false);
  const [indexedPalette, setIndexedPalette] = useState([]);
  const [isGeneratingPalette, setIsGeneratingPalette] = useState(false);

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

  const paintPixelsRGBAAdvanced = (layerId, frameIndex, pixels, baseColor, specificColors = null) => {
    if (specificColors && specificColors.length === pixels.length) {
      // Aplicar colores específicos a cada pixel
      pixels.forEach((pixel, index) => {
        const specificColor = specificColors[index];
        paintPixelsRGBA(layerId, frameIndex, [pixel], specificColor.color);
      });
    } else {
      // Comportamiento original
      paintPixelsRGBA(layerId, frameIndex, pixels, baseColor);
    }
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

  // Función para generar la paleta indexada desde los píxeles
  // Función corregida para generar la paleta indexada
  const generateIndexedPalette = async () => {
    setIsGeneratingPalette(true);
    
    try {
      const pixelData = getLayerPixelData(currentFrame, activeLayerId);
      
      if (!pixelData || pixelData.length === 0) {
        console.warn('No hay datos de píxeles disponibles');
        setIndexedPalette([]);
        setIsGeneratingPalette(false);
        return;
      }
  
      console.log('=== GENERANDO PALETA INDEXADA ===');
      console.log(`Total píxeles obtenidos: ${pixelData.length}`);
      console.log(`Modo includeAlpha: ${includeAlpha}`);
  
      // Map para colores únicos con sus píxeles
      const uniqueColors = new Map();
      let processedPixels = 0;
      let skippedTransparent = 0;
      
      pixelData.forEach(pixel => {
        const { r, g, b, a } = pixel.color;
        const { x, y } = pixel;
        
        // Ignorar píxeles completamente transparentes (invisibles)
        if (a === 0) {
          skippedTransparent++;
          return;
        }
        
        processedPixels++;
        
        // CLAVE CRÍTICA: Crear la clave según el modo includeAlpha
        const colorKey = includeAlpha 
          ? `${r},${g},${b},${a}`     // Con alpha: colores diferentes si tienen diferente transparencia
          : `${r},${g},${b}`;         // Sin alpha: mismos RGB = mismo color (sin importar transparencia)
        
        if (!uniqueColors.has(colorKey)) {
          uniqueColors.set(colorKey, { 
            color: includeAlpha 
              ? { r, g, b, a }                    // Mostrar alpha real
              : { r, g, b, a: 1 },               // Mostrar como opaco en la paleta
            pixels: [], 
            alphaVariants: includeAlpha ? null : new Map() // Solo rastrear variantes si no incluye alpha
          });
        }
        
        const colorData = uniqueColors.get(colorKey);
        
        // CRÍTICO: Guardar la información completa del píxel
        const pixelInfo = { 
          x, 
          y, 
          originalAlpha: a  // ← ESTE ES EL VALOR QUE PRESERVAREMOS
        };
        
        colorData.pixels.push(pixelInfo);
        
        // Si NO incluimos alpha, rastrear las diferentes transparencias para este RGB
        if (!includeAlpha && colorData.alphaVariants) {
          if (!colorData.alphaVariants.has(a)) {
            colorData.alphaVariants.set(a, []);
          }
          colorData.alphaVariants.get(a).push(pixelInfo);
        }
      });
  
      console.log(`Píxeles procesados: ${processedPixels}, Transparentes omitidos: ${skippedTransparent}`);
      console.log(`Colores únicos encontrados: ${uniqueColors.size}`);
  
      // Convertir Map a array y ordenar por brillo
      const uniqueColorsArray = Array.from(uniqueColors.values())
        .map((item, index) => ({
          ...item.color,
          pixels: item.pixels,
          alphaVariants: item.alphaVariants,
          index: index
        }))
        .sort((a, b) => {
          // Ordenar por brillo (más brillante primero)
          const brightnessA = (a.r * 299 + a.g * 587 + a.b * 114) / 1000;
          const brightnessB = (b.r * 299 + b.g * 587 + b.b * 114) / 1000;
          return brightnessB - brightnessA;
        })
        .map((item, index) => ({ ...item, index })); // Reindexar después del ordenamiento
  
      setIndexedPalette(uniqueColorsArray);
      
      console.log(`✅ Paleta generada con ${uniqueColorsArray.length} colores únicos`);
      
      // DEBUG: Mostrar información de muestra
      if (uniqueColorsArray.length > 0) {
        const sampleColor = uniqueColorsArray[0];
        console.log('Color de muestra:', sampleColor);
        
        if (sampleColor.pixels?.length > 0) {
          console.log('Píxeles de muestra (primeros 3):', sampleColor.pixels.slice(0, 3));
          
          // Verificar que originalAlpha se está guardando correctamente
          const alphaValues = sampleColor.pixels.map(p => p.originalAlpha);
          const uniqueAlphas = [...new Set(alphaValues)];
          console.log(`Valores de alpha en este color: ${uniqueAlphas.join(', ')}`);
        }
        
        if (!includeAlpha && sampleColor.alphaVariants) {
          const alphaVariants = Array.from(sampleColor.alphaVariants.keys());
          console.log(`Variantes de transparencia: ${alphaVariants.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.error('Error generando paleta indexada:', error);
      setIndexedPalette([]);
    } finally {
      setIsGeneratingPalette(false);
    }
  };

  // Función para iniciar edición de color indexado
const startEditingIndexedColor = (color, index) => {
  setEditingIndexedColor({ color, index });
  setIndexedColorHex(rgbToHex(color));
  closeAllPickers();
  setShowIndexedColorPicker(true);
};

// Función para aplicar cambios a un color indexado
// Función corregida para aplicar cambios a un color indexado
const applyIndexedColorChange = (newColor) => {
  if (!editingIndexedColor) return;
  
  const { index } = editingIndexedColor;
  const colorData = indexedPalette[index];
  
  if (!colorData || !colorData.pixels) return;
  
  console.log('=== APLICANDO CAMBIO DE COLOR ===');
  console.log('Nuevo color:', newColor);
  console.log('Modo includeAlpha:', includeAlpha);
  console.log('Píxeles a cambiar:', colorData.pixels.length);
  
  if (includeAlpha) {
    // MODO INCLUDE ALPHA: Aplicar el color exacto del picker (RGB + Alpha)
    const uniformColor = {
      r: newColor.r,
      g: newColor.g,
      b: newColor.b,
      a: newColor.a
    };
    
    const pixelPositions = colorData.pixels.map(pixel => ({ x: pixel.x, y: pixel.y }));
    paintPixelsRGBA(activeLayerId, currentFrame, pixelPositions, uniformColor);
    
    console.log(`✅ Aplicado color uniforme con alpha ${newColor.a} a ${pixelPositions.length} píxeles`);
    
  } else {
    // MODO SIN INCLUDE ALPHA: Cambiar solo RGB, preservar alpha original de cada píxel
    console.log('🎨 Preservando alpha original de cada píxel...');
    
    // Verificar que tenemos originalAlpha en los píxeles
    const pixelsWithAlpha = colorData.pixels.filter(p => p.hasOwnProperty('originalAlpha'));
    const pixelsWithoutAlpha = colorData.pixels.filter(p => !p.hasOwnProperty('originalAlpha'));
    
    console.log(`Píxeles con originalAlpha: ${pixelsWithAlpha.length}`);
    console.log(`Píxeles SIN originalAlpha: ${pixelsWithoutAlpha.length}`);
    
    if (pixelsWithoutAlpha.length > 0) {
      console.error('❌ ERROR: Algunos píxeles no tienen originalAlpha!', pixelsWithoutAlpha.slice(0, 3));
    }
    
    // Aplicar nuevo RGB preservando alpha original de cada píxel
    colorData.pixels.forEach((pixel, idx) => {
      // Si no tiene originalAlpha, usar alpha del píxel actual como fallback
      const alphaToUse = pixel.hasOwnProperty('originalAlpha') ? pixel.originalAlpha : 1;
      
      const pixelColor = {
        r: newColor.r,
        g: newColor.g,
        b: newColor.b,
        a: alphaToUse/255 // ← PRESERVAR ALPHA ORIGINAL
      };
      
      // Pintar cada píxel individualmente
      paintPixelsRGBA(
        activeLayerId,
        currentFrame,
        [{ x: pixel.x, y: pixel.y }],
        pixelColor
      );
      
      // Log de muestra para los primeros píxeles
      if (idx < 5) {
        console.log(`  Píxel ${idx} (${pixel.x}, ${pixel.y}): originalAlpha=${alphaToUse} → aplicando:`, pixelColor);
      }
    });
    
    console.log(`✅ Aplicado nuevo RGB preservando ${colorData.pixels.length} valores de alpha individuales`);
  }
  
  // Actualizar la paleta indexada
  const updatedPalette = [...indexedPalette];
  updatedPalette[index] = {
    ...updatedPalette[index],
    r: newColor.r,
    g: newColor.g,
    b: newColor.b,
    a: includeAlpha ? newColor.a : updatedPalette[index].a
  };
  setIndexedPalette(updatedPalette);
  
  console.log('=== CAMBIO DE COLOR COMPLETADO ===');
};




// Función para finalizar edición de color indexado
const finishEditingIndexedColor = () => {
  setEditingIndexedColor(null);
  setShowIndexedColorPicker(false);
  // Regenerar la paleta para reflejar los cambios
  setTimeout(() => generateIndexedPalette(), 100);
};


  // Efecto para generar la paleta cuando se activa el modo indexado
  useEffect(() => {
    if (isIndexedMode) {
      generateIndexedPalette();
    }
  }, [isIndexedMode, currentFrame, activeLayerId]);

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
    setShowIndexedColorPicker(false);
  };

  // Función para agregar un nuevo color a la paleta (solo en modo normal)
  const addNewColor = () => {
    if (isIndexedMode) return;
    
    const newColor = { r: 128, g: 128, b: 128, a: 1 };
    const newPalette = [...actualPalette, newColor];
    setActualPalette(newPalette);
    setEditingColorIndex(newPalette.length - 1);
    setPaletteColorHex(rgbToHex(newColor));
    closeAllPickers();
    setShowPalettePicker(true);
  };

  // Función para eliminar un color de la paleta (solo en modo normal)
  const removeColor = (index) => {
    if (isIndexedMode || actualPalette.length <= 1) return;
    
    const newPalette = actualPalette.filter((_, i) => i !== index);
    setActualPalette(newPalette);
    if (editingColorIndex === index) {
      setEditingColorIndex(null);
      setShowPalettePicker(false);
    }
  };

  // Función para editar un color de la paleta (solo en modo normal)
  const editPaletteColor = (index) => {
    if (isIndexedMode) return;
    
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
    event.preventDefault();
    
    if (isIndexedMode) {
      // En modo indexado, siempre aplicar colores (no edición con click)
      if (event.button === 2) {
        applyPaletteColorToSecondary(color);
      } else {
        applyPaletteColorToPrimary(color);
      }
    } else {
      // Modo normal (sin cambios)
      if (isEditingPalette) {
        editPaletteColor(index);
      } else {
        if (event.button === 2) {
          applyPaletteColorToSecondary(color);
        } else {
          applyPaletteColorToPrimary(color);
        }
      }
    }
  };

  // Función para actualizar color de la paleta (solo en modo normal)
  const updatePaletteColor = (color) => {
    if (editingColorIndex !== null && !isIndexedMode) {
      const newPalette = [...actualPalette];
      newPalette[editingColorIndex] = color;
      setActualPalette(newPalette);
    }
  };

  // Función para alternar el modo de paleta
  const togglePaletteMode = () => {
    setIsIndexedMode(!isIndexedMode);
    setIsEditingPalette(false);
    closeAllPickers();
  };

  // Función para refrescar la paleta indexada
  const refreshIndexedPalette = () => {
    if (isIndexedMode) {
      generateIndexedPalette();
      console.log(indexedPalette);
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

  // Obtener la paleta actual según el modo
  const currentPalette = isIndexedMode ? indexedPalette : actualPalette;


  // Modificación en la información de la paleta indexada para mostrar el conteo correcto
const getIndexedPaletteInfo = () => {
  if (isGeneratingPalette) return 'Generando...';
  
  const totalPixels = indexedPalette.reduce((sum, color) => sum + (color.pixels ? color.pixels.length : 0), 0);
  const uniqueColors = indexedPalette.length;
  
  return `${uniqueColors} colores únicos, ${totalPixels} píxeles${includeAlpha ? ' (con alpha)' : ' (RGB only)'}`;
};

// Modificación en el título del color para mostrar información de alpha
const getColorTitle = (color, index) => {
  if (!isIndexedMode) {
    return isEditingPalette 
      ? 'Editar color' 
      : `Click izquierdo: ${primaryColorData.label} | Click derecho: ${secondaryColorData.label}`;
  }
  
  const pixelCount = color.pixels ? color.pixels.length : 0;
  const alphaInfo = includeAlpha ? `, A:${Math.round(color.a * 255)}` : '';
  
  if (!includeAlpha && color.alphaVariants && color.alphaVariants.size > 1) {
    const alphaValues = Array.from(color.alphaVariants.keys()).sort((a, b) => b - a);
    return `RGB(${color.r}, ${color.g}, ${color.b}) - ${pixelCount} píxeles con transparencias: ${alphaValues.map(a => Math.round(a * 255)).join(', ')}`;
  }
  
  return `RGB(${color.r}, ${color.g}, ${color.b}${alphaInfo}) - ${pixelCount} píxeles`;
};

//agregamos un actualizador de la paleta cada que detecte presionado el mouse:

useEffect(()=>{

  generateIndexedPalette()
},[isPressed ])

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
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
              <label className="layer-color-label">{primaryColorData.label}</label> 
              <PiMouseLeftClickFill/>
              </div>
              
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
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
              <label className="layer-color-label">{secondaryColorData.label}</label> 
              <PiMouseRightClickFill/>
              </div>
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
          <h4 className="color-palette-title">
            {isIndexedMode ? 'Indexed Palette' : 'Color Palette'}
          </h4>
          <div className="palette-controls">
            {/* Toggle para cambiar modo de paleta */}
            <button
              className={`palette-mode-btn ${isIndexedMode ? 'indexed-active' : ''}`}
              onClick={togglePaletteMode}
              title={isIndexedMode ? 'Cambiar a paleta normal' : 'Cambiar a paleta indexada'}
            >
              <LuPalette size={14} />
            </button>
            
            {/* Botón de refrescar (solo en modo indexado) */}
            {isIndexedMode && (
              <button
                className={`palette-refresh-btn ${isGeneratingPalette ? 'refreshing' : ''}`}
                onClick={refreshIndexedPalette}
                disabled={isGeneratingPalette}
                title="Refrescar paleta indexada"
              >
                <LuRefreshCw size={14} />
              </button>
            )}
            
            {/* Botón de editar (solo en modo normal) */}
            {!isIndexedMode && (
              <button
                className={`palette-edit-btn ${isEditingPalette ? 'active' : ''}`}
                onClick={() => setIsEditingPalette(!isEditingPalette)}
                title={isEditingPalette ? 'Finalizar edición' : 'Editar paleta'}
              >
                {isEditingPalette ? <LuCheck size={14} /> : <LuPencil size={14} />}
              </button>
            )}
          </div>
        </div>

{/* Información y controles de la paleta indexada */}
{isIndexedMode && (
  <>
    <div className="indexed-palette-controls">
      <div className="alpha-mode-section">
        <div className="alpha-mode-header">
          <h5 className="alpha-mode-title">Alpha Channel Mode</h5>
          <div className="alpha-mode-toggle">
            <input
              type="checkbox"
              id="alpha-toggle"
              checked={includeAlpha}
              onChange={(e) => {
                setIncludeAlpha(e.target.checked);
                if (isIndexedMode) {
                  setTimeout(() => generateIndexedPalette(), 100);
                }
              }}
              className="layer-toggle-input"
            />
            <label htmlFor="alpha-toggle" className="layer-toggle-label">
              <span className="toggle-state-text">
                {includeAlpha ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>
        </div>
        
        <div className="alpha-mode-explanation">
          
        </div>
      </div>
    </div>
    
   
  </>
)}

        <div className="color-palette-grid">
        {currentPalette.map((color, index) => (
  <div
    key={isIndexedMode ? `indexed-${index}` : `normal-${index}`}
    className={`palette-color-item ${editingColorIndex === index && !isIndexedMode ? 'editing' : ''}`}
  >
    <div
      className="palette-color-swatch"
      style={{
        backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
      }}
      onClick={(e) => handlePaletteColorClick(color, index, e)}
      onMouseDown={(e) => handlePaletteColorClick(color, index, e)}
      onContextMenu={preventContextMenu}
      title={getColorTitle(color, index)}
    >
      {editingColorIndex === index && !isIndexedMode && (
        <div className="editing-indicator">
          <div className="editing-dot"></div>
        </div>
      )}
      
      {/* Mostrar número de píxeles en modo indexado */}
      {isIndexedMode && color.pixels && (
        <div className="pixel-count">
          {color.pixels.length}
        </div>
      )}
    </div>

    {/* Botón de edición para colores indexados */}
    {isIndexedMode && (
      <button
        className="palette-edit-indexed-btn"
        onClick={() => startEditingIndexedColor(color, index)}
        title={`Editar color (${color.pixels ? color.pixels.length : 0} píxeles)`}
      >
        <LuPencil size={10} />
      </button>
    )}

    {/* Botón de eliminación para paleta normal */}
    {isEditingPalette && !isIndexedMode && (
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

          {isEditingPalette && !isIndexedMode && (
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

        {/* Mensaje cuando no hay colores en la paleta indexada */}
        {isIndexedMode && indexedPalette.length === 0 && !isGeneratingPalette && (
          <div className="empty-indexed-palette">
            <p>No se encontraron colores en la capa actual</p>
          </div>
        )}
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

      {showPalettePicker && editingColorIndex !== null && !isIndexedMode && (
        <ToolColorPicker
          color={actualPalette[editingColorIndex]}
          onChange={updatePaletteColor}
          hexColor={paletteColorHex}
          setHexColor={setPaletteColorHex}
        />
      )}

{showIndexedColorPicker && editingIndexedColor && (
  <div className="indexed-color-picker-container">
    <div className="indexed-color-picker-header">
      <h4>Editar Color Indexado</h4>
      <div className="indexed-color-picker-info">
        {editingIndexedColor.color.pixels ? editingIndexedColor.color.pixels.length : 0} píxeles afectados
      </div>
    </div>
    <ToolColorPicker
      color={editingIndexedColor.color}
      onChange={applyIndexedColorChange}
      hexColor={indexedColorHex}
      setHexColor={setIndexedColorHex}
    />
    <div className="indexed-color-picker-actions">
      <button
        className="indexed-color-finish-btn"
        onClick={finishEditingIndexedColor}
      >
        <LuCheck size={14} />
        Finalizar
      </button>
    </div>
  </div>
)}

      <style jsx>{`
       
      `}</style>
    </div>
  );
};

export default LayerColor;