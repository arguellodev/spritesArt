import React, { useState, useEffect, useRef } from 'react';
import './configOnionSkin.css';

const ConfigOnionSkin = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentSettings,
  presets = {
    classic: {
      previousFrames: 2,
      nextFrames: 2,
      defaultOpacity: 0.3,
      defaultHue: 0,
      frameSettings: {
        '-2': { hue: 240, opacity: 0.2, lightness: 50 },
        '-1': { hue: 180, opacity: 0.4, lightness: 50 },
        '1': { hue: 60, opacity: 0.4, lightness: 50 },
        '2': { hue: 30, opacity: 0.2, lightness: 50 }
      }
    },
    minimal: {
      previousFrames: 1,
      nextFrames: 1,
      defaultOpacity: 0.5,
      defaultHue: 0,
      frameSettings: {
        '-1': { hue: 240, opacity: 0.3, lightness: 50 },
        '1': { hue: 0, opacity: 0.3, lightness: 50 }
      }
    },
    extended: {
      previousFrames: 3,
      nextFrames: 3,
      defaultOpacity: 0.2,
      defaultHue: 0,
      frameSettings: {
        '-3': { hue: 270, opacity: 0.15, lightness: 50 },
        '-2': { hue: 240, opacity: 0.25, lightness: 50 },
        '-1': { hue: 180, opacity: 0.35, lightness: 50 },
        '1': { hue: 60, opacity: 0.35, lightness: 50 },
        '2': { hue: 30, opacity: 0.25, lightness: 50 },
        '3': { hue: 0, opacity: 0.15, lightness: 50 }
      }
    }
  }
}) => {
  // Usar configuración 'minimal' por defecto
  const defaultSettings = currentSettings || presets.minimal;
  
  const [settings, setSettings] = useState(defaultSettings);
  const [selectedPreset, setSelectedPreset] = useState(currentSettings ? 'custom' : 'minimal');
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  const didMountRef = useRef(false);

  useEffect(() => {
    if (didMountRef.current) {
      if (onSave && settings) {
        onSave(settings);
      }
    } else {
      didMountRef.current = true;
    }
  }, [settings]);
  

  useEffect(() => {
    const frames = generateFrameOffsets();
    if (frames.length > 0 && !selectedFrame) {
      setSelectedFrame(frames[0]);
    }
  }, [settings.previousFrames, settings.nextFrames]);

  // Aplicar cambios en tiempo real
  useEffect(() => {
    if (onSave && settings) {
      onSave(settings);
    }
  }, [settings]);

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setSelectedPreset('custom');
  };

  const handleFrameSettingChange = (frameOffset, key, value) => {
    setSettings(prev => ({
      ...prev,
      frameSettings: {
        ...prev.frameSettings,
        [frameOffset]: {
          ...prev.frameSettings[frameOffset],
          [key]: value
        }
      }
    }));
    setSelectedPreset('custom');
  };

  const handlePresetChange = (presetName) => {
    if (presetName === 'custom') return;
    
    const preset = presets[presetName];
    if (preset) {
      setSettings(preset);
      setSelectedPreset(presetName);
    }
  };

  const handleSave = () => {
    // Los cambios ya se aplican en tiempo real, solo cerramos el modal
    onClose();
  };

  const generateFrameOffsets = () => {
    const offsets = [];
    for (let i = -settings.previousFrames; i <= settings.nextFrames; i++) {
      if (i !== 0) offsets.push(i);
    }
    return offsets;
  };

  const getFrameConfig = (offset) => {
    return settings.frameSettings[offset] || {
      opacity: settings.defaultOpacity,
      hue: settings.defaultHue,
      lightness: 50
    };
  };

  if (!isOpen) return null;

  const frameOffsets = generateFrameOffsets();
  const selectedFrameConfig = selectedFrame ? getFrameConfig(selectedFrame) : null;

  return (
    <div className="config-onion-skin-overlay">
      <div className="config-onion-skin-modal">
        <div className="config-header">
          <h2>Configuración Onion Skin</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="config-tabs">
          <button
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`tab-btn ${activeTab === 'frames' ? 'active' : ''}`}
            onClick={() => setActiveTab('frames')}
          >
            Frames
          </button>
        </div>

        <div className="config-content-compact">
          {activeTab === 'general' && (
            <div className="tab-content">
              <div className="config-section-compact">
                <h3>Presets</h3>
                <div className="preset-buttons-compact">
                  {Object.keys(presets).map(presetName => (
                    <button
                      key={presetName}
                      className={`preset-btn-compact ${selectedPreset === presetName ? 'active' : ''}`}
                      onClick={() => handlePresetChange(presetName)}
                    >
                      {presetName.charAt(0).toUpperCase() + presetName.slice(1)}
                    </button>
                  ))}
                  <button className={`preset-btn-compact ${selectedPreset === 'custom' ? 'active' : ''}`}>
                    Custom
                  </button>
                </div>
              </div>

              <div className="config-section-compact">
                <h3>Configuración General</h3>
                
                <div className="config-row-compact">
                  <div className="config-input-group">
                    <label>Frames Anteriores: {settings.previousFrames}</label>
                    <select
                      value={settings.previousFrames}
                      onChange={(e) => handleSettingsChange('previousFrames', parseInt(e.target.value))}
                      className="config-select"
                    >
                      {[0,1,2,3,4,5].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="config-input-group">
                    <label>Frames Siguientes: {settings.nextFrames}</label>
                    <select
                      value={settings.nextFrames}
                      onChange={(e) => handleSettingsChange('nextFrames', parseInt(e.target.value))}
                      className="config-select"
                    >
                      {[0,1,2,3,4,5].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="slider-group">
                  <label>Opacidad por Defecto: {Math.round(settings.defaultOpacity * 100)}%</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.defaultOpacity}
                    onChange={(e) => handleSettingsChange('defaultOpacity', parseFloat(e.target.value))}
                    className="config-slider"
                  />
                </div>

                <div className="slider-group">
                  <label>Matiz por Defecto: {settings.defaultHue}°</label>
                  <div className="slider-with-preview">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={settings.defaultHue}
                      onChange={(e) => handleSettingsChange('defaultHue', parseInt(e.target.value))}
                      className="config-slider"
                    />
                    <div 
                      className="color-preview-small"
                      style={{ backgroundColor: `hsl(${settings.defaultHue}, 70%, 50%)` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'frames' && (
            <div className="tab-content">
              <div className="config-section-compact">
                <h3>Seleccionar Frame</h3>
                <div className="frame-selector">
                  {frameOffsets.map(offset => (
                    <button
                      key={offset}
                      className={`frame-selector-btn ${selectedFrame === offset ? 'active' : ''}`}
                      onClick={() => setSelectedFrame(offset)}
                    >
                      <div className="frame-number">
                        {offset > 0 ? `+${offset}` : offset}
                      </div>
                      <div className="frame-type">
                        {offset > 0 ? 'Sig' : 'Ant'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedFrame && selectedFrameConfig && (
                <div className="config-section-compact">
                  <h3>Frame {selectedFrame > 0 ? `+${selectedFrame}` : selectedFrame}</h3>
                  
                  <div className="slider-group">
                    <label>Opacidad: {Math.round(selectedFrameConfig.opacity * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedFrameConfig.opacity}
                      onChange={(e) => handleFrameSettingChange(selectedFrame, 'opacity', parseFloat(e.target.value))}
                      className="config-slider"
                    />
                  </div>

                  <div className="slider-group">
                    <label>Matiz: {selectedFrameConfig.hue}°</label>
                    <div className="slider-with-preview">
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={selectedFrameConfig.hue}
                        onChange={(e) => handleFrameSettingChange(selectedFrame, 'hue', parseInt(e.target.value))}
                        className="config-slider"
                      />
                      <div 
                        className="color-preview-small"
                        style={{ backgroundColor: `hsl(${selectedFrameConfig.hue}, 70%, 50%)` }}
                      />
                    </div>
                  </div>

                  <div className="slider-group">
                    <label>Brillo: {selectedFrameConfig.lightness}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedFrameConfig.lightness}
                      onChange={(e) => handleFrameSettingChange(selectedFrame, 'lightness', parseInt(e.target.value))}
                      className="config-slider"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="config-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="save-btn" onClick={handleSave}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigOnionSkin;