import React, { useState, useEffect, useRef, useCallback} from 'react';
import './workspace2.css';
import CustomTool from './customTool/customTool';
import { LuEye, LuEyeOff, LuTrash2, LuEraser, LuGroup ,LuUngroup, LuMousePointerBan, LuPaintBucket, LuPointerOff, LuGrid2X2  } from "react-icons/lu";
import { SlLayers } from "react-icons/sl";


// Constantes
const Tools = {
  Pincel: 'pencil',
  Seleccion: 'select',
  Borrar: 'eraser',
  Mover: 'pan',
  Rellenar: 'fill',
  Lazo: 'lassoSelect',
  RellenarGradiente: 'gradientFill'
};

const Workspace2 = ({ 
  width = 64,
  height = 64,
  initialLayers = [
    { id: 1, name: "Capa 0", visible: true, color: 0x00000000, pixels: [], zIndex: 0, group: [] }
  ],
  initialZoom = 10,
  toolParameters,
  setToolParameters,
  tool
}) => {

  // Estados principales
  const [zoom, setZoom] = useState(initialZoom);
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [groups, setGroups] = useState([]);

  // Referencias a elementos DOM
  const workspaceRef = useRef(null);
  const artboardRef = useRef(null);
  const canvasRefs = useRef({});
  const temporalCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  //Estado para control de activacion del grid:
  const [activeGrid, setActiveGrid] = useState(true);

  // Estado para control de panning
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  
  // Estado para control de herramientas de dibujo
  const [isMouseDown, setIsMouseDown] = useState(false);
  const lastPositionRef = useRef({ x: -1, y: -1 });

  // Estados para herramienta de selección
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [finalizedSelection, setFinalizedSelection] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Estados para el lazo
const [lassoPoints, setLassoPoints] = useState([]);
const [isDrawingLasso, setIsDrawingLasso] = useState(false);

  //=====================Funciones de utilidad =================
  
/**
 * Obtiene el color de un píxel en las coordenadas (x, y) de una capa específica
 * @param {number} x - Coordenada X del píxel
 * @param {number} y - Coordenada Y del píxel
 * @param {number} layerId - ID de la capa (opcional, si no se proporciona usa la capa seleccionada)
 * @returns {Object} - Color en formato {r, g, b, a} o null si es transparente
 */
const getPixelColor = (x, y, layerId = null) => {
  // Validar coordenadas
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return null;
  }

  // Usar la capa seleccionada si no se especifica una
  const targetLayerId = layerId !== null ? layerId : selectedLayerId;
  if (!targetLayerId) {
    return null;
  }

  // Buscar la capa
  const layer = layers.find(l => l.id === targetLayerId);
  if (!layer || !layer.visible) {
    return null;
  }

  // Obtener el índice del píxel
  const index = y * width + x;

  // Verificar que el índice esté dentro del rango
  if (index < 0 || index >= layer.pixels.length) {
    return null;
  }

  // Obtener el valor Uint32 del píxel
  const pixelValue = layer.pixels[index];

  // Si es transparente (0x00000000), devolver null
  if (pixelValue === 0x00000000) {
    return null;
  }

  // Convertir a formato RGBA
  return uint32ToRgba(pixelValue);
};
  // ==================== INICIALIZACIÓN ====================
  
  // Inicializar las capas al montar el componente
  useEffect(() => {
    const initializedLayers = initialLayers.map(layer => {
      // Crear Uint32Array para los píxeles
      const pixels = new Uint32Array(width * height);
      const transparent = colorStringToUint32("transparent");
      
      // Llenar con color inicial
      if (layer.color && layer.color !== "transparent") {
        const fillColor = colorStringToUint32(layer.color);
        pixels.fill(fillColor);
      } else {
        pixels.fill(transparent);
      }
      
      return {
        ...layer,
        pixels,
        buffer: pixels.buffer // Guardar buffer para transferencia
      };
    });
    
    setLayers(initializedLayers);
    if (initializedLayers.length > 0) {
      setSelectedLayerId(initializedLayers[0].id);
    }
  }, []);

  // ==================== MANEJO DE CAPAS ====================
  
  /**
   * Renderiza una capa específica en su canvas correspondiente
   * @param {Object} layer - La capa a renderizar
   */
  const renderLayer = (layer) => {
    if (!layer.visible || !canvasRefs.current[layer.id]) return;
    
    const canvas = canvasRefs.current[layer.id];
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Crear ImageData para renderizado eficiente
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < layer.pixels.length; i++) {
      const color = uint32ToRgba(layer.pixels[i]);
      if (color.a === 0) continue;
      
      const idx = i * 4;
      data[idx] = color.r;     // Red
      data[idx + 1] = color.g; // Green
      data[idx + 2] = color.b; // Blue
      data[idx + 3] = color.a; // Alpha
    }
    
    // Escalar el ImageData al tamaño del canvas
    const offscreen = new OffscreenCanvas(width, height);
    const offCtx = offscreen.getContext('2d');
    offCtx.putImageData(imageData, 0, 0);
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      offscreen, 
      0, 0, width, height,
      0, 0, width * zoom, height * zoom
    );
  };

  /**
   * Renderiza todas las capas cuando cambian los estados relevantes
   */
  useEffect(() => {
    layers.forEach(layer => renderLayer(layer));
  }, [layers, zoom, panOffset]);

  /**
   * Cambia la visibilidad de una capa
   * @param {number} id - ID de la capa
   */
  const toggleLayerVisibility = (id) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  /**
   * Mueve una capa hacia arriba en el orden de apilamiento
   * @param {number} id - ID de la capa
   */
  const moveLayerUp = (id) => {
    setLayers(prevLayers => {
      const layerIndex = prevLayers.findIndex(layer => layer.id === id);
      if (layerIndex < prevLayers.length - 1) {
        const newLayers = [...prevLayers];
        const currentZIndex = newLayers[layerIndex].zIndex;
        newLayers[layerIndex].zIndex = newLayers[layerIndex + 1].zIndex;
        newLayers[layerIndex + 1].zIndex = currentZIndex;
        return newLayers.sort((a, b) => a.zIndex - b.zIndex);
      }
      return prevLayers;
    });
  };

  /**
   * Mueve una capa hacia abajo en el orden de apilamiento
   * @param {number} id - ID de la capa
   */
  const moveLayerDown = (id) => {
    setLayers(prevLayers => {
      const layerIndex = prevLayers.findIndex(layer => layer.id === id);
      if (layerIndex > 0) {
        const newLayers = [...prevLayers];
        const currentZIndex = newLayers[layerIndex].zIndex;
        newLayers[layerIndex].zIndex = newLayers[layerIndex - 1].zIndex;
        newLayers[layerIndex - 1].zIndex = currentZIndex;
        return newLayers.sort((a, b) => a.zIndex - b.zIndex);
      }
      return prevLayers;
    });
  };

  /**
   * Añade una nueva capa al lienzo
   */
  const addNewLayer = () => {
    const highestZIndex = layers.length > 0 
      ? Math.max(...layers.map(layer => layer.zIndex)) + 1 
      : 0;
    
    const newId = layers.length > 0 
      ? Math.max(...layers.map(layer => layer.id)) + 1 
      : 1;
      
    const nullPixels = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        nullPixels.push({ x, y, color: 'transparent' });
      }
    }
    
    const newLayer = {
      id: newId,
      name: `Capa ${newId}`,
      visible: true,
      color: null,
      pixels: nullPixels,
      zIndex: highestZIndex,
      group: null
    };
    
    setLayers(prevLayers => [...prevLayers, newLayer]);
    setSelectedLayerId(newId);
  };

  /**
   * Elimina una capa específica
   * @param {number} id - ID de la capa a eliminar
   */
  const deleteLayer = (id) => {
    if(layers.length ===1){
      return
    }
    setLayers(prevLayers => {
      const filteredLayers = prevLayers.filter(layer => layer.id !== id);
      if (selectedLayerId === id && filteredLayers.length > 0) {
        setSelectedLayerId(filteredLayers[0].id);
      } else if (filteredLayers.length === 0) {
        setSelectedLayerId(null);
      }
      return filteredLayers;
    });
  };

  /**
   * Organiza las capas para mostrarlas en el panel
   * @returns {Array} - Lista organizada de capas
   */
  const organizedLayers = () => {
    return layers.map(layer => ({
      type: 'layer',
      ...layer
    }));
  };

  // ==================== HERRAMIENTAS DE DIBUJO ====================
 
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  /**
   * Pinta un pixel en la capa seleccionada
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {Object} rgb - Color en formato {r, g, b}
   */
 /**
 * Función para pintar píxeles cuadrados en el canvas
 * @param {number} x - Coordenada X del centro del cuadrado
 * @param {number} y - Coordenada Y del centro del cuadrado
 * @param {Object} parameters - Objeto con parámetros de dibujo
 * @param {string|Object} parameters.color - Color en formato rgba, rgb o hexadecimal
 * @param {number} parameters.width - Ancho del cuadrado de píxeles (en unidades de píxel)
 */
 const paintPixel = useCallback((x, y, parameters = toolParameters) => {
  if (!selectedLayerId) return;

  const { color, width: brushSize } = parameters;
  const colorUint = typeof color === 'string' 
    ? colorStringToUint32(color)
    : rgbaToUint32(color.r, color.g, color.b, color.a || 255);

  setLayers(prev => prev.map(layer => {
    if (layer.id !== selectedLayerId) return layer;
    
    // Create new pixel array
    const newPixels = new Uint32Array(layer.pixels);
    const halfSize = Math.floor(brushSize / 2);
    const startX = x - halfSize;
    const startY = y - halfSize;

    // Paint square area
    for (let i = 0; i < brushSize; i++) {
      for (let j = 0; j < brushSize; j++) {
        const px = clamp(startX + i, 0, width - 1);
        const py = clamp(startY + j, 0, height - 1);
        const index = py * width + px;
        newPixels[index] = colorUint;
      }
    }

    return { 
      ...layer, 
      pixels: newPixels,
      buffer: newPixels.buffer 
    };
  }));
}, [selectedLayerId, toolParameters, width, height]);
  
  
  

  /**
   * Implementación del algoritmo de Bresenham para dibujar líneas
   * @param {number} x0 - Coordenada X inicial
   * @param {number} y0 - Coordenada Y inicial
   * @param {number} x1 - Coordenada X final
   * @param {number} y1 - Coordenada Y final
   * @param {Object} color - Color en formato {r, g, b}
   */
  const drawLine = (x0, y0, x1, y1) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    
    while(true) {
      paintPixel(x0, y0);
      
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  //Herramienta para borrar:
 

 // Versión mejorada de erasePixel
 const erasePixel = useCallback((x, y, parameters = toolParameters) => {
  if (!selectedLayerId) return;

  const { width: brushSize } = parameters;
  const transparent = 0x00000000; // RGBA(0,0,0,0)

  setLayers(prev => prev.map(layer => {
    if (layer.id !== selectedLayerId) return layer;
    
    const newPixels = new Uint32Array(layer.pixels);
    const halfSize = Math.floor(brushSize / 2);
    const startX = x - halfSize;
    const startY = y - halfSize;

    for (let i = 0; i < brushSize; i++) {
      for (let j = 0; j < brushSize; j++) {
        const px = clamp(startX + i, 0, width - 1);
        const py = clamp(startY + j, 0, height - 1);
        const index = py * width + px;
        newPixels[index] = transparent;
      }
    }

    return { 
      ...layer, 
      pixels: newPixels,
      buffer: newPixels.buffer 
    };
  }));
}, [selectedLayerId, toolParameters, width, height]);

// Función para borrar líneas usando el algoritmo de Bresenham
const eraseLine = useCallback((x0, y0, x1, y1) => {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;
  
  while(true) {
    erasePixel(x0, y0);
    
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}, [erasePixel]);
  
  /**
   * Aplica la herramienta seleccionada en las coordenadas especificadas
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {Object} color - Color en formato {r, g, b}
   */
  const applyTool = useCallback((x, y) => {
   
    if (isPanning) return;
  
    if (tool === Tools.Pincel) {
      if (lastPositionRef.current.x >= 0 && lastPositionRef.current.y >= 0) {
        drawLine(lastPositionRef.current.x, lastPositionRef.current.y, x, y);
      } else {
        paintPixel(x, y);
      }
      lastPositionRef.current = { x, y };
    } else if (tool === Tools.Borrar) {
      if (lastPositionRef.current.x >= 0 && lastPositionRef.current.y >= 0) {
        eraseLine(lastPositionRef.current.x, lastPositionRef.current.y, x, y);
      } else {
        erasePixel(x, y);
      }
      lastPositionRef.current = { x, y };
    }

    else if(tool === Tools.Rellenar){
      floodFill(x,y);
      
    }
    else if(tool=== Tools.RellenarGradiente){
      floodFillGradient(x, y, {
        color1: {r: 255, g: 0, b: 0, a: 255},     // Rojo
  color2: {r: 0, g: 255, b: 255, a: 255},   // Cian
  interpolationMode: 'rgb',                 // Aquí eliges el modo
  angle: 0,                    // Diagonal (↗)
        brushSize: 1,                               // Tamaño del pincel
        canvasWidth: 64,                           // Ancho del canvas
        canvasHeight: 64                           // Alto del canvas
      });

    }
  }, [isPanning, tool, drawLine, paintPixel, erasePixel, eraseLine]);
  
 

  // ==================== HERRAMIENTA DE SELECCIÓN ====================
  
  /**
   * Establece el color de píxeles específicos a null (transparente) en una capa
   * @param {Array} pixelCoordinates - Coordenadas de los píxeles a modificar
   * @param {number} layerId - ID de la capa
   * @param {Function} callback - Función a ejecutar después de la actualización
   */
  const setPixelsToNull = (pixelCoordinates, layerId, callback) => {
    setLayers(prevLayers => {
      const updated = prevLayers.map(layer => {
        if (layer.id !== layerId) return layer;
        
        const updatedPixels = layer.pixels.map(pixel => {
          const shouldBeNull = pixelCoordinates.some(coord =>
            coord.x === pixel.x && coord.y === pixel.y
          );
          return shouldBeNull ? { ...pixel, color: null } : pixel;
        });
        
        return { ...layer, pixels: updatedPixels };
      });

      // Ejecutar callback después de actualizar
      if (callback) {
        const updatedLayer = updated.find(l => l.id === layerId);
        callback(updatedLayer);
      }

      return updated;
    });
  };

  /**
   * Renderiza el canvas de selección con el área seleccionada
   */

  const renderSelectionCanvas = () => {
    if (!overlayCanvasRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Dibujar siempre como rectángulo después del autocrop
    if ((tool === Tools.Seleccion || tool === Tools.Lazo) && selectionStart && selectionEnd) {
      const startX = Math.min(selectionStart.x, selectionEnd.x) * zoom;
      const startY = Math.min(selectionStart.y, selectionEnd.y) * zoom;
      const width = Math.abs(selectionEnd.x - selectionStart.x + 1) * zoom;
      const height = Math.abs(selectionEnd.y - selectionStart.y + 1) * zoom;
      
      ctx.strokeStyle = 'rgba(117, 56, 232, 1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, width, height);
      
      ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.fillRect(startX, startY, width, height);
    }
  
    // Dibujar puntos del lazo solo durante la creación
    if (isDrawingLasso && lassoPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x * zoom, lassoPoints[0].y * zoom);
      
      lassoPoints.forEach((p, index) => {
        if (index > 0) ctx.lineTo(p.x * zoom, p.y * zoom);
      });
    
      ctx.closePath(); // Esto cierra la figura conectando el último punto con el primero
      ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.fill(); // Rellena la forma cerrada
      ctx.strokeStyle = 'rgba(117, 56, 232, 1)';
      ctx.lineWidth = 2;
      ctx.stroke(); // Dibuja el contorno
    }
    
  };

  /**
   * Renderiza los píxeles seleccionados en el canvas temporal
   * @param {Array} selectionMap - Lista de píxeles seleccionados
   */
 /**
 * Renderiza los píxeles seleccionados en el canvas temporal
 * @param {Array} selectionMap - Lista de píxeles seleccionados
 */
const renderOnTemporalCanvas = (selectionMap) => {
  if (!temporalCanvasRef.current) return;
  
  const canvas = temporalCanvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // Limpiar el canvas con el nuevo tamaño
  canvas.width = width * zoom;
  canvas.height = height * zoom;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if(!selectionMap){
    return;
  }

  // Dibujar los píxeles seleccionados con el nuevo zoom
  selectionMap.forEach(pixel => {
    if (!pixel.color) return;
    
    // Asegurarse de que el color sea un string válido
    let fillStyle;
    if (typeof pixel.color === 'string') {
      fillStyle = pixel.color;
    } else if (typeof pixel.color === 'number') {
      // Si por alguna razón nos llega un número, convertirlo
      const rgba = uint32ToRgba(pixel.color);
      fillStyle = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a / 255})`;
    } else if (typeof pixel.color === 'object' && pixel.color !== null) {
      // Si es un objeto, asumir formato {r, g, b, a}
      const {r, g, b, a = 255} = pixel.color;
      fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    } else {
      console.error('Formato de color no reconocido:', pixel.color);
      fillStyle = 'rgba(255, 0, 0, 0.5)'; // Fallback a rojo semi-transparente
    }
    
    ctx.fillStyle = fillStyle;
    ctx.fillRect(pixel.x * zoom, pixel.y * zoom, zoom, zoom);
  });
};

  /**
   * Maneja la selección con recorte automático de áreas vacías
   * @param {number} x0 - Coordenada X inicial
   * @param {number} y0 - Coordenada Y inicial
   * @param {number} xf - Coordenada X final
   * @param {number} yf - Coordenada Y final
   * @returns {Object} - Información de la selección
   */
// Corrige la función handleSelectionWithAutocrop para manejar correctamente los colores

const handleSelectionWithAutocrop = (x0, y0, xf, yf) => {
  if (!selectedLayerId) {
  
    return null;
  }

  const selectedLayer = layers.find(layer => layer.id === selectedLayerId);
  if (!selectedLayer || !selectedLayer.visible) {
    console.warn("Capa no visible o no encontrada");
    return null;
  }

  // Ordenar coordenadas para tener esquinas correctas
// Ordenar coordenadas para tener esquinas correctas
let startX = Math.min(x0, xf);
let endX = Math.max(x0, xf);
let startY = Math.min(y0, yf);
let endY = Math.max(y0, yf);

// Limitar coordenadas a los límites del canvas
startX = Math.max(0, Math.min(width - 1, startX));
endX = Math.max(0, Math.min(width - 1, endX));
startY = Math.max(0, Math.min(height - 1, startY));
endY = Math.max(0, Math.min(height - 1, endY));



  // Encontrar todos los píxeles con color en el área seleccionada
  const coloredPixels = [];
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const index = y * width + x;
      const pixelColor = selectedLayer.pixels[index];
      if (pixelColor !== 0x00000000) { // No transparente
        coloredPixels.push({ 
          x, 
          y, 
          colorUint32: pixelColor 
        });
      }
    }
  }

  if (coloredPixels.length === 0) {
    console.warn("No hay píxeles con color en el área seleccionada");
    setCurrentSelection(null);
    setSelectionStart(null);
    setSelectionEnd(null);
    setFinalizedSelection(false);
    setCurrentSelection(null)
    setIsDraggingSelection(false)
    setDragOffset({ x: 0, y: 0 })
    renderOnTemporalCanvas();
    return null;
  }

  // Calcular los límites reales del contenido (autocrop)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  coloredPixels.forEach(pixel => {
    minX = Math.min(minX, pixel.x);
    maxX = Math.max(maxX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxY = Math.max(maxY, pixel.y);
  });

  // Asegurar que los límites están dentro del canvas
  minX = Math.max(0, minX);
  maxX = Math.min(width - 1, maxX);
  minY = Math.max(0, minY);
  maxY = Math.min(height - 1, maxY);

  // Actualizar la selección visual
  setSelectionStart({ x: minX, y: minY });
  setSelectionEnd({ x: maxX, y: maxY });


  // Crear el mapa de píxeles para el área con contenido
  const selectionMap = new Map();
  coloredPixels.forEach(pixel => {
    if (pixel.x >= minX && pixel.x <= maxX && 
        pixel.y >= minY && pixel.y <= maxY) {
      selectionMap.set(`${pixel.x},${pixel.y}`, {
        colorUint32: pixel.colorUint32, // Guardamos el valor Uint32 directamente
        x: pixel.x - minX, // Coordenadas relativas al área de selección
        y: pixel.y - minY
      });
    }
  });

  // Crear nueva capa con los píxeles eliminados
  const newPixels = new Uint32Array(selectedLayer.pixels);
  const transparent = 0x00000000;
  
  coloredPixels.forEach(pixel => {
    const index = pixel.y * width + pixel.x;
    newPixels[index] = transparent;
  });

  // Actualizar la capa
  setLayers(prevLayers => prevLayers.map(layer => {
    if (layer.id !== selectedLayerId) return layer;
    return { 
      ...layer, 
      pixels: newPixels,
      buffer: newPixels.buffer
    };
  }));

  // Renderizar la capa actualizada
  const updatedLayer = { ...selectedLayer, pixels: newPixels };
  renderLayer(updatedLayer);

  // Preparar los píxeles para el canvas temporal con los colores originales
  const pixelsForTemporalCanvas = [];
  
  Array.from(selectionMap.values()).forEach(pixel => {
    const uint32Color = pixel.colorUint32;
    // Asegurarse de que uint32Color sea un número antes de convertirlo
    if (typeof uint32Color === 'number') {
      const rgba = uint32ToRgba(uint32Color);
      
      // Debug
    
      
      pixelsForTemporalCanvas.push({
        x: minX + pixel.x,
        y: minY + pixel.y,
        color: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a / 255})`
      });
    } else {
      console.error('Color no es un número Uint32:', uint32Color);
    }
  });
  
  renderOnTemporalCanvas(pixelsForTemporalCanvas);

  return {
    pixels: selectionMap,
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    },
    layerId: selectedLayerId
  };
};

  /**
   * Elimina los píxeles seleccionados de la capa original
   * (Función placeholder para completar la implementación del drag & drop)
   */
  const removeSelectedPixelsFromLayer = () => {
    // Implementación pendiente
    console.log("Eliminación de píxeles seleccionados");
  };

  // ==================== MANEJO DE EVENTOS ====================
  
  /**
   * Obtiene las coordenadas dentro del canvas a partir de las coordenadas del cliente
   * @param {number} clientX - Coordenada X del evento
   * @param {number} clientY - Coordenada Y del evento
   * @returns {Object} - Coordenadas {x, y} dentro del canvas
   */
  const getCanvasCoordinates = (clientX, clientY) => {
    const rect = artboardRef.current.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / zoom);
    const y = Math.floor((clientY - rect.top) / zoom);
    return { x, y };
  };

  /**
   * Maneja el evento mousedown en el workspace
   * @param {Event} e - Evento del mouse
   */
  const handleMouseDown = (e) => {
    // Manejo de panning con botón medio o Alt+click izquierdo
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && tool=== Tools.Mover)) {
      setIsPanning(true);
      setStartPanPoint({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      });
      return;
    }

    //Dado que este handle maneja toda la interfaz del artboard, debemos evaluar donde es el click:
    // Verificar si el evento ocurrió en el canvas de propagación
  const isOnPropagationCanvas = e.target === temporalCanvasRef.current;

  if (finalizedSelection) {
    
    return;
  }
    
    if (e.button === 0) {
      setIsMouseDown(true);
      lastPositionRef.current = { x: -1, y: -1 };
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      
      if (tool === Tools.Seleccion) {
        
        if (finalizedSelection && currentSelection) {
          // Verificar si el clic está dentro del área seleccionada
          if (x >= currentSelection.bounds.x && 
              x <= currentSelection.bounds.x + currentSelection.bounds.width &&
              y >= currentSelection.bounds.y && 
              y <= currentSelection.bounds.y + currentSelection.bounds.height) {
            // Comenzar arrastre
            setIsDraggingSelection(true);
            setDragOffset({
              x: x - currentSelection.bounds.x,
              y: y - currentSelection.bounds.y
            });
            // Eliminar los píxeles seleccionados de la capa original
            removeSelectedPixelsFromLayer();
            return;
          }
        }
        // Iniciar nueva selección
        setSelectionStart({ x, y });
        setSelectionEnd({ x, y });
        setFinalizedSelection(false);
        setCurrentSelection(null);
    
      }else if(tool === Tools.Lazo){
        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    setIsDrawingLasso(true);
   
    setLassoPoints([{ x, y }]);
    setFinalizedSelection(false);
    setCurrentSelection(null);
    return;
      }
     
      else if (x >= 0 && y >= 0) 
        {
        applyTool(x, y, { r: 255, g: 0, b: 0 });
      }
    }
  };
  
//Para que el canvas de seleccion tenga su propio handle
const handlePropagationCanvasMouseDown = (e) => {
  if (!currentSelection) return;
  
  const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
  
  // Verificar si el click está dentro del área de selección
  const isInsideSelection = 
    x >= currentSelection.bounds?.x && 
    x <= currentSelection.bounds?.x + currentSelection.bounds.width &&
    y >= currentSelection.bounds?.y && 
    y <= currentSelection.bounds?.y + currentSelection.bounds.height;
  
  if (isInsideSelection) {
    e.stopPropagation();
   
    
    // Activar el estado de arrastre
    setIsDraggingSelection(true);
    setDragOffset({
      x: x - currentSelection.bounds.x,
      y: y - currentSelection.bounds.y
    });
    
    // Eliminar los píxeles seleccionados de la capa original
    removeSelectedPixelsFromLayer();
  }
};

//Manejar el movimiento del canvas de seleccion:
const handleSelectionDragMove = (e) => {
  if (!isDraggingSelection || !currentSelection) return;
  
  const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
  
  // Calcular nueva posición del área seleccionada
  const newX = x - dragOffset.x;
  const newY = y - dragOffset.y;
  

  
  // Actualizar la posición visual de la selección
  setSelectionStart({ x: newX, y: newY });
  setSelectionEnd({
    x: newX + currentSelection.bounds.width - 1,
    y: newY + currentSelection.bounds.height - 1
  });

  // Actualizar la posición de la selección actual
  setCurrentSelection({
    ...currentSelection,
    bounds: {
      ...currentSelection.bounds,
      x: newX,
      y: newY
    }
  });
  
  // Los píxeles se redibujarán automáticamente en el useEffect
};

  /**
   * Maneja el evento mousemove en el workspace
   * @param {Event} e - Evento del mouse
   */
  const handleMouseMove = (e) => {
    
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPanPoint.x,
        y: e.clientY - startPanPoint.y
      });
      return;
    }
    
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    // Renderizar previsualización siempre que el mouse se mueva
    renderPreview(x, y);
    if (isDrawingLasso) {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      setLassoPoints(prev => [...prev, { x, y }]);
    }
    
    if (isMouseDown) {
      if (tool === 'select' && selectionStart) {
        // Actualizar fin de selección
        if (x >= 0 && y >= 0) {
          setSelectionEnd({ x, y });
        }
      } else if (x >= 0 && y >= 0) {
        applyTool(x, y);
      }
    }
  };

  /**
   * Maneja el evento mouseup en el workspace
   */
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
  
    if (isDraggingSelection) {
      setIsDraggingSelection(false);
    }
  
    if (isDrawingLasso) {
      setIsDrawingLasso(false);
      if (lassoPoints.length > 2) {
        const closedPolygon = [...lassoPoints, lassoPoints[0]];
        const selection = handleLassoSelection(closedPolygon);
        
        // Corregir: Manejar correctamente el caso de selección vacía
        if (!selection) {
          setFinalizedSelection(false);
          setCurrentSelection(null);
          setLassoPoints([]);
          setSelectionStart(null);
          setSelectionEnd(null);
          renderOnTemporalCanvas(null);
          return; // Salir tempranamente si no hay selección
        }
        
        setCurrentSelection({
          ...selection,
          polygonPoints: closedPolygon
        });
        setFinalizedSelection(true);
      }
    }
  
    if (isMouseDown) {
      setIsMouseDown(false);
      
      if (tool === 'select' && selectionStart && selectionEnd && !isDraggingSelection) {
        setFinalizedSelection(true);
        const selection = handleSelectionWithAutocrop(
          selectionStart.x, 
          selectionStart.y, 
          selectionEnd.x, 
          selectionEnd.y
        );
        
        if (selection) {
          setCurrentSelection(selection);
        } else {
          // Resetear estados si la selección es inválida
          setFinalizedSelection(false);
          setCurrentSelection(null);
          setSelectionStart(null);
          setSelectionEnd(null);
        }
      }
    }
  };

  /**
   * Maneja el cambio de zoom
   * @param {Event} e - Evento del input range
   */
  const handleZoomChange = (e) => {
    const newZoom = parseInt(e.target.value, 10);
    setZoom(newZoom);
    
    // Si hay una selección, asegúrate de que se mantenga visible
    if (currentSelection) {
      renderSelectionCanvas();
      const coloredPixels = Array.from(currentSelection.pixels.values()).map(pixel => ({
        x: currentSelection.bounds.x + pixel.x,
        y: currentSelection.bounds.y + pixel.y,
        color: pixel.color
      }));
      renderOnTemporalCanvas(coloredPixels);
    }
  };

  /**
   * Actualiza el canvas de selección cuando cambian sus estados relacionados
   */
 // Actualización para el useEffect de renderizado de selección
 useEffect(() => {
  renderSelectionCanvas();
  
  if (currentSelection && temporalCanvasRef.current && currentSelection.pixels) {
    const pixelsToRender = Array.from(currentSelection.pixels.values()).map(pixel => {
      const color = uint32ToRgba(pixel.colorUint32);
      return {
        x: currentSelection.bounds.x + pixel.x,
        y: currentSelection.bounds.y + pixel.y,
        color: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`
      };
    });
    
    renderOnTemporalCanvas(pixelsToRender);
    
    // Forzar re-renderizado del canvas de selección para la caja de selección
    if (currentSelection && currentSelection.type === 'lasso') {
      
      // Renderizar usando los puntos guardados
      const temporalPixels = Array.from(currentSelection.pixels.values()).map(pixel => ({
        x: currentSelection.bounds.x + pixel.x,
        y: currentSelection.bounds.y + pixel.y,
        color: uint32ToRgba(pixel.colorUint32)
      }));
      
      renderOnTemporalCanvas(temporalPixels);
    }
  }
  
}, [selectionStart, selectionEnd, lassoPoints, zoom, tool, finalizedSelection, currentSelection]);

// Actualización para el manejo del arrastre de selección

  // ==================== Previsualizacion para pintar ====================

// 1. Primero, necesitamos añadir una referencia para el canvas de previsualización
const previewCanvasRef = useRef(null);

// 2. Añadir un nuevo efecto para configurar el canvas de previsualización
useEffect(() => {
  if (previewCanvasRef.current) {
    const canvas = previewCanvasRef.current;
    canvas.width = width * zoom;
    canvas.height = height * zoom;
  }
}, [width, height, zoom]);

// 3. Función para renderizar la previsualización
const renderPreview = useCallback((x, y) => {
  if (!previewCanvasRef.current || !toolParameters) return;
  
  const canvas = previewCanvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // Limpiar el canvas de previsualización
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Solo mostrar previsualización cuando no estamos en modo selección o panning
  if (tool === Tools.Seleccion || tool === Tools.Mover ||isPanning) return;
  
  const { width: brushSize, color } = toolParameters;
  const halfWidth = Math.floor(brushSize / 2);
  const startX = x - halfWidth;
  const startY = y - halfWidth;
  
  // Establecer estilo según la herramienta
  if (tool === Tools.Pincel || tool === Tools.Rellenar) {
    // Convertir el color a formato con transparencia (70% de opacidad)
    let previewColor;
    if (typeof color === 'string') {
      // Si es una cadena CSS color (hex, rgb, etc.)
      if (color.startsWith('rgb')) {
        // Si es formato rgb o rgba
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch;
          previewColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
        } else {
          previewColor = color;
        }
      } else if (color.startsWith('#')) {
        // Si es formato hex
        previewColor = color + 'B3'; // B3 en hex es ~70% de opacidad
      } else {
        previewColor = color;
      }
    } else if (typeof color === 'object') {
      // Si es un objeto con valores r, g, b
      const { r, g, b } = color;
      previewColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
    } else {
      previewColor = 'rgba(0, 0, 0, 0.7)';
    }
    
    ctx.fillStyle = previewColor;
  } else if (tool === Tools.Borrar) {
    // Estilo mejorado para el borrador
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // rojo semitransparente para contorno
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // relleno blanco semitransparente para contraste
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]); // línea discontinua para indicar acción especial
  }
 
  
  // Dibujar la forma de previsualización
  for (let i = 0; i < brushSize; i++) {
    for (let j = 0; j < brushSize; j++) {
      const pixelX = startX + i;
      const pixelY = startY + j;
      
      // Solo dibujar si está dentro del canvas
      if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
        ctx.fillRect(pixelX * zoom, pixelY * zoom, zoom, zoom);
        
        if (tool === Tools.Borrar) {
          // Añadir borde para el borrador
          ctx.strokeRect(pixelX * zoom, pixelY * zoom, zoom, zoom);
        }
      }
    }
  }
}, [tool, toolParameters, width, height, zoom, isPanning]);



// 5. Asegurarnos de limpiar la previsualización cuando el ratón sale del canvas
const handleMouseLeave = () => {
  handleMouseUp();
  
  if (previewCanvasRef.current) {
    const ctx = previewCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
  }
};


const rgbaToUint32 = (r, g, b, a = 255) => {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
};

// Función para convertir Uint32 a RGBA
const uint32ToRgba = (color) => {
  return {
    r: color & 0xff,                // Extraer componente rojo (bits 0-7)
    g: (color >> 8) & 0xff,         // Extraer componente verde (bits 8-15)
    b: (color >> 16) & 0xff,        // Extraer componente azul (bits 16-23)
    a: (color >> 24) & 0xff         // Extraer componente alfa (bits 24-31)
  };
};

// Función para convertir string de color a Uint32
const colorStringToUint32 = (colorStr) => {
  // Si es "transparent", devolver directamente 0
  if (colorStr === 'transparent') return 0x00000000;
  
  // Usar canvas para interpretar cualquier formato de color
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorStr;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return rgbaToUint32(r, g, b, a);
};
//====================== Rellenar ==================


function floodFill(x, y) {

  
  // Obtener capa seleccionada
  const selectedLayer = layers.find(layer => layer.id === selectedLayerId);
  if (!selectedLayer || !selectedLayer.visible) {
    console.warn("Capa no visible o no encontrada");
    return;
  }

  // Obtener color original y nuevo color
  const originalColor = getPixelColor(x, y);
  const newColor = {r: 255, g: 0, b: 0, a: 255};
  
  // Si el color original es igual al nuevo, no hay nada que hacer
  if (JSON.stringify(originalColor) === JSON.stringify(newColor)) {
    return;
  }

  // Matriz para rastrear píxeles visitados
  const visited = Array(height).fill().map(() => Array(width).fill(false));
  
  // Cola para píxeles a procesar
  const queue = [];
  queue.push({x, y});
  visited[y][x] = true;

  // Direcciones: arriba, derecha, abajo, izquierda
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  while (queue.length > 0) {
    const {x: currentX, y: currentY} = queue.shift();
    
    // Pintar el píxel actual
    paintPixel(currentX, currentY);

    // Procesar vecinos
    for (const [dx, dy] of directions) {
      const newX = currentX + dx;
      const newY = currentY + dy;

      // Verificar límites
      if (newX < 0 || newX >= width || newY < 0 || newY >= height) {
        continue;
      }

      // Verificar si ya fue visitado
      if (visited[newY][newX]) {
        continue;
      }

      // Verificar si el color coincide con el original
      const neighborColor = getPixelColor(newX, newY);
      if (JSON.stringify(neighborColor) === JSON.stringify(originalColor)) {
        visited[newY][newX] = true;
        queue.push({x: newX, y: newY});
      }
    }
  }
}




function floodFillGradient(x, y, options = {}) {
  // Extraer dimensiones del canvas de las opciones o del scope externo
  const canvasWidth = options.canvasWidth || width;
  const canvasHeight = options.canvasHeight || height;
  
  // Valores por defecto
  const color1 = options.color1 || {r: 255, g: 0, b: 0, a: 255};      // Rojo
  const color2 = options.color2 || {r: 0, g: 0, b: 255, a: 255};      // Azul
  const angle = options.angle !== undefined ? options.angle : 90;
  const brushSize = options.brushSize || 1;
  
  // Opción para especificar el modo de interpolación
  const interpolationMode = options.interpolationMode || 'hsl'; // 'rgb', 'hsl', 'spectrum'
  
  // Nueva opción para activar/desactivar el dithering
  const dithering = options.dithering !== undefined ? options.dithering : false;
  const ditheringAmount = options.ditheringAmount || 0.1; // Intensidad del dithering (0-1)
  const ditheringType = options.ditheringType || 'ordered'; // 'ordered' o 'random'
  
  // Verificar si hay una capa seleccionada
  if (!selectedLayerId) {
    console.warn("No hay capa seleccionada");
    return;
  }

  // Obtener color original
  const originalColor = getPixelColor(x, y);
  
  // Si el pixel inicial ya tiene un color similar a alguno de los colores del gradiente, no hay nada que hacer
  if (JSON.stringify(originalColor) === JSON.stringify(color1) ||
      JSON.stringify(originalColor) === JSON.stringify(color2)) {
    return;
  }

  // Matriz para rastrear píxeles visitados y los puntos del relleno
  const visited = Array(canvasHeight).fill().map(() => Array(canvasWidth).fill(false));
  const fillPoints = [];
  
  // Cola para píxeles a procesar
  const queue = [];
  queue.push({x, y});
  visited[y][x] = true;
  
  // Identificar todos los píxeles que forman parte del área a rellenar
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // arriba, derecha, abajo, izquierda

  while (queue.length > 0) {
    const {x: currentX, y: currentY} = queue.shift();
    
    // Añadir a la lista de puntos a rellenar
    fillPoints.push({x: currentX, y: currentY});

    // Procesar vecinos
    for (const [dx, dy] of directions) {
      const newX = currentX + dx;
      const newY = currentY + dy;

      // Verificar límites
      if (newX < 0 || newX >= canvasWidth || newY < 0 || newY >= canvasHeight) {
        continue;
      }

      // Verificar si ya fue visitado
      if (visited[newY][newX]) {
        continue;
      }

      // Verificar si el color coincide con el original
      const neighborColor = getPixelColor(newX, newY);
      if (JSON.stringify(neighborColor) === JSON.stringify(originalColor)) {
        visited[newY][newX] = true;
        queue.push({x: newX, y: newY});
      }
    }
  }

  // Si no hay puntos para rellenar, salir
  if (fillPoints.length === 0) {
    return;
  }
  
  // Calcular los límites del área a rellenar
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of fillPoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  
  // Calcular dimensiones del área
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Convertir ángulo a radianes
  const angleRad = (angle * Math.PI) / 180;
  
  // Matriz de Bayer para dithering ordenado 8x8
  const bayerMatrix8x8 = [
    [ 0, 32,  8, 40,  2, 34, 10, 42 ],
    [ 48, 16, 56, 24, 50, 18, 58, 26 ],
    [ 12, 44,  4, 36, 14, 46,  6, 38 ],
    [ 60, 28, 52, 20, 62, 30, 54, 22 ],
    [  3, 35, 11, 43,  1, 33,  9, 41 ],
    [ 51, 19, 59, 27, 49, 17, 57, 25 ],
    [ 15, 47,  7, 39, 13, 45,  5, 37 ],
    [ 63, 31, 55, 23, 61, 29, 53, 21 ]
  ];
  
  // Calcular la proyección de cada punto en la dirección del gradiente
  for (const point of fillPoints) {
    // Normalizar coordenadas relativas al área
    const relX = (point.x - minX) / (width - 1);
    const relY = (point.y - minY) / (height - 1);
    
    // Proyectar punto en la dirección del gradiente
    let gradientPos = relX * Math.cos(angleRad) + relY * Math.sin(angleRad);
    
    // Asegurar que gradientPos esté entre 0 y 1
    gradientPos = Math.max(0, Math.min(1, gradientPos));
    
    // Aplicar dithering si está activado
    let adjustedGradientPos = gradientPos;
    
    if (dithering) {
      if (ditheringType === 'random') {
        // Dithering aleatorio: añadir ruido aleatorio
        const noise = (Math.random() - 0.5) * ditheringAmount;
        adjustedGradientPos = Math.max(0, Math.min(1, gradientPos + noise));
      } else if (ditheringType === 'ordered') {
        // Dithering ordenado usando matriz de Bayer
        const matrixX = point.x % 8;
        const matrixY = point.y % 8;
        const threshold = bayerMatrix8x8[matrixY][matrixX] / 64; // Normalizar a [0, 1]
        
        // Ajustar la posición del gradiente basado en el umbral
        const thresholdAdjustment = (threshold - 0.5) * ditheringAmount;
        adjustedGradientPos = Math.max(0, Math.min(1, gradientPos + thresholdAdjustment));
      }
    }
    
    // Calcular color basado en la posición en el gradiente y el modo de interpolación
    let resultColor;
    
    switch (interpolationMode) {
      case 'rgb':
        // Interpolación lineal simple en espacio RGB
        resultColor = interpolateRGB(color1, color2, adjustedGradientPos);
        break;
        
      case 'hsl':
        // Interpolación en espacio HSL para transiciones más naturales
        resultColor = interpolateHSL(color1, color2, adjustedGradientPos);
        break;
        
      case 'spectrum':
        // Interpolación a través del espectro completo
        resultColor = interpolateSpectrum(adjustedGradientPos);
        break;
        
      default:
        resultColor = interpolateHSL(color1, color2, adjustedGradientPos);
    }
    
    // Pintar el píxel con el color calculado
    const paintParams = {
      color: resultColor,
      width: brushSize
    };
    
    paintPixel(point.x, point.y, paintParams);
  }
}


const handleLassoSelection = (polygon) => {
  if (!selectedLayerId) {
    console.warn("No hay capa seleccionada");
    return null;
  }

  const selectedLayer = layers.find(layer => layer.id === selectedLayerId);
  if (!selectedLayer || !selectedLayer.visible) {
    console.warn("Capa no visible o no encontrada");
    return null;
  }

  // 1. Calcular límites del polígono para optimizar búsqueda
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map(p => p.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...polygon.map(p => p.x))));
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map(p => p.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...polygon.map(p => p.y))));

  // 2. Algoritmo ray-casting optimizado
  const isInsidePolygon = (x, y) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // 3. Recopilar píxeles seleccionados con autocrop
  let realMinX = Infinity;
  let realMinY = Infinity;
  let realMaxX = -Infinity;
  let realMaxY = -Infinity;
 
  const selectedPixels = [];
  const tempLayerPixels = new Uint32Array(selectedLayer.pixels);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (isInsidePolygon(x, y)) {
        const index = y * width + x;
        const pixelColor = tempLayerPixels[index];

        if (pixelColor !== 0x00000000) { // Ignorar transparentes
          // Actualizar límites reales
          realMinX = Math.min(realMinX, x);
          realMaxX = Math.max(realMaxX, x);
          realMinY = Math.min(realMinY, y);
          realMaxY = Math.max(realMaxY, y);

          selectedPixels.push({
            x,
            y,
            colorUint32: pixelColor,
            index
          });
        }
      }
    }
  }

  if (selectedPixels.length === 0) {
    setIsDrawingLasso(false);
    setLassoPoints([]);
    setFinalizedSelection(false);
    setCurrentSelection(null);
    renderOnTemporalCanvas(null); // Limpiar canvas
    return null; // Retornar null explícitamente
  }


  // 4. Autocrop de la selección
  const selectionWidth = realMaxX - realMinX + 1;
  const selectionHeight = realMaxY - realMinY + 1;

  // 5. Crear mapa de selección relativo
  const selectionMap = new Map();
  selectedPixels.forEach(pixel => {
    const relX = pixel.x - realMinX;
    const relY = pixel.y - realMinY;
    
    selectionMap.set(`${relX},${relY}`, {
      colorUint32: pixel.colorUint32,
      x: relX,
      y: relY,
      originalX: pixel.x,
      originalY: pixel.y
    });
  });

  // 6. Eliminar píxeles de la capa original
  const newPixels = new Uint32Array(selectedLayer.pixels);
  selectedPixels.forEach(pixel => {
    newPixels[pixel.index] = 0x00000000; // Hacer transparente
  });

  // 7. Actualizar estado de capas
  setLayers(prev => prev.map(layer => 
    layer.id === selectedLayerId ? {
      ...layer,
      pixels: newPixels,
      buffer: newPixels.buffer
    } : layer
  ));

  // 8. Preparar datos para renderizado temporal
  const temporalPixels = selectedPixels.map(pixel => ({
    x: pixel.x,
    y: pixel.y,
    color: uint32ToRgba(pixel.colorUint32)
  }));
console.log(tempLayerPixels);
  // 9. Renderizar en canvas temporal
  renderOnTemporalCanvas(temporalPixels);

  setSelectionStart({ x: realMinX, y: realMinY });
  setSelectionEnd({ x: realMaxX, y: realMaxY });

  return {
    pixels: selectionMap,
    bounds: {
      x: realMinX,
      y: realMinY,
      width: realMaxX - realMinX + 1,
      height: realMaxY - realMinY + 1
    },
    layerId: selectedLayerId,
    type: 'lasso'
  };
};

 // ==================== Acciones de la seleccion ====================
 const deselect =()=>{
  //Obtenemos la verdadera posicion del canvas de seleccion
  const translateX = currentSelection.bounds.x;
  const translateY= currentSelection.bounds.y;

  //Pintamos las coordenadas en la capa actual seleccionada
  //Con el color actual de cada pixel
  for (const [key, value] of currentSelection.pixels) {
    console.log(value);
    //hacer la conversion a rgba ya que es el color esperado por paint pixel
    paintPixel(value.x + translateX,value.y+translateY, {width:1, color: uint32ToRgba(value.colorUint32)})
  }



  
  setSelectionStart(null);
  setSelectionEnd(null);
  setFinalizedSelection(false);
  setCurrentSelection(null)
  setIsDraggingSelection(false)
  setDragOffset({ x: 0, y: 0 })
  renderOnTemporalCanvas();
  
 }
 
 const deleteSelection = () => {
  // Evitar cálculos repetitivos
  const { bounds, pixels } = currentSelection;
  const { x: translateX, y: translateY } = bounds;
  
  // Usar un color transparente constante
  const transparentColor = "rgba(0, 0, 0, 0)";
  
  // Iterar más eficientemente
  for (const pixel of pixels.values()) {
    paintPixel(
      pixel.x + translateX,
      pixel.y + translateY,
      { width: 1, color: transparentColor }
    );
  }
  
  // Resetear todos los estados relacionados con la selección
  resetSelectionState();
  
  // Renderizar una sola vez al final
  renderOnTemporalCanvas();
};

// Función auxiliar para resetear el estado
const resetSelectionState = () => {
  setSelectionStart(null);
  setSelectionEnd(null);
  setFinalizedSelection(false);
  setCurrentSelection(null);
  setIsDraggingSelection(false);
  setDragOffset({ x: 0, y: 0 });
};

const fillSelection = ()=>{
  
}

const groupSelection = ()=>{
  //Debemos guardar la posicion exacta de las coordenadas y colores de cada pixel seleccionado
  //Esta seleccion se guardara en el objeto de cada capa en groups[], esto solo agrupara, y se guardara con un id especifico
  /*
  group = {id:5, selectionMap()}
  */
 console.log(currentSelection);
 const selectedLayer = layers.find(layer => layer.id === selectedLayerId);
 console.log(selectedLayer);

 selectedLayer.group.push(currentSelection);
 // Para un grupo se tiene que guardar la posicion exacta de cada pixel, color 
}
// ==================== ASDASDAS ====================



  // ==================== RENDERIZADO ====================
  
  return (
    <div className="workspace2-container">
      <div className="workspace-container">
       
        
        <div 
  className="workspace"
  ref={workspaceRef}
  onMouseDown={handleMouseDown}
  onMouseMove={isDraggingSelection ? handleSelectionDragMove : handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseLeave}
>
          <div 
            className="canvas-container"
            style={{
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
              willChange: 'transform'
            }}
          >
            <div 
              className="artboard" 
              style={{ width: width * zoom, height: height * zoom }}
              ref={artboardRef}
            >
              {/* Capas ordenadas por zIndex */}
              {layers
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(layer => (
                  <canvas
                    key={layer.id}
                    ref={el => canvasRefs.current[layer.id] = el}
                    width={width * zoom}
                    height={height * zoom}
                    className={`layer-canvas ${!layer.visible ? 'hidden' : ''}`}
                    style={{ zIndex: layer.zIndex }}
                  />
                ))
              }

              {/* Canvas temporal para selecciones */}
              {(tool === Tools.Seleccion || tool === Tools.Lazo) &&
                <canvas
                  ref={temporalCanvasRef}
                  width={width * zoom}
                  height={height * zoom}
                  className="temporal-canvas"
                  style={{
                    zIndex: 100,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                   
                  }}
                />
              }
              
              {/* Canvas de selección */}
              {(tool === Tools.Seleccion || tool === Tools.Lazo) &&
  <>
   <canvas
    ref={overlayCanvasRef}
    width={width * zoom}
    height={height * zoom}
    className="overlay-canvas"
    style={{ zIndex: 9999, position: 'absolute' }}
    onMouseDown={handlePropagationCanvasMouseDown}
  />
  
  {currentSelection && currentSelection.bounds &&
  <div className='workspace-selection-actions'
  style={{top:`${currentSelection.bounds.y*zoom}px`,
          left:`${(currentSelection.bounds.x + currentSelection.bounds.width)*zoom }px`,
          width:`fit-content`,
          height:`fit-content`
          }
          }
  >
    <div className='selection-actions-buttons'>
      <button className='action-button' onClick={deleteSelection}>
          <span className='icon'>
          <LuEraser/>
          </span>
          <p className='action-text'>Borrar</p>
         
      </button>
      <button className='action-button'>
          <span className='icon'>
            <LuPaintBucket/>
          </span>
          <p className='action-text'>Rellenar</p>
      </button>
      <button className='action-button' onClick={deselect}>
          <span className='icon'>
            <LuPointerOff/>
          </span>
          <p className='action-text'>Deseleccionar</p>
      </button>
      <button className='action-button' onClick={groupSelection }>
          <span className='icon'>
            <LuGroup/>
          </span>
          <p className='action-text'>Agrupar</p>
      </button>
    </div>

  </div>
  
  }
  
  </>
 
  
}
{(tool === Tools.Pincel || tool === Tools.Rellenar || tool === Tools.Borrar) &&
<canvas
  ref={previewCanvasRef}
  width={width * zoom}
  height={height * zoom}
  className="preview-canvas"
  style={{
    zIndex: 9998, // Justo debajo del canvas de selección pero encima del resto
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none' // Importante para que no interfiera con los eventos del mouse
  }}
/>}
              {/* Cuadrícula */}
              {activeGrid &&
               <div 
               className="grid-overlay" 
               style={{ 
                 width: width * zoom, 
                 height: height * zoom,
                 backgroundSize: `${zoom}px ${zoom}px`
               }}
             />
              
              }
             
            </div>
          </div>
        </div>
      </div>
      
      <div className='right-panel'>
        {/* Panel de herramientas */}
        <CustomTool 
          tool={tool} 
          setToolParameters={setToolParameters}
          toolParameters={toolParameters}
        />
        
        {/* Panel de capas */}
        <div className="layers-panel">
          <div className="layers-header">
            <h3>Capas</h3>
            <SlLayers />
            <div className="layer-actions">
              <button onClick={addNewLayer} title="Nueva capa">+</button>
            </div>
          </div>
          
          <div className="layers-list">
            {organizedLayers().map(item => (
              <div 
                key={`layer-${item.id}`} 
                className={`layer-item ${selectedLayerId === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedLayerId(item.id)}
              >
                <button 
                  className="toggle-visibility"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(item.id);
                  }}
                >
                  {item.visible ? <LuEye/> : <LuEyeOff/>}
                </button>
                
                <span className="layer-name">{item.name}</span>
                
                <div className="layer-order-buttons">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayerUp(item.id);
                    }}
                    disabled={item.zIndex === Math.max(...layers.map(l => l.zIndex))}
                  >
                    ↑
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayerDown(item.id);
                    }}
                    disabled={item.zIndex === Math.min(...layers.map(l => l.zIndex))}
                  >
                    ↓
                  </button>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(item.id);
                  }} 
                  title="Eliminar capa"
                >
                  <LuTrash2/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace2