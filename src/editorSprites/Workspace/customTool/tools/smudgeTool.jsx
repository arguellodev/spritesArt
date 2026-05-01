import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

const W_MIN = 1;
const W_MAX = 20;
const W_DEFAULT = 5;
const F_MIN = 0.1;
const F_MAX = 1.0;
const STRENGTH_DEFAULT = 0.8;
const FLOW_DEFAULT = 0.5;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round1 = (n) => parseFloat(n.toFixed(2));

const SMUDGE_MODES = [
  { value: "normal", label: "Normal" },
  { value: "lighten", label: "Lighten" },
  { value: "darken", label: "Darken" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
];

const PRESETS = [
  { name: "Soft", title: "Suave y fluido", strength: 0.3, flow: 0.8 },
  { name: "Standard", title: "Configuración estándar", strength: 0.8, flow: 0.5 },
  { name: "Intense", title: "Efecto dramático", strength: 1.0, flow: 0.2 },
];

const SmudgeTool = ({ setToolParameters }) => {
  const [width, setWidth] = useState(W_DEFAULT);
  const [smudgeStrength, setSmudgeStrength] = useState(STRENGTH_DEFAULT);
  const [smudgeFlow, setSmudgeFlow] = useState(FLOW_DEFAULT);
  const [smudgeMode, setSmudgeMode] = useState("normal");

  useEffect(() => {
    if (
      typeof width !== "number" ||
      typeof smudgeStrength !== "number" ||
      typeof smudgeFlow !== "number"
    ) {
      return;
    }
    setToolParameters((prev) => ({
      ...prev,
      width,
      smudgeStrength,
      smudgeFlow,
      smudgeMode,
    }));
  }, [width, smudgeStrength, smudgeFlow, smudgeMode, setToolParameters]);

  // --- Width ---
  const onWidthInput = (e) => {
    const v = e.target.value;
    if (v === "") return setWidth("");
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) setWidth(clamp(n, W_MIN, W_MAX));
  };
  const onWidthBlur = (e) => {
    if (e.target.value === "" || Number.isNaN(parseInt(e.target.value, 10))) {
      setWidth(W_DEFAULT);
    }
  };
  const stepWidth = (delta) => {
    const cur = typeof width === "number" ? width : W_DEFAULT;
    setWidth(clamp(cur + delta, W_MIN, W_MAX));
  };

  // --- Strength ---
  const onStrengthInput = (e) => {
    const v = e.target.value;
    if (v === "") return setSmudgeStrength("");
    const n = parseFloat(v);
    if (!Number.isNaN(n)) setSmudgeStrength(clamp(n, F_MIN, F_MAX));
  };
  const onStrengthBlur = (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) {
      setSmudgeStrength(STRENGTH_DEFAULT);
    }
  };
  const stepStrength = (delta) => {
    const cur =
      typeof smudgeStrength === "number" ? smudgeStrength : STRENGTH_DEFAULT;
    setSmudgeStrength(clamp(round1(cur + delta), F_MIN, F_MAX));
  };

  // --- Flow ---
  const onFlowInput = (e) => {
    const v = e.target.value;
    if (v === "") return setSmudgeFlow("");
    const n = parseFloat(v);
    if (!Number.isNaN(n)) setSmudgeFlow(clamp(n, F_MIN, F_MAX));
  };
  const onFlowBlur = (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) {
      setSmudgeFlow(FLOW_DEFAULT);
    }
  };
  const stepFlow = (delta) => {
    const cur = typeof smudgeFlow === "number" ? smudgeFlow : FLOW_DEFAULT;
    setSmudgeFlow(clamp(round1(cur + delta), F_MIN, F_MAX));
  };

  const wValue = typeof width === "number" ? width : W_DEFAULT;
  const sValue =
    typeof smudgeStrength === "number" ? smudgeStrength : STRENGTH_DEFAULT;
  const fValue = typeof smudgeFlow === "number" ? smudgeFlow : FLOW_DEFAULT;

  return (
    <div className="polygon-tool-container">
      <div className="tool-configs">
        <div className="config-item">
          <label className="tool-label" htmlFor="smudgeTool-width">
            Brush Size
          </label>
          <div className="input-container">
            <input
              id="smudgeTool-width"
              type="number"
              min={W_MIN}
              max={W_MAX}
              value={width}
              onChange={onWidthInput}
              onBlur={onWidthBlur}
              className="number-input"
            />
            <span className="tool-value">px</span>
            <div className="increment-buttons-container">
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepWidth(1)}
                disabled={wValue >= W_MAX}
                aria-label="Aumentar tamaño del pincel"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepWidth(-1)}
                disabled={wValue <= W_MIN}
                aria-label="Reducir tamaño del pincel"
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        <div className="config-item">
          <label className="tool-label" htmlFor="smudgeTool-strength">
            Smudge Strength
          </label>
          <div className="input-container">
            <input
              id="smudgeTool-strength"
              type="number"
              min={F_MIN}
              max={F_MAX}
              step="0.1"
              value={smudgeStrength}
              onChange={onStrengthInput}
              onBlur={onStrengthBlur}
              className="number-input"
            />
            <div className="increment-buttons-container">
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepStrength(0.1)}
                disabled={sValue >= F_MAX}
                aria-label="Aumentar fuerza"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepStrength(-0.1)}
                disabled={sValue <= F_MIN}
                aria-label="Reducir fuerza"
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        <div className="config-item">
          <label className="tool-label" htmlFor="smudgeTool-flow">
            Smudge Flow
          </label>
          <div className="input-container">
            <input
              id="smudgeTool-flow"
              type="number"
              min={F_MIN}
              max={F_MAX}
              step="0.1"
              value={smudgeFlow}
              onChange={onFlowInput}
              onBlur={onFlowBlur}
              className="number-input"
            />
            <div className="increment-buttons-container">
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepFlow(0.1)}
                disabled={fValue >= F_MAX}
                aria-label="Aumentar flow"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepFlow(-0.1)}
                disabled={fValue <= F_MIN}
                aria-label="Reducir flow"
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        <div className="config-item">
          <label className="tool-label" htmlFor="smudgeTool-mode">
            Smudge Mode
          </label>
          <div className="input-container">
            <select
              id="smudgeTool-mode"
              value={smudgeMode}
              onChange={(e) => setSmudgeMode(e.target.value)}
              className="select-input"
            >
              {SMUDGE_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="config-item">
          <span className="tool-label">Quick Presets</span>
          <div className="preset-buttons">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="preset-btn"
                onClick={() => {
                  setSmudgeStrength(p.strength);
                  setSmudgeFlow(p.flow);
                }}
                title={p.title}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmudgeTool;
