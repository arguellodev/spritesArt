import { useState } from "react";
import './customTool2.css';
import PencilTool from "./tools/pencilTool";
import EraserTool from "./tools/eraserTool";
import FillTool from "./tools/fillTool";
import LineTool from "./tools/lineTool";
import SquareTool from "./tools/squareTool";
import TriangleTool from "./tools/triangleTool";
import CircleTool from "./tools/circleTool";
import EllipseTool from "./tools/ellipseTool";
import PolygonTool from "./tools/polygonTool";
import CurveTool from "./tools/curveTool";
import { BsChevronCompactDown, BsChevronCompactUp  } from "react-icons/bs";

const CustomTool2 = ({ setToolParameters, tool, toolParameters }) => {
    const [minimized, setMinimized] = useState(false);

    const toggleMinimize = () => setMinimized(prev => !prev);

    const toolInfo = {
        pencil: { name: "Pincel", icon: "P", component: PencilTool },
        eraser: { name: "Borrador", icon: "B", component: EraserTool },
        fill: { name: "Rellenar", icon: "R", component: FillTool },
        line: { name: "Línea", icon: "L", component: LineTool },
        square: { name: "Cuadrado", icon: "L", component: SquareTool },
        triangle: { name: "Triángulo", icon: "L", component: TriangleTool },
        circle: { name: "Círculo", icon: "L", component: CircleTool },
        ellipse: { name: "Elipse", icon: "L", component: EllipseTool },
        polygon: { name: "Polígono", icon: "L", component: PolygonTool },
        curve: { name: "Linea Curva", icon: "C", component: CurveTool },
    };

    const currentTool = toolInfo[tool];

    if (!currentTool) return null;

    const ToolComponent = currentTool.component;

    return (
        <div className="customTool-section">
            <div className="tool-header" onClick={toggleMinimize} style={{ cursor: "pointer" }}>
            <span className="tool-icon">{currentTool.icon}</span>
                <p className="tool-name">{currentTool.name}</p>
                
                <span className="minimize-toggle">{minimized ? <BsChevronCompactDown/> : <BsChevronCompactUp/>}</span>
            </div>

            <div className={`tool-content ${minimized ? 'hidden' : ''}`}>
                <ToolComponent
                    toolParameters={toolParameters}
                    setToolParameters={setToolParameters}
                />
            </div>
        </div>
    );
};

export default CustomTool2;
