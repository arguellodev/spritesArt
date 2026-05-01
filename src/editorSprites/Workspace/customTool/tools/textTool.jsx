// textTool.jsx — modal de inserción de texto como píxeles sobre la capa activa.
// Uso esperado desde workspaceContainer.jsx (u otro contenedor con acceso a la capa activa):
//
//   <TextTool
//     isOpen={showTextTool}
//     onClose={() => setShowTextTool(false)}
//     color={toolParameters.foregroundColor}
//     canvasWidth={canvasWidth}
//     canvasHeight={canvasHeight}
//     onInsert={(textCanvas, x, y) => {
//       // Dibujar textCanvas sobre la capa activa en (x, y) y registrar undo.
//     }}
//   />
//
// La posición (x, y) la elige el usuario en el modal (numérica) o por
// "centrar horizontal/vertical". Se mantiene una sola fuente (5×7) con escala.

import { useEffect, useMemo, useRef, useState } from 'react';
import { renderTextToCanvas, rasterizeText } from '../../fonts/textRasterizer';
import { rgbaToHex, hexToRgba } from '../../palette/presets';
import './textTool.css';

const TextTool = ({
  isOpen,
  onClose,
  color,
  canvasWidth = 64,
  canvasHeight = 64,
  onInsert,
}) => {
  const [text, setText] = useState('HELLO');
  const [scale, setScale] = useState(1);
  const [letterSpacing, setLetterSpacing] = useState(1);
  const [lineSpacing, setLineSpacing] = useState(1);
  const [posX, setPosX] = useState(2);
  const [posY, setPosY] = useState(2);
  // El color inicial se toma del prop `color` solo al montarse el modal.
  // Para que el modal refleje un cambio posterior del color foreground,
  // el consumidor debe remontarlo (key={color-key}) o el usuario puede cambiarlo adentro.
  const [localColor, setLocalColor] = useState(() =>
    color ? { r: color.r, g: color.g, b: color.b, a: 255 } : { r: 0, g: 0, b: 0, a: 255 }
  );
  const previewRef = useRef(null);

  const metrics = useMemo(
    () => rasterizeText(text, { scale, letterSpacing, lineSpacing }),
    [text, scale, letterSpacing, lineSpacing]
  );

  // Dibujar preview: cuadrícula del canvas destino con el texto en su posición.
  useEffect(() => {
    if (!isOpen || !previewRef.current) return;
    const canvas = previewRef.current;
    const maxPreviewSide = 320;
    const s = Math.max(1, Math.floor(maxPreviewSide / Math.max(canvasWidth, canvasHeight)));
    canvas.width = canvasWidth * s;
    canvas.height = canvasHeight * s;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Fondo a cuadros (transparencia).
    const sq = 4;
    for (let y = 0; y < canvas.height; y += sq) {
      for (let x = 0; x < canvas.width; x += sq) {
        ctx.fillStyle = ((x / sq + y / sq) & 1) ? '#1e1e24' : '#2a2a33';
        ctx.fillRect(x, y, sq, sq);
      }
    }

    // Texto rasterizado
    const textCanvas = renderTextToCanvas(text, localColor, {
      scale,
      letterSpacing,
      lineSpacing,
    });
    ctx.drawImage(
      textCanvas,
      posX * s,
      posY * s,
      textCanvas.width * s,
      textCanvas.height * s
    );

    // Borde del canvas target.
    ctx.strokeStyle = '#4a4a55';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }, [isOpen, text, scale, letterSpacing, lineSpacing, posX, posY, localColor, canvasWidth, canvasHeight]);

  if (!isOpen) return null;

  const handleCenterX = () => setPosX(Math.max(0, Math.floor((canvasWidth - metrics.width) / 2)));
  const handleCenterY = () => setPosY(Math.max(0, Math.floor((canvasHeight - metrics.height) / 2)));

  const handleInsert = () => {
    const textCanvas = renderTextToCanvas(text, localColor, { scale, letterSpacing, lineSpacing });
    onInsert?.(textCanvas, posX, posY);
    onClose?.();
  };

  return (
    <div className="text-tool-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="text-tool-modal">
        <div className="text-tool-modal__header">
          <h3>Insertar texto</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-tool-modal__close"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="text-tool-modal__body">
          <div className="text-tool-modal__controls">
            <label className="text-tool-modal__row">
              <span>Texto</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Escribí aquí... (usa Enter para saltos de línea)"
              />
            </label>

            <label className="text-tool-modal__row">
              <span>Color</span>
              <input
                type="color"
                value={rgbaToHex(localColor)}
                onChange={(e) => setLocalColor(hexToRgba(e.target.value))}
              />
            </label>

            <label className="text-tool-modal__row">
              <span>Escala: {scale}×</span>
              <input
                type="range"
                min={1}
                max={6}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
            </label>

            <label className="text-tool-modal__row">
              <span>Espaciado: {letterSpacing}</span>
              <input
                type="range"
                min={0}
                max={4}
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
              />
            </label>

            <label className="text-tool-modal__row">
              <span>Interlínea: {lineSpacing}</span>
              <input
                type="range"
                min={0}
                max={4}
                value={lineSpacing}
                onChange={(e) => setLineSpacing(Number(e.target.value))}
              />
            </label>

            <div className="text-tool-modal__row text-tool-modal__row--pair">
              <span>Posición</span>
              <div className="text-tool-modal__pos">
                <label>
                  X
                  <input
                    type="number"
                    value={posX}
                    min={0}
                    max={canvasWidth}
                    onChange={(e) => setPosX(Number(e.target.value))}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={posY}
                    min={0}
                    max={canvasHeight}
                    onChange={(e) => setPosY(Number(e.target.value))}
                  />
                </label>
                <button type="button" onClick={handleCenterX} className="text-tool-modal__btn">Centrar X</button>
                <button type="button" onClick={handleCenterY} className="text-tool-modal__btn">Centrar Y</button>
              </div>
            </div>

            <div className="text-tool-modal__info">
              Tamaño texto: {metrics.width}×{metrics.height} px · Canvas: {canvasWidth}×{canvasHeight} px
              {metrics.width > canvasWidth || metrics.height > canvasHeight ? (
                <span className="text-tool-modal__warn" role="alert"> · Atención: se saldrá del canvas</span>
              ) : null}
            </div>
          </div>

          <div className="text-tool-modal__preview">
            <div className="text-tool-modal__preview-label">Preview</div>
            <canvas ref={previewRef} />
          </div>
        </div>

        <div className="text-tool-modal__footer">
          <button type="button" onClick={onClose} className="text-tool-modal__btn">Cancelar</button>
          <button
            type="button"
            onClick={handleInsert}
            className="text-tool-modal__btn text-tool-modal__btn--primary"
            disabled={!text || metrics.pixels.length === 0}
          >
            Insertar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextTool;
