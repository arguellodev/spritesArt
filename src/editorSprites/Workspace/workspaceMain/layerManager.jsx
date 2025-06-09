import React, { useState, useCallback } from 'react';
//import './layerManager.css';
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
  LuGripVertical
} from "react-icons/lu";

const LayerManager = ({ 
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
  // Nuevas funciones para drag and drop (necesitarás implementarlas en el componente padre)
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

  // Función para obtener capas ordenadas correctamente (zIndex descendente = más reciente arriba)
  const getOrderedLayers = () => {
    return getHierarchicalLayers().sort((a, b) => {
      // Ordenar por zIndex descendente: las capas con mayor zIndex aparecen primero
      return (b.zIndex || 0) - (a.zIndex || 0);
    });
  };

  // Función para obtener el índice visual correcto de una capa
  const getVisualLayerIndex = (layer) => {
    const orderedLayers = layers
      .filter(l => !l.isGroupLayer) // Solo capas principales
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    return orderedLayers.findIndex(l => l.id === layer.id);
  };

  // Función para verificar si es la primera/última capa visualmente
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

  // Obtener la capa activa
  const getActiveLayer = () => {
    return layers.find(layer => layer.id === activeLayerId);
  };

  // Verificar si se pueden mover las capas desde el header
  const canMoveActiveLayerUp = () => {
    const activeLayer = getActiveLayer();
    return activeLayer && !activeLayer.isGroupLayer && !isFirstLayer(activeLayer);
  };

  const canMoveActiveLayerDown = () => {
    const activeLayer = getActiveLayer();
    return activeLayer && !activeLayer.isGroupLayer && !isLastLayer(activeLayer);
  };

  // Funciones para mover la capa activa desde el header
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

  // Funciones de Drag and Drop
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Para compatibilidad
    
    // Añadir clase visual al elemento arrastrado
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedItem(null);
    setDragOverItem(null);
    setDropIndicator(null);
    setHighlightedLayer(null); // Agregar esta línea
  };

  const handleDragOver = (e, targetItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    
    setDragOverItem(targetItem);
    setHighlightedLayer(targetItem.id); // Agregar esta línea
    
    // Calcular posición del indicador
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 1;
    const position = e.clientY < midpoint ? 'above' : 'below';
    
    setDropIndicator({ targetId: targetItem.id, position });
  };

  const handleDragLeave = (e) => {
    // Solo limpiar si realmente salimos del elemento
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverItem(null);
      setDropIndicator(null);
      setHighlightedLayer(null); // Agregar esta línea
    }
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    
    const position = dropIndicator?.position || 'below';
    
    // Lógica de reordenamiento según el tipo de elementos
    if (draggedItem.isGroupLayer && targetItem.isGroupLayer) {
      // Moviendo grupo a grupo - intercambiar posiciones
      moveGroupToPosition && moveGroupToPosition(
        draggedItem.parentLayerId, 
        draggedItem.id, 
        targetItem.parentLayerId, 
        targetItem.id, 
        position
      );
    } else if (draggedItem.isGroupLayer && !targetItem.isGroupLayer) {
      // Moviendo grupo a capa - mover grupo a otra capa
      moveGroupToLayer && moveGroupToLayer(
        draggedItem.parentLayerId, 
        draggedItem.id, 
        targetItem.id
      );
    } else if (!draggedItem.isGroupLayer && !targetItem.isGroupLayer) {
      // Moviendo capa a capa - reordenar capas
      const draggedIndex = layers.findIndex(l => l.id === draggedItem.id);
      const targetIndex = layers.findIndex(l => l.id === targetItem.id);
      
      let newPosition;
      if (position === 'above') {
        newPosition = targetIndex;
      } else {
        newPosition = targetIndex + 1;
      }
      
      moveLayerToPosition && moveLayerToPosition(draggedIndex, newPosition);
    } else if (!draggedItem.isGroupLayer && targetItem.isGroupLayer) {
      // No permitir mover capas dentro de grupos (o implementar lógica específica)
      console.log('No se puede mover una capa dentro de un grupo');
    }
    
    // Limpiar estados
    setDraggedItem(null);
    setDragOverItem(null);
    setDropIndicator(null);
  };

  // Función simplificada para manejar el cambio de capa activa
  const handleLayerChange = (layerId) => {
    clearCurrentSelection();
    // Solo cambiar la capa activa, sin seleccionar contenido automáticamente
    setActiveLayerId(layerId);
  };

  // Nueva función para seleccionar el contenido de una capa/grupo
  const handleSelectLayerContent = (layerId, e) => {
    e.stopPropagation();
    
    const groupID = Object.keys(pixelGroups?.[layerId] || {})[0] || null;

    // Limpiar selección actual si existe
    if (selectedGroup || selectedPixels?.length > 0) {
      clearCurrentSelection();
    }
    
    // Asegurar que la capa esté activa
    setActiveLayerId(layerId);

    // Cambiar a herramienta de selección y seleccionar contenido
    setTool('select');
    clearCurrentSelection();
    
    const pixels = selectPixelGroup(layerId, groupID);
    if (pixels?.length > 0) {
      // 1. Calcula el bounding box
      const xCoords = pixels.map(p => p.x);
      const yCoords = pixels.map(p => p.y);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);
  
      // 2. Simula el flujo del mouse: punto inicial -> punto final
      const startPoint = { x: 0, y: 0 };
      const endPoint = { x: 50, y: 50 };
  
      // 3. Primero setea solo el punto inicial (como el primer click del mouse)
      setSelectionCoords([startPoint]);
      
      // 4. Después de un breve delay, agrega el punto final
      setTimeout(() => {
        setSelectionCoords([startPoint, endPoint]);
        setSelectedPixels(pixels);
        setOriginalPixelColors(pixels.map(p => p.color || { r: 0, g: 0, b: 0, a: 1 }));
        setDragOffset({ x: 0, y: 0 });
        setSelectionActive(true);
      }, 50); // Delay similar al movimiento natural del mouse
    }
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

  // Funciones de edición de grupos
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

  // Gestión de expansión/colapso
  const toggleLayerExpansion = (layerId) => {
    setExpandedLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  // Creación de grupos
  const handleCreateGroup = (layerId) => {
    if (!selectedPixels?.length) {
      alert('Selecciona píxeles primero');
      return;
    }
  
    const groupName = newGroupName.trim() || `Grupo ${getLayerGroups(layerId).length + 1}`;

     // Aplicar el desplazamiento actual a las coordenadas de los píxeles
     const pixelsWithOffset = selectedPixels.map(pixel => ({
      ...pixel,
      x: pixel.x + dragOffset.x,
      y: pixel.y + dragOffset.y
    }));
    
    // Creamos el grupo y obtenemos su ID
    const newGroupId = createPixelGroup(layerId, pixelsWithOffset, groupName);
  
    // Seleccionamos el grupo recién creado
    if (newGroupId) {
      selectPixelGroup(layerId, newGroupId);
    }
    console.log(newGroupId);

    setActiveLayerId(newGroupId.groupLayerId);
    
    // Limpiamos
    setNewGroupName('');
    setShowCreateGroup(null);
    setExpandedLayers(prev => ({ ...prev, [layerId]: true }));
  };

  // Eliminación de grupos
  const handleDeleteGroup = (layerId, groupId, e) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar grupo?')) deletePixelGroup(layerId, groupId);
  };

  // Renderizado jerárquico mejorado con drag and drop
  const renderLayerNode = (layer, depth = 0) => {
    const isGroup = layer.isGroupLayer;
    const children = isGroup ? [] : getGroupLayersForParent(layer.id);
    const isExpanded = expandedLayers[layer.id];
    const hasChildren = children.length > 0;
    const layerGroups = getLayerGroups(layer.id);
    const isDraggedOver = dragOverItem?.id === layer.id;
    const showDropIndicator = dropIndicator?.targetId === layer.id;

    return (
      <div key={layer.id} className="layer-node">
        {/* Indicador de drop superior */}
        {showDropIndicator && dropIndicator.position === 'above' && (
          <div className="drop-indicator drop-above" />
        )}
        
        <div 
          className={`layer-item ${layer.visible ? 'visible' : 'hidden'} ${
            activeLayerId === layer.id ? 'selected' : ''
          } ${isDraggedOver ? 'drag-over' : ''} ${
            highlightedLayer === layer.id ? 'highlighted' : ''
          }`}
          style={{ paddingLeft: `${depth * 20}px` }}
          onClick={() => handleLayerChange(layer.id)}
          
          draggable
          onDragStart={(e) => {handleDragStart(e, layer)
            handleLayerChange(layer.id)
          }}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, layer)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, layer)}
        >
          <div className="layer-header">
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
              {hasChildren && (
                <div className='groups-toggle-container'>
                 {/* <p className='groups-text'>Grupos: </p>*/}
                  <button 
                    className="expand-toggle"
                    onClick={(e) => { e.stopPropagation(); toggleLayerExpansion(layer.id); }}
                    title={isExpanded ? 'Colapsar' : 'Expandir'}
                  >
                    {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
                  </button>
                </div>
              )}
            </div>

            <div className="layer-actions">
              {/* Botón para seleccionar contenido */}
              <button 
                onClick={(e)=>{e.stopPropagation();
                  setActiveLayerId(layer.id);
                  setTimeout(() => {
                    
                  }, 500);
                  selectAllCanvas()}}
                title="Seleccionar contenido de la capa"
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
                  if(layer.id=== activeLayerId){
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
          </div>

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

        {/* Indicador de drop inferior */}
        {showDropIndicator && dropIndicator.position === 'below' && (
          <div className="drop-indicator drop-below" />
        )}

        {isExpanded && hasChildren && (
          <div className="group-children">
            {children
              .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)) // Ordenar grupos también
              .map(childLayer => renderLayerNode(childLayer, depth + 1))
            }
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="layer-manager">
      <div className="layer-manager-header">
        <div className="header-left">
          <h3>Administrador de Capas</h3>
          {activeLayerId && (
            <span className="active-layer-indicator">
              {getActiveLayer()?.name || 'Capa desconocida'}
            </span>
          )}
        </div>
        
        <div className="header-actions">
          {/* Flechas para mover la capa activa */}
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
        </div>
      </div>

      <div className="layer-tree">
        {getOrderedLayers().map(layer => renderLayerNode(layer))}
      </div>

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

export default LayerManager;