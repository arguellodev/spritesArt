import React, { useState, useCallback, useMemo } from 'react';
import './animationExporter.css';
import VideoExporter from './videoExporter'; // Ajusta la ruta según tu estructura


const AnimationExporter = ({ 
  isOpen, 
  onClose,
  frames, 
  framesResume
}) => {
//Estados para exportacion de video:
const [videoSettings, setVideoSettings] = useState({
  fps: 30,
  quality: 'high', // 'low', 'medium', 'high'
  format: 'webm' // 'webm', 'mp4' (si está disponible)
});

  // Estados principales
  const [exportType, setExportType] = useState('png');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Configuración de selección de frames
  const [selectedFrames, setSelectedFrames] = useState(new Set());
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [selectionMode, setSelectionMode] = useState('all'); // 'all', 'range', 'manual'
  
  // Configuración de escalado mejorada
  const [scaleFactor, setScaleFactor] = useState(1);
  const [customScale, setCustomScale] = useState('');
  const [scaleMode, setScaleMode] = useState('preset'); // 'preset' | 'custom'
  const [scalingAlgorithm, setScalingAlgorithm] = useState('nearest'); // 'nearest', 'bilinear', 'hybrid'
  const [backgroundColor, setBackgroundColor] = useState('transparent');

  // Datos calculados desde framesResume
  const frameSequence = useMemo(() => {
    if (!framesResume?.computed?.frameSequence) return [];
    return framesResume.computed.frameSequence.sort((a, b) => a - b);
  }, [framesResume]);

  const originalDimensions = useMemo(() => {
    // Asumir dimensiones del primer frame
    const firstFrame = frames[frameSequence[0]];
    if (!firstFrame) return { width: 800, height: 600 };
    
    const firstLayer = firstFrame.layers[0];
    if (!firstLayer || !firstFrame.canvases[firstLayer.id]) {
      return { width: 800, height: 600 };
    }
    
    const canvas = firstFrame.canvases[firstLayer.id];
    return { width: canvas.width, height: canvas.height };
  }, [frames, frameSequence]);

  // Calcular factor de escala actual
  const currentScaleFactor = useMemo(() => {
    if (scaleMode === 'custom') {
      const parsed = parseFloat(customScale);
      return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
    }
    return scaleFactor;
  }, [scaleMode, scaleFactor, customScale]);

  const outputDimensions = useMemo(() => ({
    width: Math.round(originalDimensions.width * currentScaleFactor),
    height: Math.round(originalDimensions.height * currentScaleFactor)
  }), [originalDimensions, currentScaleFactor]);

  // Inicializar selección de frames
  React.useEffect(() => {
    if (frameSequence.length > 0) {
      setRangeStart(frameSequence[0]);
      setRangeEnd(frameSequence[frameSequence.length - 1]);
      setSelectedFrames(new Set(frameSequence));
    }
  }, [frameSequence]);

  // Algoritmos de escalado implementados
  const scaleImageWithAlgorithm = useCallback((sourceCanvas, targetWidth, targetHeight, algorithm) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    switch (algorithm) {
      case 'nearest':
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        break;

      case 'bilinear':
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        break;

      case 'hybrid':
        // Para escalados no enteros: escalar con nearest a múltiplo entero, luego reducir con bilinear
        const isNonInteger = (currentScaleFactor % 1) !== 0;
        
        if (isNonInteger && currentScaleFactor > 1) {
          // Encontrar el múltiplo entero más cercano mayor
          const integerScale = Math.ceil(currentScaleFactor);
          const intermediateWidth = sourceCanvas.width * integerScale;
          const intermediateHeight = sourceCanvas.height * integerScale;
          
          // Paso 1: Escalar con nearest neighbor a múltiplo entero
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = intermediateWidth;
          tempCanvas.height = intermediateHeight;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.imageSmoothingEnabled = false;
          tempCtx.drawImage(sourceCanvas, 0, 0, intermediateWidth, intermediateHeight);
          
          // Paso 2: Reducir con bilinear al tamaño final
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
        } else {
          // Para escalados enteros o menores a 1, usar nearest
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        }
        break;

      default:
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    }

    return canvas;
  }, [currentScaleFactor]);

  // Función para renderizar frame a canvas escalado (actualizada)
  const renderFrameToCanvas = useCallback((frameNumber) => {
    const frameData = frames[frameNumber];
    if (!frameData) return null;

    // Crear canvas temporal del tamaño original
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = originalDimensions.width;
    originalCanvas.height = originalDimensions.height;
    const originalCtx = originalCanvas.getContext('2d');
    
    // Fondo si no es transparente
    if (backgroundColor !== 'transparent') {
      originalCtx.fillStyle = backgroundColor;
      originalCtx.fillRect(0, 0, originalDimensions.width, originalDimensions.height);
    }

    // Renderizar capas jerárquicamente al canvas original
    const hierarchicalLayers = frameData.layers
      .filter(layer => !layer.isGroupLayer)
      .map(mainLayer => ({
        ...mainLayer,
        groupLayers: frameData.layers
          .filter(layer => layer.isGroupLayer && layer.parentLayerId === mainLayer.id)
          .sort((a, b) => a.zIndex - b.zIndex)
      }))
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const mainLayer of hierarchicalLayers) {
      const isVisible = mainLayer.visible && (mainLayer.visible[frameNumber] !== false);
      if (!isVisible) continue;

      // Renderizar capa principal
      const mainCanvas = frameData.canvases[mainLayer.id];
      if (mainCanvas) {
        const layerOpacity = mainLayer.opacity ?? 1.0;
        if (layerOpacity !== 1.0) {
          originalCtx.globalAlpha = layerOpacity;
        }
        
        originalCtx.drawImage(mainCanvas, 0, 0);
        
        if (layerOpacity !== 1.0) {
          originalCtx.globalAlpha = 1.0;
        }
      }

      // Renderizar capas de grupo
      for (const groupLayer of mainLayer.groupLayers) {
        if (!groupLayer.visible) continue;
        
        const groupCanvas = frameData.canvases[groupLayer.id];
        if (groupCanvas) {
          const groupOpacity = groupLayer.opacity ?? 1.0;
          if (groupOpacity !== 1.0) {
            originalCtx.globalAlpha = groupOpacity;
          }
          
          originalCtx.drawImage(groupCanvas, 0, 0);
          
          if (groupOpacity !== 1.0) {
            originalCtx.globalAlpha = 1.0;
          }
        }
      }
    }

    // Aplicar escalado con el algoritmo seleccionado
    if (currentScaleFactor === 1) {
      return originalCanvas;
    } else {
      return scaleImageWithAlgorithm(
        originalCanvas, 
        outputDimensions.width, 
        outputDimensions.height, 
        scalingAlgorithm
      );
    }
  }, [frames, originalDimensions, outputDimensions, backgroundColor, currentScaleFactor, scalingAlgorithm, scaleImageWithAlgorithm]);

  // Generar miniatura para preview (mantenemos el original)
  const generateThumbnail = useCallback((frameNumber, size = 64) => {
    const frameData = frames[frameNumber];
    if (!frameData) return null;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false;
    
    // Fondo para transparencias
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);
    
    // Patrón de cuadrícula para transparencias
    const gridSize = 8;
    ctx.fillStyle = '#e0e0e0';
    for (let x = 0; x < size; x += gridSize * 2) {
      for (let y = 0; y < size; y += gridSize * 2) {
        ctx.fillRect(x, y, gridSize, gridSize);
        ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
      }
    }

    // Renderizar frame escalado
    const aspectRatio = originalDimensions.width / originalDimensions.height;
    let drawWidth = size;
    let drawHeight = size;
    let offsetX = 0;
    let offsetY = 0;

    if (aspectRatio > 1) {
      drawHeight = size / aspectRatio;
      offsetY = (size - drawHeight) / 2;
    } else {
      drawWidth = size * aspectRatio;
      offsetX = (size - drawWidth) / 2;
    }

    // Renderizar capas
    const hierarchicalLayers = frameData.layers
      .filter(layer => !layer.isGroupLayer)
      .map(mainLayer => ({
        ...mainLayer,
        groupLayers: frameData.layers
          .filter(layer => layer.isGroupLayer && layer.parentLayerId === mainLayer.id)
          .sort((a, b) => a.zIndex - b.zIndex)
      }))
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const mainLayer of hierarchicalLayers) {
      const isVisible = mainLayer.visible && (mainLayer.visible[frameNumber] !== false);
      if (!isVisible) continue;

      const mainCanvas = frameData.canvases[mainLayer.id];
      if (mainCanvas) {
        const layerOpacity = mainLayer.opacity ?? 1.0;
        if (layerOpacity !== 1.0) {
          ctx.globalAlpha = layerOpacity;
        }
        
        ctx.drawImage(
          mainCanvas,
          0, 0, originalDimensions.width, originalDimensions.height,
          offsetX, offsetY, drawWidth, drawHeight
        );
        
        if (layerOpacity !== 1.0) {
          ctx.globalAlpha = 1.0;
        }
      }

      for (const groupLayer of mainLayer.groupLayers) {
        if (!groupLayer.visible) continue;
        
        const groupCanvas = frameData.canvases[groupLayer.id];
        if (groupCanvas) {
          const groupOpacity = groupLayer.opacity ?? 1.0;
          if (groupOpacity !== 1.0) {
            ctx.globalAlpha = groupOpacity;
          }
          
          ctx.drawImage(
            groupCanvas,
            0, 0, originalDimensions.width, originalDimensions.height,
            offsetX, offsetY, drawWidth, drawHeight
          );
          
          if (groupOpacity !== 1.0) {
            ctx.globalAlpha = 1.0;
          }
        }
      }
    }

    return canvas.toDataURL('image/png');
  }, [frames, originalDimensions]);

  // Handlers para selección de frames (sin cambios)
  const handleFrameToggle = useCallback((frameNumber) => {
    setSelectedFrames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(frameNumber)) {
        newSet.delete(frameNumber);
      } else {
        newSet.add(frameNumber);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedFrames(new Set(frameSequence));
  }, [frameSequence]);

  const handleSelectNone = useCallback(() => {
    setSelectedFrames(new Set());
  }, []);

  const handleRangeSelect = useCallback(() => {
    const rangeFrames = frameSequence.filter(frame => frame >= rangeStart && frame <= rangeEnd);
    setSelectedFrames(new Set(rangeFrames));
  }, [frameSequence, rangeStart, rangeEnd]);

  // Aplicar modo de selección
  React.useEffect(() => {
    switch (selectionMode) {
      case 'all':
        setSelectedFrames(new Set(frameSequence));
        break;
      case 'range':
        handleRangeSelect();
        break;
      case 'manual':
        // Mantener selección actual
        break;
    }
  }, [selectionMode, frameSequence, handleRangeSelect]);

//funciones para exportación de video:
const prepareFramesForVideoExport = useCallback(() => {
  const framesToExport = Array.from(selectedFrames).sort((a, b) => a - b);
  
  // Crear estructura compatible con VideoExporter
  const videoFramesResume = {
    frames: {},
    computed: {
      frameSequence: framesToExport
    }
  };

  framesToExport.forEach(frameNumber => {
    const frameData = frames[frameNumber];
    const frameDuration = framesResume?.frames?.[frameNumber]?.duration || 100;
    
    // Renderizar el frame con escalado aplicado usando tu función existente
    const scaledCanvas = renderFrameToCanvas(frameNumber);
    
    videoFramesResume.frames[frameNumber] = {
      duration: frameDuration,
      layers: scaledCanvas ? [{
        id: 'merged',
        type: 'image',
        visible: true,
        opacity: 1.0,
        zIndex: 0,
        imageData: scaledCanvas.toDataURL('image/png'),
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0
        }
      }] : []
    };
  });

  return { framesToExport, videoFramesResume };
}, [frames, framesResume, selectedFrames, renderFrameToCanvas]);

// 6. Función para exportar video
const handleVideoExport = async () => {
  const { framesToExport, videoFramesResume } = prepareFramesForVideoExport();
  
  if (framesToExport.length === 0) {
    alert('No hay frames seleccionados para exportar');
    return;
  }

  setIsExporting(true);
  setExportProgress(0);

  try {
    const videoExporter = new VideoExporter();
    
    const qualityBitrates = {
      low: 1000000,    // 1 Mbps
      medium: 2500000, // 2.5 Mbps
      high: 5000000    // 5 Mbps
    };

    const exportOptions = {
      width: outputDimensions.width,   // Usar las dimensiones finales escaladas
      height: outputDimensions.height,
      fps: videoSettings.fps,
      backgroundColor: backgroundColor,
      scaleFactor: 1, // NO aplicar escalado adicional - ya está aplicado
      videoBitsPerSecond: qualityBitrates[videoSettings.quality],
      onProgress: (progress) => {
        setExportProgress(progress);
      },
      onComplete: (blob) => {
        const filename = `animation_${outputDimensions.width}x${outputDimensions.height}_${videoSettings.fps}fps_${currentScaleFactor}x.${videoSettings.format}`;
        videoExporter.downloadVideo(blob, filename);
        
        alert(`Video exportado exitosamente: ${filename}`);
        setIsExporting(false);
        setExportProgress(0);
      },
      onError: (error) => {
        console.error('Error durante la exportación de video:', error);
        alert('Error durante la exportación de video: ' + error.message);
        setIsExporting(false);
        setExportProgress(0);
      }
    };

    await videoExporter.exportToVideo(framesToExport, videoFramesResume, exportOptions);

  } catch (error) {
    console.error('Error al inicializar exportación de video:', error);
    alert('Error al inicializar exportación de video: ' + error.message);
    setIsExporting(false);
    setExportProgress(0);
  }
};



  // Función de exportación (actualizada)
  const handleExport = async () => {
    if (exportType === 'video') {
      await handleVideoExport();
      return;
    }
  
    // ... resto del código original para PNG
    const framesToExport = Array.from(selectedFrames).sort((a, b) => a - b);
    
    if (framesToExport.length === 0) {
      alert('No hay frames seleccionados para exportar');
      return;
    }
  
    setIsExporting(true);
    setExportProgress(0);
  
    try {
      for (let i = 0; i < framesToExport.length; i++) {
        const frameNumber = framesToExport[i];
        const canvas = renderFrameToCanvas(frameNumber);
        
        if (canvas) {
          const paddedFrameNumber = frameNumber.toString().padStart(3, '0');
          const filename = `frame_${paddedFrameNumber}_${currentScaleFactor}x.png`;
          
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 'image/png');
        }
        
        setExportProgress((i + 1) / framesToExport.length * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      alert(`Exportación completada: ${framesToExport.length} frames`);
      
    } catch (error) {
      console.error('Error durante la exportación:', error);
      alert('Error durante la exportación: ' + error.message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="animation-exporter-overlay">
      <div className="animation-exporter-modal">
        {/* Header */}
        <div className="animation-exporter-header">
          <h2 className="animation-exporter-title">Export Animation</h2>
          <button onClick={onClose} className="animation-exporter-close-button">×</button>
        </div>
  
        <div className="animation-exporter-container">
          {/* Panel izquierdo - Configuración */}
          <div className="animation-exporter-left-panel">
            
            {/* Tipo de exportación */}
            <div className="animation-exporter-section">
              <h3 className="animation-exporter-section-title">Export Type</h3>
              <div className="animation-exporter-export-type-grid">
  <button
    onClick={() => setExportType('png')}
    className={`animation-exporter-export-type-button ${
      exportType === 'png' ? 'active' : ''
    }`}
  >
    <div className="animation-exporter-export-type-icon">🖼️</div>
    <div className="animation-exporter-export-type-label">PNG Frames</div>
  </button>
  
  <button
    onClick={() => setExportType('video')}
    className={`animation-exporter-export-type-button ${
      exportType === 'video' ? 'active' : ''
    }`}
  >
    <div className="animation-exporter-export-type-icon">🎬</div>
    <div className="animation-exporter-export-type-label">Video</div>
  </button>
  
  <button
    onClick={() => setExportType('gif')}
    className={`animation-exporter-export-type-button ${
      exportType === 'gif' ? 'active' : ''
    }`}
    disabled
  >
    <div className="animation-exporter-export-type-icon">⚡</div>
    <div className="animation-exporter-export-type-label">GIF (Soon)</div>
  </button>
</div>
            </div>
  
            {/* Configuración de escalado mejorada */}
            <div className="animation-exporter-section">
              <h3 className="animation-exporter-section-title">Output Size</h3>
              
              {/* Selector de modo de escalado */}
              <div className="animation-exporter-input-group">
                <div className="animation-exporter-scale-mode-buttons">
                  <button
                    onClick={() => setScaleMode('preset')}
                    className={`animation-exporter-scale-mode-button ${
                      scaleMode === 'preset' ? 'active' : ''
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => setScaleMode('custom')}
                    className={`animation-exporter-scale-mode-button ${
                      scaleMode === 'custom' ? 'active' : ''
                    }`}
                  >
                    Custom
                  </button>
                </div>
  
                {/* Presets de escalado */}
                {scaleMode === 'preset' && (
                  <div className="animation-exporter-scale-presets">
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4].map(scale => (
                      <button
                        key={scale}
                        onClick={() => setScaleFactor(scale)}
                        className={`animation-exporter-scale-button ${
                          Math.abs(scaleFactor - scale) < 0.01 ? 'active' : ''
                        }`}
                      >
                        {scale}×
                      </button>
                    ))}
                  </div>
                )}
  
                {/* Entrada personalizada */}
                {scaleMode === 'custom' && (
                  <div className="animation-exporter-custom-scale-input">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="10"
                      value={customScale}
                      onChange={(e) => setCustomScale(e.target.value)}
                      placeholder="1.25"
                      className="animation-exporter-custom-scale-field"
                    />
                    <span className="animation-exporter-custom-scale-label">×</span>
                  </div>
                )}
  
                {/* Algoritmo de escalado */}
                <div className="animation-exporter-input-row">
                  <label className="animation-exporter-input-label">Algorithm:</label>
                  <select
                    value={scalingAlgorithm}
                    onChange={(e) => setScalingAlgorithm(e.target.value)}
                    className="animation-exporter-select"
                  >
                    <option value="nearest">Nearest Neighbor</option>
                    <option value="bilinear">Bilinear</option>
                    <option value="hybrid">Hybrid (Recommended)</option>
                  </select>
                </div>
                
                <div className="animation-exporter-dimension-info">
                  <div>Original: {originalDimensions.width}×{originalDimensions.height}</div>
                  <div>Output: {outputDimensions.width}×{outputDimensions.height}</div>
                  <div>Scale: {currentScaleFactor.toFixed(2)}×</div>
                  <div className="animation-exporter-algorithm-info">
                    Algorithm: {scalingAlgorithm === 'hybrid' ? 'Hybrid (best for non-integer)' : 
                               scalingAlgorithm === 'bilinear' ? 'Bilinear (smooth)' : 
                               'Nearest (pixelated)'}
                  </div>
                </div>
              </div>
            </div>
  
            {/* Configuración de fondo */}
            <div className="animation-exporter-section">
              <h3 className="animation-exporter-section-title">Background</h3>
              <div className="animation-exporter-input-group">
                <div className="animation-exporter-input-row">
                  <label className="animation-exporter-input-label">Background:</label>
                  <select
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="animation-exporter-select"
                  >
                    <option value="transparent">Transparent</option>
                    <option value="#ffffff">White</option>
                    <option value="#000000">Black</option>
                    <option value="#808080">Gray</option>
                  </select>
                </div>
              </div>
            </div>
            {exportType === 'video' && (
  <div className="animation-exporter-section">
    <h3 className="animation-exporter-section-title">Video Settings</h3>
    <div className="animation-exporter-input-group">
      <div className="animation-exporter-input-row">
        <label className="animation-exporter-input-label">FPS:</label>
        <select
          value={videoSettings.fps}
          onChange={(e) => setVideoSettings(prev => ({ ...prev, fps: Number(e.target.value) }))}
          className="animation-exporter-select"
        >
          <option value={12}>12 FPS</option>
          <option value={24}>24 FPS</option>
          <option value={30}>30 FPS</option>
          <option value={60}>60 FPS</option>
        </select>
      </div>
      
      <div className="animation-exporter-input-row">
        <label className="animation-exporter-input-label">Quality:</label>
        <select
          value={videoSettings.quality}
          onChange={(e) => setVideoSettings(prev => ({ ...prev, quality: e.target.value }))}
          className="animation-exporter-select"
        >
          <option value="low">Low (1 Mbps)</option>
          <option value="medium">Medium (2.5 Mbps)</option>
          <option value="high">High (5 Mbps)</option>
        </select>
      </div>
      
      <div className="animation-exporter-input-row">
        <label className="animation-exporter-input-label">Format:</label>
        <select
          value={videoSettings.format}
          onChange={(e) => setVideoSettings(prev => ({ ...prev, format: e.target.value }))}
          className="animation-exporter-select"
        >
          <option value="webm">WebM (VP9)</option>
          <option value="mp4">MP4 (if supported)</option>
        </select>
      </div>
    </div>
  </div>
)}
  
            {/* Exportar */}
            <div className="animation-exporter-section">
              {isExporting && (
                <div className="animation-exporter-progress-container">
                  <div className="animation-exporter-progress-bar">
                    <div 
                      className="animation-exporter-progress-fill"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <div className="animation-exporter-progress-text">
                    {Math.round(exportProgress)}% complete
                  </div>
                </div>
              )}
              
              <button
  onClick={handleExport}
  disabled={isExporting || selectedFrames.size === 0}
  className="animation-exporter-export-button"
>
  {isExporting ? 
    (exportType === 'video' ? 'Creating Video...' : 'Exporting...') : 
    (exportType === 'video' ? 
      `Create Video (${selectedFrames.size} frames)` : 
      `Export ${selectedFrames.size} Frames`
    )
  }
</button>
            </div>
          </div>
  
          {/* Panel derecho - Selección de frames */}
          <div className="animation-exporter-right-panel">
            <div className="animation-exporter-section">
              <h3 className="animation-exporter-section-title">
                Frame Selection ({selectedFrames.size}/{frameSequence.length})
              </h3>
              
              {/* Modos de selección */}
              <div className="animation-exporter-selection-modes">
                <button
                  onClick={() => setSelectionMode('all')}
                  className={`animation-exporter-mode-button ${
                    selectionMode === 'all' ? 'active' : ''
                  }`}
                >
                  All Frames
                </button>
                <button
                  onClick={() => setSelectionMode('range')}
                  className={`animation-exporter-mode-button ${
                    selectionMode === 'range' ? 'active' : ''
                  }`}
                >
                  Range
                </button>
                <button
                  onClick={() => setSelectionMode('manual')}
                  className={`animation-exporter-mode-button ${
                    selectionMode === 'manual' ? 'active' : ''
                  }`}
                >
                  Manual
                </button>
              </div>
  
              {/* Controles de selección por rango */}
              {selectionMode === 'range' && (
                <div className="animation-exporter-range-controls">
                  <div className="animation-exporter-input-row">
                    <label className="animation-exporter-input-label">Start:</label>
                    <input
                      type="number"
                      min={frameSequence[0] || 1}
                      max={frameSequence[frameSequence.length - 1] || 1}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(Number(e.target.value))}
                      className="animation-exporter-number-input"
                    />
                  </div>
                  <div className="animation-exporter-input-row">
                    <label className="animation-exporter-input-label">End:</label>
                    <input
                      type="number"
                      min={frameSequence[0] || 1}
                      max={frameSequence[frameSequence.length - 1] || 1}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(Number(e.target.value))}
                      className="animation-exporter-number-input"
                    />
                  </div>
                  <button
                    onClick={handleRangeSelect}
                    className="animation-exporter-apply-range-button"
                  >
                    Apply Range
                  </button>
                </div>
              )}
  
              {/* Controles de selección manual */}
              {selectionMode === 'manual' && (
                <div className="animation-exporter-manual-controls">
                  <button 
                    onClick={handleSelectAll} 
                    className="animation-exporter-select-button"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={handleSelectNone} 
                    className="animation-exporter-select-button"
                  >
                    Select None
                  </button>
                </div>
              )}
  
              {/* Cuadrícula de frames */}
              <div className="animation-exporter-frame-grid">
                {frameSequence.map((frameNumber) => {
                  const isSelected = selectedFrames.has(frameNumber);
                  const thumbnail = generateThumbnail(frameNumber, 80);
                  const frameDuration = framesResume?.frames?.[frameNumber]?.duration || 100;
                  
                  return (
                    <div 
                      key={frameNumber}
                      className={`animation-exporter-frame-card ${
                        isSelected ? 'selected' : ''
                      }`}
                      onClick={() => selectionMode === 'manual' && handleFrameToggle(frameNumber)}
                    >
                      {/* Checkbox */}
                      {selectionMode === 'manual' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleFrameToggle(frameNumber)}
                          className="animation-exporter-frame-checkbox"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      
                      {/* Miniatura */}
                      <div className="animation-exporter-frame-thumbnail">
                        {thumbnail ? (
                          <img 
                            src={thumbnail} 
                            alt={`Frame ${frameNumber}`}
                            className="animation-exporter-thumbnail-image"
                          />
                        ) : (
                          <div className="animation-exporter-thumbnail-placeholder">
                            {frameNumber}
                          </div>
                        )}
                      </div>
                      
                      {/* Info del frame */}
                      <div className="animation-exporter-frame-info">
                        <div className="animation-exporter-frame-number">#{frameNumber}</div>
                        <div className="animation-exporter-frame-duration">{frameDuration}ms</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



export default AnimationExporter;