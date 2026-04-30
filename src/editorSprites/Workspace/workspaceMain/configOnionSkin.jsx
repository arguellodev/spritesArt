import React, { useState, useEffect, useRef } from 'react';
import { LuPlus, LuMinus, LuEye, LuEyeOff, LuLayers, LuPalette, LuFlame, LuZap, LuSettings } from 'react-icons/lu';

import './configOnionSkin.css';

const ConfigOnionSkin = ({
  isOpen,
  onClose,
  onionFramesConfig,
  updateFrameConfig,
  addPreviousFrame,
  addNextFrame,
  removeFrame,
  toggleOnionFrames,
  applyOnionFramesPreset,
  clearTintCache
}) => {
  // expandedFrame: { type: 'previousFrames' | 'nextFrames', index: number } | null
  const [expandedFrame, setExpandedFrame] = useState(null);

  const didMountRef = useRef(false);

  useEffect(() => {
    didMountRef.current = true;
  }, []);

  useEffect(() => {
    if (!isOpen && clearTintCache) {
      clearTintCache();
    }
  }, [isOpen, clearTintCache]);

  const overlayRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (e) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const anchor = overlay.closest('.onion-config-anchor');
      if (anchor && !anchor.contains(e.target)) {
        onCloseRef.current();
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleFrameConfigChange = (type, index, key, value) => {
    if (updateFrameConfig) {
      updateFrameConfig(type, index, { [key]: value });
    }
  };

  const handleRemoveFrame = (frameArrayName, index) => {
    if (!removeFrame) return;
    removeFrame(frameArrayName, index);
    setExpandedFrame(prev =>
      prev && prev.type === frameArrayName && prev.index === index ? null : prev
    );
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

  const presets = [
    { name: 'classic', label: 'Clásico', Icon: LuPalette },
    { name: 'warm', label: 'Cálido', Icon: LuFlame },
    { name: 'subtle', label: 'Sutil', Icon: LuEye },
    { name: 'neon', label: 'Neón', Icon: LuZap }
  ];

  if (!isOpen || !onionFramesConfig) return null;

  const isExpanded = (type, index) =>
    expandedFrame !== null && expandedFrame.type === type && expandedFrame.index === index;

  const toggleExpanded = (type, index) => {
    setExpandedFrame(prev =>
      prev && prev.type === type && prev.index === index ? null : { type, index }
    );
  };

  const renderFrameSection = (frameArrayName, sectionTitle, signPrefix, addHandler) => {
    const frames = onionFramesConfig[frameArrayName] || [];

    return (
      <section className="onion-config__section" key={frameArrayName}>
        <div className="onion-config__section-header">
          <h3 className="onion-config__section-title">{sectionTitle}</h3>
          <button
            type="button"
            className="onion-config__add-frame-btn"
            onClick={addHandler}
          >
            <LuPlus size={14} />
            Añadir
          </button>
        </div>

        {frames.length === 0 ? (
          <p className="onion-config__empty-line">Sin frames configurados</p>
        ) : (
          <div className="onion-config__frame-chips">
            {frames.map((frame, index) => {
              const expanded = isExpanded(frameArrayName, index);
              return (
                <div
                  key={index}
                  className="onion-config__frame-chip"
                  data-disabled={!frame.enabled}
                >
                  <div className="onion-config__frame-chip-row">
                    <span className="onion-config__frame-offset">
                      {signPrefix}{frame.offset}
                    </span>
                    <div
                      className="onion-config__frame-color-preview"
                      style={{
                        backgroundColor: `hsl(${frame.hue}, ${frame.saturation}%, ${frame.brightness}%)`,
                        opacity: frame.enabled ? frame.opacity : 0.3
                      }}
                    />
                    <span className="onion-config__frame-opacity-label">
                      {Math.round(frame.opacity * 100)}%
                    </span>
                    <div className="onion-config__frame-chip-actions">
                      <button
                        type="button"
                        className={`onion-config__frame-chip-btn ${frame.enabled ? 'is-on' : 'is-off'}`}
                        onClick={() => toggleFrameEnabled(frameArrayName, index)}
                        title={frame.enabled ? 'Desactivar' : 'Activar'}
                      >
                        {frame.enabled ? <LuEye size={14} /> : <LuEyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        className={`onion-config__frame-chip-btn ${expanded ? 'is-active' : ''}`}
                        onClick={() => toggleExpanded(frameArrayName, index)}
                        title="Personalizar"
                        aria-expanded={expanded}
                      >
                        <LuSettings size={14} />
                      </button>
                      <button
                        type="button"
                        className="onion-config__frame-chip-btn onion-config__frame-chip-btn--remove"
                        onClick={() => handleRemoveFrame(frameArrayName, index)}
                        title="Eliminar"
                      >
                        <LuMinus size={14} />
                      </button>
                    </div>
                  </div>

                  {expanded && (() => {
                    const advancedId = `onion-${frameArrayName}-${index}`;
                    return (
                      <div className="onion-config__advanced">
                        <div className="onion-config__control-group">
                          <label className="onion-config__control-label" htmlFor={`${advancedId}-opacity`}>
                            Opacidad: {Math.round(frame.opacity * 100)}%
                          </label>
                          <input
                            id={`${advancedId}-opacity`}
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={frame.opacity}
                            onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'opacity', parseFloat(e.target.value))}
                            className="onion-config__slider onion-config__slider--opacity"
                          />
                        </div>

                        <div className="onion-config__control-group">
                          <label className="onion-config__control-label" htmlFor={`${advancedId}-hue`}>
                            Matiz: {frame.hue}°
                          </label>
                          <input
                            id={`${advancedId}-hue`}
                            type="range"
                            min="0"
                            max="360"
                            value={frame.hue}
                            onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'hue', parseInt(e.target.value))}
                            className="onion-config__slider onion-config__slider--hue"
                          />
                        </div>

                        <div className="onion-config__control-row">
                          <div className="onion-config__control-group">
                            <label className="onion-config__control-label" htmlFor={`${advancedId}-saturation`}>
                              Saturación: {frame.saturation}%
                            </label>
                            <input
                              id={`${advancedId}-saturation`}
                              type="range"
                              min="0"
                              max="100"
                              value={frame.saturation}
                              onChange={(e) => handleFrameConfigChange(frameArrayName, index, 'saturation', parseInt(e.target.value))}
                              className="onion-config__slider"
                            />
                          </div>
                          <div className="onion-config__control-group">
                            <label className="onion-config__control-label" htmlFor={`${advancedId}-brightness`}>
                              Brillo: {frame.brightness}%
                            </label>
                            <input
                              id={`${advancedId}-brightness`}
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
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <div
      className="onion-config__overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="false"
      aria-label="Configuración de Onion Skin"
    >
      <div className="onion-config__modal">

        {/* Header */}
        <div className="onion-config__header">
          <div className="onion-config__header-left">
            <LuLayers className="onion-config__header-icon" />
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
          <button className="onion-config__close-btn" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {/* Master toggle + stats */}
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
              {onionFramesConfig.enabled ? 'Onion Skin activo' : 'Activar Onion Skin'}
            </span>
          </div>

          <div className="onion-config__stats-inline">
            <span>{onionFramesConfig.previousFrames.filter(f => f.enabled).length} anteriores</span>
            <span className="onion-config__stats-divider">·</span>
            <span>{onionFramesConfig.nextFrames.filter(f => f.enabled).length} siguientes</span>
          </div>
        </div>

        {/* Body único — sin tabs */}
        <div className="onion-config__body">

          {/* Presets row */}
          <section className="onion-config__section">
            <h3 className="onion-config__section-title">Estilo</h3>
            <div className="onion-config__preset-chips">
              {presets.map(preset => {
                const PresetIcon = preset.Icon;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    className="onion-config__preset-chip"
                    onClick={() => handlePresetApply(preset.name)}
                    title={`Aplicar preset ${preset.label}`}
                  >
                    <PresetIcon size={16} />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Frame list — anteriores */}
          {renderFrameSection('previousFrames', 'Frames anteriores', '-', addPreviousFrame)}

          {/* Frame list — siguientes */}
          {renderFrameSection('nextFrames', 'Frames siguientes', '+', addNextFrame)}

        </div>
      </div>
    </div>
  );
};

export default ConfigOnionSkin;