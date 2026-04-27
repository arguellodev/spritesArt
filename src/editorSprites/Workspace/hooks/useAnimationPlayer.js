// useAnimationPlayer — motor de reproducción compartido por PlayAnimation y
// por el panel LayerAnimation. Consolida la lógica que estaba duplicada y
// divergente en los dos componentes: setup del canvas, drawFrame por capa,
// loop RAF con modos forward/reverse/pingpong, rango de frames, velocidad y
// throttle del tiempo.
//
// `isPlaying` puede ser controlado (pasar `isPlaying` + `setIsPlaying` en las
// opciones) o interno (si se omiten). Esto permite que múltiples instancias
// del hook compartan estado de play a través del padre si se desea.

import { useCallback, useEffect, useRef, useState } from "react";
import { isValidBlendMode, toCompositeOperation, DEFAULT_BLEND_MODE } from '../blendModes';

const DEFAULT_FRAME_DURATION_MS = 100;

// Resuelve el blend mode efectivo de una capa, respetando el override por-frame.
function resolveBlendModeForLayer(layer) {
  const override = layer?.blendModeOverride;
  if (override != null && isValidBlendMode(override)) return override;
  if (layer?.blendMode && isValidBlendMode(layer.blendMode)) return layer.blendMode;
  return DEFAULT_BLEND_MODE;
}
const TIME_UPDATE_THROTTLE_MS = 100;

export function useAnimationPlayer({
  frames,
  externalCanvasRef,
  internalCanvasRef,
  viewportOffset = { x: 0, y: 0 },
  viewportWidth = 64,
  viewportHeight = 64,
  zoom = 1,
  displaySize = 256,
  isPlaying: isPlayingProp,
  setIsPlaying: setIsPlayingProp,
  loopEnabled = true,
  onTimeUpdate,
  onFrameChange,
  // Si se provee un frameNumber, el hook sincroniza frameIndexRef con él
  // cada vez que cambian los frames. Útil para panels que quieren reflejar
  // el `currentFrame` del editor al cargar.
  syncedFrameNumber,
} = {}) {
  const displayCanvasRef = externalCanvasRef || internalCanvasRef;

  // Refs del motor
  const animationRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const frameKeysRef = useRef([]);
  const frameIndexRef = useRef(0);
  const lastFrameDrawnRef = useRef(null);
  const startTimeRef = useRef(null);
  const rangeDurationRef = useRef(0);
  const directionRef = useRef(1);
  const lastTimeUpdateRef = useRef(0);
  // Marca si el loop está actualmente activo. Se usa para detectar la
  // transición false→true y resetear marcas, independientemente de si el
  // flip vino de `play()` local o de `isPlaying` controlado desde el padre.
  const wasPlayingRef = useRef(false);

  // isPlaying: controlado o interno.
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = isPlayingProp !== undefined ? isPlayingProp : internalIsPlaying;
  const setIsPlaying = setIsPlayingProp || setInternalIsPlaying;

  // Estado público
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [frameRange, setFrameRange] = useState({ start: 0, end: 0 });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackMode, setPlaybackMode] = useState('forward');
  // currentFrame se expone como frameNumber (no índice). Más intuitivo y
  // consistente con lo que los callers del panel ya consumen.
  const [currentFrame, setCurrentFrame] = useState(0);

  // Configurar el canvas (tamaño y flags pixel-art).
  const setupCanvas = useCallback(() => {
    if (!displayCanvasRef?.current) return;
    const canvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (externalCanvasRef) {
      canvas.width = Math.round(viewportWidth * zoom);
      canvas.height = Math.round(viewportHeight * zoom);
    } else {
      canvas.width = displaySize;
      canvas.height = displaySize;
      canvas.style.width = `${displaySize}px`;
      canvas.style.height = `${displaySize}px`;
    }

    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
    }

    if (!externalCanvasRef) {
      canvas.style.imageRendering = 'pixelated';
      canvas.style.imageRendering = '-moz-crisp-edges';
      canvas.style.imageRendering = 'crisp-edges';
    }
  }, [displayCanvasRef, displaySize, externalCanvasRef, viewportWidth, viewportHeight, zoom]);

  // Dibujar un frame componiendo sus capas visibles ordenadas por zIndex.
  const drawFrame = useCallback((frameData, frameNumber) => {
    if (!displayCanvasRef?.current || !frameData) return;
    if (lastFrameDrawnRef.current === frameNumber) return;

    const ctx = displayCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const canvasWidth = displayCanvasRef.current.width;
    const canvasHeight = displayCanvasRef.current.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const visibleLayers = (frameData.layers || [])
      .filter((layer) => layer.visible?.[frameNumber] !== false)
      .sort((a, b) => a.zIndex - b.zIndex);

    let isFirstDrawn = true;
    visibleLayers.forEach((layer) => {
      const sourceCanvas = frameData.canvases?.[layer.id];
      if (!sourceCanvas) return;

      ctx.globalAlpha = layer.opacity ?? 1;

      // La primera capa siempre usa source-over para no componer contra vacío.
      const blendId = isFirstDrawn ? 'normal' : resolveBlendModeForLayer(layer);
      ctx.globalCompositeOperation = toCompositeOperation(blendId);

      if (externalCanvasRef) {
        ctx.drawImage(
          sourceCanvas,
          viewportOffset.x,
          viewportOffset.y,
          viewportWidth,
          viewportHeight,
          0,
          0,
          Math.round(viewportWidth * zoom),
          Math.round(viewportHeight * zoom)
        );
      } else {
        ctx.drawImage(
          sourceCanvas,
          0, 0, sourceCanvas.width, sourceCanvas.height,
          0, 0, canvasWidth, canvasHeight
        );
      }

      ctx.globalCompositeOperation = 'source-over';
      isFirstDrawn = false;
    });

    ctx.globalAlpha = 1;
    lastFrameDrawnRef.current = frameNumber;
  }, [displayCanvasRef, externalCanvasRef, viewportOffset, viewportWidth, viewportHeight, zoom]);

  const stopPlayback = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Loop principal. Re-agenda su próximo tick al final mientras isPlaying sea true.
  const animateFrames = useCallback((timestamp) => {
    if (frameKeysRef.current.length === 0) return;

    const availableFrames = frameKeysRef.current.slice(frameRange.start, frameRange.end + 1);
    if (availableFrames.length === 0) return;

    let currentRangeIndex = frameIndexRef.current - frameRange.start;
    if (currentRangeIndex < 0 || currentRangeIndex >= availableFrames.length) {
      currentRangeIndex = 0;
      frameIndexRef.current = frameRange.start;
    }

    const currentFrameNumber = availableFrames[currentRangeIndex];
    const currentFrameData = frames[currentFrameNumber];
    if (!currentFrameData) return;

    const duration = (currentFrameData.frameDuration || DEFAULT_FRAME_DURATION_MS) / playbackSpeed;

    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
      drawFrame(currentFrameData, currentFrameNumber);
    }

    const elapsed = timestamp - lastTimestampRef.current;

    if (elapsed >= duration) {
      const len = availableFrames.length;
      let nextRangeIndex;
      let cycleCompleted = false;

      if (playbackMode === 'reverse') {
        nextRangeIndex = currentRangeIndex - 1;
        if (nextRangeIndex < 0) {
          nextRangeIndex = len - 1;
          cycleCompleted = true;
        }
      } else if (playbackMode === 'pingpong') {
        if (len <= 1) {
          nextRangeIndex = 0;
          cycleCompleted = true;
        } else {
          nextRangeIndex = currentRangeIndex + directionRef.current;
          if (nextRangeIndex >= len) {
            directionRef.current = -1;
            nextRangeIndex = len - 2;
          } else if (nextRangeIndex < 0) {
            directionRef.current = 1;
            nextRangeIndex = 1;
            cycleCompleted = true;
          }
        }
      } else {
        nextRangeIndex = (currentRangeIndex + 1) % len;
        if (nextRangeIndex === 0) cycleCompleted = true;
      }

      // Loop apagado: si completamos un ciclo, detener al final del rango.
      // Para forward/reverse: el último frame mostrado es el cierre natural
      // del rango; nos quedamos ahí. Para pingpong: cycleCompleted se setea
      // tras el viaje de vuelta a `start`, y nos quedamos en `start`.
      if (cycleCompleted && !loopEnabled) {
        setIsPlaying(false);
        return;
      }

      frameIndexRef.current = frameRange.start + nextRangeIndex;
      lastTimestampRef.current = timestamp;

      if (cycleCompleted) {
        setCurrentTime(0);
        startTimeRef.current = timestamp;
      }

      const newFrameNumber = availableFrames[nextRangeIndex];
      const newFrameData = frames[newFrameNumber];
      drawFrame(newFrameData, newFrameNumber);
      setCurrentFrame(newFrameNumber);

      if (onFrameChange) onFrameChange(frameIndexRef.current, newFrameNumber);
    }

    // Actualizar tiempo visible con throttle (~10Hz) para no floodear renders.
    if (startTimeRef.current) {
      const totalElapsed = (timestamp - startTimeRef.current) * playbackSpeed;
      if (timestamp - lastTimeUpdateRef.current > TIME_UPDATE_THROTTLE_MS) {
        lastTimeUpdateRef.current = timestamp;
        const clamped = rangeDurationRef.current > 0
          ? Math.min(totalElapsed, rangeDurationRef.current)
          : totalElapsed;
        setCurrentTime(clamped);
        if (onTimeUpdate) onTimeUpdate(clamped);
      }
    }
    // La re-agenda del próximo tick la hace el useEffect sobre isPlaying; no
    // auto-referenciamos `animateFrames` aquí (evita warnings de TDZ de ESLint
    // y desacopla la vida del loop del cambio de identidad del callback).
  }, [frameRange, playbackSpeed, playbackMode, frames, drawFrame, onFrameChange, onTimeUpdate, loopEnabled, setIsPlaying]);

  // Inicialización y re-sync al cambiar frames (o el frameNumber sincronizado).
  useEffect(() => {
    frameKeysRef.current = Object.keys(frames || {})
      .map(Number)
      .sort((a, b) => a - b);

    // Total duration sobre todos los frames (no solo el rango).
    const duration = frameKeysRef.current.reduce((total, frameNumber) => {
      const frameData = frames?.[frameNumber];
      return total + ((frameData?.frameDuration) || DEFAULT_FRAME_DURATION_MS);
    }, 0);
    setTotalDuration(duration);

    // Rango inicial cubre todos los frames disponibles.
    const lastIndex = Math.max(0, frameKeysRef.current.length - 1);
    setFrameRange({ start: 0, end: lastIndex });

    // Sincronizar índice con el frameNumber externo si está presente y existe.
    if (typeof syncedFrameNumber === 'number') {
      const idx = frameKeysRef.current.indexOf(syncedFrameNumber);
      frameIndexRef.current = idx !== -1 ? idx : 0;
    } else {
      frameIndexRef.current = 0;
    }

    const expectedFrameNumber = frameKeysRef.current[frameIndexRef.current] ?? 0;
    setCurrentFrame(expectedFrameNumber);
    setCurrentTime(0);

    setupCanvas();

    if (frameKeysRef.current.length > 0) {
      const data = frames[expectedFrameNumber];
      if (data) drawFrame(data, expectedFrameNumber);
    }

    return () => stopPlayback();
    // drawFrame / setupCanvas / stopPlayback se omiten intencionalmente:
    // cambian con props de viewport, y no queremos resetear frameRange ni
    // saltar al frame 0 cada vez que el viewport cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, syncedFrameNumber]);

  // Cachear la duración del rango activo. Evita recalcularla en cada RAF tick.
  useEffect(() => {
    rangeDurationRef.current = frameKeysRef.current
      .slice(frameRange.start, frameRange.end + 1)
      .reduce((total, frameNumber) => {
        return total + ((frames?.[frameNumber]?.frameDuration) || DEFAULT_FRAME_DURATION_MS);
      }, 0);
  }, [frames, frameRange]);

  // Re-configurar canvas y redibujar frame actual ante cambios de viewport/zoom.
  useEffect(() => {
    if (!externalCanvasRef) return;
    setupCanvas();
    if (frameKeysRef.current.length > 0) {
      const n = frameKeysRef.current[frameIndexRef.current];
      const data = frames?.[n];
      if (data) {
        lastFrameDrawnRef.current = null;
        drawFrame(data, n);
      }
    }
  }, [viewportOffset, viewportWidth, viewportHeight, zoom, externalCanvasRef, setupCanvas, drawFrame, frames]);

  // Arrancar/parar el loop RAF según isPlaying. El loop vive DENTRO del effect
  // (no se auto-re-agenda `animateFrames`), así cada cambio de deps cancela
  // el tick anterior y re-arranca con el callback nuevo.
  //
  // Sobre la transición false→true: resetear marcas HACE AQUÍ (no en `play()`),
  // para que también funcione cuando el isPlaying lo flipea otra instancia del
  // hook a través del padre (caso panel + reproductor compartiendo estado).
  // `wasPlayingRef` distingue "fresh start" de "re-run por cambio de deps
  // durante playback" (p.ej. nueva identidad de animateFrames al cambiar speed).
  useEffect(() => {
    if (!isPlaying) {
      wasPlayingRef.current = false;
      stopPlayback();
      return;
    }
    if (!wasPlayingRef.current) {
      directionRef.current = playbackMode === 'reverse' ? -1 : 1;
      lastTimestampRef.current = null;
      lastFrameDrawnRef.current = null;
      lastTimeUpdateRef.current = 0;
      startTimeRef.current = performance.now() - currentTime / playbackSpeed;
      wasPlayingRef.current = true;
    }
    let rafId;
    const tick = (ts) => {
      animateFrames(ts);
      rafId = requestAnimationFrame(tick);
      animationRef.current = rafId;
    };
    rafId = requestAnimationFrame(tick);
    animationRef.current = rafId;
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      animationRef.current = null;
    };
    // currentTime/playbackSpeed/playbackMode se leen solo en el reset inicial
    // (guardado por wasPlayingRef), por lo que no queremos re-ejecutar el
    // effect cuando cambian durante el playback. El tick siempre lee el
    // animateFrames más reciente vía su identidad en deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, animateFrames, stopPlayback]);

  // --- Handlers públicos ---

  // `play()` delega en el effect: éste detecta la transición false→true y
  // hace el reset de refs. Mantenerlo como simple setter hace que el comportamiento
  // sea idéntico venga de donde venga el arranque (botón local, ref imperativo
  // externo, o `isPlaying` controlado desde el padre).
  const play = useCallback(() => {
    if (frameKeysRef.current.length === 0) return;
    setIsPlaying(true);
  }, [setIsPlaying]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    stopPlayback();
  }, [setIsPlaying, stopPlayback]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    stopPlayback();
    frameIndexRef.current = frameRange.start;
    setCurrentTime(0);
    if (frameKeysRef.current.length > 0) {
      const frameNumber = frameKeysRef.current[frameRange.start];
      setCurrentFrame(frameNumber ?? 0);
      const data = frames?.[frameNumber];
      if (data) drawFrame(data, frameNumber);
    }
  }, [setIsPlaying, stopPlayback, frameRange.start, frames, drawFrame]);

  const reset = useCallback(() => {
    stop();
    setFrameRange({ start: 0, end: Math.max(0, frameKeysRef.current.length - 1) });
    setPlaybackSpeed(1);
    setPlaybackMode('forward');
  }, [stop]);

  // Saltar a un frameIndex (posición absoluta dentro de frameKeys).
  const setFrame = useCallback((frameIndex) => {
    if (frameIndex < 0 || frameIndex >= frameKeysRef.current.length) return;
    frameIndexRef.current = frameIndex;
    const frameNumber = frameKeysRef.current[frameIndex];
    const data = frames?.[frameNumber];
    if (data) drawFrame(data, frameNumber);
    setCurrentFrame(frameNumber);
  }, [frames, drawFrame]);

  // Cambiar el rango desde un input UI (tipo: 'start' | 'end').
  const handleFrameRangeChange = useCallback((type, value) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    const newRange = { ...frameRange, [type]: parsed };
    if (newRange.start > newRange.end) {
      if (type === 'start') newRange.end = newRange.start;
      else newRange.start = newRange.end;
    }
    setFrameRange(newRange);

    if (frameIndexRef.current < newRange.start || frameIndexRef.current > newRange.end) {
      frameIndexRef.current = newRange.start;
      const frameNumber = frameKeysRef.current[newRange.start];
      setCurrentFrame(frameNumber ?? 0);
      const data = frames?.[frameNumber];
      if (data) drawFrame(data, frameNumber);
    }
  }, [frameRange, frames, drawFrame]);

  // Setter validado para el modo — útil vía ref imperativo.
  const setPlaybackModeSafe = useCallback((mode) => {
    if (mode === 'forward' || mode === 'reverse' || mode === 'pingpong') {
      setPlaybackMode(mode);
      directionRef.current = mode === 'reverse' ? -1 : 1;
    }
  }, []);

  const setPlaybackSpeedSafe = useCallback((speed) => {
    const s = Number(speed);
    if (Number.isFinite(s) && s > 0) setPlaybackSpeed(s);
  }, []);

  const setFrameRangeSafe = useCallback((range) => {
    const start = Array.isArray(range) ? range[0] : range?.start;
    const end = Array.isArray(range) ? range[1] : range?.end;
    const maxIndex = Math.max(0, frameKeysRef.current.length - 1);
    const safeStart = Math.max(0, Math.min(start ?? 0, maxIndex));
    const safeEnd = Math.max(safeStart, Math.min(end ?? maxIndex, maxIndex));
    setFrameRange({ start: safeStart, end: safeEnd });
  }, []);

  return {
    // Estado reactivo
    isPlaying,
    currentTime,
    totalDuration,
    frameRange,
    playbackSpeed,
    playbackMode,
    currentFrame, // frameNumber

    // Refs / canvas
    displayCanvasRef,

    // Derivados por ref (no reactivos)
    getFrameIndex: () => frameIndexRef.current,
    getFrameCount: () => frameKeysRef.current.length,
    getFrameKeys: () => frameKeysRef.current,

    // Setters directos (para UI controlada)
    setFrameRange,
    setPlaybackSpeed,
    setPlaybackMode,

    // Setters validados (para API imperativo)
    setFrameRangeSafe,
    setPlaybackSpeedSafe,
    setPlaybackModeSafe,

    // Handlers
    play,
    pause,
    stop,
    reset,
    setFrame,
    handleFrameRangeChange,

    // Helpers
    drawFrame,
  };
}

// Formateo `MM:SS.cs` — externo al hook para poder reusarlo sin hookear.
export function formatPlayerTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const remainingMs = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
}
