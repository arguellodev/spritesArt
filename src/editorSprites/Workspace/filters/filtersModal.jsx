// filtersModal.jsx — modal unificado de filtros con tabs (Replace Color, Outline,
// Hue/Saturation). Self-contained: recibe un canvas fuente y un callback onApply
// que se dispara con un canvas resultado a full-resolution.
//
// Uso:
//   <FiltersModal
//     isOpen={showFilters}
//     onClose={() => setShowFilters(false)}
//     sourceCanvas={layerCanvasesRef.current[activeLayerId]}
//     initialTab="outline"
//     initialFrom={toolParameters.foregroundColor}
//     initialTo={toolParameters.backgroundColor}
//     onApply={(resultCanvas, meta) => {
//       // copiar resultCanvas a la capa activa y registrar undo
//     }}
//   />

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { replaceColor } from './replaceColor';
import { outline } from './outline';
import { hueSaturation } from './hueSaturation';
import { hexToRgba, rgbaToHex } from '../palette/presets';
import './filtersModal.css';

const PREVIEW_MAX = 256;
const TABS = [
  { id: 'replaceColor', label: 'Reemplazar color' },
  { id: 'outline',      label: 'Contorno' },
  { id: 'hueSat',       label: 'Tono/Saturación' },
];

const DEFAULTS = {
  replaceColor: {
    tolerance: 0,
    preserveAlpha: true,
  },
  outline: {
    thickness: 1,
    position: 'outer', // 'outer' | 'inner' | 'center'
    diagonal: true,
  },
  hueSat: {
    hue: 0,
    saturation: 0,
    lightness: 0,
    colorize: false,
    colorizeHue: 0,
  },
};

const FiltersModal = ({
  isOpen,
  onClose,
  sourceCanvas,
  initialTab = 'replaceColor',
  initialFrom,
  initialTo,
  onApply,
}) => {
  const [tab, setTab] = useState(initialTab);

  const [fromColor, setFromColor] = useState(() =>
    initialFrom ? { ...initialFrom, a: 255 } : hexToRgba('#000000')
  );
  const [toColor, setToColor] = useState(() =>
    initialTo ? { ...initialTo, a: 255 } : hexToRgba('#ff00aa')
  );
  const [rcParams, setRcParams] = useState(DEFAULTS.replaceColor);

  const [outlineColor, setOutlineColor] = useState(() => hexToRgba('#000000'));
  const [olParams, setOlParams] = useState(DEFAULTS.outline);

  const [hsParams, setHsParams] = useState(DEFAULTS.hueSat);

  const previewRef = useRef(null);

  const previewSize = useMemo(() => {
    if (!sourceCanvas) return { w: 0, h: 0 };
    const { width, height } = sourceCanvas;
    const m = Math.max(width, height);
    const scale = m > PREVIEW_MAX ? PREVIEW_MAX / m : 1;
    return { w: Math.round(width * scale), h: Math.round(height * scale) };
  }, [sourceCanvas]);

  // Aplica el filtro activo a un ImageData y devuelve uno nuevo.
  // Definido dentro del render para que cierre sobre el estado actual; callers
  // (preview effect + handleApply) lo invocan puntualmente.
  const runFilter = (imageData) => {
    switch (tab) {
      case 'replaceColor':
        return replaceColor(imageData, fromColor, toColor, rcParams);
      case 'outline':
        return outline(imageData, { color: outlineColor, ...olParams });
      case 'hueSat':
        return hueSaturation(imageData, hsParams);
      default:
        return imageData;
    }
  };

  useEffect(() => {
    if (!isOpen || !sourceCanvas || !previewRef.current) return;
    const canvas = previewRef.current;
    canvas.width = previewSize.w;
    canvas.height = previewSize.h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Rehacemos el switch aquí (en vez de llamar runFilter) para satisfacer
    // la regla exhaustive-deps sin memoizar una callback nueva por render.
    let result;
    switch (tab) {
      case 'replaceColor':
        result = replaceColor(imageData, fromColor, toColor, rcParams);
        break;
      case 'outline':
        result = outline(imageData, { color: outlineColor, ...olParams });
        break;
      case 'hueSat':
        result = hueSaturation(imageData, hsParams);
        break;
      default:
        result = imageData;
    }
    ctx.putImageData(result, 0, 0);
  }, [
    isOpen, sourceCanvas, previewSize, tab,
    fromColor, toColor, rcParams,
    outlineColor, olParams,
    hsParams,
  ]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!sourceCanvas || !onApply) {
      onClose?.();
      return;
    }
    const ctx = sourceCanvas.getContext('2d');
    const src = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const out = runFilter(src);

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;
    resultCanvas.getContext('2d').putImageData(out, 0, 0);

    onApply(resultCanvas, { filter: tab });
    onClose?.();
  };

  return (
    <div className="filters-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="filters-modal">
        <div className="filters-modal__header">
          <h3>Filtros</h3>
          <button onClick={onClose} className="filters-modal__close">×</button>
        </div>

        <div className="filters-modal__tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`filters-modal__tab${tab === t.id ? ' is-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="filters-modal__body">
          <div className="filters-modal__controls">
            {tab === 'replaceColor' && (
              <>
                <label className="filters-modal__row">
                  <span>Origen</span>
                  <input
                    type="color"
                    value={rgbaToHex(fromColor)}
                    onChange={(e) => setFromColor(hexToRgba(e.target.value))}
                  />
                </label>
                <label className="filters-modal__row">
                  <span>Destino</span>
                  <input
                    type="color"
                    value={rgbaToHex(toColor)}
                    onChange={(e) => setToColor(hexToRgba(e.target.value))}
                  />
                </label>
                <label className="filters-modal__row">
                  <span>Tolerancia: {rcParams.tolerance}</span>
                  <input
                    type="range"
                    min={0}
                    max={128}
                    value={rcParams.tolerance}
                    onChange={(e) => setRcParams((p) => ({ ...p, tolerance: Number(e.target.value) }))}
                  />
                </label>
                <label className="filters-modal__row filters-modal__row--check">
                  <input
                    type="checkbox"
                    checked={rcParams.preserveAlpha}
                    onChange={(e) => setRcParams((p) => ({ ...p, preserveAlpha: e.target.checked }))}
                  />
                  <span>Preservar alpha del píxel</span>
                </label>
              </>
            )}

            {tab === 'outline' && (
              <>
                <label className="filters-modal__row">
                  <span>Color contorno</span>
                  <input
                    type="color"
                    value={rgbaToHex(outlineColor)}
                    onChange={(e) => setOutlineColor(hexToRgba(e.target.value))}
                  />
                </label>
                <label className="filters-modal__row">
                  <span>Grosor: {olParams.thickness}</span>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={olParams.thickness}
                    onChange={(e) => setOlParams((p) => ({ ...p, thickness: Number(e.target.value) }))}
                  />
                </label>
                <div className="filters-modal__row">
                  <span>Posición</span>
                  <div className="filters-modal__btn-group">
                    {['outer', 'center', 'inner'].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setOlParams((p) => ({ ...p, position: pos }))}
                        className={`filters-modal__tiny-btn${olParams.position === pos ? ' is-active' : ''}`}
                      >
                        {pos === 'outer' ? 'Fuera' : pos === 'inner' ? 'Dentro' : 'Centro'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="filters-modal__row filters-modal__row--check">
                  <input
                    type="checkbox"
                    checked={olParams.diagonal}
                    onChange={(e) => setOlParams((p) => ({ ...p, diagonal: e.target.checked }))}
                  />
                  <span>8-vecinos (esquinas redondeadas)</span>
                </label>
              </>
            )}

            {tab === 'hueSat' && (
              <>
                <label className="filters-modal__row filters-modal__row--check">
                  <input
                    type="checkbox"
                    checked={hsParams.colorize}
                    onChange={(e) => setHsParams((p) => ({ ...p, colorize: e.target.checked }))}
                  />
                  <span>Colorizar (forzar un tono)</span>
                </label>
                {hsParams.colorize ? (
                  <label className="filters-modal__row">
                    <span>Tono objetivo: {hsParams.colorizeHue}°</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={hsParams.colorizeHue}
                      onChange={(e) => setHsParams((p) => ({ ...p, colorizeHue: Number(e.target.value) }))}
                    />
                  </label>
                ) : (
                  <label className="filters-modal__row">
                    <span>Tono: {hsParams.hue > 0 ? `+${hsParams.hue}` : hsParams.hue}°</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={hsParams.hue}
                      onChange={(e) => setHsParams((p) => ({ ...p, hue: Number(e.target.value) }))}
                    />
                  </label>
                )}
                <label className="filters-modal__row">
                  <span>Saturación: {hsParams.saturation > 0 ? `+${hsParams.saturation}` : hsParams.saturation}</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={hsParams.saturation}
                    onChange={(e) => setHsParams((p) => ({ ...p, saturation: Number(e.target.value) }))}
                  />
                </label>
                <label className="filters-modal__row">
                  <span>Luminosidad: {hsParams.lightness > 0 ? `+${hsParams.lightness}` : hsParams.lightness}</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={hsParams.lightness}
                    onChange={(e) => setHsParams((p) => ({ ...p, lightness: Number(e.target.value) }))}
                  />
                </label>
              </>
            )}
          </div>

          <div className="filters-modal__preview">
            <div className="filters-modal__preview-label">Preview</div>
            <canvas ref={previewRef} className="filters-modal__preview-canvas" />
            <div className="filters-modal__preview-size">
              {sourceCanvas?.width}×{sourceCanvas?.height}
            </div>
          </div>
        </div>

        <div className="filters-modal__footer">
          <button onClick={onClose} className="filters-modal__btn">Cancelar</button>
          <button onClick={handleApply} className="filters-modal__btn filters-modal__btn--primary">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersModal;
