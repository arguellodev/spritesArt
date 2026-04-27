import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import './animationExporter.css';
import VideoExporter from './videoExporter';
import GifExporter from './gifExporter';
import { isValidBlendMode, DEFAULT_BLEND_MODE, toCompositeOperation } from '../blendModes';
import { drawLayerBlended } from '../pixelBlender';
import {
  LuX,
  LuImage,
  LuFilm,
  LuRepeat,
  LuDownload,
  LuMaximize,
  LuPalette,
  LuSettings2,
  LuLayers,
  LuRuler,
  LuCheck,
  LuCircleAlert,
  LuLoader,
  LuWandSparkles,
  LuInfinity,
} from 'react-icons/lu';

function blendModeForLayer(layer) {
  const override = layer?.blendModeOverride;
  if (override != null && isValidBlendMode(override)) return override;
  if (layer?.blendMode && isValidBlendMode(layer.blendMode)) return layer.blendMode;
  return DEFAULT_BLEND_MODE;
}

const AnimationExporter = ({
  isOpen,
  onClose,
  frames,
  framesResume,
}) => {
  // Ajustes de exportacion de video
  const [videoSettings, setVideoSettings] = useState({
    fps: 30,
    quality: 'high',
    format: 'webm',
  });

  // Ajustes de exportacion GIF
  const [gifSettings, setGifSettings] = useState({
    maxColors: 256,
    quantize: 'rgb565',
    loop: 0,
  });

  // Estados principales
  const [exportType, setExportType] = useState('png');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Banner inline (sustituye a alert() nativo)
  const [statusMessage, setStatusMessage] = useState(null);

  // Seleccion de frames
  const [selectedFrames, setSelectedFrames] = useState(new Set());
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [selectionMode, setSelectionMode] = useState('all');

  // Escalado
  const [scaleFactor, setScaleFactor] = useState(1);
  const [customScale, setCustomScale] = useState('');
  const [scaleMode, setScaleMode] = useState('preset');
  const [scalingAlgorithm, setScalingAlgorithm] = useState('nearest');
  const [backgroundColor, setBackgroundColor] = useState('transparent');

  const showSuccess = useCallback((text) => {
    setStatusMessage({ type: 'success', text });
  }, []);

  const showError = useCallback((text) => {
    setStatusMessage({ type: 'error', text });
  }, []);

  // Auto-cerrar banners de exito tras unos segundos
  useEffect(() => {
    if (!statusMessage) return undefined;
    const ms = statusMessage.type === 'success' ? 4000 : 6000;
    const t = setTimeout(() => setStatusMessage(null), ms);
    return () => clearTimeout(t);
  }, [statusMessage]);

  // Escape cierra el modal (salvo durante exportacion activa)
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !isExporting) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isExporting, onClose]);

  // Refs para gestion de foco (a11y: auto-focus + focus trap)
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Auto-foco al abrir: el boton de cerrar recibe foco inicial
  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen]);

  // Focus trap: Tab/Shift+Tab ciclan dentro del modal
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusables = modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!modal.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Secuencia de frames ordenada.
  // `.sort()` muta in-place — clonamos primero para no tocar el array original
  // de framesResume (que puede venir frozen de Immer u otros consumidores
  // podrían depender de su orden original).
  const frameSequence = useMemo(() => {
    if (!framesResume?.computed?.frameSequence) return [];
    return [...framesResume.computed.frameSequence].sort((a, b) => a - b);
  }, [framesResume]);

  const originalDimensions = useMemo(() => {
    const firstFrame = frames[frameSequence[0]];
    if (!firstFrame) return { width: 800, height: 600 };

    const firstLayer = firstFrame.layers[0];
    if (!firstLayer || !firstFrame.canvases[firstLayer.id]) {
      return { width: 800, height: 600 };
    }

    const canvas = firstFrame.canvases[firstLayer.id];
    return { width: canvas.width, height: canvas.height };
  }, [frames, frameSequence]);

  const currentScaleFactor = useMemo(() => {
    if (scaleMode === 'custom') {
      const parsed = parseFloat(customScale);
      return Number.isNaN(parsed) || parsed <= 0 ? 1 : parsed;
    }
    return scaleFactor;
  }, [scaleMode, scaleFactor, customScale]);

  const outputDimensions = useMemo(() => ({
    width: Math.round(originalDimensions.width * currentScaleFactor),
    height: Math.round(originalDimensions.height * currentScaleFactor),
  }), [originalDimensions, currentScaleFactor]);

  useEffect(() => {
    if (frameSequence.length > 0) {
      setRangeStart(frameSequence[0]);
      setRangeEnd(frameSequence[frameSequence.length - 1]);
      setSelectedFrames(new Set(frameSequence));
    }
  }, [frameSequence]);

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

      case 'hybrid': {
        const isNonInteger = (currentScaleFactor % 1) !== 0;

        if (isNonInteger && currentScaleFactor > 1) {
          const integerScale = Math.ceil(currentScaleFactor);
          const intermediateWidth = sourceCanvas.width * integerScale;
          const intermediateHeight = sourceCanvas.height * integerScale;

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = intermediateWidth;
          tempCanvas.height = intermediateHeight;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.imageSmoothingEnabled = false;
          tempCtx.drawImage(sourceCanvas, 0, 0, intermediateWidth, intermediateHeight);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
        } else {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        }
        break;
      }

      default:
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    }

    return canvas;
  }, [currentScaleFactor]);

  const renderFrameToCanvas = useCallback((frameNumber) => {
    const frameData = frames[frameNumber];
    if (!frameData) return null;

    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = originalDimensions.width;
    originalCanvas.height = originalDimensions.height;
    const originalCtx = originalCanvas.getContext('2d');

    if (backgroundColor !== 'transparent') {
      originalCtx.fillStyle = backgroundColor;
      originalCtx.fillRect(0, 0, originalDimensions.width, originalDimensions.height);
    }

    const hierarchicalLayers = frameData.layers
      .filter((layer) => !layer.isGroupLayer)
      .map((mainLayer) => ({
        ...mainLayer,
        groupLayers: frameData.layers
          .filter((layer) => layer.isGroupLayer && layer.parentLayerId === mainLayer.id)
          .sort((a, b) => a.zIndex - b.zIndex),
      }))
      .sort((a, b) => a.zIndex - b.zIndex);

    let isFirstDrawn = true;
    const _expSrcRect = { x: 0, y: 0, w: originalDimensions.width, h: originalDimensions.height };
    const _expDstRect = { w: originalDimensions.width, h: originalDimensions.height };
    for (const mainLayer of hierarchicalLayers) {
      const isVisible = mainLayer.visible && (mainLayer.visible[frameNumber] !== false);
      if (!isVisible) continue;

      const mainCanvas = frameData.canvases[mainLayer.id];
      if (mainCanvas) {
        const layerOpacity = mainLayer.opacity ?? 1.0;
        const blendId = isFirstDrawn ? 'normal' : blendModeForLayer(mainLayer);
        drawLayerBlended(originalCtx, mainCanvas, blendId, layerOpacity, _expSrcRect, _expDstRect);
        isFirstDrawn = false;
      }

      for (const groupLayer of mainLayer.groupLayers) {
        if (!groupLayer.visible) continue;
        const groupCanvas = frameData.canvases[groupLayer.id];
        if (groupCanvas) {
          const groupOpacity = groupLayer.opacity ?? 1.0;
          const groupBlendId = isFirstDrawn ? 'normal' : blendModeForLayer(groupLayer);
          drawLayerBlended(originalCtx, groupCanvas, groupBlendId, groupOpacity, _expSrcRect, _expDstRect);
          isFirstDrawn = false;
        }
      }
    }

    if (currentScaleFactor === 1) return originalCanvas;
    return scaleImageWithAlgorithm(
      originalCanvas,
      outputDimensions.width,
      outputDimensions.height,
      scalingAlgorithm,
    );
  }, [frames, originalDimensions, outputDimensions, backgroundColor, currentScaleFactor, scalingAlgorithm, scaleImageWithAlgorithm]);

  const generateThumbnail = useCallback((frameNumber, size = 64) => {
    const frameData = frames[frameNumber];
    if (!frameData) return null;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);

    const gridSize = 8;
    ctx.fillStyle = '#e0e0e0';
    for (let x = 0; x < size; x += gridSize * 2) {
      for (let y = 0; y < size; y += gridSize * 2) {
        ctx.fillRect(x, y, gridSize, gridSize);
        ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
      }
    }

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

    const hierarchicalLayers = frameData.layers
      .filter((layer) => !layer.isGroupLayer)
      .map((mainLayer) => ({
        ...mainLayer,
        groupLayers: frameData.layers
          .filter((layer) => layer.isGroupLayer && layer.parentLayerId === mainLayer.id)
          .sort((a, b) => a.zIndex - b.zIndex),
      }))
      .sort((a, b) => a.zIndex - b.zIndex);

    let isFirstDrawn = true;
    for (const mainLayer of hierarchicalLayers) {
      const isVisible = mainLayer.visible && (mainLayer.visible[frameNumber] !== false);
      if (!isVisible) continue;

      const mainCanvas = frameData.canvases[mainLayer.id];
      if (mainCanvas) {
        const layerOpacity = mainLayer.opacity ?? 1.0;
        const blendId = isFirstDrawn ? 'normal' : blendModeForLayer(mainLayer);
        const composite = toCompositeOperation(blendId);
        ctx.globalAlpha = layerOpacity;
        ctx.globalCompositeOperation = composite;
        ctx.drawImage(
          mainCanvas,
          0, 0, originalDimensions.width, originalDimensions.height,
          offsetX, offsetY, drawWidth, drawHeight,
        );
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        isFirstDrawn = false;
      }

      for (const groupLayer of mainLayer.groupLayers) {
        if (!groupLayer.visible) continue;
        const groupCanvas = frameData.canvases[groupLayer.id];
        if (groupCanvas) {
          const groupOpacity = groupLayer.opacity ?? 1.0;
          const groupBlendId = isFirstDrawn ? 'normal' : blendModeForLayer(groupLayer);
          const groupComposite = toCompositeOperation(groupBlendId);
          ctx.globalAlpha = groupOpacity;
          ctx.globalCompositeOperation = groupComposite;
          ctx.drawImage(
            groupCanvas,
            0, 0, originalDimensions.width, originalDimensions.height,
            offsetX, offsetY, drawWidth, drawHeight,
          );
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
          isFirstDrawn = false;
        }
      }
    }

    return canvas.toDataURL('image/png');
  }, [frames, originalDimensions]);

  // Seleccion de frames
  const handleFrameToggle = useCallback((frameNumber) => {
    setSelectedFrames((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(frameNumber)) newSet.delete(frameNumber);
      else newSet.add(frameNumber);
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
    const rangeFrames = frameSequence.filter((frame) => frame >= rangeStart && frame <= rangeEnd);
    setSelectedFrames(new Set(rangeFrames));
  }, [frameSequence, rangeStart, rangeEnd]);

  useEffect(() => {
    switch (selectionMode) {
      case 'all':
        setSelectedFrames(new Set(frameSequence));
        break;
      case 'range':
        handleRangeSelect();
        break;
      case 'manual':
      default:
        break;
    }
  }, [selectionMode, frameSequence, handleRangeSelect]);

  // Video
  const prepareFramesForVideoExport = useCallback(() => {
    const framesToExport = Array.from(selectedFrames).sort((a, b) => a - b);

    const videoFramesResume = {
      frames: {},
      computed: { frameSequence: framesToExport },
    };

    framesToExport.forEach((frameNumber) => {
      const frameDuration = framesResume?.frames?.[frameNumber]?.duration || 100;
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
          transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        }] : [],
      };
    });

    return { framesToExport, videoFramesResume };
  }, [framesResume, selectedFrames, renderFrameToCanvas]);

  const handleVideoExport = async () => {
    const { framesToExport, videoFramesResume } = prepareFramesForVideoExport();

    if (framesToExport.length === 0) {
      showError('No hay frames seleccionados para exportar.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const videoExporter = new VideoExporter();

      const qualityBitrates = {
        low: 1000000,
        medium: 2500000,
        high: 5000000,
      };

      const exportOptions = {
        width: outputDimensions.width,
        height: outputDimensions.height,
        fps: videoSettings.fps,
        backgroundColor,
        scaleFactor: 1,
        videoBitsPerSecond: qualityBitrates[videoSettings.quality],
        onProgress: (progress) => setExportProgress(progress),
        onComplete: (blob) => {
          const filename = `animation_${outputDimensions.width}x${outputDimensions.height}_${videoSettings.fps}fps_${currentScaleFactor}x.${videoSettings.format}`;
          videoExporter.downloadVideo(blob, filename);
          showSuccess(`Video exportado: ${filename}`);
          setIsExporting(false);
          setExportProgress(0);
        },
        onError: (error) => {
          console.error('Error durante la exportacion de video:', error);
          showError(`Error al exportar video: ${error.message}`);
          setIsExporting(false);
          setExportProgress(0);
        },
      };

      await videoExporter.exportToVideo(framesToExport, videoFramesResume, exportOptions);
    } catch (error) {
      console.error('Error al inicializar exportacion de video:', error);
      showError(`Error al iniciar exportacion de video: ${error.message}`);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // GIF
  const handleGifExport = async () => {
    const framesToExport = Array.from(selectedFrames).sort((a, b) => a - b);
    if (framesToExport.length === 0) {
      showError('No hay frames seleccionados para exportar.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const canvases = [];
      const durationsMs = [];
      for (let i = 0; i < framesToExport.length; i += 1) {
        const n = framesToExport[i];
        const c = renderFrameToCanvas(n);
        if (c) {
          canvases.push(c);
          durationsMs.push(framesResume?.frames?.[n]?.duration || 100);
        }
        setExportProgress(((i + 1) / framesToExport.length) * 50);
        if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
      }

      const exporter = new GifExporter();
      const blob = await exporter.export({
        canvases,
        durationsMs,
        backgroundColor,
        maxColors: gifSettings.maxColors,
        quantizeFormat: gifSettings.quantize,
        loop: gifSettings.loop,
        onProgress: (p) => setExportProgress(50 + p / 2),
      });

      const filename = `animation_${outputDimensions.width}x${outputDimensions.height}_${currentScaleFactor}x.gif`;
      exporter.downloadGif(blob, filename);
      showSuccess(`GIF exportado: ${filename} (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error('Error exportando GIF:', err);
      showError(`Error al exportar GIF: ${err.message}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // PNG
  const handleExport = async () => {
    if (exportType === 'video') {
      await handleVideoExport();
      return;
    }
    if (exportType === 'gif') {
      await handleGifExport();
      return;
    }

    const framesToExport = Array.from(selectedFrames).sort((a, b) => a - b);

    if (framesToExport.length === 0) {
      showError('No hay frames seleccionados para exportar.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      for (let i = 0; i < framesToExport.length; i += 1) {
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

        setExportProgress(((i + 1) / framesToExport.length) * 100);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      showSuccess(`Exportacion completada: ${framesToExport.length} frames PNG.`);
    } catch (error) {
      console.error('Error durante la exportacion:', error);
      showError(`Error durante la exportacion: ${error.message}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Cierre por click en el backdrop (pero no por click dentro del modal)
  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget && !isExporting) onClose();
  };

  if (!isOpen) return null;

  const exportTypeMeta = {
    png: { label: 'Frames PNG', icon: <LuImage aria-hidden="true" /> },
    video: { label: 'Video', icon: <LuFilm aria-hidden="true" /> },
    gif: { label: 'GIF', icon: <LuRepeat aria-hidden="true" /> },
  };

  const getExportButtonLabel = () => {
    if (isExporting) {
      if (exportType === 'video') return 'Creando video...';
      if (exportType === 'gif') return 'Codificando GIF...';
      return 'Exportando...';
    }
    const count = selectedFrames.size;
    if (exportType === 'video') return `Crear video (${count} frames)`;
    if (exportType === 'gif') return `Exportar GIF (${count} frames)`;
    return `Exportar ${count} frames`;
  };

  const algorithmHelp = {
    nearest: 'Nearest: píxeles nítidos (recomendado para pixel art).',
    bilinear: 'Bilinear: bordes suavizados (ideal para escalas grandes).',
    hybrid: 'Híbrido: nearest + reducción bilinear para escalas no enteras.',
  };

  return (
    <div
      className="animation-exporter-overlay"
      onMouseDown={handleOverlayMouseDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="animation-exporter-title"
    >
      <div
        className="animation-exporter-modal"
        ref={modalRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="animation-exporter-header">
          <div className="animation-exporter-header-main">
            <span className="animation-exporter-header-icon" aria-hidden="true">
              <LuDownload />
            </span>
            <div className="animation-exporter-header-text">
              <h2
                id="animation-exporter-title"
                className="animation-exporter-title"
              >
                Exportar animación
              </h2>
              <div className="animation-exporter-header-meta">
                <span className="animation-exporter-header-chip">
                  {exportTypeMeta[exportType].icon}
                  {exportTypeMeta[exportType].label}
                </span>
                <span className="animation-exporter-header-chip animation-exporter-header-chip--muted">
                  {selectedFrames.size}/{frameSequence.length} frames
                </span>
                <span className="animation-exporter-header-chip animation-exporter-header-chip--muted">
                  {outputDimensions.width}×{outputDimensions.height}px
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            ref={closeBtnRef}
            onClick={onClose}
            className="animation-exporter-close-button"
            aria-label="Cerrar"
            disabled={isExporting}
            title={isExporting ? 'Espera a que termine la exportación' : 'Cerrar (Esc)'}
          >
            <LuX aria-hidden="true" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`animation-exporter-banner animation-exporter-banner--${statusMessage.type}`}
            role={statusMessage.type === 'error' ? 'alert' : 'status'}
          >
            <span className="animation-exporter-banner-icon" aria-hidden="true">
              {statusMessage.type === 'success' ? <LuCheck /> : <LuCircleAlert />}
            </span>
            <span className="animation-exporter-banner-text">{statusMessage.text}</span>
            <button
              type="button"
              className="animation-exporter-banner-close"
              aria-label="Descartar mensaje"
              onClick={() => setStatusMessage(null)}
            >
              <LuX aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="animation-exporter-container">
          <div className="animation-exporter-left-panel">
            {/* Formato */}
            <div className="animation-exporter-section">
              <h3 className="animation-exporter-section-title">
                <LuSettings2 aria-hidden="true" />
                Formato
              </h3>
              <div className="animation-exporter-export-type-grid">
                <button
                  type="button"
                  onClick={() => setExportType('png')}
                  className={`animation-exporter-export-type-button ${exportType === 'png' ? 'active' : ''}`}
                  aria-pressed={exportType === 'png'}
                >
                  <span className="animation-exporter-export-type-icon" aria-hidden="true">
                    <LuImage />
                  </span>
                  <span className="animation-exporter-export-type-label">Frames PNG</span>
                  <span className="animation-exporter-export-type-sub">Un archivo por frame</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportType('video')}
                  className={`animation-exporter-export-type-button ${exportType === 'video' ? 'active' : ''}`}
                  aria-pressed={exportType === 'video'}
                >
                  <span className="animation-exporter-export-type-icon" aria-hidden="true">
                    <LuFilm />
                  </span>
                  <span className="animation-exporter-export-type-label">Video</span>
                  <span className="animation-exporter-export-type-sub">WebM o MP4</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportType('gif')}
                  className={`animation-exporter-export-type-button ${exportType === 'gif' ? 'active' : ''}`}
                  aria-pressed={exportType === 'gif'}
                >
                  <span className="animation-exporter-export-type-icon" aria-hidden="true">
                    <LuRepeat />
                  </span>
                  <span className="animation-exporter-export-type-label">GIF</span>
                  <span className="animation-exporter-export-type-sub">Animado, con loop</span>
                </button>
              </div>
            </div>

            {/* Tamaño de salida */}
            <div className="animation-exporter-section">
              <h3 className="animation-exporter-section-title">
                <LuMaximize aria-hidden="true" />
                Tamaño de salida
              </h3>
              <div className="animation-exporter-input-group">
                <div className="animation-exporter-scale-mode-buttons">
                  <button
                    type="button"
                    onClick={() => setScaleMode('preset')}
                    className={`animation-exporter-scale-mode-button ${scaleMode === 'preset' ? 'active' : ''}`}
                    aria-pressed={scaleMode === 'preset'}
                  >
                    Predefinidos
                  </button>
                  <button
                    type="button"
                    onClick={() => setScaleMode('custom')}
                    className={`animation-exporter-scale-mode-button ${scaleMode === 'custom' ? 'active' : ''}`}
                    aria-pressed={scaleMode === 'custom'}
                  >
                    Personalizado
                  </button>
                </div>

                {scaleMode === 'preset' && (
                  <div className="animation-exporter-scale-presets">
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4].map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setScaleFactor(scale)}
                        className={`animation-exporter-scale-button ${Math.abs(scaleFactor - scale) < 0.01 ? 'active' : ''}`}
                        aria-pressed={Math.abs(scaleFactor - scale) < 0.01}
                      >
                        {scale}×
                      </button>
                    ))}
                  </div>
                )}

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
                      aria-label="Factor de escala personalizado"
                    />
                    <span className="animation-exporter-custom-scale-label">×</span>
                  </div>
                )}

                <div className="animation-exporter-input-row">
                  <label htmlFor="ae-algorithm" className="animation-exporter-input-label">
                    <LuWandSparkles aria-hidden="true" /> Algoritmo
                  </label>
                  <select
                    id="ae-algorithm"
                    value={scalingAlgorithm}
                    onChange={(e) => setScalingAlgorithm(e.target.value)}
                    className="animation-exporter-select"
                  >
                    <option value="nearest">Nearest neighbor</option>
                    <option value="bilinear">Bilinear</option>
                    <option value="hybrid">Híbrido (recomendado)</option>
                  </select>
                </div>

                <div className="animation-exporter-dimension-info">
                  <div className="animation-exporter-dimension-row">
                    <span className="animation-exporter-dimension-label">
                      <LuRuler aria-hidden="true" /> Original
                    </span>
                    <span className="animation-exporter-dimension-value">
                      {originalDimensions.width}×{originalDimensions.height}px
                    </span>
                  </div>
                  <div className="animation-exporter-dimension-row">
                    <span className="animation-exporter-dimension-label">
                      <LuMaximize aria-hidden="true" /> Salida
                    </span>
                    <span className="animation-exporter-dimension-value animation-exporter-dimension-value--accent">
                      {outputDimensions.width}×{outputDimensions.height}px
                    </span>
                  </div>
                  <div className="animation-exporter-dimension-row">
                    <span className="animation-exporter-dimension-label">
                      <LuWandSparkles aria-hidden="true" /> Escala
                    </span>
                    <span className="animation-exporter-dimension-value">
                      {currentScaleFactor.toFixed(2)}×
                    </span>
                  </div>
                  <p className="animation-exporter-algorithm-info">
                    {algorithmHelp[scalingAlgorithm]}
                  </p>
                </div>
              </div>
            </div>

            {/* Fondo */}
            <div className="animation-exporter-section">
              <h3 className="animation-exporter-section-title">
                <LuPalette aria-hidden="true" />
                Fondo
              </h3>
              <div className="animation-exporter-input-group">
                <div className="animation-exporter-input-row">
                  <label htmlFor="ae-bg" className="animation-exporter-input-label">
                    Color
                  </label>
                  <select
                    id="ae-bg"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="animation-exporter-select"
                  >
                    <option value="transparent">Transparente</option>
                    <option value="#ffffff">Blanco</option>
                    <option value="#000000">Negro</option>
                    <option value="#808080">Gris</option>
                  </select>
                </div>
              </div>
            </div>

            {exportType === 'video' && (
              <div className="animation-exporter-section">
                <h3 className="animation-exporter-section-title">
                  <LuFilm aria-hidden="true" />
                  Ajustes de video
                </h3>
                <div className="animation-exporter-input-group">
                  <div className="animation-exporter-input-row">
                    <label htmlFor="ae-fps" className="animation-exporter-input-label">
                      FPS
                    </label>
                    <select
                      id="ae-fps"
                      value={videoSettings.fps}
                      onChange={(e) => setVideoSettings((prev) => ({ ...prev, fps: Number(e.target.value) }))}
                      className="animation-exporter-select"
                    >
                      <option value={12}>12 FPS</option>
                      <option value={24}>24 FPS</option>
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                    </select>
                  </div>

                  <div className="animation-exporter-input-row">
                    <label htmlFor="ae-quality" className="animation-exporter-input-label">
                      Calidad
                    </label>
                    <select
                      id="ae-quality"
                      value={videoSettings.quality}
                      onChange={(e) => setVideoSettings((prev) => ({ ...prev, quality: e.target.value }))}
                      className="animation-exporter-select"
                    >
                      <option value="low">Baja · 1 Mbps</option>
                      <option value="medium">Media · 2.5 Mbps</option>
                      <option value="high">Alta · 5 Mbps</option>
                    </select>
                  </div>

                  <div className="animation-exporter-input-row">
                    <label htmlFor="ae-format" className="animation-exporter-input-label">
                      Formato
                    </label>
                    <select
                      id="ae-format"
                      value={videoSettings.format}
                      onChange={(e) => setVideoSettings((prev) => ({ ...prev, format: e.target.value }))}
                      className="animation-exporter-select"
                    >
                      <option value="webm">WebM (VP9)</option>
                      <option value="mp4">MP4 (si está soportado)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {exportType === 'gif' && (
              <div className="animation-exporter-section">
                <h3 className="animation-exporter-section-title">
                  <LuRepeat aria-hidden="true" />
                  Ajustes de GIF
                </h3>
                <div className="animation-exporter-input-group">
                  <div className="animation-exporter-input-row">
                    <label htmlFor="ae-colors" className="animation-exporter-input-label">
                      Colores
                    </label>
                    <select
                      id="ae-colors"
                      value={gifSettings.maxColors}
                      onChange={(e) => setGifSettings((prev) => ({ ...prev, maxColors: Number(e.target.value) }))}
                      className="animation-exporter-select"
                    >
                      <option value={256}>256 · máxima calidad</option>
                      <option value={128}>128</option>
                      <option value={64}>64 · estilo retro</option>
                      <option value={32}>32 · archivo muy pequeño</option>
                      <option value={16}>16 · Game Boy</option>
                    </select>
                  </div>

                  <div className="animation-exporter-input-row">
                    <label htmlFor="ae-quantize" className="animation-exporter-input-label">
                      Cuantización
                    </label>
                    <select
                      id="ae-quantize"
                      value={gifSettings.quantize}
                      onChange={(e) => setGifSettings((prev) => ({ ...prev, quantize: e.target.value }))}
                      className="animation-exporter-select"
                    >
                      <option value="rgb565">RGB565 · mejor calidad</option>
                      <option value="rgb444">RGB444 · archivo menor</option>
                    </select>
                  </div>

                  <div className="animation-exporter-input-row">
                    <label htmlFor="ae-loop" className="animation-exporter-input-label">
                      Repetición
                    </label>
                    <select
                      id="ae-loop"
                      value={gifSettings.loop}
                      onChange={(e) => setGifSettings((prev) => ({ ...prev, loop: Number(e.target.value) }))}
                      className="animation-exporter-select"
                    >
                      <option value={0}>Infinito</option>
                      <option value={1}>1 vez</option>
                      <option value={3}>3 veces</option>
                      <option value={5}>5 veces</option>
                    </select>
                  </div>

                  <p className="animation-exporter-algorithm-info">
                    {gifSettings.loop === 0 ? (
                      <>
                        <LuInfinity aria-hidden="true" /> Loop infinito.
                      </>
                    ) : (
                      <>Se repetirá {gifSettings.loop} {gifSettings.loop === 1 ? 'vez' : 'veces'}.</>
                    )}
                    {backgroundColor === 'transparent' && ' Fondo transparente activo.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="animation-exporter-right-panel">
            <div className="animation-exporter-section">
              <h3 className="animation-exporter-section-title">
                <LuLayers aria-hidden="true" />
                Selección de frames
                <span className="animation-exporter-section-count">
                  {selectedFrames.size}/{frameSequence.length}
                </span>
              </h3>

              <div className="animation-exporter-selection-modes">
                <button
                  type="button"
                  onClick={() => setSelectionMode('all')}
                  className={`animation-exporter-mode-button ${selectionMode === 'all' ? 'active' : ''}`}
                  aria-pressed={selectionMode === 'all'}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('range')}
                  className={`animation-exporter-mode-button ${selectionMode === 'range' ? 'active' : ''}`}
                  aria-pressed={selectionMode === 'range'}
                >
                  Rango
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('manual')}
                  className={`animation-exporter-mode-button ${selectionMode === 'manual' ? 'active' : ''}`}
                  aria-pressed={selectionMode === 'manual'}
                >
                  Manual
                </button>
              </div>

              {selectionMode === 'range' && (
                <div className="animation-exporter-range-controls">
                  <div className="animation-exporter-input-row">
                    <label htmlFor="ae-range-start" className="animation-exporter-input-label">Desde</label>
                    <input
                      id="ae-range-start"
                      type="number"
                      min={frameSequence[0] || 1}
                      max={frameSequence[frameSequence.length - 1] || 1}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(Number(e.target.value))}
                      className="animation-exporter-number-input"
                    />
                  </div>
                  <div className="animation-exporter-input-row">
                    <label htmlFor="ae-range-end" className="animation-exporter-input-label">Hasta</label>
                    <input
                      id="ae-range-end"
                      type="number"
                      min={frameSequence[0] || 1}
                      max={frameSequence[frameSequence.length - 1] || 1}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(Number(e.target.value))}
                      className="animation-exporter-number-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRangeSelect}
                    className="animation-exporter-apply-range-button"
                  >
                    <LuCheck aria-hidden="true" />
                    Aplicar rango
                  </button>
                </div>
              )}

              {selectionMode === 'manual' && (
                <div className="animation-exporter-manual-controls">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="animation-exporter-select-button"
                  >
                    <LuCheck aria-hidden="true" />
                    Seleccionar todo
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectNone}
                    className="animation-exporter-select-button"
                  >
                    <LuX aria-hidden="true" />
                    Deseleccionar
                  </button>
                </div>
              )}

              <div className="animation-exporter-frame-grid">
                {frameSequence.map((frameNumber) => {
                  const isSelected = selectedFrames.has(frameNumber);
                  const thumbnail = generateThumbnail(frameNumber, 80);
                  const frameDuration = framesResume?.frames?.[frameNumber]?.duration || 100;

                  return (
                    <div
                      key={frameNumber}
                      className={`animation-exporter-frame-card ${isSelected ? 'selected' : ''} ${selectionMode === 'manual' ? 'is-clickable' : ''}`}
                      onClick={() => selectionMode === 'manual' && handleFrameToggle(frameNumber)}
                      role={selectionMode === 'manual' ? 'button' : undefined}
                      tabIndex={selectionMode === 'manual' ? 0 : -1}
                      onKeyDown={(e) => {
                        if (selectionMode !== 'manual') return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleFrameToggle(frameNumber);
                        }
                      }}
                    >
                      {selectionMode === 'manual' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleFrameToggle(frameNumber)}
                          className="animation-exporter-frame-checkbox"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Frame ${frameNumber}`}
                        />
                      )}
                      {isSelected && selectionMode !== 'manual' && (
                        <span
                          className="animation-exporter-frame-check"
                          aria-hidden="true"
                        >
                          <LuCheck />
                        </span>
                      )}

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

        <div className="animation-exporter-footer">
          {isExporting && (
            <div className="animation-exporter-progress-container">
              <div className="animation-exporter-progress-bar">
                <div
                  className="animation-exporter-progress-fill"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="animation-exporter-progress-text">
                {Math.round(exportProgress)}% completado
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || selectedFrames.size === 0}
            className="animation-exporter-export-button"
          >
            {isExporting ? (
              <LuLoader aria-hidden="true" className="animation-exporter-spinner" />
            ) : (
              <LuDownload aria-hidden="true" />
            )}
            {getExportButtonLabel()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnimationExporter;
