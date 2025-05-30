import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para manejar el zoom del canvas
 * @param {Object} config - Configuración del hook
 * @param {number} config.totalWidth - Ancho total del canvas
 * @param {number} config.totalHeight - Alto total del canvas
 * @param {number} config.workspaceWidth - Ancho del workspace
 * @param {number} config.workspaceHeight - Alto del workspace
 * @param {Object} config.viewportOffset - Offset actual del viewport
 * @param {number} config.panOffsetX - Offset de pan en X
 * @param {number} config.panOffsetY - Offset de pan en Y
 * @param {Function} config.moveViewport - Función para mover el viewport
 * @param {number} config.initialZoom - Zoom inicial (por defecto 10)
 * @param {number} config.minZoom - Zoom mínimo (por defecto 1)
 * @param {number} config.maxZoom - Zoom máximo (por defecto 40)
 */
export const useZoom = ({
  totalWidth,
  totalHeight,
  workspaceWidth,
  workspaceHeight,
  viewportOffset,
  panOffsetX = 0,
  panOffsetY = 0,
  moveViewport,
  initialZoom = 10,
  minZoom = 1,
  maxZoom = 40
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [viewportWidth, setViewportWidth] = useState(
    Math.min(totalWidth, Math.floor(workspaceWidth / initialZoom))
  );
  const [viewportHeight, setViewportHeight] = useState(
    Math.min(totalHeight, Math.floor(workspaceHeight / initialZoom))
  );

  // Actualizar el tamaño del viewport cuando cambia el zoom
  useEffect(() => {
    setViewportWidth(Math.min(totalWidth, Math.floor(workspaceWidth / zoom)));
    setViewportHeight(Math.min(totalHeight, Math.floor(workspaceHeight / zoom)));
  }, [zoom, workspaceWidth, workspaceHeight, totalWidth, totalHeight]);

  // useEffect mejorado para manejar cambios de dimensiones del workspace
  useEffect(() => {
    const newWidth = Math.min(totalWidth, Math.floor(workspaceWidth / zoom));
    const newHeight = Math.min(totalHeight, Math.floor(workspaceHeight / zoom));
    
    // Solo actualizar si las dimensiones realmente cambiaron
    if (newWidth !== viewportWidth || newHeight !== viewportHeight) {
      // Verificar que el viewport no se salga de los límites del canvas
      const maxOffsetX = Math.max(0, totalWidth - newWidth);
      const maxOffsetY = Math.max(0, totalHeight - newHeight);
      
      // Ajustar el offset si es necesario
      if (viewportOffset.x > maxOffsetX || viewportOffset.y > maxOffsetY) {
        const deltaX = Math.min(0, maxOffsetX - viewportOffset.x);
        const deltaY = Math.min(0, maxOffsetY - viewportOffset.y);
        
        if (deltaX !== 0 || deltaY !== 0) {
          moveViewport(deltaX, deltaY);
        }
      }
      
      setViewportWidth(newWidth);
      setViewportHeight(newHeight);
    }
  }, [zoom, workspaceWidth, workspaceHeight, totalWidth, totalHeight, viewportWidth, viewportHeight, viewportOffset, moveViewport]);

  // Función para manejar el cambio de zoom desde un input
  const handleZoomChange = useCallback((e) => {
    const newZoom = parseInt(e.target.value, 10);
    if (isNaN(newZoom) || newZoom <= 0) return;
    
    // Calcular el centro actual del viewport en coordenadas del canvas
    const currentCenterX = viewportOffset.x + (viewportWidth / 2);
    const currentCenterY = viewportOffset.y + (viewportHeight / 2);
    
    // Calcular las nuevas dimensiones del viewport
    const newViewportWidth = Math.min(totalWidth, Math.floor(workspaceWidth / newZoom));
    const newViewportHeight = Math.min(totalHeight, Math.floor(workspaceHeight / newZoom));
    
    // Calcular el nuevo offset para mantener el mismo centro
    const newOffsetX = Math.max(0, Math.min(
      totalWidth - newViewportWidth,
      Math.round(currentCenterX - (newViewportWidth / 2))
    ));
    const newOffsetY = Math.max(0, Math.min(
      totalHeight - newViewportHeight,
      Math.round(currentCenterY - (newViewportHeight / 2))
    ));
    
    // Calcular el delta necesario
    const deltaX = newOffsetX - viewportOffset.x;
    const deltaY = newOffsetY - viewportOffset.y;
    
    // Actualizar el zoom primero
    setZoom(newZoom);
    setViewportWidth(newViewportWidth);
    setViewportHeight(newViewportHeight);
    
    // Mover el viewport para mantener la posición centrada
    // Solo mueve si hay un delta significativo
    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
      moveViewport(deltaX, deltaY);
    }
  }, [viewportOffset, viewportWidth, viewportHeight, totalWidth, totalHeight, workspaceWidth, workspaceHeight, moveViewport]);

  // Función para zoom con rueda del mouse
  const handleWheelZoom = useCallback((e) => {
    console.log("Se esta ejecuntando el handle del zoom");
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect(); // Obtenemos el rect del elemento que disparó el evento
    
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const viewportMouseX = mouseX / zoom - panOffsetX / zoom;
    const viewportMouseY = mouseY / zoom - panOffsetY / zoom;
    const canvasMouseX = viewportMouseX + viewportOffset.x;
    const canvasMouseY = viewportMouseY + viewportOffset.y;

    const zoomDirection = e.deltaY > 0 ? -1 : 1;
    const zoomFactor = 1.1;
    const newZoomRaw = zoom * Math.pow(zoomFactor, zoomDirection);

    // Redondear el nuevo zoom al número entero más cercano
    const newZoom = Math.max(minZoom, Math.min(maxZoom, Math.round(newZoomRaw)));

    if (newZoom === zoom) return;

    // Redondear el nuevo tamaño del viewport
    const newViewportWidth = Math.min(totalWidth, Math.floor(workspaceWidth / newZoom));
    const newViewportHeight = Math.min(totalHeight, Math.floor(workspaceHeight / newZoom));

    const newViewportMouseX = mouseX / newZoom - panOffsetX / newZoom;
    const newViewportMouseY = mouseY / newZoom - panOffsetY / newZoom;

    const newViewportOffsetX = Math.floor(canvasMouseX - newViewportMouseX);
    const newViewportOffsetY = Math.floor(canvasMouseY - newViewportMouseY);

    const clampedOffsetX = Math.max(0, Math.min(totalWidth - newViewportWidth, newViewportOffsetX));
    const clampedOffsetY = Math.max(0, Math.min(totalHeight - newViewportHeight, newViewportOffsetY));

    const deltaX = clampedOffsetX - viewportOffset.x;
    const deltaY = clampedOffsetY - viewportOffset.y;
   

    setZoom(newZoom);
    setViewportWidth(newViewportWidth);
    setViewportHeight(newViewportHeight);

    if (deltaX !== 0 || deltaY !== 0) {
      moveViewport(deltaX, deltaY);
    }
  }, [zoom, workspaceWidth, workspaceHeight, totalWidth, totalHeight, viewportOffset, moveViewport, minZoom, maxZoom]);

  // Función para establecer zoom programáticamente
  const setZoomValue = useCallback((newZoom) => {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    setZoom(clampedZoom);
  }, [minZoom, maxZoom]);

  // Función para zoom in
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(maxZoom, zoom + 1);
    setZoom(newZoom);
  }, [zoom, maxZoom]);

  // Función para zoom out
  const zoomOut = useCallback(() => {
    const newZoom = Math.max(minZoom, zoom - 1);
    setZoom(newZoom);
  }, [zoom, minZoom]);

  // Función para resetear zoom
  const resetZoom = useCallback(() => {
    setZoom(initialZoom);
  }, [initialZoom]);

  return {
    zoom,
    viewportWidth,
    viewportHeight,
    handleZoomChange,
    handleWheelZoom,
    setZoomValue,
    zoomIn,
    zoomOut,
    resetZoom,
    minZoom,
    maxZoom
  };
};