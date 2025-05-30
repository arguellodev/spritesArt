import { useEffect, useState } from "react";




const SquareTool = ({setToolParameters, tool}) => {
    // Estados para las diferentes configuraciones del lápiz
    const [pixelSize, setPixelSize] = useState(1);
    const [opacity, setOpacity] = useState(100);
    const [color, setColor] = useState("#FFFFFF");
    const [pressure, setPressure] = useState(50);
    const [pattern, setPattern] = useState("solid");

    // Patrones disponibles para el lápiz
    const patterns = ["solid", "dotted", "dashed", "pixel dust"];

    // Controlar la visibilidad de las opciones avanzadas
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        setToolParameters({
            borderRadius: 3,           // Radio de las esquinas redondeadas
            borderWidth: 2,           // Ancho del borde en píxeles
            borderColor: {            // Color del borde
              r: 255, g: 0, b: 0, a: 1
            },
            fillColor: {              // Color del relleno
              r: 0, g: 255, b: 0, a: 0.8
            }
          });

       
        console.log('el pixel size es: ', pixelSize)
    }, [pixelSize]);
    

    return (
       
       <>

            
   
         <div className="tool-configs">
                {/* Configuración de color */}
               

                {/* Configuración de tamaño de pixel */}
                <div className="config-item">
                    <label className="tool-label">Pixel Size</label>
                    <div className="slider-container">
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={pixelSize} 
                            onChange={(e) => setPixelSize(Number(e.target.value))} 
                            className="slider" 
                        />
                        <span className="tool-value">{pixelSize}px</span>
                    </div>
                </div>

                {/* Configuración de opacidad */}
                <div className="config-item">
                    <label className="tool-label">Opacity</label>
                    <div className="slider-container">
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={opacity} 
                            onChange={(e) => setOpacity(Number(e.target.value))} 
                            className="slider" 
                        />
                        <span className="tool-value">{opacity}%</span>
                    </div>
                </div>

                {/* Selector de patrón */}
                <div className="config-item">
                    <label className="tool-label">Pattern</label>
                    <select 
                        value={pattern} 
                        onChange={(e) => setPattern(e.target.value)}
                        className="pattern-selector"
                    >
                        {patterns.map((p) => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                {/* Botón para mostrar/ocultar opciones avanzadas */}
                <button 
                    className="advanced-toggle"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                >
                    {showAdvanced ? "Hide Advanced" : "Show Advanced"}
                </button>

                {/* Opciones avanzadas */}
                {showAdvanced && (
                    <div className="advanced-options">
                        {/* Sensibilidad a la presión (para tabletas gráficas) */}
                        <div className="config-item">
                            <label className="tool-label">Pressure Sensitivity</label>
                            <div className="slider-container">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={pressure} 
                                    onChange={(e) => setPressure(Number(e.target.value))} 
                                    className="slider" 
                                />
                                <span className="tool-value">{pressure}%</span>
                            </div>
                        </div>

                        {/* Atajos de teclado */}
                        <div className="config-item">
                            <label className="tool-label">Keyboard Shortcut</label>
                            <div className="shortcut-display">
                                <span className="key">P</span>
                                <button 
                                    className="edit-shortcut"
                                   
                                >
                                    Edit
                                </button>
                            </div>
                        </div>

                        {/* Anti-aliasing toggle */}
                        <div className="config-item">
                            <label className="tool-label">Anti-aliasing</label>
                            <div className="toggle-switch">
                                <input type="checkbox" id="antialiasing" className="toggle-input" />
                                <label htmlFor="antialiasing" className="toggle-label"></label>
                            </div>
                        </div>

                        {/* Pixel perfect toggle */}
                        <div className="config-item">
                            <label className="tool-label">Pixel Perfect</label>
                            <div className="toggle-switch">
                                <input type="checkbox" id="pixelperfect" className="toggle-input" defaultChecked />
                                <label htmlFor="pixelperfect" className="toggle-label"></label>
                            </div>
                        </div>
                    </div>
                )}
        </div>

            {/* Vista previa de la herramienta */}
            <div className="tool-preview">
                <div className="preview-label">Preview</div>
                <div 
                    className="preview-box"
                    style={{
                        backgroundColor: pattern === "solid" ? color : "transparent",
                        backgroundImage: pattern !== "solid" ? `url(#${pattern}-pattern)` : "none",
                        opacity: opacity / 100
                    }}
                ></div>
            </div>

            {/* Historial de colores recientes */}
            <div className="recent-colors">
                <div className="color-dot" style={{ backgroundColor: "#FF0000" }}></div>
                <div className="color-dot" style={{ backgroundColor: "#00FF00" }}></div>
                <div className="color-dot" style={{ backgroundColor: "#0000FF" }}></div>
                <div className="color-dot" style={{ backgroundColor: "#FFFF00" }}></div>
                <div className="color-dot" style={{ backgroundColor: "#FF00FF" }}></div>
            </div>
       
       </>
                );
};

export default SquareTool;

