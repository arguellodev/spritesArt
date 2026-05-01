import { useEffect, useState } from "react";

const DITHERING_TYPES = [
  "noise",
  "ordered",
  "checkerboard",
  "vertical",
  "horizontal",
  "diagonal",
  "random",
  "halftone_radial",
  "orderedThreshold",
  "orderedColor",
];

const formatDitheringTypeName = (type) =>
  type
    // separa camelCase y guiones bajos para que el option se lea bien
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const FillTool = ({ setToolParameters, toolParameters = {} }) => {
  const [isGradientMode, setIsGradientMode] = useState(
    toolParameters.isGradientMode ?? false,
  );
  const [isDitheringEnabled, setIsDitheringEnabled] = useState(
    toolParameters.isDitheringEnabled ?? false,
  );
  const [ditheringType, setDitheringType] = useState(
    toolParameters.ditheringType ?? "noise",
  );
  const [ditheringStrength, setDitheringStrength] = useState(
    toolParameters.ditheringStrength ?? 0.5,
  );

  // Sincroniza desde toolParameters cuando cambian externamente (p. ej.
  // al cambiar de capa o restaurar proyecto). Solo actualizamos si el
  // valor entrante es distinto del local para evitar loops.
  useEffect(() => {
    if (
      toolParameters.isGradientMode !== undefined &&
      toolParameters.isGradientMode !== isGradientMode
    ) {
      setIsGradientMode(toolParameters.isGradientMode);
    }
    if (
      toolParameters.isDitheringEnabled !== undefined &&
      toolParameters.isDitheringEnabled !== isDitheringEnabled
    ) {
      setIsDitheringEnabled(toolParameters.isDitheringEnabled);
    }
    if (
      toolParameters.ditheringType !== undefined &&
      toolParameters.ditheringType !== ditheringType
    ) {
      setDitheringType(toolParameters.ditheringType);
    }
    if (
      toolParameters.ditheringStrength !== undefined &&
      toolParameters.ditheringStrength !== ditheringStrength
    ) {
      setDitheringStrength(toolParameters.ditheringStrength);
    }
  }, [toolParameters]);

  // Empuja a `toolParameters` los valores que la herramienta consume en el
  // pointer pipeline. `dithering` (bool) se mantiene por compat con el
  // nombre que ya leía workspaceContainer.
  useEffect(() => {
    setToolParameters((prev) => ({
      ...prev,
      isGradientMode,
      isDitheringEnabled,
      dithering: isDitheringEnabled,
      ditheringType,
      ditheringStrength,
    }));
  }, [
    isGradientMode,
    isDitheringEnabled,
    ditheringType,
    ditheringStrength,
    setToolParameters,
  ]);

  return (
    <div className="polygon-tool-container">
      <div className="tool-configs">
        <div className="config-item">
          <label className="tool-label" htmlFor="fillTool-gradientMode">
            Gradient
          </label>
          <div className="toggle-switch">
            <input
              type="checkbox"
              id="fillTool-gradientMode"
              className="toggle-input"
              checked={isGradientMode}
              onChange={(e) => setIsGradientMode(e.target.checked)}
            />
            <label
              htmlFor="fillTool-gradientMode"
              className="toggle-label"
              aria-label="Activar modo gradiente"
            />
          </div>
        </div>

        {isGradientMode && (
          <>
            <div className="config-item">
              <label className="tool-label" htmlFor="fillTool-ditheringEnabled">
                Dithering
              </label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="fillTool-ditheringEnabled"
                  className="toggle-input"
                  checked={isDitheringEnabled}
                  onChange={(e) => setIsDitheringEnabled(e.target.checked)}
                />
                <label
                  htmlFor="fillTool-ditheringEnabled"
                  className="toggle-label"
                  aria-label="Activar dithering"
                />
              </div>
            </div>

            {isDitheringEnabled && (
              <>
                <div className="config-item">
                  <label
                    className="tool-label"
                    htmlFor="fillTool-ditheringType"
                  >
                    Dithering Type
                  </label>
                  <select
                    id="fillTool-ditheringType"
                    value={ditheringType}
                    onChange={(e) => setDitheringType(e.target.value)}
                    className="dithering-type-selector"
                  >
                    {DITHERING_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {formatDitheringTypeName(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="config-item">
                  <label
                    className="tool-label"
                    htmlFor="fillTool-ditheringStrength"
                  >
                    Dithering Strength
                  </label>
                  <div className="horizontal-slider-container">
                    <div className="slider-track-horizontal">
                      <input
                        id="fillTool-ditheringStrength"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={ditheringStrength}
                        className="horizontal-slider"
                        onChange={(e) =>
                          setDitheringStrength(Number(e.target.value))
                        }
                      />
                    </div>
                    <span className="current-value-horizontal">
                      {ditheringStrength.toFixed(1)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FillTool;
