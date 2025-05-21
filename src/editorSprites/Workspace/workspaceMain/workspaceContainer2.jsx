import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePointer, useLayerManager } from '../hooks/hooks';

function CanvasTracker() {
  const workspaceRef = useRef(null);
  const artboardRef = useRef(null);
  const viewportRef = useRef(null);
  const [activeLayerId, setActiveLayerId] = useState(null);
  
  // Tamaño lógico del canvas (grid de píxeles)
  const width = 100;
  const height = 100;
  
  // Factor de zoom (tamaño visual de cada píxel)
  const [zoom, setZoom] = useState(10);
  // Límite del viewport en píxeles (1024x1024)
  const VIEWPORT_LIMIT = 1024;
  
  // Posición del viewport
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // useLayerManager contiene toda la funcionalidad de canvas integrada
  const {
    layers,
    addLayer,
    deleteLayer,
    moveLayerUp,
    moveLayerDown,
    toggleLayerVisibility,
    renameLayer,
    getContext,
    clearCanvas,
    renderToCanvas
  } = useLayerManager({ width, height, zoom });

  // Establece la capa activa cuando se carga el componente
  useEffect(() => {
    if (layers.length > 0 && !activeLayerId) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);

  // Tracking del mouse y dibujo
  const { position, relativeToTarget, isPressed, path } = usePointer(workspaceRef, artboardRef);
  const lastPixelRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Convierte coordenadas del cursor a coordenadas de píxel
  const getPixelCoordinates = (coords) => {
    return {
      x: Math.floor(coords.x / zoom),
      y: Math.floor(coords.y / zoom)
    };
  };

  // Implementación del algoritmo de Bresenham para dibujar líneas de píxeles
  const drawPixelLine = (ctx, x0, y0, x1, y1) => {
    // Asegurarse de que estamos dentro de los límites
    const inBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
    
    // Algoritmo de Bresenham para dibujar líneas de píxeles
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
      // Si está dentro de los límites, dibuja el píxel
      if (inBounds(x0, y0)) {
        ctx.fillRect(x0 * zoom, y0 * zoom, zoom, zoom);
      }
      
      // Hemos llegado al punto final
      if (x0 === x1 && y0 === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  // Función para manejar el zoom
  const handleZoom = useCallback((delta) => {
    setZoom(prevZoom => {
      // Limita el zoom a un rango razonable
      const newZoom = Math.max(1, Math.min(50, prevZoom + delta));
      return newZoom;
    });
  }, []);

  // Efecto para manejar el zoom con la rueda del ratón
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        handleZoom(delta);
      }
    };

    const workspace = workspaceRef.current;
    if (workspace) {
      workspace.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (workspace) {
        workspace.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleZoom]);

  // Efecto para ajustar los canvas cuando cambia el zoom
  useEffect(() => {
    // Guardar el contenido de cada capa antes de cambiar el zoom
    const layerContents = {};
    
    layers.forEach(layer => {
      const canvas = layer.canvasRef.current;
      if (canvas) {
        // Guardar el contenido del canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width * zoom;
        tempCanvas.height = height * zoom;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);
        layerContents[layer.id] = tempCanvas;
      }
    });
    
    // Ajustar el tamaño de los canvas al nuevo zoom y restaurar el contenido
    layers.forEach(layer => {
      const canvas = layer.canvasRef.current;
      if (canvas) {
        // Ajustar el tamaño del canvas al nuevo zoom
        canvas.width = width * zoom;
        canvas.height = height * zoom;
        
        // Reconfigurar el contexto
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          
          // Restaurar el contenido si existe
          if (layerContents[layer.id]) {
            ctx.drawImage(layerContents[layer.id], 0, 0, width * zoom, height * zoom);
          }
        }
      }
    });
  }, [zoom, layers, width, height]);

  // Manejo de arrastre para el panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handlePanStart = useCallback((e) => {
    // Solo inicia el panning si es el botón medio o Alt+clic izquierdo
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0 && !e.altKey) {
      // Si es clic izquierdo sin Alt, podría ser para dibujar
      isDrawingRef.current = true;
    }
  }, []);

  const handlePanMove = useCallback((e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setPanOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart]);

  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
    isDrawingRef.current = false;
    lastPixelRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handlePanEnd);
    window.addEventListener('mousemove', handlePanMove);
    
    return () => {
      window.removeEventListener('mouseup', handlePanEnd);
      window.removeEventListener('mousemove', handlePanMove);
    };
  }, [handlePanEnd, handlePanMove]);

  // Función separada para manejar el dibujo
  const handleDrawing = useCallback((e) => {
    if (!isDrawingRef.current || !activeLayerId || isDragging) {
      return;
    }
    
    const rect = artboardRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    
    // Coordenadas relativas al canvas con el zoom actual
    const pixelCoords = {
      x: Math.floor(rawX / zoom),
      y: Math.floor(rawY / zoom)
    };
    console.log(pixelCoords);
    // Dibuja en la capa activa
    renderToCanvas(activeLayerId, (ctx) => {
      ctx.fillStyle = '#222';
      
      if (!lastPixelRef.current) {
        // Si es el primer punto, dibuja solo un píxel
        if (pixelCoords.x >= 0 && pixelCoords.x < width && 
            pixelCoords.y >= 0 && pixelCoords.y < height) {
          ctx.fillRect(
            pixelCoords.x * zoom,
            pixelCoords.y * zoom,
            zoom,
            zoom
          );
        }
      } else {
        // Dibuja una línea desde el último punto hasta el actual
        drawPixelLine(
          ctx, 
          lastPixelRef.current.x, 
          lastPixelRef.current.y, 
          pixelCoords.x, 
          pixelCoords.y
        );
      }
    });
    
    lastPixelRef.current = pixelCoords;
  }, [activeLayerId, zoom, width, height, renderToCanvas, isDragging]);

  // Efecto para configurar los event listeners para dibujar
  useEffect(() => {
    const artboard = artboardRef.current;
    if (!artboard) return;

    const handleMouseDown = (e) => {
      if (e.button === 0 && !e.altKey) {
        isDrawingRef.current = true;
        handleDrawing(e); // Dibujar el punto inicial
      }
    };

    const handleMouseMove = (e) => {
      if (isDrawingRef.current && !isDragging) {
        handleDrawing(e);
      }
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
      lastPixelRef.current = null;
    };

    artboard.addEventListener('mousedown', handleMouseDown);
    artboard.addEventListener('mousemove', handleMouseMove);
    artboard.addEventListener('mouseup', handleMouseUp);
    artboard.addEventListener('mouseleave', handleMouseUp);

    return () => {
      artboard.removeEventListener('mousedown', handleMouseDown);
      artboard.removeEventListener('mousemove', handleMouseMove);
      artboard.removeEventListener('mouseup', handleMouseUp);
      artboard.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleDrawing, isDragging]);

  // Calcula el tamaño visible del viewport basado en el límite
  const visibleWidth = Math.min(width * zoom, VIEWPORT_LIMIT);
  const visibleHeight = Math.min(height * zoom, VIEWPORT_LIMIT);

  return (
    <div className='workspace2-container' style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* UI Panel para controles de capa */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: '#fff',
        padding: '1rem',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        fontFamily: 'sans-serif',
        zIndex: 100
      }}>
        <h4>Layer Manager</h4>
        <button onClick={addLayer}>Add Layer</button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {layers.map((layer) => (
            <li key={layer.id} style={{ 
              marginTop: '0.5rem',
              padding: '5px',
              backgroundColor: activeLayerId === layer.id ? '#e0f7fa' : 'transparent',
              borderRadius: '4px'
            }}>
              <div>
                <input
                  type="radio"
                  name="activeLayer"
                  checked={activeLayerId === layer.id}
                  onChange={() => setActiveLayerId(layer.id)}
                  style={{ marginRight: '5px' }}
                />
                <strong>{layer.name}</strong>
                <div style={{ float: 'right' }}>
                  <button onClick={() => moveLayerUp(layer.id)}>↑</button>
                  <button onClick={() => moveLayerDown(layer.id)}>↓</button>
                  <button onClick={() => toggleLayerVisibility(layer.id)}>
                    {layer.visible ? '👁️' : '⊗'}
                  </button>
                  <button 
                    onClick={() => deleteLayer(layer.id)}
                    disabled={layers.length <= 1} // No permitir eliminar la última capa
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {/* Controles de capa activa */}
        {activeLayerId && (
          <div style={{ marginTop: '1rem', padding: '0.5rem', border: '1px solid #eee', borderRadius: '4px' }}>
            <h5>Herramientas de capa</h5>
            <button onClick={() => clearCanvas(activeLayerId)}>Limpiar capa</button>
            <input 
              type="text" 
              placeholder="Cambiar nombre"
              onBlur={(e) => {
                if (e.target.value) {
                  renameLayer(activeLayerId, e.target.value);
                  e.target.value = '';
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  renameLayer(activeLayerId, e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
        )}

        {/* Controles de Zoom */}
        <div style={{ marginTop: '1rem', padding: '0.5rem', border: '1px solid #eee', borderRadius: '4px' }}>
          <h5>Zoom Control</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => handleZoom(-1)} disabled={zoom <= 1}>-</button>
            <span style={{ minWidth: '40px', textAlign: 'center' }}>{zoom}x</span>
            <button onClick={() => handleZoom(1)} disabled={zoom >= 50}>+</button>
          </div>
          <div style={{ fontSize: '11px', marginTop: '5px', color: '#666' }}>
            Tip: Usa Ctrl+Rueda del ratón
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        className='workspace-container'
        onMouseDown={handlePanStart}
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      >
        <div className='workspace' ref={workspaceRef}>
          <div className='viewport-container' 
            ref={viewportRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: visibleWidth,
              height: visibleHeight,
              transform: `translate(-50%, -50%)`,
              overflow: 'hidden',
              borderRadius: '4px',
              boxShadow: '0 0 20px rgba(0,0,0,0.3)',
              border: '1px solid #ccc'
            }}>
            <div
              className='canvas-container'
              style={{
                transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
                position: 'absolute',
                top: '50%',
                left: '50%',
                willChange: 'transform',
              }}
            >
              <div
                className='artboard'
                ref={artboardRef}
                style={{
                  width: width * zoom,
                  height: height * zoom,
                  background: '#f0f0f0', // Fondo del artboard
                  position: 'relative',
                }}
              >
                {/* Renderiza todas las capas en orden según zIndex */}
                {layers.map((layer) => (
                  <canvas
                    key={layer.id}
                    ref={layer.canvasRef}
                    width={width * zoom}
                    height={height * zoom}
                    className='layer-canvas'
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      display: layer.visible ? 'block' : 'none',
                      zIndex: layer.zIndex,
                      pointerEvents: 'none' // Esto permite que los eventos pasen al artboard
                    }}
                  />
                ))}
                
                {/* Grid de píxeles (opcional) */}
                <div 
                  className="pixel-grid" 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    backgroundSize: `${zoom}px ${zoom}px`,
                    backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Información de coordenadas y zoom */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        background: 'rgba(255,255,255,0.8)',
        padding: '0.5rem',
        borderRadius: '4px',
        fontSize: '12px',
      }}>
        <div>Coordenadas: X: {Math.floor(relativeToTarget.x / zoom)}, Y: {Math.floor(relativeToTarget.y / zoom)}</div>
        <div>Zoom: {zoom}x • Viewport: {visibleWidth}x{visibleHeight}</div>
        <div>Modo: {isDragging ? 'Navegación' : isPressed ? 'Dibujando' : 'Normal'}</div>
      </div>
    </div>
  );
}

export default CanvasTracker;