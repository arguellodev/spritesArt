// replaceColorModal.jsx — modal de aplicación del filtro Replace Color.
// Uso esperado desde workspaceContainer.jsx (o cualquier contenedor con acceso a la capa activa):
//
//   <ReplaceColorModal
//     isOpen={showReplaceColor}
//     onClose={() => setShowReplaceColor(false)}
//     sourceCanvas={layerCanvasesRef.current[activeLayerId]}
//     initialFrom={toolParameters.foregroundColor}
//     initialTo={toolParameters.backgroundColor}
//     onApply={(resultCanvas) => { /* copiar al canvas real y registrar en el history */ }}
//   />
//
// El modal construye un preview en vivo usando replaceColorOnCanvas.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { replaceColor } from './replaceColor';
import { hexToRgba, rgbaToHex } from '../palette/presets';
import './replaceColorModal.css';

const PREVIEW_MAX = 256;

function rgbaFromProp(rgba, fallbackHex) {
  if (!rgba) return hexToRgba(fallbackHex);
  const { r = 0, g = 0, b = 0 } = rgba;
  return { r, g, b, a: 255 };
}

const ReplaceColorModal = ({
  isOpen,
  onClose,
  sourceCanvas,
  initialFrom,
  initialTo,
  onApply,
}) => {
  const [fromColor, setFromColor] = useState(() => rgbaFromProp(initialFrom, '#000000'));
  const [toColor, setToColor] = useState(() => rgbaFromProp(initialTo, '#ff00aa'));
  const [tolerance, setTolerance] = useState(0);
  const [preserveAlpha, setPreserveAlpha] = useState(true);

  const previewCanvasRef = useRef(null);

  // Render preview: reducir a PREVIEW_MAX de mayor lado para performance.
  const previewSize = useMemo(() => {
    if (!sourceCanvas) return { w: 0, h: 0, scale: 1 };
    const { width, height } = sourceCanvas;
    const m = Math.max(width, height);
    const scale = m > PREVIEW_MAX ? PREVIEW_MAX / m : 1;
    return { w: Math.round(width * scale), h: Math.round(height * scale), scale };
  }, [sourceCanvas]);

  useEffect(() => {
    if (!isOpen || !sourceCanvas || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    canvas.width = previewSize.w;
    canvas.height = previewSize.h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Dibujar fuente a tamaño de preview
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

    // Aplicar filtro sobre el ImageData del preview
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = replaceColor(imageData, fromColor, toColor, {
      tolerance,
      preserveAlpha,
    });
    ctx.putImageData(result, 0, 0);
  }, [isOpen, sourceCanvas, previewSize, fromColor, toColor, tolerance, preserveAlpha]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!sourceCanvas || !onApply) {
      onClose?.();
      return;
    }
    // Aplicar al tamaño real, no al preview.
    const ctx = sourceCanvas.getContext('2d');
    const src = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const out = replaceColor(src, fromColor, toColor, { tolerance, preserveAlpha });

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;
    resultCanvas.getContext('2d').putImageData(out, 0, 0);

    onApply(resultCanvas);
    onClose?.();
  };

  return (
    <div className="replace-color-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="replace-color-modal">
        <div className="replace-color-modal__header">
          <h3>Reemplazar color</h3>
          <button onClick={onClose} className="replace-color-modal__close">×</button>
        </div>

        <div className="replace-color-modal__body">
          <div className="replace-color-modal__controls">
            <label className="replace-color-modal__row">
              <span>Color origen</span>
              <input
                type="color"
                value={rgbaToHex(fromColor)}
                onChange={(e) => setFromColor(hexToRgba(e.target.value))}
              />
              <span className="replace-color-modal__hex">{rgbaToHex(fromColor)}</span>
            </label>

            <label className="replace-color-modal__row">
              <span>Color destino</span>
              <input
                type="color"
                value={rgbaToHex(toColor)}
                onChange={(e) => setToColor(hexToRgba(e.target.value))}
              />
              <span className="replace-color-modal__hex">{rgbaToHex(toColor)}</span>
            </label>

            <label className="replace-color-modal__row">
              <span>Tolerancia: {tolerance}</span>
              <input
                type="range"
                min={0}
                max={128}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
              />
            </label>

            <label className="replace-color-modal__row replace-color-modal__row--check">
              <input
                type="checkbox"
                checked={preserveAlpha}
                onChange={(e) => setPreserveAlpha(e.target.checked)}
              />
              <span>Preservar alpha del píxel (anti-alias original)</span>
            </label>
          </div>

          <div className="replace-color-modal__preview">
            <div className="replace-color-modal__preview-label">Preview</div>
            <canvas ref={previewCanvasRef} className="replace-color-modal__preview-canvas" />
            <div className="replace-color-modal__preview-size">
              {sourceCanvas?.width}×{sourceCanvas?.height}
            </div>
          </div>
        </div>

        <div className="replace-color-modal__footer">
          <button onClick={onClose} className="replace-color-modal__btn">Cancelar</button>
          <button onClick={handleApply} className="replace-color-modal__btn replace-color-modal__btn--primary">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplaceColorModal;
