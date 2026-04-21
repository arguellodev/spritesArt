"use no memo";

import {
  LuEraser,
  LuPaintBucket,
  LuBrush,
  LuMousePointer2,
  LuMousePointerClick,
  LuHand,
  LuLassoSelect,
  LuType,
  LuSun,
  LuMoon,
  LuSquare,
  LuCircle,
  LuTriangle,
} from "react-icons/lu";
import { FaBezierCurve } from "react-icons/fa";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import { BsEyedropper, BsPentagon } from "react-icons/bs";
import { LiaFootballBallSolid } from "react-icons/lia";
import { FaDrawPolygon } from "react-icons/fa6";
import { MdBlurOn, MdOutlineDeblur } from "react-icons/md";
import { PiIntersectDuotone } from "react-icons/pi";

// Builder para la lista de items de la barra lateral de herramientas.
// Se entrega como función porque cada item necesita capturar `setTool` del
// componente padre para poder activar la herramienta al hacer clic.
export const buildNavItemsLateral = (setTool) => [
  {
    label: "Selector",
    icon: <LuMousePointer2 />,
    onClick: () => setTool("select"),
    toolValue: "select",
  },
  {
    label: "Lazo",
    icon: <LuLassoSelect />,
    onClick: () => setTool("lassoSelect"),
    toolValue: "lassoSelect",
  },
  {
    label: "Selector por color",
    icon: <LuMousePointerClick />,
    onClick: () => setTool("selectByColor"),
    toolValue: "selectByColor",
  },
  {
    label: "Pincel",
    icon: <LuBrush />,
    onClick: () => setTool("pencil"),
    toolValue: "pencil",
  },
  {
    label: "Pincel2",
    icon: <LuBrush />,
    onClick: () => setTool("pencil2"),
    toolValue: "pencil2",
  },
  {
    label: "Rellenar",
    icon: <LuPaintBucket />,
    onClick: () => setTool("fill"),
    toolValue: "fill",
  },
  {
    label: "Borrador",
    icon: <LuEraser />,
    onClick: () => setTool("eraser"),
    toolValue: "eraser",
  },
  {
    label: "Gotero",
    icon: <BsEyedropper />,
    onClick: () => setTool("eyeDropper"),
    toolValue: "eyeDropper",
  },
  {
    label: "Linea",
    icon: <TfiLayoutLineSolid />,
    onClick: () => setTool("line"),
    toolValue: "line",
  },
  {
    label: "Curva",
    icon: <FaBezierCurve />,
    onClick: () => setTool("curve"),
    toolValue: "curve",
  },
  {
    label: "Cuadrado",
    icon: <LuSquare />,
    onClick: () => setTool("square"),
    toolValue: "square",
  },
  {
    label: "Circulo",
    icon: <LuCircle />,
    onClick: () => setTool("circle"),
    toolValue: "circle",
  },
  {
    label: "Elipse",
    icon: <LiaFootballBallSolid />,
    onClick: () => setTool("ellipse"),
    toolValue: "ellipse",
  },
  {
    label: "Triangulo",
    icon: <LuTriangle />,
    onClick: () => setTool("triangle"),
    toolValue: "triangle",
  },
  {
    label: "Poligono",
    icon: <BsPentagon />,
    onClick: () => setTool("polygon"),
    toolValue: "polygon",
  },
  {
    label: "Difuminador",
    icon: <MdBlurOn />,
    onClick: () => setTool("blurFinger"),
    toolValue: "blurFinger",
  },
  {
    label: "Mezclador",
    icon: <PiIntersectDuotone />,
    onClick: () => setTool("smudge"),
    toolValue: "smudge",
  },
  {
    label: "Clarificar",
    icon: <MdOutlineDeblur />,
    onClick: () => setTool("deblur"),
    toolValue: "deblur",
  },
  {
    label: "Mover",
    icon: <LuHand />,
    onClick: () => setTool("move"),
    toolValue: "move",
  },
  {
    label: "Text",
    icon: <LuType />,
    onClick: () => setTool("text"),
    toolValue: "text",
  },
  {
    label: "Creador de formas",
    icon: <FaDrawPolygon />,
    onClick: () => setTool("polygonPencil"),
    toolValue: "polygonPencil",
  },
  {
    label: "Luminosidad",
    icon: <LuSun />,
    onClick: () => setTool("light"),
    toolValue: "light",
  },
  {
    label: "Oscurecer",
    icon: <LuMoon />,
    onClick: () => setTool("dark"),
    toolValue: "dark",
  },
];

export default buildNavItemsLateral;
