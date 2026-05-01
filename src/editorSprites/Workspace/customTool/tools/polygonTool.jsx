import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

const W_MIN = 1;
const W_MAX = 20;
const W_DEFAULT = 1;
const V_MIN = 3;
const V_MAX = 100;
const V_DEFAULT = 5;
const R_MIN = 0;
const R_MAX = 360;
const R_DEFAULT = 0;
const R_STEP = 5;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const PolygonTool = ({ setToolParameters, toolConfigs, setToolConfigs }) => {
  const [borderWidth, setBorderWidth] = useState(
    () => toolConfigs?.polygon?.borderWidth ?? W_DEFAULT,
  );
  const [vertices, setVertices] = useState(
    () => toolConfigs?.polygon?.vertices ?? V_DEFAULT,
  );
  const [rotation, setRotation] = useState(
    () => toolConfigs?.polygon?.rotation ?? R_DEFAULT,
  );

  useEffect(() => {
    setToolConfigs((prev) => ({
      ...prev,
      polygon: { borderWidth, vertices, rotation },
    }));
  }, [borderWidth, vertices, rotation, setToolConfigs]);

  useEffect(() => {
    if (
      typeof borderWidth !== "number" ||
      typeof vertices !== "number" ||
      typeof rotation !== "number"
    ) {
      return;
    }
    setToolParameters((prev) => ({
      ...prev,
      borderWidth,
      vertices,
      rotation,
    }));
  }, [borderWidth, vertices, rotation, setToolParameters]);

  // --- Border width ---
  const onWidthInput = (e) => {
    const v = e.target.value;
    if (v === "") return setBorderWidth("");
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) setBorderWidth(clamp(n, W_MIN, W_MAX));
  };
  const onWidthBlur = (e) => {
    if (e.target.value === "" || Number.isNaN(parseInt(e.target.value, 10))) {
      setBorderWidth(W_DEFAULT);
    }
  };
  const stepWidth = (delta) => {
    const cur = typeof borderWidth === "number" ? borderWidth : W_DEFAULT;
    setBorderWidth(clamp(cur + delta, W_MIN, W_MAX));
  };

  // --- Vertices ---
  const onVerticesInput = (e) => {
    const v = e.target.value;
    if (v === "") return setVertices("");
    const n = Number(v);
    if (!Number.isNaN(n)) setVertices(n);
  };
  const onVerticesBlur = (e) => {
    const v = e.target.value;
    if (v === "" || Number.isNaN(Number(v))) return setVertices(V_DEFAULT);
    setVertices(clamp(Number(v), V_MIN, V_MAX));
  };
  const stepVertices = (delta) => {
    const cur = typeof vertices === "number" ? vertices : V_DEFAULT;
    setVertices(clamp(cur + delta, V_MIN, V_MAX));
  };

  // --- Rotation ---
  const onRotationInput = (e) => {
    const v = e.target.value;
    if (v === "") return setRotation("");
    const n = Number(v);
    if (!Number.isNaN(n)) setRotation(n);
  };
  const onRotationBlur = (e) => {
    const v = e.target.value;
    if (v === "" || Number.isNaN(Number(v))) return setRotation(R_DEFAULT);
    setRotation(clamp(Number(v), R_MIN, R_MAX));
  };
  const stepRotation = (delta) => {
    const cur = typeof rotation === "number" ? rotation : R_DEFAULT;
    setRotation(clamp(cur + delta, R_MIN, R_MAX));
  };

  const wValue = typeof borderWidth === "number" ? borderWidth : W_DEFAULT;
  const vValue = typeof vertices === "number" ? vertices : V_DEFAULT;
  const rValue = typeof rotation === "number" ? rotation : R_DEFAULT;

  // Preview SVG: usa el color actual del UI no como reflejo real del trazado
  // (el pipeline usa el foregroundColor del workspace), sino como ayuda
  // visual de la forma resultante.
  const previewPoints = Array.from({ length: vValue }, (_, i) => {
    const angle = (i * 2 * Math.PI) / vValue + (rValue * Math.PI) / 180;
    const x = 40 + 25 * Math.cos(angle);
    const y = 40 + 25 * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="polygon-tool-container">
      <div className="tool-configs">
        <div className="config-item">
          <label className="tool-label" htmlFor="polygonTool-borderWidth">
            Border Width
          </label>
          <div className="input-container">
            <input
              id="polygonTool-borderWidth"
              type="number"
              min={W_MIN}
              max={W_MAX}
              value={borderWidth}
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
                aria-label="Aumentar border width"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepWidth(-1)}
                disabled={wValue <= W_MIN}
                aria-label="Reducir border width"
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        <div className="config-item">
          <label className="tool-label" htmlFor="polygonTool-vertices">
            Vertices
          </label>
          <div className="input-container">
            <input
              id="polygonTool-vertices"
              type="number"
              min={V_MIN}
              max={V_MAX}
              value={vertices}
              onChange={onVerticesInput}
              onBlur={onVerticesBlur}
              className="number-input"
            />
            <div className="increment-buttons-container">
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepVertices(1)}
                disabled={vValue >= V_MAX}
                aria-label="Aumentar vértices"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepVertices(-1)}
                disabled={vValue <= V_MIN}
                aria-label="Reducir vértices"
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        <div className="config-item">
          <label className="tool-label" htmlFor="polygonTool-rotation">
            Rotation
          </label>
          <div className="input-container">
            <input
              id="polygonTool-rotation"
              type="number"
              min={R_MIN}
              max={R_MAX}
              value={rotation}
              onChange={onRotationInput}
              onBlur={onRotationBlur}
              className="number-input"
            />
            <span className="tool-value">°</span>
            <div className="increment-buttons-container">
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepRotation(R_STEP)}
                disabled={rValue >= R_MAX}
                aria-label="Aumentar rotación"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepRotation(-R_STEP)}
                disabled={rValue <= R_MIN}
                aria-label="Reducir rotación"
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="tool-preview" aria-hidden="true">
        <div className="preview-container">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            className="preview-svg"
          >
            <polygon
              points={previewPoints}
              fill="rgba(124, 77, 255, 0.25)"
              stroke="rgba(124, 77, 255, 0.9)"
              strokeWidth={wValue}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PolygonTool;
