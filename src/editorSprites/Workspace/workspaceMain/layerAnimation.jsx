import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './layerAnimation.css'

import { useAnimationPlayer } from '../hooks/useAnimationPlayer';
import LayerRow from './layerRow';
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



// Destructura minimal: solo las props realmente consumidas en el árbol activo.
// El wrapper `memoizedLayerAnimation.jsx` sigue pasando más props (para
// compatibilidad con `renderLayerWithTimeline` + `LayerRow` si se re-enable en
// el futuro); React ignora las props extra que el hijo no destructura.
const LayerAnimation = ({
  // Capas
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

  // Grupos / selección (consumidos por LayerRow + handlers)
  pixelGroups,
  selectedPixels,
  dragOffset,
  createPixelGroup,
  deletePixelGroup,
  getLayerGroups,
  selectPixelGroup,
  clearCurrentSelection,
  getGroupLayersForParent,
  selectAllCanvas,

  // Frames
  createFrame,
  frames,
  currentFrame,
  setActiveFrame,
  deleteFrame,
  duplicateFrame,
  saveCurrentFrameState,
  toggleLayerVisibilityInFrame,
  getLayerVisibility,

  // Onion skin
  onionSkinEnabled,
  onionSkinSettings,
  showOnionSkinForLayer,

  // Duración / opacidad
  setFrameDuration,
  getFrameDuration,
  setFrameOpacity,
  getFrameOpacity,

  // Resumen de frames (data consolidada)
  framesResume,

  // Callbacks de sincronización (no usados directamente pero conservados por API)
  onTimeUpdate,
  onFrameChange,

  // Viewport / canvas externo
  externalCanvasRef,
  viewportOffset = { x: 0, y: 0 },
  viewportWidth = 64,
  viewportHeight = 64,
  zoom = 1,
  displaySize = 256,

  // Control de reproducción (compartido con padre)
  isPlaying,
  setIsPlaying,

  // Onion frames config (pasada a ConfigOnionSkin modal)
  onionFramesConfig,
  setOnionFramesConfig,
  updateFrameConfig,
  addPreviousFrame,
  addNextFrame,
  removeFrame,
  toggleOnionFrames,
  applyOnionFramesPreset,
  clearTintCache,
}) => {
  "use memo";
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

//==============Lógica para enviar ref de animacion =============================//
const internalCanvasRef = useRef(null);
const { frameNumbers, frameCount } = getFramesInfo();

// Motor de reproducción compartido con `PlayAnimation` vía `useAnimationPlayer`.
// `isPlaying/setIsPlaying` vienen del padre, de modo que panel y reproductor
// reaccionan al mismo estado. `syncedFrameNumber` re-centra el índice del
// motor cada vez que el editor cambia de frame activo.
// El panel solo consume velocidad, frame vivo y los handlers play/pause.
// El tiempo y la duración totales los expone PlayAnimation en su overlay.
const {
  playbackSpeed,
  currentFrame: currentAnimationFrame,
  setPlaybackSpeed,
  play,
  pause,
} = useAnimationPlayer({
  frames,
  externalCanvasRef,
  internalCanvasRef,
  viewportOffset,
  viewportWidth,
  viewportHeight,
  zoom,
  displaySize,
  isPlaying,
  setIsPlaying,
  onTimeUpdate,
  onFrameChange,
  syncedFrameNumber: currentFrame,
});

// El play del panel delega en el motor. `handlePause` además sincroniza el
// frame activo del editor con donde quedó la reproducción — es una
// particularidad del panel, no del reproductor.
const handlePlay = play;
const handlePause = useCallback(() => {
  pause();
  if (currentAnimationFrame) setActiveFrame(currentAnimationFrame);
}, [pause, currentAnimationFrame, setActiveFrame]);
//==============Lógica para enviar ref de animacion =============================//
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  // (Eliminado: `editingGroupId` / `editingGroupName` — solo los leían
  // `startEditingGroup` / `saveGroupName` / `handleGroupKeyDown`, todos dead
  // code ligados a una UI de rename-de-grupo que no está en el árbol.)
  const [expandedLayers, setExpandedLayers] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  // showCreateGroup: el setter se usa (functional update en stableRowHandlers),
  // el valor como tal no se lee en el árbol activo.
  // eslint-disable-next-line no-unused-vars
  const [showCreateGroup, setShowCreateGroup] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState([]); // [1, 2, 3, 4, etc]

// (Eliminados useStates sin read en el árbol activo: `draggedItem`/`dragOverItem`/
// `dropIndicator`/`highlightedLayer` —para drag-and-drop de capas— y
// `selectedLayerFrames`/`multiSelectMode`/`selectedFrameRange` —para la
// selección multi-frame por capa. Se consumían únicamente en código que ya
// eliminé (stubs de copiar/eliminar frames + selectLayerFrame/Range). Si se
// retoma la feature, estos useState se vuelven a declarar.)

const [loopEnabled, setLoopEnabled] = useState(true);

// (Eliminado: `isOnionActive` useState — el estado real es `onionFramesConfig.enabled`
// del padre; este local solo se usaba en el antiguo toggle del topbar.)
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
  
// Solución para que al cambiar la opacidad con el slider no se dispare el
// cambio en framesResume en cada tick (solo al soltar).
//
// Antes se sincronizaba con un `useEffect` + `setLocalOpacity`, pero eso es
// el anti-patrón "cascading setState within effect" que la React team
// desaconseja. El patrón canónico (React docs: "Adjusting State When a Prop
// Changes") es: comparar la llave de props con la anterior DURANTE el render
// y setear ambos estados en cascada — React los batch-ea en un solo commit,
// sin cascada visible de renders.
const [localOpacity, setLocalOpacity] = useState(() =>
  Math.round(getFrameOpacity(activeLayerId, currentFrame) * 100)
);
const [prevOpacityKey, setPrevOpacityKey] = useState(() => `${activeLayerId}:${currentFrame}`);
const opacityKey = `${activeLayerId}:${currentFrame}`;
if (prevOpacityKey !== opacityKey) {
  setPrevOpacityKey(opacityKey);
  setLocalOpacity(Math.round(getFrameOpacity(activeLayerId, currentFrame) * 100));
}


  // (Eliminado: `handleCreateGroupFromMenu` — duplicaba `handleCreateGroup`
  // pero no tenía call site. La versión viva es `handleCreateGroup` más abajo.)


   
//-------GESTION DEL MENU CONTEXTUAL AL DAR CLICK DERECHO -----------------------//



//---- gestion de multiseleccion ----//


// Agregar solo este estado al componente LayerAnimation
const [isDragging, setIsDragging] = useState(false);
const [isDraggingLayerFrame, setIsDraggingLayerFrame] = useState(false);

// Selección con modificadores (Shift = rango, Ctrl/Cmd = toggle múltiple,
// sin modificador = simple). Declarada ANTES de `handleFrameMouseDown` porque
// éste la llama y el React Compiler exige orden textual (aunque JS hoistee
// `function` declarations).
function handleFrameSelection(frameNumber, event) {
  clearCurrentSelection();
  const { ctrlKey, metaKey, shiftKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;

  if (shiftKey && selectedFrames.length > 0) {
    const lastSelected = Math.max(...selectedFrames);
    const start = Math.min(lastSelected, frameNumber);
    const end = Math.max(lastSelected, frameNumber);
    const range = Array.from({length: end - start + 1}, (_, i) => start + i);
    setSelectedFrames(range);
    setActiveFrame(Math.max(...range));
  } else if (isCtrlOrCmd) {
    const newSelection = selectedFrames.includes(frameNumber)
      ? selectedFrames.filter(f => f !== frameNumber)
      : [...selectedFrames, frameNumber].sort((a, b) => a - b);

    setSelectedFrames(newSelection);
    if (newSelection.length > 0) {
      setActiveFrame(Math.max(...newSelection));
    }
  } else {
    setSelectedFrames([frameNumber]);
    setActiveFrame(frameNumber);
  }
}

// `function` (hoisted) en vez de arrow const: permite llamar a
// `handleFrameSelection` sin TDZ del React Compiler.
function handleFrameMouseDown(frameNumber, event) {
  clearCurrentSelection();
  const { ctrlKey, metaKey, shiftKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;

  if (shiftKey && selectedFrames.length > 0) {
    const lastSelected = Math.max(...selectedFrames);
    const start = Math.min(lastSelected, frameNumber);
    const end = Math.max(lastSelected, frameNumber);
    const range = Array.from({length: end - start + 1}, (_, i) => start + i);
    setSelectedFrames(range);
    setActiveFrame(Math.max(...range));
    setIsDragging(false);
  } else if (isCtrlOrCmd) {
    handleFrameSelection(frameNumber, event);
    setIsDragging(false);
  } else {
    // Arranca arrastre solo si no hay modificadores
    setIsDragging(true);
    setSelectedFrames([frameNumber]);
    setActiveFrame(frameNumber);
  }
}

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

// Latest-ref pattern: expone callbacks con identidad estable durante toda
// la vida del componente, pero que invocan siempre la versión más reciente
// del handler. Con esto, las celdas memoizadas (FrameNumberCell) solo se
// re-renderean cuando cambian props que sí les importan (frameNumber,
// isCurrent, isSelected) — no cuando cambia selectedFrames/isDragging.
// La sincronización del ref va en un useEffect (no en el cuerpo del render)
// para cumplir las reglas de React Compiler — "no mutar refs durante render".
const handleFrameMouseDownRef = useRef(handleFrameMouseDown);
const handleFrameMouseEnterRef = useRef(handleFrameMouseEnter);
useEffect(() => {
  handleFrameMouseDownRef.current = handleFrameMouseDown;
  handleFrameMouseEnterRef.current = handleFrameMouseEnter;
});
const stableHandleFrameMouseDown = useCallback(
  (frameNumber, event) => handleFrameMouseDownRef.current(frameNumber, event),
  []
);
const stableHandleFrameMouseEnter = useCallback(
  (frameNumber) => handleFrameMouseEnterRef.current(frameNumber),
  []
);

// useEffect para detectar cuando se suelta el mouse globalmente
useEffect(() => {
  const handleMouseUp = () => {
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

// (Eliminados los 3 stable wrappers que alimentaban a `LayerTimelineCell`
// —`stableHandleContextMenu`, `stableHandleLayerFrameMouseDown`,
// `stableHandleLayerFrameMouseEnter`— tras fusionar la celda dentro de
// `LayerRow`. El nuevo bundle `stableRowHandlers` (ver arriba) cubre todos
// los handlers del row con el mismo patrón latest-ref.)




// (Eliminado: `hueToRGBA` — conversor HSL→RGBA para colorear el onion
// skin por hue; sin call site en el árbol actual. Si se retoma, usar
// `Color` de una librería en vez de reimplementar.)



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
// (Eliminado: `getLayerFrameData` — useCallback con `ctx.getImageData` sobre
// todo el canvas de cada capa para detectar contenido; declarado pero nunca
// invocado. Además de ser dead code, era un footgun: si alguien lo cableaba a
// la UI se ejecutaría sincrónicamente en cada render. Si se necesita saber
// si una capa tiene contenido, usar `framesResume.computed.resolvedFrames[N]
// .layerHasContent[layerId]` que se calcula una sola vez fuera del render.)

// (Eliminado: `clearFrameContentCache` — 0 call sites, accedía a un global
// `window.layerContentCache` que no existe en el código vivo.)

// (Eliminados: `selectLayerFrame` + `selectFrameRange` — cadena dead code
// interna: `selectFrameRange` solo llamaba a `selectLayerFrame`, y ninguno
// de los dos era invocado desde el árbol JSX. La lógica de selección activa
// es `handleFrameSelection` + `handleFrameMouseDown` + `handleLayerFrameMouseDown`
// más arriba.)


// (Eliminados stubs `clearFrameSelection` / `copySelectedFrames` / `deleteSelectedFrames`:
// nunca se invocaban en el árbol, y `copySelectedFrames` referenciaba una variable
// inexistente `layerFrames[layerId][index]` que iba a lanzar ReferenceError si
// alguien alguna vez lo cableaba a un botón. Si se retoma la feature de copiar/
// eliminar frames selecionados, leerlos de `framesResume.frames[frameNumber]`
// es la fuente correcta.)

// (Eliminados: `startEditingGroup` / `saveGroupName` / `handleGroupKeyDown` —
// trio que implementaba rename inline de grupos; sin call site activo en el
// árbol actual. La UI de rename vive en otro lado si se retoma.)

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

// (Eliminado: `handleDeleteGroup` — sin call site activo; si se retoma
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

 

  // (Eliminados: `goToFrame` —wrapper trivial sobre setActiveFrame sin call site—
  // y `getOrderedLayers` —filter+sort reutilizado inline en `getVisualLayerIndex`/
  // `isLastLayer` sin consumidor directo.)

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

// Bundle de handlers para `LayerRow`. Latest-ref pattern: los wrappers exportados
// tienen identidad FIJA durante la vida del componente, pero por dentro llaman
// a la versión más reciente del handler. Con esto, los cambios de `currentFrame`
// (que ocurren 60fps durante playback) no invalidan la `React.memo` de las
// filas — solo se re-renderean si cambian props de datos (layer, flags, frame
// data); los handlers permanecen con la misma referencia.
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
    onToggleFrameVisibility: (layerId, frameNumber) =>
      toggleLayerVisibilityInFrame(layerId, frameNumber),
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
  onToggleFrameVisibility: (...args) => rowHandlersRef.current?.onToggleFrameVisibility(...args),
}), []);


// Builder recursivo: para `layer` devuelve un array plano con su `<LayerRow>`
// y, si está expandido, los rows de sus hijos. `LayerRow` es un único
// componente memoizado (definido abajo) que absorbe layer-info + timeline.
// Antes eran dos piezas separadas (`renderLayerWithTimeline` + `LayerTimelineCell`).
//
// Actualmente NO se invoca desde el árbol JSX activo — está preparado para
// re-habilitar la vista de filas por capa debajo del header cuando se desee.
// eslint-disable-next-line no-unused-vars
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



  return (
    <>
      
      
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
  onionFramesConfig={onionFramesConfig}
  setOnionFramesConfig={setOnionFramesConfig}
  updateFrameConfig={updateFrameConfig}
  addPreviousFrame={addPreviousFrame}
  addNextFrame={addNextFrame}
  removeFrame={removeFrame}
  toggleOnionFrames={toggleOnionFrames}
  applyOnionFramesPreset={applyOnionFramesPreset}
  clearTintCache={clearTintCache}
/>
      {/* Barra de animación unificada: top-bar (global, no scroll) + timeline-scroll
          (scroll horizontal único con toolbar sticky a la izquierda). */}
      <div className="animation-bar-unified">

        {/* --- Top bar: controles globales (play/pause/speed/loop, onion skin) --- */}
        <div className="unified-top-bar">
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
              onClick={isPlaying ? handlePause : handlePlay}
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
              style={{ marginLeft: '8px' }}
            >
              <LuRotateCcw />
            </button>

            <div className="speed-control-overlay">
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="speed-select-overlay"
                title="Velocidad de reproducción"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>

          <div className="unified-top-right">
            <div className="onion-skin-container">
              <div
                className="onion-skin-toggle"
                onClick={() => { toggleOnionFrames(); }}
              >
                <div className="onion-icon">
                  <LuLayers />
                </div>
                <span className="onion-text">Onion Skin</span>
                <div className={`toggle-switch ${onionFramesConfig.enabled ? 'active' : ''}`}>
                  <div className="toggle-slider"></div>
                </div>
              </div>

              <button className="config-button" onClick={() => { setOpenOnion(true); }}>
                <LuSettings />
              </button>
            </div>
          </div>
        </div>

        {/* --- Timeline unificado: sticky-left (toolbar de capa y frame actual)
              + scroll horizontal compartido (frame-numbers + futuras filas). --- */}
        <div className="unified-timeline-scroll">
          <div className="unified-timeline-left">
            {/* Acciones de capa */}
            <div className="layer-manager-actions">
              <button
                className="add-layer-btn"
                onClick={() => { clearCurrentSelection(); addLayer(); }}
                title="Añadir nueva capa"
              >
                <BiSolidLayerPlus />
                <span>Nueva</span>
              </button>
              <div className="layer-move-actions">
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
              </div>
            </div>

            <div className="unified-divider" aria-hidden />

            {/* Ajustes del frame actual */}
            <div className="current-frame-tools">
              <div className="frame-rate-control">
                <p className="playback-current-framerate">{currentFrame}</p>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                  value={frames[currentFrame.toString()]?.frameDuration}
                  onChange={(e) => setFrameDuration(currentFrame, Number(e.target.value))}
                  className="frame-rate-input"
                  title="Duración del frame (ms)"
                />
                <span className="frame-rate-unit">ms</span>
              </div>

              <div className="frame-controls">
                <button onClick={addFrame} title="Añadir frame" className="frame-control-btn">
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
                  className="frame-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibilityInFrame(activeLayerId, currentFrame);
                  }}
                  title="Alternar visibilidad del frame"
                >
                  <LuEye size={12} />
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

              <div className="zoom-slider-container" title="Opacidad de la capa en el frame actual">
                <label className="opacity-label">Opacidad</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={localOpacity}
                  onChange={(e) => setLocalOpacity(Number(e.target.value))}
                  onMouseUp={() => {
                    setFrameOpacity(activeLayerId, currentFrame, localOpacity / 100);
                  }}
                  className="zoom-slider"
                />
                <span className="opacity-value">{localOpacity}%</span>
              </div>
            </div>
          </div>

          <div className="unified-timeline-frames">
            <div className="frame-numbers">
              {frameNumbers.map((frameNumber) => {
                const isSelected = selectedFrames.includes(frameNumber);
                const isCurrent = isPlaying
                  ? currentAnimationFrame === frameNumber
                  : currentFrame === frameNumber;

                return (
                  <FrameNumberCell
                    key={frameNumber}
                    frameNumber={frameNumber}
                    isCurrent={isCurrent}
                    isSelected={isSelected}
                    onMouseDown={stableHandleFrameMouseDown}
                    onMouseEnter={stableHandleFrameMouseEnter}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    



     

    </>
  );
};

// Celda del timeline con número de frame.
// Hoisted: si la definimos dentro del cuerpo de `LayerAnimation`, cada render
// del padre crea un tipo nuevo y React desmonta/remontea TODAS las celdas —
// el `React.memo` no sirve de nada. Fuera del cuerpo, la memo salta
// re-renders salvo que cambien sus props (isCurrent / isSelected / handlers).
// El binding de `frameNumber` a los handlers se hace aquí adentro para que
// el padre pueda pasar callbacks estables.
const FrameNumberCell = React.memo(function FrameNumberCell({
  frameNumber,
  isCurrent,
  isSelected,
  onMouseDown,
  onMouseEnter,
}) {
  const handleMouseDown = (e) => onMouseDown(frameNumber, e);
  const handleMouseEnter = () => onMouseEnter(frameNumber);
  return (
    <div
      className={`frame-number ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      style={{ userSelect: 'none' }}
      title={`Frame ${frameNumber}\nArrastrar para seleccionar múltiples`}
    >
      {frameNumber}
      {isSelected && !isCurrent && <div className="selection-indicator" />}
    </div>
  );
});


export default LayerAnimation;
