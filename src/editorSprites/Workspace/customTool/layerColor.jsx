import { useEffect, useState } from "react";
import { LuPencil, LuTrash2, LuPlus, LuCheck, LuX, LuPalette, LuRefreshCw } from "react-icons/lu";
import ToolColorPicker from "./tools/toolColorPicker";
import { PiMouseLeftClickFill } from "react-icons/pi";
import { PiMouseRightClickFill } from "react-icons/pi";
import CustomSelect from "./customSelect";
import './layerColor.css'

const LayerColor = ({ tool, toolParameters, setToolParameters, getLayerPixelData, currentFrame=1, activeLayerId, paintPixelsRGBA, isPressed }) => {
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

  // Estados para el modo gradiente
  const [isGradientMode, setIsGradientMode] = useState(false);
  const [gradientStops, setGradientStops] = useState([
    { position: 0, color: { r: 0, g: 0, b: 0, a: 1 }, id: 1 },
    { position: 100, color: { r: 255, g: 255, b: 255, a: 1 }, id: 2 }
  ]);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [gradientType, setGradientType] = useState('linear');
  const [gradientAngle, setGradientAngle] = useState(90);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Estados para la edición de colores indexados
  const [editingIndexedColor, setEditingIndexedColor] = useState(null);
  const [showIndexedColorPicker, setShowIndexedColorPicker] = useState(false);
  const [indexedColorHex, setIndexedColorHex] = useState('#000000');
  const [includeAlpha, setIncludeAlpha] = useState(false);

  // Estados para la paleta de colores
  const [utilColors, setUtilColors] = useState([{"r":0,"g":0,"b":0,"a":1},{"r":255,"g":255,"b":255,"a":1},{"r":255,"g":0,"b":0,"a":0}]);
  const [actualPalette, setActualPalette] = useState([]);
  const [showPalettePicker, setShowPalettePicker] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState(null);
  const [isEditingPalette, setIsEditingPalette] = useState(false);
  const [paletteColorHex, setPaletteColorHex] = useState('#000000');
  const [selectedPaletteName, setSelectedPaletteName] = useState('Default');

  // Estados para el indexed palette
  const [isIndexedMode, setIsIndexedMode] = useState(false);
  const [indexedPalette, setIndexedPalette] = useState([]);
  const [isGeneratingPalette, setIsGeneratingPalette] = useState(false);

  // NUEVO: Estado para colores recientes
  const [recentColors, setRecentColors] = useState([]);

  // Definición de paletas de colores predefinidas organizadas por categorías
  const colorPalettes = {
    "Básicas": [
      {
        value: "default",
        label: "Default",
        description: "Colores básicos",
        colors: [
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
        ]
      },
      {
        value: "recent_colors",
        label: "Colores Recientes",
        description: "Últimos 14 colores usados",
        colors: [] // Se llenará dinámicamente
      },
      {
        value: "grayscale",
        label: "Escala de Grises",
        description: "Tonos de gris",
        colors: [
          { r: 0, g: 0, b: 0, a: 1 },
          { r: 32, g: 32, b: 32, a: 1 },
          { r: 64, g: 64, b: 64, a: 1 },
          { r: 96, g: 96, b: 96, a: 1 },
          { r: 128, g: 128, b: 128, a: 1 },
          { r: 160, g: 160, b: 160, a: 1 },
          { r: 192, g: 192, b: 192, a: 1 },
          { r: 224, g: 224, b: 224, a: 1 },
          { r: 255, g: 255, b: 255, a: 1 },
        ]
      }
    ],
    "Naturales": [
      {
        value: "earth",
        label: "Tierra",
        description: "Tonos terrosos",
        colors: [
          { r: 101, g: 67, b: 33, a: 1 },    // Marrón oscuro
          { r: 139, g: 69, b: 19, a: 1 },    // Silla de montar marrón
          { r: 160, g: 82, b: 45, a: 1 },    // Siena quemada
          { r: 205, g: 133, b: 63, a: 1 },   // Perú
          { r: 222, g: 184, b: 135, a: 1 },  // Madera flotante
          { r: 245, g: 245, b: 220, a: 1 },  // Beige
          { r: 107, g: 142, b: 35, a: 1 },   // Verde oliva
          { r: 85, g: 107, b: 47, a: 1 },    // Verde oliva oscuro
        ]
      },
      {
        value: "ocean",
        label: "Océano",
        description: "Tonos azules y turquesas",
        colors: [
          { r: 0, g: 119, b: 190, a: 1 },    // Azul océano
          { r: 0, g: 150, b: 136, a: 1 },    // Verde azulado
          { r: 64, g: 224, b: 208, a: 1 },   // Turquesa
          { r: 175, g: 238, b: 238, a: 1 },  // Azul pálido
          { r: 72, g: 61, b: 139, a: 1 },    // Azul pizarra oscuro
          { r: 123, g: 104, b: 238, a: 1 },  // Azul medio pizarra
          { r: 135, g: 206, b: 250, a: 1 },  // Azul cielo claro
          { r: 25, g: 25, b: 112, a: 1 },    // Azul medianoche
        ]
      },
      {
        value: "forest",
        label: "Bosque",
        description: "Verdes naturales",
        colors: [
          { r: 34, g: 139, b: 34, a: 1 },    // Verde bosque
          { r: 0, g: 100, b: 0, a: 1 },      // Verde oscuro
          { r: 50, g: 205, b: 50, a: 1 },    // Verde lima
          { r: 124, g: 252, b: 0, a: 1 },    // Verde césped
          { r: 173, g: 255, b: 47, a: 1 },   // Verde amarillo
          { r: 85, g: 107, b: 47, a: 1 },    // Verde oliva oscuro
          { r: 107, g: 142, b: 35, a: 1 },   // Verde oliva
          { r: 46, g: 125, b: 50, a: 1 },    // Verde bosque profundo
        ]
      }
    ],
    "Vibrantes": [
      {
        value: "neon",
        label: "Neón",
        description: "Colores fluorescentes",
        colors: [
          { r: 255, g: 20, b: 147, a: 1 },   // Rosa profundo
          { r: 0, g: 255, b: 255, a: 1 },    // Cyan
          { r: 50, g: 205, b: 50, a: 1 },    // Verde lima
          { r: 255, g: 255, b: 0, a: 1 },    // Amarillo
          { r: 255, g: 69, b: 0, a: 1 },     // Rojo naranja
          { r: 138, g: 43, b: 226, a: 1 },   // Azul violeta
          { r: 255, g: 105, b: 180, a: 1 },  // Rosa claro
          { r: 0, g: 255, b: 127, a: 1 },    // Verde primavera
        ]
      },
      {
        value: "sunset",
        label: "Atardecer",
        description: "Colores cálidos del atardecer",
        colors: [
          { r: 255, g: 94, b: 77, a: 1 },    // Rojo coral
          { r: 255, g: 154, b: 0, a: 1 },    // Naranja
          { r: 255, g: 206, b: 84, a: 1 },   // Amarillo dorado
          { r: 255, g: 138, b: 101, a: 1 },  // Melocotón
          { r: 241, g: 91, b: 181, a: 1 },   // Rosa vibrante
          { r: 155, g: 89, b: 182, a: 1 },   // Púrpura suave
          { r: 52, g: 152, b: 219, a: 1 },   // Azul cielo
          { r: 46, g: 204, b: 113, a: 1 },   // Verde esmeralda
        ]
      }
    ],
    "Pasteles": [
      {
        value: "soft_pastels",
        label: "Pasteles Suaves",
        description: "Colores pastel delicados",
        colors: [
          { r: 255, g: 182, b: 193, a: 1 },  // Rosa claro
          { r: 173, g: 216, b: 230, a: 1 },  // Azul claro
          { r: 144, g: 238, b: 144, a: 1 },  // Verde claro
          { r: 255, g: 255, b: 224, a: 1 },  // Amarillo claro
          { r: 221, g: 160, b: 221, a: 1 },  // Ciruela
          { r: 255, g: 218, b: 185, a: 1 },  // Melocotón suave
          { r: 230, g: 230, b: 250, a: 1 },  // Lavanda
          { r: 240, g: 248, b: 255, a: 1 },  // Azul alice
        ]
      },
      {
        value: "candy",
        label: "Dulces",
        description: "Colores de caramelo",
        colors: [
          { r: 255, g: 192, b: 203, a: 1 },  // Rosa
          { r: 255, g: 160, b: 122, a: 1 },  // Salmón claro
          { r: 255, g: 218, b: 185, a: 1 },  // Melocotón suave
          { r: 255, g: 239, b: 213, a: 1 },  // Papaya batido
          { r: 221, g: 160, b: 221, a: 1 },  // Ciruela
          { r: 176, g: 196, b: 222, a: 1 },  // Azul acero claro
          { r: 152, g: 251, b: 152, a: 1 },  // Verde pálido
          { r: 255, g: 250, b: 205, a: 1 },  // Seda de maíz
        ]
      }
    ],
    "Retro": [
      {
        value: "vintage",
        label: "Vintage",
        description: "Colores vintage",
        colors: [
          { r: 205, g: 92, b: 92, a: 1 },    // Rojo indio
          { r: 218, g: 165, b: 32, a: 1 },   // Vara dorada
          { r: 184, g: 134, b: 11, a: 1 },   // Vara dorada oscura
          { r: 139, g: 69, b: 19, a: 1 },    // Silla de montar marrón
          { r: 160, g: 82, b: 45, a: 1 },    // Siena quemada
          { r: 85, g: 107, b: 47, a: 1 },    // Verde oliva oscuro
          { r: 72, g: 61, b: 139, a: 1 },    // Azul pizarra oscuro
          { r: 112, g: 128, b: 144, a: 1 },  // Gris pizarra
        ]
      },
      {
        value: "pixel_art",
        label: "Pixel Art",
        description: "Paleta de 8-bit",
        colors: [
          { r: 0, g: 0, b: 0, a: 1 },        // Negro
          { r: 255, g: 255, b: 255, a: 1 },  // Blanco
          { r: 255, g: 0, b: 0, a: 1 },      // Rojo
          { r: 0, g: 255, b: 0, a: 1 },      // Verde
          { r: 0, g: 0, b: 255, a: 1 },      // Azul
          { r: 255, g: 255, b: 0, a: 1 },    // Amarillo
          { r: 255, g: 0, b: 255, a: 1 },    // Magenta
          { r: 0, g: 255, b: 255, a: 1 },    // Cyan
          { r: 128, g: 128, b: 128, a: 1 },  // Gris
        ]
      }
    ]
  };

  // Herramientas que necesitan configuración de formas
  const shapeTools = ['circle', 'ellipse', 'square', 'rectangle', 'polygon', 'triangle'];
  const isShapeTool = shapeTools.includes(tool);

  // NUEVO: Función para añadir color a recientes
// NUEVO: Función mejorada para añadir color a recientes
const addToRecentColors = (color) => {
  setRecentColors(prev => {
    // Buscar si el color ya existe
    const existingIndex = prev.findIndex(recentColor => 
      recentColor.r === color.r && 
      recentColor.g === color.g && 
      recentColor.b === color.b && 
      recentColor.a === color.a
    );

    // Si el color ya existe, moverlo al frente
    if (existingIndex !== -1) {
      const newRecents = [...prev];
      const [existingColor] = newRecents.splice(existingIndex, 1);
      return [existingColor, ...newRecents];
    }

    // Si no existe, agregarlo al frente
    const newRecents = [color, ...prev];
    // Mantener solo los últimos 14 colores
    return newRecents.slice(0, 14);
  });
};

  // NUEVO: Función para eliminar stop del gradiente
  const removeGradientStop = (id) => {
    if (gradientStops.length <= 2) return; // No permitir menos de 2 stops
    
    setGradientStops(prev => prev.filter(stop => stop.id !== id));
    
    // Si estamos eliminando el stop seleccionado, limpiar la selección
    if (selectedStopId === id) {
      setSelectedStopId(null);
      setShowGradientPicker(false);
    }
  };

  // Inicializar con la paleta por defecto
  useEffect(() => {
    if (actualPalette.length === 0) {
      const defaultPalette = colorPalettes["Básicas"][0];
      setActualPalette(defaultPalette.colors);
      setSelectedPaletteName(defaultPalette.label);
    }
  }, []);

  // NUEVO: Actualizar la paleta de colores recientes cuando cambie el estado
  useEffect(() => {
    // Actualizar la paleta de colores recientes en colorPalettes
    const recentPalette = colorPalettes["Básicas"].find(p => p.value === "recent_colors");
    if (recentPalette) {
      recentPalette.colors = recentColors;
    }
  
    // ✅ CLAVE: Si estamos viendo la paleta de recientes, actualizarla automáticamente
    if (selectedPaletteName === "Colores Recientes") {
      setActualPalette(recentColors);
    }
  }, [recentColors, selectedPaletteName]);

  // Función para cambiar la paleta seleccionada
  const handlePaletteChange = (selectedOption) => {
    // Buscar la paleta en todas las categorías
    let foundPalette = null;
    for (const category of Object.values(colorPalettes)) {
      foundPalette = category.find(palette => palette.value === selectedOption.value);
      if (foundPalette) break;
    }
    
    if (foundPalette) {
      // Si es la paleta de colores recientes, usar los colores actuales
      if (foundPalette.value === "recent_colors") {
        setActualPalette(recentColors);
        setSelectedPaletteName("Colores Recientes");
      } else {
        setActualPalette(foundPalette.colors);
        setSelectedPaletteName(foundPalette.label);
      }
      setIsEditingPalette(false);
      closeAllPickers();
    }
  };

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
      pixels.forEach((pixel, index) => {
        const specificColor = specificColors[index];
        paintPixelsRGBA(layerId, frameIndex, [pixel], specificColor.color);
      });
    } else {
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

  // Funciones para el modo gradiente
  const generateGradientCSS = (barType) => {
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
    const stopsCSS = sortedStops.map(stop => 
      `rgba(${stop.color.r}, ${stop.color.g}, ${stop.color.b}, ${stop.color.a}) ${stop.position}%`
    ).join(', ');

    if(barType ==='stopsBar'){
      return `linear-gradient(${90}deg, ${stopsCSS})`;
    }
    
    else{
      if (gradientType === 'linear') {
        return `linear-gradient(${gradientAngle}deg, ${stopsCSS})`;
      } else {
        return `radial-gradient(circle, ${stopsCSS})`;
      }
    }
  };

  const addGradientStop = (position) => {
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
    const newId = Math.max(...gradientStops.map(s => s.id)) + 1;
    
    let newColor = { r: 128, g: 128, b: 128, a: 1 };
    
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const left = sortedStops[i];
      const right = sortedStops[i + 1];
      
      if (position >= left.position && position <= right.position) {
        const ratio = (position - left.position) / (right.position - left.position);
        newColor = {
          r: Math.round(left.color.r + (right.color.r - left.color.r) * ratio),
          g: Math.round(left.color.g + (right.color.g - left.color.g) * ratio),
          b: Math.round(left.color.b + (right.color.b - left.color.b) * ratio),
          a: left.color.a + (right.color.a - left.color.a) * ratio
        };
        break;
      }
    }
    
    const newStop = { position, color: newColor, id: newId };
    setGradientStops([...gradientStops, newStop]);
    setSelectedStopId(newId);
    
    closeAllPickers();
    setTimeout(() => {
      setShowGradientPicker(true);
    }, 10);
  };

  const removeGradientStopOld = (id) => {
    if (gradientStops.length <= 2) return;
    setGradientStops(gradientStops.filter(stop => stop.id !== id));
    if (selectedStopId === id) {
      setSelectedStopId(null);
      setShowGradientPicker(false);
    }
  };

  const updateGradientStop = (id, updates) => {
    setGradientStops(gradientStops.map(stop => 
      stop.id === id ? { ...stop, ...updates } : stop
    ));
  };

  const selectGradientStop = (id) => {
    setSelectedStopId(id);
    closeAllPickers();
    setTimeout(() => {
      setShowGradientPicker(true);
    }, 10);
  };

  const handleGradientBarClick = (e) => {
    if (isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    addGradientStop(Math.max(0, Math.min(100, position)));
  };

  const handleStopMouseDown = (e, stopId) => {
    e.stopPropagation();
    e.preventDefault();
    
    const rect = e.currentTarget.closest('.gradient-bar-container').getBoundingClientRect();
    const stopElement = e.currentTarget;
    const stopRect = stopElement.getBoundingClientRect();
    
    const offset = e.clientX - (stopRect.left + stopRect.width / 2);
    
    setIsDragging(true);
    setDragOffset(offset);
    setSelectedStopId(stopId);
    
    const handleMouseMove = (moveEvent) => {
      const newX = moveEvent.clientX - rect.left - offset;
      const newPosition = Math.max(0, Math.min(100, (newX / rect.width) * 100));
      
      updateGradientStop(stopId, { position: newPosition });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragOffset(0);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleStopClick = (e, stopId) => {
    e.stopPropagation();
    if (!isDragging) {
      selectGradientStop(stopId);
    }
  };

  const handleStopDoubleClick = (e, stopId) => {
    e.stopPropagation();
    if (!isDragging) {
      selectGradientStop(stopId);
    }
  };

  // Función para generar la paleta indexada desde los píxeles
  const generateIndexedPalette = async () => {
    setIsGeneratingPalette(true);
    
    try {
      const pixelData = getLayerPixelData(currentFrame, activeLayerId);
      
      if (!pixelData || pixelData.length === 0) {
        setIndexedPalette([]);
        setIsGeneratingPalette(false);
        return;
      }

      const uniqueColors = new Map();
      let processedPixels = 0;
      let skippedTransparent = 0;
      
      pixelData.forEach(pixel => {
        const { r, g, b, a } = pixel.color;
        const { x, y } = pixel;
        
        if (a === 0) {
          skippedTransparent++;
          return;
        }
        
        processedPixels++;
        
        const colorKey = includeAlpha 
          ? `${r},${g},${b},${a}`
          : `${r},${g},${b}`;
        
        if (!uniqueColors.has(colorKey)) {
          uniqueColors.set(colorKey, { 
            color: includeAlpha 
              ? { r, g, b, a }
              : { r, g, b, a: 1 },
            pixels: [], 
            alphaVariants: includeAlpha ? null : new Map()
          });
        }
        
        const colorData = uniqueColors.get(colorKey);
        
        const pixelInfo = { 
          x, 
          y, 
          originalAlpha: a
        };
        
        colorData.pixels.push(pixelInfo);
        
        if (!includeAlpha && colorData.alphaVariants) {
          if (!colorData.alphaVariants.has(a)) {
            colorData.alphaVariants.set(a, []);
          }
          colorData.alphaVariants.get(a).push(pixelInfo);
        }
      });

      const uniqueColorsArray = Array.from(uniqueColors.values())
        .map((item, index) => ({
          ...item.color,
          pixels: item.pixels,
          alphaVariants: item.alphaVariants,
          index: index
        }))
        .sort((a, b) => {
          const brightnessA = (a.r * 299 + a.g * 587 + a.b * 114) / 1000;
          const brightnessB = (b.r * 299 + b.g * 587 + b.b * 114) / 1000;
          return brightnessB - brightnessA;
        })
        .map((item, index) => ({ ...item, index }));

      setIndexedPalette(uniqueColorsArray);
      
    } catch (error) {
      console.error('Error generando paleta indexada:', error);
      setIndexedPalette([]);
    } finally {
      setIsGeneratingPalette(false);
    }
  };

  // Resto de funciones para indexed palette...
  const startEditingIndexedColor = (color, index) => {
    setEditingIndexedColor({ color, index });
    setIndexedColorHex(rgbToHex(color));
    closeAllPickers();
    setShowIndexedColorPicker(true);
  };

  const applyIndexedColorChange = (newColor) => {
    if (!editingIndexedColor) return;
    
    const { index } = editingIndexedColor;
    const colorData = indexedPalette[index];
    
    if (!colorData || !colorData.pixels) return;
    
    if (includeAlpha) {
      const uniformColor = {
        r: newColor.r,
        g: newColor.g,
        b: newColor.b,
        a: newColor.a
      };
      
      const pixelPositions = colorData.pixels.map(pixel => ({ x: pixel.x, y: pixel.y }));
      paintPixelsRGBA(activeLayerId, currentFrame, pixelPositions, uniformColor);
      
    } else {
      colorData.pixels.forEach((pixel) => {
        const alphaToUse = pixel.hasOwnProperty('originalAlpha') ? pixel.originalAlpha : 1;
        
        const pixelColor = {
          r: newColor.r,
          g: newColor.g,
          b: newColor.b,
          a: alphaToUse/255
        };
        
        paintPixelsRGBA(
          activeLayerId,
          currentFrame,
          [{ x: pixel.x, y: pixel.y }],
          pixelColor
        );
      });
    }
    
    const updatedPalette = [...indexedPalette];
    updatedPalette[index] = {
      ...updatedPalette[index],
      r: newColor.r,
      g: newColor.g,
      b: newColor.b,
      a: includeAlpha ? newColor.a : updatedPalette[index].a
    };
    setIndexedPalette(updatedPalette);
  };

  const finishEditingIndexedColor = () => {
    setEditingIndexedColor(null);
    setShowIndexedColorPicker(false);
    setTimeout(() => generateIndexedPalette(), 100);
  };

  // Efectos
  useEffect(() => {
    if (isIndexedMode) {
      generateIndexedPalette();
    }
  }, [isIndexedMode, currentFrame, activeLayerId]);

  useEffect(() => {
    setHexForeground(rgbToHex(foregroundColor));
    setHexBackground(rgbToHex(backgroundColor));
    setHexFill(rgbToHex(fillColor));
    setHexBorder(rgbToHex(borderColor));
  }, [foregroundColor, backgroundColor, fillColor, borderColor]);

  useEffect(()=>{
    generateIndexedPalette()
  },[isPressed ]);

  useEffect(()=>{
    if(toolParameters.isGradientMode){
      setIsGradientMode(true);
    }
    else{
      setIsGradientMode(false);
    }
  },[toolParameters]);

  // NUEVO: Efecto para agregar colores a recientes cuando cambian
  useEffect(() => {
    // Solo agregar a recientes cuando isPressed no es null (se está usando la herramienta)
    if (isPressed !== null) {
      if (isShapeTool) {
        addToRecentColors(borderColor);
        addToRecentColors(fillColor);
      } else {
        addToRecentColors(foregroundColor); 
        addToRecentColors(backgroundColor);
      }
    }
  }, [isPressed, foregroundColor, backgroundColor, fillColor, borderColor]);

  // Cerrar todos los color pickers
  const closeAllPickers = () => {
    setShowPrimaryPicker(false);
    setShowSecondaryPicker(false);
    setShowPalettePicker(false);
    setShowIndexedColorPicker(false);
    setShowGradientPicker(false);
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

  const handlePaletteColorClick = (color, index, event) => {
    event.preventDefault();
    
    if (isIndexedMode) {
      if (event.button === 2) {
        applyPaletteColorToSecondary(color);
      } else {
        applyPaletteColorToPrimary(color);
      }
    } else {
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

  const applyPaletteColorToGradientStop = (color) => {
    if (selectedStopId !== null) {
      updateGradientStop(selectedStopId, { color });
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
    if (isGradientMode) {
      setToolParameters(prev => ({
        ...prev,
        gradientStops: gradientStops,
        gradientType: gradientType,
        gradientAngle: gradientAngle
      }));
    } else if (isShapeTool) {
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
    setToolParameters,
    isGradientMode,
    gradientStops,
    gradientType,
    gradientAngle
  ]);

  const getSelectedStopColor = () => {
    if (selectedStopId === null) return { r: 0, g: 0, b: 0, a: 1 };
    const selectedStop = gradientStops.find(s => s.id === selectedStopId);
    return selectedStop ? selectedStop.color : { r: 0, g: 0, b: 0, a: 1 };
  };

  const getSelectedStopHex = () => {
    const color = getSelectedStopColor();
    return rgbToHex(color);
  };

  // Obtener la paleta actual según el modo
  const currentPalette = isIndexedMode ? indexedPalette : actualPalette;

  const getIndexedPaletteInfo = () => {
    if (isGeneratingPalette) return 'Generando...';
    
    const totalPixels = indexedPalette.reduce((sum, color) => sum + (color.pixels ? color.pixels.length : 0), 0);
    const uniqueColors = indexedPalette.length;
    
    return `${uniqueColors} colores únicos, ${totalPixels} píxeles${includeAlpha ? ' (con alpha)' : ' (RGB only)'}`;
  };

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

  // Función para renderizar el preview de colores en el CustomSelect
  const renderPaletteOption = (option) => {
    // Buscar la paleta completa
    let fullPalette = null;
    for (const category of Object.values(colorPalettes)) {
      fullPalette = category.find(palette => palette.value === option.value);
      if (fullPalette) break;
    }

    // Si es la paleta de colores recientes, usar los colores actuales
    if (option.value === "recent_colors") {
      fullPalette = { ...fullPalette, colors: recentColors };
    }

    return (
      <div className="palette-option">
        <div className="palette-option-info">
          <span className="palette-option-label">{option.label}</span>
          <span className="palette-option-description">{option.description}</span>
        </div>
        <div className="palette-option-preview">
          {fullPalette && fullPalette.colors.slice(0, 6).map((color, index) => (
            <div
              key={index}
              className="palette-preview-color"
              style={{
                backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                margin: '0 1px'
              }}
            />
          ))}
          {fullPalette && fullPalette.colors.length > 6 && (
            <span className="palette-preview-more">+{fullPalette.colors.length - 6}</span>
          )}
          {fullPalette && fullPalette.colors.length === 0 && (
            <span className="palette-preview-empty">Vacía</span>
          )}
        </div>
      </div>
    );
  };

  // Función para renderizar la selección actual
  const renderSelectedPalette = (option) => {
    if (!option) return selectedPaletteName;
    
    // Buscar la paleta completa
    let fullPalette = null;
    for (const category of Object.values(colorPalettes)) {
      fullPalette = category.find(palette => palette.value === option.value);
      if (fullPalette) break;
    }

    // Si es la paleta de colores recientes, usar los colores actuales
    if (option.value === "recent_colors") {
      fullPalette = { ...fullPalette, colors: recentColors };
    }

    return (
      <div className="selected-palette">
        <span className="selected-palette-name">{option.label}</span>
        <div className="selected-palette-preview">
          {fullPalette && fullPalette.colors.slice(0, 4).map((color, index) => (
            <div
              key={index}
              className="selected-preview-color"
              style={{
                backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
                width: '8px',
                height: '8px',
                borderRadius: '1px',
                margin: '0 1px'
              }}
            />
          ))}
          {fullPalette && fullPalette.colors.length === 0 && (
            <span className="selected-preview-empty">—</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="layer-color-container" 
    onContextMenu={preventContextMenu}
    >
      <div className="layer-color-header">
        <h3 className="layer-color-title">Colors</h3>
        <div className="header-controls">
          
        </div>
      </div>

      <div className="layer-color-content">
        {/* Mostrar colores normales o editor de gradiente según el modo */}
        {!isGradientMode || tool != 'fill' ? (
          // Colores principales normales
          <div className="primary-colors-section">
            <div className="primary-colors-row">
              {/* Color Primario (Foreground/Border) */}
              <div className="layer-color-item">
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
                <label className="layer-color-label">{primaryColorData.label}</label> 
                <PiMouseLeftClickFill/>
                </div>
                
                <div className="layer-color-input-wrapper">
                <div className="layer-color-overlay">
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
                  </div>
                  <span className="layer-color-hex">{primaryColorData.hex}</span>
                </div>
              </div>

              <div className="layer-util-colors">
                    {utilColors.map((color,index)=>(
                     
                    <div className="util-color-overlay">
                        <button
                      key={`util-color-${index}` }
                      className="util-color-button"
                      
                      onMouseDown={(e)=>handlePaletteColorClick(color, index, e)}
                      style={{
                        background:`rgba(${color.r},${color.g},${color.b},${color.a})`
                      }}
                      >
                      </button>
                    </div>
                    
                      
                   
                
                    ))}
              </div>

              {/* Color Secundario (Background/Fill) */}
              <div className="layer-color-item">
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
                <label className="layer-color-label">{secondaryColorData.label}</label> 
                <PiMouseRightClickFill/>
                </div>
                <div className="layer-color-input-wrapper">
                  <div className="layer-color-overlay">
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
                    </div>
                 
                  <span className="layer-color-hex">{secondaryColorData.hex}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Editor de gradiente
          <div className="gradient-editor-section">
            <div className="gradient-section">
              {/* Preview del gradiente */}
              <div className="gradient-preview-container">
                <div className="gradient-preview-label">Preview</div>
                <div 
                  className="gradient-preview"
                  style={{ background: generateGradientCSS() }}
                ></div>
              </div>

              {/* Controles de tipo de gradiente */}
              <div className="gradient-type-controls">
                <div className="gradient-type-buttons">
                  <button
                    className={`gradient-type-btn ${gradientType === 'linear' ? 'active' : ''}`}
                    onClick={() => setGradientType('linear')}
                  >
                    Lineal
                  </button>
                  <button
                    className={`gradient-type-btn ${gradientType === 'radial' ? 'active' : ''}`}
                    onClick={() => setGradientType('radial')}
                  >
                    Radial
                  </button>
                </div>
                
                {/* Control de ángulo (solo para gradientes lineales) */}
                {gradientType === 'linear' && (
                  <div className="gradient-angle-control">
                    <label className="gradient-angle-label">Ángulo: {gradientAngle}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={gradientAngle}
                      onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                      className="gradient-angle-slider"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Barra de gradiente con stops */}
            <div className="gradient-stops-container">
              <div 
                className="gradient-bar-container"
                onClick={handleGradientBarClick}
              >
                <div 
                  className="gradient-bar"
                  style={{ background: generateGradientCSS('stopsBar') }}
                ></div>
                <div className="gradient-stops-track">
                  {gradientStops.map(stop => (
                    <div
                      key={stop.id}
                      className={`gradient-stop ${selectedStopId === stop.id ? 'selected' : ''} ${isDragging && selectedStopId === stop.id ? 'dragging' : ''}`}
                      style={{ 
                        left: `${stop.position}%`,
                        backgroundColor: `rgba(${stop.color.r}, ${stop.color.g}, ${stop.color.b}, ${stop.color.a})`
                      }}
                      onMouseDown={(e) => handleStopMouseDown(e, stop.id)}
                      onClick={(e) => handleStopClick(e, stop.id)}
                      onDoubleClick={(e) => handleStopDoubleClick(e, stop.id)}
                      title={`Position: ${Math.round(stop.position)}% | Click to select | Drag to move`}
                    >
                      <div className="gradient-stop-handle"></div>
                        {/* NUEVO: Botón para eliminar stop seleccionado */}
              {selectedStopId === stop.id && gradientStops.length > 2 && (
               
                  <button
                
                    className="gradient-remove-stop-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // 🔥 ESTO EVITA LA PROPAGACIÓN
                      e.preventDefault();   // 🔥 OPCIONAL: evita comportamiento por defecto
                      removeGradientStop(stop.id);
                      console.log("Stop eliminado:", stop.id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation(); // 🔥 También detener en mouseDown
                    }}
                    title="Eliminar stop seleccionado"
                  >
                    <LuTrash2 size={14} />
                  
                  </button>
                
              )}
                    </div>
                  ))}
                </div>
              </div>
              
            
            </div>
          </div>
        )}
      </div>

      {/* Paleta de colores */}
      <div className="color-palette-container">
        <div className="color-palette-header">
          <h4 className="color-palette-title">
            {isIndexedMode ? 'Indexed Palette' : 'Color Palette'}
          </h4>
          <div className="palette-controls">
            {/* CustomSelect para cambiar paletas (solo en modo normal) */}
            {!isIndexedMode && (
              <CustomSelect
              width='100%'
              position="left"          // "top", "bottom", "left", "right"
       maxHeight="800px"         // Altura máxima del menú
       enableColumns={true}      // Habilitar columnas automáticas
       minColumnWidth="500px" 
                options={colorPalettes}
                placeholder="Seleccionar paleta"
                onSelect={handlePaletteChange}
                defaultValue={colorPalettes["Básicas"][0]}
             
                renderOption={renderPaletteOption}
                renderSelected={renderSelectedPalette}
              />
            )}
            
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
              </div>
            </div>
            
            <div className="indexed-palette-info">
              {getIndexedPaletteInfo()}
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
                onClick={(e) => {
                  if (isGradientMode && selectedStopId !== null) {
                    applyPaletteColorToGradientStop(color);
                  } else {
                    handlePaletteColorClick(color, index, e);
                  }
                }}
                onMouseDown={(e) => {
                  if (!isGradientMode) {
                    handlePaletteColorClick(color, index, e);
                  }
                }}
               onContextMenu={preventContextMenu}
                title={isGradientMode && selectedStopId !== null 
                  ? 'Click to apply to selected gradient stop' 
                  : getColorTitle(color, index)}
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
              {isIndexedMode && !isGradientMode && (
                <button
                  className="palette-edit-indexed-btn"
                  onClick={() => startEditingIndexedColor(color, index)}
                  title={`Editar color (${color.pixels ? color.pixels.length : 0} píxeles)`}
                >
                  <LuPencil size={10} />
                </button>
              )}

              {/* Botón de eliminación para paleta normal */}
              {isEditingPalette && !isIndexedMode && !isGradientMode && (
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

          {isEditingPalette && !isIndexedMode && !isGradientMode && (
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
        
        {/* NUEVO: Mensaje cuando la paleta de colores recientes está vacía */}
        {!isIndexedMode && selectedPaletteName === "Colores Recientes" && recentColors.length === 0 && (
          <div className="empty-recent-palette">
            <p>No hay colores recientes. Los colores aparecerán aquí cuando uses la herramienta.</p>
          </div>
        )}
      </div>

      {/* Color Pickers */}
      {showPrimaryPicker && !isGradientMode && (
         <ToolColorPicker
          color={primaryColorData.color}
          onChange={primaryColorData.setColor}
          hexColor={primaryColorData.hex}
          setHexColor={primaryColorData.setHex}
          closeFn={()=>{setShowPrimaryPicker(false);}}
        />
      )}

      {showSecondaryPicker && !isGradientMode && (
        <ToolColorPicker
          color={secondaryColorData.color}
          onChange={secondaryColorData.setColor}
          hexColor={secondaryColorData.hex}
          setHexColor={secondaryColorData.setHex}
          closeFn={()=>{setShowSecondaryPicker(false);}}
        />
      )}

      {showPalettePicker && editingColorIndex !== null && !isIndexedMode && !isGradientMode && (
        <ToolColorPicker
          color={actualPalette[editingColorIndex]}
          onChange={updatePaletteColor}
          hexColor={paletteColorHex}
          setHexColor={setPaletteColorHex}
        />
      )}

      {/* Color picker para gradiente */}
      {showGradientPicker && selectedStopId !== null && isGradientMode && (
        <ToolColorPicker
          color={getSelectedStopColor()}
          onChange={(newColor) => updateGradientStop(selectedStopId, { color: newColor })}
          hexColor={getSelectedStopHex()}
          setHexColor={() => {}}
          closeFn={()=>setShowGradientPicker(false)}
        />
      )}

      {showIndexedColorPicker && editingIndexedColor && !isGradientMode && (
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

    </div>
  );
};

export default LayerColor;