import { useEffect, useState } from "react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

const MIN = 1;
const MAX = 20;
const DEFAULT = 1;

const clamp = (n) => Math.max(MIN, Math.min(MAX, n));

const TriangleTool = ({ setToolParameters, toolConfigs, setToolConfigs }) => {
  const [borderWidth, setBorderWidth] = useState(
    () => toolConfigs?.triangle?.borderWidth ?? DEFAULT,
  );

  useEffect(() => {
    setToolConfigs((prev) => ({ ...prev, triangle: { borderWidth } }));
  }, [borderWidth, setToolConfigs]);

  useEffect(() => {
    if (typeof borderWidth !== "number") return;
    setToolParameters((prev) => ({ ...prev, borderWidth }));
  }, [borderWidth, setToolParameters]);

  const handleInput = (e) => {
    const value = e.target.value;
    if (value === "") return setBorderWidth("");
    const n = parseInt(value, 10);
    if (!Number.isNaN(n)) setBorderWidth(clamp(n));
  };

  const handleBlur = (e) => {
    const value = e.target.value;
    if (value === "" || Number.isNaN(parseInt(value, 10))) {
      setBorderWidth(DEFAULT);
    }
  };

  const step = (delta) => {
    const cur = typeof borderWidth === "number" ? borderWidth : DEFAULT;
    setBorderWidth(clamp(cur + delta));
  };

  const numericValue = typeof borderWidth === "number" ? borderWidth : DEFAULT;

  return (
    <div className="polygon-tool-container">
      <div className="tool-configs">
        <div className="config-item">
          <label className="tool-label" htmlFor="triangleTool-borderWidth">
            Border Width
          </label>
          <div className="input-container">
            <input
              id="triangleTool-borderWidth"
              type="number"
              min={MIN}
              max={MAX}
              value={borderWidth}
              onChange={handleInput}
              onBlur={handleBlur}
              className="number-input"
            />
            <span className="tool-value">px</span>
            <div className="increment-buttons-container">
              <button
                type="button"
                className="increment-btn"
                onClick={() => step(1)}
                disabled={numericValue >= MAX}
                aria-label="Aumentar border width"
              >
                <LuChevronUp />
              </button>
              <button
                type="button"
                className="increment-btn"
                onClick={() => step(-1)}
                disabled={numericValue <= MIN}
                aria-label="Reducir border width"
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

export default TriangleTool;
