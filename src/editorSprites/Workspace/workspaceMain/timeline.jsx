import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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



const FramesTimeline = ({ 
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


  setActiveFrame,
  deleteFrame,
   duplicateFrame,
   saveCurrentFrameState,
  
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

  const getFramesInfo = useCallback(() => {
    if (!framesResume?.frames) {
      return { frameNumbers: [], frameCount: 0, minFrame: 1, maxFrame: 1 };
    }
    
    const frameNumbers = Object.keys(framesResume.frames)
      .map(Number)
      .sort((a, b) => a - b);
    
    return {
      frameNumbers,
      frameCount: frameNumbers.length,
      minFrame: frameNumbers[0] || 1,
      maxFrame: frameNumbers[frameNumbers.length - 1] || 1
    };
  }, [framesResume]);
  const { frameNumbers, frameCount } = getFramesInfo();

  console.log("se esta renderizando layer animation");
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  // (Eliminado: `editingGroupId` / `editingGroupName` useStates — solo los
  // leían `startEditingGroup` / `saveGroupName` / `handleGroupKeyDown`, todos
  // ya borrados como dead code.)
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
        clearCurrentSelection();
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
  
  // (Eliminado: `handleCreateGroupFromMenu` — duplicaba `handleCreateGroup`
  // pero no tenía call site; la versión viva está más abajo.)


   
//-------GESTION DEL MENU CONTEXTUAL AL DAR CLICK DERECHO -----------------------//



//---- gestion de multiseleccion ----//


// Agregar solo este estado al componente LayerAnimation
const [isDragging, setIsDragging] = useState(false);
const [isDraggingLayerFrame, setIsDraggingLayerFrame] = useState(false);

// Modificar la función handleFrameSelection existente para manejar el mousedown
const handleFrameMouseDown = (frameNumber, event) => {
  clearCurrentSelection();
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
  clearCurrentSelection();
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
  clearCurrentSelection();
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




// (Eliminado: `hueToRGBA` — conversor HSL→RGBA sin call site.)



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
/* Funciones especiales para la gestion de la animacion: */

// (Eliminado: `getLayerFrameData` — useCallback con `ctx.getImageData` sobre
// todo el canvas de cada capa. Nunca invocada; potencial footgun si alguien
// lo cableaba a render porque se ejecutaría sincrónicamente. Si se necesita
// saber si una capa tiene contenido, usar
// `framesResume.computed.resolvedFrames[N].layerHasContent[layerId]`.)

// (Eliminado: `clearFrameContentCache` — 0 call sites, accedía a un global
// `window.layerContentCache` inexistente.)

// (Eliminados: `selectLayerFrame` + `selectFrameRange` — cadena interna dead
// (selectFrameRange solo llamaba a selectLayerFrame). La selección activa vive
// en `handleFrameSelection` + `handleFrameMouseDown` + `handleLayerFrameMouseDown`
// más arriba en el archivo.)

// (Eliminados stubs `clearFrameSelection` / `copySelectedFrames` / `deleteSelectedFrames`:
// nunca se invocaban en el árbol, y `copySelectedFrames` referenciaba una var
// inexistente `layerFrames[layerId][index]` que iba a lanzar ReferenceError si
// alguien lo cableaba. Si se retoma copiar/eliminar multi-frame, la fuente
// correcta es `framesResume.frames[frameNumber]`.)

// (Eliminados: `startEditingGroup` / `saveGroupName` / `handleGroupKeyDown` —
// trio de rename inline de grupos sin call site activo.)

const toggleLayerExpansion = (layerId) => {
  setExpandedLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
};

// (Eliminado: `ensureGroupInCurrentFrame` — verificador dead code.)

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

// (Eliminado: `handleDeleteGroup` — sin call site en el árbol; si se retoma
// la UI de grupos, llamar directo a `deletePixelGroup` del prop.)
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
    clearCurrentSelection();
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

 

  // (Eliminado: `goToFrame` — wrapper trivial sobre setActiveFrame sin call site.)

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

// Bundle de handlers para `LayerRow` (ver `layerAnimation.jsx` para explicación
// extendida del patrón). Latest-ref pattern: wrappers con identidad fija por
// toda la vida del componente que invocan la versión más reciente del handler.
// Con esto, cambios de `currentFrame` durante playback (60fps) no invalidan
// la `React.memo` de cada fila.
const rowHandlersRef = useRef(null);
useEffect(() => {
  rowHandlersRef.current = {
    onLayerContextMenu: (e, layerId) => {
      clearCurrentSelection();
      handleContextMenu(e, 'layer');
      handleLayerChange(layerId);
    },
    onLayerClick: (layerId) => {
      clearCurrentSelection();
      handleLayerChange(layerId);
    },
    onStartEditing: (layer, e) => startEditing(layer, e),
    onEditingNameChange: (value) => setEditingName(value),
    onSaveLayerName: () => saveLayerName(),
    onLayerKeyDown: (e) => handleKeyDown(e),
    onToggleExpand: (layerId) => toggleLayerExpansion(layerId),
    onSelectContent: (layerId) => {
      setActiveLayerId(layerId);
      selectAllCanvas();
    },
    onToggleGroupCreate: (layerId) => {
      setShowCreateGroup(prev => (prev === layerId ? null : layerId));
    },
    onToggleLayerVisibility: (layerId) => {
      if (layerId === activeLayerId) clearCurrentSelection();
      toggleLayerVisibility(layerId);
    },
    onDeleteLayer: (layer) => {
      if (layer.isGroupLayer) {
        if (window.confirm('¿Eliminar este grupo de todos los frames?')) {
          deletePixelGroup(layer.parentLayerId, layer.id);
          deleteLayer(layer.id);
        }
      } else {
        if (window.confirm('¿Eliminar esta capa de todos los frames?')) {
          deleteLayer(layer.id);
        }
      }
    },
    onFrameContextMenu: (e, type) => handleContextMenu(e, type),
    onFrameMouseDown: (layerId, frameIndex, event) =>
      handleLayerFrameMouseDown(layerId, frameIndex, event),
    onFrameMouseEnter: (frameNumber) => handleLayerFrameMouseEnter(frameNumber),
  };
});
const stableRowHandlers = useMemo(() => ({
  onLayerContextMenu: (...args) => rowHandlersRef.current?.onLayerContextMenu(...args),
  onLayerClick: (...args) => rowHandlersRef.current?.onLayerClick(...args),
  onStartEditing: (...args) => rowHandlersRef.current?.onStartEditing(...args),
  onEditingNameChange: (...args) => rowHandlersRef.current?.onEditingNameChange(...args),
  onSaveLayerName: (...args) => rowHandlersRef.current?.onSaveLayerName(...args),
  onLayerKeyDown: (...args) => rowHandlersRef.current?.onLayerKeyDown(...args),
  onToggleExpand: (...args) => rowHandlersRef.current?.onToggleExpand(...args),
  onSelectContent: (...args) => rowHandlersRef.current?.onSelectContent(...args),
  onToggleGroupCreate: (...args) => rowHandlersRef.current?.onToggleGroupCreate(...args),
  onToggleLayerVisibility: (...args) => rowHandlersRef.current?.onToggleLayerVisibility(...args),
  onDeleteLayer: (...args) => rowHandlersRef.current?.onDeleteLayer(...args),
  onFrameContextMenu: (...args) => rowHandlersRef.current?.onFrameContextMenu(...args),
  onFrameMouseDown: (...args) => rowHandlersRef.current?.onFrameMouseDown(...args),
  onFrameMouseEnter: (...args) => rowHandlersRef.current?.onFrameMouseEnter(...args),
}), []);


// Builder recursivo para `LayerRow`: devuelve array plano con la fila de la
// capa y, si está expandida, los rows de sus hijos. `LayerRow` (hoisted abajo)
// absorbe layer-info + timeline-frames en un único componente memoizado.
const renderLayerWithTimeline = (layer) => {
  const children = getGroupLayersForParent(layer.id);
  const isExpanded = !!expandedLayers[layer.id];
  const hasChildren = children.length > 0;
  const layerGroups = getLayerGroups(layer.id);

  const elementsToRender = [];

  elementsToRender.push(
    <LayerRow
      key={layer.id}
      layer={layer}
      isExpanded={isExpanded}
      hasChildren={hasChildren}
      layerGroupsCount={layerGroups.length}
      layersLength={layers.length}
      frameNumbers={frameNumbers}
      currentFrame={currentFrame}
      activeLayerId={activeLayerId}
      editingLayerId={editingLayerId}
      editingName={editingName}
      selectedFrames={selectedFrames}
      selectedPixels={selectedPixels}
      framesResume={framesResume}
      onionSkinEnabled={onionSkinEnabled}
      onionSkinSettings={onionSkinSettings}
      handlers={stableRowHandlers}
    />
  );

  if (isExpanded && hasChildren) {
    children
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
      .forEach(childLayer => {
        elementsToRender.push(...renderLayerWithTimeline(childLayer));
      });
  }

  return elementsToRender;
};



// (Eliminado: `MemoizedFrameNumber` — definido pero nunca usado en el JSX de
// este archivo. Además, estaba dentro del cuerpo del componente —anti-patrón
// que rompe memoización—. Si se retoma un strip de números de frame, usar el
// `FrameNumberCell` hoisted en `layerAnimation.jsx`.)

  return (
    < 
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

    
      



      {/* Timeline principal */}
      <div className="timeline-container">
        {/* Header de frames */}
        

        {/* Layers con timeline */}
        <div className="timeline-layers">
  {getOrderedLayers().map(layer => renderLayerWithTimeline(layer)).flat()}
</div>
      </div>

      {/* Información de selección */}
     

    </>
  );
};

// `LayerRow` — único componente memoizado que absorbe layer-info + timeline.
// Mismo diseño (y motivación) que en layerAnimation.jsx: React.memo shallow,
// handlers via bundle estable (latest-ref), cambios de currentFrame durante
// playback no invalidan la memo de handlers; la fila se re-renderea pero
// React solo muta className de las celdas cuyo flag cambió.
const LayerRow = React.memo(function LayerRow({
  layer,
  isExpanded,
  hasChildren,
  layerGroupsCount,
  layersLength,
  frameNumbers,
  currentFrame,
  activeLayerId,
  editingLayerId,
  editingName,
  selectedFrames,
  selectedPixels,
  framesResume,
  onionSkinEnabled,
  onionSkinSettings,
  handlers,
}) {
  const isGroup = !!layer.isGroupLayer;
  const isLayerActive = activeLayerId === layer.id;
  const isEditing = editingLayerId === layer.id;

  const onRowContextMenu = (e) => handlers.onLayerContextMenu(e, layer.id);
  const onRowClick = () => handlers.onLayerClick(layer.id);
  const onNameDoubleClick = (e) => handlers.onStartEditing(layer, e);
  const onNameInputChange = (e) => handlers.onEditingNameChange(e.target.value);
  const onNameInputKeyDown = (e) => handlers.onLayerKeyDown(e);
  const onNameInputClick = (e) => e.stopPropagation();
  const onExpandClick = (e) => {
    e.stopPropagation();
    handlers.onToggleExpand(layer.id);
  };
  const onSelectContentClick = (e) => {
    e.stopPropagation();
    handlers.onSelectContent(layer.id);
  };
  const onToggleGroupCreateClick = (e) => {
    e.stopPropagation();
    handlers.onToggleGroupCreate(layer.id);
  };
  const onToggleLayerVisibilityClick = (e) => {
    e.stopPropagation();
    handlers.onToggleLayerVisibility(layer.id);
  };
  const onDeleteLayerClick = (e) => {
    e.stopPropagation();
    handlers.onDeleteLayer(layer);
  };

  const layerInfoClass =
    `layer-info ${layer.visible ? 'visible' : 'hidden'}` +
    ` ${isLayerActive ? 'selected' : ''}`;
  const groupCreateDisabled = !selectedPixels?.length;
  const deleteDisabled = !isGroup && layersLength <= 1;

  return (
    <div className={`animation-layer-row ${isGroup ? 'group-layer' : ''}`}>
      {/* --- Parte izquierda: info de la capa / grupo --- */}
      <div
        onContextMenu={onRowContextMenu}
        className={layerInfoClass}
        style={{ paddingLeft: '0px' }}
        onClick={onRowClick}
      >
        <div className="layer-content">
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={onNameInputChange}
              onBlur={handlers.onSaveLayerName}
              onKeyDown={onNameInputKeyDown}
              autoFocus
              className="layer-name-input"
              onClick={onNameInputClick}
            />
          ) : (
            <div
              className="layer-name"
              onDoubleClick={onNameDoubleClick}
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
                  {layerGroupsCount > 0 && (
                    <span className="group-count">({layerGroupsCount})</span>
                  )}
                </>
              )}
            </div>
          )}

          {hasChildren && (
            <button
              className="expand-toggle"
              onClick={onExpandClick}
              title={isExpanded ? 'Colapsar' : 'Expandir'}
            >
              {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
            </button>
          )}
        </div>

        <div className="layer-actions">
          <button
            onClick={onSelectContentClick}
            title={isGroup ? 'Seleccionar grupo' : 'Seleccionar contenido de la capa'}
            className="layer-btn select-content-btn"
          >
            <LuMousePointer />
          </button>

          {!isGroup && (
            <button
              onClick={onToggleGroupCreateClick}
              title="Crear grupo"
              className={`layer-btn ${selectedPixels?.length ? 'has-selection' : ''}`}
              disabled={groupCreateDisabled}
            >
              <LuGroup />
            </button>
          )}

          <button
            onClick={onToggleLayerVisibilityClick}
            title={layer.visible ? 'Ocultar' : 'Mostrar'}
            className="layer-btn"
          >
            {layer.visible ? <LuEye /> : <LuEyeOff />}
          </button>

          <button
            onClick={onDeleteLayerClick}
            title="Eliminar"
            className="layer-btn delete-btn"
            disabled={deleteDisabled}
          >
            <LuTrash2 />
          </button>

          <button><BsDashCircleDotted /></button>
        </div>
      </div>

      {/* --- Parte derecha: celdas del timeline para esta capa --- */}
      <div className="timeline-frames">
        {frameNumbers.map((frameNumber) => {
          const resolvedFrame = framesResume?.computed?.resolvedFrames?.[frameNumber];
          const directFrame = framesResume?.frames?.[frameNumber];
          const frameData = resolvedFrame || directFrame;

          const isEmpty = !(frameData?.layerHasContent?.[layer.id] ?? false);
          const isVisibleInFrame = frameData?.layerVisibility?.[layer.id] ?? true;
          const hasGroups = !!directFrame?.pixelGroups?.[layer.id] &&
            Object.keys(directFrame.pixelGroups[layer.id]).length > 0;
          const layerOpacity = frameData?.layerOpacity?.[layer.id] ?? 1.0;

          const isCurrent = currentFrame === frameNumber;
          const isActive = isLayerActive && isCurrent;
          const isSelectedGlobal = selectedFrames.includes(frameNumber);
          const isSelectedInActiveLayer = isSelectedGlobal && isLayerActive;
          const isKeyframe =
            framesResume?.computed?.keyframes?.[layer.id]?.includes(frameNumber) ?? false;

          const showOnionOverlay =
            onionSkinEnabled &&
            isLayerActive &&
            currentFrame !== frameNumber &&
            (
              (frameNumber < currentFrame &&
                currentFrame - frameNumber <= onionSkinSettings.previousFrames) ||
              (frameNumber > currentFrame &&
                frameNumber - currentFrame <= onionSkinSettings.nextFrames)
            );

          const className =
            `timeline-frame ${isGroup ? 'group-frame' : ''}` +
            ` ${isEmpty && !hasGroups ? 'empty' : 'filled'}` +
            ` ${isVisibleInFrame ? 'visible' : 'hidden'}` +
            ` ${isSelectedInActiveLayer ? 'current selected-frame' : ''}` +
            ` ${isActive ? 'active' : ''}` +
            ` ${isKeyframe ? 'keyframe' : ''}`;

          const onCellContextMenu = (e) => {
            handlers.onFrameContextMenu(e, 'frame');
            if (!isSelectedInActiveLayer) {
              handlers.onFrameMouseDown(layer.id, frameNumber - 1, e);
            }
          };
          const onCellClick = (e) => e.stopPropagation();
          const onCellMouseDown = (e) => {
            if (e.button === 2 && selectedFrames.length > 1) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            handlers.onFrameMouseDown(layer.id, frameNumber - 1, e);
          };
          const onCellMouseEnter = () => handlers.onFrameMouseEnter(frameNumber);

          return (
            <div
              key={`${layer.id}_frame_${frameNumber}`}
              onContextMenu={onCellContextMenu}
              className={className}
              style={{ opacity: isVisibleInFrame ? layerOpacity : 0.3 }}
              onClick={onCellClick}
              onMouseDown={onCellMouseDown}
              onMouseEnter={onCellMouseEnter}
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

              {showOnionOverlay && (
                <div className="onion-skin">
                  <p>{frameNumber}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default FramesTimeline;