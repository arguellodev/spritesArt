import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

const W_MIN = 1;
const W_MAX = 20;
const W_DEFAULT = 5;
const I_MIN = 0.1;
const I_MAX = 1.0;
const I_DEFAULT = 0.5;
const R_MIN = 1;
const R_MAX = 5;
const R_DEFAULT = 1;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round1 = (n) => parseFloat(n.toFixed(2));

const BlurFingerTool = ({ setToolParameters }) => {
  const [width, setWidth] = useState(W_DEFAULT);
  const [blurIntensity, setBlurIntensity] = useState(I_DEFAULT);
  const [blurRadius, setBlurRadius] = useState(R_DEFAULT);

  useEffect(() => {
    if (
      typeof width !== "number" ||
      typeof blurIntensity !== "number" ||
      typeof blurRadius !== "number"
    ) {
      return;
    }
    setToolParameters((prev) => ({
      ...prev,
      width,
      blurIntensity,
      blurRadius,
    }));
  }, [width, blurIntensity, blurRadius, setToolParameters]);

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

  // --- Intensity ---
  const onIntensityInput = (e) => {
    const v = e.target.value;
    if (v === "") return setBlurIntensity("");
    const n = parseFloat(v);
    if (!Number.isNaN(n)) setBlurIntensity(clamp(n, I_MIN, I_MAX));
  };
  const onIntensityBlur = (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) {
      setBlurIntensity(I_DEFAULT);
    }
  };
  const stepIntensity = (delta) => {
    const cur =
      typeof blurIntensity === "number" ? blurIntensity : I_DEFAULT;
    setBlurIntensity(clamp(round1(cur + delta), I_MIN, I_MAX));
  };

  // --- Radius ---
  const onRadiusInput = (e) => {
    const v = e.target.value;
    if (v === "") return setBlurRadius("");
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) setBlurRadius(clamp(n, R_MIN, R_MAX));
  };
  const onRadiusBlur = (e) => {
    if (e.target.value === "" || Number.isNaN(parseInt(e.target.value, 10))) {
      setBlurRadius(R_DEFAULT);
    }
  };
  const stepRadius = (delta) => {
    const cur = typeof blurRadius === "number" ? blurRadius : R_DEFAULT;
    setBlurRadius(clamp(cur + delta, R_MIN, R_MAX));
  };

  const wValue = typeof width === "number" ? width : W_DEFAULT;
  const iValue =
    typeof blurIntensity === "number" ? blurIntensity : I_DEFAULT;
  const rValue = typeof blurRadius === "number" ? blurRadius : R_DEFAULT;

  return (
    <div className="polygon-tool-container">
      <div className="tool-configs">
        <div className="config-item">
          <label className="tool-label" htmlFor="blurFingerTool-width">
            Brush Size
          </label>
          <div className="input-container">
            <input
              id="blurFingerTool-width"
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
          <label className="tool-label" htmlFor="blurFingerTool-intensity">
            Blur Intensity
          </label>
          <div className="input-container">
            <input
              id="blurFingerTool-intensity"
              type="number"
              min={I_MIN}
              max={I_MAX}
              step="0.1"
              value={blurIntensity}
              onChange={onIntensityInput}
              onBlur={onIntensityBlur}
              className="number-input"
            />
            <div className="increment-buttons-container">
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepIntensity(0.1)}
                disabled={iValue >= I_MAX}
                aria-label="Aumentar intensidad"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepIntensity(-0.1)}
                disabled={iValue <= I_MIN}
                aria-label="Reducir intensidad"
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>

        <div className="config-item">
          <label className="tool-label" htmlFor="blurFingerTool-radius">
            Blur Radius
          </label>
          <div className="input-container">
            <input
              id="blurFingerTool-radius"
              type="number"
              min={R_MIN}
              max={R_MAX}
              value={blurRadius}
              onChange={onRadiusInput}
              onBlur={onRadiusBlur}
              className="number-input"
            />
            <span className="tool-value">px</span>
            <div className="increment-buttons-container">
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepRadius(1)}
                disabled={rValue >= R_MAX}
                aria-label="Aumentar radio"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepRadius(-1)}
                disabled={rValue <= R_MIN}
                aria-label="Reducir radio"
              >
                <LuChevronDown />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlurFingerTool;
