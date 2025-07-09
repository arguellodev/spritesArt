import React, { useState, useCallback, useEffect, useRef } from 'react';
import './layerAnimation.css'

import ConfigOnionSkin from './configOnionSkin';
import { CgArrowLongRightC } from "react-icons/cg";
import { BsDashCircleDotted } from "react-icons/bs";
import CustomContextMenu from './customContextMenu';

import { 
  LuEye, 
  LuEyeOff, 
  LuTrash2, 
  LuArrowUp, 
  LuArrowDown, 
  LuX, 
  LuChevronDown, 
  LuChevronRight,
  LuGroup,
  LuSquare,
  LuMousePointer,
  LuGripVertical,
  LuPlay,
  LuPause,
  LuStepForward,
  LuStepBack,
  LuSkipBack,
  LuSkipForward,
  LuPlus,
  LuCopy,
  LuLayers,
  LuSettings,
  LuRotateCcw,
  LuDelete,
  LuTrash,
  LuEraser,
  
} from "react-icons/lu";
import { BiSolidLayerPlus } from "react-icons/bi";
import { curveEps } from 'pixi.js';

const LayerAnimation = ({ 
  layers,
  addLayer,
  deleteLayer,
  moveLayerUp,
  moveLayerDown,
  duplicateLayer,
  toggleLayerVisibility,
  renameLayer,
  clearLayer,
  activeLayerId,
  setActiveLayerId,
  pixelGroups,
  selectedGroup,
  selectedPixels,
  dragOffset,
  createPixelGroup,
  deletePixelGroup,
  getLayerGroups,
  selectPixelGroup,
  clearSelectedGroup,
  renamePixelGroup,
  toggleGroupVisibility,
  setSelectedPixels,
  autoCropSelection,
  handleSelectGroup,
  setSelectionActive,
  setCroppedSelectionBounds,
  setOriginalPixelColors,
  setDragOffset,
  setSelectionCoords,
  setTool,
  clearCurrentSelection,
  getHierarchicalLayers,
  getGroupLayersForParent,
  selectionActive,
  selectAllCanvas,
  // Nuevas funciones para drag and drop
  moveLayerToPosition,
  moveGroupToLayer,
  moveGroupToPosition,

  //ANimacion:
  createFrame,

  frames,
 currentFrame,
  frameCount,

  setActiveFrame,
  deleteFrame,
   duplicateFrame,
   saveCurrentFrameState,
   getFramesInfo,
   renameFrame,
   syncWithCurrentFrame,
   toggleLayerVisibilityInFrame,
   getLayerVisibility,

    //Gestion de onion skin:
  toggleOnionSkin,
  setOnionSkinConfig,
  setOnionSkinFrameConfig,
  getOnionSkinFrameConfig,
  getOnionSkinPresets,
  applyOnionSkinPreset,
  getOnionSkinInfo,
  onionSkinEnabled,
  onionSkinSettings,
  showOnionSkinForLayer,
  clearOnionSkinLayerFilter,

  //tiempo de los frames:
    
  setFrameDuration,
  getFrameDuration,
  getFrameRate,
  setDefaultFrameRate,
  defaultFrameDuration,

  //opacidad de los frames:
  setFrameOpacity,
    getFrameOpacity,

    //nueva forma de organizar la informacion de frames:
    framesResume,
  // estados de animacion:


  onTimeUpdate, 
  onFrameChange, 
  externalCanvasRef, 
  viewportOffset = { x: 0, y: 0 },
  viewportWidth = 64,
  viewportHeight = 64,
  zoom = 1,
  displaySize = 256 ,
  isPlaying,
  setIsPlaying

}) => {

//==============Lógica para enviar ref de animacion =============================//
const internalCanvasRef = useRef(null);
  
// Usar canvas externo si se proporciona, sino usar el interno
const displayCanvasRef = externalCanvasRef || internalCanvasRef;
const animationRef = useRef(null);
const lastTimestampRef = useRef(null);
const frameKeys = useRef([]);
const frameIndexRef = useRef(0);
const lastFrameDrawn = useRef(null);
const startTimeRef = useRef(null);

// Estados del reproductor

const [currentTime, setCurrentTime] = useState(0);
const [totalDuration, setTotalDuration] = useState(0);
const [frameRange, setFrameRange] = useState({ start: 0, end: 0 });
const [playbackSpeed, setPlaybackSpeed] = useState(1);
const [currentAnimationFrame, setCurrentAnimationFrame] = useState(0);
const [originalSize, setOriginalSize] = useState({ width: 64, height: 64 });

// Configurar canvas con el tamaño adecuado
const setupCanvas = useCallback(() => {
  if (!displayCanvasRef.current) return;
  
  const canvas = displayCanvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // Si es canvas externo, usar las dimensiones del viewport escaladas
  if (externalCanvasRef) {
    canvas.width = viewportWidth * zoom;
    canvas.height = viewportHeight * zoom;
  } else {
    // Canvas interno: usar displaySize
    canvas.width = displaySize;
    canvas.height = displaySize;
    
    // Aplicar estilo CSS para el tamaño visual
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
  }
  
  // Configurar para pixel art (evitar suavizado)
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  
  if (!externalCanvasRef) {
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = '-moz-crisp-edges';
    canvas.style.imageRendering = 'crisp-edges';
  }
}, [displaySize, externalCanvasRef, viewportWidth, viewportHeight, zoom]);





// Calcular duración total y preparar frames
useEffect(() => {

  
  frameKeys.current = Object.keys(frames)
    .map(Number)
    .sort((a, b) => a - b);
  

  
  // ✅ CRÍTICO: Sincronizar frameIndexRef con currentFrame
  const currentFrameIndex = frameKeys.current.indexOf(currentFrame);
  if (currentFrameIndex !== -1) {
    frameIndexRef.current = currentFrameIndex;
   
  } else {
    // Si currentFrame no existe en frameKeys, usar el primer frame
    frameIndexRef.current = 0;
  
  }
  
  // Calcular duración total
  const duration = frameKeys.current.reduce((total, frameNumber) => {
    const frameData = frames[frameNumber];
    return total + (frameData.frameDuration || 100);
  }, 0);
  
  setTotalDuration(duration);
  setFrameRange({ start: 0, end: frameKeys.current.length - 1 });
  
  // ✅ NO cambiar currentAnimationFrame aquí si ya está sincronizado
  const expectedAnimationFrame = frameKeys.current[frameIndexRef.current];
  if (currentAnimationFrame !== expectedAnimationFrame) {
    setCurrentAnimationFrame(expectedAnimationFrame || 0);
  }
  
  setCurrentTime(0);
  
  // Configurar canvas después de tener los frames
  setupCanvas();
  
  // ✅ Dibujar el frame actual (no el primero)
  if (frameKeys.current.length > 0) {
    const currentFrameNumber = frameKeys.current[frameIndexRef.current] || frameKeys.current[0];
    const currentFrameData = frames[currentFrameNumber];
    if (currentFrameData) {
    
      drawFrame(currentFrameData, currentFrameNumber);
    }
  }

  return () => stopPlayback();
}, [frames, currentFrame]); // ✅ Agregar currentFrame como dependencia

// Reconfigurar canvas cuando cambien viewport o zoom
useEffect(() => {
  if (externalCanvasRef) {
    setupCanvas();
    // Re-dibujar frame actual con nuevas dimensiones
    if (frameKeys.current.length > 0) {
      const currentFrameNumber = frameKeys.current[frameIndexRef.current];
      const currentFrameData = frames[currentFrameNumber];
      if (currentFrameData) {
        lastFrameDrawn.current = null; // Forzar re-dibujado
        drawFrame(currentFrameData, currentFrameNumber);
      }
    }
  }
}, [viewportOffset, viewportWidth, viewportHeight, zoom, externalCanvasRef, setupCanvas, frames]);

const startPlayback = useCallback(() => {
  if (frameKeys.current.length === 0) return;
  
  lastTimestampRef.current = null;
  lastFrameDrawn.current = null;
  startTimeRef.current = performance.now();
  animationRef.current = requestAnimationFrame(animateFrames);
}, []);

const stopPlayback = useCallback(() => {
  if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }
}, []);

const drawFrame = useCallback((frameData, frameNumber) => {
  if (!displayCanvasRef.current || lastFrameDrawn.current === frameNumber) return;

  const ctx = displayCanvasRef.current.getContext("2d");
  if (!ctx) return;

  const canvasWidth = displayCanvasRef.current.width;
  const canvasHeight = displayCanvasRef.current.height;
  
  // Limpiar canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingEnabled = false;

  const visibleLayers = (frameData.layers || [])
    .filter(layer => layer.visible?.[frameNumber] !== false)
    .sort((a, b) => a.zIndex - b.zIndex);

  visibleLayers.forEach(layer => {
    const sourceCanvas = frameData.canvases[layer.id];
    if (!sourceCanvas) return;

    ctx.globalAlpha = layer.opacity ?? 1;
    
    if (externalCanvasRef) {
      // ✨ MODO VIEWPORT: Extraer región específica y escalar
      // Igual que en useLayerManager - aplicar viewport y zoom
      ctx.drawImage(
        sourceCanvas,                    // Canvas fuente completo
        viewportOffset.x,               // X de inicio en canvas fuente
        viewportOffset.y,               // Y de inicio en canvas fuente  
        viewportWidth,                  // Ancho a extraer
        viewportHeight,                 // Alto a extraer
        0,                             // X destino (siempre 0)
        0,                             // Y destino (siempre 0)
        viewportWidth * zoom,          // Ancho final escalado
        viewportHeight * zoom          // Alto final escalado
      );
    } else {
      // ✨ MODO CANVAS INTERNO: Escalar completo al displaySize
      ctx.drawImage(
        sourceCanvas, 
        0, 0, sourceCanvas.width, sourceCanvas.height,  // fuente completa
        0, 0, canvasWidth, canvasHeight                  // destino completo
      );
    }
  });

  ctx.globalAlpha = 1;
  lastFrameDrawn.current = frameNumber;
}, [externalCanvasRef, viewportOffset, viewportWidth, viewportHeight, zoom]);

const animateFrames = useCallback((timestamp) => {
  if (frameKeys.current.length === 0) {
  
    return;
  }

  if (frameKeys.current.length === 1) {

    return; // No animar si solo hay 1 frame
  }

 

  // Aplicar rango de frames
  const availableFrames = frameKeys.current.slice(frameRange.start, frameRange.end + 1);
  if (availableFrames.length === 0) return;

  // ✅ VERIFICAR que frameIndexRef esté dentro del rango válido
  let currentRangeIndex = frameIndexRef.current - frameRange.start;
  if (currentRangeIndex < 0 || currentRangeIndex >= availableFrames.length) {

    currentRangeIndex = 0;
    frameIndexRef.current = frameRange.start;
  }

  const currentFrameNumber = availableFrames[currentRangeIndex];
  const currentFrameData = frames[currentFrameNumber];
  
  if (!currentFrameData) {
    
    return;
  }

  const duration = (currentFrameData.frameDuration || 100) / playbackSpeed;

  if (!lastTimestampRef.current) {
    lastTimestampRef.current = timestamp;
    drawFrame(currentFrameData, currentFrameNumber);
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animateFrames);
    }
    return;
  }

  const elapsed = timestamp - lastTimestampRef.current;

  if (elapsed >= duration) {
    const nextRangeIndex = (currentRangeIndex + 1) % availableFrames.length;
    frameIndexRef.current = frameRange.start + nextRangeIndex;
    lastTimestampRef.current = timestamp;

    const newFrameNumber = availableFrames[nextRangeIndex];
    const newFrameData = frames[newFrameNumber];
    
 
    
    drawFrame(newFrameData, newFrameNumber);
    
    // ✅ Throttle de updates
    setCurrentAnimationFrame(newFrameNumber);
    
    if (onFrameChange) {
      onFrameChange(frameIndexRef.current, newFrameNumber);
    }
  }

  // Actualizar tiempo actual (con throttle)
  if (startTimeRef.current) {
    const totalElapsed = (timestamp - startTimeRef.current) * playbackSpeed;
    
    if (!startTimeRef.lastTimeUpdate || timestamp - startTimeRef.lastTimeUpdate > 100) {
      startTimeRef.lastTimeUpdate = timestamp;
      requestIdleCallback(() => {
        setCurrentTime(totalElapsed);
      });
      
      if (onTimeUpdate) {
        onTimeUpdate(totalElapsed);
      }
    }
  }

  if (isPlaying) {
    animationRef.current = requestAnimationFrame(animateFrames);
  }
}, [isPlaying, frameRange, playbackSpeed, frames, onFrameChange, onTimeUpdate, drawFrame]);

// ✨ FUNCIÓN DE DIBUJO ADAPTADA CON VIEWPORT Y ZOOM


const handlePlay = useCallback(() => {
  setIsPlaying(true);
  startTimeRef.current = performance.now() - currentTime / playbackSpeed;
  startPlayback();
}, [startPlayback, currentTime, playbackSpeed]);

const handlePause = useCallback(() => {

  setIsPlaying(false);
  stopPlayback();
  setActiveFrame(currentAnimationFrame+1);
}, [stopPlayback]);

const handleStop = useCallback(() => {
  setIsPlaying(false);
  stopPlayback();
  frameIndexRef.current = frameRange.start;
  setCurrentAnimationFrame(frameRange.start);
  setCurrentTime(0);
  
  if (frameKeys.current.length > 0) {
    const frameNumber = frameKeys.current[frameRange.start];
    const frameData = frames[frameNumber];
    drawFrame(frameData, frameNumber);
  }
}, [stopPlayback, frameRange.start, frames, drawFrame]);

const handleReset = useCallback(() => {
  handleStop();
  setFrameRange({ start: 0, end: frameKeys.current.length - 1 });
  setPlaybackSpeed(1);
}, [handleStop]);

const handleFrameRangeChange = useCallback((type, value) => {
  const newRange = { ...frameRange };
  newRange[type] = parseInt(value);
  
  // Validar rango
  if (newRange.start > newRange.end) {
    if (type === 'start') {
      newRange.end = newRange.start;
    } else {
      newRange.start = newRange.end;
    }
  }
  
  setFrameRange(newRange);
  
  // Si estamos fuera del rango, ajustar frame actual
  if (frameIndexRef.current < newRange.start || frameIndexRef.current > newRange.end) {
    frameIndexRef.current = newRange.start;
    setCurrentAnimationFrame(newRange.start);
    
    const frameNumber = frameKeys.current[newRange.start];
    const frameData = frames[frameNumber];
    drawFrame(frameData, frameNumber);
  }
}, [frameRange, drawFrame, frames]);

const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const remainingMs = Math.floor((ms % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
};

// Efectos para manejar la reproducción
useEffect(() => {
  if (isPlaying) {
    animationRef.current = requestAnimationFrame(animateFrames);
  } else {
    stopPlayback();
  }
  
  return () => stopPlayback();
}, [isPlaying, animateFrames, stopPlayback]);
//==============Lógica para enviar ref de animacion =============================//
  console.log("se esta renderizando layer animation");
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [expandedLayers, setExpandedLayers] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState([]); // [1, 2, 3, 4, etc]
  // Estados para drag and drop
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);
  const [highlightedLayer, setHighlightedLayer] = useState(null);


const [loopEnabled, setLoopEnabled] = useState(true);
const [selectedLayerFrames, setSelectedLayerFrames] = useState({});
const [multiSelectMode, setMultiSelectMode] = useState(false);
const [selectedFrameRange, setSelectedFrameRange] = useState(null);

const [isOnionActive, setIsOnionActive] = useState(false);
//

const [openOnion, setOpenOnion] = useState(false);


//-------GESTION DEL MENU CONTEXTUAL AL DAR CLICK DERECHO -----------------------//
const [contextMenuFrame, setContextMenuFrame] = useState({
    isVisible: false,
    position: { x: 0, y: 0 }
  });

  const [contextMenuLayer, setContextMenuLayer] = useState({
    isVisible: false,
    position: { x: 0, y: 0 }
  });

  const handleContextMenu = (event,type) => {
    event.preventDefault();
    if(type==='frame'){
      setContextMenuFrame({
        isVisible: true,
        position: { x: event.clientX, y: event.clientY }
      });
    }
   else if(type==='layer'){
    setContextMenuLayer({
      isVisible: true,
      position: { x: event.clientX, y: event.clientY }
    });
   }
   
  };

  const handleCloseMenu = () => {
    setContextMenuFrame(prev => ({ ...prev, isVisible: false }));
    setContextMenuLayer(prev => ({ ...prev, isVisible: false }));
  };

  const menuFrameActions = [
    {
      label: 'Duplicar Frame',
      icon:  <LuCopy />,
      shortcut: 'Ctrl+D',
     disabled: false,
      onClick: () => {
      
        if(selectedFrames.length>1){
          duplicateFrameHandler(selectedFrames);
        }
        else{
          duplicateFrameHandler(currentFrame);
        }
       
        handleCloseMenu();
      }
    },
    {
      label: 'Insertar Frame',
      icon: <LuPlus/>,
      shortcut: 'Ctrl+I',
      onClick: () => {
        addFrame();
        handleCloseMenu();
      }
    },
    {
      label: selectedFrames.length>1 ? 'Eliminar Frames' : 'Eliminar frame',
      icon: <LuTrash/>,
      disabled: frameCount < 2 || frameCount === selectedFrames.length,
      danger: true,
      shortcut: 'Del',
      onClick: () => {
       
        if (frameCount > 1) {
          if(selectedFrames.length>1 ){
            //agregar validacion para no borrar todos
              deleteFrameHandler(selectedFrames);
          }
          else{
            deleteFrameHandler(currentFrame);
          }
          
        }
        handleCloseMenu();
      }
    },
    {
      label: getLayerVisibility(activeLayerId, currentFrame) ? 'Ocultar Frame' : 'Mostrar frame',
      icon: getLayerVisibility(activeLayerId, currentFrame) ? <LuEye/> : <LuEyeOff/>,
      shortcut: 'Del',
      onClick: () => {
      toggleLayerVisibilityInFrame(activeLayerId,currentFrame);
      }
    },
    
   
    {
      label: 'Configurar duración',
      icon: <LuPlay/>,
      type: 'number',
      placeholder: 'Tiempo en ms',
      getValue: () => getFrameDuration(currentFrame),
      setValue: (newDuration) => setFrameDuration(currentFrame, parseInt(newDuration))
    },
    
    {
      label: 'Cambiar Opacidad',
      icon: 'O',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      getValue: () => Math.round(getFrameOpacity(activeLayerId,currentFrame)*100),
      setValue: (newOpacity) => setFrameOpacity(activeLayerId,currentFrame,newOpacity/100 )
    },
    {
      label: selectedFrames > 1 ? 'Limpiar Frames' : 'Limpiar Frame',
      icon: <LuEraser/>,
      shortcut: 'Ctrl+L',
      onClick: () => {
    
        if(selectedFrames.length>1){
          clearLayer(activeLayerId,selectedFrames);
        }
        else{
          clearLayer(activeLayerId,'current');
        }
          
        
        handleCloseMenu();
      }
    }
    /*{
      label: 'Ir a Frame',
      icon: 'G',
      shortcut: 'Ctrl+G',
      onClick: () => {
        const frameNumber = prompt('Ir al frame número:', currentFrame);
        if (frameNumber && !isNaN(frameNumber)) {
          const targetFrame = parseInt(frameNumber);
          if (targetFrame >= 1 && targetFrame <= frameCount) {
            setActiveFrame(targetFrame);
          }
        }
        handleCloseMenu();
      }
    }*/
  ];

  const menuLayerActions = [
    {
      label: 'Duplicar Capa',
      icon: 'D',
      shortcut: 'Ctrl+D',
      onClick: () => {
        duplicateLayer(activeLayerId);
        handleCloseMenu();
      }
    },
    {
      label: 'Crear Grupo',
      icon: 'G',
      shortcut: 'Ctrl+G',
      onClick: () => {
        if (selectedPixels?.length) {
          const groupName = prompt('Nombre del grupo:', `Grupo ${getLayerGroups(activeLayerId).length + 1}`);
          if (groupName && groupName.trim()) {
            handleCreateGroup(activeLayerId, groupName.trim());
          }
        } else {
          alert('Selecciona píxeles primero para crear un grupo');
        }
        handleCloseMenu();
      }
    },
    {
      label: 'Seleccionar Todo',
      icon: 'A',
      shortcut: 'Ctrl+A',
      onClick: () => {
        selectAllCanvas();
        handleCloseMenu();
      }
    },
    {
      label: 'Limpiar Capa',
      icon: 'L',
      shortcut: 'Ctrl+L',
      onClick: () => {
        if (window.confirm('¿Limpiar el contenido de esta capa en el frame actual?')) {
          clearLayer(activeLayerId,'all');
        }
        handleCloseMenu();
      }
    },
    {
      label: 'Renombrar Capa',
      icon: 'R',
      shortcut: 'F2',
      onClick: () => {
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (activeLayer) {
          const newName = prompt('Nuevo nombre para la capa:', activeLayer.name);
          if (newName && newName.trim()) {
            renameLayer(activeLayerId, newName.trim());
          }
        }
        handleCloseMenu();
      },
      
    },
    {
      label: 'Cambiar Nombre',
      icon: 'N',
      type: 'text',
      placeholder: 'Nombre del frame',
      getValue: () => layers.find(l => l.id === activeLayerId).name, // Función que retorna el valor actual
      setValue: (newValue) => renameLayer(activeLayerId,newValue.trim()) // Función para actualizar el valor
    },
    {
      label: 'Mover Arriba',
      icon: 'U',
      shortcut: '↑',
      onClick: () => {
        if (canMoveActiveLayerUp()) {
          moveLayerUp(activeLayerId);
        }
        handleCloseMenu();
      }
    },
    {
      label: 'Mover Abajo',
      icon: 'D',
      shortcut: '↓',
      onClick: () => {
        if (canMoveActiveLayerDown()) {
          moveLayerDown(activeLayerId);
        }
        handleCloseMenu();
      }
    },
    {
      label: 'Alternar Visibilidad',
      icon: 'V',
      shortcut: 'Ctrl+H',
      onClick: () => {
        toggleLayerVisibility(activeLayerId);
        handleCloseMenu();
      }
    },
    {
      label: 'Eliminar Capa',
      icon: 'T',
      danger: true,
      shortcut: 'Del',
      disabled: layers.length<2,
      onClick: () => {
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (activeLayer) {
          const isGroup = activeLayer.isGroupLayer;
          const confirmMessage = isGroup 
            ? '¿Eliminar este grupo de todos los frames?' 
            : '¿Eliminar esta capa de todos los frames?';
          
          if (window.confirm(confirmMessage)) {
            if (isGroup) {
              deletePixelGroup(activeLayer.parentLayerId, activeLayerId);
            }
            deleteLayer(activeLayerId);
          }
        }
        handleCloseMenu();
      }
    }
  ];
  
  // Función auxiliar para crear grupos (necesitarás ajustar el handleCreateGroup)
  const handleCreateGroupFromMenu = (layerId, groupName) => {
    if (!selectedPixels?.length) {
      alert('Selecciona píxeles primero');
      return;
    }
  
    const pixelsWithOffset = selectedPixels.map(pixel => ({
      ...pixel,
      x: pixel.x + dragOffset.x,
      y: pixel.y + dragOffset.y
    }));
    
    const newGroupId = createPixelGroup(layerId, pixelsWithOffset, groupName);
  
    if (newGroupId) {
      selectPixelGroup(layerId, newGroupId);
      setActiveLayerId(newGroupId.groupLayerId || newGroupId);
    }
  
    setExpandedLayers(prev => ({ ...prev, [layerId]: true }));
  };
  

   
//-------GESTION DEL MENU CONTEXTUAL AL DAR CLICK DERECHO -----------------------//



//---- gestion de multiseleccion ----//


// Agregar solo este estado al componente LayerAnimation
const [isDragging, setIsDragging] = useState(false);
const [isDraggingLayerFrame, setIsDraggingLayerFrame] = useState(false);

// Modificar la función handleFrameSelection existente para manejar el mousedown
const handleFrameMouseDown = (frameNumber, event) => {
  const { ctrlKey, metaKey, shiftKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;

  if (shiftKey && selectedFrames.length > 0) {
    // Selección de rango con Shift (mantener comportamiento existente)
    const lastSelected = Math.max(...selectedFrames);
    const start = Math.min(lastSelected, frameNumber);
    const end = Math.max(lastSelected, frameNumber);
    const range = Array.from({length: end - start + 1}, (_, i) => start + i);
    setSelectedFrames(range);
    setActiveFrame(Math.max(...range));
    setIsDragging(false); // Asegurar que no se active el arrastre
  } else if (isCtrlOrCmd) {
    // Selección múltiple con Ctrl/Cmd (mantener comportamiento existente)
    handleFrameSelection(frameNumber, event);
    setIsDragging(false); // Asegurar que no se active el arrastre
  } else {
    // Iniciar arrastre solo si no hay modificadores
    setIsDragging(true);
    setSelectedFrames([frameNumber]);
    setActiveFrame(frameNumber);
  }
};

// Función simple para manejar el hover durante el arrastre
const handleFrameMouseEnter = (frameNumber) => {
  // Solo expandir selección si realmente estamos arrastrando
  if (isDragging) {
    setSelectedFrames(prev => {
      const newSelection = prev.includes(frameNumber) 
        ? prev 
        : [...prev, frameNumber].sort((a, b) => a - b);
      
      // Actualizar currentFrame al frame más alto durante el arrastre
      if (newSelection.length > 0) {
        setActiveFrame(Math.max(...newSelection));
      }
      
      return newSelection;
    });
  }
};

// useEffect para detectar cuando se suelta el mouse globalmente
useEffect(() => {
  const handleMouseUp = (event) => {
    if (isDragging) {
      setIsDragging(false);
     
    }
    if (isDraggingLayerFrame) {
      setIsDraggingLayerFrame(false);
  
    }
  };

  // Agregar el listener tanto para mouseup como para cualquier evento que pueda interrumpir el arrastre
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mouseleave', handleMouseUp); // Si el mouse sale del documento
  
  return () => {
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mouseleave', handleMouseUp);
  };
}, [isDragging, isDraggingLayerFrame]); 


const handleFrameSelection = (frameNumber, event) => {
  const { ctrlKey, metaKey, shiftKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;

  if (shiftKey && selectedFrames.length > 0) {
    // Selección de rango con Shift
    const lastSelected = Math.max(...selectedFrames);
    const start = Math.min(lastSelected, frameNumber);
    const end = Math.max(lastSelected, frameNumber);
    const range = Array.from({length: end - start + 1}, (_, i) => start + i);
    setSelectedFrames(range);
    // NUEVO: Establecer el frame más alto como current
    setActiveFrame(Math.max(...range));
  } else if (isCtrlOrCmd) {
    // Selección múltiple con Ctrl/Cmd
    const newSelection = selectedFrames.includes(frameNumber)
      ? selectedFrames.filter(f => f !== frameNumber)
      : [...selectedFrames, frameNumber].sort((a, b) => a - b);
    
    setSelectedFrames(newSelection);
    // NUEVO: Establecer el frame más alto como current si hay selección
    if (newSelection.length > 0) {
      setActiveFrame(Math.max(...newSelection));
    }
  } else {
    // Selección simple
    setSelectedFrames([frameNumber]);
    setActiveFrame(frameNumber);
  }
};

const handleLayerFrameMouseDown = (layerId, frameIndex, event) => {
  const frameNumber = frameIndex + 1;
  const { ctrlKey, metaKey, shiftKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;

  if (shiftKey && selectedFrames.length > 0) {
    // Selección de rango con Shift
    const lastSelected = Math.max(...selectedFrames);
    const start = Math.min(lastSelected, frameNumber);
    const end = Math.max(lastSelected, frameNumber);
    const range = Array.from({length: end - start + 1}, (_, i) => start + i);
    setSelectedFrames(range);
    setActiveFrame(Math.max(...range));
    setActiveLayerId(layerId);
    setIsDraggingLayerFrame(false); // No iniciar arrastre
  } else if (isCtrlOrCmd) {
    // Selección múltiple con Ctrl/Cmd
    const newSelection = selectedFrames.includes(frameNumber)
      ? selectedFrames.filter(f => f !== frameNumber)
      : [...selectedFrames, frameNumber].sort((a, b) => a - b);
    
    setSelectedFrames(newSelection);
    if (newSelection.length > 0) {
      setActiveFrame(Math.max(...newSelection));
    }
    setActiveLayerId(layerId);
    setIsDraggingLayerFrame(false); // No iniciar arrastre
  } else {
    // Iniciar arrastre para frames de capa solo si no hay modificadores
    setIsDraggingLayerFrame(true);
    setSelectedFrames([frameNumber]);
    setActiveFrame(frameNumber);
    setActiveLayerId(layerId);
  }
};

const handleLayerFrameMouseEnter = (frameNumber) => {
  // Solo expandir selección si realmente estamos arrastrando FRAMES DE CAPAS
  if (isDraggingLayerFrame) {
    setSelectedFrames(prev => {
      const newSelection = prev.includes(frameNumber) 
        ? prev 
        : [...prev, frameNumber].sort((a, b) => a - b);
      
      // Actualizar currentFrame al frame más alto durante el arrastre
      if (newSelection.length > 0) {
        setActiveFrame(Math.max(...newSelection));
      }
      
      return newSelection;
    });
  }
};




//FUncion para usar el hue de onionSkinSetings:

function hueToRGBA(hue, alpha = 0.4, saturation = 100, lightness = 50) {
  // Convertimos HSL a RGB
  const s = saturation / 100;
  const l = lightness / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= hue && hue < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= hue && hue < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= hue && hue < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= hue && hue < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= hue && hue < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= hue && hue < 360) {
    r = c; g = 0; b = x;
  }

  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);

  return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}



// Efecto para sincronizar grupos recién creados
useEffect(() => {
  // Verificar si hay grupos que necesitan sincronización
  Object.entries(pixelGroups).forEach(([layerId, groups]) => {
    Object.keys(groups).forEach(groupId => {
      const frameData = frames[currentFrame];
      if (!frameData?.pixelGroups?.[layerId]?.[groupId]) {
        // Este grupo existe en el estado actual pero no en el frame
        // Necesita sincronización
        saveCurrentFrameState();
      }
    });
  });
}, [pixelGroups, currentFrame, frames, saveCurrentFrameState]);
/*Funciones especiales para la gestion de la animacion: */

const getLayerFrameData = useCallback((layerId, frameNumber) => {
  const frameData = frames[frameNumber];
  
  // Debug: Log para verificar estructura
  
  
  if (!frameData) {
    return { isEmpty: true, visible: true, hasGroups: false };
  }
  
  // Verificar visibilidad del layer en el frame
  const layerInFrame = frameData.layers?.find(l => l.id === layerId);
  const isVisibleInFrame = layerInFrame ? (layerInFrame.visible ?? true) : true;
  
  // 1. VERIFICAR GRUPOS PRIMERO
  const hasGroups = frameData.pixelGroups?.[layerId] && 
                   Object.keys(frameData.pixelGroups[layerId]).length > 0;
  
  if (hasGroups) {
  
    return {
      isEmpty: false,
      visible: isVisibleInFrame,
      hasGroups: true
    };
  }
  
  // 2. VERIFICAR CANVAS CON MÚLTIPLES RUTAS POSIBLES
  let layerCanvas = null;
  
  // Intentar diferentes ubicaciones del canvas
  if (frameData.canvases?.[layerId]) {
    layerCanvas = frameData.canvases[layerId];
  } else if (frameData.layerCanvases?.[layerId]) {
    layerCanvas = frameData.layerCanvases[layerId];
  } else if (frameData[layerId]?.canvas) {
    layerCanvas = frameData[layerId].canvas;
  }
  

  
  let hasContent = false;
  
  if (layerCanvas && layerCanvas.getContext) {
    try {
      const ctx = layerCanvas.getContext('2d');
      
      // MEJORA: Verificar todo el canvas, no solo una muestra
      const imageData = ctx.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
      
      // Verificar si hay píxeles con alpha > 0
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) {
          hasContent = true;
          break;
        }
      }
 
    } catch (error) {
  
      hasContent = false;
    }
  }
  
  // 3. VERIFICAR PIXELS DIRECTOS (backup)
  if (!hasContent && frameData.pixels?.[layerId]) {
    hasContent = frameData.pixels[layerId].length > 0;

  }
  
  return {
    isEmpty: !hasContent,
    visible: isVisibleInFrame,
    hasGroups: false
  };
}, [frames]);

// FUNCIÓN ADICIONAL: Limpiar cache cuando sea necesario
const clearFrameContentCache = () => {
  if (window.layerContentCache) {
    window.layerContentCache.clear();
   
  }
};



// Función para seleccionar frame específico de una capa
const selectLayerFrame = (layerId, frameIndex, ctrlKey = false) => {
  const frameNumber = frameIndex + 1;
  
  // ✅ CRÍTICO: Verificar que el frame existe antes de cambiar
  if (!frames[frameNumber]) {
    console.warn(`Intentando acceder a frame inexistente: ${frameNumber}`);
    return;
  }
  
  const layer = layers.find(l => l.id === layerId);
  const isGroup = layer?.isGroupLayer;
  
  if (ctrlKey && multiSelectMode) {
    setSelectedLayerFrames(prev => {
      const layerFrames = prev[layerId] || [];
      const isSelected = layerFrames.includes(frameIndex);
      
      if (isSelected) {
        return {
          ...prev,
          [layerId]: layerFrames.filter(f => f !== frameIndex)
        };
      } else {
        return {
          ...prev,
          [layerId]: [...layerFrames, frameIndex]
        };
      }
    });
  } else {
    // ✅ CRÍTICO: Guardar estado actual ANTES de cambiar
    if (currentFrame !== frameNumber) {
     
      saveCurrentFrameState();
    }
    
    // ✅ Actualizar selecciones y frame
    setSelectedLayerFrames({ [layerId]: [frameIndex] });
    setActiveLayerId(layerId);
    
    // ✅ CRÍTICO: Usar setTimeout para asegurar orden de operaciones
    setTimeout(() => {
      setActiveFrame(frameNumber);
      
      // ✅ Sincronización adicional para grupos
      if (isGroup) {
        setTimeout(() => {
          syncWithCurrentFrame();
          selectPixelGroup(layer.parentLayerId, layerId);
        }, 50); // Dar tiempo para que se complete el cambio de frame
      }
    }, 0);
  }
};



// Función para seleccionar rango de frames (Shift+click)
const selectFrameRange = (layerId, frameIndex, shiftKey = false) => {
  if (shiftKey && selectedLayerFrames[layerId]?.length > 0) {
    const lastSelected = Math.max(...selectedLayerFrames[layerId]);
    const start = Math.min(lastSelected, frameIndex);
    const end = Math.max(lastSelected, frameIndex);
    const range = Array.from({length: end - start + 1}, (_, i) => start + i);
    
    setSelectedLayerFrames(prev => ({
      ...prev,
      [layerId]: range
    }));
    setSelectedFrameRange({ layerId, start, end });
  } else {
    
    selectLayerFrame(layerId, frameIndex);
  }
};


// Función para limpiar selección de frames
const clearFrameSelection = () => {
  setSelectedLayerFrames({});
  setSelectedFrameRange(null);
};

// Función para copiar frames seleccionados
const copySelectedFrames = () => {
  const selectedFrames = {};
  Object.entries(selectedLayerFrames).forEach(([layerId, frameIndices]) => {
    selectedFrames[layerId] = frameIndices.map(index => ({
      ...layerFrames[layerId][index],
      copied: true
    }));
  });

  // Aquí implementarías la lógica de copiado real
};

// Función para eliminar frames seleccionados
const deleteSelectedFrames = () => {
  if (Object.keys(selectedLayerFrames).length === 0) return;
  
  if (window.confirm('¿Eliminar frames seleccionados?')) {
    Object.entries(selectedLayerFrames).forEach(([layerId, frameIndices]) => {
      frameIndices.sort((a, b) => b - a).forEach(index => {
        if (frameCount > 1) {
          deleteFrame(index);
        }
      });
    });
    clearFrameSelection();
  }
};

// Funciones de gestión de grupos que faltaban
const startEditingGroup = (group, e) => {
  e.stopPropagation();
  setEditingGroupId(group.id);
  setEditingGroupName(group.name);
};

const saveGroupName = () => {
  if (editingGroupId && editingGroupName.trim()) {
    const layerId = Object.keys(pixelGroups).find(layerId => 
      pixelGroups[layerId]?.[editingGroupId]
    );
    if (layerId) renamePixelGroup(layerId, editingGroupId, editingGroupName);
    setEditingGroupId(null);
  }
};

const handleGroupKeyDown = (e) => {
  if (e.key === 'Enter') saveGroupName();
  else if (e.key === 'Escape') setEditingGroupId(null);
};

const toggleLayerExpansion = (layerId) => {
  setExpandedLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
};
// Función para asegurar que el grupo se sincronice correctamente
const ensureGroupInCurrentFrame = (layerId, groupId) => {
  // Verificar si el grupo existe en el frame actual
  const currentFrameData = frames[currentFrame];
  if (!currentFrameData?.pixelGroups?.[layerId]?.[groupId]) {
    // Si no existe, sincronizar el estado actual
    saveCurrentFrameState();
  }
};
const handleCreateGroup = (layerId) => {
  if (!selectedPixels?.length) {
    alert('Selecciona píxeles primero');
    return;
  }

  const groupName = newGroupName.trim() || `Grupo ${getLayerGroups(layerId).length + 1}`;

  const pixelsWithOffset = selectedPixels.map(pixel => ({
    ...pixel,
    x: pixel.x + dragOffset.x,
    y: pixel.y + dragOffset.y
  }));
  
  const newGroupId = createPixelGroup(layerId, pixelsWithOffset, groupName);

  if (newGroupId) {
    // Sincronizar el estado del grupo con el frame actual DESPUÉS de crearlo
    
    
    // Seleccionar el grupo
    selectPixelGroup(layerId, newGroupId);
    
    // Activar la capa del grupo
    setActiveLayerId(newGroupId.groupLayerId || newGroupId);
  }

  setNewGroupName('');
  setShowCreateGroup(null);
  setExpandedLayers(prev => ({ ...prev, [layerId]: true }));
};

const handleDeleteGroup = (layerId, groupId, e) => {
  e.stopPropagation();
  if (window.confirm('¿Eliminar grupo?')) deletePixelGroup(layerId, groupId);
};
  // Efecto para la reproducción automática
  
  // Funciones de control de animación
 

 const handlePrevFrame = () => {
  const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
  const currentIndex = frameNumbers.indexOf(currentFrame);
  if (currentIndex > 0) {
    setActiveFrame(frameNumbers[currentIndex - 1]);
  }
};

const handleNextFrame = () => {
  const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
  const currentIndex = frameNumbers.indexOf(currentFrame);
  if (currentIndex < frameNumbers.length - 1) {
    setActiveFrame(frameNumbers[currentIndex + 1]);
  }
};

const handleFirstFrame = () => {
  const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
  if (frameNumbers.length > 0) {
    setActiveFrame(frameNumbers[0]);
  }
};
const handleLastFrame = () => {
  const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
  if (frameNumbers.length > 0) {
    setActiveFrame(frameNumbers[frameNumbers.length - 1]);
  }
};





  // Función para añadir frame
  const addFrame = () => {
   createFrame("newContent");
    setSelectedFrames([])
 
  
  };

  // Función para duplicar frame
  const duplicateFrameHandler = (frameNumber) => {
   
    const newFrameNumber = duplicateFrame(frameNumber);
    if (newFrameNumber) {
      setActiveFrame(newFrameNumber);
    }

    setSelectedFrames([]);
  };

  // Función para eliminar frame
  const deleteFrameHandler = (frameNumber) => {
   
    if (frameCount <= 1) return;
    
    deleteFrame(frameNumber);
    setSelectedFrames([])
  };

 

  // Función para ir a un frame específico
  const goToFrame = (frameIndex) => {
    setActiveFrame(frameIndex + 1); // Los frames empiezan en 1
  };

  // Funciones heredadas del LayerManager
  const getOrderedLayers = () => {
    // Solo devolver capas principales (no grupos)
    return layers.filter(l => !l.isGroupLayer).sort((a, b) => {
      return (b.zIndex || 0) - (a.zIndex || 0);
    });
  };

  const getVisualLayerIndex = (layer) => {
    const orderedLayers = layers
      .filter(l => !l.isGroupLayer)
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    return orderedLayers.findIndex(l => l.id === layer.id);
  };

  const isFirstLayer = (layer) => {
    if (layer.isGroupLayer) return false;
    return getVisualLayerIndex(layer) === 0;
  };

  const isLastLayer = (layer) => {
    if (layer.isGroupLayer) return false;
    const orderedLayers = layers
      .filter(l => !l.isGroupLayer)
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    return getVisualLayerIndex(layer) === orderedLayers.length - 1;
  };

  const getActiveLayer = () => {
    return layers.find(layer => layer.id === activeLayerId);
  };

  const canMoveActiveLayerUp = () => {
    const activeLayer = getActiveLayer();
    return activeLayer && !activeLayer.isGroupLayer && !isFirstLayer(activeLayer);
  };

  const canMoveActiveLayerDown = () => {
    const activeLayer = getActiveLayer();
    return activeLayer && !activeLayer.isGroupLayer && !isLastLayer(activeLayer);
  };

  const handleMoveActiveLayerUp = () => {
    if (canMoveActiveLayerUp()) {
      moveLayerUp(activeLayerId);
    }
  };

  const handleMoveActiveLayerDown = () => {
    if (canMoveActiveLayerDown()) {
      moveLayerDown(activeLayerId);
    }
  };

  const handleLayerChange = (layerId) => {
    showOnionSkinForLayer(layerId)
    clearCurrentSelection();
    setActiveLayerId(layerId);
  };

  const startEditing = (layer, e) => {
    e.stopPropagation();
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const saveLayerName = () => {
    if (editingLayerId && editingName.trim()) {
      renameLayer(editingLayerId, editingName);
      setEditingLayerId(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveLayerName();
    else if (e.key === 'Escape') setEditingLayerId(null);
  };


const renderLayerWithTimeline = (layer, depth = 0) => {
  const isGroup = layer.isGroupLayer;
  const children = getGroupLayersForParent(layer.id);
  const isExpanded = expandedLayers[layer.id];
  const hasChildren = children.length > 0;
  const layerGroups = getLayerGroups(layer.id);

  const elementsToRender = [];

  elementsToRender.push(
    <div key={layer.id} className={`animation-layer-row ${isGroup ? 'group-layer' : ''}`}>
      {/* Parte izquierda - Info de la capa/grupo (sin cambios) */}
      <div
        onContextMenu={(e) => {
          handleContextMenu(e, 'layer');
          handleLayerChange(layer.id);
        }}
        className={`layer-info ${layer.visible ? 'visible' : 'hidden'} ${activeLayerId === layer.id ? 'selected' : ''}`}
        style={{ paddingLeft: `0px` }}
        onClick={() => handleLayerChange(layer.id)}
      >
        {/* ... resto del contenido de layer-info sin cambios ... */}
        <div className="layer-content">
          {editingLayerId === layer.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={saveLayerName}
              onKeyDown={handleKeyDown}
              autoFocus
              className="layer-name-input"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="layer-name"
              onDoubleClick={(e) => startEditing(layer, e)}
              title="Doble clic para editar"
            >
              {isGroup ? (
                <>
                  <LuGroup className="group-icon" />
                  {layer.name}
                </>
              ) : (
                <>
                  {layer.name}
                  {layerGroups.length > 0 && (
                    <span className="group-count">({layerGroups.length})</span>
                  )}
                </>
              )}
            </div>
          )}

          {hasChildren && (
            <button
              className="expand-toggle"
              onClick={(e) => { 
                e.stopPropagation(); 
                toggleLayerExpansion(layer.id); 
              }}
              title={isExpanded ? 'Colapsar' : 'Expandir'}
            >
              {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
            </button>
          )}
        </div>

        {/* ... resto de layer-actions sin cambios ... */}
        <div className="layer-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveLayerId(layer.id);
              if (isGroup) {
                selectAllCanvas();
              } else {
                selectAllCanvas();
              }
            }}
            title={isGroup ? "Seleccionar grupo" : "Seleccionar contenido de la capa"}
            className="layer-btn select-content-btn"
          >
            <LuMousePointer />
          </button>

          {!isGroup && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateGroup(showCreateGroup === layer.id ? null : layer.id);
              }}
              title="Crear grupo"
              className={`layer-btn ${selectedPixels?.length ? 'has-selection' : ''}`}
              disabled={!selectedPixels?.length}
            >
              <LuGroup />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (layer.id === activeLayerId) {
                clearCurrentSelection();
              }
              if (isGroup) {
                toggleLayerVisibility(layer.id);
              } else {
                toggleLayerVisibility(layer.id);
              }
            }}
            title={layer.visible ? 'Ocultar' : 'Mostrar'}
            className="layer-btn"
          >
            {layer.visible ? <LuEye /> : <LuEyeOff />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isGroup) {
                if (window.confirm('¿Eliminar este grupo de todos los frames?')) {
                  deletePixelGroup(layer.parentLayerId, layer.id);
                  deleteLayer(layer.id);
                }
              } else {
                if (window.confirm('¿Eliminar esta capa de todos los frames?')) {
                  deleteLayer(layer.id);
                }
              }
            }}
            title="Eliminar"
            className="layer-btn delete-btn"
            disabled={!isGroup && layers.length <= 1}
          >
            <LuTrash2 />
          </button>

          <button><BsDashCircleDotted /></button>
        </div>

        {/* ... resto de showCreateGroup sin cambios ... */}
      </div>

      {/* Parte derecha - Timeline ACTUALIZADA CON ACCESO DIRECTO */}
      <div className="timeline-frames">
        {Array(frameCount).fill(null).map((_, frameIndex) => {
          const frameNumber = frameIndex + 1;

          // ✅ ACCESO DIRECTO A framesResume - sin funciones intermedias
          const resolvedFrame = framesResume?.computed?.resolvedFrames?.[frameNumber];
          const directFrame = framesResume?.frames?.[frameNumber];
          const frameData = resolvedFrame || directFrame;

          // ✅ Acceso directo a propiedades
          const isEmpty = !(frameData?.layerHasContent?.[layer.id] ?? false);
          const isVisibleInFrame = frameData?.layerVisibility?.[layer.id] ?? true;
          const hasGroups = directFrame?.pixelGroups?.[layer.id] && 
                           Object.keys(directFrame.pixelGroups[layer.id]).length > 0;
          const layerOpacity = frameData?.layerOpacity?.[layer.id] ?? 1.0;

          // Estados del frame
          const isCurrent = currentFrame === frameNumber;
          const isActive = activeLayerId === layer.id && isCurrent;
          const isSelectedGlobal = selectedFrames.includes(frameNumber);
          const isSelectedInActiveLayer = isSelectedGlobal && activeLayerId === layer.id;

          // ✅ Verificar si es keyframe usando acceso directo
          const isKeyframe = framesResume?.computed?.keyframes?.[layer.id]?.includes(frameNumber) ?? false;

          return (
            <div
              onContextMenu={(e) => {
                handleContextMenu(e, 'frame');
                if (!isSelectedInActiveLayer) {
                  handleLayerFrameMouseDown(layer.id, frameIndex, e);
                }
              }}
              key={`${layer.id}_frame_${frameNumber}`}
              className={`timeline-frame ${isGroup ? 'group-frame' : ''} ${
                isEmpty && !hasGroups ? 'empty' : 'filled'
              } ${isVisibleInFrame ? 'visible' : 'hidden'} ${
                isSelectedInActiveLayer ? 'current' : ''
              } ${isActive ? 'active' : ''} ${
                isSelectedInActiveLayer ? 'selected-frame' : ''
              } ${isKeyframe ? 'keyframe' : ''}`}
              style={{
                opacity: isVisibleInFrame ? layerOpacity : 0.3
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                if (e.button === 2 && selectedFrames.length > 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                handleLayerFrameMouseDown(layer.id, frameIndex, e);
              }}
              onMouseEnter={() => handleLayerFrameMouseEnter(frameNumber)}
              title={`Frame ${frameNumber} - ${isEmpty && !hasGroups ? 'Vacío' : 'Con contenido'}${isKeyframe ? ' (Keyframe)' : ''}`}
            >
              <div className="frame-content">
                {isEmpty && !hasGroups ? (
                  <div className="empty-indicator" />
                ) : (
                  <div className="filled-indicator">
                    {hasGroups && <div className="groups-indicator" />}
                    {isKeyframe && <div className="keyframe-indicator" />}
                  </div>
                )}
              </div>

              {isSelectedInActiveLayer && <div className="frame-selection-indicator" />}

              {/* Onion skin */}
              {onionSkinEnabled &&
                activeLayerId === layer.id &&
                currentFrame !== frameNumber &&
                (
                  (frameNumber < currentFrame &&
                    currentFrame - frameNumber <= onionSkinSettings.previousFrames) ||
                  (frameNumber > currentFrame &&
                    frameNumber - currentFrame <= onionSkinSettings.nextFrames)
                ) && (
                  <div className="onion-skin">
                    <p>{frameNumber}</p>
                  </div>
              )}

              <button
                className="frame-visibility-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibilityInFrame(layer.id, frameNumber);
                }}
                title={isVisibleInFrame ? 'Ocultar frame' : 'Mostrar frame'}
              >
                {isVisibleInFrame ? <LuEye size={12} /> : <LuEyeOff size={12} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Renderizar hijos si están expandidos
  if (isExpanded && hasChildren) {
    children
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
      .forEach(childLayer => {
        const childElements = renderLayerWithTimeline(childLayer, depth + 1);
        if (Array.isArray(childElements)) {
          elementsToRender.push(...childElements);
        } else {
          elementsToRender.push(childElements);
        }
      });
  }

  return elementsToRender;
};



const MemoizedFrameNumber = React.memo(({ frameNumber, isCurrent, isSelected, onMouseDown, onMouseEnter }) => (
  <div
    className={`frame-number ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
    onMouseDown={onMouseDown}
    onMouseEnter={onMouseEnter}
    style={{ userSelect: 'none' }}
    title={`Frame ${frameNumber}\nArrastrar para seleccionar múltiples`}
  >
    {frameNumber}
    {isSelected && !isCurrent && (
      <div className="selection-indicator" />
    )}
  </div>
));

  return (
    <div className="layer-animation"
   
    >
       <CustomContextMenu
        isVisible={contextMenuFrame.isVisible}
        position={contextMenuFrame.position}
        onClose={handleCloseMenu}
        actions={menuFrameActions}
        header={{
          title: `Frame: ${currentFrame}`,
          subtitle: layers.find(layer => layer.id === activeLayerId)?.name
        }}
      />
      <CustomContextMenu
        isVisible={contextMenuLayer.isVisible}
        position={contextMenuLayer.position}
        onClose={handleCloseMenu}
        actions={menuLayerActions}
        header={{
          title: layers.find(layer => layer.id === activeLayerId)?.name
        }}
        
      />
      <ConfigOnionSkin
       
    
  isOpen={openOnion}
  onClose={() => setOpenOnion(false)}
  onSave={(newSettings) => {
    setOnionSkinConfig(newSettings);
    // No necesitas setOpenOnion(false) aquí porque se aplica en tiempo real
  }}
  currentSettings={onionSkinSettings} // Cambié onionSkinSettings por onionSkinConfig
/>
      {/* Header con controles de animación */}
      <div className="animation-header">
        
    
        <div className="header-center">
          {/* Controles de reproducción */}
          <div className="playback-controls">
            <button 
              onClick={handleFirstFrame}
              title="Primer frame"
              className="control-btn"
            >
              <LuSkipBack />
            </button>
            
            <button 
              onClick={handlePrevFrame}
              title="Frame anterior"
              className="control-btn"
            >
              <LuStepBack />
            </button>
            
            <button 
  onClick={isPlaying ? handlePause : handlePlay}  // ✅ Lógica condicional correcta
  title={isPlaying ? 'Pausar' : 'Reproducir'}
  className="control-btn play-btn"
>
  {isPlaying ? <LuPause /> : <LuPlay />}
</button>
            
            <button 
              onClick={handleNextFrame}
              title="Siguiente frame"
              className="control-btn"
            >
              <LuStepForward />
            </button>
            
            <button 
              onClick={handleLastFrame}
              title="Último frame"
              className="control-btn"
            >
              <LuSkipForward />
            </button>

            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              title={loopEnabled ? 'Desactivar bucle' : 'Activar bucle'}
              className={`setting-btn ${loopEnabled ? 'active' : ''}`}
              style={{marginLeft:'10px'}}
            >
              <LuRotateCcw />
            </button>
          </div>

          {/* Configuración de reproducción */}
          <div className="playback-settings">
            <div className="frame-rate-control">
              <label>Frame Rate:</label>
              <p className='playback-current-framerate'>{currentFrame}</p>
              <input
                type="number"
                min="10"
                max="1000"
                step="10"
                value={frames[currentFrame.toString()]?.frameDuration}
                onChange={(e) => setFrameDuration(currentFrame, Number(e.target.value))}
                className="frame-rate-input"
              />
              
              <span>ms</span>
            </div>
            
            
            
           
          </div>

          <div className="frame-controls">
              
              
              <button
                onClick={addFrame}
                title="Añadir frame"
                className="frame-control-btn"
              >
                <LuPlus />
              </button>
              <button
  onClick={() => duplicateFrameHandler(currentFrame)}
  title="Duplicar frame actual"
  className="frame-control-btn"
>
  <LuCopy />
</button>
<button
  onClick={() => deleteFrameHandler(currentFrame)}
  title="Eliminar frame actual"
  className="frame-control-btn"
  disabled={frameCount <= 1}
>
  <LuTrash2 />
</button>
            </div>
        </div>

        <div className='header-right'>
        <button onClick={() => {
  const jsonData = JSON.stringify(framesResume, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'framesResume.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}}>
  Download framesResume JSON
</button>

          <div className="onion-skin-container">
      <div className="onion-skin-toggle" onClick={()=>{toggleOnionSkin();
        setIsOnionActive(!isOnionActive);
      }}>
        <div className="onion-icon">
          <LuLayers/>
        </div>
        <span className="onion-text">Onion Skin</span>
        <div className={`toggle-switch ${isOnionActive ? 'active' : ''}`}>
          <div className="toggle-slider"></div>
        </div>
      </div>
      
      <button className="config-button" onClick={()=>{setOpenOnion(true)}}>
       <LuSettings/>
      </button>
    </div>
        </div>
        
       
      </div>

      {/* Timeline principal */}
      <div className="timeline-container">
        {/* Header de frames */}
        <div className="timeline-header">
          <div className="layers-header">
            
            <div className="layer-actions-container">
          {/* Controles de capas */}
          <div className='layer-manager-actions'>
          <button 
            onClick={handleMoveActiveLayerUp}
            title="Mover capa activa arriba"
            className="header-btn"
            disabled={!canMoveActiveLayerUp()}
          >
            <LuArrowUp />
          </button>
          
          <button 
            onClick={handleMoveActiveLayerDown}
            title="Mover capa activa abajo"
            className="header-btn"
            disabled={!canMoveActiveLayerDown()}
          >
            <LuArrowDown />
          </button>
          
          <button 
            className="add-layer-btn" 
            onClick={()=>{
              clearCurrentSelection();
              addLayer();
            }}
            title="Añadir nueva capa"
          >
            Nueva Capa <BiSolidLayerPlus />
          </button>
          </div>
          
          

        </div>


          </div>
          <div className="frames-header">
            {/*AQui puede ir la seccion de tag para ver los nombres de los tags de varios frames */}
            <p>{selectedFrames}</p>
            <div className="frame-numbers">
  {Array(frameCount).fill(null).map((_, i) => {
    const frameNumber = i + 1;
    const isSelected = selectedFrames.includes(frameNumber);
    const isCurrent = isPlaying 
      ? currentAnimationFrame === frameNumber 
      : currentFrame === frameNumber;
    
    return (
      <MemoizedFrameNumber
        key={frameNumber}
        frameNumber={frameNumber}
        isCurrent={isCurrent}
        isSelected={isSelected}
        onMouseDown={(event) => handleFrameMouseDown(frameNumber, event)}
        onMouseEnter={() => handleFrameMouseEnter(frameNumber)}
      />
    );
  })}
</div>
            
          </div>
        </div>

        {/* Layers con timeline */}
        <div className="timeline-layers">
  {getOrderedLayers().map(layer => renderLayerWithTimeline(layer)).flat()}
</div>
      </div>

      {/* Información de selección */}
      {(selectedGroup || selectedPixels) && (
        <div className="selection-info">
          {selectedGroup ? (
            <div className="selected-group">
              <strong>Grupo seleccionado:</strong> 
              <span className="group-name">{selectedGroup.name}</span>
              <span className="pixel-count">({selectedGroup.pixels?.length}px)</span>
              <button 
                onClick={clearSelectedGroup}
                className="clear-btn"
                title="Deseleccionar grupo"
              >
                <LuX />
              </button>
            </div>
          ) : (
            <div className="selected-pixels">
              <strong>Selección activa:</strong> 
              <span className="pixel-count">{selectedPixels?.length}px</span>
            </div>
          )}
        </div>
      )}


    </div>
  );
};

export default LayerAnimation;