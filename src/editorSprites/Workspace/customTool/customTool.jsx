import { useEffect, useState, Activity } from "react";
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

const TOOL_INFO = {
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

const CustomTool = ({
  setToolParameters,
  tool,
  toolParameters,
  myBrushes,
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
    const [minimized] = useState(false);

    // `toolConfigs` sigue existiendo como caché global entre herramientas (lo
    // leen/escriben los paneles al montar). Con <Activity> cada panel ya
    // conserva su propio useState entre cambios de herramienta sin remontar,
    // así que este diccionario es redundante para persistencia — lo dejamos
    // para no romper ningún consumer que aún lo observe.
    const [toolConfigs, setToolConfigs] = useState({
        pencil: null, eraser: null, fill: null, line: null, square: null,
        triangle: null, circle: null, ellipse: null, polygon: null, curve: null,
        dark: null, light: null, blurFinger: null, smudge: null, select: null
    });

    useEffect(() => {
        if (tool !== 'fill') {
            setToolParameters(prev => ({ ...prev, isGradientMode: false }));
        }
    }, [tool, setToolParameters]);

    const currentTool = TOOL_INFO[tool];

    const baseProps = { toolParameters, setToolParameters, toolConfigs, setToolConfigs };
    const pencilProps = { ...baseProps, myBrushes };
    const selectProps = {
        ...baseProps,
        copySelection, cutSelection, pastePixels, duplicateSelection,
        handleRotation, fillSelection, isolateSelection, groupSelection,
        ungroupSelection, deleteSelection
    };

    const propsForTool = (key) => {
        if (key === 'pencil') return pencilProps;
        if (key === 'select') return selectProps;
        return baseProps;
    };

    return (
        <div className="customTool-section">
            {currentTool && (
                <div className="current-tool">
                    {currentTool.icon}
                    <p>{currentTool.name}</p>
                </div>
            )}
            <div className={`tool-content ${minimized ? 'hidden' : ''}`}>
                {Object.entries(TOOL_INFO).map(([key, info]) => {
                    const Component = info.component;
                    return (
                        <Activity key={key} mode={tool === key ? 'visible' : 'hidden'}>
                            <Component {...propsForTool(key)} />
                        </Activity>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomTool;
