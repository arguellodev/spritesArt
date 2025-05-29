import Navbar from "../Navbar/Navbar";
import NavbarLateral from "../navbarLateral/Navbar";
import { GoTools } from "react-icons/go";
import { useState } from "react";
import './editorMain.css'
import { LuBrush, LuMousePointer2, LuEraser, LuHand, LuPaintBucket, LuTriangle } from "react-icons/lu";
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


const EditorMain =()=>{



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
          label: 'Gotero',
          icon:   <LuPipette />,
          onClick: () => setTool('gotero')
        },
        {
          label: 'Text',
          icon:   <LuType />,
          onClick: () => setTool('text')
        },
        {
          label: 'Pluma',
          icon:   <LuPenTool />,
          onClick: () => setTool('pen')
        },
        {
          label: 'Poligono',
          icon:   <FaDrawPolygon />,
          onClick: () => setTool('polygon')
        },
        {
          label: 'Luminosidad',
          icon:   <LuSun /> ,
          onClick: () => setTool('light')
        },
        {
          label: 'Oscurecer',
          icon:   <LuMoon /> ,
          onClick: () => setTool('darken')
        },
        {
          label: 'Reflejo horizontal',
          icon:   <BiReflectHorizontal /> ,
          onClick: () => setTool('darken')
        },
        {
          label: 'Reflejo Vertical',
          icon:   <BiReflectVertical /> ,
          onClick: () => setTool('darken')
        },
        {
          label: 'Cuadrado',
          icon:   <LuSquare  /> ,
          onClick: () => setTool('square')
        },
        {
          label: 'Cuadrado',
          icon:   <LuCircle  /> ,
          onClick: () => setTool('circle')
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
        twoColumns: true
      });
     ///////////////////////////////////


//Debe haber un estado que marque la funcion activada, pincel, borrar, etc, cubo de pintura




    return(
        <>
        <div className="editor-main">
        <Navbar 
          logo={<div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>Editor de Sprites con IA</div>}
          items={navItemsHorizontal}
          variant={navConfigHorizontal.variant}
          theme={navConfigHorizontal.theme}
          showOnlyIcons={navConfigHorizontal.showOnlyIcons}
          twoColumns={navConfigHorizontal.twoColumns}
          onItemClick={(item) => console.log('Clicked item:', item)}
        />

<div className="content-wrapper">
    {/* Navbar lateral */}
    <div style={{display:'flex', flexDirection:'column'}}>

    <NavbarLateral
      logo={<div style={{ fontWeight: '400', fontSize: '1rem', marginTop:'50px', display:'flex', gap: '10px',
        alignContent:'center', justifyContent:'center'
       }}>
        <p style={{fontWeight:'600'}}>Herramientas</p>
        <GoTools style={{fontSize:'1.2rem'}}/>
      </div>}
      items={navItemsLateral}
      variant={navConfigLateral.variant}
      theme={navConfigLateral.theme}
      showOnlyIcons={navConfigLateral.showOnlyIcons}
      twoColumns={navConfigLateral.twoColumns}
      onItemClick={(item) => console.log('Clicked item:', item)}
    />

      <aside className="color-section-container">
       
      </aside>

    </div>
    
    {/* Contenido principal */}
    {/*<Workspace2 
     tool={tool}
       setToolParameters={setToolParameters}
       toolParameters={toolParameters}
     /> */}
    <div className="render-main">
     <CanvasTracker tool={tool} toolParameters={toolParameters} setToolParameters={setToolParameters} 
     setTool={setTool}
     />
    </div>
   {/*
   <div className=" right-panel">
      <CustomTool setToolParameters={setToolParameters} tool={tool}/>
    </div> */} 
  </div>
 
        </div>
        </>
    )
}

export default EditorMain;

