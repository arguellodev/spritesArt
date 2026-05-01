// stabilizerSlider.jsx — slider UI 0..100 para el estabilizador de trazo.
// El motor de suavizado ya existe en rasterizers/strokeSmoothing.js.
// Este componente expone un slider reutilizable que se puede mostrar en el
// panel de cualquier tool de pincel (pencil, line, curve, smudge, etc.)
//
// Uso:
//   <StabilizerSlider
//     value={stabilizerLevel}
//     onChange={setStabilizerLevel}
//   />
//
// Semantica del valor:
//   0      = sin suavizado (trazo fiel al input)
//   50     = suavizado medio (filtra jitter de la mano)
//   100    = suavizado máximo (líneas casi rectas)

import React from 'react';
import './stabilizerSlider.css';

const StabilizerSlider = ({
  value = 0,
  onChange,
  label = 'Estabilizador',
  min = 0,
  max = 100,
  compact = false,
}) => {
  return (
    <div className={`stabilizer-slider${compact ? ' is-compact' : ''}`}>
      <label className="stabilizer-slider__label">
        <span>{label}</span>
        <span className="stabilizer-slider__value">{value}%</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="stabilizer-slider__range"
      />
      {value > 0 && (
        <div className="stabilizer-slider__indicator" style={{ width: `${value}%` }} />
      )}
    </div>
  );
};

export default StabilizerSlider;
