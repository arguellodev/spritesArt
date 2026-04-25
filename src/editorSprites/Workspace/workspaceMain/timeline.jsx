import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import './layerAnimation.css'

import LayerRow, { FrameNumberCell } from './layerRow';
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
import { createTag, addTag, removeTag, updateTag } from '../animation/animationTags';
import TagBand from '../animation/TagBand';

// Destructura minimal: solo las props realmente consumidas. El wrapper
// memoizado sigue pasando más props; React ignora las extras.
const FramesTimeline = ({
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
  setOnionSkinConfig,
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

  // Playback state (del padre): para iluminar el frame en animación.
  isPlaying,
  animationTickFrame,  // frameNumber que el motor de animación está mostrando

  // Tags + API imperativo del player (para acciones de menu contextual y TagBand)
  animationTags = [],
  setAnimationTags,
  handlePlayTag,
  playerApiRef,
  // Loop: activar/desactivar bucle de reproducción (Task 3 lift, Task 6 consume)
  setLoopEnabled,
}) => {

  // `frameNumbers` memoizado sobre `framesResume.frames`. Nota: con Immer,
  // cada pincelada crea un nuevo ref de `framesResume.frames`, por lo que el
  // array resultante TAMBIÉN será nuevo ref (aunque las keys sean idénticas).
  // El comparador custom de `LayerRow` sabe esto: en vez de fallar por ref,
  // compara `frameNumbers` por CONTENIDO — así pintar no invalida rows de
  // capas no tocadas.
  const { frameNumbers, frameCount } = useMemo(() => {
    if (!framesResume?.frames) return { frameNumbers: [], frameCount: 0 };
    const arr = Object.keys(framesResume.frames).map(Number).sort((a, b) => a - b);
    return { frameNumbers: arr, frameCount: arr.length };
  }, [framesResume]);
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  // (Eliminado: `editingGroupId` / `editingGroupName` useStates — solo los
  // leían `startEditingGroup` / `saveGroupName` / `handleGroupKeyDown`, todos
  // ya borrados como dead code.)
  const [expandedLayers, setExpandedLayers] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  // showCreateGroup: el setter se usa (functional update en bundle), el valor no.
  // eslint-disable-next-line no-unused-vars
  const [showCreateGroup, setShowCreateGroup] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState([]); // [1, 2, 3, 4, etc]

// (Eliminados useStates sin read: `draggedItem`/`dragOverItem`/`dropIndicator`/
// `highlightedLayer` del drag-and-drop, `loopEnabled` sin UI de loop en este
// archivo, y `selectedLayerFrames`/`multiSelectMode`/`selectedFrameRange` que
// solo los leía el código de selección multi-frame por capa ya borrado.)

// (Eliminado: `isOnionActive` useState — sin lectura; el estado real de
// onion skin viene de `onionFramesConfig.enabled` / `onionSkinEnabled` del padre.)

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

  // Menú contextual del strip de frame-numbers (header del timeline)
  const [contextMenuHeader, setContextMenuHeader] = useState({
    isVisible: false,
    position: { x: 0, y: 0 }
  });

  // Ancho real (en px) de cada FrameNumberCell, leido del DOM via useLayoutEffect.
  // TagBand lo necesita para alinear las bandas con el grid del strip.
  const [headerCellWidth, setHeaderCellWidth] = useState(28);
  const headerFramesRef = useRef(null);

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
    setContextMenuHeader(prev => ({ ...prev, isVisible: false }));
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

  // --- Menú contextual del header (strip de frame-numbers) ---
  // Derivados usados tanto en menuHeaderActions como en el <CustomContextMenu> header.
  const focusFrame = selectedFrames.length === 1 ? selectedFrames[0] : currentFrame;
  const tagsHere = animationTags.filter(t => focusFrame >= t.from && focusFrame <= t.to);
  const selRange = selectedFrames.length >= 1
    ? { from: Math.min(...selectedFrames), to: Math.max(...selectedFrames) }
    : null;

  const menuHeaderActions = [
    {
      label: selRange
        ? `Crear tag (frames ${selRange.from}–${selRange.to})`
        : 'Crear tag con seleccion',
      icon: '+',
      disabled: !selRange,
      type: 'text',
      placeholder: 'Nombre del tag (p. ej. walk)',
      getValue: () => '',
      setValue: (name) => {
        const trimmed = String(name).trim();
        if (!trimmed || !selRange) return;
        const tag = createTag({ name: trimmed, from: selRange.from, to: selRange.to });
        setAnimationTags?.(addTag(animationTags, tag));
      }
    },
    {
      label: selRange && selectedFrames.length >= 2
        ? `Reproducir ${selRange.from}–${selRange.to} en bucle`
        : 'Reproducir rango en bucle',
      icon: '↻',
      disabled: !(selRange && selectedFrames.length >= 2),
      onClick: () => {
        if (!selRange) return;
        const api = playerApiRef?.current;
        if (!api) return;
        setLoopEnabled?.(true);
        api.setFrameRange?.({ start: selRange.from, end: selRange.to });
        api.setPlaybackMode?.('forward');
        api.setFrame?.(selRange.from);
        api.play?.();
        setContextMenuHeader(prev => ({ ...prev, isVisible: false }));
      }
    },
    ...tagsHere.flatMap(tag => [
      {
        label: `Reproducir tag «${tag.name}»`,
        icon: '▶',
        onClick: () => {
          handlePlayTag?.(tag);
          setContextMenuHeader(prev => ({ ...prev, isVisible: false }));
        }
      },
      {
        // Picker de color: pre-carga el color actual del tag, en confirm
        // actualiza el tag por id (inmutable). El menu se cierra al confirmar
        // porque CustomContextMenu desactiva el input tras setValue.
        label: `Color del tag «${tag.name}»`,
        icon: '🎨',
        type: 'color',
        getValue: () => tag.color || '#4a90e2',
        setValue: (color) => {
          setAnimationTags?.(updateTag(animationTags, tag.id, { color }));
        },
      },
      {
        label: `Eliminar tag «${tag.name}»`,
        icon: '×',
        danger: true,
        onClick: () => {
          setAnimationTags?.(removeTag(animationTags, tag.id));
          setContextMenuHeader(prev => ({ ...prev, isVisible: false }));
        }
      }
    ])
  ];


//-------GESTION DEL MENU CONTEXTUAL AL DAR CLICK DERECHO -----------------------//



//---- gestion de multiseleccion ----//


// Agregar solo este estado al componente LayerAnimation
const [isDragging, setIsDragging] = useState(false);
const [isDraggingLayerFrame, setIsDraggingLayerFrame] = useState(false);

// (Eliminados: `handleFrameMouseDown` / `handleFrameMouseEnter` — eran top-level
// para un frame-numbers strip que este archivo no rendera. Si se retoma el
// strip, la celda memoizada `FrameNumberCell` vive en `layerAnimation.jsx`.)

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


// (Eliminado: `handleFrameSelection` — solo lo llamaba `handleFrameMouseDown`
// ya borrado.)

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
 

// (Eliminados: `handlePrevFrame` / `handleNextFrame` / `handleFirstFrame` /
// `handleLastFrame` — no hay playback header en este archivo. Los controles
// de reproducción viven en `layerAnimation.jsx`.)





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

  // Selectores derivados, memoizados sobre `layers` / `pixelGroups`:
  //
  // - `orderedLayers`: capas principales (no-grupo) ordenadas por zIndex DESC.
  //   Reemplaza `getOrderedLayers()` que se recalculaba en CADA render
  //   (filter+sort = O(N log N) aunque nada haya cambiado).
  // - `childrenByParent`: Map<parentId, childLayer[]> precomputado. Reemplaza
  //   `getGroupLayersForParent(id)` llamado en cada `renderLayerWithTimeline`.
  //   Sin esto: O(N²) (N capas × filter sobre N). Con esto: O(N) total.
  // - `layerGroupsCounts`: Record<layerId, count>. Evita `Object.values(...)`
  //   por capa en el render body.
  const orderedLayers = useMemo(
    () =>
      layers
        .filter(l => !l.isGroupLayer)
        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)),
    [layers]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map();
    for (const layer of layers) {
      if (!layer.isGroupLayer) continue;
      const arr = map.get(layer.parentLayerId);
      if (arr) arr.push(layer);
      else map.set(layer.parentLayerId, [layer]);
    }
    // Orden consistente con el DOM: los hijos expandidos van de zIndex DESC.
    for (const arr of map.values()) {
      arr.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    }
    return map;
  }, [layers]);

  const layerGroupsCounts = useMemo(() => {
    const counts = {};
    if (pixelGroups) {
      for (const layerId in pixelGroups) {
        const g = pixelGroups[layerId];
        counts[layerId] = g ? Object.keys(g).length : 0;
      }
    }
    return counts;
  }, [pixelGroups]);

  const getVisualLayerIndex = (layer) =>
    orderedLayers.findIndex(l => l.id === layer.id);

  const isFirstLayer = (layer) => {
    if (layer.isGroupLayer) return false;
    return getVisualLayerIndex(layer) === 0;
  };

  const isLastLayer = (layer) => {
    if (layer.isGroupLayer) return false;
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

  // Re-activados porque ahora el botón "Nueva capa" + ↑↓ viven en la esquina
  // top-left del grid (encima de la columna de capas), no en la barra de playback.
  const handleMoveActiveLayerUp = () => {
    if (canMoveActiveLayerUp()) moveLayerUp(activeLayerId);
  };
  const handleMoveActiveLayerDown = () => {
    if (canMoveActiveLayerDown()) moveLayerDown(activeLayerId);
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

// --- Handlers para el HEADER ROW de frame-numbers (top-level, sin layer) ---
// Aquí la selección es "global" (afecta a `selectedFrames`), no por capa.
// Click = seleccionar un frame. Shift+click = rango. Ctrl/Cmd = toggle múltiple.
// Drag (con mousedown + mouseenter mientras isDraggingHeader) = seleccionar varios.
const [isDraggingHeader, setIsDraggingHeader] = useState(false);

// --- Resizer: ajusta --layer-info-width dinámicamente, arrastrando el borde
// derecho de la columna de capas. El valor persiste en localStorage. ---
const LAYER_INFO_WIDTH_MIN = 140;
const LAYER_INFO_WIDTH_MAX = 500;
const LAYER_INFO_WIDTH_KEY = 'pixcalli.layerInfoWidth';

// Restaura el ancho guardado en localStorage al montar.
useEffect(() => {
  const saved = localStorage.getItem(LAYER_INFO_WIDTH_KEY);
  if (saved) {
    const n = parseInt(saved, 10);
    if (Number.isFinite(n) && n >= LAYER_INFO_WIDTH_MIN && n <= LAYER_INFO_WIDTH_MAX) {
      document.documentElement.style.setProperty('--layer-info-width', `${n}px`);
    }
  }
}, []);

const [isResizingLayers, setIsResizingLayers] = useState(false);
const resizeStartXRef = useRef(0);
const resizeStartWidthRef = useRef(220);

const handleResizerMouseDown = useCallback((e) => {
  e.preventDefault();
  e.stopPropagation();
  resizeStartXRef.current = e.clientX;
  const current = getComputedStyle(document.documentElement)
    .getPropertyValue('--layer-info-width').trim();
  const n = parseInt(current, 10);
  resizeStartWidthRef.current = Number.isFinite(n) ? n : 220;
  setIsResizingLayers(true);
}, []);

useEffect(() => {
  if (!isResizingLayers) return;
  const onMove = (e) => {
    const delta = e.clientX - resizeStartXRef.current;
    const next = Math.max(
      LAYER_INFO_WIDTH_MIN,
      Math.min(LAYER_INFO_WIDTH_MAX, resizeStartWidthRef.current + delta)
    );
    document.documentElement.style.setProperty('--layer-info-width', `${next}px`);
  };
  const onUp = () => {
    setIsResizingLayers(false);
    const final = getComputedStyle(document.documentElement)
      .getPropertyValue('--layer-info-width').trim();
    try { localStorage.setItem(LAYER_INFO_WIDTH_KEY, final); } catch { /* noop */ }
  };
  // Durante el drag: cursor global + desactivar selección de texto.
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  return () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
}, [isResizingLayers]);

// Medir el ancho real de la primera celda del header tras el layout.
// Se re-mide cuando cambia el numero de frames (puede afectar el flex/grid).
useLayoutEffect(() => {
  const el = headerFramesRef.current?.querySelector('.frame-number-cell');
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setHeaderCellWidth(rect.width);
  }
}, [frameNumbers.length]);

function handleHeaderFrameSelection(frameNumber, event) {
  const { ctrlKey, metaKey, shiftKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;
  if (shiftKey && selectedFrames.length > 0) {
    const lastSelected = Math.max(...selectedFrames);
    const start = Math.min(lastSelected, frameNumber);
    const end = Math.max(lastSelected, frameNumber);
    const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    setSelectedFrames(range);
    setActiveFrame(Math.max(...range));
  } else if (isCtrlOrCmd) {
    const newSelection = selectedFrames.includes(frameNumber)
      ? selectedFrames.filter(f => f !== frameNumber)
      : [...selectedFrames, frameNumber].sort((a, b) => a - b);
    setSelectedFrames(newSelection);
    if (newSelection.length > 0) setActiveFrame(Math.max(...newSelection));
  } else {
    setSelectedFrames([frameNumber]);
    setActiveFrame(frameNumber);
  }
}

function handleHeaderFrameMouseDown(frameNumber, event) {
  clearCurrentSelection();
  const { ctrlKey, metaKey, shiftKey } = event;
  const isCtrlOrCmd = ctrlKey || metaKey;
  if (shiftKey || isCtrlOrCmd) {
    handleHeaderFrameSelection(frameNumber, event);
    setIsDraggingHeader(false);
  } else {
    setIsDraggingHeader(true);
    setSelectedFrames([frameNumber]);
    setActiveFrame(frameNumber);
  }
}

const handleHeaderFrameMouseEnter = (frameNumber) => {
  if (isDraggingHeader) {
    setSelectedFrames(prev => {
      const next = prev.includes(frameNumber)
        ? prev
        : [...prev, frameNumber].sort((a, b) => a - b);
      if (next.length > 0) setActiveFrame(Math.max(...next));
      return next;
    });
  }
};

// Mouseup global para terminar el drag del header.
useEffect(() => {
  const onUp = () => { if (isDraggingHeader) setIsDraggingHeader(false); };
  document.addEventListener('mouseup', onUp);
  document.addEventListener('mouseleave', onUp);
  return () => {
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('mouseleave', onUp);
  };
}, [isDraggingHeader]);

// Latest-ref pattern para pasar handlers estables a FrameNumberCell
// (sin invalidar su React.memo al cambiar estado no relacionado).
const headerHandlersRef = useRef(null);
useEffect(() => {
  headerHandlersRef.current = {
    onMouseDown: handleHeaderFrameMouseDown,
    onMouseEnter: handleHeaderFrameMouseEnter,
    onContextMenu: (frameNumber, e) => {
      e.preventDefault();
      // Si el frame clickeado no está en la selección, seleccionarlo en solitario
      if (!selectedFrames.includes(frameNumber)) {
        setSelectedFrames([frameNumber]);
        setActiveFrame(frameNumber);
      }
      setContextMenuHeader({
        isVisible: true,
        position: { x: e.clientX, y: e.clientY }
      });
    },
  };
});
const stableHeaderFrameMouseDown = useCallback(
  (frameNumber, event) => headerHandlersRef.current?.onMouseDown(frameNumber, event),
  []
);
const stableHeaderFrameMouseEnter = useCallback(
  (frameNumber) => headerHandlersRef.current?.onMouseEnter(frameNumber),
  []
);
const stableHeaderFrameContextMenu = useCallback(
  (frameNumber, e) => headerHandlersRef.current?.onContextMenu(frameNumber, e),
  []
);


// Builder recursivo para `LayerRow`. Usa los selectores memoizados
// (`childrenByParent`, `layerGroupsCounts`) en vez de llamar a las funciones
// O(N) del LayerManager en cada render — bajando el render global de O(N²) a
// O(N) sobre el número de capas.
//
// (No envolvemos en `useCallback`: la función solo se invoca en el render
// body, nunca se pasa como prop, así que la identidad estable no aporta nada
// — y además `useCallback` rompería la recursión self-referenciada.)
const renderLayerWithTimeline = (layer) => {
  const children = childrenByParent.get(layer.id);
  const isExpanded = !!expandedLayers[layer.id];
  const hasChildren = !!children && children.length > 0;
  const layerGroupsCount = layerGroupsCounts[layer.id] || 0;

  const elementsToRender = [];

  elementsToRender.push(
    <LayerRow
      key={layer.id}
      layer={layer}
      isExpanded={isExpanded}
      hasChildren={hasChildren}
      layerGroupsCount={layerGroupsCount}
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
    // `children` ya viene ordenado por zIndex DESC desde `childrenByParent`.
    for (const childLayer of children) {
      const childRows = renderLayerWithTimeline(childLayer);
      for (let i = 0; i < childRows.length; i++) {
        elementsToRender.push(childRows[i]);
      }
    }
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
      <CustomContextMenu
        isVisible={contextMenuHeader.isVisible}
        position={contextMenuHeader.position}
        onClose={() => setContextMenuHeader(prev => ({ ...prev, isVisible: false }))}
        actions={menuHeaderActions}
        header={{
          title: selRange && selectedFrames.length >= 2
            ? `Frames ${selRange.from}–${selRange.to}`
            : `Frame ${focusFrame}`
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

    
      



      {/* Timeline principal: GRID con header-row (frame-numbers) + layer rows.
          Todos comparten el mismo layout de columnas vía `--layer-info-width`
          aplicado tanto al `.timeline-header-left-placeholder` como al
          `.layer-info` de cada LayerRow. De esa forma el frame-number #N en
          la fila superior queda EXACTAMENTE encima de la celda #N en cada
          capa de abajo. */}
      <div className="timeline-container">
        {/* Header row: frame-numbers strip column-aligned con las filas de capas */}
        <div className="timeline-header-row">
          {/* Esquina top-left del grid: botones de gestión de capas
              (Nueva / ↑ / ↓). Sticky-left + sticky-top → siempre visibles. */}
          <div className="timeline-header-left-placeholder">
            <div className="layers-corner-actions">
              <button
                type="button"
                className="corner-add-layer-btn"
                onClick={() => {
                  clearCurrentSelection();
                  // `addLayer` internamente hace `setActiveLayerId(newLayerId)`,
                  // pero lo seteamos explícito aquí también para blindar el
                  // caso donde el batcher de React coalesce múltiples setStates
                  // y el orden de commit pudiera dejar al anterior activeLayerId
                  // ganando. El setState extra es idempotente si es el mismo ID.
                  const newLayerId = addLayer();
                  if (newLayerId) setActiveLayerId(newLayerId);
                }}
                title="Añadir nueva capa"
              >
                <BiSolidLayerPlus />
                <span>Nueva</span>
              </button>
              <button
                type="button"
                className="corner-move-btn"
                onClick={handleMoveActiveLayerUp}
                title="Mover capa activa arriba"
                disabled={!canMoveActiveLayerUp()}
              >
                <LuArrowUp />
              </button>
              <button
                type="button"
                className="corner-move-btn"
                onClick={handleMoveActiveLayerDown}
                title="Mover capa activa abajo"
                disabled={!canMoveActiveLayerDown()}
              >
                <LuArrowDown />
              </button>
            </div>
          </div>
          <div className="timeline-header-frames-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            <TagBand
              tags={animationTags}
              frameNumbers={frameNumbers}
              cellWidth={headerCellWidth}
              onClickTag={(tag) => {
                const range = [];
                for (let f = tag.from; f <= tag.to; f++) range.push(f);
                setSelectedFrames(range);
                setActiveFrame(tag.to);
              }}
              onDoubleClickTag={(tag) => handlePlayTag?.(tag)}
              onContextMenuTag={(tag, e) => {
                if (!selectedFrames.includes(tag.from)) setSelectedFrames([tag.from]);
                setContextMenuHeader({
                  isVisible: true,
                  position: { x: e.clientX, y: e.clientY }
                });
              }}
            />
            <div className="timeline-header-frames" ref={headerFramesRef}>
              {frameNumbers.map((frameNumber) => {
                const isSelected = selectedFrames.includes(frameNumber);
                // Durante playback: iluminar el frame que el motor de animación
                // está mostrando. Cuando no hay playback: iluminar el frame
                // seleccionado por el usuario.
                const isCurrent = isPlaying && animationTickFrame != null
                  ? animationTickFrame === frameNumber
                  : currentFrame === frameNumber;
                return (
                  <FrameNumberCell
                    key={frameNumber}
                    frameNumber={frameNumber}
                    isCurrent={isCurrent}
                    isSelected={isSelected}
                    onMouseDown={stableHeaderFrameMouseDown}
                    onMouseEnter={stableHeaderFrameMouseEnter}
                    onContextMenu={(e) => stableHeaderFrameContextMenu(frameNumber, e)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Layer rows: cada una con su LayerRow (layer-info + timeline-frames) */}
        <div className="timeline-layers">
          {orderedLayers.map(layer => renderLayerWithTimeline(layer)).flat()}
        </div>

        {/* Resizer: `position: absolute` hijo directo de `.timeline-container`
            (position: relative). Dentro de un overflow:auto, los children con
            position:absolute se posicionan relativos al PADDING BOX del
            contenedor (NO al content scrolleado) — efectivamente "fixed al
            viewport del scroll", que es lo que queremos: el grip siempre
            marca la frontera entre capas y frames, sin importar el scroll. */}
        <div
          className={`layers-column-resizer-grip ${isResizingLayers ? 'resizing' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar columna de capas"
          onMouseDown={handleResizerMouseDown}
        />
      </div>
    </>
  );
};


export default FramesTimeline;
