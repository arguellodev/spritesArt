import React, { useState, useEffect, useRef } from 'react';
import { LuPlus, LuMinus, LuEye, LuEyeOff, LuRotateCcw, LuPalette, LuSettings } from 'react-icons/lu';

import './configOnionSkin.css';

const ConfigOnionSkin = ({ 
  isOpen, 
  onClose,
  onionFramesConfig,
  setOnionFramesConfig,
  updateFrameConfig,
  addPreviousFrame,
  addNextFrame,
  removeFrame,
  toggleOnionFrames,
  applyOnionFramesPreset,
  clearTintCache
}) => {
  const [activeTab, setActiveTab] = useState('frames');
  const [selectedFrameType, setSelectedFrameType] = useState('previous');
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [draggedFrame, setDraggedFrame] = useState(null);

  const didMountRef = useRef(false);

  useEffect(() => {
    didMountRef.current = true;
  }, []);

  useEffect(() => {
    if (!isOpen && clearTintCache) {
      clearTintCache();
    }
  }, [isOpen, clearTintCache]);

  const handleFrameConfigChange = (type, index, key, value) => {
    if (updateFrameConfig) {
      updateFrameConfig(type, index, { [key]: value });
    }
  };

  const handleAddFrame = () => {
    if (selectedFrameType === 'previous' && addPreviousFrame) {
      addPreviousFrame();
    } else if (selectedFrameType === 'next' && addNextFrame) {
      addNextFrame();
    }
  };

  const handleRemoveFrame = (index) => {
    if (removeFrame) {
      const frameArray = selectedFrameType === 'previous' ? 'previousFrames' : 'nextFrames';
      removeFrame(frameArray, index);
      
      const maxIndex = onionFramesConfig[frameArray].length - 2;
      if (selectedFrameIndex > maxIndex && maxIndex >= 0) {
        setSelectedFrameIndex(maxIndex);
      } else if (maxIndex < 0) {
        setSelectedFrameIndex(0);
      }
    }
  };

  const handlePresetApply = (presetName) => {
    if (applyOnionFramesPreset) {
      applyOnionFramesPreset(presetName);
    }
  };

  const toggleFrameEnabled = (type, index) => {
    const frameArray = onionFramesConfig[type];
    const frame = frameArray[index];
    if (frame) {
      handleFrameConfigChange(type, index, 'enabled', !frame.enabled);
    }
  };

  const duplicateFrame = (type, index) => {
    const frameArray = onionFramesConfig[type];
    const frame = frameArray[index];
    if (frame) {
      const newFrame = { 
        ...frame, 
        offset: frame.offset + 1,
        enabled: false 
      };
      
      if (type === 'previous' && addPreviousFrame) {
        setOnionFramesConfig(prev => ({
          ...prev,
          previousFrames: [...prev.previousFrames, newFrame]
        }));
      } else if (type === 'next' && addNextFrame) {
        setOnionFramesConfig(prev => ({
          ...prev,
          nextFrames: [...prev.nextFrames, newFrame]
        }));
      }
    }
  };

  const getFrameArrayName = () => {
    return selectedFrameType === 'previous' ? 'previousFrames' : 'nextFrames';
  };

  const presets = [
    { name: 'classic', label: 'Clásico', icon: '🎨' },
    { name: 'warm', label: 'Cálido', icon: '🔥' },
    { name: 'subtle', label: 'Sutil', icon: '👁️' },
    { name: 'neon', label: 'Neón', icon: '⚡' }
  ];

  if (!isOpen || !onionFramesConfig) return null;

  const frameArrayName = getFrameArrayName();
  const currentFrameArray = onionFramesConfig[frameArrayName];
  const selectedFrame = currentFrameArray[selectedFrameIndex] || null;

  return (
    <div className="onion-config__overlay">
      <div className="onion-config__modal">
        
        {/* Header */}
        <div className="onion-config__header">
          <div className="onion-config__header-left">
            <LuPalette className="onion-config__header-icon" />
            <h2 className="onion-config__title">Onion Skin</h2>
            <div className="onion-config__status-indicator">
              {onionFramesConfig.enabled ? (
                <div className="onion-config__status onion-config__status--enabled">
                  <div className="onion-config__status-dot"></div>
                  Activo
                </div>
              ) : (
                <div className="onion-config__status onion-config__status--disabled">
                  <div className="onion-config__status-dot"></div>
                  Inactivo
                </div>
              )}
            </div>
          </div>
          <button className="onion-config__close-btn" onClick={onClose}>×</button>
        </div>

        {/* Quick Toggle */}
        <div className="onion-config__quick-controls">
          <div className="onion-config__master-toggle">
            <label className="onion-config__toggle-switch">
              <input
                type="checkbox"
                checked={onionFramesConfig.enabled}
                onChange={toggleOnionFrames}
                className="onion-config__toggle-input"
              />
              <span className="onion-config__toggle-slider"></span>
            </label>
            <span className="onion-config__toggle-text">
              {onionFramesConfig.enabled ? 'Desactivar' : 'Activar'} Onion Skin
            </span>
          </div>
          
          <div className="onion-config__frame-stats">
            <div className="onion-config__stat">
              <span className="onion-config__stat-number">{onionFramesConfig.previousFrames.filter(f => f.enabled).length}</span>
              <span className="onion-config__stat-label">Anteriores</span>
            </div>
            <div className="onion-config__stat">
              <span className="onion-config__stat-number">{onionFramesConfig.nextFrames.filter(f => f.enabled).length}</span>
              <span className="onion-config__stat-label">Siguientes</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="onion-config__tabs">
          <button
            className={`onion-config__tab-btn ${activeTab === 'frames' ? 'onion-config__tab-btn--active' : ''}`}
            onClick={() => setActiveTab('frames')}
          >
            <LuSettings size={16} />
            Frames
          </button>
          <button
            className={`onion-config__tab-btn ${activeTab === 'presets' ? 'onion-config__tab-btn--active' : ''}`}
            onClick={() => setActiveTab('presets')}
          >
            <LuPalette size={16} />
            Presets
          </button>
        </div>

        {/* Content */}
        <div className="onion-config__content">
          {activeTab === 'frames' && (
            <div className="onion-config__frames-tab">
              
              {/* Frame Type Selector */}
              <div className="onion-config__frame-type-selector">
                <button
                  className={`onion-config__type-btn ${selectedFrameType === 'previous' ? 'onion-config__type-btn--active' : ''}`}
                  onClick={() => {
                    setSelectedFrameType('previous');
                    setSelectedFrameIndex(0);
                  }}
                >
                  <span className="onion-config__type-arrow">←</span>
                  <div className="onion-config__type-info">
                    <span className="onion-config__type-label">Anteriores</span>
                    <span className="onion-config__type-count">{onionFramesConfig.previousFrames.length}</span>
                  </div>
                </button>
                <button
                  className={`onion-config__type-btn ${selectedFrameType === 'next' ? 'onion-config__type-btn--active' : ''}`}
                  onClick={() => {
                    setSelectedFrameType('next');
                    setSelectedFrameIndex(0);
                  }}
                >
                  <span className="onion-config__type-arrow">→</span>
                  <div className="onion-config__type-info">
                    <span className="onion-config__type-label">Siguientes</span>
                    <span className="onion-config__type-count">{onionFramesConfig.nextFrames.length}</span>
                  </div>
                </button>
              </div>

              {/* Frame List */}
              <div className="onion-config__frame-list-container">
                <div className="onion-config__section-header">
                  <h3 className="onion-config__section-title">Frames {selectedFrameType === 'previous' ? 'Anteriores' : 'Siguientes'}</h3>
                  <button className="onion-config__add-frame-btn" onClick={handleAddFrame}>
                    <LuPlus size={14} />
                    Agregar
                  </button>
                </div>

                <div className="onion-config__frame-list">
                  {currentFrameArray.length === 0 ? (
                    <div className="onion-config__empty-state">
                      <div className="onion-config__empty-icon">📝</div>
                      <p className="onion-config__empty-text">No hay frames configurados</p>
                      <button className="onion-config__empty-add-btn" onClick={handleAddFrame}>
                        <LuPlus size={16} />
                        Agregar primer frame
                      </button>
                    </div>
                  ) : (
                    currentFrameArray.map((frame, index) => (
                      <div
                        key={index}
                        className={`onion-config__frame-item ${selectedFrameIndex === index ? 'onion-config__frame-item--selected' : ''}`}
                        onClick={() => setSelectedFrameIndex(index)}
                      >
                        <div className="onion-config__frame-header">
                          <div className="onion-config__frame-info">
                            <span className="onion-config__frame-offset">
                              {selectedFrameType === 'previous' ? `-${frame.offset}` : `+${frame.offset}`}
                            </span>
                            <div 
                              className="onion-config__frame-color-preview"
                              style={{ 
                                backgroundColor: `hsl(${frame.hue}, ${frame.saturation}%, ${frame.brightness}%)`,
                                opacity: frame.opacity
                              }}
                            />
                          </div>
                          
                          <div className="onion-config__frame-actions">
                            <button
                              className={`onion-config__frame-toggle ${frame.enabled ? 'onion-config__frame-toggle--enabled' : 'onion-config__frame-toggle--disabled'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFrameEnabled(frameArrayName, index);
                              }}
                              title={frame.enabled ? 'Desactivar' : 'Activar'}
                            >
                              {frame.enabled ? <LuEye size={14} /> : <LuEyeOff size={14} />}
                            </button>
                            
                            <button
                              className="onion-config__frame-remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFrame(index);
                              }}
                              title="Eliminar frame"
                            >
                              <LuMinus size={14} />
                            </button>
                          </div>
                        </div>

                        {selectedFrameIndex === index && (
                          <div className="onion-config__frame-controls">
                            <div className="onion-config__control-group">
                              <label className="onion-config__control-label">Opacidad: {Math.round(frame.opacity * 100)}%</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={frame.opacity}
                                onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'opacity', parseFloat(e.target.value))}
                                className="onion-config__slider onion-config__slider--opacity"
                              />
                            </div>

                            <div className="onion-config__color-controls">
                              <div className="onion-config__control-group">
                                <label className="onion-config__control-label">Matiz: {frame.hue}°</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="360"
                                  value={frame.hue}
                                  onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'hue', parseInt(e.target.value))}
                                  className="onion-config__slider onion-config__slider--hue"
                                  style={{
                                    background: `linear-gradient(to right, 
                                      hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(120, 70%, 50%), 
                                      hsl(180, 70%, 50%), hsl(240, 70%, 50%), hsl(300, 70%, 50%), hsl(360, 70%, 50%))`
                                  }}
                                />
                              </div>

                              <div className="onion-config__control-row">
                                <div className="onion-config__control-group">
                                  <label className="onion-config__control-label">Saturación: {frame.saturation}%</label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={frame.saturation}
                                    onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'saturation', parseInt(e.target.value))}
                                    className="onion-config__slider"
                                  />
                                </div>

                                <div className="onion-config__control-group">
                                  <label className="onion-config__control-label">Brillo: {frame.brightness}%</label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={frame.brightness}
                                    onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'brightness', parseInt(e.target.value))}
                                    className="onion-config__slider"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="onion-config__frame-preview">
                              <div 
                                className="onion-config__preview-swatch"
                                style={{ 
                                  backgroundColor: `hsl(${frame.hue}, ${frame.saturation}%, ${frame.brightness}%)`,
                                  opacity: frame.opacity
                                }}
                              />
                              <span className="onion-config__preview-text">Vista previa</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="onion-config__presets-tab">
              <div className="onion-config__section-header">
                <div>
                  <h3 className="onion-config__section-title">Configuraciones Predefinidas</h3>
                  <span className="onion-config__section-subtitle">Aplica estilos rápidos a tus onion frames</span>
                </div>
              </div>

              <div className="onion-config__presets-grid">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    className="onion-config__preset-card"
                    onClick={() => handlePresetApply(preset.name)}
                  >
                    <div className="onion-config__preset-icon">{preset.icon}</div>
                    <span className="onion-config__preset-label">{preset.label}</span>
                  </button>
                ))}
              </div>

              <div className="onion-config__current-config">
                <h4 className="onion-config__current-config-title">Configuración Actual</h4>
                <div className="onion-config__config-summary">
                  <div className="onion-config__summary-section">
                    <span className="onion-config__summary-title">Frames Anteriores:</span>
                    <div className="onion-config__summary-frames">
                      {onionFramesConfig.previousFrames.map((frame, index) => (
                        <div key={index} className="onion-config__summary-frame">
                          <span className="onion-config__summary-offset">-{frame.offset}</span>
                          <div 
                            className="onion-config__summary-color"
                            style={{ 
                              backgroundColor: `hsl(${frame.hue}, ${frame.saturation}%, ${frame.brightness}%)`,
                              opacity: frame.enabled ? frame.opacity : 0.3
                            }}
                          />
                          <span className={`onion-config__summary-status ${frame.enabled ? 'onion-config__summary-status--enabled' : 'onion-config__summary-status--disabled'}`}>
                            {frame.enabled ? '●' : '○'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="onion-config__summary-section">
                    <span className="onion-config__summary-title">Frames Siguientes:</span>
                    <div className="onion-config__summary-frames">
                      {onionFramesConfig.nextFrames.map((frame, index) => (
                        <div key={index} className="onion-config__summary-frame">
                          <span className="onion-config__summary-offset">+{frame.offset}</span>
                          <div 
                            className="onion-config__summary-color"
                            style={{ 
                              backgroundColor: `hsl(${frame.hue}, ${frame.saturation}%, ${frame.brightness}%)`,
                              opacity: frame.enabled ? frame.opacity : 0.3
                            }}
                          />
                          <span className={`onion-config__summary-status ${frame.enabled ? 'onion-config__summary-status--enabled' : 'onion-config__summary-status--disabled'}`}>
                            {frame.enabled ? '●' : '○'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigOnionSkin;