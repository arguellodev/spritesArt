import { useCallback, useEffect, useRef, useState } from 'react';
import { usePointer, useLayerManager } from '../hooks/hooks';
import { LuEye, LuEyeOff, LuTrash2, LuEraser, LuGroup ,LuUngroup, LuMousePointerBan, LuPaintBucket, LuPointerOff, LuGrid2X2  } from "react-icons/lu";
import { SlLayers } from "react-icons/sl";
import ViewportNavigator from './viewportNavigator';
import CustomTool from '../customTool/customTool';
import './workspaceContainer.css'
import LayerManager from './layerManager';
import ColorPicker from '../customTool/tools/colorPicker';
import ReflexMode from './reflexMode';
import { GrTopCorner,GrBottomCorner } from "react-icons/gr";
// @ts-ignore
import BoundsWorker from './boundsWorker.js?worker';

const worker = new BoundsWorker();

// Definición de las herramientas disponibles
const TOOLS = {
  paint : "pencil",
  erase : "eraser",
  select: "select",
  lassoSelect : 'lassoSelect',
  move: 'move',
  fill: 'fill',
  line: 'line',
  curve: 'curve',
  square: 'square',
  triangle: 'triangle',
  circle: 'circle',
  ellipse: 'ellipse',
  polygon:'polygon'
}

function CanvasTracker({setTool, tool,setToolParameters,toolParameters}) {

  //Parametros para modo espejo (reflex mode):
  const [mirrorState, setMirrorState] = useState({
    horizontal: false,
    vertical: false,
    customArea: false,
    bounds: {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0
    }
  });

  // Referencias a elementos del DOM
  const workspaceRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const selectionActionsRef = useRef(null);
  const artboardRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const mirrorCanvasRef = useRef(null)
  const leftMirrorCornerRef = useRef(null);
  const rightMirrorCornerRef = useRef(null);

  // Refs para inicio de herramientas
const squareStartRef = useRef(null);
const triangleStartRef = useRef(null);
const circleStartRef = useRef(null);
const ellipseStartRef = useRef(null);
const polygonStartRef = useRef(null);


  // Estados principales
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [zoom, setZoom] = useState(10);
  const [workspaceWidth, setWorkspaceWidth] = useState(1000);
  const [workspaceHeight, setWorkspaceHeight] = useState(1000);
  const [color, setColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  const [activeGrid, setActiveGrid] = useState(true);
  
  // Estados para herramientas específicas
  const [curveState, setCurveState] = useState('idle');
  const [isSettingControl, setIsSettingControl] = useState(false);
  const [lastPressState, setLastPressState] = useState(false);
  const curveStartRef = useRef(null);
  const curveEndRef = useRef(null);
  const curveControlRef = useRef(null);
  const [clickStartTime, setClickStartTime] = useState(null);
  const lineStartRef = useRef(null);
  
  // Configuración del canvas
  const [totalWidth,setTotalWidth] = useState(64);
  const [totalHeight, setTotalHeight] = useState(64);

  const [drawableWidth, setDrawableWidth] = useState(64);
  const [drawableHeight, setDrawableHeight] = useState(64);
 
  
  // Estados para el viewport y navegación
  const [viewportWidth, setViewportWidth] = useState(Math.min(totalWidth, workspaceWidth.toFixed(0)/ zoom));
  const [viewportHeight, setViewportHeight] = useState(Math.min(totalHeight, workspaceHeight.toFixed(0) / zoom));
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hook para gestión de capas
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
    erasePixels,
    floodFill,
    pixelGroups,
    selectedGroup,
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

  // Hook para rastreo del puntero
 
  const {
    position: position,
    relativeToTarget: relativeToTarget,
    isPressed: isPressed,
    path: path
  } = usePointer(workspaceRef, artboardRef, [
    selectionActionsRef,
    leftMirrorCornerRef,
    rightMirrorCornerRef
  ]);
  const lastPixelRef = useRef(null);
  const [drawMode, setDrawMode] = useState("draw");



//===============================Logica de canvas de espejo ====================================================//
const {
  
  relativeToTarget: rightRelativeToTargetMirror,
  isPressed: rightIsPressedMirror,
 
} = usePointer(rightMirrorCornerRef, artboardRef,[]);
const {
  
  relativeToTarget: leftRelativeToTargetMirror,
  isPressed: leftIsPressedMirror,
 
} = usePointer(leftMirrorCornerRef, artboardRef,[]);

const [positionCorners,setPositionCorners] = useState({
  x1:0,y1:0,x2:0,y2:0
})

useEffect(() => {

  //para esquina izquierda
  const leftViewportPixelCoords = getPixelCoordinates(leftRelativeToTargetMirror);
const leftCanvasCoords = viewportToCanvasCoords(leftViewportPixelCoords.x, leftViewportPixelCoords.y);

//para esquina derecha
const rightViewportPixelCoords = getPixelCoordinates(rightRelativeToTargetMirror);
const rightCanvasCoords = viewportToCanvasCoords(rightViewportPixelCoords.x, rightViewportPixelCoords.y);



if(leftIsPressedMirror){
  setPositionCorners(prev => ({
    ...prev,
    x1: leftCanvasCoords.x,
    y1: leftCanvasCoords.y
  }));
  setMirrorState(prev => ({
    ...prev,
    bounds: {
      ...prev.bounds,
      x1: leftCanvasCoords.x+1,
      y1: leftCanvasCoords.y+1,
     
    }
  }));
  
}

if(rightIsPressedMirror){
  setPositionCorners(prev => ({
    ...prev,
    x2: rightCanvasCoords.x,
    y2: rightCanvasCoords.y
  }));
  setMirrorState(prev => ({
    ...prev,
    bounds: {
      ...prev.bounds,
      x2: rightCanvasCoords.x-1,
      y2: rightCanvasCoords.y-1,
     
    }
  }));
  
}

  const canvas = mirrorCanvasRef.current;
  
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (mirrorState.customArea) {
    ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
    ctx.lineWidth = 4;

    ctx.fillRect(
      (mirrorState.bounds.x1 - viewportOffset.x) * zoom, 
      (mirrorState.bounds.y1 - viewportOffset.y) * zoom,
      (mirrorState.bounds.x2 - mirrorState.bounds.x1) * zoom,
      (mirrorState.bounds.y2 - mirrorState.bounds.y1) * zoom
    );
    
    ctx.strokeRect(
      (mirrorState.bounds.x1 - viewportOffset.x) * zoom, 
      (mirrorState.bounds.y1 - viewportOffset.y) * zoom,
      (mirrorState.bounds.x2 - mirrorState.bounds.x1) * zoom,
      (mirrorState.bounds.y2 - mirrorState.bounds.y1) * zoom
    );
  }
}, [mirrorCanvasRef, zoom, mirrorState, viewportOffset,leftRelativeToTargetMirror,rightRelativeToTargetMirror]);

//===============================Logica de canvas de espejo ====================================================//

  // Función para dibujar una curva cuadrática Bézier
  const drawQuadraticCurve = useCallback((ctx, start, end, control, width) => {
    ctx.save();
    ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, ${toolParameters.fillColor.a})`;
    
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
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      if (current.x !== next.x || current.y !== next.y) {
        drawPixelPerfectLine(current.x, current.y, next.x, next.y, width);
      }
    }
    
    const offset = Math.floor(width / 2);
    
    for (let dy = 0; dy < width; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const px = start.x + dx - offset;
        const py = start.y + dy - offset;
        if (px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
    
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
  },[toolParameters]);

  // Función para dibujar preview de curva
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
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      if (current.x !== next.x || current.y !== next.y) {
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

  // Función para dibujar preview de línea
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

  // Función para dibujar un pincel
  function drawBrush(ctx, canvasCoords, size) {
    const offset = Math.floor(size / 2);
    const startX = canvasCoords.x - offset;
    const startY = canvasCoords.y - offset;
    
    ctx.fillRect(startX, startY, size, size);
  }

  //Funciones para manejar el cuadrado: 
  // 2. Función para dibujar un rectángulo con bordes redondeados
  const drawRoundedRect = (ctx, x, y, width, height, radius, borderWidth, borderColor, fillColor) => {
    // Asegurar que el radio no sea mayor que la mitad del lado más pequeño
    const maxRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
    const actualRadius = Math.min(radius, maxRadius);
    
    // Calcular las coordenadas del rectángulo
    const startX = Math.min(x, x + width);
    const startY = Math.min(y, y + height);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);
    
    // Función auxiliar para verificar si un punto está dentro del rectángulo redondeado
    const isInsideRoundedRect = (px, py, w, h, r) => {
      if (r <= 0) return true;
      
      // Esquina superior izquierda
      if (px < r && py < r) {
        const dx = r - px;
        const dy = r - py;
        return (dx * dx + dy * dy) <= (r * r);
      }
      // Esquina superior derecha
      else if (px >= w - r && py < r) {
        const dx = px - (w - r - 1);
        const dy = r - py;
        return (dx * dx + dy * dy) <= (r * r);
      }
      // Esquina inferior izquierda
      else if (px < r && py >= h - r) {
        const dx = r - px;
        const dy = py - (h - r - 1);
        return (dx * dx + dy * dy) <= (r * r);
      }
      // Esquina inferior derecha
      else if (px >= w - r && py >= h - r) {
        const dx = px - (w - r - 1);
        const dy = py - (h - r - 1);
        return (dx * dx + dy * dy) <= (r * r);
      }
      
      return true;
    };
    
    // Dibujar el rectángulo píxel por píxel
    for (let py = 0; py < rectHeight; py++) {
      for (let px = 0; px < rectWidth; px++) {
        const finalX = startX + px;
        const finalY = startY + py;
        
        if (finalX >= 0 && finalX < ctx.canvas.width && finalY >= 0 && finalY < ctx.canvas.height) {
          const isInside = isInsideRoundedRect(px, py, rectWidth, rectHeight, actualRadius);
          
          if (isInside) {
            let shouldDraw = false;
            let colorToUse = null;
            
            // Determinar si es borde o relleno
            const isBorder = borderWidth > 0 && (
              px < borderWidth || 
              px >= rectWidth - borderWidth || 
              py < borderWidth || 
              py >= rectHeight - borderWidth ||
              // Verificar bordes internos para esquinas redondeadas
              !isInsideRoundedRect(px - borderWidth, py - borderWidth, 
                                 rectWidth - 2 * borderWidth, rectHeight - 2 * borderWidth, 
                                 Math.max(0, actualRadius - borderWidth))
            );
            
            if (isBorder && borderColor && borderWidth > 0) {
              shouldDraw = true;
              colorToUse = borderColor;
            } else if (!isBorder && fillColor) {
              shouldDraw = true;
              colorToUse = fillColor;
            }
            
            if (shouldDraw && colorToUse) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
              ctx.fillRect(finalX, finalY, 1, 1);
            }
          }
        }
      }
    }
  };

// 3. Función para dibujar preview del rectángulo
const drawPreviewRect = (ctx, start, end, radius, borderWidth, borderColor, fillColor) => {
  const width = end.x - start.x;
  const height = end.y - start.y;
  
  const startX = Math.min(start.x, end.x);
  const startY = Math.min(start.y, end.y);
  const rectWidth = Math.abs(width);
  const rectHeight = Math.abs(height);
  
  const maxRadius = Math.min(rectWidth, rectHeight) / 2;
  const actualRadius = Math.min(radius, maxRadius);
  
  // Función auxiliar para verificar si un punto está dentro del rectángulo redondeado
  const isInsideRoundedRect = (px, py, w, h, r) => {
    if (r <= 0) return true;
    
    // Esquina superior izquierda
    if (px < r && py < r) {
      const dx = r - px;
      const dy = r - py;
      return (dx * dx + dy * dy) <= (r * r);
    }
    // Esquina superior derecha
    else if (px >= w - r && py < r) {
      const dx = px - (w - r - 1);
      const dy = r - py;
      return (dx * dx + dy * dy) <= (r * r);
    }
    // Esquina inferior izquierda
    else if (px < r && py >= h - r) {
      const dx = r - px;
      const dy = py - (h - r - 1);
      return (dx * dx + dy * dy) <= (r * r);
    }
    // Esquina inferior derecha
    else if (px >= w - r && py >= h - r) {
      const dx = px - (w - r - 1);
      const dy = py - (h - r - 1);
      return (dx * dx + dy * dy) <= (r * r);
    }
    
    return true;
  };
  
  // Dibujar preview píxel por píxel
  for (let py = 0; py < rectHeight; py++) {
    for (let px = 0; px < rectWidth; px++) {
      const isInside = isInsideRoundedRect(px, py, rectWidth, rectHeight, actualRadius);
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Determinar si es borde o relleno
        const isBorder = borderWidth > 0 && (
          px < borderWidth || 
          px >= rectWidth - borderWidth || 
          py < borderWidth || 
          py >= rectHeight - borderWidth ||
          // Verificar bordes internos para esquinas redondeadas
          !isInsideRoundedRect(px - borderWidth, py - borderWidth, 
                             rectWidth - 2 * borderWidth, rectHeight - 2 * borderWidth, 
                             Math.max(0, actualRadius - borderWidth))
        );
        
        if (isBorder && borderColor && borderWidth > 0) {
          shouldDraw = true;
          colorToUse = borderColor;
          alpha = 0.8; // Borde un poco más opaco
        } else if (!isBorder && fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6; // Relleno un poco más transparente
        }
        
        if (shouldDraw && colorToUse) {
          const canvasX = startX + px;
          const canvasY = startY + py;
          const screenX = (canvasX - viewportOffset.x) * zoom;
          const screenY = (canvasY - viewportOffset.y) * zoom;
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          }
        }
      }
    }
  }
};

//Funciones para manejar el triangulo:
// 2. Función para dibujar un triángulo
const drawTriangle = (ctx, start, end, borderWidth, borderColor, fillColor) => {
  // Calcular las coordenadas del triángulo
  const startX = Math.min(start.x, end.x);
  const startY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  
  if (width === 0 || height === 0) return;
  
  // Definir los tres vértices del triángulo (triángulo equilátero inscrito en rectángulo)
  const topX = startX + Math.floor(width / 2);
  const topY = startY;
  const bottomLeftX = startX;
  const bottomLeftY = startY + height;
  const bottomRightX = startX + width;
  const bottomRightY = startY + height;
  
  // Función para verificar si un punto está dentro del triángulo usando coordenadas baricéntricas
  const isInsideTriangle = (px, py, x1, y1, x2, y2, x3, y3) => {
    const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
    if (denominator === 0) return false;
    
    const a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denominator;
    const b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denominator;
    const c = 1 - a - b;
    
    return a >= 0 && b >= 0 && c >= 0;
  };
  
  // Función para calcular la distancia de un punto a una línea
  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Dibujar el triángulo píxel por píxel
  for (let py = 0; py <= height; py++) {  // Cambiar < por <=
    for (let px = 0; px <= width; px++) {   // Cambiar < por <=
      const finalX = startX + px;
      const finalY = startY + py;
      
      if (finalX >= 0 && finalX < ctx.canvas.width && finalY >= 0 && finalY < ctx.canvas.height) {
        const isInside = isInsideTriangle(finalX, finalY, topX, topY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY);
        
        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          
          // Determinar si es borde o relleno
          const isBorder = borderWidth > 0 && (
            distanceToLine(finalX, finalY, topX, topY, bottomLeftX, bottomLeftY) < borderWidth ||
            distanceToLine(finalX, finalY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY) < borderWidth ||
            distanceToLine(finalX, finalY, bottomRightX, bottomRightY, topX, topY) < borderWidth
          );
          
          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
          }
          
          if (shouldDraw && colorToUse) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
            ctx.fillRect(finalX, finalY, 1, 1);
          }
        }
      }
    }
  }
};
// Dibujar la previa del triangulo
const drawPreviewTriangle = (ctx, start, end, borderWidth, borderColor, fillColor) => {
  const startX = Math.min(start.x, end.x);
  const startY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  
  if (width === 0 || height === 0) return;
  
  // Definir los tres vértices del triángulo
  const topX = startX + Math.floor(width / 2);
  const topY = startY;
  const bottomLeftX = startX;
  const bottomLeftY = startY + height;
  const bottomRightX = startX + width;
  const bottomRightY = startY + height;
  
  // Función para verificar si un punto está dentro del triángulo
  const isInsideTriangle = (px, py, x1, y1, x2, y2, x3, y3) => {
    const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
    if (denominator === 0) return false;
    
    const a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denominator;
    const b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denominator;
    const c = 1 - a - b;
    
    return a >= 0 && b >= 0 && c >= 0;
  };
  
  // Función para calcular la distancia de un punto a una línea
  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Dibujar preview píxel por píxel
  for (let py = 0; py <= height; py++) {  // Cambiar < por <=
    for (let px = 0; px <= width; px++) {   // Cambiar < por <=
      const canvasX = startX + px;
      const canvasY = startY + py;
      
      const isInside = isInsideTriangle(canvasX, canvasY, topX, topY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY);
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Determinar si es borde o relleno
        const isBorder = borderWidth > 0 && (
          distanceToLine(canvasX, canvasY, topX, topY, bottomLeftX, bottomLeftY) < borderWidth ||
          distanceToLine(canvasX, canvasY, bottomLeftX, bottomLeftY, bottomRightX, bottomRightY) < borderWidth ||
          distanceToLine(canvasX, canvasY, bottomRightX, bottomRightY, topX, topY) < borderWidth
        );
        
        if (isBorder && borderColor && borderWidth > 0) {
          shouldDraw = true;
          colorToUse = borderColor;
          alpha = 0.8; // Borde un poco más opaco
        } else if (!isBorder && fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6; // Relleno un poco más transparente
        }
        
        if (shouldDraw && colorToUse) {
          const screenX = (canvasX - viewportOffset.x) * zoom;
          const screenY = (canvasY - viewportOffset.y) * zoom;
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          }
        }
      }
    }
  }
};

//Funciones para la herramienta de circulo
// Después de la función drawRoundedRect
const drawCircle = (ctx, centerX, centerY, radius, borderWidth, borderColor, fillColor) => {
  if (radius <= 0) return;
  
  const startX = centerX - radius;
  const startY = centerY - radius;
  const diameter = radius * 2;
  
  // Función auxiliar para verificar si un punto está dentro del círculo
  const isInsideCircle = (px, py, cx, cy, r) => {
    const dx = px - cx;
    const dy = py - cy;
    return (dx * dx + dy * dy) <= (r * r);
  };
  
  // Dibujar el círculo píxel por píxel
  for (let py = 0; py <= diameter; py++) {
    for (let px = 0; px <= diameter; px++) {
      const finalX = startX + px;
      const finalY = startY + py;
      
      if (finalX >= 0 && finalX < ctx.canvas.width && finalY >= 0 && finalY < ctx.canvas.height) {
        const relativeX = px - radius;
        const relativeY = py - radius;
        const distanceFromCenter = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
        
        const isInside = distanceFromCenter <= radius;
        
        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          
          // Determinar si es borde o relleno
          const isBorder = borderWidth > 0 && distanceFromCenter > (radius - borderWidth);
          
          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
          }
          
          if (shouldDraw && colorToUse) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
            ctx.fillRect(finalX, finalY, 1, 1);
          }
        }
      }
    }
  }
};

// Después de drawPreviewRect
const drawPreviewCircle = (ctx, center, end, borderWidth, borderColor, fillColor) => {
  const deltaX = end.x - center.x;
  const deltaY = end.y - center.y;
  const radius = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));
  
  if (radius <= 0) return;
  
  const startX = center.x - radius;
  const startY = center.y - radius;
  const diameter = radius * 2;
  
  // Dibujar preview píxel por píxel
  for (let py = 0; py <= diameter; py++) {
    for (let px = 0; px <= diameter; px++) {
      const relativeX = px - radius;
      const relativeY = py - radius;
      const distanceFromCenter = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      
      const isInside = distanceFromCenter <= radius;
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Determinar si es borde o relleno
        const isBorder = borderWidth > 0 && distanceFromCenter > (radius - borderWidth);
        
        if (isBorder && borderColor && borderWidth > 0) {
          shouldDraw = true;
          colorToUse = borderColor;
          alpha = 0.8; // Borde un poco más opaco
        } else if (!isBorder && fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6; // Relleno un poco más transparente
        }
        
        if (shouldDraw && colorToUse) {
          const canvasX = startX + px;
          const canvasY = startY + py;
          const screenX = (canvasX - viewportOffset.x) * zoom;
          const screenY = (canvasY - viewportOffset.y) * zoom;
          
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          }
        }
      }
    }
  }
};

//Funciones para dibujar la elipse:

const drawEllipse = (ctx, startX, startY, endX, endY, borderWidth, borderColor, fillColor) => {
  // Calcular dimensiones y centro
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  const centerX = Math.min(startX, endX) + width / 2;
  const centerY = Math.min(startY, endY) + height / 2;
  
  if (width <= 0 || height <= 0) return;
  
  const radiusX = width / 2;
  const radiusY = height / 2;
  
  // Área de renderizado
  const left = Math.max(0, Math.floor(centerX - radiusX) - 1);
  const right = Math.min(ctx.canvas.width - 1, Math.ceil(centerX + radiusX) + 1);
  const top = Math.max(0, Math.floor(centerY - radiusY) - 1);
  const bottom = Math.min(ctx.canvas.height - 1, Math.ceil(centerY + radiusY) + 1);
  
  // Dibujar la elipse píxel por píxel
  for (let py = top; py <= bottom; py++) {
    for (let px = left; px <= right; px++) {
      // Coordenadas relativas al centro
      const relativeX = px - centerX;
      const relativeY = py - centerY;
      
      // Ecuación de la elipse: (x/a)² + (y/b)² <= 1
      const ellipseValue = (relativeX * relativeX) / (radiusX * radiusX) + 
                          (relativeY * relativeY) / (radiusY * radiusY);
      
      const isInside = ellipseValue <= 1;
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        
        // Determinar si es borde o relleno
        if (borderWidth > 0 && borderColor) {
          // Para el borde, calculamos si está en la región exterior del borde
          const innerRadiusX = Math.max(0, radiusX - borderWidth);
          const innerRadiusY = Math.max(0, radiusY - borderWidth);
          
          const innerEllipseValue = innerRadiusX > 0 && innerRadiusY > 0 ? 
            (relativeX * relativeX) / (innerRadiusX * innerRadiusX) + 
            (relativeY * relativeY) / (innerRadiusY * innerRadiusY) : 2;
          
          const isBorder = innerEllipseValue > 1;
          
          if (isBorder) {
            shouldDraw = true;
            colorToUse = borderColor;
          } else if (fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
          }
        } else if (fillColor) {
          // Solo relleno, sin borde
          shouldDraw = true;
          colorToUse = fillColor;
        }
        
        if (shouldDraw && colorToUse) {
          ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }
};

const drawPreviewEllipse = (ctx, start, end, borderWidth, borderColor, fillColor) => {
  // Calcular dimensiones y centro en coordenadas de canvas
  const canvasWidth = Math.abs(end.x - start.x);
  const canvasHeight = Math.abs(end.y - start.y);
  const canvasCenterX = Math.min(start.x, end.x) + canvasWidth / 2;
  const canvasCenterY = Math.min(start.y, end.y) + canvasHeight / 2;
  
  if (canvasWidth <= 0 || canvasHeight <= 0) return;
  
  const canvasRadiusX = (canvasWidth / 2);
  const canvasRadiusY = (canvasHeight / 2);
  
  // Área de renderizado EN COORDENADAS DE CANVAS
  const left = Math.max(0, Math.floor(canvasCenterX - canvasRadiusX) - 1);
  const right = Math.ceil(canvasCenterX + canvasRadiusX) + 1;
  const top = Math.max(0, Math.floor(canvasCenterY - canvasRadiusY) - 1);
  const bottom = Math.ceil(canvasCenterY + canvasRadiusY) + 1;
  
  // Iterar en coordenadas de canvas
  for (let cy = top; cy <= bottom; cy++) {
    for (let cx = left; cx <= right; cx++) {
      // Coordenadas relativas al centro en canvas
      const relativeX = cx - canvasCenterX;
      const relativeY = cy - canvasCenterY;
      
      // Ecuación de la elipse en coordenadas de canvas
      const ellipseValue = canvasRadiusX > 0 && canvasRadiusY > 0 ?
        (relativeX * relativeX) / (canvasRadiusX * canvasRadiusX) +
        (relativeY * relativeY) / (canvasRadiusY * canvasRadiusY) : 2;
      
       
      const isInside = ellipseValue <= 1;
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Determinar si es borde o relleno
        if (borderWidth > 0 && borderColor) {
          const innerCanvasRadiusX = Math.max(0, canvasRadiusX - borderWidth);
          const innerCanvasRadiusY = Math.max(0, canvasRadiusY - borderWidth);
          
          const innerEllipseValue = innerCanvasRadiusX > 0 && innerCanvasRadiusY > 0 ?
            (relativeX * relativeX) / (innerCanvasRadiusX * innerCanvasRadiusX) +
            (relativeY * relativeY) / (innerCanvasRadiusY * innerCanvasRadiusY) : 2;
          
          const isBorder = innerEllipseValue > 1;
          
          if (isBorder) {
            shouldDraw = true;
            colorToUse = borderColor;
            alpha = 0.8;
          } else if (fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
            alpha = 0.6;
          }
        } else if (fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6;
        }
        
        if (shouldDraw && colorToUse) {
          // Convertir a coordenadas de pantalla solo para dibujar
          const screenX = (cx - viewportOffset.x) * zoom;
          const screenY = (cy - viewportOffset.y) * zoom;
          
          // Verificar si está visible en pantalla
          if (screenX >= 0 && screenY >= 0 && 
              screenX < ctx.canvas.width && screenY < ctx.canvas.height) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.ceil(zoom), Math.ceil(zoom));
          }
        }
      }
    }
  }
};

//Funciones para herramienta de poligono =====================================

// 3. Función para calcular puntos del polígono
const calculatePolygonPoints = (centerX, centerY, radius, vertices, rotation = 0) => {
  const points = [];
  const angleStep = (2 * Math.PI) / vertices;
  
  for (let i = 0; i < vertices; i++) {
    const angle = i * angleStep + rotation;
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    points.push({ x, y });
  }
  
  return points;
};

// 4. Función para verificar si un punto está dentro del polígono
const isPointInPolygonShape = (px, py, points) => {
  let inside = false;
  const n = points.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

// 5. Función para dibujar línea entre dos puntos (para los bordes del polígono)
const drawPolygonLine = (ctx, x0, y0, x1, y1, width, color) => {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0, y = y0;
  
  const offset = Math.floor(width / 2);
  const drawnPixels = new Set();
  
  while (true) {
    for (let brushY = 0; brushY < width; brushY++) {
      for (let brushX = 0; brushX < width; brushX++) {
        const px = x + brushX - offset;
        const py = y + brushY - offset;
        const key = `${px},${py}`;
        
        if (!drawnPixels.has(key) && px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
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

// 6. Función para dibujar polígono
const drawPolygon = (ctx, centerX, centerY, radius, vertices, borderWidth, borderColor, fillColor, rotation = 0) => {
  const points = calculatePolygonPoints(centerX, centerY, radius, vertices, rotation);
  
  // Calcular bounding box
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  
  // Dibujar píxel por píxel
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      if (px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
        const isInside =isPointInPolygonShape (px, py, points);
        
        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          
          // Verificar si es borde
          let isBorder = false;
          if (borderWidth > 0) {
            // Calcular polígono interior para detectar bordes
            const innerRadius = Math.max(0, radius - borderWidth);
            const innerPoints = calculatePolygonPoints(centerX, centerY, innerRadius, vertices, rotation);
            const isInsideInner = innerRadius > 0 ? isPointInPolygonShape(px, py, innerPoints) : false;
            isBorder = !isInsideInner;
          }
          
          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
          }
          
          if (shouldDraw && colorToUse) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
    }
  }
};

// 7. Función para dibujar preview del polígono
const drawPreviewPolygon = (ctx, centerX, centerY, radius, vertices, borderWidth, borderColor, fillColor, rotation = 0) => {
  const points = calculatePolygonPoints(centerX, centerY, radius, vertices, rotation);
  
  // Calcular bounding box
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  
  // Dibujar píxel por píxel
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const isInside = isPointInPolygonShape(px, py, points);
      
      if (isInside) {
        let shouldDraw = false;
        let colorToUse = null;
        let alpha = 0.7;
        
        // Verificar si es borde
        let isBorder = false;
        if (borderWidth > 0) {
          const innerRadius = Math.max(0, radius - borderWidth);
          const innerPoints = calculatePolygonPoints(centerX, centerY, innerRadius, vertices, rotation);
          const isInsideInner = innerRadius > 0 ? isPointInPolygonShape(px, py, innerPoints) : false;
          isBorder = !isInsideInner;
        }
        
        if (isBorder && borderColor && borderWidth > 0) {
          shouldDraw = true;
          colorToUse = borderColor;
          alpha = 0.8;
        } else if (!isBorder && fillColor) {
          shouldDraw = true;
          colorToUse = fillColor;
          alpha = 0.6;
        }
        
        if (shouldDraw && colorToUse) {
          const screenX = (px - viewportOffset.x) * zoom;
          const screenY = (py - viewportOffset.y) * zoom;
          
          if (screenX >= 0 && screenY >= 0) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          }
        }
      }
    }
  }
};





  // Función para obtener coordenadas de píxel
  const getPixelCoordinates = (coords) => {
    return {
      x: Math.floor(coords.x / zoom),
      y: Math.floor(coords.y / zoom)
    };
  };

  // Función para rellenar áreas

  // Efecto para observar cambios en el tamaño del workspace
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

    return () => {
      observer.disconnect();
    };
  }, []);

  // Efecto para actualizar el tamaño del viewport cuando cambia el zoom
  useEffect(() => {
    setViewportWidth(Math.min(totalWidth, Math.floor(workspaceWidth.toFixed(0)/ zoom)));
    setViewportHeight(Math.min(totalHeight, Math.floor(workspaceHeight.toFixed(0)/ zoom)));
  }, [zoom]);

  // Efecto para establecer la primera capa como activa
  useEffect(() => {
    if (layers.length > 0 && !activeLayerId) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);

  // Efecto para manejar cambios de dimensiones del workspace
  useEffect(() => {
    const newWidth = Math.min(totalWidth, Math.floor(workspaceWidth / zoom));
    const newHeight = Math.min(totalHeight, Math.floor(workspaceHeight / zoom));
    
    if (newWidth !== viewportWidth || newHeight !== viewportHeight) {
      const maxOffsetX = Math.max(0, totalWidth - newWidth);
      const maxOffsetY = Math.max(0, totalHeight - newHeight);
      
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

  // Funciones para manejar el arrastre del canvas
  const handleStartDrag = useCallback((e) => {
    if (drawMode === "move") {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [drawMode]);

  const handleDrag = useCallback((e) => {
    if (isDragging && drawMode === "move") {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      moveViewport(-dx / zoom, -dy / zoom);
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, zoom, drawMode, moveViewport]);

  const handleEndDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Efecto para añadir event listeners de arrastre
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

  // Efecto para manejar cambios de herramienta
  useEffect(() => {
    if (tool === TOOLS.move) {
      setDrawMode('move');
    } else if (tool === TOOLS.paint) {
      setDrawMode('draw');
    } else if (tool === TOOLS.erase) {
      setDrawMode('erase');
    } else if (tool === TOOLS.curve) {
      setDrawMode('curve');
    } else if (tool === TOOLS.line) {
      setDrawMode('line');
    } else if (tool === TOOLS.square) {
      setDrawMode('square');
    }else if (tool === TOOLS.triangle) {
      setDrawMode('triangle');} 
    else if (tool === TOOLS.circle) {
      setDrawMode('circle');}
    else if (tool === TOOLS.ellipse) {
      setDrawMode('ellipse');}
      else if (tool === TOOLS.polygon) { // AGREGAR ESTA LÍNEA
        setDrawMode('polygon');
      }
    
  }, [tool]);

  // Efecto principal para manejar el dibujo
  useEffect(() => {
    if (tool === TOOLS.curve) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
      const justPressed = isPressed && !lastPressState;
      const justReleased = !isPressed && lastPressState;
      
      if (justPressed) {
        if (curveState === 'idle') {
          curveStartRef.current = canvasCoords;
          setCurveState('first-point');
        } else if (curveState === 'first-point') {
          curveEndRef.current = canvasCoords;
          curveControlRef.current = canvasCoords;
          setCurveState('setting-control');
          setIsSettingControl(true);
        }
      }
      
      if (justReleased) {
        if (curveState === 'setting-control') {
          if (curveStartRef.current && curveEndRef.current && curveControlRef.current) {
            // Calcular centro basado en bounds (igual que en paint)
            const hasBounds = mirrorState.bounds &&
              (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
                mirrorState.bounds.y2 > mirrorState.bounds.y1);
    
            const centerX = hasBounds
              ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
              : Math.floor(drawableWidth / 2);
    
            const centerY = hasBounds
              ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
              : Math.floor(drawableHeight / 2);
    
            // Ajustes para dimensiones impares (igual que en paint)
            const adjustment = -1;
            const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
            const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
    
            const reflectHorizontal = (x) => centerX * 2 - x + adjustment + imparAdjustmentWidth;
            const reflectVertical = (y) => centerY * 2 - y + adjustment + imparAdjustmentHeight;
    
            const start = curveStartRef.current;
            const end = curveEndRef.current;
            const control = curveControlRef.current;
    
            drawOnLayer(activeLayerId, (ctx) => {
              // Curva normal
              drawQuadraticCurve(
                ctx,
                start,
                end,
                control,
                toolParameters.width
              );
    
              // Espejo vertical (refleja Y)
              if (mirrorState.vertical) {
                drawQuadraticCurve(
                  ctx,
                  { x: start.x, y: reflectVertical(start.y) },
                  { x: end.x, y: reflectVertical(end.y) },
                  { x: control.x, y: reflectVertical(control.y) },
                  toolParameters.width
                );
              }
    
              // Espejo horizontal (refleja X)
              if (mirrorState.horizontal) {
                drawQuadraticCurve(
                  ctx,
                  { x: reflectHorizontal(start.x), y: start.y },
                  { x: reflectHorizontal(end.x), y: end.y },
                  { x: reflectHorizontal(control.x), y: control.y },
                  toolParameters.width
                );
              }
    
              // Espejo diagonal (refleja X e Y)
              if (mirrorState.horizontal && mirrorState.vertical) {
                drawQuadraticCurve(
                  ctx,
                  { x: reflectHorizontal(start.x), y: reflectVertical(start.y) },
                  { x: reflectHorizontal(end.x), y: reflectVertical(end.y) },
                  { x: reflectHorizontal(control.x), y: reflectVertical(control.y) },
                  toolParameters.width
                );
              }
            });
          }
          
          setCurveState('idle');
          setIsSettingControl(false);
          curveStartRef.current = null;
          curveEndRef.current = null;
          curveControlRef.current = null;
        }
      }
      
      if (curveState === 'setting-control' && isPressed) {
        curveControlRef.current = canvasCoords;
      }
      
      setLastPressState(isPressed);
      
      return;
    }
    if (tool === TOOLS.line) {
      if (isPressed) {
        if (!lineStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
          lineStartRef.current = canvasCoords;
        }
      } else {
        if (lineStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
        
          const width = toolParameters.width;
        
          // Calcular centro basado en bounds (igual que en paint)
          const hasBounds = mirrorState.bounds &&
            (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
              mirrorState.bounds.y2 > mirrorState.bounds.y1);
    
          const centerX = hasBounds
            ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
            : Math.floor(drawableWidth / 2);
    
          const centerY = hasBounds
            ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
            : Math.floor(drawableHeight / 2);
    
          // Ajustes para dimensiones impares (igual que en paint)
          const adjustment = -1;
          const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
          const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
    
          const reflectHorizontal = (x) => centerX * 2 - x + adjustment + imparAdjustmentWidth;
          const reflectVertical = (y) => centerY * 2 - y + adjustment + imparAdjustmentHeight;
        
          const start = lineStartRef.current;
          const startX = start.x;
          const startY = start.y;
          const endX = endCoords.x;
          const endY = endCoords.y;
        
          drawOnLayer(activeLayerId, (ctx) => {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, ${toolParameters.fillColor.a})`;
        
            // Línea normal
            drawPixelLine(ctx, startX, startY, endX, endY, width);
        
            // Espejo vertical (refleja Y)
            if (mirrorState.vertical) {
              drawPixelLine(
                ctx,
                startX,
                reflectVertical(startY),
                endX,
                reflectVertical(endY),
                width
              );
            }
    
            // Espejo horizontal (refleja X)
            if (mirrorState.horizontal) {
              drawPixelLine(
                ctx,
                reflectHorizontal(startX),
                startY,
                reflectHorizontal(endX),
                endY,
                width
              );
            }
        
            // Espejo diagonal (refleja X e Y)
            if (mirrorState.horizontal && mirrorState.vertical) {
              drawPixelLine(
                ctx,
                reflectHorizontal(startX),
                reflectVertical(startY),
                reflectHorizontal(endX),
                reflectVertical(endY),
                width
              );
            }
          });
        
          lineStartRef.current = null;
        }
      }
      return;
    }

    if (tool === TOOLS.square) {
      if (isPressed) {
        if (!squareStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
          squareStartRef.current = canvasCoords;
        }
      } else {
        if (squareStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
          
          drawOnLayer(activeLayerId, (ctx) => {
            ctx.globalCompositeOperation = 'source-over';
            
            const width = endCoords.x - squareStartRef.current.x;
            const height = endCoords.y - squareStartRef.current.y;
            
            // Obtener colores y configuración de los parámetros de la herramienta
            const borderColor = toolParameters.borderColor || null;
            const fillColor = toolParameters.fillColor || color; // Usar color principal como fallback
            const borderWidth = toolParameters.borderWidth || 0;
            const borderRadius = toolParameters.borderRadius || 0;
            
            drawRoundedRect(
              ctx,
              squareStartRef.current.x,
              squareStartRef.current.y,
              width,
              height,
              borderRadius,
              borderWidth,
              borderColor,
              fillColor
            );
          });
          
          squareStartRef.current = null;
        }
      }
      return;
    }

    if (tool === TOOLS.triangle) {
      if (isPressed) {
        if (!triangleStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
          triangleStartRef.current = canvasCoords;
        }
      } else {
        if (triangleStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
          
          drawOnLayer(activeLayerId, (ctx) => {
            ctx.globalCompositeOperation = 'source-over';
            
            // Obtener colores y configuración de los parámetros de la herramienta
            const borderColor = toolParameters.borderColor || null;
            const fillColor = toolParameters.fillColor || color; // Usar color principal como fallback
            const borderWidth = toolParameters.borderWidth || 0;
            
            drawTriangle(
              ctx,
              triangleStartRef.current,
              endCoords,
              borderWidth,
              borderColor,
              fillColor
            );
          });
          
          triangleStartRef.current = null;
        }
      }
      return;
    }

    // Después del bloque if (tool === TOOLS.square), agregar:
if (tool === TOOLS.circle) {
  if (isPressed) {
    if (!circleStartRef.current) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      circleStartRef.current = canvasCoords;
    }
  } else {
    if (circleStartRef.current) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const endCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
      drawOnLayer(activeLayerId, (ctx) => {
        ctx.globalCompositeOperation = 'source-over';
        
        const deltaX = endCoords.x - circleStartRef.current.x;
        const deltaY = endCoords.y - circleStartRef.current.y;
        const radius = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));
        
        // Obtener colores y configuración de los parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color;
        const borderWidth = toolParameters.borderWidth || 0;
        
        drawCircle(
          ctx,
          circleStartRef.current.x,
          circleStartRef.current.y,
          radius,
          borderWidth,
          borderColor,
          fillColor
        );
      });
      
      circleStartRef.current = null;
    }
  }
  return;
}
if (tool === TOOLS.ellipse) {
  if (isPressed) {
    if (!ellipseStartRef.current) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      ellipseStartRef.current = canvasCoords;
    }
  } else {
    if (ellipseStartRef.current) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const endCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
      drawOnLayer(activeLayerId, (ctx) => {
        ctx.globalCompositeOperation = 'source-over';
        
        // Obtener colores y configuración de los parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color;
        const borderWidth = toolParameters.borderWidth || 0;
        
        drawEllipse(
          ctx,
          ellipseStartRef.current.x,
          ellipseStartRef.current.y,
          endCoords.x,
          endCoords.y,
          borderWidth,
          borderColor,
          fillColor
        );
      });
      
      ellipseStartRef.current = null;
    }
  }
  return;
}

if (tool === TOOLS.polygon) {
  if (isPressed) {
    if (!polygonStartRef.current) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      polygonStartRef.current = canvasCoords;
    }
  } else {
    if (polygonStartRef.current) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const endCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
      drawOnLayer(activeLayerId, (ctx) => {
        ctx.globalCompositeOperation = 'source-over';
        
        // Calcular centro y radio
        const centerX = polygonStartRef.current.x;
        const centerY = polygonStartRef.current.y;
        const dx = endCoords.x - centerX;
        const dy = endCoords.y - centerY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        
        // Obtener parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color;
        const borderWidth = toolParameters.borderWidth || 0;
        const vertices = toolParameters.vertices || 6; // Default hexágono
        const rotation = (toolParameters.rotation || 0) * Math.PI / 180; // Convertir a radianes
        
        drawPolygon(
          ctx,
          centerX,
          centerY,
          radius,
          vertices,
          borderWidth,
          borderColor,
          fillColor,
          rotation
        );
      });
      
      polygonStartRef.current = null;
    }
  }
  return;
}
  
    if (!isPressed || !activeLayerId || drawMode === "move") {
      lastPixelRef.current = null;
      return;
    }
  
    const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
    const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
  
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
  
    if (tool === TOOLS.paint) {
      drawOnLayer(activeLayerId, (ctx) => {
        const canvas = ctx.canvas;
        const width = toolParameters?.width;
        const offset = Math.floor(width / 2);
        const blur = 0.5 || 0; // Parámetro blur de 0 a 1
        const paintMode = toolParameters?.paintMode || 'manual'; // 'manual' o 'composite'
        
        const hasBounds = mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);
        
        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);
        
        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);
        
        const adjustment = -1;
        const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
        
        const reflectHorizontal = (x) => centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) => centerY * 2 - y + adjustment + imparAdjustmentHeight;
        
        if (paintMode === 'composite') {
          // Modo usando globalCompositeOperation
          const originalComposite = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = 'source-over';
          
          // Configurar el estilo del pincel
          ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, ${toolParameters.fillColor.a})`;
          
          // Función para calcular la opacidad basada en la distancia al centro (para gradiente)
          const calculateAlpha = (dx, dy) => {
            if (blur === 0) {
              return toolParameters.fillColor.a;
            }
            
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = offset;
            const blurStartDistance = blur * maxDistance;
            
            if (distance <= blurStartDistance) {
              return toolParameters.fillColor.a;
            } else {
              const blurDistance = distance - blurStartDistance;
              const remainingDistance = maxDistance - blurStartDistance;
              
              if (remainingDistance <= 0) {
                return toolParameters.fillColor.a;
              }
              
              const blurRatio = blurDistance / remainingDistance;
              const minAlpha = 0.1;
              const alphaReduction = (1 - minAlpha) * blurRatio;
              
              return Math.max(minAlpha, toolParameters.fillColor.a * (1 - alphaReduction));
            }
          };
          
          const drawDot = (x, y) => {
            if (blur === 0) {
              // Sin blur, dibujar círculo sólido
              ctx.beginPath();
              ctx.arc(x, y, offset, 0, 2 * Math.PI);
              ctx.fill();
            } else {
              // Con blur, crear gradiente radial
              const gradient = ctx.createRadialGradient(x, y, 0, x, y, offset);
              const centerAlpha = toolParameters.fillColor.a;
              const edgeAlpha = calculateAlpha(offset, 0);
              
              gradient.addColorStop(0, `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, ${centerAlpha})`);
              gradient.addColorStop(blur, `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, ${centerAlpha})`);
              gradient.addColorStop(1, `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, ${edgeAlpha})`);
              
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(x, y, offset, 0, 2 * Math.PI);
              ctx.fill();
              
              // Restaurar el color original para próximas iteraciones
              ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, ${toolParameters.fillColor.a})`;
            }
          };
          
          const drawWithMirrors = (x, y) => {
            drawDot(x, y); // Original
            
            if (mirrorState.vertical) {
              drawDot(x, reflectVertical(y));
            }
            if (mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), y);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), reflectVertical(y));
            }
          };
          
          if (!lastPixelRef.current) {
            drawWithMirrors(canvasCoords.x, canvasCoords.y);
          } else {
            const last = viewportToCanvasCoords(lastPixelRef.current.x, lastPixelRef.current.y);
            let x0 = last.x, y0 = last.y;
            let x1 = canvasCoords.x, y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1;
            let sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let x = x0, y = y0;
            
            while (true) {
              drawWithMirrors(x, y);
              if (x === x1 && y === y1) break;
              const e2 = 2 * err;
              if (e2 >= dy) { err += dy; x += sx; }
              if (e2 <= dx) { err += dx; y += sy; }
            }
          }
          
          // Restaurar el composite operation original
          ctx.globalCompositeOperation = originalComposite;
          
        } else {
          // Modo manual (original) - manipulación directa de imageData
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Función para calcular la opacidad basada en la distancia al centro
          const calculateAlpha = (dx, dy) => {
            if (blur === 0) {
              return toolParameters.fillColor.a;
            }
            
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = offset;
            const blurStartDistance = blur * maxDistance;
            
            if (distance <= blurStartDistance) {
              return toolParameters.fillColor.a;
            } else {
              const blurDistance = distance - blurStartDistance;
              const remainingDistance = maxDistance - blurStartDistance;
              
              if (remainingDistance <= 0) {
                return toolParameters.fillColor.a;
              }
              
              const blurRatio = blurDistance / remainingDistance;
              const minAlpha = 0.1;
              const alphaReduction = (1 - minAlpha) * blurRatio;
              
              return Math.max(minAlpha, toolParameters.fillColor.a * (1 - alphaReduction));
            }
          };
          
          const drawDot = (x, y) => {
            for (let dy = 0; dy < width; dy++) {
              for (let dx = 0; dx < width; dx++) {
                const px = x + dx - offset;
                const py = y + dy - offset;
                
                if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;
                
                const relativeX = dx - offset;
                const relativeY = dy - offset;
                const alpha = calculateAlpha(relativeX, relativeY);
                
                const index = (py * canvas.width + px) * 4;
                data[index] = toolParameters.fillColor.r;
                data[index + 1] = toolParameters.fillColor.g;
                data[index + 2] = toolParameters.fillColor.b;
                data[index + 3] = alpha * 255;
              }
            }
          };
          
          const drawWithMirrors = (x, y) => {
            drawDot(x, y); // Original
            
            if (mirrorState.vertical) {
              drawDot(x, reflectVertical(y));
            }
            if (mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), y);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), reflectVertical(y));
            }
          };
          
          if (!lastPixelRef.current) {
            drawWithMirrors(canvasCoords.x, canvasCoords.y);
          } else {
            const last = viewportToCanvasCoords(lastPixelRef.current.x, lastPixelRef.current.y);
            let x0 = last.x, y0 = last.y;
            let x1 = canvasCoords.x, y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1;
            let sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let x = x0, y = y0;
            
            while (true) {
              drawWithMirrors(x, y);
              if (x === x1 && y === y1) break;
              const e2 = 2 * err;
              if (e2 >= dy) { err += dy; x += sx; }
              if (e2 <= dx) { err += dx; y += sy; }
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
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
  }, [isPressed, relativeToTarget, activeLayerId, drawOnLayer, viewportToCanvasCoords, drawMode, tool, toolParameters, zoom, color, curveState,mirrorState]);

  // Efecto para manejar navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      const step = 1;
      
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
        case 'd':
          setDrawMode("draw");
          break;
        case 'e':
          setDrawMode("erase");
          break;
        case 'm':
          setDrawMode("move");
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveViewport]);

  // Efecto para manejar el canvas de preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (relativeToTarget.x  && relativeToTarget.y ) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
      if (tool === TOOLS.curve) {
        ctx.save();
        
        // Calcular centro basado en bounds (igual que en paint)
        const hasBounds = mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);
      
        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);
      
        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);
      
        // Ajustes para dimensiones impares (igual que en paint)
        const adjustment = -1;
        const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
      
        const reflectHorizontal = (x) => centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) => centerY * 2 - y + adjustment + imparAdjustmentHeight;
        
        if (curveState === 'first-point' && curveStartRef.current) {
          const drawPointPreview = (point) => {
            const screenX = (point.x - viewportOffset.x) * zoom;
            const screenY = (point.y - viewportOffset.y) * zoom;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          };
      
          const drawPreviewLine = (x0, y0, x1, y1) => {
            const dx = Math.abs(x1 - x0);
            const dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let x = x0, y = y0;
            
            const offset = Math.floor(toolParameters.width / 2);
            
            while (true) {
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
      
          // Punto de inicio original
          ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.7)`;
          drawPointPreview(curveStartRef.current);
      
          // Puntos de inicio reflejados
          if (mirrorState.vertical) {
            drawPointPreview({ x: curveStartRef.current.x, y: reflectVertical(curveStartRef.current.y) });
          }
          if (mirrorState.horizontal) {
            drawPointPreview({ x: reflectHorizontal(curveStartRef.current.x), y: curveStartRef.current.y });
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPointPreview({ x: reflectHorizontal(curveStartRef.current.x), y: reflectVertical(curveStartRef.current.y) });
          }
          
          ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.7)`;
          
          // Línea original
          drawPreviewLine(curveStartRef.current.x, curveStartRef.current.y, canvasCoords.x, canvasCoords.y);
          
          // Líneas reflejadas
          if (mirrorState.vertical) {
            drawPreviewLine(
              curveStartRef.current.x, 
              reflectVertical(curveStartRef.current.y), 
              canvasCoords.x, 
              reflectVertical(canvasCoords.y)
            );
          }
          if (mirrorState.horizontal) {
            drawPreviewLine(
              reflectHorizontal(curveStartRef.current.x), 
              curveStartRef.current.y, 
              reflectHorizontal(canvasCoords.x), 
              canvasCoords.y
            );
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPreviewLine(
              reflectHorizontal(curveStartRef.current.x), 
              reflectVertical(curveStartRef.current.y), 
              reflectHorizontal(canvasCoords.x), 
              reflectVertical(canvasCoords.y)
            );
          }
          
        } else if (curveState === 'setting-control' && curveStartRef.current && curveEndRef.current) {
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
            
            const drawPreviewPixelLine = (x0, y0, x1, y1) => {
              const dx = Math.abs(x1 - x0);
              const dy = -Math.abs(y1 - y0);
              const sx = x0 < x1 ? 1 : -1;
              const sy = y0 < y1 ? 1 : -1;
              let err = dx + dy;
              let x = x0, y = y0;
              
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
                
                if (x === x1 && y === y1) break;
                const e2 = 2 * err;
                if (e2 >= dy) { err += dy; x += sx; }
                if (e2 <= dx) { err += dx; y += sy; }
              }
            };
            
            for (let i = 0; i < points.length - 1; i++) {
              const current = points[i];
              const next = points[i + 1];
              
              if (current.x !== next.x || current.y !== next.y) {
                drawPreviewPixelLine(current.x, current.y, next.x, next.y);
              }
            }
            
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
      
          const drawPointPreview = (point, fillStyle) => {
            const screenX = (point.x - viewportOffset.x) * zoom;
            const screenY = (point.y - viewportOffset.y) * zoom;
            ctx.fillStyle = fillStyle;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          };
      
          const drawPreviewLine = (x0, y0, x1, y1) => {
            const dx = Math.abs(x1 - x0);
            const dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let x = x0, y = y0;
            
            const offset = Math.floor(toolParameters.width / 2);
            
            while (true) {
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
          
          ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.7)`;
          
          // Curva original
          drawPreviewCurve(curveStartRef.current, curveEndRef.current, canvasCoords, toolParameters.width);
          
          // Curvas reflejadas
          if (mirrorState.vertical) {
            drawPreviewCurve(
              { x: curveStartRef.current.x, y: reflectVertical(curveStartRef.current.y) },
              { x: curveEndRef.current.x, y: reflectVertical(curveEndRef.current.y) },
              { x: canvasCoords.x, y: reflectVertical(canvasCoords.y) },
              toolParameters.width
            );
          }
          if (mirrorState.horizontal) {
            drawPreviewCurve(
              { x: reflectHorizontal(curveStartRef.current.x), y: curveStartRef.current.y },
              { x: reflectHorizontal(curveEndRef.current.x), y: curveEndRef.current.y },
              { x: reflectHorizontal(canvasCoords.x), y: canvasCoords.y },
              toolParameters.width
            );
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPreviewCurve(
              { x: reflectHorizontal(curveStartRef.current.x), y: reflectVertical(curveStartRef.current.y) },
              { x: reflectHorizontal(curveEndRef.current.x), y: reflectVertical(curveEndRef.current.y) },
              { x: reflectHorizontal(canvasCoords.x), y: reflectVertical(canvasCoords.y) },
              toolParameters.width
            );
          }
          
          // Líneas de guía originales
          ctx.fillStyle = 'rgba(234, 0, 255, 0.2)';
          drawPreviewLine(curveStartRef.current.x, curveStartRef.current.y, canvasCoords.x, canvasCoords.y);
          drawPreviewLine(curveEndRef.current.x, curveEndRef.current.y, canvasCoords.x, canvasCoords.y);
          
          // Líneas de guía reflejadas
          if (mirrorState.vertical) {
            drawPreviewLine(
              curveStartRef.current.x, reflectVertical(curveStartRef.current.y), 
              canvasCoords.x, reflectVertical(canvasCoords.y)
            );
            drawPreviewLine(
              curveEndRef.current.x, reflectVertical(curveEndRef.current.y), 
              canvasCoords.x, reflectVertical(canvasCoords.y)
            );
          }
          if (mirrorState.horizontal) {
            drawPreviewLine(
              reflectHorizontal(curveStartRef.current.x), curveStartRef.current.y, 
              reflectHorizontal(canvasCoords.x), canvasCoords.y
            );
            drawPreviewLine(
              reflectHorizontal(curveEndRef.current.x), curveEndRef.current.y, 
              reflectHorizontal(canvasCoords.x), canvasCoords.y
            );
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPreviewLine(
              reflectHorizontal(curveStartRef.current.x), reflectVertical(curveStartRef.current.y), 
              reflectHorizontal(canvasCoords.x), reflectVertical(canvasCoords.y)
            );
            drawPreviewLine(
              reflectHorizontal(curveEndRef.current.x), reflectVertical(curveEndRef.current.y), 
              reflectHorizontal(canvasCoords.x), reflectVertical(canvasCoords.y)
            );
          }
          
          // Puntos de control originales
          drawPointPreview(canvasCoords, 'rgba(0, 150, 255, 0.8)');
          drawPointPreview(curveStartRef.current, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
          drawPointPreview(curveEndRef.current, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
          
          // Puntos de control reflejados
          if (mirrorState.vertical) {
            drawPointPreview({ x: canvasCoords.x, y: reflectVertical(canvasCoords.y) }, 'rgba(0, 150, 255, 0.8)');
            drawPointPreview({ x: curveStartRef.current.x, y: reflectVertical(curveStartRef.current.y) }, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
            drawPointPreview({ x: curveEndRef.current.x, y: reflectVertical(curveEndRef.current.y) }, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
          }
          if (mirrorState.horizontal) {
            drawPointPreview({ x: reflectHorizontal(canvasCoords.x), y: canvasCoords.y }, 'rgba(0, 150, 255, 0.8)');
            drawPointPreview({ x: reflectHorizontal(curveStartRef.current.x), y: curveStartRef.current.y }, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
            drawPointPreview({ x: reflectHorizontal(curveEndRef.current.x), y: curveEndRef.current.y }, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPointPreview({ x: reflectHorizontal(canvasCoords.x), y: reflectVertical(canvasCoords.y) }, 'rgba(0, 150, 255, 0.8)');
            drawPointPreview({ x: reflectHorizontal(curveStartRef.current.x), y: reflectVertical(curveStartRef.current.y) }, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
            drawPointPreview({ x: reflectHorizontal(curveEndRef.current.x), y: reflectVertical(curveEndRef.current.y) }, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
          }
        }
        
        ctx.restore();
      }
      else if (tool === TOOLS.paint) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(
          ${toolParameters.fillColor.r},
          ${toolParameters.fillColor.g},
          ${toolParameters.fillColor.b},
          ${0.7}
        )`;
      } else if (tool === TOOLS.erase) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      } else if (tool === TOOLS.line && isPressed && lineStartRef.current) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, ${1})`;
      
        const offset = Math.floor(toolParameters.width / 2);
      
        // Calcular centro basado en bounds (igual que en paint)
        const hasBounds = mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);
      
        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);
      
        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);
      
        // Ajustes para dimensiones impares (igual que en paint)
        const adjustment = -1;
        const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
      
        const reflectHorizontal = (x) => centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) => centerY * 2 - y + adjustment + imparAdjustmentHeight;
      
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
      
          while (true) {
            const drawDotAt = (px, py) => {
              const x = px - offset;
              const y = py - offset;
      
              const screenX = (x - viewportOffset.x) * zoom;
              const screenY = (y - viewportOffset.y) * zoom;
      
              ctx.fillRect(
                screenX,
                screenY,
                toolParameters.width * zoom,
                toolParameters.width * zoom
              );
            };
      
            // Punto original
            drawDotAt(x0, y0);
      
            // Espejo vertical (refleja Y)
            if (mirrorState.vertical) {
              drawDotAt(x0, reflectVertical(y0));
            }
      
            // Espejo horizontal (refleja X)
            if (mirrorState.horizontal) {
              drawDotAt(reflectHorizontal(x0), y0);
            }
      
            // Espejo diagonal (ambos ejes)
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDotAt(reflectHorizontal(x0), reflectVertical(y0));
            }
      
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        };
      
        drawPreviewLine(lineStartRef.current, currentCanvasCoords);
      }
      

      else if (tool === TOOLS.square && isPressed && squareStartRef.current) {
    
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
        ctx.globalCompositeOperation = 'source-over';
        
        // Obtener colores y configuración de los parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color; // Usar color principal como fallback
        const borderWidth = toolParameters.borderWidth || 0;
        const borderRadius = toolParameters.borderRadius || 0;
        
        drawPreviewRect(
          ctx,
          squareStartRef.current,
          currentCanvasCoords,
          borderRadius,
          borderWidth,
          borderColor,
          fillColor
        );
      }

      else if (tool === TOOLS.triangle && isPressed && triangleStartRef.current) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
      
        ctx.globalCompositeOperation = 'source-over';
        
        // Obtener colores y configuración de los parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color; // Usar color principal como fallback
        const borderWidth = toolParameters.borderWidth || 0;
        
        drawPreviewTriangle(
          ctx,
          triangleStartRef.current,
          currentCanvasCoords,
          borderWidth,
          borderColor,
          fillColor
        );
      }

      // Después del bloque else if (tool === TOOLS.square && isPressed && squareStartRef.current), agregar:
else if (tool === TOOLS.circle && isPressed && circleStartRef.current) {
  const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
  const currentCanvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);

  ctx.globalCompositeOperation = 'source-over';
  
  // Obtener colores y configuración de los parámetros de la herramienta
  const borderColor = toolParameters.borderColor || null;
  const fillColor = toolParameters.fillColor || color;
  const borderWidth = toolParameters.borderWidth || 0;
  
  drawPreviewCircle(
    ctx,
    circleStartRef.current,
    currentCanvasCoords,
    borderWidth,
    borderColor,
    fillColor
  );
}
else if (tool === TOOLS.ellipse && isPressed && ellipseStartRef.current) {
  const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
  const currentCanvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);

  ctx.globalCompositeOperation = 'source-over';
  
  // Obtener colores y configuración de los parámetros de la herramienta
  const borderColor = toolParameters.borderColor || null;
  const fillColor = toolParameters.fillColor || color;
  const borderWidth = toolParameters.borderWidth || 0;
  
  drawPreviewEllipse(
    ctx,
    ellipseStartRef.current,
    currentCanvasCoords,
    borderWidth,
    borderColor,
    fillColor
  );
}
else if (tool === TOOLS.polygon && isPressed && polygonStartRef.current) {
  const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
  const currentCanvasCoords = viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);

  ctx.globalCompositeOperation = 'source-over';
  
  // Calcular centro y radio
  const centerX = polygonStartRef.current.x;
  const centerY = polygonStartRef.current.y;
  const dx = currentCanvasCoords.x - centerX;
  const dy = currentCanvasCoords.y - centerY;
  const radius = Math.sqrt(dx * dx + dy * dy);
  
  // Obtener parámetros de la herramienta
  const borderColor = toolParameters.borderColor || null;
  const fillColor = toolParameters.fillColor || color;
  const borderWidth = toolParameters.borderWidth || 0;
  const vertices = toolParameters.vertices || 6; // Default hexágono
  const rotation = (toolParameters.rotation || 0) * Math.PI / 180; // Convertir a radianes
  
  drawPreviewPolygon(
    ctx,
    centerX,
    centerY,
    radius,
    vertices,
    borderWidth,
    borderColor,
    fillColor,
    rotation
  );
}
      
      else if (tool === TOOLS.move || tool === TOOLS.select || tool === TOOLS.lassoSelect) {
        return;
      }
      
      const width = toolParameters?.width || 1;
      const offset = Math.floor(width / 2);
      
      // Verificar si los bounds están definidos y son válidos
      const hasBounds = mirrorState.bounds && 
        (mirrorState.bounds.x2 > mirrorState.bounds.x1 || 
         mirrorState.bounds.y2 > mirrorState.bounds.y1);
      
      // Calcular centros: usar bounds si están disponibles, sino usar totalWidth/totalHeight
      const centerX = hasBounds 
        ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
        : Math.floor(totalWidth / 2);
        
      const centerY = hasBounds 
        ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
        : Math.floor(totalHeight / 2);
      
      // Ajuste de -1 solo cuando hay bounds válidos
      const adjustment = -1;

     //Ajuste para numeros impares, sumar 1, ya que el centro al dividirse desfasa el reflejo 
      const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
      
      // Función para reflejar coordenadas
      const reflectHorizontal = (x) => centerX * 2 - x + adjustment + imparAdjustmentWidth;
      const reflectVertical = (y) => centerY * 2 - y + adjustment + imparAdjustmentHeight;
  
      
      const drawPreviewAt = (canvasX, canvasY) => {
        const x = canvasX - offset;
        const y = canvasY - offset;
        const screenX = (x - viewportOffset.x) * zoom;
        const screenY = (y - viewportOffset.y) * zoom;
        ctx.fillRect(screenX, screenY, width * zoom, width * zoom);
      };
      
      // Punto original
      drawPreviewAt(canvasCoords.x, canvasCoords.y);
      
      // Espejos
      if (mirrorState.vertical) {
        drawPreviewAt(canvasCoords.x, reflectVertical(canvasCoords.y));
      }
      if (mirrorState.horizontal) {
        drawPreviewAt(reflectHorizontal(canvasCoords.x), canvasCoords.y);
      }
      if (mirrorState.vertical && mirrorState.horizontal) {
        drawPreviewAt(
          reflectHorizontal(canvasCoords.x),
          reflectVertical(canvasCoords.y)
        );
      }
      
      
    }
  }, [tool, relativeToTarget, toolParameters, zoom, viewportToCanvasCoords, viewportOffset, curveState, color,mirrorState]);

  // Efecto para manejar zoom con rueda del ratón
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
      const zoomFactor = 1.2;
      const newZoomRaw = zoom * Math.pow(zoomFactor, zoomDirection);
  
      const newZoom = Math.max(1, Math.min(50, 
        newZoomRaw < 10 
          ? Math.round(newZoomRaw * 10) / 10  // 1 decimal para zoom < 10
          : Math.round(newZoomRaw)            // enteros para zoom >= 10
      ));
  
      if (newZoom === zoom) return;
  
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
  
  // Efecto para resetear estados de herramientas
  useEffect(() => {
    if (tool !== TOOLS.curve) {
      setCurveState('idle');
      setIsSettingControl(false);
      curveStartRef.current = null;
      curveEndRef.current = null;
      curveControlRef.current = null;
      setClickStartTime(null);
    }
    
    if (tool !== TOOLS.square) {
      squareStartRef.current = null;
    }
    if (tool !== TOOLS.triangle) {
      triangleStartRef.current = null;
    }
    // En el useEffect para resetear estado, agregar:
if (tool !== TOOLS.circle) {
  circleStartRef.current = null;
}
if (tool !== TOOLS.circle) {
  circleStartRef.current = null;
}
if (tool !== TOOLS.polygon) {
  polygonStartRef.current = null;
}
  }, [tool]);

  // Función para manejar cambio de zoom
  const handleZoomChange = (e) => {
    const newZoom = parseInt(e.target.value, 10);
    if (isNaN(newZoom) || newZoom <= 0) return;
    
    const currentCenterX = viewportOffset.x + (viewportWidth / 2);
    const currentCenterY = viewportOffset.y + (viewportHeight / 2);
    
    const newViewportWidth = Math.min(totalWidth, Math.floor(workspaceWidth / newZoom));
    const newViewportHeight = Math.min(totalHeight, Math.floor(workspaceHeight / newZoom));
    
    const newOffsetX = Math.max(0, Math.min(
      totalWidth - newViewportWidth,
      Math.round(currentCenterX - (newViewportWidth / 2))
    ));
    const newOffsetY = Math.max(0, Math.min(
      totalHeight - newViewportHeight,
      Math.round(currentCenterY - (newViewportHeight / 2))
    ));
    
    const deltaX = newOffsetX - viewportOffset.x;
    const deltaY = newOffsetY - viewportOffset.y;
    
    setZoom(newZoom);
    setViewportWidth(newViewportWidth);
    setViewportHeight(newViewportHeight);
    
    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
      moveViewport(deltaX, deltaY);
    }
  };


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

const findNonEmptyBounds = useCallback((imageData, width, height) => {
  const data = imageData.data;

  let top = 0, bottom = height - 1;
  let left = 0, right = width - 1;

  let found = false;

  // Buscar el primer top con alpha > 0
  for (; top < height; top++) {
    for (let x = 0; x < width; x++) {
      if (data[(top * width + x) * 4 + 3] > 0) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // Buscar el primer bottom con alpha > 0
  found = false;
  for (; bottom >= top; bottom--) {
    for (let x = 0; x < width; x++) {
      if (data[(bottom * width + x) * 4 + 3] > 0) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // Buscar el primer left con alpha > 0
  found = false;
  for (; left < width; left++) {
    for (let y = top; y <= bottom; y++) {
      if (data[(y * width + left) * 4 + 3] > 0) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // Buscar el primer right con alpha > 0
  found = false;
  for (; right >= left; right--) {
    for (let y = top; y <= bottom; y++) {
      if (data[(y * width + right) * 4 + 3] > 0) {
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (left > right || top > bottom) return null; // No se encontró ningún pixel visible

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1
  };
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
  setSelectionCoords([])
  setSelectedPixels([]);
  setOriginalPixelColors([]);
  
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
  console.log("autoCropSelection - selectionCoords:", selectionCoords);

  // Calcular los bounds de TODOS los puntos de selección
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  selectionCoords.forEach(coord => {
    minX = Math.min(minX, coord.x);
    minY = Math.min(minY, coord.y);
    maxX = Math.max(maxX, coord.x);
    maxY = Math.max(maxY, coord.y);
  });

  const x = minX;
  const y = minY;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const totalPixels = width * height;

  console.log(`Calculated bounds: x=${x}, y=${y}, width=${width}, height=${height}, totalPixels=${totalPixels}`);

  // Si el área es muy grande, usar estrategia optimizada
  if (totalPixels > 1000000) { // 1 millón de píxeles
    console.log("Área muy grande, usando estrategia optimizada");
    
    // Usar directamente las coordenadas de selección para calcular bounds
    const croppedBounds = {
      x: minX,
      y: minY,
      width: width,
      height: height,
    };
    
    setCroppedSelectionBounds(croppedBounds);
    setSelectionCoords([]);
    return;
  }

  try {
    const imageData = await getLayerData(activeLayerId, x, y, width, height);
    if (!imageData) {
      console.log("No se pudo obtener imageData");
      return;
    }

    // Timeout dinámico basado en el tamaño
    const timeoutMs = Math.min(30000, Math.max(5000, totalPixels / 50000));
    console.log(`Using timeout: ${timeoutMs}ms for ${totalPixels} pixels`);

    const bounds = await new Promise((resolve, reject) => {
      const worker = new BoundsWorker();
      
      const timeout = setTimeout(() => {
        console.log("Worker timeout reached");
        worker.terminate();
        reject(new Error("Worker timeout"));
      }, timeoutMs);
      
      worker.onmessage = (e) => {
        clearTimeout(timeout);
        console.log("Worker completed successfully", e.data);
        resolve(e.data);
        worker.terminate();
      };
      
      worker.onerror = (error) => {
        clearTimeout(timeout);
        console.error("Worker error:", error);
        worker.terminate();
        reject(error);
      };
      
      // Verificar que el buffer sea válido
      if (!imageData.data || !imageData.data.buffer) {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error("Invalid imageData buffer"));
        return;
      }
      
      // Transferir el buffer
      worker.postMessage(
        { width, height, buffer: imageData.data.buffer },
        [imageData.data.buffer]
      );
    });
    
    if (bounds) {
      const croppedBounds = {
        x: x + bounds.x,
        y: y + bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
      setCroppedSelectionBounds(croppedBounds);

      // Verificar si algún pixel del área recortada pertenece a un grupo
      let groupFound = false;
      let groupData = null;

      for (let py = croppedBounds.y; py < croppedBounds.y + croppedBounds.height; py++) {
        for (let px = croppedBounds.x; px < croppedBounds.x + croppedBounds.width; px++) {
          const groupInfo = getPixelGroupAt(px, py, activeLayerId);
          if (groupInfo) {
            groupFound = true;
            groupData = groupInfo;
            break;
          }
        }
        if (groupFound) break;
      }

      if (groupFound) {
        console.log(`Pixel con grupo encontrado: ${JSON.stringify(groupData, null, 2)}`);
      } else {
        console.log("Ningún pixel dentro del área recortada pertenece a un grupo");
      }

      setSelectionCoords([]);
    } else {
      console.log("Worker returned null bounds, using original bounds");
      setCroppedSelectionBounds({ x, y, width, height });
      setSelectionCoords([]);
    }
    
  } catch (error) {
    console.error("Error in autoCropSelection:", error);
    
    // Fallback: usar los bounds originales si el worker falla
    console.log("Using fallback bounds due to error");
    setCroppedSelectionBounds({ x, y, width, height });
    setSelectionCoords([]);
  }
}, [activeLayerId, selectionCoords, getLayerData]);

const autoCropLasso = useCallback(async () => {
  if (!activeLayerId || !lassoPoints || lassoPoints.length < 1) return;
  console.log("autoCropLasso - lassoPoints length:", lassoPoints.length);

  // Calcular bounding box de manera más eficiente
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  lassoPoints.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  const x = minX;
  const y = minY;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const totalPixels = width * height;

  console.log(`Lasso bounds: x=${x}, y=${y}, width=${width}, height=${height}, totalPixels=${totalPixels}`);

  // Si el área es muy grande, usar estrategia optimizada
  if (totalPixels > 1000000) { // 1 millón de píxeles
    console.log("Área de lasso muy grande, usando estrategia optimizada");
    
    // Usar directamente el bounding box del lasso
    const croppedBounds = {
      x: x,
      y: y,
      width: width,
      height: height,
    };
    
    setCroppedSelectionBounds(croppedBounds);
    return;
  }

  try {
    // Obtener datos de imagen en el bounding box
    const imageData = await getLayerData(activeLayerId, x, y, width, height);
    if (!imageData) {
      console.log("No se pudo obtener imageData para lasso");
      return;
    }

    // Timeout dinámico basado en el tamaño
    const timeoutMs = Math.min(30000, Math.max(5000, totalPixels / 50000));
    console.log(`Using timeout for lasso: ${timeoutMs}ms for ${totalPixels} pixels`);

    // Usar el worker optimizado para buscar bounds
    const bounds = await new Promise((resolve, reject) => {
      const worker = new BoundsWorker();
      
      const timeout = setTimeout(() => {
        console.log("Lasso worker timeout reached");
        worker.terminate();
        reject(new Error("Lasso worker timeout"));
      }, timeoutMs);
      
      worker.onmessage = (e) => {
        clearTimeout(timeout);
        console.log("Lasso worker completed successfully", e.data);
        resolve(e.data);
        worker.terminate();
      };
      
      worker.onerror = (error) => {
        clearTimeout(timeout);
        console.error("Lasso worker error:", error);
        worker.terminate();
        reject(error);
      };
      
      // Verificar que el buffer sea válido
      if (!imageData.data || !imageData.data.buffer) {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error("Invalid lasso imageData buffer"));
        return;
      }
      
      // Transferir el buffer
      worker.postMessage(
        { width, height, buffer: imageData.data.buffer },
        [imageData.data.buffer]
      );
    });

    if (bounds) {
      const croppedBounds = {
        x: x + bounds.x,
        y: y + bounds.y,
        width: bounds.width,
        height: bounds.height
      };
      
      console.log("Lasso cropped bounds:", croppedBounds);
      setCroppedSelectionBounds(croppedBounds);
    } else {
      console.log("Lasso worker returned null bounds, using original bounds");
      setCroppedSelectionBounds({ x, y, width, height });
    }
    
  } catch (error) {
    console.error("Error in autoCropLasso:", error);
    
    // Fallback: usar el bounding box original si el worker falla
    console.log("Using fallback lasso bounds due to error");
    setCroppedSelectionBounds({ x, y, width, height });
  }
}, [activeLayerId, lassoPoints, getLayerData]);

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
  if(selectedPixels<=0){
  setSelectionCoords([]);
  }
 
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
  if (!selectedPixels?.length) {
    alert('Selecciona píxeles primero');
    return;
  }

  const groupName = `Grupo ${getLayerGroups(activeLayerId).length + 1}`;

   // Aplicar el desplazamiento actual a las coordenadas de los píxeles
   const pixelsWithOffset = selectedPixels.map(pixel => ({
    ...pixel,
    x: pixel.x + dragOffset.x,
    y: pixel.y + dragOffset.y
  }));
  


  // Creamos el grupo y obtenemos su ID
  const newGroupId = createPixelGroup(activeLayerId, pixelsWithOffset, groupName);

  // Seleccionamos el grupo recién creado
  if (newGroupId) {
    selectPixelGroup(activeLayerId, newGroupId);
  }
  console.log(newGroupId);

  setActiveLayerId(newGroupId.groupLayerId);
  
  // Limpiamos
 /*
  setShowCreateGroup(null);
  setExpandedLayers(prev => ({ ...prev, [activeLayerId]: true }));
  setNewGroupName('');*/

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

/////////////FUncion de prueba para seleccion de canvas//////////////////////////////////////////////////
// Función para seleccionar todo el contenido de una capa
// Función para seleccionar todo el contenido de una capa
const selectAllCanvas = useCallback(async (canvasWidth = totalWidth, canvasHeight = totalHeight) => {

   setTool(TOOLS.select);
   
  // Verificar que la capa existe

  try {
    // 1. Limpiar selección anterior si existe
    if (selectionActive || selectedPixels.length > 0) {
      clearCurrentSelection();
    }

    // 2. Simular el comportamiento de una selección rectangular completa
    // Definir las coordenadas desde (0,0) hasta (canvasWidth-1, canvasHeight-1)
    const startCoord = { x: 0, y: 0 };
    const endCoord = { x: canvasWidth - 1, y: canvasHeight - 1 };
    
    // 3. Establecer las coordenadas de selección (necesita ambos puntos para autoCropSelection)
    setSelectionCoords([startCoord, endCoord]);
    
    // 4. Establecer que la selección está activa temporalmente
    // Esto permitirá que el useEffect de autoCropSelection se ejecute
    setSelectionActive(true);
    
    console.log(`Iniciando selección completa en capa ${activeLayerId} (${canvasWidth}x${canvasHeight})`);
    console.log("Coordenadas establecidas:", [startCoord, endCoord]);
    
    // La función autoCropSelection se ejecutará automáticamente por el useEffect
    // cuando detecte que selectionCoords tiene valores y selectionActive es true
    
  } catch (error) {
    console.error("Error al seleccionar todo el canvas:", error);
    // Limpiar estados en caso de error
    setSelectionActive(false);
    setCroppedSelectionBounds(null);
    setSelectedPixels([]);
    setOriginalPixelColors([]);
    setSelectionCoords([]);
  }
}, [
totalHeight,
totalWidth,
  layers,
  activeLayerId,
  selectionActive,
  selectedPixels,
  clearCurrentSelection,
  setSelectionCoords,
  setSelectionActive,
  setCroppedSelectionBounds,
  setSelectedPixels,
  setOriginalPixelColors
]);


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
            
          {
            <button 
              className={drawMode === "move" ? "tool-btn active" : "tool-btn"}
              onClick={() => selectAllCanvas()}
              style={{ 
                padding: '6px', 
                borderRadius: '4px', 
                background: drawMode === "move" ? '#cce6ff' : '#f0f0f0',
                border: '1px solid #ccc'
              }}
            >
              <LuPointerOff size={16} /> Move (M)
            </button>
            }
            <div 
                      className={activeGrid ? "grid-control active" : "grid-control"}
                      onClick={()=>{setActiveGrid(!activeGrid)}}
                      >
                        <p>Grid</p>
                        <LuGrid2X2 />
                      </div>
                      
          </div>
          
          <ReflexMode mirrorState={mirrorState} setMirrorState={setMirrorState} totalHeight={totalHeight} totalWidth={totalWidth} setTotalHeight={setTotalHeight} setTotalWidth={setTotalWidth} setDrawableHeight={setDrawableHeight} setDrawableWidth={setDrawableWidth} setPositionCorners={setPositionCorners}/>
        
        
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
      <button className='action-button' >
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
   {mirrorState.customArea && !isPressed &&(
    <>
    {/* Punto de arrastre inferior derecho */}
<div 
  ref={rightMirrorCornerRef}
  className='canvas-resize-handle-container' 
  style={{
    position: 'absolute',
    top: (positionCorners.y2-viewportOffset.y) * zoom,
    left: (positionCorners.x2-viewportOffset.x) * zoom,
    zIndex: 10,
    pointerEvents: 'auto'
  }}
>
  <div className='resize-handle-wrapper'>
    <button className='resize-handle resize-handle-se' >
      <span className='resize-handle-icon'>
        <GrBottomCorner />
      </span>
      
    </button>
    
  </div>
</div>
  {/* Punto de arrastre superior izquierdo */}
<div 
  ref={leftMirrorCornerRef}
  
  className='canvas-resize-handle-container' 
  style={{
    position: 'absolute',
    top: (positionCorners.y1-viewportOffset.y) * zoom-30,
    left: (positionCorners.x1-viewportOffset.x) * zoom-30,
    zIndex: 10,
    pointerEvents: 'auto'
  }}
>
  <div className='resize-handle-wrapper'>
    <button className='resize-handle resize-handle-nw' >
      <span className='resize-handle-icon'>
        <GrTopCorner />
      </span>
    </button>
    <p className='area-canvas-size-text'>{mirrorState.bounds.x2-mirrorState.bounds.x1}x{mirrorState.bounds.y2-mirrorState.bounds.y1}</p>
  </div>
</div>


    </>
 
  
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

                <canvas
                ref={mirrorCanvasRef}
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
          dragOffset={dragOffset}
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
   selectionActive={selectionActive}
//Funcion para seleccionar pixeles de grupos y de capas:
selectAllCanvas={selectAllCanvas}

        />
      </div>
      
    </div>
  );
}

export default CanvasTracker;

