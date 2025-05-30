import React, { useState } from 'react';
import './reflexMode.css';

const ReflexMode = () => {
  const [mirrorState, setMirrorState] = useState({
    horizontal: false,
    vertical: false,
    customArea: false,
    bounds: {
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100
    }
  });

  const toggleMirror = (type) => {
    setMirrorState(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const toggleCustomArea = () => {
    setMirrorState(prev => ({
      ...prev,
      customArea: !prev.customArea
    }));
  };

  const updateBounds = (field, value) => {
    const numValue = parseInt(value) || 0;
    setMirrorState(prev => ({
      ...prev,
      bounds: {
        ...prev.bounds,
        [field]: numValue
      }
    }));
  };

  return (
    <div className="reflex-mode">
      {/* Botones principales */}
      <div className="mirror-controls">
        <button
          className={`mirror-btn ${mirrorState.horizontal ? 'active' : ''}`}
          onClick={() => toggleMirror('horizontal')}
          title="Espejo Horizontal"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M2 3h5v10H2V3zm7 0h5v10H9V3z" />
            <line x1="8" y1="2" x2="8" y2="14" strokeWidth="1" className="mirror-line" />
          </svg>
        </button>

        <button
          className={`mirror-btn ${mirrorState.vertical ? 'active' : ''}`}
          onClick={() => toggleMirror('vertical')}
          title="Espejo Vertical"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M3 2h10v5H3V2zm0 7h10v5H3V9z" />
            <line x1="2" y1="8" x2="14" y2="8" strokeWidth="1" className="mirror-line" />
          </svg>
        </button>

        <button
          className={`area-btn ${mirrorState.customArea ? 'active' : ''}`}
          onClick={toggleCustomArea}
          title="Área Personalizada"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="2" y="2" width="12" height="12" fill="none" strokeWidth="1" strokeDasharray="2,1" />
            <rect x="4" y="4" width="8" height="8" fill="none" strokeWidth="1" />
          </svg>
        </button>
      </div>

      {/* Panel de coordenadas - siempre visible */}
      <div className={`bounds-panel ${mirrorState.customArea ? 'active' : 'disabled'}`}>
          <div className="bounds-row">
            <div className="coord-group">
              <label>X1:</label>
              <input
                type="number"
                value={mirrorState.bounds.x1}
                onChange={(e) => updateBounds('x1', e.target.value)}
                min="0"
              />
            </div>
            <div className="coord-group">
              <label>Y1:</label>
              <input
                type="number"
                value={mirrorState.bounds.y1}
                onChange={(e) => updateBounds('y1', e.target.value)}
                min="0"
              />
            </div>
          </div>
          <div className="bounds-row">
            <div className="coord-group">
              <label>X2:</label>
              <input
                type="number"
                value={mirrorState.bounds.x2}
                onChange={(e) => updateBounds('x2', e.target.value)}
                min="0"
              />
            </div>
            <div className="coord-group">
              <label>Y2:</label>
              <input
                type="number"
                value={mirrorState.bounds.y2}
                onChange={(e) => updateBounds('y2', e.target.value)}
                min="0"
              />
            </div>
          </div>
        </div>
     

      {/* Indicador de estado */}
      {(mirrorState.horizontal || mirrorState.vertical) && (
        <div className="mirror-status">
          {mirrorState.horizontal && <span className="status-indicator">H</span>}
          {mirrorState.vertical && <span className="status-indicator">V</span>}
          {mirrorState.customArea && <span className="status-indicator">C</span>}
        </div>
      )}
    </div>
  );
};

export default ReflexMode;