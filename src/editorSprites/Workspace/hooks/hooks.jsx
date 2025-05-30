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
  // Agregar estos estados al inicio del hook useLayerManager (después de los estados existentes)

  // Modificaciones para el hook useLayerManager con sistema jerárquico de grupos
// Estados adicionales para jerarquía de grupos
const [groupZIndexes, setGroupZIndexes] = useState({}); // {groupId: zIndex}
const [nextGroupZIndex, setNextGroupZIndex] = useState(0);


// Estado para almacenar los grupos de píxeles por capa
const [pixelGroups, setPixelGroups] = useState({});

// Estado para el grupo actualmente seleccionado
const [selectedGroup, setSelectedGroup] = useState(null);
  // Reference to the composite canvas (what's actually shown to the user)
  const compositeCanvasRef = useRef(null);
  
  // State for layers - each layer is just data, not an actual DOM canvas element
  const [layers, setLayers] = useState([]);
  
  // In-memory canvases for each layer (not attached to DOM)
  const layerCanvasesRef = useRef({});
  
  // Current viewport position
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });

  ///=========Funciones de utilidad para la gestion de grupos =================

  // 4. NUEVA FUNCIÓN para obtener capas de forma jerárquica
const getHierarchicalLayers = useCallback(() => {
  const mainLayers = layers.filter(layer => !layer.isGroupLayer);
  
  return mainLayers.map(mainLayer => ({
    ...mainLayer,
    groupLayers: layers.filter(layer => 
      layer.isGroupLayer && layer.parentLayerId === mainLayer.id
    ).sort((a, b) => a.zIndex - b.zIndex)
  }));
}, [layers]);

// 7. NUEVA FUNCIÓN para obtener solo las capas principales (para UI)
const getMainLayers = useCallback(() => {
  return layers.filter(layer => !layer.isGroupLayer);
}, [layers]);

// 8. NUEVA FUNCIÓN para obtener capas de grupo de una capa específica
const getGroupLayersForParent = useCallback((parentLayerId) => {
  return layers.filter(layer => 
    layer.isGroupLayer && layer.parentLayerId === parentLayerId
  ).sort((a, b) => a.zIndex - b.zIndex);
}, [layers]);
  
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
  // 6. MODIFICAR LA FUNCIÓN compositeRender para respetar la jerarquía
const compositeRender = useCallback(() => {
  if (!compositeCanvasRef.current) return;
  
  const ctx = compositeCanvasRef.current.getContext('2d');
  if (!ctx) return;
  
  // Clear the composite canvas
  ctx.clearRect(0, 0, viewportWidth * zoom, viewportHeight * zoom);
  
  // Obtener capas jerárquicas
  const hierarchicalLayers = getHierarchicalLayers();
  
  // Ordenar capas principales por zIndex
  const sortedMainLayers = hierarchicalLayers.sort((a, b) => a.zIndex - b.zIndex);
  
  // Renderizar cada capa principal y sus capas de grupo
  for (const mainLayer of sortedMainLayers) {
    if (!mainLayer.visible) continue;
    
    // Renderizar capa principal
    const mainCanvas = layerCanvasesRef.current[mainLayer.id];
    if (mainCanvas) {
      ctx.drawImage(
        mainCanvas,
        viewportOffset.x, viewportOffset.y,
        viewportWidth, viewportHeight,
        0, 0,
        viewportWidth * zoom, viewportHeight * zoom
      );
    }
    
    // Renderizar capas de grupo de esta capa principal
    for (const groupLayer of mainLayer.groupLayers) {
      if (!groupLayer.visible) continue;
      
      const groupCanvas = layerCanvasesRef.current[groupLayer.id];
      if (groupCanvas) {
        ctx.drawImage(
          groupCanvas,
          viewportOffset.x, viewportOffset.y,
          viewportWidth, viewportHeight,
          0, 0,
          viewportWidth * zoom, viewportHeight * zoom
        );
      }
    }
  }
}, [layers, viewportOffset, viewportWidth, viewportHeight, zoom, getHierarchicalLayers]);

  // Render the composite canvas whenever layers or viewport changes
  useEffect(() => {
    compositeRender();
  }, [layers, viewportOffset, compositeRender]);
  
  /**
   * Add a new layer
   */
//logica especial para manejar las capas de grupos: 
// Dentro de useLayerManager:
// 2. MODIFICAR LA FUNCIÓN addGroupLayer
const addGroupLayer = useCallback((parentLayerId) => {
  const newLayerId = nanoid();
  
  const newLayer = {
    id: newLayerId,
    name: `Grupo Layer ${layers.length + 1}`,
    visible: true,
    zIndex: Math.max(...layers.map(l => l.zIndex)) + 1,
    isGroupLayer: true,
    parentLayerId: parentLayerId, // Nueva propiedad para vincular con la capa padre
    children: [] // Para futuras subcapas si es necesario
  };

  // Crear canvas para esta capa
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  layerCanvasesRef.current[newLayerId] = canvas;

  // Agregar la nueva capa a la estructura
  setLayers(prev => {
    return prev.map(layer => {
      // Si esta es la capa padre, agregar el ID del grupo a sus children
      if (layer.id === parentLayerId) {
        return {
          ...layer,
          children: [...(layer.children || []), newLayerId]
        };
      }
      return layer;
    }).concat([newLayer]); // Agregar la nueva capa al final
  });

  return newLayerId;
}, [layers, width, height]);



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
    // No eliminar si es la única capa principal
    const mainLayers = layers.filter(layer => !layer.isGroupLayer);
    if (mainLayers.length <= 1 && mainLayers.some(layer => layer.id === layerId)) {
      return;
    }
  
    const layerToDelete = layers.find(layer => layer.id === layerId);
    
    if (layerToDelete) {
      // Si es una capa principal, eliminar también sus capas de grupo
      if (!layerToDelete.isGroupLayer) {
        const groupLayersToDelete = layers.filter(layer => 
          layer.isGroupLayer && layer.parentLayerId === layerId
        );
        
        // Eliminar canvas de todas las capas relacionadas
        groupLayersToDelete.forEach(groupLayer => {
          delete layerCanvasesRef.current[groupLayer.id];
          // Limpiar grupos de píxeles asociados
          setPixelGroups(prev => {
            const newGroups = { ...prev };
            delete newGroups[groupLayer.id];
            return newGroups;
          });
        });
      }
      
      // Eliminar el canvas de la capa principal
      delete layerCanvasesRef.current[layerId];
      
      // Si es una capa de grupo, limpiar referencia del padre
      if (layerToDelete.isGroupLayer && layerToDelete.parentLayerId) {
        setLayers(prev => prev.map(layer => {
          if (layer.id === layerToDelete.parentLayerId) {
            return {
              ...layer,
              children: (layer.children || []).filter(childId => childId !== layerId)
            };
          }
          return layer;
        }));
        
        // Limpiar grupos de píxeles
        setPixelGroups(prev => {
          const newGroups = { ...prev };
          delete newGroups[layerId];
          return newGroups;
        });
      }
    }
  
    // Remover la capa y todas sus capas de grupo del estado
    setLayers(prevLayers => prevLayers.filter(layer => {
      if (layer.id === layerId) return false;
      if (layer.isGroupLayer && layer.parentLayerId === layerId) return false;
      return true;
    }));
  }, [layers]);
  
  /**
   * Move a layer up in the stack (increase zIndex)
   */
  // 9. MODIFICAR LA FUNCIÓN moveLayerUp para manejar jerarquía
const moveLayerUp = useCallback((layerId) => {
  setLayers(prevLayers => {
    const layer = prevLayers.find(l => l.id === layerId);
    if (!layer) return prevLayers;
    
    if (layer.isGroupLayer) {
      // Para capas de grupo, solo mover dentro de su grupo padre
      const siblingGroupLayers = prevLayers.filter(l => 
        l.isGroupLayer && l.parentLayerId === layer.parentLayerId
      ).sort((a, b) => a.zIndex - b.zIndex);
      
      const currentIndex = siblingGroupLayers.findIndex(l => l.id === layerId);
      if (currentIndex === siblingGroupLayers.length - 1) return prevLayers;
      
      const layerAbove = siblingGroupLayers[currentIndex + 1];
      
      return prevLayers.map(l => {
        if (l.id === layerId) return { ...l, zIndex: layerAbove.zIndex };
        if (l.id === layerAbove.id) return { ...l, zIndex: layer.zIndex };
        return l;
      });
    } else {
      // Para capas principales, comportamiento normal
      const mainLayers = prevLayers.filter(l => !l.isGroupLayer).sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = mainLayers.findIndex(l => l.id === layerId);
      
      if (currentIndex === mainLayers.length - 1) return prevLayers;
      
      const layerAbove = mainLayers[currentIndex + 1];
      
      return prevLayers.map(l => {
        if (l.id === layerId) return { ...l, zIndex: layerAbove.zIndex };
        if (l.id === layerAbove.id) return { ...l, zIndex: layer.zIndex };
        return l;
      });
    }
  });
}, []);

  
  /**
   * Move a layer down in the stack (decrease zIndex)
   */
  const moveLayerDown = useCallback((layerId) => {
    setLayers(prevLayers => {
      const layer = prevLayers.find(l => l.id === layerId);
      if (!layer) return prevLayers;
      
      if (layer.isGroupLayer) {
        // Para capas de grupo, solo mover dentro de su grupo padre
        const siblingGroupLayers = prevLayers.filter(l => 
          l.isGroupLayer && l.parentLayerId === layer.parentLayerId
        ).sort((a, b) => a.zIndex - b.zIndex);
        
        const currentIndex = siblingGroupLayers.findIndex(l => l.id === layerId);
        if (currentIndex === 0) return prevLayers;
        
        const layerBelow = siblingGroupLayers[currentIndex - 1];
        
        return prevLayers.map(l => {
          if (l.id === layerId) return { ...l, zIndex: layerBelow.zIndex };
          if (l.id === layerBelow.id) return { ...l, zIndex: layer.zIndex };
          return l;
        });
      } else {
        // Para capas principales, comportamiento normal
        const mainLayers = prevLayers.filter(l => !l.isGroupLayer).sort((a, b) => a.zIndex - b.zIndex);
        const currentIndex = mainLayers.findIndex(l => l.id === layerId);
        
        if (currentIndex === 0) return prevLayers;
        
        const layerBelow = mainLayers[currentIndex - 1];
        
        return prevLayers.map(l => {
          if (l.id === layerId) return { ...l, zIndex: layerBelow.zIndex };
          if (l.id === layerBelow.id) return { ...l, zIndex: layer.zIndex };
          return l;
        });
      }
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

 /**
 * Función de flood fill (relleno por inundación) para rellenar un área con un color específico
 * @param {string} layerId - ID de la capa donde aplicar el flood fill
 * @param {number} startX - Coordenada X del punto de inicio
 * @param {number} startY - Coordenada Y del punto de inicio  
 * @param {Object|string} fillColor - Color de relleno como objeto {r, g, b, a} o string "rgba(r,g,b,a)"
 * @param {number} tolerance - Tolerancia de color (0-255, por defecto 0 para color exacto)
 * @returns {boolean} - True si se realizó el relleno correctamente, false si hubo algún error
 */
const floodFill = useCallback((layerId, startX, startY, fillColor, tolerance = 0) => {
  const canvas = layerCanvasesRef.current[layerId];
  if (!canvas) return false;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  
  // Verificar que las coordenadas estén dentro del canvas
  if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) {
    return false;
  }
  
  // Normalizar el color de relleno a objeto RGBA
  const fillRGBA = normalizeToRGBA(fillColor);
  if (!fillRGBA) return false;
  
  // Obtener los datos de imagen del canvas completo
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Obtener el color del píxel inicial
  const startIndex = (startY * canvas.width + startX) * 4;
  const targetColor = {
    r: data[startIndex],
    g: data[startIndex + 1], 
    b: data[startIndex + 2],
    a: data[startIndex + 3]
  };
  
  // Si el color inicial es igual al color de relleno, no hacer nada
  if (colorsEqual(targetColor, fillRGBA, 0)) {
    return true;
  }
  
  // Pila para almacenar los píxeles a procesar
  const pixelStack = [{x: startX, y: startY}];
  const processedPixels = new Set();
  
  while (pixelStack.length > 0) {
    const {x, y} = pixelStack.pop();
    
    // Crear clave única para este píxel
    const pixelKey = `${x},${y}`;
    if (processedPixels.has(pixelKey)) continue;
    
    // Verificar límites
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
    
    // Obtener el color del píxel actual
    const currentIndex = (y * canvas.width + x) * 4;
    const currentColor = {
      r: data[currentIndex],
      g: data[currentIndex + 1],
      b: data[currentIndex + 2], 
      a: data[currentIndex + 3]
    };
    
    // Verificar si el color actual coincide con el color objetivo (dentro de la tolerancia)
    if (!colorsEqual(currentColor, targetColor, tolerance)) {
      continue;
    }
    
    // Marcar este píxel como procesado
    processedPixels.add(pixelKey);
    
    // Cambiar el color del píxel actual
    data[currentIndex] = fillRGBA.r;
    data[currentIndex + 1] = fillRGBA.g;
    data[currentIndex + 2] = fillRGBA.b;
    data[currentIndex + 3] = fillRGBA.a;
    
    // Añadir píxeles adyacentes a la pila (4-conectividad)
    pixelStack.push({x: x + 1, y: y});     // Derecha
    pixelStack.push({x: x - 1, y: y});     // Izquierda  
    pixelStack.push({x: x, y: y + 1});     // Abajo
    pixelStack.push({x: x, y: y - 1});     // Arriba
  }
  
  // Aplicar los cambios al canvas
  ctx.putImageData(imageData, 0, 0);
  
  // Re-renderizar la vista compuesta
  compositeRender();
  
  return true;
}, [compositeRender]);

/**
 * Función auxiliar para normalizar diferentes formatos de color a objeto RGBA
 * @param {Object|string} color - Color en formato objeto {r,g,b,a}, string "rgba(r,g,b,a)", hex "#RRGGBB", etc.
 * @returns {Object|null} - Objeto con propiedades r, g, b, a (0-255) o null si es inválido
 */
function normalizeToRGBA(color) {
  // Si ya es un objeto RGBA válido
  if (typeof color === 'object' && color !== null) {
    const { r, g, b, a = 255 } = color;
    if (isValidRGBAValue(r) && isValidRGBAValue(g) && isValidRGBAValue(b) && isValidRGBAValue(a)) {
      return { 
        r: Math.round(r), 
        g: Math.round(g), 
        b: Math.round(b), 
        a: Math.round(a) 
      };
    }
  }
  
  // Si es un string, intentar parsearlo
  if (typeof color === 'string') {
    const trimmed = color.trim();
    
    // Formato rgba(r, g, b, a) o rgb(r, g, b)
    const rgbaMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      const a = rgbaMatch[4] ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255;
      
      if (isValidRGBAValue(r) && isValidRGBAValue(g) && isValidRGBAValue(b) && isValidRGBAValue(a)) {
        return { r, g, b, a };
      }
    }
    
    // Formato hex #RRGGBB o #RRGGBBAA
    const hex = trimmed.replace('#', '');
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) : 255;
      
      if (isValidRGBAValue(r) && isValidRGBAValue(g) && isValidRGBAValue(b) && isValidRGBAValue(a)) {
        return { r, g, b, a };
      }
    }
  }
  
  return null; // Formato no reconocido o inválido
}

/**
 * Función auxiliar para validar si un valor RGBA está en el rango correcto
 * @param {number} value - Valor a validar
 * @returns {boolean} - True si el valor está entre 0 y 255
 */
function isValidRGBAValue(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 255;
}

/**
 * Función auxiliar para comparar dos colores con tolerancia
 * @param {Object} color1 - Primer color {r, g, b, a}
 * @param {Object} color2 - Segundo color {r, g, b, a}
 * @param {number} tolerance - Tolerancia de diferencia (0-255)
 * @returns {boolean} - True si los colores son similares dentro de la tolerancia
 */
function colorsEqual(color1, color2, tolerance) {
  return Math.abs(color1.r - color2.r) <= tolerance &&
         Math.abs(color1.g - color2.g) <= tolerance &&
         Math.abs(color1.b - color2.b) <= tolerance &&
         Math.abs(color1.a - color2.a) <= tolerance;
}

/**
 * Función auxiliar para convertir objeto RGBA a string CSS
 * @param {Object} rgba - Objeto color {r, g, b, a}
 * @returns {string} - String en formato "rgba(r, g, b, a)"
 */
function rgbaToString(rgba) {
  const alpha = rgba.a / 255; // Convertir de 0-255 a 0-1 para CSS
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`;
}

/**
 * Función auxiliar para crear un objeto RGBA desde valores individuales
 * @param {number} r - Valor rojo (0-255)
 * @param {number} g - Valor verde (0-255)
 * @param {number} b - Valor azul (0-255)
 * @param {number} a - Valor alpha (0-255, por defecto 255)
 * @returns {Object} - Objeto RGBA
 */
function createRGBA(r, g, b, a = 255) {
  return { 
    r: Math.max(0, Math.min(255, Math.round(r))), 
    g: Math.max(0, Math.min(255, Math.round(g))), 
    b: Math.max(0, Math.min(255, Math.round(b))), 
    a: Math.max(0, Math.min(255, Math.round(a))) 
  };
}


// Agregar estas funciones antes del return del hook

/**
 * Crear un nuevo grupo de píxeles en una capa específica
 * @param {string} layerId - ID de la capa donde crear el grupo
 * @param {Array} selectedPixels - Array de píxeles con formato [{x, y, color: {r, g, b, a}}, ...]
 * @param {string} groupName - Nombre opcional para el grupo
 * @returns {string} - ID del grupo creado
 */
// Modificar la estructura de grupos para incluir zIndex
// 3. MODIFICAR LA FUNCIÓN createPixelGroup (cambiar la llamada a addGroupLayer)
const createPixelGroup = useCallback((layerId, selectedPixels, groupName) => {
  // 1. Crear capa especial para el grupo (ahora pasa el layerId como padre)
  const groupLayerId = addGroupLayer(layerId);

 
 

  // 4. Guardar grupo con referencia a su capa
  const groupId = nanoid();
  setPixelGroups(prev => ({
    ...prev,
    [groupLayerId]: {
      ...prev[groupLayerId],
      [groupId]: {
        id: groupId,
        name: groupName,
        pixels: selectedPixels,
        parentLayer: layerId, // Capa original (para referencia)
        groupLayerId: groupLayerId // Nueva referencia a la capa del grupo
      }
    }
  }));

  return { groupId, groupLayerId };
}, [addGroupLayer, drawOnLayer]);

/**
 * Eliminar un grupo de píxeles
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo a eliminar
 * @returns {boolean} - True si se eliminó correctamente
 */
const deletePixelGroup = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    delete layerGroups[groupId];
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });

  // Si el grupo eliminado era el seleccionado, limpiar la selección
  if (selectedGroup && selectedGroup.id === groupId) {
    setSelectedGroup(null);
  }

  return true;
}, [selectedGroup]);

/**
 * Obtener todos los grupos de una capa específica
 * @param {string} layerId - ID de la capa
 * @returns {Array} - Array de grupos de la capa
 */
const getLayerGroups = useCallback((layerId) => {
  return Object.values(pixelGroups[layerId] || {});
}, [pixelGroups]);

/**
 * Obtener todos los grupos de todas las capas
 * @returns {Object} - Objeto con todos los grupos organizados por capa
 */
const getAllGroups = useCallback(() => {
  return pixelGroups;
}, [pixelGroups]);

/**
 * Verificar si un píxel específico pertenece a algún grupo y devolver los píxeles del grupo
 * @param {number} x - Coordenada X del píxel
 * @param {number} y - Coordenada Y del píxel
 * @param {string} layerId - ID de la capa (opcional, si no se proporciona busca en todas las capas)
 * @returns {Object|null} - Objeto con información del grupo y sus píxeles, o null si no pertenece a ningún grupo
 */
const getPixelGroupAt = useCallback((x, y, layerId = null) => {
  // Si se especifica una capa, buscar solo en esa capa
  if (layerId) {
    const layerGroups = pixelGroups[layerId] || {};
    
    for (const group of Object.values(layerGroups)) {
      if (!group.visible) continue; // Saltar grupos invisibles
      
      const foundPixel = group.pixels.find(pixel => pixel.x === x && pixel.y === y);
      if (foundPixel) {
        return {
          group: group,
          selectedPixels: group.pixels,
          layerId: layerId
        };
      }
    }
  } else {
    // Buscar en todas las capas
    for (const [currentLayerId, layerGroups] of Object.entries(pixelGroups)) {
      for (const group of Object.values(layerGroups)) {
        if (!group.visible) continue; // Saltar grupos invisibles
        
        const foundPixel = group.pixels.find(pixel => pixel.x === x && pixel.y === y);
        if (foundPixel) {
          return {
            group: group,
            selectedPixels: group.pixels,
            layerId: currentLayerId
          };
        }
      }
    }
  }
  
  return null; // No se encontró el píxel en ningún grupo
}, [pixelGroups]);

/**
 * Verificar si un píxel pertenece a un grupo específico
 * @param {number} x - Coordenada X del píxel
 * @param {number} y - Coordenada Y del píxel
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @returns {boolean} - True si el píxel pertenece al grupo
 */
const isPixelInGroup = useCallback((x, y, layerId, groupId) => {
  const layerGroups = pixelGroups[layerId] || {};
  const group = layerGroups[groupId];
  
  if (!group) return false;
  
  return group.pixels.some(pixel => pixel.x === x && pixel.y === y);
}, [pixelGroups]);

/**
 * Seleccionar un grupo específico (establecer como grupo activo)
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @returns {Array} - Array de píxeles del grupo seleccionado
 */
const selectPixelGroup = useCallback((layerId, groupId) => {
  const layerGroups = pixelGroups[layerId] || {};
  const group = layerGroups[groupId];
  
  if (!group) {
    console.warn(`Grupo ${groupId} no encontrado en la capa ${layerId}`);
    return [];
  }
  
  setSelectedGroup({
    ...group,
    layerId: layerId
  });
  
  return group.pixels;
}, [pixelGroups]);

/**
 * Limpiar la selección de grupo activo
 */
const clearSelectedGroup = useCallback(() => {
  setSelectedGroup(null);
}, []);

/**
 * Renombrar un grupo
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @param {string} newName - Nuevo nombre para el grupo
 * @returns {boolean} - True si se renombró correctamente
 */
const renamePixelGroup = useCallback((layerId, groupId, newName) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    if (layerGroups[groupId]) {
      layerGroups[groupId] = {
        ...layerGroups[groupId],
        name: newName
      };
    }
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
  
  return true;
}, []);

/**
 * Alternar la visibilidad de un grupo
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @returns {boolean} - Nuevo estado de visibilidad
 */
const toggleGroupVisibility = useCallback((layerId, groupId) => {
  let newVisibility = false;
  
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    if (layerGroups[groupId]) {
      newVisibility = !layerGroups[groupId].visible;
      layerGroups[groupId] = {
        ...layerGroups[groupId],
        visible: newVisibility
      };
    }
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
  
  return newVisibility;
}, []);

/**
 * Actualizar los píxeles de un grupo existente
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @param {Array} newPixels - Nuevos píxeles para el grupo
 * @returns {boolean} - True si se actualizó correctamente
 */
const updatePixelGroup = useCallback((layerId, groupId, newPixels) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    if (layerGroups[groupId]) {
      layerGroups[groupId] = {
        ...layerGroups[groupId],
        pixels: [...newPixels]
      };
    }
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
  
  return true;
}, []);

// Aquìi todo lo relacionado con la mejora de overlays de los grupos y jerarquia:
// Funciones para manejar la jerarquía de grupos
const moveGroupUp = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    const allGroups = Object.values(layerGroups);
    const currentGroup = layerGroups[groupId];
    
    if (!currentGroup) return prevGroups;
    
    // Encontrar el grupo que está inmediatamente encima
    const sortedGroups = allGroups.sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedGroups.findIndex(g => g.id === groupId);
    
    // Si ya está en la cima, no hacer nada
    if (currentIndex === sortedGroups.length - 1) return prevGroups;
    
    // Intercambiar zIndex con el grupo de arriba
    const groupAbove = sortedGroups[currentIndex + 1];
    const tempZIndex = currentGroup.zIndex;
    
    layerGroups[groupId] = { ...currentGroup, zIndex: groupAbove.zIndex };
    layerGroups[groupAbove.id] = { ...groupAbove, zIndex: tempZIndex };
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
}, []);

const moveGroupDown = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    const allGroups = Object.values(layerGroups);
    const currentGroup = layerGroups[groupId];
    
    if (!currentGroup) return prevGroups;
    
    // Encontrar el grupo que está inmediatamente debajo
    const sortedGroups = allGroups.sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedGroups.findIndex(g => g.id === groupId);
    
    // Si ya está en el fondo, no hacer nada
    if (currentIndex === 0) return prevGroups;
    
    // Intercambiar zIndex con el grupo de abajo
    const groupBelow = sortedGroups[currentIndex - 1];
    const tempZIndex = currentGroup.zIndex;
    
    layerGroups[groupId] = { ...currentGroup, zIndex: groupBelow.zIndex };
    layerGroups[groupBelow.id] = { ...groupBelow, zIndex: tempZIndex };
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
}, []);

const moveGroupToTop = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    const currentGroup = layerGroups[groupId];
    
    if (!currentGroup) return prevGroups;
    
    // Asignar un nuevo zIndex que sea el más alto
    const maxZIndex = Math.max(...Object.values(layerGroups).map(g => g.zIndex), -1);
    layerGroups[groupId] = { ...currentGroup, zIndex: maxZIndex + 1 };
    
    // Actualizar el contador global si es necesario
    setNextGroupZIndex(prev => Math.max(prev, maxZIndex + 2));
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
}, []);

const moveGroupToBottom = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    const currentGroup = layerGroups[groupId];
    
    if (!currentGroup) return prevGroups;
    
    // Asignar un nuevo zIndex que sea el más bajo
    const minZIndex = Math.min(...Object.values(layerGroups).map(g => g.zIndex), 1);
    layerGroups[groupId] = { ...currentGroup, zIndex: minZIndex - 1 };
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
}, []);

// Función mejorada para obtener grupos en una posición considerando jerarquía
const getGroupsAtPosition = useCallback((x, y, layerId = null) => {
  const foundGroups = [];
  
  // Si se especifica una capa, buscar solo en esa capa
  if (layerId) {
    const layerGroups = pixelGroups[layerId] || {};
    
    Object.values(layerGroups).forEach(group => {
      if (!group.visible) return;
      
      const foundPixel = group.pixels.find(pixel => pixel.x === x && pixel.y === y);
      if (foundPixel) {
        foundGroups.push({
          group: group,
          layerId: layerId,
          pixel: foundPixel
        });
      }
    });
  } else {
    // Buscar en todas las capas
    Object.entries(pixelGroups).forEach(([currentLayerId, layerGroups]) => {
      Object.values(layerGroups).forEach(group => {
        if (!group.visible) return;
        
        const foundPixel = group.pixels.find(pixel => pixel.x === x && pixel.y === y);
        if (foundPixel) {
          foundGroups.push({
            group: group,
            layerId: currentLayerId,
            pixel: foundPixel
          });
        }
      });
    });
  }
  
  // Ordenar por zIndex (el más alto primero)
  return foundGroups.sort((a, b) => b.group.zIndex - a.group.zIndex);
}, [pixelGroups]);

// Obtener el grupo más alto en una posición
const getTopGroupAt = useCallback((x, y, layerId = null) => {
  const groups = getGroupsAtPosition(x, y, layerId);
  return groups.length > 0 ? groups[0] : null;
}, [getGroupsAtPosition]);

// Renderizado de overlays mejorado con jerarquía
const renderGroupOverlays = useCallback((ctx) => {
  // Obtener todos los grupos de todas las capas visibles
  const allGroupsToRender = [];
  
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  
  for (const layer of sortedLayers) {
    if (!layer.visible) continue;
    
    const layerGroups = pixelGroups[layer.id] || {};
    
    Object.values(layerGroups).forEach(group => {
      if (!group.visible) return;
      
      allGroupsToRender.push({
        ...group,
        layerId: layer.id,
        layerZIndex: layer.zIndex
      });
    });
  }
  
  // Ordenar primero por capa, luego por zIndex del grupo
  allGroupsToRender.sort((a, b) => {
    if (a.layerZIndex !== b.layerZIndex) {
      return a.layerZIndex - b.layerZIndex;
    }
    return a.zIndex - b.zIndex;
  });
  
  // Renderizar grupos en orden jerárquico
  allGroupsToRender.forEach(group => {
    const isSelected = selectedGroup?.id === group.id;
    
    group.pixels.forEach(pixel => {
      // Verificar si el píxel está en el viewport
      if (pixel.x < viewportOffset.x || 
          pixel.x >= viewportOffset.x + viewportWidth ||
          pixel.y < viewportOffset.y || 
          pixel.y >= viewportOffset.y + viewportHeight) {
        return;
      }
      
      // Calcular posición en el viewport
      const viewportX = (pixel.x - viewportOffset.x) * zoom;
      const viewportY = (pixel.y - viewportOffset.y) * zoom;
      
      // Renderizar overlay del grupo con estilo jerárquico
      renderHierarchicalGroupOverlay(ctx, viewportX, viewportY, zoom, group, isSelected);
    });
  });
}, [layers, pixelGroups, selectedGroup, viewportOffset, viewportWidth, viewportHeight, zoom]);

const renderHierarchicalGroupOverlay = useCallback((ctx, x, y, zoom, group, isSelected) => {
  ctx.save();
  
  // Calcular intensidad del overlay basada en el zIndex
  const normalizedZIndex = Math.min(group.zIndex / 10, 1); // Normalizar para que no sea demasiado intenso
  
  if (isSelected) {
    // Grupo seleccionado: animación y borde distintivo
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = Math.max(2, zoom * 0.25);
    ctx.setLineDash([zoom * 0.4, zoom * 0.2]);
    
    const time = Date.now() * 0.005;
    ctx.lineDashOffset = time * zoom;
    
    // Fondo más visible para el grupo seleccionado
    ctx.fillStyle = `rgba(0, 255, 0, ${0.15 + normalizedZIndex * 0.1})`;
  } else {
    // Grupos normales: intensidad basada en jerarquía
    const hue = (group.zIndex * 60) % 360; // Diferentes colores por zIndex
    const saturation = 60 + normalizedZIndex * 30; // Más saturación = más arriba
    const lightness = 50;
    const alpha = 0.3 + normalizedZIndex * 0.3; // Más opacidad = más arriba
    
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    ctx.lineWidth = Math.max(1, zoom * (0.1 + normalizedZIndex * 0.15));
    ctx.setLineDash([]);
    
    // Fondo con intensidad jerárquica
    ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.2})`;
  }
  
  // Dibujar el overlay
  ctx.strokeRect(x, y, zoom, zoom);
  ctx.fillRect(x, y, zoom, zoom);
  
  // Añadir un pequeño indicador de nivel para grupos muy altos
  if (group.zIndex > 5) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `${Math.max(8, zoom * 0.3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(group.zIndex.toString(), x + zoom/2, y + zoom/2 + 2);
  }
  
  ctx.restore();
}, []);

// Función para obtener información detallada de jerarquía en una posición
const getHierarchyInfoAt = useCallback((x, y, layerId) => {
  const groups = getGroupsAtPosition(x, y, layerId);
  
  return {
    totalGroups: groups.length,
    topGroup: groups[0] || null,
    allGroups: groups,
    hasHierarchy: groups.length > 1,
    hierarchy: groups.map((g, index) => ({
      ...g,
      hierarchyLevel: groups.length - index,
      isTop: index === 0,
      isBottom: index === groups.length - 1
    }))
  };
}, [getGroupsAtPosition]);

// Función para ciclar entre grupos en una posición (útil para selección)
const cycleGroupSelectionAt = useCallback((x, y, layerId) => {
  const groups = getGroupsAtPosition(x, y, layerId);
  if (groups.length === 0) return null;
  
  if (!selectedGroup) {
    // Si no hay grupo seleccionado, seleccionar el de arriba
    selectPixelGroup(groups[0].layerId, groups[0].group.id);
    return groups[0];
  }
  
  // Encontrar el grupo actualmente seleccionado en la pila
  const currentIndex = groups.findIndex(g => g.group.id === selectedGroup.id);
  
  if (currentIndex === -1) {
    // El grupo seleccionado no está en esta posición, seleccionar el de arriba
    selectPixelGroup(groups[0].layerId, groups[0].group.id);
    return groups[0];
  }
  
  // Ciclar al siguiente grupo (o volver al primero)
  const nextIndex = (currentIndex + 1) % groups.length;
  selectPixelGroup(groups[nextIndex].layerId, groups[nextIndex].group.id);
  return groups[nextIndex];
}, [getGroupsAtPosition, selectedGroup, selectPixelGroup]);




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
  getPointerCoordsFromCanvas,
//funcion para rellenado
  floodFill,
  // Estado de grupos
pixelGroups,
selectedGroup,

// Funciones de manejo de grupos
createPixelGroup,
deletePixelGroup,
getLayerGroups,
getAllGroups,
getPixelGroupAt,
isPixelInGroup,
selectPixelGroup,
clearSelectedGroup,
renamePixelGroup,
toggleGroupVisibility,
updatePixelGroup,

 
  // Nuevas funciones jerárquicas
  moveGroupUp,
  moveGroupDown,
  moveGroupToTop,
  moveGroupToBottom,
  getGroupsAtPosition,
  getTopGroupAt,
  getHierarchyInfoAt,
  cycleGroupSelectionAt,
  
  // Renderizado mejorado
  renderGroupOverlays,

   // Nuevas funciones jerárquicas
   getHierarchicalLayers,
   getMainLayers,
   getGroupLayersForParent,
};
}