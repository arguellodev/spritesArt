import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  LuPlay,
  LuPause,
  LuStepForward,
  LuStepBack,
  LuSkipBack,
  LuSkipForward,
  LuRotateCcw
} from "react-icons/lu";

const PlayingAnimation = React.forwardRef(({
  // Props de datos
  frames,
  framesResume,
  
  // Props de control
  isPlaying,
  setIsPlaying,
  
  // Props opcionales de configuración
  onTimeUpdate,
  onFrameChange,
  
  // Props para renderizado (SOLO EXTERNAL CANVAS)
  externalCanvasRef,
  viewportOffset = { x: 0, y: 0 },
  viewportWidth = 64,
  viewportHeight = 64,
  zoom = 1
}, ref) => {
  
  // ========== Estados locales ==========
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [frameRange, setFrameRange] = useState({ start: 0, end: 0 });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentAnimationFrame, setCurrentAnimationFrame] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(true);
  
  // ========== Referencias ==========
  const animationRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const frameKeys = useRef([]);
  const frameIndexRef = useRef(0);
  const lastFrameDrawn = useRef(null);
  const startTimeRef = useRef(null);
  
  // ========== Función helper ==========
  const getFramesInfo = useCallback(() => {
    if (!framesResume?.frames) {
      return { frameNumbers: [], frameCount: 0, minFrame: 1, maxFrame: 1 };
    }
    
    const frameNumbers = Object.keys(framesResume.frames)
      .map(Number)
      .sort((a, b) => a - b);
    
    return {
      frameNumbers,
      frameCount: frameNumbers.length,
      minFrame: frameNumbers[0] || 1,
      maxFrame: frameNumbers[frameNumbers.length - 1] || 1
    };
  }, [framesResume]);
  
  const { frameNumbers, frameCount } = getFramesInfo();
  
  // ========== Configuración del canvas ==========
  const setupCanvas = useCallback(() => {
    if (!externalCanvasRef?.current) return;
    
    const canvas = externalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Configurar dimensiones del viewport
    canvas.width = viewportWidth * zoom;
    canvas.height = viewportHeight * zoom;
    
    // Configurar para pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
  }, [externalCanvasRef, viewportWidth, viewportHeight, zoom]);
  
  // ========== Función de dibujado ==========
  const drawFrame = useCallback((frameData, frameNumber) => {
    if (!externalCanvasRef?.current || lastFrameDrawn.current === frameNumber) return;

    const ctx = externalCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const canvasWidth = externalCanvasRef.current.width;
    const canvasHeight = externalCanvasRef.current.height;
    
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
      
      // Extraer región específica del viewport y escalar
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
    });

    ctx.globalAlpha = 1;
    lastFrameDrawn.current = frameNumber;
  }, [externalCanvasRef, viewportOffset, viewportWidth, viewportHeight, zoom]);
  
  // ========== Lógica de animación CORREGIDA ==========
  const animateFrames = useCallback((timestamp) => {
    // ✅ Verificaciones iniciales
    if (frameKeys.current.length === 0) {
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animateFrames);
      }
      return;
    }

    if (frameKeys.current.length === 1) {
      // Solo 1 frame, dibujar y detener
      const frameNumber = frameKeys.current[0];
      const frameData = frames[frameNumber];
      if (frameData) {
        drawFrame(frameData, frameNumber);
      }
      return;
    }

    // ✅ Aplicar rango de frames
    const availableFrames = frameKeys.current.slice(frameRange.start, frameRange.end + 1);
    if (availableFrames.length === 0) {
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animateFrames);
      }
      return;
    }

    // ✅ Verificar frameIndexRef dentro del rango válido
    let currentRangeIndex = frameIndexRef.current - frameRange.start;
    if (currentRangeIndex < 0 || currentRangeIndex >= availableFrames.length) {
      currentRangeIndex = 0;
      frameIndexRef.current = frameRange.start;
    }

    const currentFrameNumber = availableFrames[currentRangeIndex];
    const currentFrameData = frames[currentFrameNumber];
    
    if (!currentFrameData) {
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animateFrames);
      }
      return;
    }

    const duration = (currentFrameData.frameDuration || 100) / playbackSpeed;

    // ✅ Primera ejecución
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
      drawFrame(currentFrameData, currentFrameNumber);
      
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animateFrames);
      }
      return;
    }

    const elapsed = timestamp - lastTimestampRef.current;

    // ✅ Cambio de frame
    if (elapsed >= duration) {
      let nextRangeIndex = currentRangeIndex + 1;
      
      // ✅ Lógica de loop CORREGIDA
      if (nextRangeIndex >= availableFrames.length) {
        if (loopEnabled) {
          nextRangeIndex = 0; // Volver al inicio
        } else {
          // Detener animación al final
          setIsPlaying(false);
          return;
        }
      }
      
      frameIndexRef.current = frameRange.start + nextRangeIndex;
      lastTimestampRef.current = timestamp;

      const newFrameNumber = availableFrames[nextRangeIndex];
      const newFrameData = frames[newFrameNumber];
      
      if (newFrameData) {
        drawFrame(newFrameData, newFrameNumber);
        setCurrentAnimationFrame(newFrameNumber);
        
        if (onFrameChange) {
          onFrameChange(frameIndexRef.current, newFrameNumber);
        }
      }
    }

    // ✅ Actualizar tiempo actual con throttle
    if (startTimeRef.current) {
      const totalElapsed = (timestamp - startTimeRef.current) * playbackSpeed;
      
      if (!startTimeRef.lastTimeUpdate || timestamp - startTimeRef.lastTimeUpdate > 100) {
        startTimeRef.lastTimeUpdate = timestamp;
        setCurrentTime(totalElapsed);
        
        if (onTimeUpdate) {
          onTimeUpdate(totalElapsed);
        }
      }
    }

    // ✅ Continuar animación
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animateFrames);
    }
  }, [
    isPlaying, 
    frameRange, 
    playbackSpeed, 
    frames, 
    onFrameChange, 
    onTimeUpdate, 
    drawFrame, 
    loopEnabled, 
    setIsPlaying
  ]);
  
  // ========== Controles de reproducción ==========
  const startPlayback = useCallback(() => {
    if (frameKeys.current.length === 0) return;
    
    lastTimestampRef.current = null;
    lastFrameDrawn.current = null;
    startTimeRef.current = performance.now();
    
    // ✅ Iniciar animación inmediatamente
    animationRef.current = requestAnimationFrame(animateFrames);
  }, [animateFrames]);

  const stopPlayback = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);
  
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    startTimeRef.current = performance.now() - currentTime / playbackSpeed;
    startPlayback();
  }, [startPlayback, currentTime, playbackSpeed, setIsPlaying]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    stopPlayback();
  }, [stopPlayback, setIsPlaying]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    stopPlayback();
    frameIndexRef.current = frameRange.start;
    
    const resetFrameNumber = frameKeys.current[frameRange.start];
    setCurrentAnimationFrame(resetFrameNumber);
    setCurrentTime(0);
    
    if (frameKeys.current.length > 0) {
      const frameData = frames[resetFrameNumber];
      if (frameData) {
        lastFrameDrawn.current = null; // Forzar re-dibujado
        drawFrame(frameData, resetFrameNumber);
      }
    }
  }, [stopPlayback, frameRange.start, frames, drawFrame, setIsPlaying]);

  const handlePrevFrame = useCallback(() => {
    const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
    const currentIndex = frameNumbers.indexOf(currentAnimationFrame);
    if (currentIndex > 0) {
      const newFrame = frameNumbers[currentIndex - 1];
      setCurrentAnimationFrame(newFrame);
      frameIndexRef.current = currentIndex - 1;
      
      const frameData = frames[newFrame];
      if (frameData) {
        lastFrameDrawn.current = null;
        drawFrame(frameData, newFrame);
      }
    }
  }, [currentAnimationFrame, frames, drawFrame]);

  const handleNextFrame = useCallback(() => {
    const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
    const currentIndex = frameNumbers.indexOf(currentAnimationFrame);
    if (currentIndex < frameNumbers.length - 1) {
      const newFrame = frameNumbers[currentIndex + 1];
      setCurrentAnimationFrame(newFrame);
      frameIndexRef.current = currentIndex + 1;
      
      const frameData = frames[newFrame];
      if (frameData) {
        lastFrameDrawn.current = null;
        drawFrame(frameData, newFrame);
      }
    }
  }, [currentAnimationFrame, frames, drawFrame]);

  const handleFirstFrame = useCallback(() => {
    const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
    if (frameNumbers.length > 0) {
      const newFrame = frameNumbers[0];
      setCurrentAnimationFrame(newFrame);
      frameIndexRef.current = 0;
      
      const frameData = frames[newFrame];
      if (frameData) {
        lastFrameDrawn.current = null;
        drawFrame(frameData, newFrame);
      }
    }
  }, [frames, drawFrame]);

  const handleLastFrame = useCallback(() => {
    const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
    if (frameNumbers.length > 0) {
      const newFrame = frameNumbers[frameNumbers.length - 1];
      setCurrentAnimationFrame(newFrame);
      frameIndexRef.current = frameNumbers.length - 1;
      
      const frameData = frames[newFrame];
      if (frameData) {
        lastFrameDrawn.current = null;
        drawFrame(frameData, newFrame);
      }
    }
  }, [frames, drawFrame]);
  
  // ========== Effects ==========
  
  // ✅ Inicialización y preparación de frames
  useEffect(() => {
    frameKeys.current = Object.keys(frames)
      .map(Number)
      .sort((a, b) => a - b);
    
    // Inicializar currentAnimationFrame con el primer frame disponible
    if (frameKeys.current.length > 0 && currentAnimationFrame === 0) {
      setCurrentAnimationFrame(frameKeys.current[0]);
    }
    
    const currentFrameIndex = frameKeys.current.indexOf(currentAnimationFrame);
    if (currentFrameIndex !== -1) {
      frameIndexRef.current = currentFrameIndex;
    } else {
      frameIndexRef.current = 0;
    }
    
    // Calcular duración total
    const duration = frameKeys.current.reduce((total, frameNumber) => {
      const frameData = frames[frameNumber];
      return total + (frameData?.frameDuration || 100);
    }, 0);
    
    setTotalDuration(duration);
    setFrameRange({ start: 0, end: frameKeys.current.length - 1 });
    setCurrentTime(0);
    
    // Configurar canvas
    setupCanvas();
    
    // Dibujar frame inicial
    if (frameKeys.current.length > 0) {
      const currentFrameNumber = frameKeys.current[frameIndexRef.current] || frameKeys.current[0];
      const currentFrameData = frames[currentFrameNumber];
      if (currentFrameData) {
        lastFrameDrawn.current = null; // Forzar dibujado inicial
        drawFrame(currentFrameData, currentFrameNumber);
      }
    }

    // Cleanup al cambiar frames
    return () => stopPlayback();
  }, [frames, currentAnimationFrame, setupCanvas, drawFrame, stopPlayback]);

  // ✅ Reconfigurar canvas cuando cambien viewport o zoom
  useEffect(() => {
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
  }, [viewportOffset, viewportWidth, viewportHeight, zoom, setupCanvas, frames, drawFrame]);

  // ✅ Manejar estado de reproducción
  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    } else {
      stopPlayback();
    }
    
    return () => stopPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);
  
  // ========== Formatear tiempo ==========
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
  };
  
  // ========== Render ==========
  return (
    <div className="playing-animation">
      {/* Solo controles, sin canvas interno */}
      
      {/* Controles de reproducción */}
      <div className="playback-controls">
        <button 
          onClick={handleFirstFrame}
          title="Primer frame"
          className="control-btn"
        >
          <LuSkipBack />
        </button>
        
        <button 
          onClick={handlePrevFrame}
          title="Frame anterior"
          className="control-btn"
        >
          <LuStepBack />
        </button>
        
        <button 
          onClick={isPlaying ? handlePause : handlePlay}
          title={isPlaying ? 'Pausar' : 'Reproducir'}
          className="control-btn play-btn"
        >
          {isPlaying ? <LuPause /> : <LuPlay />}
        </button>
        
        <button 
          onClick={handleNextFrame}
          title="Siguiente frame"
          className="control-btn"
        >
          <LuStepForward />
        </button>
        
        <button 
          onClick={handleLastFrame}
          title="Último frame"
          className="control-btn"
        >
          <LuSkipForward />
        </button>

        <button
          onClick={() => setLoopEnabled(!loopEnabled)}
          title={loopEnabled ? 'Desactivar bucle' : 'Activar bucle'}
          className={`control-btn loop-btn ${loopEnabled ? 'active' : ''}`}
        >
          <LuRotateCcw />
        </button>
      </div>
      
      {/* Info de reproducción */}
      <div className="playback-info">
        <span>Frame: {currentAnimationFrame}</span>
        <span>Total: {frameCount}</span>
        <span>Tiempo: {formatTime(currentTime)}</span>
        <span>Velocidad: {playbackSpeed}x</span>
      </div>

      {/* Controles adicionales */}
      <div className="playback-settings">
        <div className="frame-rate-control">
          <label>Velocidad:</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="speed-slider"
          />
          <span>{playbackSpeed}x</span>
        </div>
      </div>
    </div>
  );
});

PlayingAnimation.displayName = 'PlayingAnimation';

export default PlayingAnimation;