import { useRef, forwardRef, useImperativeHandle } from "react";
import "./playAnimation.css";
import { CiStop1 } from "react-icons/ci";
import { LuPlay, LuPause, LuRotateCcw } from "react-icons/lu";

import { useAnimationPlayer, formatPlayerTime } from "./useAnimationPlayer";

// Reproductor completo: canvas + overlay con controles. Toda la lógica
// de motor está en `useAnimationPlayer`; este componente es UI + wiring
// del API imperativo expuesto al padre.
const PlayAnimation = forwardRef(function PlayAnimation(
  {
    frames,
    onTimeUpdate,
    onFrameChange,
    externalCanvasRef,
    viewportOffset = { x: 0, y: 0 },
    viewportWidth = 64,
    viewportHeight = 64,
    zoom = 1,
    displaySize = 256,
    isPlaying: isPlayingProp,
    setIsPlaying: setIsPlayingProp,
    loopEnabled,
    // eslint-disable-next-line no-unused-vars
    setLoopEnabled,
    // Info del bucle activo (si target === 'mini' se muestra el chip aqui).
    loopInfo,
    // Salir del bucle: el chip llama onClearLoop('mini').
    onClearLoop,
  },
  ref
) {
  const internalCanvasRef = useRef(null);

  const player = useAnimationPlayer({
    frames,
    externalCanvasRef,
    internalCanvasRef,
    viewportOffset,
    viewportWidth,
    viewportHeight,
    zoom,
    displaySize,
    isPlaying: isPlayingProp,
    setIsPlaying: setIsPlayingProp,
    loopEnabled,
    onTimeUpdate,
    onFrameChange,
  });

  const {
    isPlaying,
    currentTime,
    totalDuration,
    frameRange,
    playbackSpeed,
    playbackMode,
    displayCanvasRef,
    setPlaybackSpeed,
    setPlaybackMode,
    play,
    pause,
    stop,
    reset,
    setFrame,
    handleFrameRangeChange,
    setFrameRangeSafe,
    setPlaybackModeSafe,
    setPlaybackSpeedSafe,
    getFrameIndex,
    getFrameCount,
  } = player;

  // API imperativo para padres que necesitan disparar play/setFrame/etc.
  // desde otros paneles (p.ej. TagsPanel.onPlayTag).
  useImperativeHandle(ref, () => ({
    play,
    pause,
    stop,
    reset,
    setFrame,
    setFrameRange: setFrameRangeSafe,
    setPlaybackMode: setPlaybackModeSafe,
    setPlaybackSpeed: setPlaybackSpeedSafe,
    getCurrentFrame: () => getFrameIndex(),
    isPlaying,
    canvas: displayCanvasRef?.current ?? null,
    frameCount: getFrameCount(),
    totalDuration,
    currentTime,
  }), [
    play, pause, stop, reset, setFrame,
    setFrameRangeSafe, setPlaybackModeSafe, setPlaybackSpeedSafe,
    getFrameIndex, getFrameCount,
    isPlaying, totalDuration, currentTime, displayCanvasRef,
  ]);

  const frameCount = getFrameCount();
  // Índice del frame actual dentro del rango (para contador en UI).
  const currentIndex = getFrameIndex();

  // Si se usa externalCanvasRef, el caller se encarga de montar el canvas
  // y el reproductor solo alimenta los pixels — no rendereamos UI.
  if (externalCanvasRef) return null;

  return (
    <div className="animation-player">
      <div className="player-viewport">
        <div className="top-info-overlay">
          <div className="time-display-overlay">
            <span className="time-current">{formatPlayerTime(currentTime)}</span>
            <span className="time-separator">/</span>
            <span className="time-total">{formatPlayerTime(totalDuration)}</span>
          </div>

          <div className="frame-counter-overlay">
            {currentIndex + 1} / {frameCount}
          </div>
        </div>

        {/* Chip de bucle activo: solo cuando este reproductor (mini) es el
            target. Muestra el nombre del tag si proviene de un tag, sino el
            rango. El boton ✕ pausa el reproductor y restablece frameRange a
            full-range via onClearLoop('mini'). */}
        {loopInfo?.target === 'mini' && (
          <div
            className="player-loop-chip"
            style={loopInfo.tagColor ? { '--loop-chip-accent': loopInfo.tagColor } : undefined}
            title={
              loopInfo.tagName
                ? `Bucle: tag «${loopInfo.tagName}» (frames ${loopInfo.from}–${loopInfo.to})`
                : `Bucle: frames ${loopInfo.from}–${loopInfo.to}`
            }
          >
            <span className="player-loop-chip__icon">↻</span>
            <span className="player-loop-chip__label">
              {loopInfo.tagName ? `«${loopInfo.tagName}»` : 'Bucle'}
            </span>
            <span className="player-loop-chip__value">
              {loopInfo.from}–{loopInfo.to}
            </span>
            <button
              type="button"
              className="player-loop-chip__close"
              onClick={() => onClearLoop?.('mini')}
              aria-label="Salir del bucle"
              title="Salir del bucle"
            >
              ✕
            </button>
          </div>
        )}

        <canvas ref={internalCanvasRef} className="animation-canvas" />

        <div className="player-overlay">
          <div className="playback-controls-overlay">
            <button
              className={`control-btn-overlay play-pause ${isPlaying ? 'playing' : ''}`}
              onClick={isPlaying ? pause : play}
              disabled={frameCount === 0}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <LuPause /> : <LuPlay />}
            </button>

            <button
              className="control-btn-overlay stop"
              onClick={stop}
              disabled={frameCount === 0}
              title="Detener"
            >
              <CiStop1 />
            </button>

            <button
              className="control-btn-overlay reset"
              onClick={reset}
              disabled={frameCount === 0}
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

            <div className="speed-control-overlay">
              <select
                value={playbackMode}
                onChange={(e) => setPlaybackMode(e.target.value)}
                className="speed-select-overlay"
                title="Modo de reproducción"
              >
                <option value="forward">→ Normal</option>
                <option value="reverse">← Reversa</option>
                <option value="pingpong">↔ Ping-pong</option>
              </select>
            </div>
          </div>

          <div className="frame-range-overlay">
            <div className="range-group">
              <label htmlFor="start-frame">Inicio:</label>
              <input
                id="start-frame"
                type="number"
                min={0}
                max={Math.max(0, frameCount - 1)}
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
                max={Math.max(0, frameCount - 1)}
                value={frameRange.end}
                onChange={(e) => handleFrameRangeChange('end', e.target.value)}
                className="frame-input"
              />
            </div>

            <div className="range-info">
              Rango: {frameRange.end - frameRange.start + 1} frames
            </div>
          </div>

          <div className="progress-bar-overlay">
            <div
              className="progress-fill-overlay"
              style={{
                width: totalDuration > 0
                  ? `${Math.min(100, (currentTime * 100) / totalDuration)}%`
                  : '0%'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default PlayAnimation;
