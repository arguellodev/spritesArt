import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import "./playAnimation.css";
import { CiStop1 } from "react-icons/ci";

import { 
  LuEye, 
  LuEyeOff, 
  LuTrash2, 
  LuArrowUp, 
  LuArrowDown, 
  LuX, 
  LuChevronDown, 
  LuChevronRight,
  LuGroup,
  LuSquare,
  LuMousePointer,
  LuGripVertical,
  LuPlay,
  LuPause,
  LuStepForward,
  LuStepBack,
  LuSkipBack,
  LuSkipForward,
  LuPlus,
  LuCopy,
  LuLayers,
  LuSettings,
  LuRotateCcw,
  LuDelete,
  LuTrash,
  LuEraser,
  
} from "react-icons/lu";

const PlayAnimation = forwardRef(({ 
  frames, 
  onTimeUpdate, 
  onFrameChange, 
  externalCanvasRef, 
  viewportOffset = { x: 0, y: 0 },
  viewportWidth = 64,
  viewportHeight = 64,
  zoom = 1,
  displaySize = 256 
}, ref) => {
  const internalCanvasRef = useRef(null);
  
  // Usar canvas externo si se proporciona, sino usar el interno
  const displayCanvasRef = externalCanvasRef || internalCanvasRef;
  const animationRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const frameKeys = useRef([]);
  const frameIndexRef = useRef(0);
  const lastFrameDrawn = useRef(null);
  const startTimeRef = useRef(null);
  
  // Estados del reproductor
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [frameRange, setFrameRange] = useState({ start: 0, end: 0 });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [originalSize, setOriginalSize] = useState({ width: 64, height: 64 });

  // Configurar canvas con el tamaño adecuado
  const setupCanvas = useCallback(() => {
    if (!displayCanvasRef.current) return;
    
    const canvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Si es canvas externo, usar las dimensiones del viewport escaladas
    if (externalCanvasRef) {
      canvas.width = viewportWidth * zoom;
      canvas.height = viewportHeight * zoom;
    } else {
      // Canvas interno: usar displaySize
      canvas.width = displaySize;
      canvas.height = displaySize;
      
      // Aplicar estilo CSS para el tamaño visual
      canvas.style.width = `${displaySize}px`;
      canvas.style.height = `${displaySize}px`;
    }
    
    // Configurar para pixel art (evitar suavizado)
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    
    if (!externalCanvasRef) {
      canvas.style.imageRendering = 'pixelated';
      canvas.style.imageRendering = '-moz-crisp-edges';
      canvas.style.imageRendering = 'crisp-edges';
    }
  }, [displaySize, externalCanvasRef, viewportWidth, viewportHeight, zoom]);

  // Exponer funciones y propiedades mediante ref
  useImperativeHandle(ref, () => ({
    play: handlePlay,
    pause: handlePause,
    stop: handleStop,
    reset: handleReset,
    setFrame: (frameIndex) => {
      if (frameIndex >= 0 && frameIndex < frameKeys.current.length) {
        frameIndexRef.current = frameIndex;
        const frameNumber = frameKeys.current[frameIndex];
        const frameData = frames[frameNumber];
        drawFrame(frameData, frameNumber);
        setCurrentFrame(frameIndex);
      }
    },
    getCurrentFrame: () => frameIndexRef.current,
    isPlaying,
    canvas: displayCanvasRef.current,
    frameCount: frameKeys.current.length,
    totalDuration,
    currentTime
  }), [isPlaying, totalDuration, currentTime]);

  // Calcular duración total y preparar frames
  useEffect(() => {
    frameKeys.current = Object.keys(frames)
      .map(Number)
      .sort((a, b) => a - b);
    
    // Calcular duración total
    const duration = frameKeys.current.reduce((total, frameNumber) => {
      const frameData = frames[frameNumber];
      return total + (frameData.frameDuration || 100);
    }, 0);
    
    setTotalDuration(duration);
    setFrameRange({ start: 0, end: frameKeys.current.length - 1 });
    frameIndexRef.current = 0;
    setCurrentFrame(0);
    setCurrentTime(0);
    
    // Configurar canvas después de tener los frames
    setupCanvas();
    
    if (frameKeys.current.length > 0) {
      const firstFrameNumber = frameKeys.current[0];
      const firstFrameData = frames[firstFrameNumber];
      drawFrame(firstFrameData, firstFrameNumber);
    }

    return () => stopPlayback();
  }, [frames, setupCanvas]);

  // Reconfigurar canvas cuando cambien viewport o zoom
  useEffect(() => {
    if (externalCanvasRef) {
      setupCanvas();
      // Re-dibujar frame actual con nuevas dimensiones
      if (frameKeys.current.length > 0) {
        const currentFrameNumber = frameKeys.current[frameIndexRef.current];
        const currentFrameData = frames[currentFrameNumber];
        if (currentFrameData) {
          lastFrameDrawn.current = null; // Forzar re-dibujado
          drawFrame(currentFrameData, currentFrameNumber);
        }
      }
    }
  }, [viewportOffset, viewportWidth, viewportHeight, zoom, externalCanvasRef, setupCanvas, frames]);

  const startPlayback = useCallback(() => {
    if (frameKeys.current.length === 0) return;
    
    lastTimestampRef.current = null;
    lastFrameDrawn.current = null;
    startTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animateFrames);
  }, []);

  const stopPlayback = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const animateFrames = useCallback((timestamp) => {
    if (frameKeys.current.length === 0) return;

    // Aplicar rango de frames
    const availableFrames = frameKeys.current.slice(frameRange.start, frameRange.end + 1);
    if (availableFrames.length === 0) return;

    // Calcular índice actual dentro del rango
    let currentRangeIndex = frameIndexRef.current - frameRange.start;
    if (currentRangeIndex < 0 || currentRangeIndex >= availableFrames.length) {
      currentRangeIndex = 0;
      frameIndexRef.current = frameRange.start;
    }

    const currentFrameNumber = availableFrames[currentRangeIndex];
    const currentFrameData = frames[currentFrameNumber];
    const duration = (currentFrameData.frameDuration || 100) / playbackSpeed;

    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
      drawFrame(currentFrameData, currentFrameNumber);
    }

    const elapsed = timestamp - lastTimestampRef.current;

    if (elapsed >= duration) {
      const nextRangeIndex = (currentRangeIndex + 1) % availableFrames.length;
      frameIndexRef.current = frameRange.start + nextRangeIndex;
      lastTimestampRef.current = timestamp;
    
      // ✅ CORRECCIÓN: Detectar cuando completamos un ciclo completo
      if (nextRangeIndex === 0) {
        // Hemos vuelto al inicio - reiniciar tiempo
        setCurrentTime(0);
        startTimeRef.current = timestamp;
      }
    
      const newFrameNumber = availableFrames[nextRangeIndex];
      const newFrameData = frames[newFrameNumber];
      drawFrame(newFrameData, newFrameNumber);
      setCurrentFrame(frameIndexRef.current);
      
      if (onFrameChange) {
        onFrameChange(frameIndexRef.current, newFrameNumber);
      }
    }

    // Actualizar tiempo actual
    // En la función animateFrames, reemplaza esta parte:

// Actualizar tiempo actual
if (startTimeRef.current) {
  const totalElapsed = (timestamp - startTimeRef.current) * playbackSpeed;
  
  // ✅ CORRECCIÓN: Calcular duración del rango actual
  const rangeDuration = frameKeys.current
    .slice(frameRange.start, frameRange.end + 1)
    .reduce((total, frameNumber) => {
      const frameData = frames[frameNumber];
      return total + (frameData.frameDuration || 100);
    }, 0);
  
  // Limitar el tiempo al rango actual
  const clampedTime = Math.min(totalElapsed, rangeDuration);
  setCurrentTime(clampedTime);
  
  if (onTimeUpdate) {
    onTimeUpdate(clampedTime);
  }
}

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animateFrames);
    }
  }, [isPlaying, frameRange, playbackSpeed, frames, onFrameChange, onTimeUpdate]);

  // ✨ FUNCIÓN DE DIBUJO ADAPTADA CON VIEWPORT Y ZOOM
  const drawFrame = useCallback((frameData, frameNumber) => {
    if (!displayCanvasRef.current || lastFrameDrawn.current === frameNumber) return;

    const ctx = displayCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const canvasWidth = displayCanvasRef.current.width;
    const canvasHeight = displayCanvasRef.current.height;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const visibleLayers = (frameData.layers || [])
      .filter(layer => layer.visible?.[frameNumber] !== false)
      .sort((a, b) => a.zIndex - b.zIndex);

    visibleLayers.forEach(layer => {
      const sourceCanvas = frameData.canvases[layer.id];
      if (!sourceCanvas) return;

      ctx.globalAlpha = layer.opacity ?? 1;
      
      if (externalCanvasRef) {
        // ✨ MODO VIEWPORT: Extraer región específica y escalar
        // Igual que en useLayerManager - aplicar viewport y zoom
        ctx.drawImage(
          sourceCanvas,                    // Canvas fuente completo
          viewportOffset.x,               // X de inicio en canvas fuente
          viewportOffset.y,               // Y de inicio en canvas fuente  
          viewportWidth,                  // Ancho a extraer
          viewportHeight,                 // Alto a extraer
          0,                             // X destino (siempre 0)
          0,                             // Y destino (siempre 0)
          viewportWidth * zoom,          // Ancho final escalado
          viewportHeight * zoom          // Alto final escalado
        );
      } else {
        // ✨ MODO CANVAS INTERNO: Escalar completo al displaySize
        ctx.drawImage(
          sourceCanvas, 
          0, 0, sourceCanvas.width, sourceCanvas.height,  // fuente completa
          0, 0, canvasWidth, canvasHeight                  // destino completo
        );
      }
    });

    ctx.globalAlpha = 1;
    lastFrameDrawn.current = frameNumber;
  }, [externalCanvasRef, viewportOffset, viewportWidth, viewportHeight, zoom]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    startTimeRef.current = performance.now() - currentTime / playbackSpeed;
    startPlayback();
  }, [startPlayback, currentTime, playbackSpeed]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    stopPlayback();
  }, [stopPlayback]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    stopPlayback();
    frameIndexRef.current = frameRange.start;
    setCurrentFrame(frameRange.start);
    setCurrentTime(0);
    
    if (frameKeys.current.length > 0) {
      const frameNumber = frameKeys.current[frameRange.start];
      const frameData = frames[frameNumber];
      drawFrame(frameData, frameNumber);
    }
  }, [stopPlayback, frameRange.start, frames, drawFrame]);

  const handleReset = useCallback(() => {
    handleStop();
    setFrameRange({ start: 0, end: frameKeys.current.length - 1 });
    setPlaybackSpeed(1);
  }, [handleStop]);

  const handleFrameRangeChange = useCallback((type, value) => {
    const newRange = { ...frameRange };
    newRange[type] = parseInt(value);
    
    // Validar rango
    if (newRange.start > newRange.end) {
      if (type === 'start') {
        newRange.end = newRange.start;
      } else {
        newRange.start = newRange.end;
      }
    }
    
    setFrameRange(newRange);
    
    // Si estamos fuera del rango, ajustar frame actual
    if (frameIndexRef.current < newRange.start || frameIndexRef.current > newRange.end) {
      frameIndexRef.current = newRange.start;
      setCurrentFrame(newRange.start);
      
      const frameNumber = frameKeys.current[newRange.start];
      const frameData = frames[frameNumber];
      drawFrame(frameData, frameNumber);
    }
  }, [frameRange, drawFrame, frames]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
  };

  // Efectos para manejar la reproducción
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animateFrames);
    } else {
      stopPlayback();
    }
    
    return () => stopPlayback();
  }, [isPlaying, animateFrames, stopPlayback]);

  return (
    <div className="animation-player">
      
      {!externalCanvasRef && (
        
        <div className="player-viewport">
          <div className="top-info-overlay">
              <div className="time-display-overlay">
                <span className="time-current">{formatTime(currentTime)}</span>
                <span className="time-separator">/</span>
                <span className="time-total">{formatTime(totalDuration)}</span>
              </div>
              
              <div className="frame-counter-overlay">
                {currentFrame + 1} / {frameKeys.current.length}
              </div>
            </div>
          <canvas
            ref={internalCanvasRef}
            className="animation-canvas"
          />
          
                      {/* ✨ OVERLAY CON HOVER */}
          <div className="player-overlay">
            {/* Fila superior - Tiempo (izquierda) y Frames (derecha) - Siempre visible */}
            

            {/* Controles de reproducción - Solo en hover */}
            <div className="playback-controls-overlay">
              <button 
                className={`control-btn-overlay play-pause ${isPlaying ? 'playing' : ''}`}
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={frameKeys.current.length === 0}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ?  <LuPause/>:< LuPlay/>}
              </button>
              
              <button 
                className="control-btn-overlay stop"
                onClick={handleStop}
                disabled={frameKeys.current.length === 0}
                title="Detener"
              >
                <CiStop1 />
              </button>
              
              <button 
                className="control-btn-overlay reset"
                onClick={handleReset}
                disabled={frameKeys.current.length === 0}
                title="Reiniciar"
              >
               <LuRotateCcw />
              </button>

              <div className="speed-control-overlay">
                <select 
                  value={playbackSpeed} 
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="speed-select-overlay"
                  title="Velocidad de reproducción"
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            </div>

            {/* Selector de rango de frames - Solo en hover */}
            <div className="frame-range-overlay">
              <div className="range-group">
                <label htmlFor="start-frame">Inicio:</label>
                <input
                  id="start-frame"
                  type="number"
                  min={0}
                  max={frameKeys.current.length - 1}
                  value={frameRange.start}
                  onChange={(e) => handleFrameRangeChange('start', e.target.value)}
                  className="frame-input"
                />
              </div>
              
              <div className="range-group">
                <label htmlFor="end-frame">Fin:</label>
                <input
                  id="end-frame"
                  type="number"
                  min={0}
                  max={frameKeys.current.length - 1}
                  value={frameRange.end}
                  onChange={(e) => handleFrameRangeChange('end', e.target.value)}
                  className="frame-input"
                />
              </div>
              
              <div className="range-info">
                Rango: {frameRange.end - frameRange.start + 1} frames
              </div>
            </div>

            {/* Barra de progreso - Solo en hover */}
            <div className="progress-bar-overlay">
              <div 
                className="progress-fill-overlay"
                style={{ 
                  width: `${(currentFrame)*100/frameKeys.current.length}%` 
                 
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PlayAnimation.displayName = 'PlayAnimation';

export default PlayAnimation;