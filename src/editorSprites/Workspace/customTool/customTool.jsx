import { useState } from "react";
import './customTool.css';
import PencilTool from "./tools/pencilTool";
import EraserTool from "./tools/eraserTool";
import FillTool from "./tools/fillTool";
import LineTool from "./tools/lineTool";


const CustomTool = ({setToolParameters, tool, toolParameters}) => {
    

    return (
        /*Aqui se hara un renderizado condicional dependiendo de la herramienta actual */
        <div className="customTool-section">
           
    {
        tool ==='pencil' ?<>
        <div className="tool-header">
                <p className="tool-name">Pincel</p>
                <span className="tool-icon">P</span>
            </div>
            <PencilTool toolParameters={toolParameters} setToolParameters={setToolParameters}/>
        </> :
        tool==='eraser' ? <>
        <div className="tool-header">
                <p className="tool-name">Borrador</p>
                <span className="tool-icon">B</span>
            </div>
        <EraserTool toolParameters={toolParameters} setToolParameters={setToolParameters}/>
        </>

        : tool==='fill' ? <>
        <div className="tool-header">
                <p className="tool-name">Rellenar</p>
                <span className="tool-icon">R</span>
            </div>
        <FillTool toolParameters={toolParameters} setToolParameters={setToolParameters}/>
        </> : tool==='line' ? <>
        <div className="tool-header">
                <p className="tool-name">Linea</p>
                <span className="tool-icon">L</span>
            </div>
        <LineTool toolParameters={toolParameters} setToolParameters={setToolParameters}/>
        </> : null


       
    }
        {/*AQui se importaran mas UIX de modificadores de herramientas */}
        </div>
    );
};

export default CustomTool;

