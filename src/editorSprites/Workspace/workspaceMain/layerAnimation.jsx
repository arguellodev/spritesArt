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
  LuChevronUp,
  LuChevronLeft,
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
  LuMonitor,
  LuPalette,
  LuPencil,
  LuTag,
  LuFilm,
} from "react-icons/lu";
import { BiSolidLayerPlus } from "react-icons/bi";
import { createTag, addTag, removeTag, updateTag, findOverlappingTag } from '../animation/animationTags';
import { BLEND_MODES, BLEND_GROUP_LABELS, getBlendModeLabel } from '../blendModes';



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

  // Modos de fusión
  // eslint-disable-next-line no-unused-vars
  resolveLayerBlendMode,
  setLayerBlendMode,
  setFrameBlendModeOverride,

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

  // Bucle global (compartido con PlayAnimation, lift-eado al workspaceContainer)
  loopEnabled,
  setLoopEnabled,

  // Tags + API imperativo del player (para reproducir tags y rangos ad-hoc en
  // las acciones de los menus contextuales y de TagBand)
  animationTags = [],
  setAnimationTags,
  handlePlayTag,
  handlePlayRange,
  playerApiRef,
  // Ref que el padre (workspaceContainer) provee para que LayerAnimation
  // exponga su API imperativa de player (el "main player") y handlePlayTag
  // pueda dirigir bucles a este reproductor en vez del mini.
  mainPlayerApiRef,
  // Info del bucle activo (compartido con el chip del mini player). Si
  // contiene tagName, lo mostramos en el chip principal junto con el rango.
  loopInfo,
  // Limpia loopInfo + reset frameRange a full. Compartido con el ✕ del chip.
  onClearLoop,

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

  // Colapso del panel (controlado desde workspaceContainer)
  isCollapsed = false,
  onToggleCollapse,
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
  stop,
  frameRange,
  setFrameRange,
  setFrame,
  setFrameRangeSafe,
  setPlaybackModeSafe,
  setPlaybackSpeedSafe,
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
  loopEnabled,
  onTimeUpdate,
  onFrameChange,
  syncedFrameNumber: currentFrame,
});

// Exposicion del API imperativo del main player al padre via ref. Mismo
// shape que el de PlayAnimation (mini), asi handlePlayTag puede dispatcher
// indistintamente a uno u otro segun el target. useEffect sin deps array
// re-popula en cada render para mantener referencias frescas.
useEffect(() => {
  if (!mainPlayerApiRef) return;
  mainPlayerApiRef.current = {
    play, pause, stop,
    setFrame,
    setFrameRange: setFrameRangeSafe,
    setPlaybackMode: setPlaybackModeSafe,
    setPlaybackSpeed: setPlaybackSpeedSafe,
  };
});

// Chip de "Bucle: A–B": visible cuando el rango activo del reproductor no
// cubre el total de frames disponibles. Convertimos los indices del player
// (0-based dentro de frameKeys) a frame-numbers visibles (1-based).
const totalFrames = frameNumbers.length;
const isFullRange = frameRange.start === 0 && frameRange.end === Math.max(0, totalFrames - 1);
const rangeFromFrame = frameNumbers[frameRange.start];
const rangeToFrame = frameNumbers[frameRange.end];

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

  // Derivados para las entradas de tag/loop del menú contextual de celda de frame
  const focusFrame = selectedFrames.length === 1 ? selectedFrames[0] : currentFrame;
  const tagsAtFocus = animationTags.filter(t => focusFrame >= t.from && focusFrame <= t.to);
  const selRange = selectedFrames.length >= 1
    ? { from: Math.min(...selectedFrames), to: Math.max(...selectedFrames) }
    : null;

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
    }*/,
    // Aseprite-like: prohibir solapamiento. Si selRange pisa otro tag, se
    // deshabilita y el label dice con cual choca.
    (() => {
      const rc = selRange ? selRange.to - selRange.from + 1 : 0;
      const conflictTag = selRange
        ? findOverlappingTag(animationTags, selRange.from, selRange.to)
        : null;
      return {
        label: !selRange
          ? 'Crear tag con seleccion'
          : conflictTag
            ? `Crear tag · choca con «${conflictTag.name}»`
            : `Crear tag · ${rc} frame${rc === 1 ? '' : 's'} (${selRange.from}–${selRange.to})`,
        icon: <LuTag size={14} />,
        disabled: !selRange || !!conflictTag,
        type: 'text',
        placeholder: 'Nombre del tag (p. ej. walk)',
        helperText: selRange && !conflictTag
          ? `${rc} frame${rc === 1 ? '' : 's'}:  ${selRange.from} → ${selRange.to}`
          : null,
        getValue: () => '',
        setValue: (name) => {
          const trimmed = String(name).trim();
          if (!trimmed || !selRange) return;
          if (findOverlappingTag(animationTags, selRange.from, selRange.to)) return;
          setAnimationTags?.(addTag(animationTags, createTag({
            name: trimmed,
            from: selRange.from,
            to: selRange.to,
          })));
        }
      };
    })(),
    // Dos entradas: reproducir el rango aqui (main) o en panel (mini).
    // Delegamos en handlePlayRange (workspaceContainer) que mantiene
    // loopInfo coherente entre ambos chips.
    {
      label: selRange && selectedFrames.length >= 2
        ? `Reproducir aqui ${selRange.to - selRange.from + 1} frames (${selRange.from}–${selRange.to})`
        : 'Reproducir rango aqui',
      icon: <LuRotateCcw size={14} />,
      disabled: !(selRange && selectedFrames.length >= 2),
      onClick: () => {
        if (!selRange) return;
        handlePlayRange?.(selRange.from, selRange.to, 'main');
        handleCloseMenu();
      }
    },
    {
      label: selRange && selectedFrames.length >= 2
        ? `Reproducir en panel ${selRange.to - selRange.from + 1} frames (${selRange.from}–${selRange.to})`
        : 'Reproducir rango en panel',
      icon: <LuMonitor size={14} />,
      disabled: !(selRange && selectedFrames.length >= 2),
      onClick: () => {
        if (!selRange) return;
        handlePlayRange?.(selRange.from, selRange.to, 'mini');
        handleCloseMenu();
      }
    },
    ...tagsAtFocus.flatMap(tag => [
      {
        label: `Reproducir aqui «${tag.name}»`,
        icon: <LuPlay size={14} />,
        onClick: () => { handlePlayTag?.(tag, 'main'); handleCloseMenu(); }
      },
      {
        label: `Reproducir en panel «${tag.name}»`,
        icon: <LuMonitor size={14} />,
        onClick: () => { handlePlayTag?.(tag, 'mini'); handleCloseMenu(); }
      },
      {
        label: `Renombrar tag «${tag.name}»`,
        icon: <LuPencil size={14} />,
        type: 'text',
        placeholder: 'Nuevo nombre',
        helperText: `Frames: ${tag.from} → ${tag.to}`,
        getValue: () => tag.name,
        setValue: (name) => {
          const trimmed = String(name).trim();
          if (!trimmed) return;
          setAnimationTags?.(updateTag(animationTags, tag.id, { name: trimmed }));
        },
      },
      {
        // Picker de color: pre-carga el color actual; confirm aplica updateTag.
        label: `Color del tag «${tag.name}»`,
        icon: <LuPalette size={14} />,
        type: 'color',
        getValue: () => tag.color || '#4a90e2',
        setValue: (color) => {
          setAnimationTags?.(updateTag(animationTags, tag.id, { color }));
        },
      },
      {
        label: `Eliminar tag «${tag.name}»`,
        icon: <LuX size={14} />,
        danger: true,
        onClick: () => {
          setAnimationTags?.(removeTag(animationTags, tag.id));
          handleCloseMenu();
        }
      }
    ])
  ];

  // === Items para submenús de modos de fusión ===
  //
  // Construye la lista agrupada de modos para el submenu del CustomContextMenu.
  // `currentMode` se marca con `checked: true`. Cada cambio de grupo inserta
  // un divider con el label del grupo (BLEND_GROUP_LABELS).
  const buildBlendModeItems = (currentMode, onPick) => {
    const items = [];
    let lastGroup = null;
    for (const m of BLEND_MODES) {
      if (m.group !== lastGroup && BLEND_GROUP_LABELS[m.group]) {
        items.push({ divider: true, label: BLEND_GROUP_LABELS[m.group] });
      }
      lastGroup = m.group;
      items.push({
        id: `blend-${m.id}`,
        label: m.label,
        checked: currentMode === m.id,
        onClick: () => onPick(m.id),
      });
    }
    return items;
  };

  // Modo de capa actual (lee del frame.layers[i].blendMode del activo)
  const layerBlendCurrent = (() => {
    if (!activeLayerId) return 'normal';
    const layer = layers.find(l => l.id === activeLayerId);
    return layer?.blendMode ?? 'normal';
  })();

  // Override per-frame del activo (null si hereda)
  const frameOverride = (() => {
    if (!activeLayerId) return null;
    const frame = frames[currentFrame];
    const layer = frame?.layers.find(l => l.id === activeLayerId);
    return layer?.blendModeOverride ?? null;
  })();

  const layerBlendItems = buildBlendModeItems(
    layerBlendCurrent,
    (modeId) => setLayerBlendMode(activeLayerId, modeId)
  );

  const frameBlendItems = [
    {
      id: 'blend-inherit',
      label: 'Heredar capa',
      checked: frameOverride === null,
      onClick: () => setFrameBlendModeOverride(activeLayerId, currentFrame, null),
    },
    { divider: true, label: '' },
    ...buildBlendModeItems(
      frameOverride ?? layerBlendCurrent,
      (modeId) => setFrameBlendModeOverride(activeLayerId, currentFrame, modeId)
    ),
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
      label: `Modo de fusión (capa) — ${getBlendModeLabel(layerBlendCurrent)}`,
      icon: <LuLayers />,
      type: 'submenu',
      items: layerBlendItems,
    },
    {
      label: frameOverride !== null
        ? `Modo de fusión (este frame) · ${getBlendModeLabel(frameOverride)}`
        : 'Modo de fusión (este frame)',
      icon: <LuFilm />,
      type: 'submenu',
      items: frameBlendItems,
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

// (Eliminados `stableHandleFrameMouseDown`/`stableHandleFrameMouseEnter` —
// alimentaban el strip de frame-numbers de la animation-bar, que se movió
// al header-row de FramesTimeline. Los handlers originales abajo siguen
// declarados por si se re-enable el `renderLayerWithTimeline` dead code.)

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

  // --- Navegación RÁPIDA entre capas (visible siempre, vital en modo
  // collapsed donde el timeline con las filas no está renderizado) ---
  // Convención visual del editor: zIndex DESC = top-to-bottom en el stack.
  // "prev" = capa visualmente arriba (mayor zIndex); "next" = abajo.
  const handlePrevLayer = () => {
    const ordered = layers
      .filter(l => !l.isGroupLayer)
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    const idx = ordered.findIndex(l => l.id === activeLayerId);
    if (idx > 0) {
      clearCurrentSelection();
      handleLayerChange(ordered[idx - 1].id);
    }
  };
  const handleNextLayer = () => {
    const ordered = layers
      .filter(l => !l.isGroupLayer)
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    const idx = ordered.findIndex(l => l.id === activeLayerId);
    if (idx >= 0 && idx < ordered.length - 1) {
      clearCurrentSelection();
      handleLayerChange(ordered[idx + 1].id);
    }
  };
  const activeLayerName = layers.find(l => l.id === activeLayerId)?.name || '—';
  const canPrevLayer = (() => {
    const ordered = layers.filter(l => !l.isGroupLayer);
    return ordered.length > 1 && !isFirstLayer(layers.find(l => l.id === activeLayerId) || {});
  })();
  const canNextLayer = (() => {
    const ordered = layers.filter(l => !l.isGroupLayer);
    return ordered.length > 1 && !isLastLayer(layers.find(l => l.id === activeLayerId) || {});
  })();

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
      {/* Barra de animación unificada — UNA SOLA FILA a la misma altura.
          - Sticky-left: TODOS los controles (playback + layer + frame tools).
          - Centro: frame-numbers strip (scroll horizontal).
          - Sticky-right: onion skin.
          Mismo alto, mismo contenedor, un solo scrollbar continuo. */}
      <div className="animation-bar-unified">
        <div className="unified-timeline-left">
          {/* Playback */}
          <div className="toolbar-group" role="group" aria-label="Reproducción">
            <button onClick={handleFirstFrame} title="Primer frame" className="control-btn">
              <LuSkipBack />
            </button>
            <button onClick={handlePrevFrame} title="Frame anterior" className="control-btn">
              <LuStepBack />
            </button>
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              className="control-btn play-btn"
            >
              {isPlaying ? <LuPause /> : <LuPlay />}
            </button>
            <button onClick={handleNextFrame} title="Siguiente frame" className="control-btn">
              <LuStepForward />
            </button>
            <button onClick={handleLastFrame} title="Último frame" className="control-btn">
              <LuSkipForward />
            </button>
          </div>

          <div className="toolbar-divider" aria-hidden />

          {/* Velocidad + loop */}
          <div className="toolbar-group" role="group" aria-label="Velocidad">
            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              title={loopEnabled ? 'Desactivar bucle' : 'Activar bucle'}
              className={`setting-btn ${loopEnabled ? 'active' : ''}`}
            >
              <LuRotateCcw />
            </button>
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
            {!isFullRange && rangeFromFrame != null && rangeToFrame != null && (
              <div
                className="loop-range-chip"
                style={
                  loopInfo?.target === 'main' && loopInfo?.tagColor
                    ? { '--loop-chip-accent': loopInfo.tagColor }
                    : undefined
                }
                title={
                  loopInfo?.target === 'main' && loopInfo?.tagName
                    ? `Bucle: tag «${loopInfo.tagName}» (frames ${rangeFromFrame}–${rangeToFrame})`
                    : `Bucle activo: frames ${rangeFromFrame}–${rangeToFrame}`
                }
              >
                <span className="loop-range-chip__label">
                  {loopInfo?.target === 'main' && loopInfo?.tagName
                    ? `«${loopInfo.tagName}»`
                    : 'Bucle'}
                </span>
                <span className="loop-range-chip__value">{rangeFromFrame}–{rangeToFrame}</span>
                <button
                  className="loop-range-chip__close"
                  onClick={() => {
                    // Reset frameRange + clear loopInfo (si era target=main).
                    // Llamamos onClearLoop si existe (provisto por workspaceContainer);
                    // si no, fallback al reset directo de frameRange para mantener
                    // compatibilidad con call-sites legacy.
                    if (onClearLoop) onClearLoop('main');
                    else setFrameRange({ start: 0, end: Math.max(0, totalFrames - 1) });
                  }}
                  title="Salir del bucle"
                  aria-label="Salir del bucle"
                >
                  <LuX size={11} />
                </button>
              </div>
            )}
          </div>

          <div className="toolbar-divider" aria-hidden />

          {/* (Movido: "Nueva capa" + ↑↓ ahora viven en la esquina top-left
              del grid de FramesTimeline, encima de la columna de capas.) */}

          {/* Frame actual: badge + duración + acciones */}
          <div className="toolbar-group" role="group" aria-label="Frame actual">
            <span
              className="frame-badge"
              title={`Frame actual: ${currentFrame}`}
              aria-label={`Frame actual ${currentFrame}`}
            >
              {currentFrame}
            </span>
            <div className="frame-rate-control">
              <input
                type="number"
                min="10"
                max="1000"
                step="10"
                value={frames[currentFrame.toString()]?.frameDuration ?? 100}
                onChange={(e) => setFrameDuration(currentFrame, Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                onMouseUp={(e) => e.preventDefault()}
                className="frame-rate-input"
                title="Duración del frame (ms)"
                aria-label="Duración del frame en milisegundos"
              />
              <div className="frame-rate-spin" aria-hidden>
                <button
                  type="button"
                  className="frame-rate-spin-btn"
                  tabIndex={-1}
                  onClick={() => {
                    const cur = frames[currentFrame.toString()]?.frameDuration ?? 100;
                    setFrameDuration(currentFrame, Math.min(1000, cur + 10));
                  }}
                  title="Aumentar 10 ms"
                  aria-label="Aumentar duración"
                >
                  <LuChevronUp />
                </button>
                <button
                  type="button"
                  className="frame-rate-spin-btn"
                  tabIndex={-1}
                  onClick={() => {
                    const cur = frames[currentFrame.toString()]?.frameDuration ?? 100;
                    setFrameDuration(currentFrame, Math.max(10, cur - 10));
                  }}
                  title="Disminuir 10 ms"
                  aria-label="Disminuir duración"
                >
                  <LuChevronDown />
                </button>
              </div>
            </div>
            <span className="frame-rate-unit">ms</span>
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

          <div className="toolbar-divider" aria-hidden />

          {/* Navegación rápida entre capas — esencial cuando el panel está
              colapsado (no hay lista de filas visible). Doble clic en el
              nombre activa edición inline (mismo flujo que en LayerRow). */}
          <div className="toolbar-group layer-nav-group" role="group" aria-label="Capa activa">
            <button
              onClick={handlePrevLayer}
              disabled={!canPrevLayer}
              title="Capa anterior (arriba)"
              className="control-btn layer-nav-btn"
              aria-label="Capa anterior"
            >
              <LuChevronLeft />
            </button>
            {editingLayerId === activeLayerId ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={saveLayerName}
                onKeyDown={handleKeyDown}
                autoFocus
                onFocus={(e) => e.target.select()}
                className="layer-nav-input"
                aria-label="Editar nombre de capa"
              />
            ) : (
              <span
                className="layer-nav-label"
                title={`Capa actual: ${activeLayerName} — doble clic para renombrar`}
                aria-label={`Capa actual ${activeLayerName}`}
                onDoubleClick={(e) => {
                  const activeLayer = layers.find(l => l.id === activeLayerId);
                  if (activeLayer) startEditing(activeLayer, e);
                }}
              >
                {activeLayerName}
              </span>
            )}
            <button
              onClick={handleNextLayer}
              disabled={!canNextLayer}
              title="Capa siguiente (abajo)"
              className="control-btn layer-nav-btn"
              aria-label="Capa siguiente"
            >
              <LuChevronRight />
            </button>
          </div>

          <div className="toolbar-divider" aria-hidden />

          {/* Opacidad (layer en este frame) */}
          <div
            className="toolbar-group opacity-group"
            role="group"
            aria-label="Opacidad de la capa en este frame"
          >
            <label className="opacity-label">Op</label>
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
              aria-label="Opacidad"
            />
            <span className="opacity-value">{localOpacity}%</span>
          </div>
        </div>

        {/* Spacer flexible entre la toolbar izquierda y el onion-skin derecho.
            El strip de frame-numbers YA NO vive aquí — ahora es el header row
            de FramesTimeline (timeline.jsx) para que column-aligne con las
            filas de capas. */}
        <div className="unified-timeline-spacer" aria-hidden />

        {/* Sticky right: onion skin */}
        <div className="unified-timeline-right">
          <div
            className="onion-skin-toggle"
            onClick={() => { toggleOnionFrames(); }}
            title="Onion Skin"
            role="switch"
            aria-checked={!!onionFramesConfig.enabled}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggleOnionFrames();
              }
            }}
          >
            <LuLayers />
            <div className={`toggle-switch ${onionFramesConfig.enabled ? 'active' : ''}`}>
              <div className="toggle-slider"></div>
            </div>
          </div>
          <div className="onion-config-anchor">
            <button
              className="config-button"
              onClick={() => setOpenOnion(v => !v)}
              aria-expanded={openOnion}
              aria-haspopup="dialog"
              title="Configurar Onion Skin"
            >
              <LuSettings />
            </button>
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
          </div>
          {/* Toggle collapse: oculta el timeline grid de capas/frames y deja
              solo esta barra. La navegación de capas (layer-nav-group) +
              playback + frame-tools siguen funcionando — es el modo "HUD"
              para cuando el timeline no se necesita visible. */}
          {typeof onToggleCollapse === 'function' && (
            <button
              className="config-button collapse-toggle-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expandir panel de capas' : 'Colapsar panel de capas'}
              aria-label={isCollapsed ? 'Expandir panel' : 'Colapsar panel'}
              aria-pressed={isCollapsed}
            >
              {isCollapsed ? <LuChevronUp /> : <LuChevronDown />}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

// (FrameNumberCell movida a `./layerRow.jsx` como named export — la usa
// ahora `timeline.jsx` en su header row del grid. Ver ese archivo.)

export default LayerAnimation;
