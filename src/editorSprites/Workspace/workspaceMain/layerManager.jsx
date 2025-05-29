import React, { useState } from 'react';
import './layerManager.css';
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
  LuMousePointer
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
  getGroupLayersForParent
}) => {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [expandedLayers, setExpandedLayers] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(null);

  // Funciones de edición de capas
// Función para manejar el cambio de capa activa
const handleLayerChange = (layerId) => {
  

  const groupID = Object.keys(pixelGroups?.[layerId] || {})[0] || null;

  // Si estamos cambiando a una capa diferente
  if (activeLayerId !== layerId) {
    // Limpiar selección actual si existe
    if (selectedGroup || selectedPixels?.length > 0) {
      clearCurrentSelection();
    }
    
    // Cambiar a la nueva capa
    setActiveLayerId(layerId);

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
      const startPoint = { x: minX, y: minY };
      const endPoint = { x: maxX, y: maxY };
  
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
  
    // Creamos el grupo y obtenemos su ID
    const newGroupId = createPixelGroup(layerId, selectedPixels, groupName);
  
    // Seleccionamos el grupo recién creado
    if (newGroupId) {
      selectPixelGroup(layerId, newGroupId); // ✅ asegúrate que esta función actualiza el estado global
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

  // Renderizado jerárquico
  const renderLayerNode = (layer, depth = 0) => {
    const isGroup = layer.isGroupLayer;
    const children = isGroup ? [] : getGroupLayersForParent(layer.id);
    const isExpanded = expandedLayers[layer.id];
    const hasChildren = children.length > 0;
    const layerGroups = getLayerGroups(layer.id);

    return (
      <div key={layer.id} className="layer-node">
        <div 
          className={`layer-item ${layer.visible ? 'visible' : 'hidden'} ${activeLayerId === layer.id ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 20}px` }}
          onClick={() => handleLayerChange(layer.id)}
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
                <p className='groups-text'>Grupos: </p>
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
              {!isGroup && (
                <>
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
                  
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      moveLayerUp(layer.id); 
                    }}
                    title="Mover arriba"
                    className="layer-btn"
                    disabled={layer.zIndex === Math.max(...layers.map(l => l.zIndex))}
                  >
                    <LuArrowUp />
                  </button>
                  
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      moveLayerDown(layer.id); 
                    }}
                    title="Mover abajo"
                    className="layer-btn"
                    disabled={layer.zIndex === Math.min(...layers.map(l => l.zIndex))}
                  >
                    <LuArrowDown />
                  </button>
                </>
              )}

              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
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

        {isExpanded && hasChildren && (
          <div className="group-children">
            {children.map(childLayer => renderLayerNode(childLayer, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="layer-manager">
      <div className="layer-manager-header">
        <h3>Administrador de Capas</h3>
        <button 
          className="add-layer-btn" 
          onClick={addLayer}
          title="Añadir nueva capa"
        >
          + Capa
        </button>
      </div>

      <div className="layer-tree">
        {getHierarchicalLayers().map(layer => renderLayerNode(layer))}
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

<button 
onClick={() => {
 
}}
    title="Seleccionar píxeles del grupo"
    className="group-btn select-btn"
  ></button>