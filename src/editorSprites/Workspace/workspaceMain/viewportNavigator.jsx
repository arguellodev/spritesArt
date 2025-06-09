import React, { useRef, useCallback, useState } from 'react';
import './viewportNavigator.css';

const ViewportNavigator = ({ 
  totalWidth, 
  totalHeight, 
  viewportWidth, 
  viewportHeight,
  viewportOffset,
  zoom,
  onViewportMove,
  onZoomChange = () => {} // Valor por defecto para evitar errores
}) => {
  const navigatorRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const navigatorSize = 120;
  const scale = navigatorSize / Math.max(totalWidth, totalHeight);
  const scaledCanvasWidth = totalWidth * scale;
  const scaledCanvasHeight = totalHeight * scale;
  const viewportRectWidth = viewportWidth * scale;
  const viewportRectHeight = viewportHeight * scale;
  const viewportRectX = viewportOffset.x * scale;
  const viewportRectY = viewportOffset.y * scale;

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    navigatorRef.current.setPointerCapture(e.pointerId);

    const rect = navigatorRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const canvasX = clickX / scale;
    const canvasY = clickY / scale;

    const newOffsetX = Math.max(0, Math.min(totalWidth - viewportWidth, canvasX - viewportWidth / 2));
    const newOffsetY = Math.max(0, Math.min(totalHeight - viewportHeight, canvasY - viewportHeight / 2));

    onViewportMove(newOffsetX - viewportOffset.x, newOffsetY - viewportOffset.y);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [scale, totalWidth, totalHeight, viewportWidth, viewportHeight, viewportOffset, onViewportMove]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const canvasDeltaX = deltaX / scale;
    const canvasDeltaY = deltaY / scale;

    onViewportMove(canvasDeltaX, canvasDeltaY);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, scale, onViewportMove]);

  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    navigatorRef.current.releasePointerCapture(e.pointerId);
  }, []);

  const handleZoomChange = useCallback((e) => {
    if (onZoomChange) {
      onZoomChange(e); // Pasar el evento completo
    }
  }, [onZoomChange]);

  const visibleAreaPercentage = ((viewportWidth * viewportHeight) / (totalWidth * totalHeight) * 100).toFixed(1);

  return (
    <div className="viewport-navigator">
      <div className="navigator-info">
        <span className="info-item">
          Zoom: <strong>{zoom}x</strong>
        </span>
        <span className="info-item">
          Área visible: <strong>{visibleAreaPercentage}%</strong>
        </span>
      </div>

      {/* Control de Zoom integrado */}
      <div className="zoom-control">
        <label htmlFor="zoom-slider">Zoom: {zoom}x</label>
        <input
          type="range"
          id="zoom-slider"
          min="1"
          max="40"
          value={zoom}
          onChange={handleZoomChange}
          className="zoom-slider"
        />
      </div>

      <div 
        ref={navigatorRef}
        className="navigator-container"
        style={{ 
          width: navigatorSize, 
          height: navigatorSize,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div 
          className="navigator-canvas"
          style={{
            width: scaledCanvasWidth,
            height: scaledCanvasHeight,
            left: (navigatorSize - scaledCanvasWidth) / 2,
            top: (navigatorSize - scaledCanvasHeight) / 2
          }}
        />

        <div 
          className="navigator-viewport"
          style={{
            width: viewportRectWidth,
            height: viewportRectHeight,
            left: (navigatorSize - scaledCanvasWidth) / 2 + viewportRectX,
            top: (navigatorSize - scaledCanvasHeight) / 2 + viewportRectY
          }}
        />

        <div className="viewport-coords">
          <span>
            ({Math.floor(viewportOffset.x)}, {Math.floor(viewportOffset.y)})
          </span>
        </div>
      </div>

      <div className="navigator-controls">
        <button 
          className="control-btn"
          onClick={() => onViewportMove(-viewportOffset.x, -viewportOffset.y)}
          title="Centrar viewport"
        >
          🎯 Centrar
        </button>
        <button 
          className="control-btn"
          onClick={() => {
            const centerX = (totalWidth - viewportWidth) / 2;
            const centerY = (totalHeight - viewportHeight) / 2;
            onViewportMove(centerX - viewportOffset.x, centerY - viewportOffset.y);
          }}
          title="Ir al centro del canvas"
        >
          🏠 Inicio
        </button>
      </div>
    </div>
  );
};

export default ViewportNavigator;