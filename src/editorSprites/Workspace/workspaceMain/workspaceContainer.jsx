import { useCallback, useEffect, useRef, useState } from 'react';
import { usePointer, useLayerManager } from '../hooks/hooks';
import { LuEye, LuEyeOff, LuTrash2, LuEraser, LuGroup ,LuUngroup, LuMousePointerBan, LuPaintBucket, LuPointerOff, LuGrid2X2  } from "react-icons/lu";
import { SlLayers } from "react-icons/sl";
import ViewportNavigator from './viewportNavigator';
import CustomTool from '../customTool/customTool';
import './workspaceContainer.css'
import LayerManager from './layerManager';
import ColorPicker from '../customTool/tools/colorPicker';

//Inicializamos las herramientas disponibles 

const TOOLS = {
  paint : "pencil",
  erase : "eraser",
  select: "select",
  lassoSelect : 'lassoSelect',
  move: 'move',
  fill: 'fill',
  line: 'line',
  curve: 'curve' 
}

function CanvasTracker({setTool, tool,setToolParameters,toolParameters}) {
  const workspaceRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const selectionActionsRef = useRef(null);
  const artboardRef = useRef(null);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [zoom, setZoom] = useState(10);
  //Evaluacion de las medidas del canvas:
  const [workspaceWidth, setWorkspaceWidth] = useState(1000);
  const [workspaceHeight, setWorkspaceHeight] = useState(1000);
  const [color, setColor] = useState({ r: 0, g: 0, b: 0, a: 1 }); // Black default
  
 // Estados específicos para la herramienta de curva
 const [curveState, setCurveState] = useState('idle'); // 'idle', 'first-point', 'setting-control'
const [isSettingControl, setIsSettingControl] = useState(false);
const [lastPressState, setLastPressState] = useState(false);
 const curveStartRef = useRef(null);
 const curveEndRef = useRef(null);
 const curveControlRef = useRef(null);


const [clickStartTime, setClickStartTime] = useState(null);
  
  const lineStartRef = useRef(null);
/*Evaluar el tamaño del workspace para resize cuando se mueve */

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setWorkspaceWidth(width);
        setWorkspaceHeight(height);

      }
    });

    observer.observe(element);

    
    // Limpieza al desmontar
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Estado del grid
  const [activeGrid, setActiveGrid] = useState(true);
  
  // Canvas dimensions - manteniendo el tamaño total del canvas de pixel art
  const totalWidth = 64;
  const totalHeight = 64;

  // Configuración para el viewport con límite máximo de workspace, y de tamaño minimo el tamaño del canvas
  const [viewportWidth, setViewportWidth] = useState(Math.min(totalWidth, workspaceWidth.toFixed(0)/ zoom));
  const [viewportHeight, setViewportHeight] = useState(Math.min(totalHeight, workspaceHeight.toFixed(0) / zoom));
  
  // Actualizar el tamaño del viewport cuando cambia el zoom para mantener el límite de 600x600
  useEffect(() => {
    setViewportWidth(Math.min(totalWidth, Math.floor(workspaceWidth.toFixed(0)/ zoom)));
    setViewportHeight(Math.min(totalHeight, Math.floor(workspaceHeight.toFixed(0)/ zoom)));
  }, [zoom]);

 // 3. Función para dibujar curva cuadrática (Bézier)
// Reemplaza la función drawQuadraticCurve existente con esta versión mejorada:

const drawQuadraticCurve = (ctx, start, end, control, width) => {
  ctx.save();
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  
  // Generar puntos usando un muestreo más denso y conectar con líneas pixel a pixel
  const distance = Math.max(
    Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
    Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
    Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
  );
  
  // Incrementar significativamente el número de pasos para evitar huecos
  const steps = Math.max(distance * 3, 50);
  const points = [];
  
  // Generar todos los puntos de la curva
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round((1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x);
    const y = Math.round((1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y);
    points.push({ x, y });
  }
  
  // Función auxiliar para dibujar línea pixel perfecta usando Bresenham
  const drawPixelPerfectLine = (x0, y0, x1, y1, width) => {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0, y = y0;
    
    const offset = Math.floor(width / 2);
    const drawnPixels = new Set();
    
    while (true) {
      // Dibujar el brush en la posición actual
      for (let dy = 0; dy < width; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const px = x + dx - offset;
          const py = y + dy - offset;
          const key = `${px},${py}`;
          
          if (!drawnPixels.has(key) && px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
            ctx.fillRect(px, py, 1, 1);
            drawnPixels.add(key);
          }
        }
      }
      
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };
  
  // Conectar cada punto con el siguiente usando líneas pixel perfectas
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    // Solo dibujar si los puntos son diferentes
    if (current.x !== next.x || current.y !== next.y) {
      drawPixelPerfectLine(current.x, current.y, next.x, next.y, width);
    }
  }
  
  // Asegurar que el punto inicial y final estén dibujados
  const offset = Math.floor(width / 2);
  
  // Punto inicial
  for (let dy = 0; dy < width; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const px = start.x + dx - offset;
      const py = start.y + dy - offset;
      if (px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
  
  // Punto final
  for (let dy = 0; dy < width; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const px = end.x + dx - offset;
      const py = end.y + dy - offset;
      if (px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
  
  ctx.restore();
};

// También actualiza la función de preview de curva en el useEffect del preview:
// En la parte del preview de curva, reemplaza drawPreviewCurve con esta versión:

const drawPreviewCurve = (start, end, control, width) => {
  const distance = Math.max(
    Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
    Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
    Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
  );
  
  const steps = Math.max(distance * 3, 50);
  const points = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round((1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x);
    const y = Math.round((1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y);
    points.push({ x, y });
  }
  
  const offset = Math.floor(width / 2);
  const drawnPixels = new Set();
  
  // Conectar puntos con líneas pixel perfectas
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    if (current.x !== next.x || current.y !== next.y) {
      // Bresenham entre puntos consecutivos
      const dx = Math.abs(next.x - current.x);
      const dy = -Math.abs(next.y - current.y);
      const sx = current.x < next.x ? 1 : -1;
      const sy = current.y < next.y ? 1 : -1;
      let err = dx + dy;
      let x = current.x, y = current.y;
      
      while (true) {
        for (let brushY = 0; brushY < width; brushY++) {
          for (let brushX = 0; brushX < width; brushX++) {
            const px = x + brushX - offset;
            const py = y + brushY - offset;
            const key = `${px},${py}`;
            
            if (!drawnPixels.has(key)) {
              const screenX = (px - viewportOffset.x) * zoom;
              const screenY = (py - viewportOffset.y) * zoom;
              
              if (screenX >= 0 && screenY >= 0) {
                ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
                drawnPixels.add(key);
              }
            }
          }
        }
        
        if (x === next.x && y === next.y) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
      }
    }
  }
};

const drawPreviewLine = (x0, y0, x1, y1) => {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0, y = y0;
  
  while (true) {
    const screenX = (x - viewportOffset.x) * zoom;
    const screenY = (y - viewportOffset.y) * zoom;
    
    if (screenX >= 0 && screenY >= 0) {
      previewCanvasRef.current?.getContext('2d')?.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
    }
    
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
};
  
  // Pan offset para arrastrar el canvas
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Usar el gestor de capas mejorado
  const {
    layers,
    compositeCanvasRef,
    viewportOffset,
    addLayer,
    deleteLayer,
    moveLayerUp,
    moveLayerDown,
    toggleLayerVisibility,
    renameLayer,
    clearLayer,
    drawOnLayer,
    moveViewport,
    viewportToCanvasCoords,
    drawPixelLine,
    getLayerData,
    erasePixels  ,
    floodFill,// Add this function to your useLayerManager hook
    pixelGroups,
selectedGroup,

// Funciones de manejo de grupos
createPixelGroup,
deletePixelGroup,
getLayerGroups,
getAllGroups,
getPixelGroupAt,
isPixelInGroup,
selectPixelGroup,
clearSelectedGroup,
renamePixelGroup,
toggleGroupVisibility,
updatePixelGroup,

getHierarchicalLayers,
   getMainLayers,
   getGroupLayersForParent,

  } = useLayerManager({
    width: totalWidth,
    height: totalHeight,
    viewportWidth,
    viewportHeight,
    zoom
  });
  
  // Establecer la primera capa como activa cuando el componente se carga
  useEffect(() => {
    if (layers.length > 0 && !activeLayerId) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);
  
  // Rastrear la posición del puntero e interacciones
  const { position, relativeToTarget, isPressed, path } = usePointer(workspaceRef, artboardRef,selectionActionsRef);
  const lastPixelRef = useRef(null);
  
  // Estado del modo de dibujo
  const [drawMode, setDrawMode] = useState("draw"); // "draw", "erase", "move"
  
  // Manejar el cambio de zoom
 // Manejar el cambio de zoom - VERSIÓN CORREGIDA
const handleZoomChange = (e) => {
  const newZoom = parseInt(e.target.value, 10);
  if (isNaN(newZoom) || newZoom <= 0) return;
  
  
  
  // Calcular el centro actual del viewport en coordenadas del canvas
  const currentCenterX = viewportOffset.x + (viewportWidth / 2);
  const currentCenterY = viewportOffset.y + (viewportHeight / 2);
  
  // Calcular las nuevas dimensiones del viewport
  const newViewportWidth = Math.min(totalWidth, Math.floor(workspaceWidth / newZoom));
  const newViewportHeight = Math.min(totalHeight, Math.floor(workspaceHeight / newZoom));
  
  // Calcular el nuevo offset para mantener el mismo centro
  const newOffsetX = Math.max(0, Math.min(
    totalWidth - newViewportWidth,
    Math.round(currentCenterX - (newViewportWidth / 2))
  ));
  const newOffsetY = Math.max(0, Math.min(
    totalHeight - newViewportHeight,
    Math.round(currentCenterY - (newViewportHeight / 2))
  ));
  
  // Calcular el delta necesario
  const deltaX = newOffsetX - viewportOffset.x;
  const deltaY = newOffsetY - viewportOffset.y;
  
  
  // Actualizar el zoom primero
  setZoom(newZoom);
  setViewportWidth(newViewportWidth);
  setViewportHeight(newViewportHeight);
  
  // Mover el viewport para mantener la posición centrada
  // Solo mueve si hay un delta significativo
  if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
    moveViewport(deltaX, deltaY);
  }
};
  
 // useEffect mejorado para manejar cambios de dimensiones del workspace
useEffect(() => {
  const newWidth = Math.min(totalWidth, Math.floor(workspaceWidth / zoom));
  const newHeight = Math.min(totalHeight, Math.floor(workspaceHeight / zoom));
  
  // Solo actualizar si las dimensiones realmente cambiaron
  if (newWidth !== viewportWidth || newHeight !== viewportHeight) {
    // Verificar que el viewport no se salga de los límites del canvas
    const maxOffsetX = Math.max(0, totalWidth - newWidth);
    const maxOffsetY = Math.max(0, totalHeight - newHeight);
    
    // Ajustar el offset si es necesario
    if (viewportOffset.x > maxOffsetX || viewportOffset.y > maxOffsetY) {
      const deltaX = Math.min(0, maxOffsetX - viewportOffset.x);
      const deltaY = Math.min(0, maxOffsetY - viewportOffset.y);
      
      if (deltaX !== 0 || deltaY !== 0) {
        moveViewport(deltaX, deltaY);
      }
    }
    
    setViewportWidth(newWidth);
    setViewportHeight(newHeight);
  }
}, [zoom, workspaceWidth, workspaceHeight, totalWidth, totalHeight]);
  // Convertir coordenadas del cursor a coordenadas de píxel
  const getPixelCoordinates = (coords) => {
    return {
      x: Math.floor(coords.x / zoom),
      y: Math.floor(coords.y / zoom)
    };
  };
  
  // Manejar el inicio del arrastre para mover el canvas
  const handleStartDrag = useCallback((e) => {
    if (drawMode === "move") {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [drawMode]);
  
  // Manejar el movimiento del arrastre para mover el canvas
  const handleDrag = useCallback((e) => {
    if (isDragging && drawMode === "move") {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Mover el viewport en lugar de usar panOffset para asegurar que el renderizado sea correcto
      moveViewport(-dx / zoom, -dy / zoom);
      
      // Actualizar el punto de inicio para el próximo movimiento
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, zoom, drawMode, moveViewport]);
  
  // Manejar el fin del arrastre
  const handleEndDrag = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Añadir event listeners para el arrastre
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace) {
      workspace.addEventListener('mousedown', handleStartDrag);
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleEndDrag);
      
      return () => {
        workspace.removeEventListener('mousedown', handleStartDrag);
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleEndDrag);
      };
    }
  }, [handleStartDrag, handleDrag, handleEndDrag]);

 
  function drawBrush(ctx, canvasCoords, size) {
    const offset = Math.floor(size / 2);
    const startX = canvasCoords.x - offset;
    const startY = canvasCoords.y - offset;
    
    ctx.fillRect(startX, startY, size, size);
  }

  
  
  // Manejar el dibujo en la capa activa cuando el usuario arrastra
  useEffect(() => {
    if (tool === TOOLS.move) {
      setDrawMode('move');
    } else if (tool === TOOLS.paint) {
      setDrawMode('draw');
    } else if (tool === TOOLS.erase) {
      setDrawMode('erase');
    } else if (tool === TOOLS.curve) {
      setDrawMode('curve'); // Agregar este caso
    } else if (tool === TOOLS.line) {
      setDrawMode('line'); // Agregar este caso
    }
  }, [tool]);

 
  
  useEffect(() => {
    // PRIMERO: Manejar herramientas que necesitan detectar clicks y releases
   // En el useEffect principal, modifica la parte del manejo de la curva:
   if (tool === TOOLS.curve) {
    const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
    const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
    
    // Detectar cambio de estado del mouse (de no presionado a presionado)
    const justPressed = isPressed && !lastPressState;
    const justReleased = !isPressed && lastPressState;
    
    if (justPressed) {
      if (curveState === 'idle') {
        // Primer click: establecer punto inicial
        curveStartRef.current = canvasCoords;
        setCurveState('first-point');
        console.log('Punto inicial establecido:', canvasCoords);
      } else if (curveState === 'first-point') {
        // Segundo click: establecer punto final y comenzar control
        curveEndRef.current = canvasCoords;
        curveControlRef.current = canvasCoords;
        setCurveState('setting-control');
        setIsSettingControl(true);
        console.log('Punto final establecido:', canvasCoords);
      }
    }
    
    if (justReleased) {
      if (curveState === 'setting-control') {
        // Soltar el segundo click: finalizar curva
        if (curveStartRef.current && curveEndRef.current && curveControlRef.current) {
          drawOnLayer(activeLayerId, (ctx) => {
            drawQuadraticCurve(
              ctx,
              curveStartRef.current,
              curveEndRef.current,
              curveControlRef.current,
              toolParameters.width
            );
          });
          console.log('Curva dibujada');
        }
        
        // Resetear todo
        setCurveState('idle');
        setIsSettingControl(false);
        curveStartRef.current = null;
        curveEndRef.current = null;
        curveControlRef.current = null;
      }
    }
    
    // Actualizar punto de control mientras se arrastra
    if (curveState === 'setting-control' && isPressed) {
      curveControlRef.current = canvasCoords;
    }
    
    // Actualizar estado anterior del mouse
    setLastPressState(isPressed);
    
    return;
  }
    if (tool === TOOLS.line) {
      if (isPressed) {
        // Guardar el punto inicial al presionar el mouse
        if (!lineStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
          lineStartRef.current = canvasCoords;
        }
      } else {
        // Dibujar la línea definitiva al soltar el mouse
        if (lineStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
          
          drawOnLayer(activeLayerId, (ctx) => {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
            
            drawPixelLine(
              ctx,
              lineStartRef.current.x,
              lineStartRef.current.y,
              endCoords.x,
              endCoords.y,
              toolParameters.width
            );
          });
          
          lineStartRef.current = null;
        }
      }
      return; // Salir temprano
    }
  
    // SEGUNDO: Verificar condiciones para herramientas que solo necesitan mouse presionado
    if (!isPressed || !activeLayerId || drawMode === "move") {
      lastPixelRef.current = null;
      return;
    }
  
    const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
    const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
  
    // TERCERO: Manejar herramientas que solo necesitan un click
    if (tool === TOOLS.fill) {
      if (lastPixelRef.current === null) {
        rellenar(canvasCoords);
        lastPixelRef.current = viewportPixelCoords;
      }
      return;
    }
    
    if (tool === TOOLS.select || tool === TOOLS.lassoSelect) {
      return;
    }
  
    // CUARTO: Manejar herramientas de dibujo continuo
    if (tool === TOOLS.paint) {
      drawOnLayer(activeLayerId, (ctx) => {
        const canvas = ctx.canvas;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
  
        const width = toolParameters.width;
        const half = Math.floor(width / 2);
  
        const drawDot = (x, y) => {
          const offset = Math.floor(width / 2);
          for (let dy = 0; dy < width; dy++) {
            for (let dx = 0; dx < width; dx++) {
              const px = x + dx - offset;
              const py = y + dy - offset;
        
              if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;
        
              const index = (py * canvas.width + px) * 4;
              data[index] = color.r;
              data[index + 1] = color.g;
              data[index + 2] = color.b;
              data[index + 3] = color.a * 255;
            }
          }
        };
  
        if (!lastPixelRef.current) {
          drawDot(canvasCoords.x, canvasCoords.y);
        } else {
          // Bresenham's line
          const last = viewportToCanvasCoords(lastPixelRef.current.x, lastPixelRef.current.y);
          let x0 = last.x, y0 = last.y, x1 = canvasCoords.x, y1 = canvasCoords.y;
          let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
          let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
          let x = x0, y = y0;
  
          while (true) {
            drawDot(x, y);
            if (x === x1 && y === y1) break;
            let e2 = 2 * err;
            if (e2 >= dy) { err += dy; x += sx; }
            if (e2 <= dx) { err += dx; y += sy; }
          }
        }
  
        ctx.putImageData(imageData, 0, 0);
      });
    }
  
    if (tool === TOOLS.erase) {
      drawOnLayer(activeLayerId, (ctx) => {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        
        if (!lastPixelRef.current) {
          drawBrush(ctx, canvasCoords, toolParameters.width);
        } else {
          const lastCanvasCoords = viewportToCanvasCoords(
            lastPixelRef.current.x,
            lastPixelRef.current.y
          );
          
          drawPixelLine(
            ctx,
            lastCanvasCoords.x,
            lastCanvasCoords.y,
            canvasCoords.x,
            canvasCoords.y,
            toolParameters.width
          );
        }
      });
    }
  
    lastPixelRef.current = viewportPixelCoords;
  }, [isPressed, relativeToTarget, activeLayerId, drawOnLayer, viewportToCanvasCoords, drawMode, tool, toolParameters, zoom, color, curveState]);
  
  // Manejar la navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      const step = 1; // Píxeles a mover por pulsación de tecla
      
      switch (e.key) {
        case 'ArrowRight':
          moveViewport(step, 0);
          break;
        case 'ArrowLeft':
          moveViewport(-step, 0);
          break;
        case 'ArrowDown':
          moveViewport(0, step);
          break;
        case 'ArrowUp':
          moveViewport(0, -step);
          break;
        case 'd': // Modo de dibujo
          setDrawMode("draw");
          break;
        case 'e': // Modo de borrado
          setDrawMode("erase");
          break;
        case 'm': // Modo de movimiento
          setDrawMode("move");
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveViewport]);

  /*Aplicar un canvas de preview
  *  La funcion de este canvas es mostrar una previa de la herramienta:

  */

  const previewCanvasRef = useRef(null);


  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the previous preview
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Only draw if mouse is over the canvas
    if (relativeToTarget.x >= 0 && relativeToTarget.y >= 0) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
      // Preview para herramienta de curva
      // Preview para herramienta de curva
      if (tool === TOOLS.curve) {
        ctx.save();
        
        if (curveState === 'first-point' && curveStartRef.current) {
          // Mostrar punto inicial y línea de preview
          const startScreenX = (curveStartRef.current.x - viewportOffset.x) * zoom;
          const startScreenY = (curveStartRef.current.y - viewportOffset.y) * zoom;
          const currentScreenX = (canvasCoords.x - viewportOffset.x) * zoom;
          const currentScreenY = (canvasCoords.y - viewportOffset.y) * zoom;
          
          // Punto inicial (pixel art style)
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
          ctx.fillRect(
            Math.floor(startScreenX),
            Math.floor(startScreenY),
            zoom,
            zoom
          );
          
          // Línea recta de preview usando el mismo sistema que la herramienta line
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
          
          // Usar el algoritmo de Bresenham para preview pixel art
          const drawPreviewLine = (x0, y0, x1, y1) => {
            const dx = Math.abs(x1 - x0);
            const dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let x = x0, y = y0;
            
            const offset = Math.floor(toolParameters.width / 2);
            
            while (true) {
              // Dibujar cada pixel del brush
              for (let dy = 0; dy < toolParameters.width; dy++) {
                for (let dx = 0; dx < toolParameters.width; dx++) {
                  const px = x + dx - offset;
                  const py = y + dy - offset;
                  const screenX = (px - viewportOffset.x) * zoom;
                  const screenY = (py - viewportOffset.y) * zoom;
                  
                  if (screenX >= 0 && screenY >= 0) {
                    ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
                  }
                }
              }
              
              if (x === x1 && y === y1) break;
              const e2 = 2 * err;
              if (e2 >= dy) { err += dy; x += sx; }
              if (e2 <= dx) { err += dx; y += sy; }
            }
          };
          
          drawPreviewLine(curveStartRef.current.x, curveStartRef.current.y, canvasCoords.x, canvasCoords.y);
          
        } else if (curveState === 'setting-control' && curveStartRef.current && curveEndRef.current) {
          // Preview de curva usando pixel art
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
          
         // En el useEffect del preview, dentro de la condición 
// else if (curveState === 'setting-control' && curveStartRef.current && curveEndRef.current)
// Reemplaza toda la función drawPreviewCurve con esta:

const drawPreviewCurve = (start, end, control, width) => {
  // Calcular distancia para determinar densidad de muestreo
  const distance = Math.max(
    Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
    Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
    Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
  );
  
  // Incrementar significativamente el número de pasos
  const steps = Math.max(distance * 3, 50);
  const points = [];
  
  // Generar todos los puntos de la curva Bézier
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round((1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x);
    const y = Math.round((1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y);
    points.push({ x, y });
  }
  
  const offset = Math.floor(width / 2);
  const drawnPixels = new Set();
  
  // Función para dibujar línea pixel perfecta en el preview
  const drawPreviewPixelLine = (x0, y0, x1, y1) => {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0, y = y0;
    
    while (true) {
      // Dibujar el brush en la posición actual
      for (let brushY = 0; brushY < width; brushY++) {
        for (let brushX = 0; brushX < width; brushX++) {
          const px = x + brushX - offset;
          const py = y + brushY - offset;
          const key = `${px},${py}`;
          
          if (!drawnPixels.has(key)) {
            const screenX = (px - viewportOffset.x) * zoom;
            const screenY = (py - viewportOffset.y) * zoom;
            
            if (screenX >= 0 && screenY >= 0) {
              ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
              drawnPixels.add(key);
            }
          }
        }
      }
      
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };
  
  // Conectar cada punto consecutivo con líneas pixel perfectas
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    // Solo dibujar si los puntos son diferentes
    if (current.x !== next.x || current.y !== next.y) {
      drawPreviewPixelLine(current.x, current.y, next.x, next.y);
    }
  }
  
  // Asegurar que los puntos inicial y final estén dibujados
  [start, end].forEach(point => {
    for (let brushY = 0; brushY < width; brushY++) {
      for (let brushX = 0; brushX < width; brushX++) {
        const px = point.x + brushX - offset;
        const py = point.y + brushY - offset;
        const key = `${px},${py}`;
        
        if (!drawnPixels.has(key)) {
          const screenX = (px - viewportOffset.x) * zoom;
          const screenY = (py - viewportOffset.y) * zoom;
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
            drawnPixels.add(key);
          }
        }
      }
    }
  });
};

// También actualiza la parte de preview de línea recta (en curveState === 'first-point')
// Reemplaza la función drawPreviewLine con esta:

const drawPreviewLine = (x0, y0, x1, y1) => {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0, y = y0;
  
  const offset = Math.floor(toolParameters.width / 2);
  const drawnPixels = new Set();
  
  while (true) {
    // Dibujar cada pixel del brush
    for (let dy = 0; dy < toolParameters.width; dy++) {
      for (let dx = 0; dx < toolParameters.width; dx++) {
        const px = x + dx - offset;
        const py = y + dy - offset;
        const key = `${px},${py}`;
        
        if (!drawnPixels.has(key)) {
          const screenX = (px - viewportOffset.x) * zoom;
          const screenY = (py - viewportOffset.y) * zoom;
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
            drawnPixels.add(key);
          }
        }
      }
    }
    
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
};
          
          drawPreviewCurve(curveStartRef.current, curveEndRef.current, canvasCoords, toolParameters.width);
          
          // Puntos de control (pixel art style)
          const controlScreenX = (canvasCoords.x - viewportOffset.x) * zoom;
          const controlScreenY = (canvasCoords.y - viewportOffset.y) * zoom;
          const startScreenX = (curveStartRef.current.x - viewportOffset.x) * zoom;
          const startScreenY = (curveStartRef.current.y - viewportOffset.y) * zoom;
          const endScreenX = (curveEndRef.current.x - viewportOffset.x) * zoom;
          const endScreenY = (curveEndRef.current.y - viewportOffset.y) * zoom;
          
          // Líneas guía (más sutiles)
          ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
          // Línea de control desde start
          drawPreviewLine(curveStartRef.current.x, curveStartRef.current.y, canvasCoords.x, canvasCoords.y);
          // Línea de control desde end
          drawPreviewLine(curveEndRef.current.x, curveEndRef.current.y, canvasCoords.x, canvasCoords.y);
          
          // Puntos de anclaje
          ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
          ctx.fillRect(Math.floor(controlScreenX), Math.floor(controlScreenY), zoom, zoom);
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
          ctx.fillRect(Math.floor(startScreenX), Math.floor(startScreenY), zoom, zoom);
          ctx.fillRect(Math.floor(endScreenX), Math.floor(endScreenY), zoom, zoom);
        }
        
        ctx.restore();
      }
      else if (tool === TOOLS.paint) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(
          ${color.r},
          ${color.g},
          ${color.b},
          ${0.7}
        )`;
      } else if (tool === TOOLS.erase) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Red transparent indicator for eraser
      } else if (tool === TOOLS.line && isPressed && lineStartRef.current) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
      
        const drawPreviewLine = (start, end) => {
          let x0 = start.x;
          let y0 = start.y;
          let x1 = end.x;
          let y1 = end.y;
          
          const dx = Math.abs(x1 - x0);
          const dy = -Math.abs(y1 - y0);
          const sx = x0 < x1 ? 1 : -1;
          const sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;
      
          const offset = Math.floor(toolParameters.width / 2);
      
          while (true) {
            const x = x0 - offset;
            const y = y0 - offset;
      
            const screenX = (x - viewportOffset.x) * zoom;
            const screenY = (y - viewportOffset.y) * zoom;
      
            ctx.fillRect(
              screenX,
              screenY,
              toolParameters.width * zoom,
              toolParameters.width * zoom
            );
      
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
              err += dy;
              x0 += sx;
            }
            if (e2 <= dx) {
              err += dx;
              y0 += sy;
            }
          }
        };
      
        drawPreviewLine(lineStartRef.current, currentCanvasCoords);
      }
      
      
      else if (tool === TOOLS.move || tool === TOOLS.select || tool === TOOLS.lassoSelect) {
        return; // Don't show preview for move tool
      }
      
      // Draw the brush preview with the actual brush size
      const offset = Math.floor(toolParameters?.width / 2);
      const x = canvasCoords.x - offset;
      const y = canvasCoords.y - offset;
      
      // Aplicar el viewportOffset para posicionar correctamente en pantalla
      const screenX = (x - viewportOffset.x) * zoom;
      const screenY = (y - viewportOffset.y) * zoom;
      
      // Draw the preview brush
      ctx.fillRect(
        screenX, 
        screenY, 
        toolParameters?.width * zoom, 
        toolParameters?.width * zoom
      );
    }
  }, [tool, relativeToTarget, toolParameters, zoom, viewportToCanvasCoords, viewportOffset, curveState, color]);

  //Logica para manejo del zoom con la rueda del raton:

  // Agregar este useEffect después de los existentes
useEffect(() => {
  // Resetear estado de curva al cambiar de herramienta
  if (tool !== TOOLS.curve) {
    setCurveState('idle');
    setIsSettingControl(false);
    curveStartRef.current = null;
    curveEndRef.current = null;
    curveControlRef.current = null;
    setClickStartTime(null);
  }
}, [tool]);

  // Añadir este useEffect al componente CanvasTracker
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
  
      const rect = workspaceRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
  
      const viewportMouseX = mouseX / zoom - panOffset.x / zoom;
      const viewportMouseY = mouseY / zoom - panOffset.y / zoom;
      const canvasMouseX = viewportMouseX + viewportOffset.x;
      const canvasMouseY = viewportMouseY + viewportOffset.y;
  
      const zoomDirection = e.deltaY > 0 ? -1 : 1;
      const zoomFactor = 1.1;
      const newZoomRaw = zoom * Math.pow(zoomFactor, zoomDirection);
  
      // Redondear el nuevo zoom al número entero más cercano
      const newZoom = Math.max(1, Math.min(40, Math.round(newZoomRaw)));
  
      if (newZoom === zoom) return;
  
      // Redondear el nuevo tamaño del viewport
      const newViewportWidth = Math.min(totalWidth, Math.floor(workspaceWidth / newZoom));
      const newViewportHeight = Math.min(totalHeight, Math.floor(workspaceHeight / newZoom));
  
      const newViewportMouseX = mouseX / newZoom - panOffset.x / newZoom;
      const newViewportMouseY = mouseY / newZoom - panOffset.y / newZoom;
  
      const newViewportOffsetX = Math.floor(canvasMouseX - newViewportMouseX);
      const newViewportOffsetY = Math.floor(canvasMouseY - newViewportMouseY);
  
      const clampedOffsetX = Math.max(0, Math.min(totalWidth - newViewportWidth, newViewportOffsetX));
      const clampedOffsetY = Math.max(0, Math.min(totalHeight - newViewportHeight, newViewportOffsetY));
  
      const deltaX = clampedOffsetX - viewportOffset.x;
      const deltaY = clampedOffsetY - viewportOffset.y;
  
      setZoom(newZoom);
      setViewportWidth(newViewportWidth);
      setViewportHeight(newViewportHeight);
  
      if (deltaX !== 0 || deltaY !== 0) {
        moveViewport(deltaX, deltaY);
      }
    };
  
    const workspace = workspaceRef.current;
    if (workspace) {
      workspace.addEventListener('wheel', handleWheel, { passive: false });
  
      return () => {
        workspace.removeEventListener('wheel', handleWheel);
      };
    }
  }, [zoom, workspaceWidth, workspaceHeight, totalWidth, totalHeight, viewportOffset, panOffset, moveViewport]);
  


/* ============================Logica de canvas de seleccion=================================================
 * 
Este canvas es necesario para seleccionar agrupaciones de pixeles, y poder manipularlos, principalmente arrastrarlos
 */
const [clickInSelection, setClickInSelection] = useState(false);
// Añadir estados para gestionar el arrastre
const [dragStartPoint, setDragStartPoint] = useState(null);
const [isDraggingSelection, setIsDraggingSelection] = useState(false);

const getPixelColor = async (x, y) => {
  if (!activeLayerId) return null;
  const imageData = await getLayerData(activeLayerId, x, y, 1, 1);
  if (!imageData) return null;
  
  return {
    r: imageData.data[0],
    g: imageData.data[1],
    b: imageData.data[2],
    a: imageData.data[3]/255
  };
};

// Estados para la selección
const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
const [selectedPixels, setSelectedPixels] = useState([]);
const [originalPixelColors, setOriginalPixelColors] = useState([]); // Nuevo estado para guardar colores originales
const [finalizedSelection, setFinalizedSelection] = useState(false);
const [selectionDragging, setSelectionDragging] = useState(false);
const [selectionDragStart, setSelectionDragStart] = useState({ x: 0, y: 0 });
const [selectionOffset, setSelectionOffset] = useState({ x: 0, y: 0 });
const [selectionActive, setSelectionActive] = useState(false);
const selectionCanvasRef = useRef(null);
const [selectionCoords, setSelectionCoords] = useState([]);
const [croppedSelectionBounds, setCroppedSelectionBounds] = useState(null);
// Add a new state for lasso selection points
const [lassoPoints, setLassoPoints] = useState([]);

/// Funciones de utilidad para mi LASSO: ////===================
// Función para verificar si un punto está dentro de un polígono
const isPointInPolygon = useCallback((x, y, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}, []);

// Calcular los límites (bounds) del lazo
const calculateLassoBounds = useCallback(() => {
  if (lassoPoints.length < 3) return;
  
  // Encontrar los límites del polígono
  const xCoords = lassoPoints.map(point => point.x);
  const yCoords = lassoPoints.map(point => point.y);
  
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  // Establecer los límites del área de selección
  setCroppedSelectionBounds({
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  });
}, [lassoPoints]);

// Función para encontrar los límites de los pixeles no transparentes
const findNonEmptyBounds = useCallback((imageData, width, height) => {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasNonEmptyPixels = false;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const alpha = imageData.data[pixelIndex + 3];
      
      if (alpha > 0) {
        hasNonEmptyPixels = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  return hasNonEmptyPixels ? {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  } : null;
}, []);

// Función para limpiar la selección actual
const clearCurrentSelection = useCallback(() => {
  // 1. Actualizar el grupo ANTES de limpiar (si hay arrastre y grupo seleccionado)
  if (selectedGroup && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
    console.log("e actualizaron los pixeles del grupo");
    const updatedPixels = selectedPixels.map(pixel => ({
      x: pixel.x + dragOffset.x,
      y: pixel.y + dragOffset.y,
      color: pixel.color
    }));
    
    updatePixelGroup(selectedGroup.layerId, selectedGroup.id, updatedPixels);
  }

  // 2. Limpieza normal del canvas y estados
  const canvas = selectionCanvasRef.current;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Restaurar pixeles a colores originales
  if (selectedPixels.length > 0 && originalPixelColors.length > 0) {
    selectedPixels.forEach((pixel, index) => {
      if (originalPixelColors[index]) {
        pintarPixelConTamaño(
          pixel.x + dragOffset.x, 
          pixel.y + dragOffset.y, 
          originalPixelColors[index], 
          1
        );
      }
    });
  }

  // 3. Resetear todos los estados
  setSelectedPixels([]);
  setOriginalPixelColors([]);
  setSelectionCoords([{ x: 0, y: 0 }]);
  setCroppedSelectionBounds(null);
  setDragOffset({ x: 0, y: 0 });
  setSelectionActive(false);
  setLassoPoints([]);
  setIsDraggingSelection(false);
  setDragStartPoint(null);

}, [
  selectedPixels, 
  originalPixelColors, 
  zoom, 
  dragOffset,
  layers, 
  activeLayerId,
  isDraggingSelection,  // Nueva dependencia
  selectedGroup,        // Nueva dependencia
  updatePixelGroup,      // Función del hook useLayerManager

   
  
]);


// Auto-crop de la selección
const autoCropSelection = useCallback(async () => {
  if (!activeLayerId || !selectionCoords || selectionCoords.length < 1) return;
  console.log("autoCropSelection - selectionCoords:", selectionCoords); // 👈 ¿Se reciben las coordenadas?
  const start = selectionCoords[0];
  const end = selectionCoords[selectionCoords.length - 1];

  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x) + 1;
  const height = Math.abs(end.y - start.y) + 1;
  
  
  const imageData = await getLayerData(activeLayerId, x, y, width, height);
  if (!imageData) return;
  
  const bounds = findNonEmptyBounds(imageData, width, height);
  
  if (bounds) {
    const croppedBounds = {
      x: x + bounds.x,
      y: y + bounds.y,
      width: bounds.width,
      height: bounds.height
    };
    setCroppedSelectionBounds(croppedBounds);
  
    // Verificar si al menos un pixel dentro de los bounds recortados pertenece a un grupo
    let groupFound = false;
    let foundGroupName = null;
    let groupData = null;
    // Iterar a través de todos los píxeles en el área recortada
    for (let py = croppedBounds.y; py < croppedBounds.y + croppedBounds.height; py++) {
      for (let px = croppedBounds.x; px < croppedBounds.x + croppedBounds.width; px++) {
        const groupInfo = getPixelGroupAt(px, py, activeLayerId);
        if (groupInfo) {
          groupFound = true;
          foundGroupName = groupInfo.group.name;
          groupData = groupInfo;
          break; // Salir del bucle al encontrar el primer grupo
        }
      }
      if (groupFound) break; // Romper también el bucle exterior
    }
  
    if (groupFound) {
      console.log(`Pixel con grupo encontrado: ${JSON.stringify(groupData, null, 2)}`);
    } else {
      console.log("Ningún pixel dentro del área recortada pertenece a un grupo");
    }
  
    setSelectionCoords([]);
  }else {
    setCroppedSelectionBounds({ x, y, width, height });
  }
 
}, [activeLayerId, selectionCoords,layers, findNonEmptyBounds, getLayerData]);

const autoCropLasso = useCallback(async () => {
  if (!activeLayerId || !lassoPoints || lassoPoints.length < 1) return;

  // Calcular bounding box
  const xs = lassoPoints.map(p => p.x);
  const ys = lassoPoints.map(p => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const width = maxX - x + 1;
  const height = maxY - y + 1;

  // Obtener datos de imagen en el bounding box
  const imageData = await getLayerData(activeLayerId, x, y, width, height);
  if (!imageData) return;

  // Buscar el área no vacía dentro del bounding box
  const bounds = findNonEmptyBounds(imageData, width, height);

  if (bounds) {
    setCroppedSelectionBounds({
      x: x + bounds.x,
      y: y + bounds.y,
      width: bounds.width,
      height: bounds.height
    });
  } else {
    setCroppedSelectionBounds({ x, y, width, height });
  }

  
}, [activeLayerId, lassoPoints, findNonEmptyBounds, getLayerData]);


// Lógica para nueva selección
useEffect(() => {
  if (tool !== TOOLS.select || !isPressed) return;

  // Si apenas se inicia el presionado (primer punto del path)
  if (path.length === 1) {
    const clickPoint = path[0];
    const pixelCoords = getPixelCoordinates(clickPoint);
    const canvasCoords = viewportToCanvasCoords(pixelCoords.x, pixelCoords.y);
   
    // Verificar si el click está en la selección existente
    if (selectionActive && selectedPixels.length > 0) {
      const isOnSelection = selectedPixels.some(pixel => 
        Math.floor(pixel.x + dragOffset.x) === Math.floor(canvasCoords.x) &&
        Math.floor(pixel.y + dragOffset.y) === Math.floor(canvasCoords.y)
      );
      
      setClickInSelection(isOnSelection);
      
      if (isOnSelection) {
        // Si clickeó en selección existente, iniciar proceso de arrastre
        setIsDraggingSelection(true);
        setDragStartPoint({
          x: canvasCoords.x, 
          y: canvasCoords.y
        });
        // Importante: evitar que se siga procesando como una nueva selección
        return;
      } else {
        // Si clickeó fuera de la selección actual, limpiarla
        clearCurrentSelection();
      }
    }
  }
  
  // No procesar nueva selección si estamos arrastrando
  if (isDraggingSelection) {
    return;
  }
  
  // Lógica existente para nueva selección
  if (path.length === 0 && (selectedPixels.length > 0 || croppedSelectionBounds)) {
    clearCurrentSelection();
  }
  
  if (path.length >= 1) {
    const canvasCoords = path.map(point => {
      const viewportPixelCoords = getPixelCoordinates(point);
      return viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
    });

  
    // Solo actualizar las coordenadas de selección si no estamos arrastrando
    if (!isDraggingSelection) {
      setSelectionCoords(canvasCoords);
      console.log("se ejecuto esto:,",canvasCoords);
      setCroppedSelectionBounds(null);
    }
  }
}, [isPressed, path, tool, isDraggingSelection, activeLayerId]);


// Finalizar arrastre cuando se suelta el mouse
useEffect(() => {
  if (!isPressed && isDraggingSelection) {
    setIsDraggingSelection(false);
    setDragStartPoint(null);
  }
}, [isPressed]);


// Finalización de selección
useEffect(() => {
  if (tool === TOOLS.select && !isPressed && selectionCoords.length >= 1 && !isDraggingSelection) {
    
    autoCropSelection();
    setSelectionActive(true);
  }
  if (tool === TOOLS.lassoSelect && !isPressed && lassoPoints.length >= 3 && !isDraggingSelection) {
    if(selectionActive) return
    // Finalizar la selección del lazo
    // Primero cerramos el polígono si no está cerrado
    if (lassoPoints.length > 0) {
      const firstPoint = lassoPoints[0];
      const lastPoint = lassoPoints[lassoPoints.length - 1];
      
      // Si el último punto no es igual al primero, agregar el punto inicial al final
      if (firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y) {
        setLassoPoints([...lassoPoints, firstPoint]);
      }
    }
    
    // Calcular el rectángulo que contiene el lazo
    calculateLassoBounds();
    autoCropLasso();
   
    setSelectionActive(true);
  }
}, [tool, isPressed, selectionCoords, autoCropSelection, isDraggingSelection,lassoPoints, activeLayerId]);

const paintPixelInSelectionCanvas = useCallback((x, y, color) => {
  const canvas = selectionCanvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  // Aplicar tanto el viewportOffset como el panOffset
  const screenX = (x - viewportOffset.x) * zoom;
  const screenY = (y - viewportOffset.y) * zoom;
  ctx.fillRect(screenX, screenY, zoom, zoom);
}, [zoom, viewportOffset]); // Añadir viewportOffset como dependencia



// Dibujar el rectángulo de selección
useEffect(() => {
  if (!croppedSelectionBounds || isPressed || selectedPixels.length > 0) return;
  
  const { x, y, width, height } = croppedSelectionBounds;
  
  // Verificación rápida si hay píxeles visibles
  const quickCheckPromise = async () => {
    const sampleSize = Math.min(100, width * height);
    const samplePromises = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const sampleX = x + Math.floor(Math.random() * width);
      const sampleY = y + Math.floor(Math.random() * height);
   
      // Para el lazo, solo verificar puntos dentro del polígono
      if (tool === TOOLS.select || 
         (tool === TOOLS.lassoSelect && isPointInPolygon(sampleX, sampleY, lassoPoints))) {
        const promise = getPixelColor(sampleX, sampleY).then(color => ({
          x: sampleX,
          y: sampleY,
          color
        }));
        samplePromises.push(promise);
      }

      
    }
    
    const sampleResults = await Promise.all(samplePromises);
    const hasVisiblePixels = sampleResults.some(({ color }) => 
      color && color.a > 0 && !(color.r === 0 && color.g === 0 && color.b === 0 && color.a === 0)
    );
    
    return hasVisiblePixels;
  };
  
  if (selectedPixels.length === 0) {
    quickCheckPromise().then(hasVisiblePixels => {
      if (!hasVisiblePixels) {
        console.log("No se encontraron píxeles visibles en la selección");
        setCroppedSelectionBounds(null);
        setSelectionActive(false);
        return;
      }
      
      // Procesar todos los píxeles en el área
      let pixelPromises = [];
      
      for (let i = y; i < y + height; i++) {
        for (let j = x; j < x + width; j++) {
          // Para el lazo, verificar si el punto está dentro del polígono
          const shouldCheck = tool === TOOLS.select || 
                            (tool === TOOLS.lassoSelect && isPointInPolygon(j, i, lassoPoints));
          
          if (shouldCheck) {
            const promise = getPixelColor(j, i).then(color => ({
              x: j,
              y: i,
              color
            }));
            pixelPromises.push(promise);
          }
        }
      }
      
      Promise.all(pixelPromises).then(allPixels => {
        const selectionPixels = allPixels.filter(({ color }) => {
          return color && color.a > 0 && !(color.r === 0 && color.g === 0 && color.b === 0 && color.a === 0);
        });
        
        if (selectionPixels.length > 0) {
          // Guardar colores originales antes de modificarlos
          const originalColors = selectionPixels.map(pixel => pixel.color);
          setOriginalPixelColors(originalColors);
          
          setSelectedPixels(selectionPixels);
          setFinalizedSelection(true);
        } else {
          console.log("No se encontraron píxeles para seleccionar");
          setCroppedSelectionBounds(null);
          setSelectionActive(false);
        }
      });
    }).catch(error => {
      console.error("Error en la verificación de píxeles:", error);
      setCroppedSelectionBounds(null);
      setSelectionActive(false);
    });
  
  }
}, [croppedSelectionBounds, isPressed, selectedPixels.length, tool, lassoPoints, isPointInPolygon, getPixelColor, setOriginalPixelColors, setSelectedPixels, setFinalizedSelection, setCroppedSelectionBounds, setSelectionActive]);

// Manejar el arrastre de la selección
useEffect(() => {
  if (!isDraggingSelection || !isPressed) return;
  
  // Solo procesar si hay una selección activa
  if (!selectionActive || selectedPixels.length === 0) {
    setIsDraggingSelection(false);
    return;
  }

  if (path.length >= 2) {
    const currentPoint = path[path.length - 1];
    const pixelCoords = getPixelCoordinates(currentPoint);
    const canvasCoords = viewportToCanvasCoords(pixelCoords.x, pixelCoords.y);
    
    if (!dragStartPoint) {
      setDragStartPoint({
        x: canvasCoords.x,
        y: canvasCoords.y
      });
      return;
    }
    
    const deltaX = Math.floor(canvasCoords.x - dragStartPoint.x);
    const deltaY = Math.floor(canvasCoords.y - dragStartPoint.y);
    
    if (deltaX !== 0 || deltaY !== 0) {
      setDragOffset(prevOffset => ({
        x: prevOffset.x + deltaX,
        y: prevOffset.y + deltaY
      }));
      setDragStartPoint({
        x: canvasCoords.x,
        y: canvasCoords.y
      });
    }
  }
}, [path, isDraggingSelection, isPressed, dragStartPoint, selectionActive, selectedPixels]);



// Pintar pixel en el canvas de selección

const pintarPixelConTamaño = (coordX, coordY, color, tamaño) => {
  if (!activeLayerId) return;

  drawOnLayer(activeLayerId, (ctx) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

    // Asegurarse de que coordX, coordY y tamaño sean enteros
    const intX = Math.floor(coordX);
    const intY = Math.floor(coordY);
    const intTamaño = Math.floor(tamaño);

    const offset = Math.floor(intTamaño / 2);
    const startX = intX - offset;
    const startY = intY - offset;

    ctx.fillRect(startX, startY, intTamaño, intTamaño,activeLayerId,layers);
  });
};



// Manejar clicks fuera de la selección
useEffect(() => {
  if (selectionActive && (tool === TOOLS.select || tool === TOOLS.lassoSelect) && isPressed && path.length === 1) {
    const clickPoint = path[0];
    const pixelCoords = getPixelCoordinates(clickPoint);
    const canvasCoords = viewportToCanvasCoords(pixelCoords.x, pixelCoords.y);
    
    // Verificar si el click coincide exactamente con un píxel seleccionado
    const isOnSelectedPixel = selectedPixels.some(pixel => 
      Math.floor(pixel.x + dragOffset.x) === Math.floor(canvasCoords.x) &&
      Math.floor(pixel.y + dragOffset.y) === Math.floor(canvasCoords.y)
    );
    
    // Verificar si el click está en el área de los botones de acción
    const isOnActionButtons = croppedSelectionBounds && 
      canvasCoords.x >= (croppedSelectionBounds.x + croppedSelectionBounds.width + dragOffset.x) &&
      canvasCoords.x <= (croppedSelectionBounds.x + croppedSelectionBounds.width + dragOffset.x + 5) &&
      canvasCoords.y >= (croppedSelectionBounds.y + dragOffset.y) &&
      canvasCoords.y <= (croppedSelectionBounds.y + dragOffset.y + croppedSelectionBounds.height);
    
    if (isOnSelectedPixel) {
      // Si clickeó en la selección, iniciar arrastre
      setClickInSelection(true);
      setIsDraggingSelection(true);
      setDragStartPoint({
        x: canvasCoords.x, 
        y: canvasCoords.y
      });
    } else if (!isOnActionButtons) {
     
      clearCurrentSelection();
    } 
  }
}, [isPressed, path, tool, selectionActive, selectedPixels, dragOffset,activeLayerId, clearCurrentSelection, getPixelCoordinates, viewportToCanvasCoords, croppedSelectionBounds]);

// Pintar pixeles seleccionados en el canvas de selección
useEffect(() => {
  const canvas = selectionCanvasRef.current;
  if (!canvas) return;
 
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Si no estamos usando la herramienta de selección, limpiar y salir
  if (tool !== TOOLS.select && tool !== TOOLS.lassoSelect) {
    if (selectionActive) {
      clearCurrentSelection();
    }
    return;
  }

  // No mostrar el rectángulo azul de selección si estamos arrastrando
  if (isPressed && !isDraggingSelection && !croppedSelectionBounds) {
    if(selectionCoords.length < 1)return
    const start = selectionCoords[0];
    const end = selectionCoords[selectionCoords.length - 1];
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x) + 1;
    const height = Math.abs(end.y - start.y) + 1;

    // Aplicar el viewportOffset para posicionar correctamente en pantalla
    const screenX = (x - viewportOffset.x) * zoom;
    const screenY = (y - viewportOffset.y) * zoom;
    
    ctx.strokeStyle = 'rgba(0, 120, 255, 0.5)';
    ctx.fillStyle = 'rgba(0, 120, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.fillRect(screenX, screenY, width * zoom, height * zoom);
    ctx.strokeRect(screenX, screenY, width * zoom, height * zoom);
  }
  
  // Si hay una selección activa, mostrar el borde y los pixeles seleccionados
  if (selectionActive && selectedPixels.length > 0) {
   
    if (croppedSelectionBounds) {
      const { x, y, width, height } = croppedSelectionBounds;

   
      // Aplicar tanto el dragOffset como el viewportOffset
      const finalX = x + dragOffset.x;
      const finalY = y + dragOffset.y;
      const screenX = Math.round((finalX - viewportOffset.x) * zoom);
      const screenY = Math.round((finalY - viewportOffset.y) * zoom);

     
     
      // Dibuja el área de selección (verde)
      ctx.strokeStyle = isDraggingSelection ? 'rgba(255, 150, 0, 0.8)' : 'rgba(0, 200, 100, 0.8)';
      ctx.fillStyle = isDraggingSelection ? 'rgba(255, 150, 0, 0.2)' : 'rgba(0, 200, 100, 0.2)';
      ctx.lineWidth = 2;
      ctx.fillRect(screenX, screenY, width * zoom, height * zoom);
      ctx.strokeRect(screenX, screenY, width * zoom, height * zoom);
      
      // Mantener marcadores de esquina
      const markerSize = 2;
      ctx.fillStyle = isDraggingSelection ? 'rgba(255, 150, 0, 1)' : 'rgba(0, 200, 100, 1)';
      ctx.fillRect(screenX - markerSize/2, screenY - markerSize/2, markerSize, markerSize);
      ctx.fillRect(screenX + width * zoom - markerSize/2, screenY - markerSize/2, markerSize, markerSize);
      ctx.fillRect(screenX - markerSize/2, screenY + height * zoom - markerSize/2, markerSize, markerSize);
      ctx.fillRect(screenX + width * zoom - markerSize/2, screenY + height * zoom - markerSize/2, markerSize, markerSize);
    }

    // Pintar píxeles seleccionados (ya corregido con la función paintPixelInSelectionCanvas)
    selectedPixels.forEach(pixel => {
      paintPixelInSelectionCanvas(pixel.x + dragOffset.x, pixel.y + dragOffset.y, pixel.color);
    });
  }
}, [selectedPixels, dragOffset, croppedSelectionBounds, isPressed, selectionActive, isDraggingSelection, viewportOffset, tool, clearCurrentSelection, selectionCoords, lassoPoints, paintPixelInSelectionCanvas]);

useEffect(()=>{
  // Solo borrar y redibujar píxeles cuando se completa una operación de arrastre 
  // o cuando realmente cambiamos el offset, no durante el arrastre
 
  if (selectedPixels.length > 0 ) {
    selectedPixels.forEach(pixel => {
      erasePixels(activeLayerId, pixel.x, pixel.y);
    });
  }
},[selectedPixels])


/////==================================Lógica para LAZO ==================================================================




// useEffect para dibujar el poligono de seleccion para el lazo
useEffect(() => {
  if (isPressed && isDraggingSelection && croppedSelectionBounds ) return
  if(selectionActive)return // SI ya hemos seleccionado no necesitamos esto
  // Solo se activa para la herramiento de lasso
  if (tool !== TOOLS.lassoSelect || !selectionCanvasRef.current) return;
  

  const canvas = selectionCanvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // If we're actively drawing (mouse is pressed), update the lasso points
  if (isPressed) {
    // Convert the current path points to canvas coordinates
    const canvasPoints = path.map(point => {
      const viewportPixelCoords = getPixelCoordinates(point);
      return viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
    });
    
    // Make sure we don't have duplicate points
    const uniquePoints = [
      ...new Map(
        canvasPoints.map(coord => [`${coord.x},${coord.y}`, coord])
      ).values()
    ];
    
    setLassoPoints(uniquePoints);
    
    
    // Draw the lasso path
    if (canvasPoints.length > 1) {
      ctx.beginPath();
      
      // Apply viewport offset and zoom for drawing
      const startX = (uniquePoints[0].x - viewportOffset.x) * zoom;
      const startY = (uniquePoints[0].y - viewportOffset.y) * zoom;
      
      ctx.moveTo(startX, startY);
      
      // Draw lines to all other points
      for (let i = 1; i < uniquePoints.length; i++) {
        const x = (uniquePoints[i].x - viewportOffset.x) * zoom;
        const y = (uniquePoints[i].y - viewportOffset.y) * zoom;
        ctx.lineTo(x, y);
      }
      
      // Connect back to the first point if we have enough points
      if (canvasPoints.length > 2) {
        ctx.lineTo(startX, startY);
      }
      
      // Style the lasso selection
      ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Fill with semi-transparent color
      ctx.fillStyle = 'rgba(0, 120, 255, 0.1)';
      ctx.fill();
    }
  } else if (lassoPoints.length > 2) {}
}, [tool, isPressed, path, viewportOffset, lassoPoints, selectionActive]);






//  ============================ Logica de canvas de seleccion =================================================//


//-----------------------------Funciones de accion para la selección---------------------------------------//

const deleteSelection=()=>{
  clearCurrentSelection();
  selectedPixels.forEach(pixel=>{
    erasePixels(activeLayerId, pixel.x+dragOffset.x, pixel.y+dragOffset.y);
  })
  
}





const rellenar = useCallback((coords) => {
  floodFill(activeLayerId, coords.x, coords.y, toolParameters.color);
}, [layers,activeLayerId,toolParameters]);

// En tu componente padre


const groupSelection = useCallback(() => {
  if (selectedPixels.length > 0) {
    // Aplicar el desplazamiento actual a las coordenadas de los píxeles
    const pixelsWithOffset = selectedPixels.map(pixel => ({
      ...pixel,
      x: pixel.x + dragOffset.x,
      y: pixel.y + dragOffset.y
    }));
    
    const groupId = createPixelGroup(activeLayerId, pixelsWithOffset, 'Nuevo Grupo');
    
    // Resetear el desplazamiento después de agrupar
    setDragOffset({ x: 0, y: 0 });
    
    // Opcional: seleccionar el grupo recién creado
    selectPixelGroup(groupId);
  }
}, [selectedPixels, dragOffset, activeLayerId, createPixelGroup, selectPixelGroup]);

const ungroupSelection = useCallback(() => {
  
  if (!selectedGroup) return;

  // 1. Eliminar el grupo usando la función existente
  deletePixelGroup(selectedGroup.layerId, selectedGroup.id);
  
  // 2. Limpiar la selección actual manteniendo los píxeles visibles
 

  // 3. Resetear los estados relacionados con la selección
  
}, [selectedGroup, deletePixelGroup]);


//Funciones de utilidad para layer manager:
const handleSelectGroup = useCallback((pixels) => {
  setTool(TOOLS.select);
  
  if (pixels && pixels.length > 0) {
    const xCoords = pixels.map(p => p.x);
    const yCoords = pixels.map(p => p.y);
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    // Guardar los píxeles originales con sus coordenadas absolutas
    setSelectedPixels(pixels);
    setOriginalPixelColors(pixels.map(p => p.color || { r: 0, g: 0, b: 0, a: 1 }));
    setCroppedSelectionBounds({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    });
    
    // Resetear el desplazamiento al seleccionar nuevo grupo
    setDragOffset({ x: 0, y: 0 });
    setSelectionActive(true);
  }

  
}, []);


  return (
    <div className="workspace2-container" style={{ position: 'relative', display: 'flex' }}>
      {/* Canvas Area */}
      <div className="workspace-container" style={{ flex: '1', overflow: 'hidden', position: 'relative' }}>
        <div className="toolbar" style={{ 
          display: 'flex', 
          padding: '8px', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
            <ColorPicker
            color={color}
            onChange={setColor}
            />
          <div className="zoom-control" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="zoom">Zoom: {zoom}x</label>
            <input 
              type="range" 
              id="zoom" 
              min="1" 
              max="40" 
              value={zoom} 
              onChange={handleZoomChange} 
              style={{ width: '120px' }}
            />
          </div>

          
            {/* Coordinates info */}
          
       
          <div className="tools" style={{ display: 'flex', gap: '8px' }}>
            
            
            <button 
              className={drawMode === "move" ? "tool-btn active" : "tool-btn"}
              onClick={() => setDrawMode("move")}
              style={{ 
                padding: '6px', 
                borderRadius: '4px', 
                background: drawMode === "move" ? '#cce6ff' : '#f0f0f0',
                border: '1px solid #ccc'
              }}
            >
              <LuPointerOff size={16} /> Move (M)
            </button>
            <div 
                      className={activeGrid ? "grid-control active" : "grid-control"}
                      onClick={()=>{setActiveGrid(!activeGrid)}}
                      >
                        <p>Grid</p>
                        <LuGrid2X2 />
                      </div>
                      
          </div>
        </div>
        
        <div 
          className="workspace" 
          ref={workspaceRef}
          style={{ 
            width: '100%', 
            height: 'calc(100% - 50px)', 
            position: 'relative', 
            overflow: 'hidden',
            cursor: drawMode === "move" ? "grab" : "crosshair",
      
          }}
        >
          
          <div
            className="canvas-container"
            ref={canvasContainerRef}
            style={{
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
              position: 'absolute',
              top: '50%',
              left: '50%',
              willChange: 'transform',
            }}
          >

            <div
              className="artboard"
              ref={artboardRef}
              style={{
                width: viewportWidth * zoom,
                height: viewportHeight * zoom,
                background: '#fff',
                position: 'relative',
                boxShadow: '0 0 10px rgba(0,0,0,0.2)',
              }}
            >
                              {croppedSelectionBounds && !isPressed &&(
  <div 
  ref={selectionActionsRef}
    className='workspace-selection-actions' 
    style={{
      position: 'absolute',
      top: (croppedSelectionBounds.y + dragOffset.y - viewportOffset.y) * zoom,
      left: (croppedSelectionBounds.x + croppedSelectionBounds.width + dragOffset.x - viewportOffset.x) * zoom,
      zIndex: 10,
      pointerEvents: 'auto' // Asegurar que el div puede recibir eventos
    }}
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
      <button className='action-button'  onClick={clearCurrentSelection }>
          <span className='icon'>
            <LuPointerOff/>
          </span>
          <p className='action-text'>Deseleccionar</p>
      </button>
      <button className='action-button' onClick={groupSelection}>
          <span className='icon'>
            <LuGroup/>
          </span>
          <p className='action-text'>Agrupar</p>
      </button>
      <button className='action-button' onClick={ungroupSelection}>
          <span className='icon'>
            <LuGroup/>
          </span>
          <p className='action-text'>Desagrupar</p>
      </button>
    </div>

  </div>
)}  

              {/* Composite Canvas - only this canvas is actually in the DOM */}
              <canvas
                ref={compositeCanvasRef}
                width={viewportWidth * zoom}
                height={viewportHeight * zoom}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none'
                }}
              />
              <canvas
                ref={previewCanvasRef}
                width={viewportWidth * zoom}
                height={viewportHeight * zoom}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
              <canvas
                ref={selectionCanvasRef}
                width={viewportWidth * zoom}
                height={viewportHeight * zoom}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                  zIndex: 11
                }}
              />
              
              {/* Pixel Grid */}
              {activeGrid && (
                <div 
                  className="pixel-grid" 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    backgroundSize: `${zoom}px ${zoom}px`,
                    backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="right-panel" style={{ 
        padding:10
      }}>{((viewportWidth * viewportHeight) / (totalWidth * totalHeight) * 100).toFixed(1)<100 &&
      
        <ViewportNavigator
        totalWidth={totalWidth}
        totalHeight={totalHeight}
        viewportWidth={viewportWidth}
        viewportHeight={viewportHeight}
        viewportOffset={viewportOffset}
        zoom={zoom}
        onViewportMove={moveViewport}
      />
      }
 
        <CustomTool tool={tool} setToolParameters={setToolParameters}/>
        
        <LayerManager
          // Props existentes
          layers={layers}
          addLayer={addLayer}
          deleteLayer={deleteLayer}
          moveLayerUp={moveLayerUp}
          moveLayerDown={moveLayerDown}
          toggleLayerVisibility={toggleLayerVisibility}
          renameLayer={renameLayer}
          clearLayer={clearLayer}
          activeLayerId={activeLayerId}
          setActiveLayerId={setActiveLayerId}
          
          // Nuevas props para grupos
          pixelGroups={pixelGroups}
          selectedGroup={selectedGroup}
          selectedPixels={selectedPixels}
          createPixelGroup={createPixelGroup}
          deletePixelGroup={deletePixelGroup}
          getLayerGroups={getLayerGroups}
          selectPixelGroup={selectPixelGroup}
          clearSelectedGroup={clearSelectedGroup}
          renamePixelGroup={renamePixelGroup}
          toggleGroupVisibility={toggleGroupVisibility}
          setSelectedPixels={setSelectedPixels}

          //funciones:
          handleSelectGroup={handleSelectGroup}

          //estados
          setSelectionCoords={setSelectionCoords}
          setSelectionActive={setSelectionActive}
          setCroppedSelectionBounds={setCroppedSelectionBounds}
          autoCropSelection={autoCropSelection}
          setOriginalPixelColors={setOriginalPixelColors}
          setDragOffset={setDragOffset}
          setTool={setTool}
          clearCurrentSelection={clearCurrentSelection}

          getHierarchicalLayers= {getHierarchicalLayers}
   getMainLayers={getMainLayers}
   getGroupLayersForParent= {getGroupLayersForParent}
        />
      </div>
      
    </div>
  );
}

export default CanvasTracker;

//Es necesario refactorizar el codigo para importar las funciones desde otro jsx, separar la logica de renderizado de canvas de seleccion y canvas de preview
