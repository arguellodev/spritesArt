
import { GoTools } from "react-icons/go";
import { useState } from "react";
import './editorMain.css'
import { LuBrush, LuMousePointer2, LuEraser, LuHand, LuPaintBucket, LuTriangle, LuMousePointerClick } from "react-icons/lu";
import CanvasTracker from "../Workspace/workspaceMain/workspaceContainer";
import { LuLassoSelect } from "react-icons/lu";
import { LuPipette } from "react-icons/lu";
import { LuType } from "react-icons/lu";
import { LuPenTool } from "react-icons/lu";
import { MdGradient } from "react-icons/md";
import { FaDrawPolygon } from "react-icons/fa";
import { LuSun } from "react-icons/lu";
import { LuMoon } from "react-icons/lu";
import { BiReflectHorizontal } from "react-icons/bi";
import { BiReflectVertical } from "react-icons/bi";
import { LuSquare } from "react-icons/lu";
import { LuCircle } from "react-icons/lu";
import { BiPolygon } from "react-icons/bi";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import { FaBezierCurve } from "react-icons/fa6";
import { LiaFootballBallSolid } from "react-icons/lia";
import InitializeProject from "./initializeProject";



const EditorMain =()=>{

const [loadedData, setLoadedData] = useState(null);

  const [tool,setTool]= useState('pencil');
  // Aqui un estado para manipular la logica de las configuraciones de los objetos
  //Estos parametros se modifican a partir del navbar derecho
  const [toolParameters, setToolParameters] = useState(null)

    //Configuracion de la NavbarTop
    const navItemsHorizontal = [
        
        {
          label: 'Archivo',
          icon: '',
          dropdown: [
            { label: 'Perfil', icon: '👤', onClick: () => console.log('Perfil') },
            { label: 'Preferencias', icon: '🔧', onClick: () => console.log('Preferencias') },
            { label: 'Cerrar sesión', icon: '🚪', onClick: () => console.log('Cerrar sesión') }
          ]
        },
        {
            label: 'Editar',
            icon: '',
            dropdown: [
              { label: 'Perfil', icon: '👤', onClick: () => console.log('Perfil') },
              { label: 'Preferencias', icon: '🔧', onClick: () => console.log('Preferencias') },
              { label: 'Cerrar sesión', icon: '🚪', onClick: () => console.log('Cerrar sesión') }
            ]
          },
          {
            label: 'Exportar',
            icon: '',
            dropdown: [
              { label: 'Perfil', icon: '👤', onClick: () => console.log('Perfil') },
              { label: 'Preferencias', icon: '🔧', onClick: () => console.log('Preferencias') },
              { label: 'Cerrar sesión', icon: '🚪', onClick: () => console.log('Cerrar sesión') }
            ]
          }
      ];
    
      const [navConfigHorizontal, setNavConfig] = useState({
        variant: 'horizontal',
        theme: 'dark',
        showOnlyIcons: false,
        twoColumns: false
      });
    ///////////////////////////////////

    //Configuracion de la NavbarLateral que seran las funciones de pincel, borrar, zoom, etc

    const navItemsLateral = [
        
        {
          dropdown: [
            { label: 'Pincel', icon: <LuBrush />, onClick: () => setTool('pencil') },
            { label: 'Perfil', icon: '👤', onClick: () => console.log('Perfil') },
            { label: 'Preferencias', icon: '🔧', onClick: () => console.log('Preferencias') },
            { label: 'Cerrar sesión', icon: '🚪', onClick: () => console.log('Cerrar sesión') }
          ]
        },
        {
          dropdown: [
            { label: 'Selector', icon: <LuMousePointer2 />, onClick: () => setTool('select') },
            { label: 'Perfil', icon: '👤', onClick: () => console.log('Perfil') },
            { label: 'Preferencias', icon: '🔧', onClick: () => console.log('Preferencias') },
            { label: 'Cerrar sesión', icon: '🚪', onClick: () => console.log('Cerrar sesión') }
          ]
        },
        {
          label: 'Selector por color',
          icon: <LuMousePointerClick />,
          onClick: () => setTool('selectByColor')
        },
        {
          label: 'Borrador',
          icon: <LuEraser />,
          onClick: () => setTool('eraser')
        },
        {
          label: 'Mover',
          icon:   <LuHand />,
          onClick: () => setTool('move')
        },
        {
          dropdown: [
            { label: 'Rellenar', icon:<LuPaintBucket />, onClick: () => setTool('fill') },
            { label: 'Gradiente', icon: <MdGradient />, onClick: () => setTool('gradientFill') },
            
          ]
        },
        {
          label: 'Lazo',
          icon:   <LuLassoSelect />,
          onClick: () => setTool('lassoSelect')
        },
        
        {
          label: 'Text',
          icon:   <LuType />,
          onClick: () => setTool('text')
        },
       
        {
          label: 'Creador de formas',
          icon:   <FaDrawPolygon />,
          onClick: () => setTool('polygonPencil')
        },
        {
          label: 'Luminosidad',
          icon:   <LuSun /> ,
          onClick: () => setTool('light')
        },
        {
          label: 'Oscurecer',
          icon:   <LuMoon /> ,
          onClick: () => setTool('dark')
        },
   
        {
          label: 'Cuadrado',
          icon:   <LuSquare  /> ,
          onClick: () => setTool('square')
        },
        {
          label: 'Circulo',
          icon:   <LuCircle  /> ,
          onClick: () => setTool('circle')
        },
        {
          label: 'Elipse',
          icon:   <LiaFootballBallSolid  /> ,
          onClick: () => setTool('ellipse')
        },

        
        {
          label: 'Cuadrado',
          icon:   <LuTriangle  /> ,
          onClick: () => setTool('triangle')
        },
        {
          label: 'Poligono',
          icon:   <BiPolygon  /> ,
          onClick: () => setTool('polygon')
        },
        {
          label: 'Linea',
          icon:   <TfiLayoutLineSolid /> ,
          onClick: () => setTool('line')
        },
        {
          label: 'Curva',
          icon:   <FaBezierCurve /> ,
          onClick: () => setTool('curve')
        },
      ];
      

      
      const [navConfigLateral, setNavLateralConfig] = useState({
        variant: 'vertical',
        theme: 'dark',
        showOnlyIcons: true,
        twoColumns: false
      });
     ///////////////////////////////////


//Debe haber un estado que marque la funcion activada, pincel, borrar, etc, cubo de pintura
const [projectInitialized, setProjectInitialized] = useState(false);
const [projectConfig, setProjectConfig] = useState(null);

const handleProjectComplete = (config) => {
  setProjectConfig(config);
  setProjectInitialized(true);
  
  // Aquí puedes usar los valores:
  // config.name - nombre del proyecto
  // config.width - ancho del canvas
  // config.height - alto del canvas
};

if (!projectInitialized) {
  return <InitializeProject onComplete={handleProjectComplete} setLoadedData={setLoadedData}/>;
}



    return(
        <>
        <div className="editor-main">
        {!projectInitialized &&
        <InitializeProject onComplete={handleProjectComplete} />
        }
        


      {/*  <Navbar 
          logo={<div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>Editor de Sprites con IA</div>}
          items={navItemsHorizontal}
          variant={navConfigHorizontal.variant}
          theme={navConfigHorizontal.theme}
          showOnlyIcons={navConfigHorizontal.showOnlyIcons}
          twoColumns={navConfigHorizontal.twoColumns}
          onItemClick={(item) => console.log('Clicked item:', item)}
        />*/}

<div className="content-wrapper">
    {/* Navbar lateral */}
    <div style={{display:'flex', flexDirection:'column'}}>

    

     

    </div>
    
    {/* Contenido principal */}
    {/*<Workspace2 
     tool={tool}
       setToolParameters={setToolParameters}
       toolParameters={toolParameters}
     /> */}
     {projectConfig &&
    <div className="render-main">
     <CanvasTracker tool={tool} toolParameters={toolParameters} setToolParameters={setToolParameters} 
     setTool={setTool}
     initialWidth={projectConfig.width}
        initialHeight={projectConfig.height}
        projectName={projectConfig.name}
        loadedData={loadedData}
     />
     
    </div>}

  </div>
 
        </div>
        </>
    )
}

export default EditorMain;

