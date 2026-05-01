import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

const W_MIN = 1;
const W_MAX = 20;
const W_DEFAULT = 1;
const R_MIN = 0;
const R_MAX = 12;
const R_DEFAULT = 0;

const clampW = (n) => Math.max(W_MIN, Math.min(W_MAX, n));
const clampR = (n) => Math.max(R_MIN, Math.min(R_MAX, n));

const SquareTool = ({ setToolParameters, toolConfigs, setToolConfigs }) => {
  const [borderWidth, setBorderWidth] = useState(
    () => toolConfigs?.square?.borderWidth ?? W_DEFAULT,
  );
  const [borderRadius, setBorderRadius] = useState(
    () => toolConfigs?.square?.borderRadius ?? R_DEFAULT,
  );

  useEffect(() => {
    setToolConfigs((prev) => ({
      ...prev,
      square: { borderWidth, borderRadius },
    }));
  }, [borderWidth, borderRadius, setToolConfigs]);

  useEffect(() => {
    if (
      typeof borderWidth !== "number" ||
      typeof borderRadius !== "number"
    ) {
      return;
    }
    setToolParameters((prev) => ({ ...prev, borderWidth, borderRadius }));
  }, [borderWidth, borderRadius, setToolParameters]);

  const onWidthInput = (e) => {
    const v = e.target.value;
    if (v === "") return setBorderWidth("");
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) setBorderWidth(clampW(n));
  };
  const onWidthBlur = (e) => {
    if (e.target.value === "" || Number.isNaN(parseInt(e.target.value, 10))) {
      setBorderWidth(W_DEFAULT);
    }
  };
  const stepWidth = (delta) => {
    const cur = typeof borderWidth === "number" ? borderWidth : W_DEFAULT;
    setBorderWidth(clampW(cur + delta));
  };

  const onRadiusInput = (e) => {
    const v = e.target.value;
    if (v === "") return setBorderRadius("");
    const n = Number(v);
    if (!Number.isNaN(n)) setBorderRadius(clampR(n));
  };
  const onRadiusBlur = (e) => {
    if (e.target.value === "" || Number.isNaN(Number(e.target.value))) {
      setBorderRadius(R_DEFAULT);
    }
  };
  const stepRadius = (delta) => {
    const cur = typeof borderRadius === "number" ? borderRadius : R_DEFAULT;
    setBorderRadius(clampR(cur + delta));
  };

  const wValue = typeof borderWidth === "number" ? borderWidth : W_DEFAULT;
  const rValue = typeof borderRadius === "number" ? borderRadius : R_DEFAULT;

  return (
    <div className="polygon-tool-container">
      <div className="tool-configs">
        <div className="config-item">
          <label className="tool-label" htmlFor="squareTool-borderWidth">
            Border Width
          </label>
          <div className="input-container">
            <input
              id="squareTool-borderWidth"
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
          <label className="tool-label" htmlFor="squareTool-borderRadius">
            Border Radius
          </label>
          <div className="input-container">
            <input
              id="squareTool-borderRadius"
              type="number"
              min={R_MIN}
              max={R_MAX}
              value={borderRadius}
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
                aria-label="Aumentar border radius"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => stepRadius(-1)}
                disabled={rValue <= R_MIN}
                aria-label="Reducir border radius"
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

export default SquareTool;
