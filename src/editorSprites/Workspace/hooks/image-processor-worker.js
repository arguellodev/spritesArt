const offscreenLayerWorkerCode = `
let canvases = {};
let contexts = {};

self.onmessage = function(e) {
  const { type, layerId, canvas, width, height, requestId, x, y } = e.data;
  
  switch(type) {
    case 'init':
      canvases[layerId] = canvas;
      contexts[layerId] = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      
      self.postMessage({
        type: 'ready',
        layerId
      });
      break;
      
    case 'getImageData':
      try {
        const ctx = contexts[layerId];
        if (!ctx) {
          throw new Error('Canvas context not found for layer: ' + layerId);
        }
        
        // Bounds checking en el worker
        const canvas = canvases[layerId];
        const boundedX = Math.max(0, Math.min(x, canvas.width - 1));
        const boundedY = Math.max(0, Math.min(y, canvas.height - 1));
        const boundedWidth = Math.max(1, Math.min(e.data.width, canvas.width - boundedX));
        const boundedHeight = Math.max(1, Math.min(e.data.height, canvas.height - boundedY));
        
        const imageData = ctx.getImageData(boundedX, boundedY, boundedWidth, boundedHeight);
        
        self.postMessage({
          type: 'imageData',
          requestId,
          imageData
        });
        
      } catch (error) {
        self.postMessage({
          type: 'error',
          requestId,
          error: error.message
        });
      }
      break;
      
    case 'drawToLayer':
      // Ejemplo de función adicional para dibujar
      const ctx = contexts[layerId];
      if (ctx && e.data.imageData) {
        ctx.putImageData(e.data.imageData, e.data.dx || 0, e.data.dy || 0);
      }
      break;
  }
};
`;

// Hook personalizado para usar cualquier versión
const useLayerData = (useOffscreenCanvas = false) => {
  const layerCanvasesRef = useRef({});
  
  if (useOffscreenCanvas && 'OffscreenCanvas' in window) {
    const { initializeOffscreenLayer, getLayerDataOffscreen } = useOffscreenLayerManager();
    return {
      getLayerData: getLayerDataOffscreen,
      initializeLayer: initializeOffscreenLayer,
      isOffscreen: true
    };
  } else {
    return {
      getLayerData: getLayerDataWithWorker, // o la función original
      initializeLayer: null,
      isOffscreen: false
    };
  }
};