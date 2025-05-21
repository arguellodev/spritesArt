import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Edit, Plus, X } from 'lucide-react';
import './layerManager.css';

const LayerManager = ({ layerManager }) => {
  const {
    layers,
    addLayer,
    deleteLayer,
    moveLayerUp,
    moveLayerDown,
    toggleLayerVisibility,
    renameLayer,
    clearLayer
  } = layerManager;

  const [editingLayerId, setEditingLayerId] = useState(null);
  const [newLayerName, setNewLayerName] = useState('');
  const [expanded, setExpanded] = useState(true);

  // Sort layers by zIndex in descending order (top layer first)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const handleRenameLayer = (layerId) => {
    if (newLayerName.trim()) {
      renameLayer(layerId, newLayerName);
      setEditingLayerId(null);
      setNewLayerName('');
    }
  };

  const handleKeyDown = (e, layerId) => {
    if (e.key === 'Enter') {
      handleRenameLayer(layerId);
    } else if (e.key === 'Escape') {
      setEditingLayerId(null);
      setNewLayerName('');
    }
  };

  const startEditing = (layer) => {
    setEditingLayerId(layer.id);
    setNewLayerName(layer.name);
  };

  return (
    <div className="layer-manager">
      <div className="layer-manager-header">
        <h3>Capas</h3>
        <button 
          className="toggle-expand" 
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse layers panel" : "Expand layers panel"}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {expanded && (
        <>
          <div className="layer-list">
            {sortedLayers.map((layer) => (
              <div 
                key={layer.id} 
                className={`layer-item ${layer.visible ? 'visible' : 'hidden'}`}
              >
                <div className="layer-visibility">
                  <button 
                    onClick={() => toggleLayerVisibility(layer.id)}
                    className={`visibility-btn ${layer.visible ? 'visible' : ''}`}
                    aria-label={layer.visible ? "Hide layer" : "Show layer"}
                  >
                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                
                <div className="layer-content">
                  {editingLayerId === layer.id ? (
                    <input
                      type="text"
                      value={newLayerName}
                      onChange={(e) => setNewLayerName(e.target.value)}
                      onBlur={() => handleRenameLayer(layer.id)}
                      onKeyDown={(e) => handleKeyDown(e, layer.id)}
                      autoFocus
                      className="layer-name-input"
                    />
                  ) : (
                    <span className="layer-name">{layer.name}</span>
                  )}
                </div>
                
                <div className="layer-actions">
                  <button 
                    onClick={() => moveLayerUp(layer.id)}
                    className="layer-btn"
                    disabled={layer.zIndex === Math.max(...layers.map(l => l.zIndex))}
                    aria-label="Move layer up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  
                  <button 
                    onClick={() => moveLayerDown(layer.id)}
                    className="layer-btn"
                    disabled={layer.zIndex === Math.min(...layers.map(l => l.zIndex))}
                    aria-label="Move layer down"
                  >
                    <ChevronDown size={16} />
                  </button>
                  
                  <button 
                    onClick={() => startEditing(layer)}
                    className="layer-btn"
                    aria-label="Rename layer"
                  >
                    <Edit size={16} />
                  </button>
                  
                  <button 
                    onClick={() => clearLayer(layer.id)}
                    className="layer-btn"
                    aria-label="Clear layer"
                  >
                    <X size={16} />
                  </button>
                  
                  <button 
                    onClick={() => deleteLayer(layer.id)}
                    className="layer-btn delete"
                    disabled={layers.length <= 1}
                    aria-label="Delete layer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="layer-controls">
            <button 
              onClick={addLayer}
              className="add-layer-btn"
              aria-label="Add new layer"
            >
              <Plus size={16} />
              <span>Nueva Capa</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LayerManager;