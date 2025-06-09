import React, { useState, useCallback, useEffect } from 'react';
import './layerAnimation.css'
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
  
} from "react-icons/lu";

const LayerAnimation = ({ 
  layers,
  addLayer,
  deleteLayer,
  moveLayerUp,
  moveLayerDown,
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
  moveGroupToPosition
}) => {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [expandedLayers, setExpandedLayers] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(null);
  
  // Estados para drag and drop
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);
  const [highlightedLayer, setHighlightedLayer] = useState(null);

  // Estados para animación
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frameRate, setFrameRate] = useState(100); // milisegundos
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [frameCount, setFrameCount] = useState(3); // Simulamos 3 frames iniciales
  // Añadir estos estados después de los existentes
const [selectedLayerFrames, setSelectedLayerFrames] = useState({}); // {layerId: frameIndex}
const [multiSelectMode, setMultiSelectMode] = useState(false);
const [selectedFrameRange, setSelectedFrameRange] = useState(null); // {layerId, start, end}
  // Simulamos frames para cada capa (en una implementación real esto vendría de props)
  const [layerFrames, setLayerFrames] = useState(() => {
    const frames = {};
    layers.forEach(layer => {
      if (!layer.isGroupLayer) {
        frames[layer.id] = Array(frameCount).fill(null).map((_, i) => ({
          id: `${layer.id}_frame_${i}`,
          layerId: layer.id,
          frameIndex: i,
          isEmpty: Math.random() > 0.3, // Simulamos frames vacíos y llenos
          thumbnail: null, // En una implementación real, aquí iría la miniatura
          visible: true
        }));
      }
    });
    return frames;
  });


  // Después de la inicialización de layerFrames
useEffect(() => {
  // Crear frames para capas nuevas que no los tengan
  const newFrames = { ...layerFrames };
  let hasChanges = false;
  
  layers.forEach(layer => {
    if (!layer.isGroupLayer && !newFrames[layer.id]) {
      newFrames[layer.id] = Array(frameCount).fill(null).map((_, i) => ({
        id: `${layer.id}_frame_${i}`,
        layerId: layer.id,
        frameIndex: i,
        isEmpty: Math.random() > 0.3,
        thumbnail: null,
        visible: true
      }));
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    setLayerFrames(newFrames);
  }
}, [layers, frameCount]);
// Función para seleccionar frame específico de una capa
const selectLayerFrame = (layerId, frameIndex, ctrlKey = false) => {
  if (ctrlKey && multiSelectMode) {
    // Multi-selección
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
    // Selección simple
    setSelectedLayerFrames({ [layerId]: [frameIndex] });
    setActiveLayerId(layerId);
    goToFrame(frameIndex);
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
  console.log('Frames copiados:', selectedFrames);
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
    selectPixelGroup(layerId, newGroupId);
  }

  setActiveLayerId(newGroupId.groupLayerId);
  setNewGroupName('');
  setShowCreateGroup(null);
  setExpandedLayers(prev => ({ ...prev, [layerId]: true }));
};

const handleDeleteGroup = (layerId, groupId, e) => {
  e.stopPropagation();
  if (window.confirm('¿Eliminar grupo?')) deletePixelGroup(layerId, groupId);
};
  // Efecto para la reproducción automática
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame(prev => {
          const nextFrame = prev + 1;
          if (nextFrame >= frameCount) {
            if (loopEnabled) {
              return 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return nextFrame;
        });
      }, frameRate);
    }
    return () => clearInterval(interval);
  }, [isPlaying, frameRate, frameCount, loopEnabled]);

  // Funciones de control de animación
  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };
  const handlePrevFrame = () => {
    setCurrentFrame(prev => Math.max(0, prev - 1));
  };
  const handleNextFrame = () => {
    setCurrentFrame(prev => Math.min(frameCount - 1, prev + 1));
  };
  const handleFirstFrame = () => setCurrentFrame(0);
  const handleLastFrame = () => setCurrentFrame(frameCount - 1);

  // Función para añadir frame
  const addFrame = () => {
    const newFrameIndex = frameCount;
    setFrameCount(prev => prev + 1);
    
    // Añadir frame a todas las capas
    setLayerFrames(prev => {
      const newFrames = { ...prev };
      Object.keys(newFrames).forEach(layerId => {
        newFrames[layerId] = [
          ...newFrames[layerId],
          {
            id: `${layerId}_frame_${newFrameIndex}`,
            layerId: layerId,
            frameIndex: newFrameIndex,
            isEmpty: true,
            thumbnail: null,
            visible: true
          }
        ];
      });
      return newFrames;
    });
  };

  // Función para duplicar frame
  const duplicateFrame = (frameIndex) => {
    const newFrameIndex = frameCount;
    setFrameCount(prev => prev + 1);
    
    setLayerFrames(prev => {
      const newFrames = { ...prev };
      Object.keys(newFrames).forEach(layerId => {
        const sourceFrame = newFrames[layerId][frameIndex];
        newFrames[layerId] = [
          ...newFrames[layerId],
          {
            ...sourceFrame,
            id: `${layerId}_frame_${newFrameIndex}`,
            frameIndex: newFrameIndex,
          }
        ];
      });
      return newFrames;
    });
  };

  // Función para eliminar frame
  const deleteFrame = (frameIndex) => {
    if (frameCount <= 1) return;
    
    setFrameCount(prev => prev - 1);
    setLayerFrames(prev => {
      const newFrames = { ...prev };
      Object.keys(newFrames).forEach(layerId => {
        newFrames[layerId] = newFrames[layerId]
          .filter((_, i) => i !== frameIndex)
          .map((frame, i) => ({ ...frame, frameIndex: i, id: `${layerId}_frame_${i}` }));
      });
      return newFrames;
    });
    
    if (currentFrame >= frameCount - 1) {
      setCurrentFrame(frameCount - 2);
    }
  };

  // Función para alternar visibilidad de frame
  const toggleFrameVisibility = (layerId, frameIndex) => {
    setLayerFrames(prev => ({
      ...prev,
      [layerId]: prev[layerId].map((frame, i) => 
        i === frameIndex ? { ...frame, visible: !frame.visible } : frame
      )
    }));
  };

  // Función para ir a un frame específico
  const goToFrame = (frameIndex) => {
    setCurrentFrame(frameIndex);
  };

  // Funciones heredadas del LayerManager
  const getOrderedLayers = () => {
    return getHierarchicalLayers().sort((a, b) => {
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

  // Renderizado de layer con timeline
 // Reemplazar la función renderLayerWithTimeline existente
// Reemplazar la función renderLayerWithTimeline existente
const renderLayerWithTimeline = (layer, depth = 0) => {
  const isGroup = layer.isGroupLayer;
  const children = isGroup ? [] : getGroupLayersForParent(layer.id);
  const isExpanded = expandedLayers[layer.id];
  const hasChildren = children.length > 0;
  const layerGroups = getLayerGroups(layer.id);
  const frames = layerFrames[layer.id] || [];
  const selectedFrames = selectedLayerFrames[layer.id] || [];

  return (
    <div key={layer.id} className="animation-layer-row">
      {/* Parte izquierda - Info de la capa */}
      <div 
        className={`layer-info ${layer.visible ? 'visible' : 'hidden'} ${
          activeLayerId === layer.id ? 'selected' : ''
        }`}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={() => handleLayerChange(layer.id)}
      >
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
              {layer.name}
              {!isGroup && layerGroups.length > 0 && (
                <span className="group-count">({layerGroups.length})</span>
              )}
            </div>
          )}
          
          {/* Añadir toggle para expansión de grupos */}
          {hasChildren && (
            <button 
              className="expand-toggle"
              onClick={(e) => { e.stopPropagation(); toggleLayerExpansion(layer.id); }}
              title={isExpanded ? 'Colapsar' : 'Expandir'}
            >
              {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
            </button>
          )}
        </div>

        <div className="layer-actions">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveLayerId(layer.id);
              selectAllCanvas();
            }}
            title="Seleccionar contenido de la capa"
            className="layer-btn select-content-btn"
          >
            <LuMousePointer />
          </button>

          {/* Añadir botón para crear grupo */}
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
              if(layer.id === activeLayerId){
                clearCurrentSelection();
              }
              toggleLayerVisibility(layer.id); 
            }}
            title={layer.visible ? 'Ocultar' : 'Mostrar'}
            className="layer-btn"
          >
            {layer.visible ? <LuEye /> : <LuEyeOff />}
          </button>

          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              isGroup 
                ? deletePixelGroup(layer.parentLayerId, layer.id) 
                : deleteLayer(layer.id); 
            }}
            title="Eliminar"
            className="layer-btn delete-btn"
            disabled={!isGroup && layers.length <= 1}
          >
            <LuTrash2 />
          </button>
        </div>
        
        {/* Sección para crear grupo */}
        {showCreateGroup === layer.id && (
          <div className="create-group-section">
            <div className="create-group-input">
              <input
                type="text"
                placeholder="Nombre del grupo"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroup(layer.id);
                  if (e.key === 'Escape') setShowCreateGroup(null);
                }}
                autoFocus
              />
              <div className="group-actions">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateGroup(layer.id);
                  }}
                  className="confirm-btn"
                >
                  ✓
                </button>
                <button 
                  onClick={() => setShowCreateGroup(null)}
                  className="cancel-btn"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="selection-info">
              {selectedPixels?.length || 0} píxeles seleccionados
            </div>
          </div>
        )}
      </div>

      {/* Parte derecha - Timeline con selección mejorada */}
      <div className="timeline-frames">
        {!isGroup && frames.map((frame, frameIndex) => (
          <div
            key={frame.id}
            className={`timeline-frame ${frame.isEmpty ? 'empty' : 'filled'} ${
              frame.visible ? 'visible' : 'hidden'
            } ${currentFrame === frameIndex ? 'current' : ''} ${
              activeLayerId === layer.id && currentFrame === frameIndex ? 'active' : ''
            } ${selectedFrames.includes(frameIndex) ? 'selected-frame' : ''}`}
            onClick={(e) => {
              selectFrameRange(layer.id, frameIndex, e.shiftKey);
            }}
            onMouseDown={(e) => {
              selectLayerFrame(layer.id, frameIndex, e.ctrlKey || e.metaKey);
            }}
            title={`Frame ${frameIndex + 1} - ${frame.isEmpty ? 'Vacío' : 'Con contenido'}`}
          >
            <div className="frame-content">
              {frame.isEmpty ? (
                <div className="empty-indicator" />
              ) : (
                <div className="filled-indicator" />
              )}
            </div>
            
            {/* Indicador de selección de frame */}
            {selectedFrames.includes(frameIndex) && (
              <div className="frame-selection-indicator" />
            )}
            
            {/* Onion skin indicator */}
            {onionSkinEnabled && Math.abs(currentFrame - frameIndex) <= 2 && currentFrame !== frameIndex && (
              <div className={`onion-skin ${frameIndex < currentFrame ? 'previous' : 'next'}`} />
            )}

            {/* Frame visibility toggle */}
            <button
              className="frame-visibility-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleFrameVisibility(layer.id, frameIndex);
              }}
              title={frame.visible ? 'Ocultar frame' : 'Mostrar frame'}
            >
              {frame.visible ? <LuEye /> : <LuEyeOff />}
            </button>
          </div>
        ))}
      </div>
      
      {/* Renderizar grupos expandidos */}
      {isExpanded && hasChildren && (
        <div className="group-children">
          {children
            .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
            .map(childLayer => renderLayerWithTimeline(childLayer, depth + 1))
          }
        </div>
      )}
    </div>
  );
};

  return (
    <div className="layer-animation">
      {/* Header con controles de animación */}
      <div className="animation-header">
        <div className="header-left">
          <h3>Animación</h3>
          <div className="frame-info">
            Frame {currentFrame + 1} de {frameCount}
          </div>
        </div>
        
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
              onClick={handlePlay}
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
          </div>

          {/* Configuración de reproducción */}
          <div className="playback-settings">
            <div className="frame-rate-control">
              <label>FPS:</label>
              <input
                type="number"
                min="10"
                max="1000"
                step="10"
                value={frameRate}
                onChange={(e) => setFrameRate(Number(e.target.value))}
                className="frame-rate-input"
              />
              <span>ms</span>
            </div>
            
            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              title={loopEnabled ? 'Desactivar bucle' : 'Activar bucle'}
              className={`setting-btn ${loopEnabled ? 'active' : ''}`}
            >
              <LuRotateCcw />
            </button>
            
            <button
              onClick={() => setOnionSkinEnabled(!onionSkinEnabled)}
              title={onionSkinEnabled ? 'Desactivar onion skin' : 'Activar onion skin'}
              className={`setting-btn ${onionSkinEnabled ? 'active' : ''}`}
            >
              <LuLayers />
            </button>
          </div>
        </div>
        
        <div className="header-right">
          {/* Controles de capas */}
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
            onClick={addLayer}
            title="Añadir nueva capa"
          >
            + Capa
          </button>
         
<div className="frame-selection-controls">
  <button
    onClick={() => setMultiSelectMode(!multiSelectMode)}
    title={multiSelectMode ? 'Desactivar multi-selección' : 'Activar multi-selección'}
    className={`setting-btn ${multiSelectMode ? 'active' : ''}`}
  >
    <LuSettings />
  </button>
  
  <button
    onClick={copySelectedFrames}
    title="Copiar frames seleccionados"
    className="frame-control-btn"
    disabled={Object.keys(selectedLayerFrames).length === 0}
  >
    <LuCopy />
  </button>
  
  <button
    onClick={deleteSelectedFrames}
    title="Eliminar frames seleccionados"
    className="frame-control-btn"
    disabled={Object.keys(selectedLayerFrames).length === 0}
  >
    <LuTrash2 />
  </button>
  
  <button
    onClick={clearFrameSelection}
    title="Limpiar selección"
    className="frame-control-btn"
    disabled={Object.keys(selectedLayerFrames).length === 0}
  >
    <LuX />
  </button>
</div>
        </div>
      </div>

      {/* Timeline principal */}
      <div className="timeline-container">
        {/* Header de frames */}
        <div className="timeline-header">
          <div className="layers-header">
            <span>Capas</span>
          </div>
          <div className="frames-header">
            <div className="frame-numbers">
              {Array(frameCount).fill(null).map((_, i) => (
                <div
                  key={i}
                  className={`frame-number ${currentFrame === i ? 'current' : ''}`}
                  onClick={() => goToFrame(i)}
                >
                  {i + 1}
                </div>
              ))}
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
                onClick={() => duplicateFrame(currentFrame)}
                title="Duplicar frame actual"
                className="frame-control-btn"
              >
                <LuCopy />
              </button>
              <button
                onClick={() => deleteFrame(currentFrame)}
                title="Eliminar frame actual"
                className="frame-control-btn"
                disabled={frameCount <= 1}
              >
                <LuTrash2 />
              </button>
            </div>
          </div>
        </div>

        {/* Layers con timeline */}
        <div className="timeline-layers">
          {getOrderedLayers()
            .filter(layer => !layer.isGroupLayer) // Solo mostramos capas principales en animación
            .map(layer => renderLayerWithTimeline(layer))}
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