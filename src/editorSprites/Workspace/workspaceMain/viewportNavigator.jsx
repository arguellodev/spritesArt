import React, { useRef, useCallback, useState, useEffect } from 'react';
import './viewportNavigator.css';
import { MdFilterCenterFocus } from "react-icons/md";

const ViewportNavigator = ({ 
  totalWidth, 
  totalHeight, 
  viewportWidth, 
  viewportHeight,
  viewportOffset,
  zoom,
  onViewportMove,
  compositeCanvasRef,
  getFullCanvas,
  onZoomChange = () => {}
}) => {
  const navigatorRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState(zoom.toString());
  
  const navigatorSize = 120;
  const scale = navigatorSize / Math.max(totalWidth, totalHeight);
  const scaledCanvasWidth = totalWidth * scale;
  const scaledCanvasHeight = totalHeight * scale;
  const viewportRectWidth = viewportWidth * scale;
  const viewportRectHeight = viewportHeight * scale;
  const viewportRectX = viewportOffset.x * scale;
  const viewportRectY = viewportOffset.y * scale;

  const miniCanvasRef = useRef();



  useEffect(() => {
    const interval = setInterval(() => {
      const sourceCanvas = getFullCanvas(true); // O false, si no quieres incluir capas ocultas
      const targetCanvas = miniCanvasRef.current;
  
      if (sourceCanvas && targetCanvas) {
        const ctx = targetCanvas.getContext('2d');
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.imageSmoothingEnabled = false;
  
        // Calcular proporciones para mantener aspecto
        const sourceAspect = sourceCanvas.width / sourceCanvas.height;
        const targetAspect = targetCanvas.width / targetCanvas.height;
  
        let drawWidth, drawHeight, drawX, drawY;
  
        if (sourceAspect > targetAspect) {
          drawWidth = targetCanvas.width;
          drawHeight = targetCanvas.width / sourceAspect;
          drawX = 0;
          drawY = (targetCanvas.height - drawHeight) / 2;
        } else {
          drawHeight = targetCanvas.height;
          drawWidth = targetCanvas.height * sourceAspect;
          drawX = (targetCanvas.width - drawWidth) / 2;
          drawY = 0;
        }
  
        ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, drawX, drawY, drawWidth, drawHeight);
      }
    }, 1);
  
    return () => clearInterval(interval);
  }, [getFullCanvas]);
  

  // Configurar el tamaño del mini canvas - usar tamaño fijo para evitar distorsión
  useEffect(() => {
    if (miniCanvasRef.current) {
      // Mantener el tamaño interno del canvas fijo basado en las dimensiones escaladas iniciales
      miniCanvasRef.current.width = scaledCanvasWidth;
      miniCanvasRef.current.height = scaledCanvasHeight;
    }
  }, [scaledCanvasWidth, scaledCanvasHeight]);

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

  const handleZoomSliderChange = useCallback((e) => {
    const newZoom = parseFloat(e.target.value);
    setZoomInputValue(newZoom.toString());
    if (onZoomChange) {
      onZoomChange(e);
    }
  }, [onZoomChange]);

  const handleZoomInputChange = useCallback((e) => {
    const value = e.target.value;
    setZoomInputValue(value);
  }, []);

  const handleZoomInputSubmit = useCallback((e) => {
    e.preventDefault();
    const newZoom = parseFloat(zoomInputValue);
    if (!isNaN(newZoom) && newZoom >= 1 && newZoom <= 40) {
      const syntheticEvent = {
        target: { value: newZoom.toString() }
      };
      if (onZoomChange) {
        onZoomChange(syntheticEvent);
      }
    } else {
      setZoomInputValue(zoom.toString());
    }
  }, [zoomInputValue, zoom, onZoomChange]);

  const handleZoomInputBlur = useCallback(() => {
    const newZoom = parseFloat(zoomInputValue);
    if (isNaN(newZoom) || newZoom < 1 || newZoom > 40) {
      setZoomInputValue(zoom.toString());
    }
  }, [zoomInputValue, zoom]);

  // Actualizar el input cuando cambie el zoom externamente
  React.useEffect(() => {
    setZoomInputValue(zoom.toString());
  }, [zoom]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const visibleAreaPercentage = ((viewportWidth * viewportHeight) / (totalWidth * totalHeight) * 100).toFixed(1);

  return (
    <div className={`viewport-navigator ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header con controles de zoom y botón de colapso */}
      <div className="navigator-header">
        <div className="zoom-controls">
          <div className="zoom-input-group">
            <p>Zoom</p>
            <form onSubmit={handleZoomInputSubmit}>
              <input
                type="number"
                min="1"
                max="40"
                step="0.1"
                value={zoomInputValue}
                onChange={handleZoomInputChange}
                onBlur={handleZoomInputBlur}
                className="zoom-input"
                title="Ingrese el nivel de zoom (1-40x)"
              />
            </form>
            <span className="zoom-unit">x</span>
          </div>
          
          <div className="zoom-slider-container">
            <input
              type="range"
              min="1"
              max="40"
              step="0.1"
              value={zoom}
              onChange={handleZoomSliderChange}
              className="zoom-slider"
              title={`Zoom: ${zoom}x`}
            />
          </div>
        </div>

        <button 
          className="collapse-btn"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expandir navegador' : 'Contraer navegador'}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            className={`collapse-icon ${isCollapsed ? 'collapsed' : ''}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Contenido colapsable */}
      <div className="navigator-content">
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
          {/* Mini canvas como fondo */}
          {compositeCanvasRef && (
            <canvas
              ref={miniCanvasRef}
              className="navigator-canvas-bg"
              style={{
                position: 'absolute',
                width: `${scaledCanvasWidth}px`,
                height: `${scaledCanvasHeight}px`,
                left: (navigatorSize - scaledCanvasWidth) / 2  ,
                top: (navigatorSize - scaledCanvasHeight) / 2,
               
                borderRadius: '4px',
                pointerEvents: 'none',
                imageRendering: 'pixelated',
                
              }}
            />
          )}

          {/* Rectángulo del viewport */}
          <div 
            className="navigator-viewport"
            style={{
              position: 'absolute',
              width: viewportRectWidth,
              height: viewportRectHeight,
              left: (navigatorSize - scaledCanvasWidth) / 2 + viewportRectX,
              top: (navigatorSize - scaledCanvasHeight) / 2 + viewportRectY,
              border: '2px solid #007bff',
              backgroundColor: 'rgba(0, 123, 255, 0.1)',
              pointerEvents: 'none',
              zIndex: 2
            }}
          />

          <div className="viewport-coords" style={{ position: 'absolute', bottom: '5px', left: '5px', fontSize: '10px', color: '#666', zIndex: 3 }}>
            <span>
              ({Math.floor(viewportOffset.x)}, {Math.floor(viewportOffset.y)})
            </span>
          </div>
        </div>

        <div className="navigator-controls">
          <button 
            className="control-btn-viewport primary"
            onClick={() => {onViewportMove(-viewportOffset.x, -viewportOffset.y);
              
            }}
            title="Centrar viewport en origen (0,0)"
          >
            Esquina
          </button>
          <button 
            className="control-btn-viewport"
            onClick={() => {
              const centerX = (totalWidth - viewportWidth) / 2;
              const centerY = (totalHeight - viewportHeight) / 2;
              onViewportMove(centerX - viewportOffset.x, centerY - viewportOffset.y);
            }}
            title="Ir al centro del canvas"
          >
            Centrar
            <MdFilterCenterFocus />
          </button>
        </div>
      </div>
    
    </div>
  );
};

export default ViewportNavigator;