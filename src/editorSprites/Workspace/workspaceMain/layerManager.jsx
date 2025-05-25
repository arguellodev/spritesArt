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
  // Nuevas props para grupos
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
   getMainLayers,
   getGroupLayersForParent,
}) => {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [expandedLayers, setExpandedLayers] = useState({}); // Para controlar qué capas muestran sus grupos
  const [newGroupName, setNewGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(null); // ID de capa donde mostrar input de crear grupo

  // Funciones existentes para capas
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
    if (e.key === 'Enter') {
      saveLayerName();
    } else if (e.key === 'Escape') {
      setEditingLayerId(null);
    }
  };

  // Nuevas funciones para grupos
  const startEditingGroup = (group, e) => {
    e.stopPropagation();
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const saveGroupName = () => {
    if (editingGroupId && editingGroupName.trim()) {
      // Encontrar la capa del grupo
      const layerId = Object.keys(pixelGroups).find(layerId => 
        pixelGroups[layerId] && pixelGroups[layerId][editingGroupId]
      );
      if (layerId) {
        renamePixelGroup(layerId, editingGroupId, editingGroupName);
      }
      setEditingGroupId(null);
    }
  };

  const handleGroupKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveGroupName();
    } else if (e.key === 'Escape') {
      setEditingGroupId(null);
    }
  };

  const toggleLayerExpansion = (layerId) => {
    setExpandedLayers(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  const handleCreateGroup = (layerId) => {
    if (!selectedPixels || selectedPixels.length === 0) {
      alert('Selecciona algunos píxeles primero para crear un grupo');
      return;
    }

    const groupName = newGroupName.trim() || `Grupo ${getLayerGroups(layerId).length + 1}`;
    const groupId = createPixelGroup(layerId, selectedPixels, groupName);
    
    if (groupId) {
      setNewGroupName('');
      setShowCreateGroup(null);
      // Expandir la capa para mostrar el nuevo grupo
      setExpandedLayers(prev => ({
        ...prev,
        [layerId]: true
      }));
    }
  };



  const handleDeleteGroup = (layerId, groupId, e) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
      deletePixelGroup(layerId, groupId);
    }
  };

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="layer-manager">
      <div className="layer-manager-header">
        <h3>Capas y Grupos</h3>
        <div className="header-actions">
          <button 
            className="add-layer-btn" 
            onClick={addLayer}
            title="Añadir capa"
          >
            + Capa
          </button>
        </div>
      </div>

      <div className="layer-list">
        {sortedLayers.map(layer => {
          const layerGroups = getLayerGroups(layer.id);
          const isExpanded = expandedLayers[layer.id];
          const hasGroups = layerGroups.length > 0;

          return (
            <div key={layer.id} className="layer-container">
              {/* Capa principal */}
              
              <div 
                className={`layer-item ${layer.visible ? 'visible' : 'hidden'} ${activeLayerId === layer.id ? 'selected' : ''}`}
                onClick={() => setActiveLayerId(layer.id)}
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
                      title="Doble clic para renombrar"
                    >
                      {layer.name}
                     
                    </div>
                  )}
                </div>
                  <div className="layer-visibility">
                    <button 
                      className={`visibility-toggle ${layer.visible ? 'visible' : 'hidden'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(layer.id);
                      }}
                      title={layer.visible ? 'Ocultar capa' : 'Mostrar capa'}
                    >
                      {layer.visible ? <LuEye /> : <LuEyeOff />}
                    </button>
                  </div>
                </div>
               
              

                <div className="layer-actions">
                  {/* Botón para crear grupo */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateGroup(showCreateGroup === layer.id ? null : layer.id);
                    }}
                    title="Crear grupo con píxeles seleccionados"
                    className={`layer-btn group-btn ${selectedPixels?.length > 0 ? 'has-selection' : ''}`}
                    disabled={!selectedPixels || selectedPixels.length === 0}
                  >
                    <LuGroup size={14} />
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayerUp(layer.id);
                    }} 
                    disabled={layer.zIndex === Math.max(...layers.map(l => l.zIndex))}
                    title="Mover capa arriba"
                    className="layer-btn"
                  >
                    <LuArrowUp size={14} />
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayerDown(layer.id);
                    }} 
                    disabled={layer.zIndex === Math.min(...layers.map(l => l.zIndex))}
                    title="Mover capa abajo"
                    className="layer-btn"
                  >
                    <LuArrowDown size={14} />
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      clearLayer(layer.id);
                    }}
                    title="Limpiar capa"
                    className="layer-btn"
                  >
                    <LuTrash2 size={14} />
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(layer.id);
                    }}
                    disabled={layers.length <= 1}
                    title="Eliminar capa"
                    className="layer-btn delete-btn"
                  >
                    <LuX size={14} />
                  </button>
                  <div className="group-display">
                  {/* Botón de expansión para grupos */}
                  {hasGroups && (
                    <>
                    
                    <p>Groups</p>
                    {hasGroups && <span className="group-count">({layerGroups.length})</span>}
                    <button 
                      className="expand-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerExpansion(layer.id);
                      }}
                      title={isExpanded ? 'Contraer grupos' : 'Expandir grupos'}
                    >
                      {isExpanded ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
                    </button>
                    </>
                  )}
                  
                </div>
                </div>
                
              </div>

              {/* Input para crear nuevo grupo */}
              {showCreateGroup === layer.id && (
                <div className="create-group-section">
                  <div className="create-group-input">
                    <input
                      type="text"
                      placeholder="Nombre del grupo (opcional)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateGroup(layer.id);
                        } else if (e.key === 'Escape') {
                          setShowCreateGroup(null);
                          setNewGroupName('');
                        }
                      }}
                      autoFocus
                    />
                    <button 
                      onClick={() => handleCreateGroup(layer.id)}
                      className="create-group-btn"
                      title="Crear grupo"
                    >
                      ✓
                    </button>
                    <button 
                      onClick={() => {
                        setShowCreateGroup(null);
                        setNewGroupName('');
                      }}
                      className="cancel-group-btn"
                      title="Cancelar"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="create-group-info">
                    {selectedPixels?.length || 0} píxeles seleccionados
                  </div>
                </div>
              )}

              {/* Lista de grupos de la capa */}
              {isExpanded && hasGroups && (
                <div className="groups-container">
                  {layerGroups.map(group => (
                    <div 
                      key={group.id}
                      className={`group-item ${group.visible ? 'visible' : 'hidden'} ${
                        selectedGroup?.id === group.id ? 'selected' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGroup(layer.id, group);
                        console.log('se activo la seleccion de grupo')
                      }}
                    >
                      <div className="group-left-section">
                        <LuSquare size={12} className="group-icon" />
                        
                        <button 
                          className={`visibility-toggle ${group.visible ? 'visible' : 'hidden'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupVisibility(layer.id, group.id);
                          }}
                          title={group.visible ? 'Ocultar grupo' : 'Mostrar grupo'}
                        >
                          {group.visible ? <LuEye size={12} /> : <LuEyeOff size={12} />}
                        </button>
                      </div>

                      <div className="group-content">
                        {editingGroupId === group.id ? (
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            onBlur={saveGroupName}
                            onKeyDown={handleGroupKeyDown}
                            autoFocus
                            className="group-name-input"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div 
                            className="group-name"
                            onDoubleClick={(e) => startEditingGroup(group, e)}
                            title="Doble clic para renombrar"
                          >
                            {group.name}
                            <span className="pixel-count">({group.pixels.length}px)</span>
                          </div>
                        )}
                      </div>

                      <div className="group-actions">
                      <button 
onClick={() => {
  setTool('select');
  clearCurrentSelection();
  const pixels = selectPixelGroup(layer.id, group.id);
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
}}
    title="Seleccionar píxeles del grupo"
    className="group-btn select-btn"
  >
    <LuMousePointer size={12} />
  </button>
                        <button 
                          onClick={(e) => handleDeleteGroup(layer.id, group.id, e)}
                          title="Eliminar grupo"
                          className="group-btn delete-btn"
                        >
                          <LuX size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Información de selección actual */}
      <div className="selection-info">
        {selectedGroup && (
          <div className="selected-group-info">
            <strong>Grupo seleccionado:</strong> {selectedGroup.name}
            <br />
            <span>{selectedGroup.pixels?.length || 0} píxeles</span>
            <button 
              onClick={clearSelectedGroup}
              className="clear-selection-btn"
              title="Limpiar selección"
            >
              <LuX size={12} />
            </button>
          </div>
        )}
        {selectedPixels && selectedPixels.length > 0 && !selectedGroup && (
          <div className="selected-pixels-info">
            <strong>Selección actual:</strong> {selectedPixels.length} píxeles
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerManager;