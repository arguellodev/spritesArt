import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  LuGrid2X2, 
  LuCircleMinus,
  LuCirclePlus,
  LuDownload,
} from "react-icons/lu";
import './workspace.css';
import ColorSelector from '../colorSelector/colorSelector';
import { CustomPaint, CustomErase, CustomSelect, StartNewSelection, IsPixelSelected } from '../pixelFunctions/pixelFunctions';
import CustomTool from './customTool/customTool';

// CONSTANTES Y DEFINICIONES
// ========================

// Herramientas disponibles
const TOOLS = {
  PENCIL: 'pencil',
  ERASER: 'eraser',
  SELECT: 'select',
};

// COMPONENTE PRINCIPAL
// ====================

const Workspace = ({
  width = 32,
  height = 32,
  initialZoom = 10,
  showGridByDefault = true,
  themeColor = 'dark',
  tool 
}) => {
  // ESTADOS PRINCIPALES
  // ===================
  
  // Estados de visualización
  const [zoom, setZoom] = useState(initialZoom);
  const [showGrid, setShowGrid] = useState(showGridByDefault);
  
  // Estados de dibujo
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [toolParameters, setToolParameters] = useState({});
  
  // Estados de selección
  const [selection, setSelection] = useState(new Set());
  const [selectionRect, setSelectionRect] = useState(null);
  const [lastSelectionRect, setLastSelectionRect] = useState(null);
  const [selectionOffset, setSelectionOffset] = useState({ x: 0, y: 0 });
  const [activeSelectionMode, setActiveSelectionMode] = useState('selection');

  // Aqui se guarda el canvas antes de una selección para no hacer un cambio permanente y no se eliminen componentes solapa
  const [preSelectionCanvas, setPreSelectionCanvas] = useState(null);

  // REFERENCIAS
  // ===========
  
  // Referencias de canvas
  const canvasRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const visibleCanvasRef = useRef(null);
  const selectionCanvasRef = useRef(null);
  const offscreenCanvasRef = useRef(document.createElement('canvas'));
  const offscreenCtxRef = useRef(null);
  const containerRef = useRef(null);
 
  // Referencias de estado de dibujo
  const lastPointRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const dataRef = useRef(new Uint8ClampedArray(width * height * 4).fill(0));
  const currentZoomRef = useRef(initialZoom);
  const showGridRef = useRef(showGridByDefault);
  const drawingStateRef = useRef({
    isDrawing: false,
    isMouseDown: false,
    isOverCanvas: false,
    lastPoint: null
  });
  const currentToolRef = useRef(tool);
  
  // Referencias de selección
  const selectionStartRef = useRef(null);
  const isSelectingRef = useRef(false);
  const moveStartRef = useRef(null);
  const movedSelectionContentRef = useRef(new Map());

  // INICIALIZACIÓN
  // ==============
  
  useEffect(() => {
    const offscreenCanvas = offscreenCanvasRef.current;
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtxRef.current = offscreenCanvas.getContext('2d');
  }, [width, height]);

  // Sincronización de refs con estados
  useEffect(() => {
    currentZoomRef.current = zoom;
  }, [zoom]);
  
  useEffect(() => {
    showGridRef.current = showGrid;
  }, [showGrid]);
  
  useEffect(() => {
    currentToolRef.current = tool;
  }, [tool]);
  
  useEffect(() => {
    drawingStateRef.current.isDrawing = isDrawing;
  }, [isDrawing]);

  // PALETA DE COLORES
  // =================
  
  const colorPalette = useMemo(() => [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080',
    '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
  ], []);

  // FUNCIONES DE MANEJO DE PÍXELES
  // ==============================
  
  /**
   * Obtiene el índice en el array de datos para las coordenadas (x,y)
   */
  const getPixelIndex = useCallback((x, y) => {
    return (y * width + x) * 4;
  }, [width]);

  /**
   * Obtiene el color de un píxel en formato hexadecimal
   */
  const getPixelColor = useCallback((x, y) => {
    const i = getPixelIndex(x, y);
    const data = dataRef.current;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a === 0) return null;
    
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}`;
  }, [getPixelIndex]);

  /**
   * Establece el color de un píxel específico
   */
  const setPixelColor = useCallback((x, y, color) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    const i = getPixelIndex(x, y);
    const data = dataRef.current;
    
    if (color === null || color === 'transparent') {
        // Borrar (transparente)
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
    } else {
        // Convertir color hexadecimal a RGBA
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255; // Opacidad total
    }
  }, [getPixelIndex, width, height]);

  // FUNCIONES DE RENDERIZADO
  // ========================
  
  /**
   * Renderiza el canvas principal con los píxeles actuales
   */
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(dataRef.current);
    ctx.putImageData(imageData, 0, 0);
    
    requestAnimationFrame(() => {
      const visibleCanvas = visibleCanvasRef.current;
      if (!visibleCanvas) return;
      
      const visibleCtx = visibleCanvas.getContext('2d');
      visibleCtx.imageSmoothingEnabled = false;
      visibleCtx.webkitImageSmoothingEnabled = false;
      
      const container = containerRef.current;
      if (container) {
        const visibleRect = container.getBoundingClientRect();
        const scale = currentZoomRef.current;
        
        visibleCtx.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
        visibleCtx.drawImage(
          canvas,
          0, 0, width, height,
          0, 0, width * scale, height * scale
        );
      }
      
      if (showGridRef.current) {
        renderGrid();
      }
    });
  }, [width, height]);
 
  /**
   * Renderiza la cuadrícula sobre el canvas
   */
  const renderGrid = useCallback(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;
    
    gridCanvas.width = width * currentZoomRef.current;
    gridCanvas.height = height * currentZoomRef.current;
    
    const gridCtx = gridCanvas.getContext('2d');
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    if (showGridRef.current) {
      gridCtx.beginPath();
      gridCtx.strokeStyle = themeColor === 'dark' ? 'rgba(100, 100, 100, 0.3)' : 'rgba(200, 200, 200, 0.5)';
      gridCtx.lineWidth = 1;
      
      // Líneas verticales
      for (let x = 0; x <= width; x++) {
        gridCtx.moveTo(x * currentZoomRef.current, 0);
        gridCtx.lineTo(x * currentZoomRef.current, height * currentZoomRef.current);
      }
      
      // Líneas horizontales
      for (let y = 0; y <= height; y++) {
        gridCtx.moveTo(0, y * currentZoomRef.current);
        gridCtx.lineTo(width * currentZoomRef.current, y * currentZoomRef.current);
      }
      
      gridCtx.stroke();
    }
  }, [width, height, themeColor]);

  /**
   * Renderiza la selección actual sobre el canvas
   */
  const renderSelectionOverlay = useCallback(() => {
    const selectionCanvas = selectionCanvasRef.current;
    if (!selectionCanvas) return;
  
    const ctx = selectionCanvas.getContext('2d');
    const scale = currentZoomRef.current;
  
    // Limpiar selección previa
    ctx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
  
    // Dibujar rectángulo de selección activa
    if (selectionRect) {
      const { startX, startY, endX, endY } = selectionRect;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      
      ctx.strokeStyle = 'rgb(9, 132, 255)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        minX * scale,
        minY * scale,
        (maxX - minX + 1) * scale,
        (maxY - minY + 1) * scale
      );
      
      ctx.fillStyle = 'rgba(80, 80, 80, 0.1)';
      ctx.fillRect(
        minX * scale,
        minY * scale,
        (maxX - minX + 1) * scale,
        (maxY - minY + 1) * scale
      );
      
      if(selectionRect !== null){
        setLastSelectionRect(selectionRect);
      }
    }
   
    // Dibujar selección final (si existe)
    if (selection.size > 0) {
      const coords = Array.from(selection).map(key =>
        key.split(',').map(Number)
      );
      
      const xs = coords.map(([x]) => x);
      const ys = coords.map(([_, y]) => y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      if (!isSelectingRef.current && !selectionRect) {
        setLastSelectionRect({
          startX: minX,
          startY: minY,
          endX: maxX,
          endY: maxY
        });
      }
      
      ctx.strokeStyle = 'rgba(30, 144, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        minX * scale,
        minY * scale,
        (maxX - minX + 1) * scale,
        (maxY - minY + 1) * scale
      );
      
      if(activeSelectionMode === 'selection') {
        ctx.fillStyle = 'rgba(30, 144, 255, 0.1)';
        ctx.fillRect(
          minX * scale,
          minY * scale,
          (maxX - minX + 1) * scale,
          (maxY - minY + 1) * scale
        );
      }
      else if(activeSelectionMode === 'movingSelection') {
        ctx.fillStyle = 'rgba(30, 144, 255, 0.05)';
        ctx.fillRect(
          minX * scale,
          minY * scale,
          (maxX - minX + 1) * scale,
          (maxY - minY + 1) * scale
        );
        
        movedSelectionContentRef.current.forEach((color, key) => {
          if (color) {
            const [x, y] = key.split(',').map(Number);
            const newX = x + selectionOffset.x;
            const newY = y + selectionOffset.y;
            
            if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
              ctx.fillStyle = color;
              ctx.fillRect(
                newX * scale,
                newY * scale,
                scale,
                scale
              );
            }
          }
        });
      }
    }
  }, [selection, selectionRect, zoom, activeSelectionMode, lastSelectionRect, selectionOffset, width, height]);

  // FUNCIONES DE HERRAMIENTAS DE DIBUJO
  // ===================================
  
  /**
   * Aplica la herramienta actual en las coordenadas especificadas
   */
  const NewApplyCurrentTool = useCallback((x, y) => {
    if (tool === TOOLS.PENCIL) {
      CustomPaint(x, y, toolParameters, selectedColor, setPixelColor);
    } else if (tool === TOOLS.ERASER) {
      CustomErase(x, y, toolParameters, null, setPixelColor);
    } else if (tool === TOOLS.SELECT) {
      CustomSelect(x, y, toolParameters, null, setSelection);
    } else if (tool === 'displace') {
      // Herramienta de desplazamiento (no implementada)
    }
  }, [tool, selectedColor, setPixelColor, toolParameters]);

  /**
   * Dibuja una línea entre dos puntos usando el algoritmo de Bresenham
   */
  const drawLine = useCallback((x0, y0, x1, y1) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
        NewApplyCurrentTool(x0, y0);
        
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            if (x0 === x1) break;
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            if (y0 === y1) break;
            err += dx;
            y0 += sy;
        }
    }
  }, [NewApplyCurrentTool]);

  // FUNCIONES DE MANEJO DE SELECCIÓN
  // ================================
  
  /**
   * Finaliza la selección actual y procesa los píxeles seleccionados
   */
  const finalizeSelection = useCallback((startX, startY, endX, endY) => {
    startX = Math.max(0, Math.min(width - 1, startX));
    startY = Math.max(0, Math.min(height - 1, startY));
    endX = Math.max(0, Math.min(width - 1, endX));
    endY = Math.max(0, Math.min(height - 1, endY));
    
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    StartNewSelection(setSelection);
    
    let contentMinX = maxX;
    let contentMaxX = minX;
    let contentMinY = maxY;
    let contentMaxY = minY;
    let hasContent = false;
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const color = getPixelColor(x, y);
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          hasContent = true;
          contentMinX = Math.min(contentMinX, x);
          contentMaxX = Math.max(contentMaxX, x);
          contentMinY = Math.min(contentMinY, y);
          contentMaxY = Math.max(contentMaxY, y);
        }
      }
    }
    
    if (!hasContent) {
      contentMinX = minX;
      contentMaxX = maxX;
      contentMinY = minY;
      contentMaxY = maxY;
    }
    
    const newSelection = new Set();
    for (let y = contentMinY; y <= contentMaxY; y++) {
      for (let x = contentMinX; x <= contentMaxX; x++) {
        const color = getPixelColor(x, y);
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          newSelection.add(`${x},${y}`);
        }
      }
    }
    
    setSelection(newSelection);
    
    const newRect = {
      startX: contentMinX,
      startY: contentMinY,
      endX: contentMaxX,
      endY: contentMaxY
    };
    
    setLastSelectionRect(newRect);
    setSelectionRect(null);
    renderSelectionOverlay();
  }, [width, height, getPixelColor]);

  /**
   * Actualiza el rectángulo de selección visual mientras se arrastra
   */
  const updateSelectionRect = useCallback((currentX, currentY) => {
    if (!isSelectingRef.current || !selectionStartRef.current) return;

    const { x: startX, y: startY } = selectionStartRef.current;
    
    setSelectionRect({
      startX,
      startY,
      endX: currentX,
      endY: currentY
    });
  }, []);

  /**
   * Finaliza el movimiento de la selección y aplica los cambios
   */
  const finalizeSelectionMove = useCallback((explicitOffsetX, explicitOffsetY) => {
    const effectiveOffset = {
      x: explicitOffsetX !== undefined ? explicitOffsetX : selectionOffset.x,
      y: explicitOffsetY !== undefined ? explicitOffsetY : selectionOffset.y
    };

    if (effectiveOffset.x === 0 && effectiveOffset.y === 0) return;
    if (selection.size === 0) return;

    const newSelection = new Set();
    const newPositions = new Map();
    const originalColors = new Map();
    
    selection.forEach(pixelKey => {
      const [x, y] = pixelKey.split(',').map(Number);
      const color = movedSelectionContentRef.current.get(pixelKey) || getPixelColor(x, y);
      originalColors.set(pixelKey, color);
    });

    selection.forEach(pixelKey => {
      const [x, y] = pixelKey.split(',').map(Number);
      const originalColor = originalColors.get(pixelKey);

      if (originalColor) {
        const newX = x + effectiveOffset.x;
        const newY = y + effectiveOffset.y;

        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          const newKey = `${newX},${newY}`;
          newPositions.set(newKey, originalColor);
          newSelection.add(newKey);
        }
      }
    });

    newPositions.forEach((color, pixelKey) => {
      const [newX, newY] = pixelKey.split(',').map(Number);
      setPixelColor(newX, newY, color);
    });

    selection.forEach(pixelKey => {
      if (!newPositions.has(pixelKey)) {
        const [x, y] = pixelKey.split(',').map(Number);
        setPixelColor(x, y, null);
      }
    });

    setSelection(newSelection);

    if (newSelection.size > 0) {
      const newCoords = Array.from(newSelection).map(key =>
        key.split(',').map(Number)
      );

      const newXs = newCoords.map(([x]) => x);
      const newYs = newCoords.map(([_, y]) => y);
      const minX = Math.min(...newXs);
      const maxX = Math.max(...newXs);
      const minY = Math.min(...newYs);
      const maxY = Math.max(...newYs);

      const newRect = {
        startX: minX,
        startY: minY,
        endX: maxX,
        endY: maxY
      };

      setLastSelectionRect(newRect);
      setSelectionRect(newRect);
    }

    renderCanvas();
    requestAnimationFrame(() => {
      renderSelectionOverlay();
    });

    movedSelectionContentRef.current = new Map();
  }, [
    selection,
    selectionOffset,
    width,
    height,
    lastSelectionRect,
    setPixelColor,
    getPixelColor,
    setSelection,
    renderCanvas,
    renderSelectionOverlay,
    setSelectionRect,
    setLastSelectionRect
  ]);

  // FUNCIONES DE MANIPULACIÓN DE SELECCIÓN
  // ======================================
  
  /**
   * Rellena la selección actual con el color seleccionado
   */
  const fillSelection = useCallback(() => {
    if (selection.size === 0) return;
    
    selection.forEach(pixelKey => {
      const [x, y] = pixelKey.split(',').map(Number);
      setPixelColor(x, y, selectedColor);
    });
    
    renderCanvas();
  }, [selection, selectedColor, setPixelColor, renderCanvas]);

  /**
   * Copia la selección actual (no implementado completamente)
   */
  const copySelection = useCallback(() => {
    // Implementación para copiar píxeles seleccionados
  }, [selection]);

  /**
   * Borra (elimina) los píxeles seleccionados
   */
  const deleteSelection = useCallback(() => {
    if (selection.size === 0) return;
    
    selection.forEach(pixelKey => {
      const [x, y] = pixelKey.split(',').map(Number);
      setPixelColor(x, y, null);
    });
    
    renderCanvas();
  }, [selection, setPixelColor, renderCanvas]);

  /**
   * Limpia la selección sin afectar los píxeles
   */
  const clearSelection = useCallback(() => {
    setSelection(new Set());
    setSelectionRect(null);
    renderSelectionOverlay();
  }, []);

  /**
   * Duplica la selección actual
   */
  const duplicateSelection = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (selection.size === 0) return;
    
    const duplicatedContent = new Map();
    selection.forEach(pixelKey => {
        const [x, y] = pixelKey.split(',').map(Number);
        const color = getPixelColor(x, y);
        duplicatedContent.set(pixelKey, color);
    });
    
    const duplicateOffset = { x: 10, y: 10 };
    const newSelection = new Set();
    const newPixels = new Map();
    
    selection.forEach(pixelKey => {
        const [x, y] = pixelKey.split(',').map(Number);
        const newX = x + duplicateOffset.x;
        const newY = y + duplicateOffset.y;
        const newKey = `${newX},${newY}`;
        newSelection.add(newKey);
        newPixels.set(newKey, duplicatedContent.get(pixelKey));
    });
    
    newPixels.forEach((color, pixelKey) => {
        const [x, y] = pixelKey.split(',').map(Number);
        setPixelColor(x, y, color);
    });
    
    setSelection(newSelection);
    
    if (lastSelectionRect) {
        setSelectionRect({
            startX: lastSelectionRect.startX + duplicateOffset.x,
            startY: lastSelectionRect.startY + duplicateOffset.y,
            endX: lastSelectionRect.endX + duplicateOffset.x,
            endY: lastSelectionRect.endY + duplicateOffset.y
        });
        renderSelectionOverlay();
        renderCanvas();
    }
  };

  // FUNCIONES DE MANEJO DE EVENTOS
  // ==============================
  
  /**
   * Maneja el cambio de zoom
   */
  const handleZoomChange = useCallback((newZoom, e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e ? e.clientX - rect.left : rect.width / 2;
    const mouseY = e ? e.clientY - rect.top : rect.height / 2;
    
    const mouseAbsX = mouseX + container.scrollLeft;
    const mouseAbsY = mouseY + container.scrollTop;

    const oldZoom = currentZoomRef.current;
    const pixelX = mouseAbsX / oldZoom;
    const pixelY = mouseAbsY / oldZoom;

    const clampedZoom = Math.min(Math.max(newZoom, 4), 64);
    setZoom(clampedZoom);

    const newPosX = pixelX * clampedZoom;
    const newPosY = pixelY * clampedZoom;
    
    requestAnimationFrame(() => {
      container.scrollLeft = newPosX - mouseX;
      container.scrollTop = newPosY - mouseY;
    });
  }, []);

  /**
   * Convierte coordenadas de evento a coordenadas de píxel
   */
  const eventToPixelCoords = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / currentZoomRef.current);
    const y = Math.floor((e.clientY - rect.top) / currentZoomRef.current);
    return { x, y };
  }, []);

  /**
   * Convierte coordenadas absolutas del mouse a coordenadas de píxel
   */
  const absoluteToPixelCoords = useCallback((clientX, clientY) => {
    const canvas = visibleCanvasRef.current;
    if (!canvas) return { x: -1, y: -1 };
    
    const rect = canvas.getBoundingClientRect();
    const container = containerRef.current;
    
    const scrollLeft = container ? container.scrollLeft : 0;
    const scrollTop = container ? container.scrollTop : 0;
    
    const rawX = clientX - rect.left + scrollLeft;
    const rawY = clientY - rect.top + scrollTop;
    
    const x = Math.floor(rawX / currentZoomRef.current);
    const y = Math.floor(rawY / currentZoomRef.current);
    
    return { x, y };
  }, []);

  /**
   * Procesa el dibujo continuo entre puntos
   */
  const processDraw = useCallback((x, y) => {
    if (!drawingStateRef.current.isDrawing) return;
  
    const lastPoint = drawingStateRef.current.lastPoint;
  
    if (lastPoint) {
        drawLine(
            lastPoint.x,
            lastPoint.y,
            x,
            y
        );
    } else {
        NewApplyCurrentTool(x, y);
    }
  
    drawingStateRef.current.lastPoint = { x, y };
    renderCanvas();
  }, [drawLine, renderCanvas, NewApplyCurrentTool]);

  /**
   * Maneja el movimiento de la selección
   */
  const moveSelection = useCallback(() => {
    // Función de marcador de posición para movimiento de selección
  }, []);

  /**
   * Maneja el inicio del movimiento de selección
   */
  const movePressSelection = (e) => {
  
    e.preventDefault();
    e.stopPropagation();
    
    if (selection.size === 0) return;
    
    setActiveSelectionMode('movingSelection');
    movedSelectionContentRef.current = new Map();
    
    selection.forEach(pixelKey => {
        const [x, y] = pixelKey.split(',').map(Number);
        const color = getPixelColor(x, y);
        movedSelectionContentRef.current.set(pixelKey, color);
    });
    
    moveStartRef.current = absoluteToPixelCoords(e.clientX, e.clientY);
    setSelectionRect(null);

    function handleMouseMove(moveEvent) {
      if (!moveStartRef.current) return;
      
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      const currentPos = absoluteToPixelCoords(moveEvent.clientX, moveEvent.clientY);
      const offsetX = currentPos.x - moveStartRef.current.x;
      const offsetY = currentPos.y - moveStartRef.current.y;
      
      setSelectionOffset(prev => {
          if (prev.x !== offsetX || prev.y !== offsetY) {
              return { x: offsetX, y: offsetY };
          }
          return prev;
      });
      
      if (lastSelectionRect) {
          setSelectionRect({
              startX: lastSelectionRect.startX + offsetX,
              startY: lastSelectionRect.startY + offsetY,
              endX: lastSelectionRect.endX + offsetX,
              endY: lastSelectionRect.endY + offsetY
          });
      }
    }

    function handleMouseUp(upEvent) {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      
      upEvent.preventDefault();
      upEvent.stopPropagation();
      
      const currentPos = absoluteToPixelCoords(upEvent.clientX, upEvent.clientY);
      const finalOffsetX = currentPos.x - moveStartRef.current.x;
      const finalOffsetY = currentPos.y - moveStartRef.current.y;
      renderCanvas();
      finalizeSelectionMove(finalOffsetX, finalOffsetY);
      
      setActiveSelectionMode('selection');
      moveStartRef.current = null;
      setSelectionOffset({ x: 0, y: 0 });
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, { once: true });
  };

  // MANEJADORES DE EVENTOS GLOBALES
  // ==============================
  
  useEffect(() => {
    const handleGlobalMouseDown = (e) => {
      if (e.button === 0) {
        drawingStateRef.current.isMouseDown = true;
      }
    };
    
    const handleGlobalMouseUp = (e) => {
      if (isSelectingRef.current && selectionStartRef.current && selectionRect) {
        const { x: startX, y: startY } = selectionStartRef.current;
        const { x: endX, y: endY } = absoluteToPixelCoords(e.clientX, e.clientY);
        finalizeSelection(startX, startY, endX, endY);
      }
      
      drawingStateRef.current.isMouseDown = false;
      drawingStateRef.current.isDrawing = false;
      drawingStateRef.current.lastPoint = null;
      setIsDrawing(false);
      
      isSelectingRef.current = false;
      selectionStartRef.current = null;
    };
    
    document.addEventListener('mousedown', handleGlobalMouseDown);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousedown', handleGlobalMouseDown);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [absoluteToPixelCoords, finalizeSelection, selectionRect]);

  /**
   * Maneja el movimiento global del mouse para dibujo/selección
   */
  const handleGlobalMouseMove = useCallback((e) => {
    const { x, y } = absoluteToPixelCoords(e.clientX, e.clientY);
    mousePosRef.current = { x, y };
    
    const brushSize = 10;
    const hasIntersection = x + brushSize > 0 && x < width && 
                          y + brushSize > 0 && y < height;
    
    if (tool === TOOLS.SELECT) {
      if (isSelectingRef.current) {
        updateSelectionRect(x, y);
      } else if (hasIntersection && drawingStateRef.current.isMouseDown && !isSelectingRef.current) {
        isSelectingRef.current = true;
        selectionStartRef.current = { x, y };
        setSelection(new Set());
        updateSelectionRect(x, y);
      }
    } else {
      if (hasIntersection && drawingStateRef.current.isMouseDown && !drawingStateRef.current.isDrawing) {
        drawingStateRef.current.isDrawing = true;
        setIsDrawing(true);
        
        NewApplyCurrentTool(x, y);
        renderCanvas();
        
        drawingStateRef.current.lastPoint = { x, y };
      }
      else if (hasIntersection && drawingStateRef.current.isDrawing) {
        processDraw(x, y);
      } 
      else if (drawingStateRef.current.isDrawing) {
        drawingStateRef.current.lastPoint = null;
      }
    }
  }, [absoluteToPixelCoords, processDraw, updateSelectionRect, width, height, NewApplyCurrentTool, renderCanvas, tool]);
  
  useEffect(() => {
    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [handleGlobalMouseMove]);
  
  /**
   * Inicia el dibujo o selección
   */
  const startDrawing = useCallback((e) => {
    if (e.button !== 0) return;
    
    const { x, y } = absoluteToPixelCoords(e.clientX, e.clientY);
    const brushSize = 10;
    const hasIntersection = x + brushSize > 0 && x < width && 
                          y + brushSize > 0 && y < height;
    
    if (!hasIntersection) return;
    
    if (tool === TOOLS.SELECT) {
      isSelectingRef.current = true;
      selectionStartRef.current = { x, y };
      setSelection(new Set());
      setSelectionRect({ startX: x, startY: y, endX: x, endY: y });
    } else {
      drawingStateRef.current.isMouseDown = true;
      drawingStateRef.current.isDrawing = true;
      drawingStateRef.current.lastPoint = { x, y };
      
      setIsDrawing(true);
      NewApplyCurrentTool(x, y);
      renderCanvas();
    }
  }, [absoluteToPixelCoords, NewApplyCurrentTool, renderCanvas, width, height, tool]);

  // FUNCIONES DE UTILIDAD
  // =====================
  
  /**
   * Maneja eventos táctiles
   */
  const handleTouchMove = useCallback((e) => {
    if (!drawingStateRef.current.isDrawing) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const { x, y } = absoluteToPixelCoords(touch.clientX, touch.clientY);
    processDraw(x, y);
  }, [absoluteToPixelCoords, processDraw]);

  /**
   * Limpia todo el lienzo
   */
  const clearCanvas = useCallback(() => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todo el lienzo?')) {
      const data = dataRef.current;
      for (let i = 0; i < data.length; i++) {
        data[i] = 0;
      }
      setSelection(new Set());
      setSelectionRect(null);
      renderCanvas();
    }
  }, [renderCanvas]);

  /**
   * Exporta el lienzo como PNG
   */
  const exportAsPNG = useCallback(() => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(dataRef.current);
    ctx.putImageData(imageData, 0, 0);
    
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [width, height]);

  /**
   * Obtiene el cursor apropiado para la herramienta actual
   */
  const getCursor = useCallback(() => {
    switch (tool) {
      case TOOLS.PENCIL:
        return 'crosshair';
      case TOOLS.ERASER:
        return 'cell';
      case TOOLS.SELECT:
        return 'crosshair';
      default:
        return 'crosshair';
    }
  }, [tool]);

  // EFECTOS DE INICIALIZACIÓN Y ACTUALIZACIÓN
  // =========================================
  
  useEffect(() => {
    const offscreenCanvas = canvasRef.current;
    if (offscreenCanvas) {
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
    }
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      return () => {
        container.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [width, height, handleTouchMove]);
  
  useEffect(() => {
    const updateCanvasSizes = () => {
      const visibleCanvas = visibleCanvasRef.current;
      if (visibleCanvas) {
        visibleCanvas.width = width * zoom;
        visibleCanvas.height = height * zoom;
      }
      
      const gridCanvas = gridCanvasRef.current;
      if (gridCanvas) {
        gridCanvas.width = width * zoom;
        gridCanvas.height = height * zoom;
      }
      
      const selectionCanvas = selectionCanvasRef.current;
      if (selectionCanvas) {
        selectionCanvas.width = width * zoom;
        selectionCanvas.height = height * zoom;
      }
    };
    
    updateCanvasSizes();
    renderCanvas();
  }, [zoom, width, height, renderCanvas]);
  
  useEffect(() => {
    renderGrid();
  }, [showGrid, renderGrid]);
  
  useEffect(() => {
    renderSelectionOverlay();
  }, [selection, selectionRect, renderSelectionOverlay]);

  //Usaremos un useeffect para actualizar el canvas de dataref.current
  useEffect(() => {
    console.log('se cambio en canvas de selección');
    
    
  }, [selectionOffset]);




  // RENDERIZADO DEL COMPONENTE
  // =========================
  
  return (    
    <div className='main-workspace-section'>
      <div 
        ref={containerRef}
        className={`workspace-container ${themeColor}`}
        onWheel={(e) => {
          e.preventDefault(); // Esto evita el scroll
          if (e.deltaY < 0) {
            handleZoomChange(zoom + 0.25, e); // Zoom in
          } else {
            handleZoomChange(zoom - 0.25, e); // Zoom out
          }
        }}
      >
        {/* Canvas oculto para manipulación de píxeles */}
        <canvas 
          ref={canvasRef} 
          style={{ display: 'none' }} 
        />
        
        {/* Barra de herramientas */}
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-group">
            <div className="workspace-toolbar-item">
              <LuGrid2X2 className="workspace-button-icon" />
              <span>
                {width} × {height}
              </span>
            </div>
           
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`workspace-button ${showGrid ? 'active' : ''}`}
              title={showGrid ? "Ocultar cuadrícula" : "Mostrar cuadrícula"}
            >
              <LuGrid2X2 className="workspace-button-icon" />
            </button>
            
            <div className="workspace-zoom-controls">
              <button
                onClick={() => handleZoomChange(zoom - 2)}
                className="workspace-button"
                disabled={zoom <= 4}
                title="Reducir zoom"
              >
                <LuCircleMinus className="workspace-button-icon" />
              </button>
              <span className="workspace-zoom-value">{zoom}px</span>
              <button
                onClick={() => handleZoomChange(zoom + 2)}
                className="workspace-button"
                disabled={zoom >= 64}
                title="Aumentar zoom"
              >
                <LuCirclePlus className="workspace-button-icon" />
              </button>
            </div>
          </div>

          <div className="workspace-toolbar-group">
            <ColorSelector setSelectedColor={setSelectedColor} selectedColor={selectedColor}/>
            <button
              onClick={clearCanvas}
              className="workspace-clear-button"
              title="Limpiar lienzo"
            >
              Limpiar
            </button>
            
            <button
              onClick={exportAsPNG}
              className="workspace-export-button"
              title="Exportar como PNG"
            >
              <LuDownload className="workspace-button-icon" /> Exportar
            </button>
          </div>
        </div>

        {/* Área de dibujo */}
        <div className="workspace-grid-container">
          <div 
            className="workspace-drawing-area"
            style={{
              width: width * zoom,
              height: height * zoom,
              cursor: getCursor(),
            }}
            onMouseLeave={() => {
              // Forzar la interrupción al salir del área
              if (drawingStateRef.current.isDrawing) {
                drawingStateRef.current.isDrawing = false;
                drawingStateRef.current.lastPoint = null;
                setIsDrawing(false);
              }
              // Also stop selection
              if (isSelectingRef.current) {
                isSelectingRef.current = false;
                selectionStartRef.current = null;
                setSelectionRect(null);
              }
            }}
          >
            {/* Canvas visible para dibujo */}
            <canvas 
  ref={visibleCanvasRef}
  className="workspace-visible-canvas"
  width={width * zoom}
  height={height * zoom}
  onMouseDown={startDrawing}  // Add this line to connect startDrawing
  onTouchStart={(e) => {
    const touch = e.touches[0];
    const { x, y } = absoluteToPixelCoords(touch.clientX, touch.clientY);
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));
    
    if (tool === TOOLS.SELECT) {
      isSelectingRef.current = true;
      selectionStartRef.current = { x: clampedX, y: clampedY };
      setSelection(new Set()); // Clear previous selection
      setSelectionRect({ startX: clampedX, startY: clampedY, endX: clampedX, endY: clampedY });
    } else {
      drawingStateRef.current.isDrawing = true;
      drawingStateRef.current.lastPoint = { x: clampedX, y: clampedY };
      
      setIsDrawing(true);
      NewApplyCurrentTool(clampedX, clampedY);
      renderCanvas();
    }
  }}
  onTouchEnd={(e) => {
    if (isSelectingRef.current && selectionStartRef.current && selectionRect) {
      const touch = e.changedTouches[0];
      const { x: endX, y: endY } = absoluteToPixelCoords(touch.clientX, touch.clientY);
      finalizeSelection(
        selectionStartRef.current.x,
        selectionStartRef.current.y,
        endX,
        endY
      );
    }
    
    drawingStateRef.current.isDrawing = false;
    drawingStateRef.current.lastPoint = null;
    setIsDrawing(false);
    
    // Also end selection
    isSelectingRef.current = false;
    selectionStartRef.current = null;
  }}
  onContextMenu={(e) => e.preventDefault()}
/>
            
            {/* Canvas for grid */}
            <canvas 
              ref={gridCanvasRef}
              className="workspace-grid-canvas"
              width={width * zoom}
              height={height * zoom}
            />
            
            {/* Canvas for selection overlay */}
            <canvas 
              ref={selectionCanvasRef}
              className="workspace-selection-canvas"
              width={width * zoom}
              height={height * zoom}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none' // Don't interfere with mouse events
              }}
            />
           
       
                 {/* Selection Actions Panel (only visible when selection exists) */}
                 {selection.size > 0 && (
          <div 
        className="workspace-selection-actions"
        onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
        }}
        onMouseDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
        }}
        style={{
            position: 'absolute',
            left: lastSelectionRect.endX*zoom+30,
            top: lastSelectionRect.startY*zoom
        }}
    >
        <button 
            onMouseDown={movePressSelection}
            onClick={()=>{
              
            }}
            className="workspace-selection-button"
            title="Move selection"
        >
            Move
        </button>
            <button 
              onClick={fillSelection}
              className="workspace-selection-button"
              title="Fill selection with current color"
            >
              Fill
            </button>
            <button 
              onClick={copySelection}
              className="workspace-selection-button"
              title="Copy selected pixels"
            >
              Copy
            </button>
            <button 
              onClick={deleteSelection}
              className="workspace-selection-button"
              title="Delete selected pixels"
            >
              Delete
            </button>
            <button 
              onClick={clearSelection}
              className="workspace-selection-button"
              title="Clear selection"
            >
              Deselect
            </button>
            <button 
              onClick={duplicateSelection}
              className="workspace-selection-button"
              title="Clear selection"
            >
              Duplicate
            </button>
          </div>
        )}
          </div>
       
       
          
        </div>
        
        
      </div>
      <div className='right-panel'>
        <CustomTool tool={tool} toolParameters={toolParameters} setToolParameters={setToolParameters}/>
        
        {/* Add selection tool parameters if needed */}
        {tool === TOOLS.SELECT && (
          <div className="selection-tool-options">
            <h3>Selection Options</h3>
            <p>Selected pixels: {selection.size}</p>
            {/* Additional selection options can go here */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workspace;