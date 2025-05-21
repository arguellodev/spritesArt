import { useEffect, useState } from "react";

// Function to convert hex color to RGBA object
const hexToRgba = (hex) => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Return RGBA object with full opacity
  return { r, g, b, a: 255 };
};

// Function to convert color string (hex or rgb/rgba) to RGBA object
const colorToRgba = (color) => {
  // If already an RGBA object, return it
  if (color && typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color) {
    return { ...color, a: color.a !== undefined ? color.a : 255 };
  }
  
  // If transparent
  if (color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  // Create canvas to interpret color
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  
  // Interpret the color using canvas
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  
  // Return RGBA object - convert alpha from 0-255 range
  return { r, g, b, a };
};

// Function to convert RGBA object to hex string for color input
const rgbaToHex = ({ r, g, b }) => {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

// Function to convert RGBA object to rgba string for display
const rgbaToString = ({ r, g, b, a }) => {
  // Convert alpha to 0-1 range for display
  const alphaValue = a / 255;
  return `rgba(${r}, ${g}, ${b}, ${alphaValue.toFixed(2)})`;
};

const FillTool = ({ setToolParameters, tool }) => {
    // Use RGBA object for color state
    const [pixelSize, setPixelSize] = useState(1);
    const [opacity, setOpacity] = useState(100);
    const [color, setColor] = useState({ r: 0, g: 0, b: 0, a: 255 }); // Black default
    const [pressure, setPressure] = useState(50);
    const [pattern, setPattern] = useState("solid");

    const patterns = ["solid", "dotted", "dashed", "pixel dust"];
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Handle color change from hex input
    const handleColorChange = (hexColor) => {
        const newColor = hexToRgba(hexColor);
        // Preserve current alpha when changing color
        newColor.a = color.a;
        setColor(newColor);
    };

    // Handle alpha/opacity change
    const handleOpacityChange = (value) => {
        setOpacity(value);
        // Update color alpha based on opacity
        setColor(prev => ({ ...prev, a: Math.round(value * 2.55) }));
    };

    // Update tool parameters
    useEffect(() => {
        setToolParameters({
            width: 1,
            color: color // Send color as RGBA object
        });
    }, [pixelSize, color, setToolParameters]);

    return (
        <>
            <div className="tool-configs">
                {/* Color configuration */}
                <div className="config-item">
                    <label className="tool-label">Color</label>
                    <div className="color-selector">
                        <input 
                            type="color" 
                            value={rgbaToHex(color)} 
                            onChange={(e) => handleColorChange(e.target.value)} 
                            className="color-picker" 
                        />
                        <span className="color-value">{rgbaToString(color)}</span>
                    </div>
                </div>

                {/* Opacity configuration */}
                <div className="config-item">
                    <label className="tool-label">Opacity</label>
                    <div className="slider-container">
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={opacity} 
                            onChange={(e) => handleOpacityChange(Number(e.target.value))} 
                            className="slider" 
                        />
                        <span className="tool-value">{opacity}%</span>
                    </div>
                </div>

                {/* Toggle for advanced options */}
                <div className="config-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                    <span>{showAdvanced ? "Hide" : "Show"} Advanced Options</span>
                    <span className="toggle-icon">{showAdvanced ? "▲" : "▼"}</span>
                </div>

                {/* Advanced options */}
                {showAdvanced && (
                    <>
                        <div className="config-item">
                            <label className="tool-label">Pressure</label>
                            <div className="slider-container">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="100" 
                                    value={pressure} 
                                    onChange={(e) => setPressure(Number(e.target.value))} 
                                    className="slider" 
                                />
                                <span className="tool-value">{pressure}%</span>
                            </div>
                        </div>

                        <div className="config-item">
                            <label className="tool-label">Pattern</label>
                            <div className="pattern-selector">
                                {patterns.map((p) => (
                                    <button 
                                        key={p}
                                        className={`pattern-btn ${pattern === p ? 'active' : ''}`}
                                        onClick={() => setPattern(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Preview using RGBA color */}
            <div className="tool-preview">
                <div className="preview-label">Preview</div>
                <div 
                    className="preview-box"
                    style={{
                        backgroundColor: rgbaToString(color)
                    }}
                ></div>
            </div>
        </>
    );
};

export default FillTool;