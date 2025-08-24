import { useState, useEffect } from "react";
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
import DarkTool from "./tools/darkTool";
import LightTool from "./tools/lightTool";
import BlurFingerTool from "./tools/blurFingerTool";
import SmudgeTool from "./tools/smudgeTool";
import SelectTool from "./tools/selectTool";
import { BsChevronCompactDown, BsChevronCompactUp  } from "react-icons/bs";

const CustomTool = ({ 
  setToolParameters, 
  tool, 
  toolParameters, 
  myBrushes,
  // Props específicas para las acciones de selección
  copySelection,
  cutSelection,
  pastePixels,
  duplicateSelection,
  handleRotation,
  fillSelection,
  isolateSelection,
  groupSelection,
  ungroupSelection,
  deleteSelection
}) => {
    const [minimized, setMinimized] = useState(false);
    
    // Estados independientes para cada herramienta
    const [toolConfigs, setToolConfigs] = useState({
        pencil: null,
        eraser: null,
        fill: null,
        line: null,
        square: null,
        triangle: null,
        circle: null,
        ellipse: null,
        polygon: null,
        curve: null,
        dark: null,
        light: null,
        blurFinger: null,
        smudge: null,
        select: null
    });

    useEffect(() => {
        if(tool != 'fill'){
            setToolParameters(prev => ({
                ...prev,
                isGradientMode: false,
            }));
        }
    }, [tool]);

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
        dark: { name: "Oscurecedor", icon: "C", component: DarkTool },
        light: { name: "Iluminador", icon: "C", component: LightTool },
        blurFinger: { name: "Difuminador", icon: "C", component: BlurFingerTool },
        smudge: { name: "Mezclador", icon: "C", component: SmudgeTool },
        select: { name: "Selección", icon: "S", component: SelectTool }
    };

    const currentTool = toolInfo[tool];

    if (!currentTool) return null;

    const ToolComponent = currentTool.component;

    // Función para crear las props específicas de cada herramienta
    const getToolSpecificProps = () => {
        const baseProps = {
            toolParameters,
            setToolParameters,
            toolConfigs,
            setToolConfigs
        };

        // Props específicas para PencilTool
        if (tool === 'pencil') {
            return {
                ...baseProps,
                myBrushes
            };
        }

        // Props específicas para SelectTool
        if (tool === 'select') {
            return {
                ...baseProps,
                copySelection,
                cutSelection,
                pastePixels,
                duplicateSelection,
                handleRotation,
                fillSelection,
                isolateSelection,
                groupSelection,
                ungroupSelection,
                deleteSelection
            };
        }

        // Para el resto de herramientas, solo props base
        return baseProps;
    };

    return (
        <div className="customTool-section">
            {/*<div className="tool-header" onClick={toggleMinimize} style={{ cursor: "pointer" }}>
            <span className="tool-icon">{currentTool.icon}</span>
                <p className="tool-name">{currentTool.name}</p>
                                 
                <span className="minimize-toggle">{minimized ? <BsChevronCompactDown/> : <BsChevronCompactUp/>}</span>
            </div>*/}
            <div className="current-tool">
               {currentTool.icon}
                                
                <p>{currentTool.name}</p>
            </div>
            <div className={`tool-content ${minimized ? 'hidden' : ''}`}>
                <ToolComponent {...getToolSpecificProps()} />
            </div>
        </div>
    );
};

export default CustomTool;