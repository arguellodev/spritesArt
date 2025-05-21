import { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import React from 'react';

/**
 * Custom hook for tracking pointer/mouse interactions
 */
export function usePointer(containerRef, targetRef, ignoreRef) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [relativeToTarget, setRelativeToTarget] = useState({ x: 0, y: 0 });
  const [isPressed, setIsPressed] = useState(false);
  const [path, setPath] = useState([]);

  useEffect(() => {
    const container = containerRef.current;
    const target = targetRef.current;
    const ignore = ignoreRef?.current;

    if (!container || !target) return;

    const isInsideIgnore = (e) => {
      const ignore = ignoreRef?.current;
      if (!ignore) return false;
      return ignore.contains(e.target) || e.composedPath?.().includes(ignore);
    };
    

    const updatePosition = (e) => {
      const rect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPosition({ x, y });

      const relX = e.clientX - targetRect.left;
      const relY = e.clientY - targetRect.top;
      setRelativeToTarget({ x: relX, y: relY });

      return { container: { x, y }, target: { x: relX, y: relY } };
    };

    const handlePointerDown = (e) => {
      if (isInsideIgnore(e)) return;
      const positions = updatePosition(e);
      setIsPressed(true);
      setPath([positions.target]);
    };

    const handlePointerMove = (e) => {
      if (isInsideIgnore(e)) return;
      const positions = updatePosition(e);
      if (isPressed) {
        setPath((prev) => [...prev, positions.target]);
      }
    };

    const handlePointerUp = (e) => {
      if (isInsideIgnore(e)) return;
      updatePosition(e);
      setIsPressed(false);
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [containerRef, targetRef, ignoreRef, isPressed]);

  return { position, relativeToTarget, isPressed, path };
}


/**
 * Improved Layer Manager hook
 * Uses a composite rendering approach for better performance
 */
export function useLayerManager({ width, height, viewportWidth, viewportHeight, zoom }) {
  // Reference to the composite canvas (what's actually shown to the user)
  const compositeCanvasRef = useRef(null);
  
  // State for layers - each layer is just data, not an actual DOM canvas element
  const [layers, setLayers] = useState([]);
  
  // In-memory canvases for each layer (not attached to DOM)
  const layerCanvasesRef = useRef({});
  
  // Current viewport position
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  
  // Initialize with a default layer when the hook is first used
  useEffect(() => {
    if (layers.length === 0) {
      const defaultLayerId = nanoid();
      setLayers([{
        id: defaultLayerId,
        name: 'Layer 1',
        visible: true,
        zIndex: 0
      }]);
      
      // Create the in-memory canvas for this layer
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      
      // Store it in our ref
      layerCanvasesRef.current[defaultLayerId] = canvas;
    }
  }, [width, height]);
  
  // Initialize the composite canvas
  useEffect(() => {
    if (compositeCanvasRef.current) {
      compositeCanvasRef.current.width = viewportWidth * zoom;
      compositeCanvasRef.current.height = viewportHeight * zoom;
      
      const ctx = compositeCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
      }
      
      // Initial composite render
      compositeRender();
    }
  }, [viewportWidth, viewportHeight, zoom]);
  
  /**
   * Render all visible layers to the composite canvas
   */
  const compositeRender = useCallback(() => {
    if (!compositeCanvasRef.current) return;
    
    const ctx = compositeCanvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear the composite canvas
    ctx.clearRect(0, 0, viewportWidth * zoom, viewportHeight * zoom);
    
    // Sort layers by zIndex
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    
    // Render each visible layer onto the composite canvas
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      
      const layerCanvas = layerCanvasesRef.current[layer.id];
      if (!layerCanvas) continue;
      
      // Get the section of the layer that should be visible in the viewport
      ctx.drawImage(
        layerCanvas,
        viewportOffset.x, viewportOffset.y,   // Source position (portion of the layer to show)
        viewportWidth, viewportHeight,        // Source dimensions
        0, 0,                                 // Destination position (always 0,0 for the viewport)
        viewportWidth * zoom, viewportHeight * zoom // Scaled dimensions
      );
    }
  }, [layers, viewportOffset, viewportWidth, viewportHeight, zoom]);
  
  // Render the composite canvas whenever layers or viewport changes
  useEffect(() => {
    compositeRender();
  }, [layers, viewportOffset, compositeRender]);
  
  /**
   * Add a new layer
   */
  const addLayer = useCallback(() => {
    // Generate a unique ID for the new layer
    const newLayerId = nanoid();
    
    // Find the highest zIndex and add 1
    const highestZIndex = layers.length > 0 
      ? Math.max(...layers.map(layer => layer.zIndex)) 
      : -1;
    
    // Create a new layer object
    const newLayer = {
      id: newLayerId,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      zIndex: highestZIndex + 1
    };
    
    // Create the in-memory canvas for this layer
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    // Store it in our ref
    layerCanvasesRef.current[newLayerId] = canvas;
    
    // Add the layer to our state
    setLayers(prevLayers => [...prevLayers, newLayer]);
    
    return newLayerId;
  }, [layers, width, height]);
  
  /**
   * Delete a layer by ID
   */
  const deleteLayer = useCallback((layerId) => {
    // Don't delete if it's the only layer
    if (layers.length <= 1) return;
    
    // Remove the layer's canvas from memory
    delete layerCanvasesRef.current[layerId];
    
    // Remove the layer from state
    setLayers(prevLayers => prevLayers.filter(layer => layer.id !== layerId));
  }, [layers]);
  
  /**
   * Move a layer up in the stack (increase zIndex)
   */
  const moveLayerUp = useCallback((layerId) => {
    setLayers(prevLayers => {
      // Find the current layer and the one above it
      const layer = prevLayers.find(l => l.id === layerId);
      if (!layer) return prevLayers;
      
      const layersOrderedByZIndex = [...prevLayers].sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = layersOrderedByZIndex.findIndex(l => l.id === layerId);
      
      // If already at the top, do nothing
      if (currentIndex === layersOrderedByZIndex.length - 1) return prevLayers;
      
      // Swap zIndex with the layer above
      const layerAbove = layersOrderedByZIndex[currentIndex + 1];
      
      return prevLayers.map(l => {
        if (l.id === layerId) return { ...l, zIndex: layerAbove.zIndex };
        if (l.id === layerAbove.id) return { ...l, zIndex: layer.zIndex };
        return l;
      });
    });
  }, []);
  
  /**
   * Move a layer down in the stack (decrease zIndex)
   */
  const moveLayerDown = useCallback((layerId) => {
    setLayers(prevLayers => {
      // Find the current layer and the one below it
      const layer = prevLayers.find(l => l.id === layerId);
      if (!layer) return prevLayers;
      
      const layersOrderedByZIndex = [...prevLayers].sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = layersOrderedByZIndex.findIndex(l => l.id === layerId);
      
      // If already at the bottom, do nothing
      if (currentIndex === 0) return prevLayers;
      
      // Swap zIndex with the layer below
      const layerBelow = layersOrderedByZIndex[currentIndex - 1];
      
      return prevLayers.map(l => {
        if (l.id === layerId) return { ...l, zIndex: layerBelow.zIndex };
        if (l.id === layerBelow.id) return { ...l, zIndex: layer.zIndex };
        return l;
      });
    });
  }, []);
  
  /**
   * Toggle a layer's visibility
   */
  const toggleLayerVisibility = useCallback((layerId) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  }, []);
  
  /**
   * Rename a layer
   */
  const renameLayer = useCallback((layerId, newName) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId ? { ...layer, name: newName } : layer
      )
    );
  }, []);
  
  /**
   * Clear a layer (erase all content)
   */
  const clearLayer = useCallback((layerId) => {
    const canvas = layerCanvasesRef.current[layerId];
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    // Re-render the composite view
    compositeRender();
  }, [width, height, compositeRender]);
  
  /**
   * Draw on a specific layer
   */
  const drawOnLayer = useCallback((layerId, drawFn) => {
    const canvas = layerCanvasesRef.current[layerId];
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Execute the drawing function
    drawFn(ctx);
    
    // Re-render the composite view
    compositeRender();
  }, [compositeRender]);
  
  /**
   * Update the viewport position (pan/scroll)
   */
  const updateViewport = useCallback((x, y) => {
    // Ensure the viewport stays within bounds
    const boundedX = Math.max(0, Math.min(x, width - viewportWidth));
    const boundedY = Math.max(0, Math.min(y, height - viewportHeight));
    
    setViewportOffset({
      x: boundedX,
      y: boundedY
    });
  }, [width, height, viewportWidth, viewportHeight]);
  
  /**
   * Move the viewport by a delta amount
   */
  const moveViewport = useCallback((deltaX, deltaY) => {
    setViewportOffset(prev => {
      // Calculate new position
      const newX = prev.x + deltaX;
      const newY = prev.y + deltaY;
      
      // Ensure the viewport stays within bounds
      const boundedX = Math.max(0, Math.min(newX, width - viewportWidth));
      const boundedY = Math.max(0, Math.min(newY, height - viewportHeight));
      
      return {
        x: boundedX,
        y: boundedY
      };
    });
  }, [width, height, viewportWidth, viewportHeight]);
  
  /**
   * Get the current viewport position
   */
  const getViewportPosition = useCallback(() => {
    return { ...viewportOffset };
  }, [viewportOffset]);
  
  /**
   * Convert viewport coordinates to canvas coordinates
   */
  const viewportToCanvasCoords = useCallback((viewportX, viewportY) => {
    return {
      x: Math.floor(viewportX + viewportOffset.x),
      y: Math.floor(viewportY + viewportOffset.y)
    };
  }, [viewportOffset]);
  
  
  /**
   * Convert canvas coordinates to viewport coordinates
   */
  const canvasToViewportCoords = useCallback((canvasX, canvasY) => {
    return {
      x: canvasX - viewportOffset.x,
      y: canvasY - viewportOffset.y
    };
  }, [viewportOffset]);
  
  /**
   * Bresenham's line algorithm for drawing smooth pixel lines
   * 
   * 
   */
  function drawBrush(ctx, canvasCoords, size) {
    const offset = Math.floor(size / 2);
    const startX = canvasCoords.x - offset;
    const startY = canvasCoords.y - offset;
    
    ctx.fillRect(startX, startY, size, size);
  }
  const drawPixelLine = useCallback((ctx, x0, y0, x1, y1, brushSize = 1) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
      // Usa el pincel centrado en vez de un solo píxel
      drawBrush(ctx, { x: x0, y: y0 }, brushSize);
  
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
  }, []);
  
  
// Add this to your useLayerManager hook right before the return statement

/**
 * Get image data from a specific layer within a defined region
 * @param {string} layerId - ID of the layer to get data from
 * @param {number} x - X coordinate of the top-left corner of the region
 * @param {number} y - Y coordinate of the top-left corner of the region
 * @param {number} width - Width of the region
 * @param {number} height - Height of the region
 * @returns {Promise<ImageData>} - Promise resolving to the image data from the specified region
 */
const getLayerData = useCallback((layerId, x, y, width, height) => {
  return new Promise((resolve) => {
    const canvas = layerCanvasesRef.current[layerId];
    if (!canvas) {
      resolve(null);
      return;
    }
    
    // Make sure coordinates are within bounds
    const boundedX = Math.max(0, Math.min(x, canvas.width - 1));
    const boundedY = Math.max(0, Math.min(y, canvas.height - 1));
    const boundedWidth = Math.max(1, Math.min(width, canvas.width - boundedX));
    const boundedHeight = Math.max(1, Math.min(height, canvas.height - boundedY));
    
    const ctx = canvas.getContext('2d');
    try {
      const imageData = ctx.getImageData(boundedX, boundedY, boundedWidth, boundedHeight);
      resolve(imageData);
    } catch (e) {
      console.error('Error getting layer data:', e);
      resolve(null);
    }
  });
}, []);

/**
 * Función para borrar píxeles en un punto específico de una capa
 * @param {string} layerId - ID de la capa donde borrar los píxeles
 * @param {number} x - Coordenada X del centro del borrador
 * @param {number} y - Coordenada Y del centro del borrador
 * @param {number} size - Tamaño del borrador (ancho y alto en píxeles)
 * @param {boolean} circle - Si es true, borra en forma circular, si es false, en forma cuadrada
 * @returns {boolean} - True si se realizó el borrado correctamente, false si hubo algún error
 */
const erasePixels = useCallback((layerId, x, y, size = 1, circle = false) => {
  const canvas = layerCanvasesRef.current[layerId];
  if (!canvas) return false;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  
  // Calcular las coordenadas del área a borrar
  const offset = Math.floor(size / 2);
  const startX = Math.max(0, x - offset);
  const startY = Math.max(0, y - offset);
  const boundedWidth = Math.min(size, canvas.width - startX);
  const boundedHeight = Math.min(size, canvas.height - startY);
  
  if (boundedWidth <= 0 || boundedHeight <= 0) return false;
  
  // Si queremos borrar en forma circular, necesitamos calcular la distancia desde el centro
  if (circle) {
    // Guardar configuración actual
    ctx.save();
    
    // Establecer composición global para borrar (usar transparencia)
    ctx.globalCompositeOperation = 'destination-out';
    
    // Dibujar un círculo en la posición especificada
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Restaurar configuración
    ctx.restore();
  } else {
    // Borrado cuadrado - simplemente borrar un rectángulo completo
    ctx.clearRect(startX, startY, boundedWidth, boundedHeight);
  }
  
  // Re-renderizar la vista compuesta
  compositeRender();
  
  return true;
}, [compositeRender]);

// Puedes añadir esta función a tu objeto de retorno en useLayerManager para exponerla:
// En el return { ... } añade:
// erasePixels,

const getCanvasCoordsFromPointer = useCallback((pointerX, pointerY) => {
  // Convierte coordenadas del puntero a coordenadas del canvas
  const viewportX = Math.floor(pointerX / zoom);
  const viewportY = Math.floor(pointerY / zoom);
  return viewportToCanvasCoords(viewportX, viewportY);
}, [zoom, viewportToCanvasCoords]);

const getPointerCoordsFromCanvas = useCallback((canvasX, canvasY) => {
  // Convierte coordenadas del canvas a coordenadas del puntero
  const viewportCoords = canvasToViewportCoords(canvasX, canvasY);
  return {
    x: viewportCoords.x * zoom,
    y: viewportCoords.y * zoom
  };
}, [zoom, canvasToViewportCoords]);


return {
  // State
  layers,
  compositeCanvasRef,
  viewportOffset,
  
  // Layer management
  addLayer,
  deleteLayer,
  moveLayerUp,
  moveLayerDown,
  toggleLayerVisibility,
  renameLayer,
  clearLayer,
  
  // Drawing and rendering
  drawOnLayer,
  compositeRender,
  
  // Viewport management
  updateViewport,
  moveViewport,
  getViewportPosition,
  viewportToCanvasCoords,
  canvasToViewportCoords,
  
  // Utilities
  drawPixelLine,
  
  // Add the new function here
  getLayerData,
  erasePixels,
  getCanvasCoordsFromPointer,
  getPointerCoordsFromCanvas
};
}
