import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { usePointer, useLayerManager } from "../hooks/hooks";
import { flushSync } from "react-dom";
import PlayingAnimation from "./playingAnimation";

import reactiveCursor from "./cursorIcons";
import {
  LuEye,
  LuEyeOff,
  LuTrash2,
  LuEraser,
  LuGroup,
  LuUngroup,
  LuMousePointerBan,
  LuPaintBucket,
  LuPointerOff,
  LuGrid2X2,
  LuUndo,
  LuRedo,
  LuBrainCircuit,
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
  LuSave,
} from "react-icons/lu";
import { FaBezierCurve } from "react-icons/fa";
import { TfiLayoutLineSolid } from "react-icons/tfi";
import { BiPolygon } from "react-icons/bi";
import { LiaFootballBallSolid } from "react-icons/lia";
import { FaDrawPolygon } from "react-icons/fa6";
import { MdBlurOn, MdGradient, MdOutlineDeblur } from "react-icons/md";
import { SlLayers } from "react-icons/sl";
import ViewportNavigator from "./viewportNavigator";
import CustomTool from "../customTool/customTool";
import CustomTool2 from "../customTool/customTool2";
import "./workspaceContainer.css";
import LayerManager from "./layerManager";
import ColorPicker from "../customTool/tools/colorPicker";
import ReflexMode from "./reflexMode";
import { GrTopCorner, GrBottomCorner } from "react-icons/gr";
import { MdOutlineRotate90DegreesCcw } from "react-icons/md";
import { MdOutlineRotate90DegreesCw } from "react-icons/md";
import { FaFileExport } from "react-icons/fa6";
import LayerColor from "../customTool/layerColor";
import LayerAnimation from "./layerAnimation";
import SaveProject from "../saveProject";
// @ts-ignore
import BoundsWorker from "./boundsWorker.js?worker";
import PlayAnimation from "../hooks/playAnimation";
import TopToolbar from "./topToolbar";
import AIgenerator from "../AIgenerator.jsx/AIgenerator";
import NavbarLateral from "../../navbarLateral/Navbar";
import { PiIntersectDuotone } from "react-icons/pi";
import { BsPentagon } from "react-icons/bs";

// Definición de las herramientas disponibles
const TOOLS = {
  paint: "pencil",
  erase: "eraser",
  select: "select",
  lassoSelect: "lassoSelect",
  move: "move",
  fill: "fill",
  line: "line",
  curve: "curve",
  square: "square",
  triangle: "triangle",
  circle: "circle",
  ellipse: "ellipse",
  polygon: "polygon",
  polygonPencil: "polygonPencil",
  light: "light",
  dark: "dark",
  selectByColor: "selectByColor",
  blurFinger: "blurFinger",
  smudge: "smudge",
  deblur: "deblur"
};

function CanvasTracker({
  setTool,
  tool,
  initialWidth,
  initialHeight,
  projectName,
  loadedData,
}) {
  //Parametros para modo espejo (reflex mode):
  const [mirrorState, setMirrorState] = useState({
    horizontal: false,
    vertical: false,
    customArea: false,
    bounds: {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    },
  });

  const navItemsLateral = [
    {
      dropdown: [
        {
          label: "Pincel",
          icon: <LuBrush />,
          onClick: () => setTool("pencil"),
          toolValue: "pencil"
        },
        { 
          label: "Perfil", 
          icon: "👤", 
          onClick: () => console.log("Perfil"),
          toolValue: null
        },
        {
          label: "Preferencias",
          icon: "🔧",
          onClick: () => console.log("Preferencias"),
          toolValue: null
        },
        {
          label: "Cerrar sesión",
          icon: "🚪",
          onClick: () => console.log("Cerrar sesión"),
          toolValue: null
        },
      ],
    },
    {
      dropdown: [
        {
          label: "Selector",
          icon: <LuMousePointer2 />,
          onClick: () => setTool("select"),
          toolValue: "select"
        },
        { 
          label: "Perfil", 
          icon: "👤", 
          onClick: () => console.log("Perfil"),
          toolValue: null
        },
        {
          label: "Preferencias",
          icon: "🔧",
          onClick: () => console.log("Preferencias"),
          toolValue: null
        },
        {
          label: "Cerrar sesión",
          icon: "🚪",
          onClick: () => console.log("Cerrar sesión"),
          toolValue: null
        },
      ],
    },
    {
      label: "Selector por color",
      icon: <LuMousePointerClick />,
      onClick: () => setTool("selectByColor"),
      toolValue: "selectByColor"
    },
    {
      label: "Borrador",
      icon: <LuEraser />,
      onClick: () => setTool("eraser"),
      toolValue: "eraser"
    },
    {
      label: "Difuminador",
      icon: <MdBlurOn />,
      onClick: () => setTool("blurFinger"),
      toolValue: "blurFinger"
    },
    {
      label: "Mezclador",
      icon: <PiIntersectDuotone />,
      onClick: () => setTool("smudge"),
      toolValue: "smudge"
    },
    {
      label: "Clarificar",
      icon: <MdOutlineDeblur/>,
      onClick: () => setTool("deblur"),
      toolValue: "deblur"
    },
    {
      label: "Mover",
      icon: <LuHand />,
      onClick: () => setTool("move"),
      toolValue: "move"
    },
    {
      dropdown: [
        {
          label: "Rellenar",
          icon: <LuPaintBucket />,
          onClick: () => setTool("fill"),
          toolValue: "fill"
        },
        {
          label: "Gradiente",
          icon: <MdGradient />,
          onClick: () => setTool("gradientFill"),
          toolValue: "gradientFill"
        },
      ],
    },
    {
      label: "Lazo",
      icon: <LuLassoSelect />,
      onClick: () => setTool("lassoSelect"),
      toolValue: "lassoSelect"
    },
    {
      label: "Text",
      icon: <LuType />,
      onClick: () => setTool("text"),
      toolValue: "text"
    },
    {
      label: "Creador de formas",
      icon: <FaDrawPolygon />,
      onClick: () => setTool("polygonPencil"),
      toolValue: "polygonPencil"
    },
    {
      label: "Luminosidad",
      icon: <LuSun />,
      onClick: () => setTool("light"),
      toolValue: "light"
    },
    {
      label: "Oscurecer",
      icon: <LuMoon />,
      onClick: () => setTool("dark"),
      toolValue: "dark"
    },
    {
      label: "Cuadrado",
      icon: <LuSquare />,
      onClick: () => setTool("square"),
      toolValue: "square"
    },
    {
      label: "Circulo",
      icon: <LuCircle />,
      onClick: () => setTool("circle"),
      toolValue: "circle"
    },
    {
      label: "Elipse",
      icon: <LiaFootballBallSolid />,
      onClick: () => setTool("ellipse"),
      toolValue: "ellipse"
    },
    {
      label: "Triangulo",
      icon: <LuTriangle />,
      onClick: () => setTool("triangle"),
      toolValue: "triangle"
    },
    {
      label: "Poligono",
      icon: <BsPentagon />,
      onClick: () => setTool("polygon"),
      toolValue: "polygon"
    },
    {
      label: "Linea",
      icon: <TfiLayoutLineSolid />,
      onClick: () => setTool("line"),
      toolValue: "line"
    },
    {
      label: "Curva",
      icon: <FaBezierCurve />,
      onClick: () => setTool("curve"),
      toolValue: "curve"
    },
  ];

  const [navConfigLateral, setNavLateralConfig] = useState({
    variant: "vertical",
    theme: "dark",
    showOnlyIcons: true,
    twoColumns: false,
  });

//Brochas creadas:

const [myBrushes, setMyBrushes] = useState(null);



  //Reproduccion:
  const [isPlaying, setIsPlaying] = useState(false);
  // estado especial para manejo de gradiente editable
  const [gradientPixels, setGradientPixels] = useState(null);
  //Estados de la inteligencia artificial:
  const [activeAI, setActiveAI] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Referencias a elementos del DOM
  const workspaceRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const selectionActionsRef = useRef(null);
  const artboardRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const mirrorCanvasRef = useRef(null);
  const leftMirrorCornerRef = useRef(null);
  const rightMirrorCornerRef = useRef(null);
  const animationLayerRef = useRef(null);
  const previewAnimationRef = useRef(null);

  // Refs para inicio de herramientas
  const squareStartRef = useRef(null);
  const triangleStartRef = useRef(null);
  const circleStartRef = useRef(null);
  const ellipseStartRef = useRef(null);
  const polygonStartRef = useRef(null);
  
  // Estados principales

  const [zoom, setZoom] = useState(10);
  const [workspaceWidth, setWorkspaceWidth] = useState(1000);
  const [workspaceHeight, setWorkspaceHeight] = useState(1000);
  const [color, setColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  const [activeGrid, setActiveGrid] = useState(true);

  // Estados para herramientas específicas
  const [curveState, setCurveState] = useState("idle");
  const [isSettingControl, setIsSettingControl] = useState(false);
  const [lastPressState, setLastPressState] = useState(false);
  const curveStartRef = useRef(null);
  const curveEndRef = useRef(null);
  const curveControlRef = useRef(null);
  const [clickStartTime, setClickStartTime] = useState(null);
  const lineStartRef = useRef(null);
  const lineButton = useRef(null);
  const curveButton = useRef(null);
  const [copiedPixels, setCopiedPixels] = useState(null);

  // Configuración del canvas
  const [totalWidth, setTotalWidth] = useState(initialWidth);
  const [totalHeight, setTotalHeight] = useState(initialHeight);

  const [drawableWidth, setDrawableWidth] = useState(initialWidth);
  const [drawableHeight, setDrawableHeight] = useState(initialHeight);

  // Estados para el viewport y navegación
  const [viewportWidth, setViewportWidth] = useState(
    Math.min(totalWidth, workspaceWidth.toFixed(0) / zoom)
  );
  const [viewportHeight, setViewportHeight] = useState(
    Math.min(totalHeight, workspaceHeight.toFixed(0) / zoom)
  );
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  //Inicializadores de color:
  const [foregroundColor, setForegroundColor] = useState({
    r: 0,
    g: 0,
    b: 0,
    a: 255,
  });
  const [backgroundCOlor, setBackgroundColor] = useState({
    r: 0,
    g: 0,
    b: 0,
    a: 255,
  });
  const [fillColor, setFillColor] = useState({ r: 0, g: 0, b: 0, a: 255 });
  const [borderColor, setBorderColor] = useState({ r: 0, g: 0, b: 0, a: 255 });
  const [isolatedPixels, setIsolatedPixels] = useState(null);
  const [toolParameters, setToolParameters] = useState({
    fillColor: fillColor,
    backgroundColor: backgroundCOlor,
    borderColor: borderColor,
    foregroundColor: foregroundColor,
  });

  const {
    isPressed,
    path,
    clearPath,
    getCurrentPosition, // Nueva función
  } = usePointer(workspaceRef, artboardRef, [
    selectionActionsRef,
    leftMirrorCornerRef,
    rightMirrorCornerRef,
    animationLayerRef,
  ]);

  const lastPixelRef = useRef(null);
  const [drawMode, setDrawMode] = useState("draw");

  const { relativeToTarget } = getCurrentPosition();

  // Hook para gestión de capas
  const {
    layers,
    compositeCanvasRef,
    viewportOffset,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    deleteLayer,
    moveLayerUp,
    moveLayerDown,
    toggleLayerVisibility,
    renameLayer,
    clearLayer,
    drawOnLayer,
    moveViewport,
    viewportToCanvasCoords,
    drawPixelLine,
    getLayerData,
    erasePixels,
    floodFill,
    gradientFloodFill,
    getMatchingPixels,
    duplicateLayer,
    pixelGroups,
    selectedGroup,
    createPixelGroup,
    deletePixelGroup,
    getLayerGroups,
    getAllGroups,
    getPixelGroupAt,
    isPixelInGroup,
    selectPixelGroup,
    clearSelectedGroup,
    renamePixelGroup,
    toggleGroupVisibility,
    updatePixelGroup,
    getHierarchicalLayers,
    getMainLayers,
    getGroupLayersForParent,
    setLayers,
    setPixelGroups,
    //FRAMES=============================
    frames,
    currentFrame,
    frameCount,
    // Nuevas funciones de frames
    setActiveFrame,
    createFrame,
    deleteFrame,
    duplicateFrame,
    saveCurrentFrameState,
    getFramesInfo,
    renameFrame,
    syncWithCurrentFrame,
    toggleLayerVisibilityInFrame,
    getLayerVisibility,

    // *** NUEVAS FUNCIONES PARA CANVAS COMPLETO ***
    getFullCanvas,
    getFullCanvasBlob,
    getFullCanvasDataURL,
    downloadFullCanvas,
    getFullCanvasImageData,
    createFullCanvasCopy,
    //Gestion de onion skin:
    toggleOnionSkin,
    setOnionSkinConfig,
    setOnionSkinFrameConfig,
    getOnionSkinFrameConfig,
    getOnionSkinPresets,
    applyOnionSkinPreset,
    getOnionSkinInfo,
    onionSkinEnabled,
    onionSkinSettings,
    showOnionSkinForLayer,
    clearOnionSkinLayerFilter,

    //gestion de tiempo de los frames
    setFrameDuration,
    getFrameDuration,
    getFrameRate,
    setDefaultFrameRate,
    defaultFrameDuration,
    //gestion de opacidad:
    setFrameOpacity,
    getFrameOpacity,

    //gestion de informacion de pixeles:
    getLayerPixelData,
    paintPixelsRGBA,

    //frames optimizado:
    framesResume,
    setFramesResume,

    //sistema de versiones

    undo,
    redo,
    undoFrames,
    restoreToLatest,
    clearHistory,
    canUndo,
    canRedo,
    canRestoreToLatest,
    debugInfo,
    history,

    //exportacion/importacion:
    exportLayersAndFrames,
    importLayersAndFrames,
    exportToJSONFile,
    importFromJSONData,
    getJSONDataPreview,
    exportToRememberedFolder,
    getStoredFolderInfo,
    selectNewFolder,
    clearStoredFolderHandle,
    exportToSpecificFolder,

    //funcion para activar el modo darken o lighter:
    setActiveLighter,
    //gestion del data url:
    createLayerAndPaintDataUrlCentered,

    //gestión del aislamiento de pixeles:
   
  } = useLayerManager({
    width: totalWidth,
    height: totalHeight,
    viewportWidth,
    viewportHeight,
    zoom,
    isPressed,
    isolatedPixels
  });

  // Hook para rastreo del puntero




// Función auxiliar para verificar si un píxel está en la lista de píxeles aislados
const isPixelIsolated = useCallback((x, y) => {
  if (!isolatedPixels || isolatedPixels.length === 0) {
    return true; // Si no hay aislamiento, todos los píxeles son válidos
  }
  
  return isolatedPixels.some(pixel => pixel.x === x && pixel.y === y);
}, [isolatedPixels]);

// Versión optimizada usando Set para mejor rendimiento con muchos píxeles
const isolatedPixelsSet = useMemo(() => {
  if (!isolatedPixels || isolatedPixels.length === 0) return null;
  
  return new Set(isolatedPixels.map(pixel => `${pixel.x},${pixel.y}`));
}, [isolatedPixels]);

const isPixelIsolatedOptimized = useCallback((x, y) => {
  if (!isolatedPixelsSet) return true; // Sin aislamiento
  
  return isolatedPixelsSet.has(`${x},${y}`);
}, [isolatedPixelsSet]);
// Función auxiliar para verificar si un píxel está en la lista de píxeles aislados
const canPaintAtPixel = useCallback((x, y) => {
  if (!isolatedPixelsSet) return true; // Sin aislamiento, todos los píxeles son válidos
  
  return isolatedPixelsSet.has(`${x},${y}`);
}, [isolatedPixelsSet]);




  //Funcion de guardado:


  const handleExport = async () => {
    const folderInfo = getStoredFolderInfo();

    if (folderInfo.hasStoredFolder) {
      console.log(`📁 Usando carpeta guardada: ${folderInfo.folderName}`);
    }

    const result = await exportToRememberedFolder("mi_animacion");

    if (result.success) {
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };
  // Importar animación
  const handleImportFromData = async () => {
    if (!loadedData) {
      alert("No hay datos para cargar");
      return;
    }

    try {
      // Opcional: mostrar preview antes de importar
      const preview = getJSONDataPreview(loadedData);
      console.log("Preview de datos:", preview);

      if (!preview.isValid) {
        alert("Error en los datos: " + preview.error);
        return;
      }

      // Importar datos
      await importFromJSONData(loadedData);
      alert("¡Animación cargada exitosamente!");
    } catch (error) {
      alert("Error al cargar: " + error.message);
      console.error("Error de importación:", error);
    }
  };

  useEffect(() => {
    if (loadedData) {
      handleImportFromData();
    }
  }, [loadedData]);

  const smudgeBufferRef = useRef(new Map());

// 6. Limpiar buffer cuando se cambia de herramienta o se suelta el mouse
useEffect(() => {
  if (!isPressed || tool !== TOOLS.smudge) {
    // Limpiar buffer cuando se suelta el mouse o cambia de herramienta
    smudgeBufferRef.current.clear();
  }
}, [isPressed, tool]);


//guardado automatico
const [contadorCambios, setContadorCambios] = useState(0);

useEffect(() => {
  setContadorCambios((prev) => {
    const nuevoContador = prev + 1;
    if (nuevoContador % 4 === 0) {
      handleExport();
    }
    return nuevoContador;
  });
}, [framesResume, isPressed]);



  //===============================Logica de canvas de espejo ====================================================//
  const {
    relativeToTarget: rightRelativeToTargetMirror,
    isPressed: rightIsPressedMirror,
  } = usePointer(rightMirrorCornerRef, artboardRef, [], {
    endPressOnLeave: false, // Permitir arrastre fuera del área
    preventContextMenu: true
  });
  
  const {
    relativeToTarget: leftRelativeToTargetMirror,
    isPressed: leftIsPressedMirror,
  } = usePointer(leftMirrorCornerRef, artboardRef, [], {
    endPressOnLeave: false, // Permitir arrastre fuera del área
    preventContextMenu: true
  });
  
// 2. ESTADO SEPARADO para las posiciones de los corners
const [isDraggingCorners, setIsDraggingCorners] = useState(false);
  const [positionCorners, setPositionCorners] = useState({
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  });

 

  //===============================Logica de canvas de espejo ====================================================//

  ////============COmponentes memoizados ============================================

  ////============COmponentes memoizados ============================================
  // Función para dibujar una curva cuadrática Bézier
  const drawQuadraticCurve = useCallback(
    (ctx, start, end, control, width, color) => {
      ctx.save();
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

      const distance = Math.max(
        Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
        Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
        Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
      );

      const steps = Math.max(distance * 3, 50);
      const points = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.round(
          (1 - t) * (1 - t) * start.x +
            2 * (1 - t) * t * control.x +
            t * t * end.x
        );
        const y = Math.round(
          (1 - t) * (1 - t) * start.y +
            2 * (1 - t) * t * control.y +
            t * t * end.y
        );
        points.push({ x, y });
      }

      const drawPixelPerfectLine = (x0, y0, x1, y1, width) => {
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        let x = x0,
          y = y0;

        const offset = Math.floor(width / 2);
        const drawnPixels = new Set();

        while (true) {
          for (let dy = 0; dy < width; dy++) {
            for (let dx = 0; dx < width; dx++) {
              const px = x + dx - offset;
              const py = y + dy - offset;
              const key = `${px},${py}`;

              if (
                !drawnPixels.has(key) &&
                px >= 0 &&
                px < ctx.canvas.width &&
                py >= 0 &&
                py < ctx.canvas.height
              ) {
                ctx.fillRect(px, py, 1, 1);
                drawnPixels.add(key);
              }
            }
          }

          if (x === x1 && y === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) {
            err += dy;
            x += sx;
          }
          if (e2 <= dx) {
            err += dx;
            y += sy;
          }
        }
      };

      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];

        if (current.x !== next.x || current.y !== next.y) {
          drawPixelPerfectLine(current.x, current.y, next.x, next.y, width);
        }
      }

      const offset = Math.floor(width / 2);

      for (let dy = 0; dy < width; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const px = start.x + dx - offset;
          const py = start.y + dy - offset;
          if (
            px >= 0 &&
            px < ctx.canvas.width &&
            py >= 0 &&
            py < ctx.canvas.height
          ) {
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }

      for (let dy = 0; dy < width; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const px = end.x + dx - offset;
          const py = end.y + dy - offset;
          if (
            px >= 0 &&
            px < ctx.canvas.width &&
            py >= 0 &&
            py < ctx.canvas.height
          ) {
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }

      ctx.restore();
    },
    [toolParameters]
  );

  // Función para dibujar preview de curva
  const drawPreviewCurve = (start, end, control, width) => {
    const distance = Math.max(
      Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
      Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
      Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
    );

    const steps = Math.max(distance * 3, 50);
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(
        (1 - t) * (1 - t) * start.x +
          2 * (1 - t) * t * control.x +
          t * t * end.x
      );
      const y = Math.round(
        (1 - t) * (1 - t) * start.y +
          2 * (1 - t) * t * control.y +
          t * t * end.y
      );
      points.push({ x, y });
    }

    const offset = Math.floor(width / 2);
    const drawnPixels = new Set();

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      if (current.x !== next.x || current.y !== next.y) {
        const dx = Math.abs(next.x - current.x);
        const dy = -Math.abs(next.y - current.y);
        const sx = current.x < next.x ? 1 : -1;
        const sy = current.y < next.y ? 1 : -1;
        let err = dx + dy;
        let x = current.x,
          y = current.y;

        while (true) {
          for (let brushY = 0; brushY < width; brushY++) {
            for (let brushX = 0; brushX < width; brushX++) {
              const px = x + brushX - offset;
              const py = y + brushY - offset;
              const key = `${px},${py}`;

              if (!drawnPixels.has(key)) {
                const screenX = (px - viewportOffset.x) * zoom;
                const screenY = (py - viewportOffset.y) * zoom;

                if (screenX >= 0 && screenY >= 0) {
                  ctx.fillRect(
                    Math.floor(screenX),
                    Math.floor(screenY),
                    zoom,
                    zoom
                  );
                  drawnPixels.add(key);
                }
              }
            }
          }

          if (x === next.x && y === next.y) break;
          const e2 = 2 * err;
          if (e2 >= dy) {
            err += dy;
            x += sx;
          }
          if (e2 <= dx) {
            err += dx;
            y += sy;
          }
        }
      }
    }
  };

  // Función para dibujar preview de línea
  const drawPreviewLine = (x0, y0, x1, y1) => {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0,
      y = y0;

    while (true) {
      const screenX = (x - viewportOffset.x) * zoom;
      const screenY = (y - viewportOffset.y) * zoom;

      if (screenX >= 0 && screenY >= 0) {
        previewCanvasRef.current
          ?.getContext("2d")
          ?.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
      }

      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  };

  // Función para dibujar un pincel
  function drawBrush(ctx, canvasCoords, size) {
    const offset = Math.floor(size / 2);
    const startX = canvasCoords.x - offset;
    const startY = canvasCoords.y - offset;

    ctx.fillRect(startX, startY, size, size);
  }

  //Funciones para manejar el cuadrado:
  // 2. Función para dibujar un rectángulo con bordes redondeados
  const drawRoundedRect = (
    ctx,
    x,
    y,
    width,
    height,
    radius,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    // Asegurar que el radio no sea mayor que la mitad del lado más pequeño
    const maxRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
    const actualRadius = Math.min(radius, maxRadius);

    // Calcular las coordenadas del rectángulo
    const startX = Math.min(x, x + width);
    const startY = Math.min(y, y + height);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);

    // Función auxiliar para verificar si un punto está dentro del rectángulo redondeado
    const isInsideRoundedRect = (px, py, w, h, r) => {
      if (r <= 0) return true;

      // Esquina superior izquierda
      if (px < r && py < r) {
        const dx = r - px;
        const dy = r - py;
        return dx * dx + dy * dy <= r * r;
      }
      // Esquina superior derecha
      else if (px >= w - r && py < r) {
        const dx = px - (w - r - 1);
        const dy = r - py;
        return dx * dx + dy * dy <= r * r;
      }
      // Esquina inferior izquierda
      else if (px < r && py >= h - r) {
        const dx = r - px;
        const dy = py - (h - r - 1);
        return dx * dx + dy * dy <= r * r;
      }
      // Esquina inferior derecha
      else if (px >= w - r && py >= h - r) {
        const dx = px - (w - r - 1);
        const dy = py - (h - r - 1);
        return dx * dx + dy * dy <= r * r;
      }

      return true;
    };

    // Dibujar el rectángulo píxel por píxel
    for (let py = 0; py < rectHeight; py++) {
      for (let px = 0; px < rectWidth; px++) {
        const finalX = startX + px;
        const finalY = startY + py;

        if (
          finalX >= 0 &&
          finalX < ctx.canvas.width &&
          finalY >= 0 &&
          finalY < ctx.canvas.height
        ) {
          const isInside = isInsideRoundedRect(
            px,
            py,
            rectWidth,
            rectHeight,
            actualRadius
          );

          if (isInside) {
            let shouldDraw = false;
            let colorToUse = null;

            // Determinar si es borde o relleno
            const isBorder =
              borderWidth > 0 &&
              (px < borderWidth ||
                px >= rectWidth - borderWidth ||
                py < borderWidth ||
                py >= rectHeight - borderWidth ||
                // Verificar bordes internos para esquinas redondeadas
                !isInsideRoundedRect(
                  px - borderWidth,
                  py - borderWidth,
                  rectWidth - 2 * borderWidth,
                  rectHeight - 2 * borderWidth,
                  Math.max(0, actualRadius - borderWidth)
                ));

            if (isBorder && borderColor && borderWidth > 0) {
              shouldDraw = true;
              colorToUse = borderColor;
            } else if (!isBorder && fillColor) {
              shouldDraw = true;
              colorToUse = fillColor;
            }

            if (shouldDraw && colorToUse) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
              ctx.fillRect(finalX, finalY, 1, 1);
            }
          }
        }
      }
    }
  };

  // 3. Función para dibujar preview del rectángulo
  const drawPreviewRect = (
    ctx,
    start,
    end,
    radius,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    const width = end.x - start.x;
    const height = end.y - start.y;

    const startX = Math.min(start.x, end.x);
    const startY = Math.min(start.y, end.y);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);

    // Early exit para figuras muy grandes (más de 50,000 píxeles)
    if (rectWidth * rectHeight > 50000) {
      drawPreviewRectSimplified(ctx, start, end, borderColor, fillColor);
      return;
    }

    // Calcular área visible en el viewport
    const viewportStartX = Math.max(0, startX - viewportOffset.x);
    const viewportStartY = Math.max(0, startY - viewportOffset.y);
    const viewportEndX = Math.min(
      viewportWidth,
      startX + rectWidth - viewportOffset.x
    );
    const viewportEndY = Math.min(
      viewportHeight,
      startY + rectHeight - viewportOffset.y
    );

    // Solo procesar píxeles visibles
    const visibleWidth = Math.max(0, viewportEndX - viewportStartX);
    const visibleHeight = Math.max(0, viewportEndY - viewportStartY);

    if (visibleWidth <= 0 || visibleHeight <= 0) return;

    // Usar ImageData para renderizado masivo
    const imageData = ctx.createImageData(
      visibleWidth * zoom,
      visibleHeight * zoom
    );
    const data = imageData.data;

    // Pre-calcular colores
    const fillR = fillColor?.r || 0;
    const fillG = fillColor?.g || 0;
    const fillB = fillColor?.b || 0;
    const fillA = Math.floor((fillColor?.a || 0) * 255 * 0.6); // Alpha reducido para preview

    const borderR = borderColor?.r || 0;
    const borderG = borderColor?.g || 0;
    const borderB = borderColor?.b || 0;
    const borderA = Math.floor((borderColor?.a || 0) * 255 * 0.8);

    // Renderizar píxel por píxel pero usando ImageData
    for (let py = 0; py < visibleHeight; py++) {
      for (let px = 0; px < visibleWidth; px++) {
        // Coordenadas en el canvas original
        const canvasX = viewportStartX + viewportOffset.x + px;
        const canvasY = viewportStartY + viewportOffset.y + py;

        // Verificar si está dentro del rectángulo
        const relativeX = canvasX - startX;
        const relativeY = canvasY - startY;

        if (
          relativeX >= 0 &&
          relativeX < rectWidth &&
          relativeY >= 0 &&
          relativeY < rectHeight
        ) {
          // Lógica del rectángulo redondeado (copiada directamente de tu código)
          let isInside = true;
          if (radius > 0) {
            // Esquina superior izquierda
            if (relativeX < radius && relativeY < radius) {
              const dx = radius - relativeX;
              const dy = radius - relativeY;
              isInside = dx * dx + dy * dy <= radius * radius;
            }
            // Esquina superior derecha
            else if (relativeX >= rectWidth - radius && relativeY < radius) {
              const dx = relativeX - (rectWidth - radius - 1);
              const dy = radius - relativeY;
              isInside = dx * dx + dy * dy <= radius * radius;
            }
            // Esquina inferior izquierda
            else if (relativeX < radius && relativeY >= rectHeight - radius) {
              const dx = radius - relativeX;
              const dy = relativeY - (rectHeight - radius - 1);
              isInside = dx * dx + dy * dy <= radius * radius;
            }
            // Esquina inferior derecha
            else if (
              relativeX >= rectWidth - radius &&
              relativeY >= rectHeight - radius
            ) {
              const dx = relativeX - (rectWidth - radius - 1);
              const dy = relativeY - (rectHeight - radius - 1);
              isInside = dx * dx + dy * dy <= radius * radius;
            }
          }

          if (isInside) {
            // Determinar si es borde (copiada directamente de tu lógica)
            const isBorder =
              borderWidth > 0 &&
              (relativeX < borderWidth ||
                relativeX >= rectWidth - borderWidth ||
                relativeY < borderWidth ||
                relativeY >= rectHeight - borderWidth ||
                // Verificar bordes internos para esquinas redondeadas
                (radius > 0 &&
                  !isInsideInnerRoundedRect(
                    relativeX - borderWidth,
                    relativeY - borderWidth,
                    rectWidth - 2 * borderWidth,
                    rectHeight - 2 * borderWidth,
                    Math.max(0, radius - borderWidth)
                  )));

            // Dibujar en todas las posiciones del zoom
            for (let zy = 0; zy < zoom; zy++) {
              for (let zx = 0; zx < zoom; zx++) {
                const pixelIndex =
                  ((py * zoom + zy) * visibleWidth * zoom + (px * zoom + zx)) *
                  4;

                if (isBorder && borderColor && borderWidth > 0) {
                  data[pixelIndex] = borderR;
                  data[pixelIndex + 1] = borderG;
                  data[pixelIndex + 2] = borderB;
                  data[pixelIndex + 3] = borderA;
                } else if (!isBorder && fillColor) {
                  data[pixelIndex] = fillR;
                  data[pixelIndex + 1] = fillG;
                  data[pixelIndex + 2] = fillB;
                  data[pixelIndex + 3] = fillA;
                }
              }
            }
          }
        }
      }
    }

    // Una sola llamada para dibujar todos los píxeles
    ctx.putImageData(imageData, viewportStartX * zoom, viewportStartY * zoom);
  };

  // Función auxiliar para verificar rectángulo redondeado interno
  const isInsideInnerRoundedRect = (px, py, w, h, r) => {
    if (w <= 0 || h <= 0) return false;
    if (r <= 0) return true;

    // Esquina superior izquierda
    if (px < r && py < r) {
      const dx = r - px;
      const dy = r - py;
      return dx * dx + dy * dy <= r * r;
    }
    // Esquina superior derecha
    else if (px >= w - r && py < r) {
      const dx = px - (w - r - 1);
      const dy = r - py;
      return dx * dx + dy * dy <= r * r;
    }
    // Esquina inferior izquierda
    else if (px < r && py >= h - r) {
      const dx = r - px;
      const dy = py - (h - r - 1);
      return dx * dx + dy * dy <= r * r;
    }
    // Esquina inferior derecha
    else if (px >= w - r && py >= h - r) {
      const dx = px - (w - r - 1);
      const dy = py - (h - r - 1);
      return dx * dx + dy * dy <= r * r;
    }

    return true;
  };

  const drawPreviewRectSimplified = (
    ctx,
    start,
    end,
    borderColor,
    fillColor
  ) => {
    const startX = Math.min(start.x, end.x);
    const startY = Math.min(start.y, end.y);
    const rectWidth = Math.abs(end.x - start.x);
    const rectHeight = Math.abs(end.y - start.y);

    const screenX = (startX - viewportOffset.x) * zoom;
    const screenY = (startY - viewportOffset.y) * zoom;

    // Mostrar solo el contorno para figuras muy grandes
    ctx.strokeStyle = borderColor
      ? `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, 0.8)`
      : "rgba(100, 100, 100, 0.5)";
    ctx.setLineDash([5, 5]); // Línea punteada
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, screenY, rectWidth * zoom, rectHeight * zoom);
    ctx.setLineDash([]);

    // Mostrar texto con dimensiones
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.font = "12px monospace";
    ctx.fillText(`${rectWidth}x${rectHeight}`, screenX + 5, screenY + 15);
  };

  //Funciones para manejar el triangulo:
  // 2. Función para dibujar un triángulo
  const drawTriangle = (
    ctx,
    start,
    end,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    // Calcular las coordenadas del triángulo
    const startX = Math.min(start.x, end.x);
    const startY = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    if (width === 0 || height === 0) return;

    // Definir los tres vértices del triángulo (triángulo equilátero inscrito en rectángulo)
    const topX = startX + Math.floor(width / 2);
    const topY = startY;
    const bottomLeftX = startX;
    const bottomLeftY = startY + height;
    const bottomRightX = startX + width;
    const bottomRightY = startY + height;

    // Función para verificar si un punto está dentro del triángulo usando coordenadas baricéntricas
    const isInsideTriangle = (px, py, x1, y1, x2, y2, x3, y3) => {
      const denominator = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
      if (denominator === 0) return false;

      const a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denominator;
      const b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denominator;
      const c = 1 - a - b;

      return a >= 0 && b >= 0 && c >= 0;
    };

    // Función para calcular la distancia de un punto a una línea
    const distanceToLine = (px, py, x1, y1, x2, y2) => {
      const A = px - x1;
      const B = py - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;

      if (lenSq === 0) return Math.sqrt(A * A + B * B);

      const param = dot / lenSq;
      let xx, yy;

      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = px - xx;
      const dy = py - yy;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Dibujar el triángulo píxel por píxel
    for (let py = 0; py <= height; py++) {
      // Cambiar < por <=
      for (let px = 0; px <= width; px++) {
        // Cambiar < por <=
        const finalX = startX + px;
        const finalY = startY + py;

        if (
          finalX >= 0 &&
          finalX < ctx.canvas.width &&
          finalY >= 0 &&
          finalY < ctx.canvas.height
        ) {
          const isInside = isInsideTriangle(
            finalX,
            finalY,
            topX,
            topY,
            bottomLeftX,
            bottomLeftY,
            bottomRightX,
            bottomRightY
          );

          if (isInside) {
            let shouldDraw = false;
            let colorToUse = null;

            // Determinar si es borde o relleno
            const isBorder =
              borderWidth > 0 &&
              (distanceToLine(
                finalX,
                finalY,
                topX,
                topY,
                bottomLeftX,
                bottomLeftY
              ) < borderWidth ||
                distanceToLine(
                  finalX,
                  finalY,
                  bottomLeftX,
                  bottomLeftY,
                  bottomRightX,
                  bottomRightY
                ) < borderWidth ||
                distanceToLine(
                  finalX,
                  finalY,
                  bottomRightX,
                  bottomRightY,
                  topX,
                  topY
                ) < borderWidth);

            if (isBorder && borderColor && borderWidth > 0) {
              shouldDraw = true;
              colorToUse = borderColor;
            } else if (!isBorder && fillColor) {
              shouldDraw = true;
              colorToUse = fillColor;
            }

            if (shouldDraw && colorToUse) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
              ctx.fillRect(finalX, finalY, 1, 1);
            }
          }
        }
      }
    }
  };
  // Dibujar la previa del triangulo
  const drawPreviewTriangle = (
    ctx,
    start,
    end,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    const startX = Math.min(start.x, end.x);
    const startY = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    if (width === 0 || height === 0) return;

    // Definir los tres vértices del triángulo
    const topX = startX + Math.floor(width / 2);
    const topY = startY;
    const bottomLeftX = startX;
    const bottomLeftY = startY + height;
    const bottomRightX = startX + width;
    const bottomRightY = startY + height;

    // Función para verificar si un punto está dentro del triángulo
    const isInsideTriangle = (px, py, x1, y1, x2, y2, x3, y3) => {
      const denominator = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
      if (denominator === 0) return false;

      const a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denominator;
      const b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denominator;
      const c = 1 - a - b;

      return a >= 0 && b >= 0 && c >= 0;
    };

    // Función para calcular la distancia de un punto a una línea
    const distanceToLine = (px, py, x1, y1, x2, y2) => {
      const A = px - x1;
      const B = py - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;

      if (lenSq === 0) return Math.sqrt(A * A + B * B);

      const param = dot / lenSq;
      let xx, yy;

      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = px - xx;
      const dy = py - yy;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Dibujar preview píxel por píxel
    for (let py = 0; py <= height; py++) {
      // Cambiar < por <=
      for (let px = 0; px <= width; px++) {
        // Cambiar < por <=
        const canvasX = startX + px;
        const canvasY = startY + py;

        const isInside = isInsideTriangle(
          canvasX,
          canvasY,
          topX,
          topY,
          bottomLeftX,
          bottomLeftY,
          bottomRightX,
          bottomRightY
        );

        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          let alpha = 0.7;

          // Determinar si es borde o relleno
          const isBorder =
            borderWidth > 0 &&
            (distanceToLine(
              canvasX,
              canvasY,
              topX,
              topY,
              bottomLeftX,
              bottomLeftY
            ) < borderWidth ||
              distanceToLine(
                canvasX,
                canvasY,
                bottomLeftX,
                bottomLeftY,
                bottomRightX,
                bottomRightY
              ) < borderWidth ||
              distanceToLine(
                canvasX,
                canvasY,
                bottomRightX,
                bottomRightY,
                topX,
                topY
              ) < borderWidth);

          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
            alpha = 0.8; // Borde un poco más opaco
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
            alpha = 0.6; // Relleno un poco más transparente
          }

          if (shouldDraw && colorToUse) {
            const screenX = (canvasX - viewportOffset.x) * zoom;
            const screenY = (canvasY - viewportOffset.y) * zoom;

            if (screenX >= 0 && screenY >= 0) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
              ctx.fillRect(
                Math.floor(screenX),
                Math.floor(screenY),
                zoom,
                zoom
              );
            }
          }
        }
      }
    }
  };

  //Funciones para la herramienta de circulo
  // Después de la función drawRoundedRect
  const drawCircle = (
    ctx,
    centerX,
    centerY,
    radius,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    if (radius <= 0) return;

    const startX = centerX - radius;
    const startY = centerY - radius;
    const diameter = radius * 2;

    // Función auxiliar para verificar si un punto está dentro del círculo
    const isInsideCircle = (px, py, cx, cy, r) => {
      const dx = px - cx;
      const dy = py - cy;
      return dx * dx + dy * dy <= r * r;
    };

    // Dibujar el círculo píxel por píxel
    for (let py = 0; py <= diameter; py++) {
      for (let px = 0; px <= diameter; px++) {
        const finalX = startX + px;
        const finalY = startY + py;

        if (
          finalX >= 0 &&
          finalX < ctx.canvas.width &&
          finalY >= 0 &&
          finalY < ctx.canvas.height
        ) {
          const relativeX = px - radius;
          const relativeY = py - radius;
          const distanceFromCenter = Math.sqrt(
            relativeX * relativeX + relativeY * relativeY
          );

          const isInside = distanceFromCenter <= radius;

          if (isInside) {
            let shouldDraw = false;
            let colorToUse = null;

            // Determinar si es borde o relleno
            const isBorder =
              borderWidth > 0 && distanceFromCenter > radius - borderWidth;

            if (isBorder && borderColor && borderWidth > 0) {
              shouldDraw = true;
              colorToUse = borderColor;
            } else if (!isBorder && fillColor) {
              shouldDraw = true;
              colorToUse = fillColor;
            }

            if (shouldDraw && colorToUse) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
              ctx.fillRect(finalX, finalY, 1, 1);
            }
          }
        }
      }
    }
  };

  // Después de drawPreviewRect
  const drawPreviewCircle = (
    ctx,
    center,
    end,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    const deltaX = end.x - center.x;
    const deltaY = end.y - center.y;
    const radius = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));

    if (radius <= 0) return;

    const startX = center.x - radius;
    const startY = center.y - radius;
    const diameter = radius * 2;

    // Dibujar preview píxel por píxel
    for (let py = 0; py <= diameter; py++) {
      for (let px = 0; px <= diameter; px++) {
        const relativeX = px - radius;
        const relativeY = py - radius;
        const distanceFromCenter = Math.sqrt(
          relativeX * relativeX + relativeY * relativeY
        );

        const isInside = distanceFromCenter <= radius;

        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          let alpha = 0.7;

          // Determinar si es borde o relleno
          const isBorder =
            borderWidth > 0 && distanceFromCenter > radius - borderWidth;

          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
            alpha = 0.8; // Borde un poco más opaco
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
            alpha = 0.6; // Relleno un poco más transparente
          }

          if (shouldDraw && colorToUse) {
            const canvasX = startX + px;
            const canvasY = startY + py;
            const screenX = (canvasX - viewportOffset.x) * zoom;
            const screenY = (canvasY - viewportOffset.y) * zoom;

            if (screenX >= 0 && screenY >= 0) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
              ctx.fillRect(
                Math.floor(screenX),
                Math.floor(screenY),
                zoom,
                zoom
              );
            }
          }
        }
      }
    }
  };

  //Funciones para dibujar la elipse:

  const drawEllipse = (
    ctx,
    startX,
    startY,
    endX,
    endY,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    // Calcular dimensiones y centro
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const centerX = Math.min(startX, endX) + width / 2;
    const centerY = Math.min(startY, endY) + height / 2;

    if (width <= 0 || height <= 0) return;

    const radiusX = width / 2;
    const radiusY = height / 2;

    // Área de renderizado
    const left = Math.max(0, Math.floor(centerX - radiusX) - 1);
    const right = Math.min(
      ctx.canvas.width - 1,
      Math.ceil(centerX + radiusX) + 1
    );
    const top = Math.max(0, Math.floor(centerY - radiusY) - 1);
    const bottom = Math.min(
      ctx.canvas.height - 1,
      Math.ceil(centerY + radiusY) + 1
    );

    // Dibujar la elipse píxel por píxel
    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        // Coordenadas relativas al centro
        const relativeX = px - centerX;
        const relativeY = py - centerY;

        // Ecuación de la elipse: (x/a)² + (y/b)² <= 1
        const ellipseValue =
          (relativeX * relativeX) / (radiusX * radiusX) +
          (relativeY * relativeY) / (radiusY * radiusY);

        const isInside = ellipseValue <= 1;

        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;

          // Determinar si es borde o relleno
          if (borderWidth > 0 && borderColor) {
            // Para el borde, calculamos si está en la región exterior del borde
            const innerRadiusX = Math.max(0, radiusX - borderWidth);
            const innerRadiusY = Math.max(0, radiusY - borderWidth);

            const innerEllipseValue =
              innerRadiusX > 0 && innerRadiusY > 0
                ? (relativeX * relativeX) / (innerRadiusX * innerRadiusX) +
                  (relativeY * relativeY) / (innerRadiusY * innerRadiusY)
                : 2;

            const isBorder = innerEllipseValue > 1;

            if (isBorder) {
              shouldDraw = true;
              colorToUse = borderColor;
            } else if (fillColor) {
              shouldDraw = true;
              colorToUse = fillColor;
            }
          } else if (fillColor) {
            // Solo relleno, sin borde
            shouldDraw = true;
            colorToUse = fillColor;
          }

          if (shouldDraw && colorToUse) {
            ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
    }
  };

  const drawPreviewEllipse = (
    ctx,
    start,
    end,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    // Calcular dimensiones y centro en coordenadas de canvas
    const canvasWidth = Math.abs(end.x - start.x);
    const canvasHeight = Math.abs(end.y - start.y);
    const canvasCenterX = Math.min(start.x, end.x) + canvasWidth / 2;
    const canvasCenterY = Math.min(start.y, end.y) + canvasHeight / 2;

    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    const canvasRadiusX = canvasWidth / 2;
    const canvasRadiusY = canvasHeight / 2;

    // Área de renderizado EN COORDENADAS DE CANVAS
    const left = Math.max(0, Math.floor(canvasCenterX - canvasRadiusX) - 1);
    const right = Math.ceil(canvasCenterX + canvasRadiusX) + 1;
    const top = Math.max(0, Math.floor(canvasCenterY - canvasRadiusY) - 1);
    const bottom = Math.ceil(canvasCenterY + canvasRadiusY) + 1;

    // Iterar en coordenadas de canvas
    for (let cy = top; cy <= bottom; cy++) {
      for (let cx = left; cx <= right; cx++) {
        // Coordenadas relativas al centro en canvas
        const relativeX = cx - canvasCenterX;
        const relativeY = cy - canvasCenterY;

        // Ecuación de la elipse en coordenadas de canvas
        const ellipseValue =
          canvasRadiusX > 0 && canvasRadiusY > 0
            ? (relativeX * relativeX) / (canvasRadiusX * canvasRadiusX) +
              (relativeY * relativeY) / (canvasRadiusY * canvasRadiusY)
            : 2;

        const isInside = ellipseValue <= 1;

        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          let alpha = 0.7;

          // Determinar si es borde o relleno
          if (borderWidth > 0 && borderColor) {
            const innerCanvasRadiusX = Math.max(0, canvasRadiusX - borderWidth);
            const innerCanvasRadiusY = Math.max(0, canvasRadiusY - borderWidth);

            const innerEllipseValue =
              innerCanvasRadiusX > 0 && innerCanvasRadiusY > 0
                ? (relativeX * relativeX) /
                    (innerCanvasRadiusX * innerCanvasRadiusX) +
                  (relativeY * relativeY) /
                    (innerCanvasRadiusY * innerCanvasRadiusY)
                : 2;

            const isBorder = innerEllipseValue > 1;

            if (isBorder) {
              shouldDraw = true;
              colorToUse = borderColor;
              alpha = 0.8;
            } else if (fillColor) {
              shouldDraw = true;
              colorToUse = fillColor;
              alpha = 0.6;
            }
          } else if (fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
            alpha = 0.6;
          }

          if (shouldDraw && colorToUse) {
            // Convertir a coordenadas de pantalla solo para dibujar
            const screenX = (cx - viewportOffset.x) * zoom;
            const screenY = (cy - viewportOffset.y) * zoom;

            // Verificar si está visible en pantalla
            if (
              screenX >= 0 &&
              screenY >= 0 &&
              screenX < ctx.canvas.width &&
              screenY < ctx.canvas.height
            ) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
              ctx.fillRect(
                Math.floor(screenX),
                Math.floor(screenY),
                Math.ceil(zoom),
                Math.ceil(zoom)
              );
            }
          }
        }
      }
    }
  };

  //Funciones para herramienta de poligono =====================================

  // 3. Función para calcular puntos del polígono
  const calculatePolygonPoints = (
    centerX,
    centerY,
    radius,
    vertices,
    rotation = 0
  ) => {
    const points = [];
    const angleStep = (2 * Math.PI) / vertices;

    for (let i = 0; i < vertices; i++) {
      const angle = i * angleStep + rotation;
      const x = Math.round(centerX + radius * Math.cos(angle));
      const y = Math.round(centerY + radius * Math.sin(angle));
      points.push({ x, y });
    }

    return points;
  };

  // 4. Función para verificar si un punto está dentro del polígono
  const isPointInPolygonShape = (px, py, points) => {
    let inside = false;
    const n = points.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;

      if (
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  };

  // 5. Función para dibujar línea entre dos puntos (para los bordes del polígono)
  const drawPolygonLine = (ctx, x0, y0, x1, y1, width, color) => {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0,
      y = y0;

    const offset = Math.floor(width / 2);
    const drawnPixels = new Set();

    while (true) {
      for (let brushY = 0; brushY < width; brushY++) {
        for (let brushX = 0; brushX < width; brushX++) {
          const px = x + brushX - offset;
          const py = y + brushY - offset;
          const key = `${px},${py}`;

          if (
            !drawnPixels.has(key) &&
            px >= 0 &&
            px < ctx.canvas.width &&
            py >= 0 &&
            py < ctx.canvas.height
          ) {
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
            ctx.fillRect(px, py, 1, 1);
            drawnPixels.add(key);
          }
        }
      }

      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  };

  // 6. Función para dibujar polígono
  const drawPolygon = (
    ctx,
    centerX,
    centerY,
    radius,
    vertices,
    borderWidth,
    borderColor,
    fillColor,
    rotation = 0
  ) => {
    const points = calculatePolygonPoints(
      centerX,
      centerY,
      radius,
      vertices,
      rotation
    );

    // Calcular bounding box
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    // Dibujar píxel por píxel
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        if (
          px >= 0 &&
          px < ctx.canvas.width &&
          py >= 0 &&
          py < ctx.canvas.height
        ) {
          const isInside = isPointInPolygonShape(px, py, points);

          if (isInside) {
            let shouldDraw = false;
            let colorToUse = null;

            // Verificar si es borde
            let isBorder = false;
            if (borderWidth > 0) {
              // Calcular polígono interior para detectar bordes
              const innerRadius = Math.max(0, radius - borderWidth);
              const innerPoints = calculatePolygonPoints(
                centerX,
                centerY,
                innerRadius,
                vertices,
                rotation
              );
              const isInsideInner =
                innerRadius > 0
                  ? isPointInPolygonShape(px, py, innerPoints)
                  : false;
              isBorder = !isInsideInner;
            }

            if (isBorder && borderColor && borderWidth > 0) {
              shouldDraw = true;
              colorToUse = borderColor;
            } else if (!isBorder && fillColor) {
              shouldDraw = true;
              colorToUse = fillColor;
            }

            if (shouldDraw && colorToUse) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${colorToUse.a})`;
              ctx.fillRect(px, py, 1, 1);
            }
          }
        }
      }
    }
  };

  // 7. Función para dibujar preview del polígono
  const drawPreviewPolygon = (
    ctx,
    centerX,
    centerY,
    radius,
    vertices,
    borderWidth,
    borderColor,
    fillColor,
    rotation = 0
  ) => {
    const points = calculatePolygonPoints(
      centerX,
      centerY,
      radius,
      vertices,
      rotation
    );

    // Calcular bounding box
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    // Dibujar píxel por píxel
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const isInside = isPointInPolygonShape(px, py, points);

        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          let alpha = 0.7;

          // Verificar si es borde
          let isBorder = false;
          if (borderWidth > 0) {
            const innerRadius = Math.max(0, radius - borderWidth);
            const innerPoints = calculatePolygonPoints(
              centerX,
              centerY,
              innerRadius,
              vertices,
              rotation
            );
            const isInsideInner =
              innerRadius > 0
                ? isPointInPolygonShape(px, py, innerPoints)
                : false;
            isBorder = !isInsideInner;
          }

          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
            alpha = 0.8;
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
            alpha = 0.6;
          }

          if (shouldDraw && colorToUse) {
            const screenX = (px - viewportOffset.x) * zoom;
            const screenY = (py - viewportOffset.y) * zoom;

            if (screenX >= 0 && screenY >= 0) {
              ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
              ctx.fillRect(
                Math.floor(screenX),
                Math.floor(screenY),
                zoom,
                zoom
              );
            }
          }
        }
      }
    }
  };

  //Funcion para pincel de poligono creador de formas: /////////
  // Estados necesarios para la herramienta (agregar al componente principal)
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [polygonCurvePoints, setPolygonCurvePoints] = useState(new Map());
  const [isSettingCurve, setIsSettingCurve] = useState(false);
  const [currentCurveIndex, setCurrentCurveIndex] = useState(-1);
  const polygonStartTimeRef = useRef(null);

  const drawPolygonWithCurves = (
    ctx,
    points,
    curvePoints,
    borderWidth,
    borderColor,
    fillColor,
    isPreview = false
  ) => {
    if (points.length < 3) return;

    // Crear path del polígono con curvas
    const createPolygonPath = () => {
      const path = [];

      for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];
        const nextPoint = points[(i + 1) % points.length];
        const curveKey = `${i}-${(i + 1) % points.length}`;

        if (i === 0) {
          path.push({ x: currentPoint.x, y: currentPoint.y, type: "move" });
        }

        if (curvePoints.has(curveKey)) {
          const controlPoint = curvePoints.get(curveKey);
          // Generar puntos de la curva cuadrática
          const curveSteps = 20;
          for (let t = 0; t <= curveSteps; t++) {
            const ratio = t / curveSteps;
            const x = Math.round(
              (1 - ratio) * (1 - ratio) * currentPoint.x +
                2 * (1 - ratio) * ratio * controlPoint.x +
                ratio * ratio * nextPoint.x
            );
            const y = Math.round(
              (1 - ratio) * (1 - ratio) * currentPoint.y +
                2 * (1 - ratio) * ratio * controlPoint.y +
                ratio * ratio * nextPoint.y
            );
            if (t > 0) path.push({ x, y, type: "line" });
          }
        } else {
          path.push({ x: nextPoint.x, y: nextPoint.y, type: "line" });
        }
      }

      return path;
    };

    const pathPoints = createPolygonPath();

    // Calcular bounding box
    const minX = Math.min(...pathPoints.map((p) => p.x));
    const maxX = Math.max(...pathPoints.map((p) => p.x));
    const minY = Math.min(...pathPoints.map((p) => p.y));
    const maxY = Math.max(...pathPoints.map((p) => p.y));

    // Dibujar píxel por píxel
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const isInside = isPointInPolygonShape(
          px,
          py,
          pathPoints.filter((p) => p.type !== "move")
        );

        if (isInside) {
          let shouldDraw = false;
          let colorToUse = null;
          let alpha = isPreview ? 0.7 : 1.0;

          // Verificar si es borde (simplificado para polígonos irregulares)
          let isBorder = false;
          if (borderWidth > 0) {
            // Revisar si está cerca del borde
            let minDistance = Infinity;
            for (let i = 0; i < pathPoints.length - 1; i++) {
              const p1 = pathPoints[i];
              const p2 = pathPoints[i + 1];
              const distance = distanceToLineSegment(
                px,
                py,
                p1.x,
                p1.y,
                p2.x,
                p2.y
              );
              minDistance = Math.min(minDistance, distance);
            }
            isBorder = minDistance <= borderWidth;
          }

          if (isBorder && borderColor && borderWidth > 0) {
            shouldDraw = true;
            colorToUse = borderColor;
            alpha = isPreview ? 0.8 : 1.0;
          } else if (!isBorder && fillColor) {
            shouldDraw = true;
            colorToUse = fillColor;
            alpha = isPreview ? 0.6 : 1.0;
          }

          if (shouldDraw && colorToUse) {
            if (isPreview) {
              const screenX = (px - viewportOffset.x) * zoom;
              const screenY = (py - viewportOffset.y) * zoom;
              if (screenX >= 0 && screenY >= 0) {
                ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
                ctx.fillRect(
                  Math.floor(screenX),
                  Math.floor(screenY),
                  zoom,
                  zoom
                );
              }
            } else {
              if (
                px >= 0 &&
                px < ctx.canvas.width &&
                py >= 0 &&
                py < ctx.canvas.height
              ) {
                ctx.fillStyle = `rgba(${colorToUse.r}, ${colorToUse.g}, ${colorToUse.b}, ${alpha})`;
                ctx.fillRect(px, py, 1, 1);
              }
            }
          }
        }
      }
    }
  };

  const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }

    const t = Math.max(
      0,
      Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length))
    );
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  };

  // Función para obtener coordenadas de píxel
  const getPixelCoordinates = (coords) => {
    return {
      x: Math.floor(coords.x / zoom),
      y: Math.floor(coords.y / zoom),
    };
  };

  useEffect(() => {
    // Solo procesar si alguna esquina está siendo presionada
    if (!leftIsPressedMirror && !rightIsPressedMirror) {
      setIsDraggingCorners(false);
      return;
    }
  
    setIsDraggingCorners(true);
  
    // Función helper para obtener coordenadas de canvas
    const getCanvasCoordinates = (relativeCoords) => {
      const viewportPixelCoords = getPixelCoordinates(relativeCoords);
      return viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
    };
  
    // Manejar esquina izquierda (superior izquierda)
    if (leftIsPressedMirror && leftRelativeToTargetMirror.x && leftRelativeToTargetMirror.y) {
      const leftCanvasCoords = getCanvasCoordinates(leftRelativeToTargetMirror);
      
      // Limitar las coordenadas dentro del canvas
      const clampedX = Math.max(0, Math.min(totalWidth - 1, leftCanvasCoords.x));
      const clampedY = Math.max(0, Math.min(totalHeight - 1, leftCanvasCoords.y));
      
      setPositionCorners(prev => ({
        ...prev,
        x1: clampedX,
        y1: clampedY,
      }));
      
      setMirrorState(prev => ({
        ...prev,
        bounds: {
          ...prev.bounds,
          x1: clampedX,
          y1: clampedY,
        },
      }));
    }
  
    // Manejar esquina derecha (inferior derecha)
    if (rightIsPressedMirror && rightRelativeToTargetMirror.x && rightRelativeToTargetMirror.y) {
      const rightCanvasCoords = getCanvasCoordinates(rightRelativeToTargetMirror);
      
      // Limitar las coordenadas dentro del canvas
      const clampedX = Math.max(0, Math.min(totalWidth - 1, rightCanvasCoords.x));
      const clampedY = Math.max(0, Math.min(totalHeight - 1, rightCanvasCoords.y));
      
      setPositionCorners(prev => ({
        ...prev,
        x2: clampedX,
        y2: clampedY,
      }));
      
      setMirrorState(prev => ({
        ...prev,
        bounds: {
          ...prev.bounds,
          x2: clampedX,
          y2: clampedY,
        },
      }));
    }
  }, [
    leftIsPressedMirror,
    rightIsPressedMirror,
    leftRelativeToTargetMirror,
    rightRelativeToTargetMirror,
    totalWidth,
    totalHeight,
    getPixelCoordinates,
    viewportToCanvasCoords
  ]);
  
  // 4. USEEFFECT SEPARADO para dibujar el canvas de espejo
  useEffect(() => {
    const canvas = mirrorCanvasRef.current;
    if (!canvas) return;
  
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Solo dibujar si el modo customArea está activo
    if (!mirrorState.customArea) return;
  
    // Validar que los bounds sean válidos
    const { x1, y1, x2, y2 } = mirrorState.bounds;
    
    if (x2 <= x1 || y2 <= y1) return; // Bounds inválidos
  
    const rectWidth = x2 - x1;
    const rectHeight = y2 - y1;
  
    // Convertir a coordenadas de pantalla
    const screenX = (x1 - viewportOffset.x) * zoom;
    const screenY = (y1 - viewportOffset.y) * zoom;
    const screenWidth = rectWidth * zoom;
    const screenHeight = rectHeight * zoom;
  
    // Dibujar el área de espejo
    ctx.fillStyle = isDraggingCorners ? "rgba(0, 0, 255, 0.2)" : "rgba(0, 0, 255, 0.1)";
    ctx.strokeStyle = isDraggingCorners ? "rgba(0, 0, 255, 1)" : "rgba(0, 0, 255, 0.8)";
    ctx.lineWidth = 2;
  
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
    ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
  
    // Dibujar líneas de guía si está arrastrando
    if (isDraggingCorners) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1;
      
      // Línea vertical en el centro
      const centerX = screenX + screenWidth / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, screenY);
      ctx.lineTo(centerX, screenY + screenHeight);
      ctx.stroke();
      
      // Línea horizontal en el centro
      const centerY = screenY + screenHeight / 2;
      ctx.beginPath();
      ctx.moveTo(screenX, centerY);
      ctx.lineTo(screenX + screenWidth, centerY);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
  }, [
    mirrorState,
    viewportOffset,
    zoom,
    isDraggingCorners
  ]);
  // Función para rellenar áreas

  // Efecto para observar cambios en el tamaño del workspace
  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setWorkspaceWidth(width);
        setWorkspaceHeight(height);
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Efecto para actualizar el tamaño del viewport cuando cambia el zoom
  useEffect(() => {
    setViewportWidth(
      Math.min(totalWidth, Math.floor(workspaceWidth.toFixed(0) / zoom))
    );
    setViewportHeight(
      Math.min(totalHeight, Math.floor(workspaceHeight.toFixed(0) / zoom))
    );
  }, [zoom]);

  // Efecto para establecer la primera capa como activa
  useEffect(() => {
    if (layers.length > 0 && !activeLayerId) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);

  // Efecto para manejar cambios de dimensiones del workspace
  useEffect(() => {
    const newWidth = Math.min(totalWidth, Math.floor(workspaceWidth / zoom));
    const newHeight = Math.min(totalHeight, Math.floor(workspaceHeight / zoom));

    if (newWidth !== viewportWidth || newHeight !== viewportHeight) {
      const maxOffsetX = Math.max(0, totalWidth - newWidth);
      const maxOffsetY = Math.max(0, totalHeight - newHeight);

      if (viewportOffset.x > maxOffsetX || viewportOffset.y > maxOffsetY) {
        const deltaX = Math.min(0, maxOffsetX - viewportOffset.x);
        const deltaY = Math.min(0, maxOffsetY - viewportOffset.y);

        if (deltaX !== 0 || deltaY !== 0) {
          moveViewport(deltaX, deltaY);
        }
      }

      setViewportWidth(newWidth);
      setViewportHeight(newHeight);
    }
  }, [zoom, workspaceWidth, workspaceHeight, totalWidth, totalHeight]);

  // Funciones para manejar el arrastre del canvas
  // Modifica la función handleStartDrag existente
  const handleStartDrag = useCallback(
    (e) => {
      if (drawMode === "move" || isSpacePressed) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });

        // Cambiar cursor cuando se inicia el arrastre
       
      }
    },
    [drawMode, isSpacePressed]
  );

  // Modifica la función handleDrag existente
  const deltaRef = useRef({ x: 0, y: 0 });

  const handleDrag = useCallback(
    (e) => {
      if (isDragging && (drawMode === "move" || isSpacePressed)) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        deltaRef.current.x += -dx / zoom;
        deltaRef.current.y += -dy / zoom;

        const moveX = Math.trunc(deltaRef.current.x);
        const moveY = Math.trunc(deltaRef.current.y);

        if (moveX !== 0 || moveY !== 0) {
          moveViewport(moveX, moveY);
          deltaRef.current.x -= moveX;
          deltaRef.current.y -= moveY;
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
    },
    [isDragging, dragStart, zoom, drawMode, moveViewport, isSpacePressed]
  );

  // Modifica la función handleEndDrag existente
  const handleEndDrag = useCallback(() => {
    setIsDragging(false);

   
  }, [isSpacePressed, drawMode]);

  const rellenar = useCallback(
    (coords, color) => {
      floodFill(activeLayerId, coords.x, coords.y, color);
      getMatchingPixels(activeLayerId, coords.x, coords.y);
    },
    [layers, activeLayerId, toolParameters, zoom]
  );

  const rellenarGradiente = useCallback(
    (coords) => {
      const gradientParams = {
        isGradientMode: toolParameters.isGradientMode,
        gradientStops: toolParameters.gradientStops,
        gradientType: toolParameters.gradientType, // o 'radial'
        gradientAngle: toolParameters.gradientAngle - 90,
        dithering: toolParameters.dithering,
        ditheringType: toolParameters.ditheringType,
        ditheringStrength: toolParameters.ditheringStrength,
      };
      gradientFloodFill(activeLayerId, coords.x, coords.y, gradientParams);
    },
    [layers, toolParameters, activeLayerId, zoom]
  );

  // Efecto para añadir event listeners de arrastre
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace) {
      workspace.addEventListener("mousedown", handleStartDrag);
      window.addEventListener("mousemove", handleDrag);
      window.addEventListener("mouseup", handleEndDrag);

      return () => {
        workspace.removeEventListener("mousedown", handleStartDrag);
        window.removeEventListener("mousemove", handleDrag);
        window.removeEventListener("mouseup", handleEndDrag);
      };
    }
  }, [handleStartDrag, handleDrag, handleEndDrag]);

  // Efecto para manejar cambios de herramienta
  useEffect(() => {
    setGradientPixels(null);
    if (tool === TOOLS.move) {
      setDrawMode("move");
    } else if (tool === TOOLS.paint) {
      setDrawMode("draw");
    } else if (tool === TOOLS.erase) {
      setDrawMode("erase");
    } else if (tool === TOOLS.blurFinger) { 
      setDrawMode("blur");
      
    } else if (tool === TOOLS.smudge) { 
    setDrawMode("smudge");
  } else if (tool === TOOLS.deblur) { 
    setDrawMode("deblur");
    
  }
    else if (tool === TOOLS.curve) {
      setDrawMode("curve");
    } else if (tool === TOOLS.line) {
      setDrawMode("line");
    } else if (tool === TOOLS.square) {
      setDrawMode("square");
    } else if (tool === TOOLS.triangle) {
      setDrawMode("triangle");
    } else if (tool === TOOLS.circle) {
      setDrawMode("circle");
    } else if (tool === TOOLS.ellipse) {
      setDrawMode("ellipse");
    } else if (tool === TOOLS.polygon) {
      setDrawMode("polygon");
    } else if (tool === TOOLS.dark) {
      setActiveLighter(true);
      setDrawMode("dark");
    } else if (tool === TOOLS.light) {
      setActiveLighter(true);
      setDrawMode("light");
    }

    // Desactivar lighter solo si la herramienta no es ni dark ni light
    if (tool !== TOOLS.dark && tool !== TOOLS.light) {
      setActiveLighter(false);
    }
  }, [tool]);

  //efecto para manipular los gradient pixels:

  useEffect(() => {
    if (tool !== TOOLS.fill) return;

    if (!gradientPixels) return;
    const gradientParams = {
      isGradientMode: toolParameters.isGradientMode,
      gradientStops: toolParameters.gradientStops,
      gradientType: toolParameters.gradientType, // o 'radial'
      gradientAngle: toolParameters.gradientAngle - 90,
      dithering: toolParameters.dithering,
      ditheringType: toolParameters.ditheringType,
      ditheringStrength: toolParameters.ditheringStrength,
    };

    console.log("el dithering strenght:", toolParameters.ditheringStrength);
    gradientFloodFill(activeLayerId, 1, 1, gradientParams, gradientPixels);
  }, [toolParameters]);

  // 1. DECLARAR LA REFERENCIA AL NIVEL DEL COMPONENTE (fuera de cualquier useEffect)
  let initialPatternOffset = useRef(null);

  // 2. USEEFFECT SEPARADO PARA DETECTAR CAMBIOS EN isPressed
  useEffect(() => {

    // Reset de la referencia cuando se suelta el botón (nuevo trazo)
    if (!isPressed && tool === TOOLS.paint) {
      initialPatternOffset.current = null;
    }
  }, [isPressed, tool]);

  const withIsolationCheck = (drawFunction) => {
    if (!isolatedPixels || isolatedPixels.length === 0) {
      return drawFunction;
    }
  
    // Pre-compilar máscara una sola vez si isolatedPixels no cambia
    let cachedMask = null;
    let lastPixelsHash = null;
    
    return (ctx, ...args) => {
      const { width, height } = ctx.canvas;
      const currentHash = JSON.stringify(isolatedPixels); // Simple hash
      
      if (lastPixelsHash !== currentHash) {
        // Recrear máscara
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        maskCanvas.width = width;
        maskCanvas.height = height;
        
        maskCtx.fillStyle = 'white';
        for (const { x, y } of isolatedPixels) {
          maskCtx.fillRect(x, y, 1, 1);
        }
        
        cachedMask = maskCanvas;
        lastPixelsHash = currentHash;
      }
      
      ctx.save();
      
      try {
        // Dibujar en canvas temporal
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        const result = drawFunction(tempCtx, ...args);
        
        // Aplicar máscara y dibujar resultado
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(cachedMask, 0, 0);
        
        ctx.drawImage(tempCanvas, 0, 0);
        
        return result;
        
      } finally {
        ctx.restore();
      }
    };
  };
  const cachedImageDataRef = useRef(null);
const cacheValidRef = useRef(false);

// Función para inicializar/actualizar el cache
const initializeImageDataCache = (ctx) => {
  const canvas = ctx.canvas;
  if (!cachedImageDataRef.current || 
      cachedImageDataRef.current.width !== canvas.width || 
      cachedImageDataRef.current.height !== canvas.height ||
      !cacheValidRef.current) {
    cachedImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    cacheValidRef.current = true;
  }
};

// Función para invalidar el cache (llamar cuando sea necesario)
const invalidateImageDataCache = () => {
  cacheValidRef.current = false;
};

  // Efecto principal para manejar el dibujo
  useEffect(() => {

 
  


    if (tool === TOOLS.selectByColor) {
      if (isPressed && lastPixelRef.current === null) {
        // Se acaba de presionar - GUARDAR coordenadas exactas inmediatamente
        console.log("🔍 selectByColor: Iniciando presión");
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const canvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );

        // NUEVA LÓGICA: Ejecutar inmediatamente al presionar
        console.log(
          "🎯 selectByColor: Coordenadas exactas al presionar:",
          canvasCoords
        );
        colorSelection(activeLayerId, canvasCoords);
        lastPixelRef.current = viewportPixelCoords;
      } else if (!isPressed && lastPixelRef.current !== null) {
        // Se acaba de soltar - solo limpiar
        console.log("🚀 selectByColor: Soltado - Limpiando");
        lastPixelRef.current = null;
      }
      return;
    }

    if (isSpacePressed) {
      return;
    }

    if (tool === TOOLS.curve) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(
        viewportPixelCoords.x,
        viewportPixelCoords.y
      );

      const justPressed = isPressed && !lastPressState;
      const justReleased = !isPressed && lastPressState;

      if (justPressed) {
        if (curveState === "idle") {
          // SOLO guardar el botón cuando se inicia la curva por primera vez
          curveButton.current = isPressed;

          curveStartRef.current = canvasCoords;
          setCurveState("first-point");
        } else if (curveState === "first-point") {
          curveEndRef.current = canvasCoords;
          curveControlRef.current = canvasCoords;
          setCurveState("setting-control");
          setIsSettingControl(true);
        }
      }

      if (justReleased) {
        if (curveState === "setting-control") {
          if (
            curveStartRef.current &&
            curveEndRef.current &&
            curveControlRef.current
          ) {
            // Calcular centro basado en bounds (igual que en paint)
            const hasBounds =
              mirrorState.bounds &&
              (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
                mirrorState.bounds.y2 > mirrorState.bounds.y1);

            const centerX = hasBounds
              ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
              : Math.floor(drawableWidth / 2);

            const centerY = hasBounds
              ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
              : Math.floor(drawableHeight / 2);

            // Ajustes para dimensiones impares (igual que en paint)
            const adjustment = -1;
            const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
            const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;

            const reflectHorizontal = (x) =>
              centerX * 2 - x + adjustment + imparAdjustmentWidth;
            const reflectVertical = (y) =>
              centerY * 2 - y + adjustment + imparAdjustmentHeight;

            const start = curveStartRef.current;
            const end = curveEndRef.current;
            const control = curveControlRef.current;

            // Usar la referencia guardada del botón
            const selectedColor =
              curveButton.current === "left"
                ? toolParameters.foregroundColor
                : curveButton.current === "right"
                ? toolParameters.backgroundColor
                : toolParameters.foregroundColor; // fallback

            drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
              // Configurar el color seleccionado
              ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;

              // Curva normal
              drawQuadraticCurve(
                ctx,
                start,
                end,
                control,
                toolParameters.width,
                selectedColor
              );

              // Espejo vertical (refleja Y)
              if (mirrorState.vertical) {
                drawQuadraticCurve(
                  ctx,
                  { x: start.x, y: reflectVertical(start.y) },
                  { x: end.x, y: reflectVertical(end.y) },
                  { x: control.x, y: reflectVertical(control.y) },
                  toolParameters.width,
                  selectedColor
                );
              }

              // Espejo horizontal (refleja X)
              if (mirrorState.horizontal) {
                drawQuadraticCurve(
                  ctx,
                  { x: reflectHorizontal(start.x), y: start.y },
                  { x: reflectHorizontal(end.x), y: end.y },
                  { x: reflectHorizontal(control.x), y: control.y },
                  toolParameters.width,
                  selectedColor
                );
              }

              // Espejo diagonal (refleja X e Y)
              if (mirrorState.horizontal && mirrorState.vertical) {
                drawQuadraticCurve(
                  ctx,
                  {
                    x: reflectHorizontal(start.x),
                    y: reflectVertical(start.y),
                  },
                  { x: reflectHorizontal(end.x), y: reflectVertical(end.y) },
                  {
                    x: reflectHorizontal(control.x),
                    y: reflectVertical(control.y),
                  },
                  toolParameters.width,
                  selectedColor
                );
              }
            }));
          }

          setCurveState("idle");
          setIsSettingControl(false);
          curveStartRef.current = null;
          curveEndRef.current = null;
          curveControlRef.current = null;
          curveButton.current = null; // Limpiar la referencia del botón
        }
      }

      if (curveState === "setting-control" && isPressed) {
        curveControlRef.current = canvasCoords;
      }

      setLastPressState(isPressed);

      return;
    }
    if (tool === TOOLS.line) {
      if (isPressed) {
        if (!lineStartRef.current) {
          // SOLO guardar el botón cuando se inicia la línea por primera vez
          lineButton.current = isPressed;
          console.log("ispressed:", isPressed);

          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );
          lineStartRef.current = canvasCoords;
        }
      } else {
        if (lineStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );

          const width = toolParameters.width;

          // Calcular centro basado en bounds (igual que en paint)
          const hasBounds =
            mirrorState.bounds &&
            (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
              mirrorState.bounds.y2 > mirrorState.bounds.y1);

          const centerX = hasBounds
            ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
            : Math.floor(drawableWidth / 2);

          const centerY = hasBounds
            ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
            : Math.floor(drawableHeight / 2);

          // Ajustes para dimensiones impares (igual que en paint)
          const adjustment = -1;
          const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
          const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;

          const reflectHorizontal = (x) =>
            centerX * 2 - x + adjustment + imparAdjustmentWidth;
          const reflectVertical = (y) =>
            centerY * 2 - y + adjustment + imparAdjustmentHeight;

          const start = lineStartRef.current;
          const startX = start.x;
          const startY = start.y;
          const endX = endCoords.x;
          const endY = endCoords.y;

          // Usar la referencia guardada (no isPressed actual)
          const selectedColor =
            lineButton.current === "left"
              ? toolParameters.foregroundColor
              : lineButton.current === "right"
              ? toolParameters.backgroundColor
              : toolParameters.foregroundColor; // fallback a foreground

          drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;

            // Línea normal
            drawPixelLine(ctx, startX, startY, endX, endY, width);

            // Espejo vertical (refleja Y)
            if (mirrorState.vertical) {
              drawPixelLine(
                ctx,
                startX,
                reflectVertical(startY),
                endX,
                reflectVertical(endY),
                width
              );
            }

            // Espejo horizontal (refleja X)
            if (mirrorState.horizontal) {
              drawPixelLine(
                ctx,
                reflectHorizontal(startX),
                startY,
                reflectHorizontal(endX),
                endY,
                width
              );
            }

            // Espejo diagonal (refleja X e Y)
            if (mirrorState.horizontal && mirrorState.vertical) {
              drawPixelLine(
                ctx,
                reflectHorizontal(startX),
                reflectVertical(startY),
                reflectHorizontal(endX),
                reflectVertical(endY),
                width
              );
            }
          }));

          lineStartRef.current = null;
          lineButton.current = null; // Limpiar la referencia del botón
        }
      }
      return;
    }

    if (tool === TOOLS.square) {
      if (isPressed) {
        if (!squareStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );
          squareStartRef.current = canvasCoords;
        }
      } else {
        if (squareStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );

          drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";

            const width = endCoords.x - squareStartRef.current.x;
            const height = endCoords.y - squareStartRef.current.y;

            // Obtener colores y configuración de los parámetros de la herramienta
            const borderColor = toolParameters.borderColor || null;
            const fillColor = toolParameters.fillColor || color; // Usar color principal como fallback
            const borderWidth = toolParameters.borderWidth || 0;
            const borderRadius = toolParameters.borderRadius || 0;

            drawRoundedRect(
              ctx,
              squareStartRef.current.x,
              squareStartRef.current.y,
              width,
              height,
              borderRadius,
              borderWidth,
              borderColor,
              fillColor
            );
          }));

          squareStartRef.current = null;
        }
      }
      return;
    }

    if (tool === TOOLS.triangle) {
      if (isPressed) {
        if (!triangleStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );
          triangleStartRef.current = canvasCoords;
        }
      } else {
        if (triangleStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );

          drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";

            // Obtener colores y configuración de los parámetros de la herramienta
            const borderColor = toolParameters.borderColor || null;
            const fillColor = toolParameters.fillColor || color; // Usar color principal como fallback
            const borderWidth = toolParameters.borderWidth || 0;

            drawTriangle(
              ctx,
              triangleStartRef.current,
              endCoords,
              borderWidth,
              borderColor,
              fillColor
            );
          }));

          triangleStartRef.current = null;
        }
      }
      return;
    }

    // Después del bloque if (tool === TOOLS.square), agregar:
    if (tool === TOOLS.circle) {
      if (isPressed) {
        if (!circleStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );
          circleStartRef.current = canvasCoords;
        }
      } else {
        if (circleStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );

          drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";

            const deltaX = endCoords.x - circleStartRef.current.x;
            const deltaY = endCoords.y - circleStartRef.current.y;
            const radius = Math.round(
              Math.sqrt(deltaX * deltaX + deltaY * deltaY)
            );

            // Obtener colores y configuración de los parámetros de la herramienta
            const borderColor = toolParameters.borderColor || null;
            const fillColor = toolParameters.fillColor || color;
            const borderWidth = toolParameters.borderWidth || 0;

            drawCircle(
              ctx,
              circleStartRef.current.x,
              circleStartRef.current.y,
              radius,
              borderWidth,
              borderColor,
              fillColor
            );
          }));

          circleStartRef.current = null;
        }
      }
      return;
    }
    if (tool === TOOLS.ellipse) {
      if (isPressed) {
        if (!ellipseStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );
          ellipseStartRef.current = canvasCoords;
        }
      } else {
        if (ellipseStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );

          drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";

            // Obtener colores y configuración de los parámetros de la herramienta
            const borderColor = toolParameters.borderColor || null;
            const fillColor = toolParameters.fillColor || color;
            const borderWidth = toolParameters.borderWidth || 0;

            drawEllipse(
              ctx,
              ellipseStartRef.current.x,
              ellipseStartRef.current.y,
              endCoords.x,
              endCoords.y,
              borderWidth,
              borderColor,
              fillColor
            );
          }));

          ellipseStartRef.current = null;
        }
      }
      return;
    }

    if (tool === TOOLS.polygon) {
      if (isPressed) {
        if (!polygonStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const canvasCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );
          polygonStartRef.current = canvasCoords;
        }
      } else {
        if (polygonStartRef.current) {
          const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
          const endCoords = viewportToCanvasCoords(
            viewportPixelCoords.x,
            viewportPixelCoords.y
          );

          drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";

            // Calcular centro y radio
            const centerX = polygonStartRef.current.x;
            const centerY = polygonStartRef.current.y;
            const dx = endCoords.x - centerX;
            const dy = endCoords.y - centerY;
            const radius = Math.sqrt(dx * dx + dy * dy);

            // Obtener parámetros de la herramienta
            const borderColor = toolParameters.borderColor || null;
            const fillColor = toolParameters.fillColor || color;
            const borderWidth = toolParameters.borderWidth || 0;
            const vertices = toolParameters.vertices || 6; // Default hexágono
            const rotation = ((toolParameters.rotation || 0) * Math.PI) / 180; // Convertir a radianes

            drawPolygon(
              ctx,
              centerX,
              centerY,
              radius,
              vertices,
              borderWidth,
              borderColor,
              fillColor,
              rotation
            );
          }));

          polygonStartRef.current = null;
        }
      }
      return;
    }

    if (tool === TOOLS.polygonPencil) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(
        viewportPixelCoords.x,
        viewportPixelCoords.y
      );

      const justPressed = isPressed && !lastPressState;
      const justReleased = !isPressed && lastPressState;

      if (justPressed) {
        polygonStartTimeRef.current = Date.now();

        if (!isSettingCurve) {
          // Verificar si se está cerrando el polígono (click cerca del primer punto)
          if (polygonPoints.length >= 3) {
            const firstPoint = polygonPoints[0];
            const distance = Math.sqrt(
              Math.pow(canvasCoords.x - firstPoint.x, 2) +
                Math.pow(canvasCoords.y - firstPoint.y, 2)
            );

            if (distance <= 10) {
              // Umbral de cierre
              // Finalizar polígono
              if (polygonPoints.length >= 3) {
                drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
                  drawPolygonWithCurves(
                    ctx,
                    polygonPoints,
                    polygonCurvePoints,
                    toolParameters.width,
                    toolParameters.borderColor,
                    toolParameters.fillColor,
                    false
                  );
                }));
              }

              setPolygonPoints([]);
              setPolygonCurvePoints(new Map());
              setIsSettingCurve(false);
              setCurrentCurveIndex(-1);
              return;
            }
          }

          // Agregar nuevo punto de ancla
          setPolygonPoints((prev) => [...prev, canvasCoords]);
        }
      }

      // Detectar hold mientras se mantiene presionado
      if (isPressed && !isSettingCurve && polygonPoints.length >= 1) {
        const holdTime = Date.now() - (polygonStartTimeRef.current || 0);
        if (holdTime > 300) {
          // 300ms para activar modo curva
          setIsSettingCurve(true);
          setCurrentCurveIndex(polygonPoints.length - 1); // El último punto agregado
        }
      }

      if (justReleased) {
        if (isSettingCurve) {
          // Finalizar configuración de curva
          const nextIndex =
            (currentCurveIndex + 1) % Math.max(polygonPoints.length, 1);
          const curveKey = `${currentCurveIndex}-${nextIndex}`;

          if (currentCurveIndex >= 0) {
            setPolygonCurvePoints(
              (prev) => new Map(prev.set(curveKey, canvasCoords))
            );
          }
          setIsSettingCurve(false);
          setCurrentCurveIndex(-1);
        }

        polygonStartTimeRef.current = null;
      }

      // Actualizar punto de control de la curva mientras se mueve en modo curva
      if (isSettingCurve && isPressed && currentCurveIndex >= 0) {
        const nextIndex =
          currentCurveIndex < polygonPoints.length - 1
            ? currentCurveIndex + 1
            : 0;
        const curveKey = `${currentCurveIndex}-${nextIndex}`;
        setPolygonCurvePoints(
          (prev) => new Map(prev.set(curveKey, canvasCoords))
        );
      }

      setLastPressState(isPressed);
      return;
    }

    if (!isPressed || !activeLayerId || drawMode === "move") {
      lastPixelRef.current = null;
      return;
    }

    const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
    const canvasCoords = viewportToCanvasCoords(
      viewportPixelCoords.x,
      viewportPixelCoords.y
    );
    if (tool === TOOLS.fill) {
      // Solo ejecutar si no hay último pixel registrado (primer click/touch)
      if (lastPixelRef.current === null) {
        if (!toolParameters.isGradientMode) {
          // Determinar el color basado en el botón presionado
          const selectedColor =
            isPressed === "left"
              ? toolParameters.foregroundColor
              : isPressed === "right"
              ? toolParameters.backgroundColor
              : toolParameters.foregroundColor; // fallback a foreground

          rellenar(canvasCoords, selectedColor);
        } else {
          setGradientPixels(
            getMatchingPixels(activeLayerId, canvasCoords.x, canvasCoords.y)
          );

          rellenarGradiente(canvasCoords);
        }

        // Marcar que ya se ejecutó el fill
        lastPixelRef.current = viewportPixelCoords;
      }
      // Si lastPixelRef.current no es null, significa que ya se ejecutó y no hacer nada
      return;
    }

    if (tool === TOOLS.select || tool === TOOLS.lassoSelect) {
      return;
    }

    // Declarar initialPatternOffset FUERA del useEffect, al nivel del componente

    // Dentro del bloque if (tool === TOOLS.paint) en el useEffect:

    if (tool === TOOLS.paint) {
      // Determinar el color basado en el botón presionado
      const selectedColor =
        isPressed === "left"
          ? toolParameters.foregroundColor
          : isPressed === "right"
          ? toolParameters.backgroundColor
          : toolParameters.foregroundColor; // fallback a foreground
    
      drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
        const canvas = ctx.canvas;
        const width = toolParameters?.width || 1;
        const blur = toolParameters.blur || 0;
        const paintMode = toolParameters?.paintMode || "manual";
        const velocitySensibility = toolParameters?.velocitySensibility || 0;
    
        // Parámetros para pattern alignment
        const patternAlignment = toolParameters?.patternAlignment || "normal";
    
        // Nuevos parámetros para brocha personalizada
        const useCustomBrush = toolParameters?.customBrush || false;
        const customBrushType = toolParameters?.customBrushType;
    
        // MODIFICACIÓN PRINCIPAL: Procesar datos de brocha con el color seleccionado
        let customBrushData = [];
        if (
          useCustomBrush &&
          customBrushType &&
          toolParameters.processCustomBrushData
        ) {
          customBrushData = toolParameters.processCustomBrushData(selectedColor);
        }
    
        // Precalcular valores constantes
        const maxRadius = width / 2;
        const halfWidth = Math.floor(width / 2);
    
        // Configuración de espejo
        const hasBounds =
          mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);
    
        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);
    
        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);
    
        const adjustment = -1;
        const imparAdjustmentHeight = drawableWidth % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
    
        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;
    
        // Función para calcular las dimensiones del patrón de la brocha personalizada
        const getBrushDimensions = () => {
          if (!useCustomBrush || !customBrushData.length) {
            return { width: width, height: width }; // Para brochas estándar usar el width configurado
          }
    
          let minX = 0,
            maxX = 0,
            minY = 0,
            maxY = 0;
          customBrushData.forEach((pixel) => {
            minX = Math.min(minX, pixel.x);
            maxX = Math.max(maxX, pixel.x);
            minY = Math.min(minY, pixel.y);
            maxY = Math.max(maxY, pixel.y);
          });
    
          return {
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          };
        };
    
        // Set para rastrear posiciones ya pintadas en este trazo
        const paintedPositions = new Set();
    
        // Función para obtener la posición de grilla más cercana
        const getGridPosition = (x, y, isInitialClick = false) => {
          if (patternAlignment === "normal") {
            return { x: x, y: y, shouldPaint: true };
          }
    
          const brushDims = getBrushDimensions();
          let gridOriginX, gridOriginY;
    
          if (patternAlignment === "source") {
            // Alinear al punto donde se hizo el primer clic
            if (isInitialClick || !initialPatternOffset.current) {
              // Guardar la coordenada inicial como origen de la grilla
              initialPatternOffset.current = { x: x, y: y };
              gridOriginX = x;
              gridOriginY = y;
            } else {
              // Usar la coordenada inicial guardada como origen
              gridOriginX = initialPatternOffset.current.x;
              gridOriginY = initialPatternOffset.current.y;
            }
          } else if (patternAlignment === "destination") {
            // Alinear al lienzo (origen en 0,0)
            gridOriginX = 0;
            gridOriginY = 0;
          }
    
          // Calcular la posición de grilla más cercana desde el origen
          const offsetX = x - gridOriginX;
          const offsetY = y - gridOriginY;
    
          // Encontrar el punto de grilla más cercano (múltiplo del tamaño del patrón)
          const gridStepX = Math.floor(offsetX / brushDims.width);
          const gridStepY = Math.floor(offsetY / brushDims.height);
    
          const gridX = gridOriginX + gridStepX * brushDims.width;
          const gridY = gridOriginY + gridStepY * brushDims.height;
    
          // Crear clave única para esta posición
          const posKey = `${gridX},${gridY}`;
    
          // Verificar si ya pintamos en esta posición en este trazo
          if (!paintedPositions.has(posKey)) {
            paintedPositions.add(posKey);
            return { x: gridX, y: gridY, shouldPaint: true };
          }
    
          return { x: gridX, y: gridY, shouldPaint: false };
        };
    
        // Función optimizada para calcular opacidad basada en velocidad
        const calculateOpacity = (currentX, currentY, lastX, lastY) => {
          if (velocitySensibility === 0) {
            const widthFactor = Math.max(1, width / 8);
            return selectedColor.a / widthFactor;
          }
    
          const distance = Math.sqrt(
            (currentX - lastX) ** 2 + (currentY - lastY) ** 2
          );
          const sensitivityCurve = ((11 - velocitySensibility) / 10) ** 1.5;
          const maxDistance = 200 * sensitivityCurve;
          const normalizedVelocity = Math.min(distance / maxDistance, 1);
    
          const widthCompensation = Math.max(1, width / 6);
          const baseOpacity = selectedColor.a / widthCompensation;
          const velocityReduction = normalizedVelocity * 0.8;
          const finalOpacity = baseOpacity * (1 - velocityReduction);
          const minOpacity = baseOpacity * 0.05;
    
          return Math.max(finalOpacity, minOpacity);
        };
    
        // Si se usa brocha personalizada, usar la lógica personalizada
        if (useCustomBrush && customBrushData.length > 0) {
          const originalComposite = ctx.globalCompositeOperation;
    
          if (paintMode === "composite") {
            ctx.globalCompositeOperation = "source-over";
          } else {
            // MODO MANUAL CON BROCHA PERSONALIZADA Y CACHE
            initializeImageDataCache(ctx);
          }
    
          // Función para dibujar brocha personalizada
          const drawCustomBrush = (centerX, centerY, opacity = 1) => {
            if (paintMode === "composite") {
              // Modo composite: usar operaciones de canvas
              for (const pixel of customBrushData) {
                const pixelX = centerX + pixel.x;
                const pixelY = centerY + pixel.y;
    
                if (pixelX < 0 || pixelX >= canvas.width || pixelY < 0 || pixelY >= canvas.height)
                  continue;
    
                ctx.globalAlpha = opacity * (pixel.color.a / 255);
                ctx.fillStyle = `rgba(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b}, ${pixel.color.a})`;
                ctx.fillRect(pixelX, pixelY, 1, 1);
              }
            } else {
              // Modo manual: usar ImageData cacheado
              const data = cachedImageDataRef.current.data;
              const canvasWidth = canvas.width;
    
              for (const pixel of customBrushData) {
                const pixelX = centerX + pixel.x;
                const pixelY = centerY + pixel.y;
    
                if (pixelX < 0 || pixelX >= canvas.width || pixelY < 0 || pixelY >= canvas.height)
                  continue;
    
                const index = (pixelY * canvasWidth + pixelX) * 4;
                data[index] = pixel.color.r;
                data[index + 1] = pixel.color.g;
                data[index + 2] = pixel.color.b;
                data[index + 3] = pixel.color.a * opacity;
              }
            }
            return true;
          };
    
          // Función para dibujar brocha personalizada con espejos
          const drawCustomBrushWithMirrors = (x, y, opacity = 1) => {
            drawCustomBrush(x, y, opacity);
    
            if (mirrorState.vertical) {
              drawCustomBrush(x, reflectVertical(y), opacity);
            }
            if (mirrorState.horizontal) {
              drawCustomBrush(reflectHorizontal(x), y, opacity);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawCustomBrush(reflectHorizontal(x), reflectVertical(y), opacity);
            }
          };
    
          if (!lastPixelRef.current) {
            // Primer clic del trazo
            const gridPos = getGridPosition(canvasCoords.x, canvasCoords.y, true);
            if (gridPos.shouldPaint) {
              drawCustomBrushWithMirrors(gridPos.x, gridPos.y, 1.0);
            }
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );
    
            // Algoritmo de Bresenham para interpolar entre puntos
            let x0 = last.x, y0 = last.y;
            let x1 = canvasCoords.x, y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let prevX = x0, prevY = y0;
    
            while (true) {
              // Obtener la posición de grilla para esta coordenada
              const gridPos = getGridPosition(x0, y0, false);
              if (gridPos.shouldPaint) {
                const opacity = calculateOpacity(x0, y0, prevX, prevY);
                drawCustomBrushWithMirrors(gridPos.x, gridPos.y, opacity);
              }
    
              if (x0 === x1 && y0 === y1) break;
    
              prevX = x0;
              prevY = y0;
    
              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }
    
          // Aplicar cambios al canvas
          if (paintMode === "composite") {
            ctx.globalCompositeOperation = originalComposite;
            ctx.globalAlpha = 1;
          } else {
            // Para modo manual, aplicar el ImageData modificado
            ctx.putImageData(cachedImageDataRef.current, 0, 0);
          }
    
          return; // Salir temprano si se usó brocha personalizada
        }
    
        // Lógica para brochas estándar con pattern alignment
        if (paintMode === "composite") {
          // MODO COMPOSITE OPTIMIZADO (LÓGICA ORIGINAL COMPLETA)
          const originalComposite = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "darker";
    
          const drawDot = (x, y, opacity = 1) => {
            // Validar que esté dentro del canvas completo, no solo del viewport
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height)
              return;
    
            ctx.globalAlpha = opacity;
            ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;
    
            if (blur === 0) {
              // Sin blur: rectángulo simple
              ctx.fillRect(x - halfWidth, y - halfWidth, width, width);
            } else {
              // Con blur: gradiente optimizado
              const coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
              const gradient = ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                maxRadius
              );
    
              const coreStop = coreRadius / maxRadius;
              const coreColor = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;
              const edgeColor = `rgba(${selectedColor.r}, ${selectedColor.g}, ${
                selectedColor.b
              }, ${selectedColor.a * 0.1})`;
    
              gradient.addColorStop(0, coreColor);
              gradient.addColorStop(coreStop, coreColor);
              gradient.addColorStop(1, edgeColor);
    
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(x, y, maxRadius, 0, 2 * Math.PI);
              ctx.fill();
            }
          };
    
          const drawWithMirrors = (x, y, opacity = 1) => {
            drawDot(x, y, opacity);
    
            if (mirrorState.vertical) {
              drawDot(x, reflectVertical(y), opacity);
            }
            if (mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), y, opacity);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), reflectVertical(y), opacity);
            }
          };
    
          if (!lastPixelRef.current) {
            // Primer clic del trazo
            const gridPos = getGridPosition(
              canvasCoords.x,
              canvasCoords.y,
              true
            );
            if (gridPos.shouldPaint) {
              drawWithMirrors(gridPos.x, gridPos.y, 1.0);
            }
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );
    
            // Algoritmo de Bresenham optimizado
            let x0 = last.x,
              y0 = last.y;
            let x1 = canvasCoords.x,
              y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0),
              dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1,
              sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let prevX = x0,
              prevY = y0;
    
            while (true) {
              // Obtener la posición de grilla para esta coordenada
              const gridPos = getGridPosition(x0, y0, false);
              if (gridPos.shouldPaint) {
                const opacity = calculateOpacity(x0, y0, prevX, prevY);
                drawWithMirrors(gridPos.x, gridPos.y, opacity);
              }
    
              if (x0 === x1 && y0 === y1) break;
    
              prevX = x0;
              prevY = y0;
    
              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }
    
          ctx.globalCompositeOperation = originalComposite;
          ctx.globalAlpha = 1;
        } else {
          // MODO MANUAL ULTRA-OPTIMIZADO CON CACHE
          initializeImageDataCache(ctx);
          const data = cachedImageDataRef.current.data;
          const canvasWidth = canvas.width;
    
          // Precalcular valores para blur
          let coreRadius, blurEnabled;
          if (blur > 0) {
            coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
            blurEnabled = true;
          } else {
            blurEnabled = false;
          }
    
          const drawDot = (x, y) => {
            // Validar que esté dentro del canvas completo, no solo del viewport
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height)
              return;
    
            const startX = x - halfWidth;
            const startY = y - halfWidth;
    
            if (!blurEnabled) {
              // Sin blur: optimización máxima con loop desenrollado cuando es posible
              const endX = Math.min(startX + width, canvas.width);
              const endY = Math.min(startY + width, canvas.height);
              const actualStartX = Math.max(startX, 0);
              const actualStartY = Math.max(startY, 0);
    
              for (let py = actualStartY; py < endY; py++) {
                const rowIndex = py * canvasWidth * 4;
                for (let px = actualStartX; px < endX; px++) {
                  const index = rowIndex + px * 4;
                  data[index] = selectedColor.r;
                  data[index + 1] = selectedColor.g;
                  data[index + 2] = selectedColor.b;
                  data[index + 3] = selectedColor.a * 255;
                }
              }
            } else {
              // Con blur: optimizado con precálculos
              const maxRadiusSquared = maxRadius * maxRadius;
              const coreRadiusSquared = coreRadius * coreRadius;
    
              for (let dy = 0; dy < width; dy++) {
                for (let dx = 0; dx < width; dx++) {
                  const px = startX + dx;
                  const py = startY + dy;
    
                  if (
                    px < 0 ||
                    px >= canvas.width ||
                    py < 0 ||
                    py >= canvas.height
                  )
                    continue;
    
                  // Calcular distancia al cuadrado (evitar sqrt cuando sea posible)
                  const deltaX = px - x;
                  const deltaY = py - y;
                  const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    
                  if (distanceSquared > maxRadiusSquared) continue;
    
                  let alpha;
                  if (distanceSquared <= coreRadiusSquared) {
                    alpha = selectedColor.a;
                  } else {
                    const distance = Math.sqrt(distanceSquared);
                    const blurProgress =
                      (distance - coreRadius) / (maxRadius - coreRadius);
                    alpha = selectedColor.a * (1 - blurProgress * 0.9);
                  }
    
                  const index = (py * canvasWidth + px) * 4;
                  data[index] = selectedColor.r;
                  data[index + 1] = selectedColor.g;
                  data[index + 2] = selectedColor.b;
                  data[index + 3] = alpha * 255;
                }
              }
            }
          };
    
          const drawWithMirrors = (x, y) => {
            drawDot(x, y);
    
            if (mirrorState.vertical) {
              drawDot(x, reflectVertical(y));
            }
            if (mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), y);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), reflectVertical(y));
            }
          };
    
          if (!lastPixelRef.current) {
            // Primer clic del trazo
            const gridPos = getGridPosition(
              canvasCoords.x,
              canvasCoords.y,
              true
            );
            if (gridPos.shouldPaint) {
              drawWithMirrors(gridPos.x, gridPos.y);
            }
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );
    
            // Bresenham optimizado
            let x0 = last.x,
              y0 = last.y;
            let x1 = canvasCoords.x,
              y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0),
              dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1,
              sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
    
            while (true) {
              // Obtener la posición de grilla para esta coordenada
              const gridPos = getGridPosition(x0, y0, false);
              if (gridPos.shouldPaint) {
                drawWithMirrors(gridPos.x, gridPos.y);
              }
    
              if (x0 === x1 && y0 === y1) break;
    
              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }
    
          // Una sola llamada a putImageData al final
          ctx.putImageData(cachedImageDataRef.current, 0, 0);
        }
      }));
    }

    if (tool === TOOLS.dark) {
      const intensity = toolParameters.intensity
      // Determinar el color basado en el botón presionado
      const selectedColor =
        isPressed === "left"
          ? { r: 0, g: 0, b: 0, a: intensity }
          : isPressed === "right"
          ? { r: 0, g: 0, b: 0, a: 0 }
          : toolParameters.foregroundColor; // fallback a foreground

      drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
        const canvas = ctx.canvas;
        const width = toolParameters?.width || 1;
        const blur = toolParameters.blur || 0;
        const paintMode = toolParameters?.paintMode || "manual";
        const velocitySensibility = toolParameters?.velocitySensibility || 0;

        // Nuevos parámetros para brocha personalizada
        const useCustomBrush = toolParameters?.customBrush || false;
        const customBrushType = toolParameters?.customBrushType;

        // MODIFICACIÓN PRINCIPAL: Procesar datos de brocha con el color seleccionado
        let customBrushData = [];
        if (
          useCustomBrush &&
          customBrushType &&
          toolParameters.processCustomBrushData
        ) {
          customBrushData =
            toolParameters.processCustomBrushData(selectedColor);
        }

        // Precalcular valores constantes
        const maxRadius = width / 2;
        const halfWidth = Math.floor(width / 2);

        // Límites del viewport para optimización
        const xMin = viewportOffset.x;
        const xMax = viewportOffset.x + viewportWidth;
        const yMin = viewportOffset.y;
        const yMax = viewportOffset.y + viewportHeight;

        // Configuración de espejo
        const hasBounds =
          mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);

        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);

        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);

        const adjustment = -1;
        const imparAdjustmentHeight = drawableWidth % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;

        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;

        // Función optimizada para calcular opacidad basada en velocidad
        const calculateOpacity = (currentX, currentY, lastX, lastY) => {
          if (velocitySensibility === 0) {
            const widthFactor = Math.max(1, width / 8);
            return selectedColor.a / widthFactor;
          }

          const distance = Math.sqrt(
            (currentX - lastX) ** 2 + (currentY - lastY) ** 2
          );
          const sensitivityCurve = ((11 - velocitySensibility) / 10) ** 1.5;
          const maxDistance = 200 * sensitivityCurve;
          const normalizedVelocity = Math.min(distance / maxDistance, 1);

          const widthCompensation = Math.max(1, width / 6);
          const baseOpacity = selectedColor.a / widthCompensation;
          const velocityReduction = normalizedVelocity * 0.8;
          const finalOpacity = baseOpacity * (1 - velocityReduction);
          const minOpacity = baseOpacity * 0.05;

          return Math.max(finalOpacity, minOpacity);
        };

        // Función para dibujar brocha personalizada CORREGIDA
        const drawCustomBrush = (centerX, centerY, opacity = 1) => {
          if (!useCustomBrush || !customBrushData.length) return false;

          for (const pixel of customBrushData) {
            const pixelX = centerX + pixel.x;
            const pixelY = centerY + pixel.y;

            // Validar que esté dentro del canvas completo, no solo del viewport
            if (
              pixelX < 0 ||
              pixelX >= canvas.width ||
              pixelY < 0 ||
              pixelY >= canvas.height
            )
              continue;

            if (paintMode === "composite") {
              ctx.globalAlpha = opacity * (pixel.color.a / 255);
              ctx.fillStyle = `rgba(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b}, ${pixel.color.a})`;
              ctx.fillRect(pixelX, pixelY, 1, 1);
            } else {
              // Modo manual - modificar ImageData directamente
              const imageData = ctx.getImageData(pixelX, pixelY, 1, 1);
              const data = imageData.data;
              data[0] = pixel.color.r;
              data[1] = pixel.color.g;
              data[2] = pixel.color.b;
              data[3] = pixel.color.a * opacity;
              ctx.putImageData(imageData, pixelX, pixelY);
            }
          }
          return true;
        };

        // Función para dibujar brocha personalizada con espejos CORREGIDA
        const drawCustomBrushWithMirrors = (x, y, opacity = 1) => {
          // Siempre dibujar todos los puntos, la validación se hace en drawCustomBrush
          drawCustomBrush(x, y, opacity);

          if (mirrorState.vertical) {
            drawCustomBrush(x, reflectVertical(y), opacity);
          }
          if (mirrorState.horizontal) {
            drawCustomBrush(reflectHorizontal(x), y, opacity);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawCustomBrush(reflectHorizontal(x), reflectVertical(y), opacity);
          }
        };

        // Si se usa brocha personalizada, usar la lógica personalizada
        if (useCustomBrush && customBrushData.length > 0) {
          const originalComposite = ctx.globalCompositeOperation;

          if (paintMode === "composite") {
            ctx.globalCompositeOperation = "source-over";
          }

          if (!lastPixelRef.current) {
            drawCustomBrushWithMirrors(canvasCoords.x, canvasCoords.y, 1.0);
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );

            // Algoritmo de Bresenham para interpolar entre puntos
            let x0 = last.x,
              y0 = last.y;
            let x1 = canvasCoords.x,
              y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0),
              dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1,
              sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let prevX = x0,
              prevY = y0;

            while (true) {
              const opacity = calculateOpacity(x0, y0, prevX, prevY);
              drawCustomBrushWithMirrors(x0, y0, opacity);

              if (x0 === x1 && y0 === y1) break;

              prevX = x0;
              prevY = y0;

              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }

          if (paintMode === "composite") {
            ctx.globalCompositeOperation = originalComposite;
            ctx.globalAlpha = 1;
          }

          return; // Salir temprano si se usó brocha personalizada
        }

        // Lógica original para brochas estándar
        if (paintMode === "composite") {
          // MODO COMPOSITE OPTIMIZADO Y CORREGIDO
          const originalComposite = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "source-over";

          const drawDot = (x, y, opacity = 1) => {
            // Validar que esté dentro del canvas completo, no solo del viewport
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height)
              return;

            ctx.globalAlpha = opacity;
            ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;

            if (blur === 0) {
              // Sin blur: rectángulo simple
              ctx.fillRect(x - halfWidth, y - halfWidth, width, width);
            } else {
              // Con blur: gradiente optimizado
              const coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
              const gradient = ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                maxRadius
              );

              const coreStop = coreRadius / maxRadius;
              const coreColor = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;
              const edgeColor = `rgba(${selectedColor.r}, ${selectedColor.g}, ${
                selectedColor.b
              }, ${selectedColor.a * 0.1})`;

              gradient.addColorStop(0, coreColor);
              gradient.addColorStop(coreStop, coreColor);
              gradient.addColorStop(1, edgeColor);

              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(x, y, maxRadius, 0, 2 * Math.PI);
              ctx.fill();
            }
          };

          const drawWithMirrors = (x, y, opacity = 1) => {
            // Siempre dibujar todos los puntos, la validación se hace en drawDot
            drawDot(x, y, opacity);

            if (mirrorState.vertical) {
              drawDot(x, reflectVertical(y), opacity);
            }
            if (mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), y, opacity);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), reflectVertical(y), opacity);
            }
          };

          if (!lastPixelRef.current) {
            drawWithMirrors(canvasCoords.x, canvasCoords.y, 1.0);
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );

            // Algoritmo de Bresenham optimizado
            let x0 = last.x,
              y0 = last.y;
            let x1 = canvasCoords.x,
              y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0),
              dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1,
              sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let prevX = x0,
              prevY = y0;

            while (true) {
              const opacity = calculateOpacity(x0, y0, prevX, prevY);
              drawWithMirrors(x0, y0, opacity);

              if (x0 === x1 && y0 === y1) break;

              prevX = x0;
              prevY = y0;

              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }

          ctx.globalCompositeOperation = originalComposite;
          ctx.globalAlpha = 1;
        } else {
          // MODO MANUAL ULTRA-OPTIMIZADO Y CORREGIDO
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const canvasWidth = canvas.width;

          // Precalcular valores para blur
          let coreRadius, blurEnabled;
          if (blur > 0) {
            coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
            blurEnabled = true;
          } else {
            blurEnabled = false;
          }

          const drawDot = (x, y) => {
            // Validar que esté dentro del canvas completo, no solo del viewport
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height)
              return;

            const startX = x - halfWidth;
            const startY = y - halfWidth;

            if (!blurEnabled) {
              // Sin blur: optimización máxima con loop desenrollado cuando es posible
              const endX = Math.min(startX + width, canvas.width);
              const endY = Math.min(startY + width, canvas.height);
              const actualStartX = Math.max(startX, 0);
              const actualStartY = Math.max(startY, 0);

              for (let py = actualStartY; py < endY; py++) {
                const rowIndex = py * canvasWidth * 4;
                for (let px = actualStartX; px < endX; px++) {
                  const index = rowIndex + px * 4;
                  data[index] = selectedColor.r;
                  data[index + 1] = selectedColor.g;
                  data[index + 2] = selectedColor.b;
                  data[index + 3] = selectedColor.a * 255;
                }
              }
            } else {
              // Con blur: optimizado con precálculos
              const maxRadiusSquared = maxRadius * maxRadius;
              const coreRadiusSquared = coreRadius * coreRadius;
              const blurRange = maxRadius - coreRadius;
              const minAlpha = selectedColor.a * 0.1;
              const alphaRange = selectedColor.a - minAlpha;

              for (let dy = 0; dy < width; dy++) {
                for (let dx = 0; dx < width; dx++) {
                  const px = startX + dx;
                  const py = startY + dy;

                  if (
                    px < 0 ||
                    px >= canvas.width ||
                    py < 0 ||
                    py >= canvas.height
                  )
                    continue;

                  // Calcular distancia al cuadrado (evitar sqrt cuando sea posible)
                  const deltaX = px - x;
                  const deltaY = py - y;
                  const distanceSquared = deltaX * deltaX + deltaY * deltaY;

                  if (distanceSquared > maxRadiusSquared) continue;

                  let alpha;
                  if (distanceSquared <= coreRadiusSquared) {
                    alpha = selectedColor.a;
                  } else {
                    const distance = Math.sqrt(distanceSquared);
                    const blurProgress = (distance - coreRadius) / blurRange;
                    alpha = selectedColor.a * (1 - blurProgress * 0.9); // 0.9 = (1 - 0.1)
                  }

                  const index = (py * canvasWidth + px) * 4;
                  data[index] = selectedColor.r;
                  data[index + 1] = selectedColor.g;
                  data[index + 2] = selectedColor.b;
                  data[index + 3] = alpha * 255;
                }
              }
            }
          };

          const drawWithMirrors = (x, y) => {
            // Siempre dibujar todos los puntos, la validación se hace en drawDot
            drawDot(x, y);

            if (mirrorState.vertical) {
              drawDot(x, reflectVertical(y));
            }
            if (mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), y);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), reflectVertical(y));
            }
          };

          if (!lastPixelRef.current) {
            drawWithMirrors(canvasCoords.x, canvasCoords.y);
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );

            // Bresenham optimizado
            let x0 = last.x,
              y0 = last.y;
            let x1 = canvasCoords.x,
              y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0),
              dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1,
              sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;

            while (true) {
              drawWithMirrors(x0, y0);
              if (x0 === x1 && y0 === y1) break;

              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }

          // Una sola llamada a putImageData al final
          ctx.putImageData(imageData, 0, 0);
        }
      }));
    }
    if (tool === TOOLS.light) {
      const intensity = toolParameters.intensity
      // Determinar el color basado en el botón presionado
      const selectedColor =
        isPressed === "left"
          ? { r: 255, g: 255, b: 255, a: intensity }
          : isPressed === "right"
          ? { r: 0, g: 0, b: 0, a: 0 }
          : toolParameters.foregroundColor; // fallback a foreground

      drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
        const canvas = ctx.canvas;
        const width = toolParameters?.width || 1;
        const blur = toolParameters.blur || 0;
        const paintMode = toolParameters?.paintMode || "manual";
        const velocitySensibility = toolParameters?.velocitySensibility || 0;

        // Nuevos parámetros para brocha personalizada
        const useCustomBrush = toolParameters?.customBrush || false;
        const customBrushType = toolParameters?.customBrushType;

        // MODIFICACIÓN PRINCIPAL: Procesar datos de brocha con el color seleccionado
        let customBrushData = [];
        if (
          useCustomBrush &&
          customBrushType &&
          toolParameters.processCustomBrushData
        ) {
          customBrushData =
            toolParameters.processCustomBrushData(selectedColor);
        }

        // Precalcular valores constantes
        const maxRadius = width / 2;
        const halfWidth = Math.floor(width / 2);

        // Límites del viewport para optimización
        const xMin = viewportOffset.x;
        const xMax = viewportOffset.x + viewportWidth;
        const yMin = viewportOffset.y;
        const yMax = viewportOffset.y + viewportHeight;

        // Configuración de espejo
        const hasBounds =
          mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);

        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);

        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);

        const adjustment = -1;
        const imparAdjustmentHeight = drawableWidth % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;

        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;

        // Función optimizada para calcular opacidad basada en velocidad
        const calculateOpacity = (currentX, currentY, lastX, lastY) => {
          if (velocitySensibility === 0) {
            const widthFactor = Math.max(1, width / 8);
            return selectedColor.a / widthFactor;
          }

          const distance = Math.sqrt(
            (currentX - lastX) ** 2 + (currentY - lastY) ** 2
          );
          const sensitivityCurve = ((11 - velocitySensibility) / 10) ** 1.5;
          const maxDistance = 200 * sensitivityCurve;
          const normalizedVelocity = Math.min(distance / maxDistance, 1);

          const widthCompensation = Math.max(1, width / 6);
          const baseOpacity = selectedColor.a / widthCompensation;
          const velocityReduction = normalizedVelocity * 0.8;
          const finalOpacity = baseOpacity * (1 - velocityReduction);
          const minOpacity = baseOpacity * 0.05;

          return Math.max(finalOpacity, minOpacity);
        };

        // Función para dibujar brocha personalizada CORREGIDA
        const drawCustomBrush = (centerX, centerY, opacity = 1) => {
          if (!useCustomBrush || !customBrushData.length) return false;

          for (const pixel of customBrushData) {
            const pixelX = centerX + pixel.x;
            const pixelY = centerY + pixel.y;

            // Validar que esté dentro del canvas completo, no solo del viewport
            if (
              pixelX < 0 ||
              pixelX >= canvas.width ||
              pixelY < 0 ||
              pixelY >= canvas.height
            )
              continue;

            if (paintMode === "composite") {
              ctx.globalAlpha = opacity * (pixel.color.a / 255);
              ctx.fillStyle = `rgba(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b}, ${pixel.color.a})`;
              ctx.fillRect(pixelX, pixelY, 1, 1);
            } else {
              // Modo manual - modificar ImageData directamente
              const imageData = ctx.getImageData(pixelX, pixelY, 1, 1);
              const data = imageData.data;
              data[0] = pixel.color.r;
              data[1] = pixel.color.g;
              data[2] = pixel.color.b;
              data[3] = pixel.color.a * opacity;
              ctx.putImageData(imageData, pixelX, pixelY);
            }
          }
          return true;
        };

        // Función para dibujar brocha personalizada con espejos CORREGIDA
        const drawCustomBrushWithMirrors = (x, y, opacity = 1) => {
          // Siempre dibujar todos los puntos, la validación se hace en drawCustomBrush
          drawCustomBrush(x, y, opacity);

          if (mirrorState.vertical) {
            drawCustomBrush(x, reflectVertical(y), opacity);
          }
          if (mirrorState.horizontal) {
            drawCustomBrush(reflectHorizontal(x), y, opacity);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawCustomBrush(reflectHorizontal(x), reflectVertical(y), opacity);
          }
        };

        // Si se usa brocha personalizada, usar la lógica personalizada
        if (useCustomBrush && customBrushData.length > 0) {
          const originalComposite = ctx.globalCompositeOperation;

          if (paintMode === "composite") {
            ctx.globalCompositeOperation = "source-over";
          }

          if (!lastPixelRef.current) {
            drawCustomBrushWithMirrors(canvasCoords.x, canvasCoords.y, 1.0);
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );

            // Algoritmo de Bresenham para interpolar entre puntos
            let x0 = last.x,
              y0 = last.y;
            let x1 = canvasCoords.x,
              y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0),
              dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1,
              sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let prevX = x0,
              prevY = y0;

            while (true) {
              const opacity = calculateOpacity(x0, y0, prevX, prevY);
              drawCustomBrushWithMirrors(x0, y0, opacity);

              if (x0 === x1 && y0 === y1) break;

              prevX = x0;
              prevY = y0;

              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }

          if (paintMode === "composite") {
            ctx.globalCompositeOperation = originalComposite;
            ctx.globalAlpha = 1;
          }

          return; // Salir temprano si se usó brocha personalizada
        }

        // Lógica original para brochas estándar
        if (paintMode === "composite") {
          // MODO COMPOSITE OPTIMIZADO Y CORREGIDO
          const originalComposite = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "source-over";

          const drawDot = (x, y, opacity = 1) => {
            // Validar que esté dentro del canvas completo, no solo del viewport
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height)
              return;

            ctx.globalAlpha = opacity;
            ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;

            if (blur === 0) {
              // Sin blur: rectángulo simple
              ctx.fillRect(x - halfWidth, y - halfWidth, width, width);
            } else {
              // Con blur: gradiente optimizado
              const coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
              const gradient = ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                maxRadius
              );

              const coreStop = coreRadius / maxRadius;
              const coreColor = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;
              const edgeColor = `rgba(${selectedColor.r}, ${selectedColor.g}, ${
                selectedColor.b
              }, ${selectedColor.a * 0.1})`;

              gradient.addColorStop(0, coreColor);
              gradient.addColorStop(coreStop, coreColor);
              gradient.addColorStop(1, edgeColor);

              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(x, y, maxRadius, 0, 2 * Math.PI);
              ctx.fill();
            }
          };

          const drawWithMirrors = (x, y, opacity = 1) => {
            // Siempre dibujar todos los puntos, la validación se hace en drawDot
            drawDot(x, y, opacity);

            if (mirrorState.vertical) {
              drawDot(x, reflectVertical(y), opacity);
            }
            if (mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), y, opacity);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), reflectVertical(y), opacity);
            }
          };

          if (!lastPixelRef.current) {
            drawWithMirrors(canvasCoords.x, canvasCoords.y, 1.0);
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );

            // Algoritmo de Bresenham optimizado
            let x0 = last.x,
              y0 = last.y;
            let x1 = canvasCoords.x,
              y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0),
              dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1,
              sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let prevX = x0,
              prevY = y0;

            while (true) {
              const opacity = calculateOpacity(x0, y0, prevX, prevY);
              drawWithMirrors(x0, y0, opacity);

              if (x0 === x1 && y0 === y1) break;

              prevX = x0;
              prevY = y0;

              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }

          ctx.globalCompositeOperation = originalComposite;
          ctx.globalAlpha = 1;
        } else {
          // MODO MANUAL ULTRA-OPTIMIZADO Y CORREGIDO
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const canvasWidth = canvas.width;

          // Precalcular valores para blur
          let coreRadius, blurEnabled;
          if (blur > 0) {
            coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
            blurEnabled = true;
          } else {
            blurEnabled = false;
          }

          const drawDot = (x, y) => {
            // Validar que esté dentro del canvas completo, no solo del viewport
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height)
              return;

            const startX = x - halfWidth;
            const startY = y - halfWidth;

            if (!blurEnabled) {
              // Sin blur: optimización máxima con loop desenrollado cuando es posible
              const endX = Math.min(startX + width, canvas.width);
              const endY = Math.min(startY + width, canvas.height);
              const actualStartX = Math.max(startX, 0);
              const actualStartY = Math.max(startY, 0);

              for (let py = actualStartY; py < endY; py++) {
                const rowIndex = py * canvasWidth * 4;
                for (let px = actualStartX; px < endX; px++) {
                  const index = rowIndex + px * 4;
                  data[index] = selectedColor.r;
                  data[index + 1] = selectedColor.g;
                  data[index + 2] = selectedColor.b;
                  data[index + 3] = selectedColor.a * 255;
                }
              }
            } else {
              // Con blur: optimizado con precálculos
              const maxRadiusSquared = maxRadius * maxRadius;
              const coreRadiusSquared = coreRadius * coreRadius;
              const blurRange = maxRadius - coreRadius;
              const minAlpha = selectedColor.a * 0.1;
              const alphaRange = selectedColor.a - minAlpha;

              for (let dy = 0; dy < width; dy++) {
                for (let dx = 0; dx < width; dx++) {
                  const px = startX + dx;
                  const py = startY + dy;

                  if (
                    px < 0 ||
                    px >= canvas.width ||
                    py < 0 ||
                    py >= canvas.height
                  )
                    continue;

                  // Calcular distancia al cuadrado (evitar sqrt cuando sea posible)
                  const deltaX = px - x;
                  const deltaY = py - y;
                  const distanceSquared = deltaX * deltaX + deltaY * deltaY;

                  if (distanceSquared > maxRadiusSquared) continue;

                  let alpha;
                  if (distanceSquared <= coreRadiusSquared) {
                    alpha = selectedColor.a;
                  } else {
                    const distance = Math.sqrt(distanceSquared);
                    const blurProgress = (distance - coreRadius) / blurRange;
                    alpha = selectedColor.a * (1 - blurProgress * 0.9); // 0.9 = (1 - 0.1)
                  }

                  const index = (py * canvasWidth + px) * 4;
                  data[index] = selectedColor.r;
                  data[index + 1] = selectedColor.g;
                  data[index + 2] = selectedColor.b;
                  data[index + 3] = alpha * 255;
                }
              }
            }
          };

          const drawWithMirrors = (x, y) => {
            // Siempre dibujar todos los puntos, la validación se hace en drawDot
            drawDot(x, y);

            if (mirrorState.vertical) {
              drawDot(x, reflectVertical(y));
            }
            if (mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), y);
            }
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDot(reflectHorizontal(x), reflectVertical(y));
            }
          };

          if (!lastPixelRef.current) {
            drawWithMirrors(canvasCoords.x, canvasCoords.y);
          } else {
            const last = viewportToCanvasCoords(
              lastPixelRef.current.x,
              lastPixelRef.current.y
            );

            // Bresenham optimizado
            let x0 = last.x,
              y0 = last.y;
            let x1 = canvasCoords.x,
              y1 = canvasCoords.y;
            let dx = Math.abs(x1 - x0),
              dy = -Math.abs(y1 - y0);
            let sx = x0 < x1 ? 1 : -1,
              sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;

            while (true) {
              drawWithMirrors(x0, y0);
              if (x0 === x1 && y0 === y1) break;

              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x0 += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y0 += sy;
              }
            }
          }

          // Una sola llamada a putImageData al final
          ctx.putImageData(imageData, 0, 0);
        }
      }));
    }
    if (tool === TOOLS.blurFinger) {
      drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
        const canvas = ctx.canvas;
        const width = toolParameters?.width || 5;
        const intensity = toolParameters?.blurIntensity || 0.5; // 0.1 a 1.0
        const blurRadius = toolParameters?.blurRadius || 1; // Radio del blur
    
        // Configuración de espejo
        const hasBounds = mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
           mirrorState.bounds.y2 > mirrorState.bounds.y1);
    
        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);
    
        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);
    
        const adjustment = -1;
        const imparAdjustmentHeight = drawableWidth % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
    
        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;
    
        // Función para aplicar blur a una región específica
        const applyBlurAt = (centerX, centerY) => {
          const halfWidth = Math.floor(width / 2);
          const regionX = Math.max(0, centerX - halfWidth);
          const regionY = Math.max(0, centerY - halfWidth);
          const regionWidth = Math.min(width, canvas.width - regionX);
          const regionHeight = Math.min(width, canvas.height - regionY);
    
          // Validar que la región tenga tamaño válido
          if (regionWidth <= 0 || regionHeight <= 0) return;
    
          // Obtener los datos de imagen de la región
          const imageData = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);
          const data = imageData.data;
          const newData = new Uint8ClampedArray(data);
    
          // Aplicar filtro de difuminado solo en el área válida
          for (let y = blurRadius; y < regionHeight - blurRadius; y++) {
            for (let x = blurRadius; x < regionWidth - blurRadius; x++) {
              let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
              let count = 0;
    
              // Promediar los píxeles vecinos
              for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                  const sampleX = x + dx;
                  const sampleY = y + dy;
                  
                  if (sampleX >= 0 && sampleX < regionWidth && 
                      sampleY >= 0 && sampleY < regionHeight) {
                    const sampleIndex = (sampleY * regionWidth + sampleX) * 4;
                    totalR += data[sampleIndex];
                    totalG += data[sampleIndex + 1];
                    totalB += data[sampleIndex + 2];
                    totalA += data[sampleIndex + 3];
                    count++;
                  }
                }
              }
    
              if (count > 0) {
                const avgR = totalR / count;
                const avgG = totalG / count;
                const avgB = totalB / count;
                const avgA = totalA / count;
    
                const pixelIndex = (y * regionWidth + x) * 4;
                const originalR = data[pixelIndex];
                const originalG = data[pixelIndex + 1];
                const originalB = data[pixelIndex + 2];
                const originalA = data[pixelIndex + 3];
    
                // Mezclar el color original con el promedio según la intensidad
                newData[pixelIndex] = originalR + (avgR - originalR) * intensity;
                newData[pixelIndex + 1] = originalG + (avgG - originalG) * intensity;
                newData[pixelIndex + 2] = originalB + (avgB - originalB) * intensity;
                newData[pixelIndex + 3] = originalA + (avgA - originalA) * intensity;
              }
            }
          }
    
          // Aplicar los datos modificados de vuelta al canvas
          const blurredImageData = new ImageData(newData, regionWidth, regionHeight);
          ctx.putImageData(blurredImageData, regionX, regionY);
        };
    
        // Función para aplicar blur con espejos
        const applyBlurWithMirrors = (x, y) => {
          applyBlurAt(x, y);
    
          if (mirrorState.vertical) {
            applyBlurAt(x, reflectVertical(y));
          }
          if (mirrorState.horizontal) {
            applyBlurAt(reflectHorizontal(x), y);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            applyBlurAt(reflectHorizontal(x), reflectVertical(y));
          }
        };
    
        if (!lastPixelRef.current) {
          // Primer punto del trazo
          applyBlurWithMirrors(canvasCoords.x, canvasCoords.y);
        } else {
          // Interpolar entre el último punto y el actual usando Bresenham
          const last = viewportToCanvasCoords(
            lastPixelRef.current.x,
            lastPixelRef.current.y
          );
    
          let x0 = last.x, y0 = last.y;
          let x1 = canvasCoords.x, y1 = canvasCoords.y;
          let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
          let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;
    
          const step = Math.max(1, Math.floor(width / 3)); // Controlar frecuencia del blur
          let stepCount = 0;
    
          while (true) {
            if (stepCount % step === 0) {
              applyBlurWithMirrors(x0, y0);
            }
            stepCount++;
    
            if (x0 === x1 && y0 === y1) break;
    
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        }
      }));
    }
    if (tool === TOOLS.deblur) {
      drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
        const canvas = ctx.canvas;
        const width = toolParameters?.width || 5;
        const intensity = toolParameters?.deblurIntensity || 0.5; // 0.1 a 1.0
        const sharpening = toolParameters?.sharpeningStrength || 1.5; // Factor de nitidez
    
        // Configuración de espejo
        const hasBounds = mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
           mirrorState.bounds.y2 > mirrorState.bounds.y1);
    
        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);
    
        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);
    
        const adjustment = -1;
        const imparAdjustmentHeight = drawableWidth % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
    
        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;
    
        // Función para aplicar deblur (aumento de nitidez) a una región específica
        const applyDeblurAt = (centerX, centerY) => {
          const halfWidth = Math.floor(width / 2);
          const regionX = Math.max(0, centerX - halfWidth);
          const regionY = Math.max(0, centerY - halfWidth);
          const regionWidth = Math.min(width, canvas.width - regionX);
          const regionHeight = Math.min(width, canvas.height - regionY);
    
          // Validar que la región tenga tamaño válido
          if (regionWidth <= 0 || regionHeight <= 0) return;
    
          // Obtener los datos de imagen de la región
          const imageData = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);
          const data = imageData.data;
          const newData = new Uint8ClampedArray(data);
    
          // Aplicar filtro de nitidez (unsharp mask simplificado)
          for (let y = 1; y < regionHeight - 1; y++) {
            for (let x = 1; x < regionWidth - 1; x++) {
              for (let channel = 0; channel < 3; channel++) { // RGB, no alpha
                const centerIndex = (y * regionWidth + x) * 4 + channel;
                const centerValue = data[centerIndex];
    
                // Calcular el promedio de los píxeles adyacentes (filtro de blur)
                let sum = 0;
                let count = 0;
    
                // Núcleo de convolución 3x3 para blur
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const neighborY = y + dy;
                    const neighborX = x + dx;
                    
                    if (neighborX >= 0 && neighborX < regionWidth && 
                        neighborY >= 0 && neighborY < regionHeight) {
                      const neighborIndex = (neighborY * regionWidth + neighborX) * 4 + channel;
                      sum += data[neighborIndex];
                      count++;
                    }
                  }
                }
    
                const blurredValue = sum / count;
                
                // Aplicar unsharp mask: original + intensity * (original - blurred)
                const sharpenedValue = centerValue + intensity * sharpening * (centerValue - blurredValue);
                
                // Clamp a rango válido [0, 255]
                newData[centerIndex] = Math.max(0, Math.min(255, sharpenedValue));
              }
              
              // Mantener el canal alpha sin cambios
              const alphaIndex = (y * regionWidth + x) * 4 + 3;
              newData[alphaIndex] = data[alphaIndex];
            }
          }
    
          // Aplicar los datos modificados de vuelta al canvas
          const sharpenedImageData = new ImageData(newData, regionWidth, regionHeight);
          ctx.putImageData(sharpenedImageData, regionX, regionY);
        };
    
        // Función para aplicar deblur con espejos
        const applyDeblurWithMirrors = (x, y) => {
          applyDeblurAt(x, y);
    
          if (mirrorState.vertical) {
            applyDeblurAt(x, reflectVertical(y));
          }
          if (mirrorState.horizontal) {
            applyDeblurAt(reflectHorizontal(x), y);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            applyDeblurAt(reflectHorizontal(x), reflectVertical(y));
          }
        };
    
        if (!lastPixelRef.current) {
          // Primer punto del trazo
          applyDeblurWithMirrors(canvasCoords.x, canvasCoords.y);
        } else {
          // Interpolar entre el último punto y el actual usando Bresenham
          const last = viewportToCanvasCoords(
            lastPixelRef.current.x,
            lastPixelRef.current.y
          );
    
          let x0 = last.x, y0 = last.y;
          let x1 = canvasCoords.x, y1 = canvasCoords.y;
          let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
          let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;
    
          const step = Math.max(1, Math.floor(width / 3)); // Controlar frecuencia del sharpening
          let stepCount = 0;
    
          while (true) {
            if (stepCount % step === 0) {
              applyDeblurWithMirrors(x0, y0);
            }
            stepCount++;
    
            if (x0 === x1 && y0 === y1) break;
    
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        }
      }));
    }
    
    if (tool === TOOLS.smudge) {
      drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
        const canvas = ctx.canvas;
        const width = toolParameters?.width || 5;
        const strength = toolParameters?.smudgeStrength || 0.8;
        const flow = toolParameters?.smudgeFlow || 0.5;
    
        // Configuración de espejo
        const hasBounds = mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
           mirrorState.bounds.y2 > mirrorState.bounds.y1);
    
        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);
    
        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);
    
        const adjustment = -1;
        const imparAdjustmentHeight = drawableWidth % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
    
        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;
    
        // Función para aplicar smudge en una posición específica
        const applySmudgeAt = (smudgeX, smudgeY, isFirstStroke = false) => {
          const halfWidth = Math.floor(width / 2);
          const regionX = Math.max(0, smudgeX - halfWidth);
          const regionY = Math.max(0, smudgeY - halfWidth);
          const regionWidth = Math.min(width, canvas.width - regionX);
          const regionHeight = Math.min(width, canvas.height - regionY);
    
          if (regionWidth <= 0 || regionHeight <= 0) return;
    
          // Crear clave única para este punto de smudge
          const smudgeKey = `${Math.floor(smudgeX / 10)}-${Math.floor(smudgeY / 10)}`;
          
          if (isFirstStroke) {
            // Al comenzar un nuevo trazo, "recoger" los colores del área inicial
            const pickupArea = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);
            smudgeBufferRef.current.set(smudgeKey, {
              colors: Array.from(pickupArea.data),
              width: regionWidth,
              height: regionHeight,
              timestamp: Date.now()
            });
            return; // No pintar en el primer punto, solo recoger color
          }
    
          // Obtener colores actuales del área
          const currentArea = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);
    
          // Obtener el buffer de colores (los que "lleva" la herramienta)
          let smudgeColors = smudgeBufferRef.current.get(smudgeKey);
          if (!smudgeColors || smudgeColors.width !== regionWidth || smudgeColors.height !== regionHeight) {
            // Si no hay buffer o el tamaño no coincide, usar los colores actuales
            smudgeColors = {
              colors: Array.from(currentArea.data),
              width: regionWidth,
              height: regionHeight,
              timestamp: Date.now()
            };
          }
    
          const newImageData = ctx.createImageData(regionWidth, regionHeight);
          const newData = newImageData.data;
    
          // Aplicar el efecto smudge
          for (let i = 0; i < currentArea.data.length; i += 4) {
            const pixelIndex = i / 4;
            const x = pixelIndex % regionWidth;
            const y = Math.floor(pixelIndex / regionWidth);
            
            // Calcular distancia desde el centro para crear un pincel suave
            const distanceFromCenter = Math.sqrt(
              Math.pow(x - regionWidth/2, 2) + Math.pow(y - regionHeight/2, 2)
            );
            const maxDistance = Math.min(regionWidth, regionHeight) / 2;
            const brushInfluence = Math.max(0, 1 - (distanceFromCenter / maxDistance));
            
            if (brushInfluence > 0) {
              // Color actual en esta posición
              const currentR = currentArea.data[i];
              const currentG = currentArea.data[i + 1];
              const currentB = currentArea.data[i + 2];
              const currentA = currentArea.data[i + 3];
    
              // Color del buffer (lo que "lleva" la herramienta)
              const smudgeR = smudgeColors.colors[i] || currentR;
              const smudgeG = smudgeColors.colors[i + 1] || currentG;
              const smudgeB = smudgeColors.colors[i + 2] || currentB;
              const smudgeA = smudgeColors.colors[i + 3] || currentA;
    
              // Mezclar colores según strength y brushInfluence
              const finalStrength = strength * brushInfluence;
              
              newData[i] = currentR + (smudgeR - currentR) * finalStrength;
              newData[i + 1] = currentG + (smudgeG - currentG) * finalStrength;
              newData[i + 2] = currentB + (smudgeB - currentB) * finalStrength;
              newData[i + 3] = currentA + (smudgeA - currentA) * finalStrength;
    
              // Actualizar el buffer con nueva mezcla de colores
              const flowAmount = flow * brushInfluence;
              smudgeColors.colors[i] = smudgeR + (currentR - smudgeR) * flowAmount;
              smudgeColors.colors[i + 1] = smudgeG + (currentG - smudgeG) * flowAmount;
              smudgeColors.colors[i + 2] = smudgeB + (currentB - smudgeB) * flowAmount;
              smudgeColors.colors[i + 3] = smudgeA + (currentA - smudgeA) * flowAmount;
            } else {
              // Fuera del área de influencia, mantener color original
              newData[i] = currentArea.data[i];
              newData[i + 1] = currentArea.data[i + 1];
              newData[i + 2] = currentArea.data[i + 2];
              newData[i + 3] = currentArea.data[i + 3];
            }
          }
    
          // Aplicar los nuevos datos al canvas
          ctx.putImageData(newImageData, regionX, regionY);
          
          // Actualizar el buffer
          smudgeBufferRef.current.set(smudgeKey, smudgeColors);
        };
    
        // Función para aplicar smudge con espejos
        const applySmudgeWithMirrors = (x, y, isFirst = false) => {
          applySmudgeAt(x, y, isFirst);
    
          if (mirrorState.vertical) {
            applySmudgeAt(x, reflectVertical(y), isFirst);
          }
          if (mirrorState.horizontal) {
            applySmudgeAt(reflectHorizontal(x), y, isFirst);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            applySmudgeAt(reflectHorizontal(x), reflectVertical(y), isFirst);
          }
        };
    
        if (!lastPixelRef.current) {
          // Primer punto: solo recoger color, no pintar
          applySmudgeWithMirrors(canvasCoords.x, canvasCoords.y, true);
        } else {
          // Interpolar entre el último punto y el actual
          const last = viewportToCanvasCoords(
            lastPixelRef.current.x,
            lastPixelRef.current.y
          );
    
          let x0 = last.x, y0 = last.y;
          let x1 = canvasCoords.x, y1 = canvasCoords.y;
          let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
          let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;
    
          while (true) {
            applySmudgeWithMirrors(x0, y0, false);
    
            if (x0 === x1 && y0 === y1) break;
    
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        }
      }));
    }
    
 

    if (tool === TOOLS.erase) {
      drawOnLayer(activeLayerId, withIsolationCheck((ctx) => {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,1)";

        if (!lastPixelRef.current) {
          drawBrush(ctx, canvasCoords, toolParameters.width);
        } else {
          const lastCanvasCoords = viewportToCanvasCoords(
            lastPixelRef.current.x,
            lastPixelRef.current.y
          );

          drawPixelLine(
            ctx,
            lastCanvasCoords.x,
            lastCanvasCoords.y,
            canvasCoords.x,
            canvasCoords.y,
            toolParameters.width
          );
        }
      }));
    }

    lastPixelRef.current = viewportPixelCoords;
  }, [
    isPressed,
    relativeToTarget,
    activeLayerId,
    drawOnLayer,
    viewportToCanvasCoords,
    drawMode,
    tool,
    toolParameters,
    zoom,
    color,
    curveState,
    mirrorState,
    isSpacePressed,
  ]);



  // Efecto para manejar navegación con teclado
  // Reemplaza el useEffect existente para manejar navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        // Cambiar cursor temporalmente
       
        return;
      }

      // Solo permitir navegación con flechas si no se está presionando espacio
      if (!isSpacePressed) {
        const step = 1;
        switch (e.key) {
          case "ArrowRight":
            moveViewport(step, 0);
            break;
          case "ArrowLeft":
            moveViewport(-step, 0);
            break;
          case "ArrowDown":
            moveViewport(0, step);
            break;
          case "ArrowUp":
            moveViewport(0, -step);
            break;
          case "d":
            setDrawMode("draw");
            break;
          case "e":
            setDrawMode("erase");
            break;
        }
      }
    };

    const handleKeyUp = (e) => {
      if (activeAI) return;
      if (e.code === "Space" && isSpacePressed) {
        //e.preventDefault();
        setIsSpacePressed(false);
        // Restaurar cursor original
        
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [moveViewport, isSpacePressed, drawMode]);

  // Efecto para manejar el canvas de preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (relativeToTarget.x && relativeToTarget.y) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(
        viewportPixelCoords.x,
        viewportPixelCoords.y
      );

      if (tool === TOOLS.curve) {
        ctx.save();

        // Calcular centro basado en bounds (igual que en paint)
        const hasBounds =
          mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);

        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);

        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);

        // Ajustes para dimensiones impares (igual que en paint)
        const adjustment = -1;
        const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;

        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;

        if (curveState === "first-point" && curveStartRef.current) {
          const drawPointPreview = (point) => {
            const screenX = (point.x - viewportOffset.x) * zoom;
            const screenY = (point.y - viewportOffset.y) * zoom;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          };

          const drawPreviewLine = (x0, y0, x1, y1) => {
            const dx = Math.abs(x1 - x0);
            const dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let x = x0,
              y = y0;

            const offset = Math.floor(toolParameters.width / 2);

            while (true) {
              for (let dy = 0; dy < toolParameters.width; dy++) {
                for (let dx = 0; dx < toolParameters.width; dx++) {
                  const px = x + dx - offset;
                  const py = y + dy - offset;
                  const screenX = (px - viewportOffset.x) * zoom;
                  const screenY = (py - viewportOffset.y) * zoom;

                  if (screenX >= 0 && screenY >= 0) {
                    ctx.fillRect(
                      Math.floor(screenX),
                      Math.floor(screenY),
                      zoom,
                      zoom
                    );
                  }
                }
              }

              if (x === x1 && y === y1) break;
              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y += sy;
              }
            }
          };

          // Punto de inicio original
          ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.7)`;
          drawPointPreview(curveStartRef.current);

          // Puntos de inicio reflejados
          if (mirrorState.vertical) {
            drawPointPreview({
              x: curveStartRef.current.x,
              y: reflectVertical(curveStartRef.current.y),
            });
          }
          if (mirrorState.horizontal) {
            drawPointPreview({
              x: reflectHorizontal(curveStartRef.current.x),
              y: curveStartRef.current.y,
            });
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPointPreview({
              x: reflectHorizontal(curveStartRef.current.x),
              y: reflectVertical(curveStartRef.current.y),
            });
          }

          ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.7)`;

          // Línea original
          drawPreviewLine(
            curveStartRef.current.x,
            curveStartRef.current.y,
            canvasCoords.x,
            canvasCoords.y
          );

          // Líneas reflejadas
          if (mirrorState.vertical) {
            drawPreviewLine(
              curveStartRef.current.x,
              reflectVertical(curveStartRef.current.y),
              canvasCoords.x,
              reflectVertical(canvasCoords.y)
            );
          }
          if (mirrorState.horizontal) {
            drawPreviewLine(
              reflectHorizontal(curveStartRef.current.x),
              curveStartRef.current.y,
              reflectHorizontal(canvasCoords.x),
              canvasCoords.y
            );
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPreviewLine(
              reflectHorizontal(curveStartRef.current.x),
              reflectVertical(curveStartRef.current.y),
              reflectHorizontal(canvasCoords.x),
              reflectVertical(canvasCoords.y)
            );
          }
        } else if (
          curveState === "setting-control" &&
          curveStartRef.current &&
          curveEndRef.current
        ) {
          const drawPreviewCurve = (start, end, control, width) => {
            const distance = Math.max(
              Math.abs(end.x - start.x) + Math.abs(end.y - start.y),
              Math.abs(control.x - start.x) + Math.abs(control.y - start.y),
              Math.abs(control.x - end.x) + Math.abs(control.y - end.y)
            );

            const steps = Math.max(distance * 3, 50);
            const points = [];

            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const x = Math.round(
                (1 - t) * (1 - t) * start.x +
                  2 * (1 - t) * t * control.x +
                  t * t * end.x
              );
              const y = Math.round(
                (1 - t) * (1 - t) * start.y +
                  2 * (1 - t) * t * control.y +
                  t * t * end.y
              );
              points.push({ x, y });
            }

            const offset = Math.floor(width / 2);
            const drawnPixels = new Set();

            const drawPreviewPixelLine = (x0, y0, x1, y1) => {
              const dx = Math.abs(x1 - x0);
              const dy = -Math.abs(y1 - y0);
              const sx = x0 < x1 ? 1 : -1;
              const sy = y0 < y1 ? 1 : -1;
              let err = dx + dy;
              let x = x0,
                y = y0;

              while (true) {
                for (let brushY = 0; brushY < width; brushY++) {
                  for (let brushX = 0; brushX < width; brushX++) {
                    const px = x + brushX - offset;
                    const py = y + brushY - offset;
                    const key = `${px},${py}`;

                    if (!drawnPixels.has(key)) {
                      const screenX = (px - viewportOffset.x) * zoom;
                      const screenY = (py - viewportOffset.y) * zoom;

                      if (screenX >= 0 && screenY >= 0) {
                        ctx.fillRect(
                          Math.floor(screenX),
                          Math.floor(screenY),
                          zoom,
                          zoom
                        );
                        drawnPixels.add(key);
                      }
                    }
                  }
                }

                if (x === x1 && y === y1) break;
                const e2 = 2 * err;
                if (e2 >= dy) {
                  err += dy;
                  x += sx;
                }
                if (e2 <= dx) {
                  err += dx;
                  y += sy;
                }
              }
            };

            for (let i = 0; i < points.length - 1; i++) {
              const current = points[i];
              const next = points[i + 1];

              if (current.x !== next.x || current.y !== next.y) {
                drawPreviewPixelLine(current.x, current.y, next.x, next.y);
              }
            }

            [start, end].forEach((point) => {
              for (let brushY = 0; brushY < width; brushY++) {
                for (let brushX = 0; brushX < width; brushX++) {
                  const px = point.x + brushX - offset;
                  const py = point.y + brushY - offset;
                  const key = `${px},${py}`;

                  if (!drawnPixels.has(key)) {
                    const screenX = (px - viewportOffset.x) * zoom;
                    const screenY = (py - viewportOffset.y) * zoom;

                    if (screenX >= 0 && screenY >= 0) {
                      ctx.fillRect(
                        Math.floor(screenX),
                        Math.floor(screenY),
                        zoom,
                        zoom
                      );
                      drawnPixels.add(key);
                    }
                  }
                }
              }
            });
          };

          const drawPointPreview = (point, fillStyle) => {
            const screenX = (point.x - viewportOffset.x) * zoom;
            const screenY = (point.y - viewportOffset.y) * zoom;
            ctx.fillStyle = fillStyle;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), zoom, zoom);
          };

          const drawPreviewLine = (x0, y0, x1, y1) => {
            const dx = Math.abs(x1 - x0);
            const dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            let x = x0,
              y = y0;

            const offset = Math.floor(toolParameters.width / 2);

            while (true) {
              for (let dy = 0; dy < toolParameters.width; dy++) {
                for (let dx = 0; dx < toolParameters.width; dx++) {
                  const px = x + dx - offset;
                  const py = y + dy - offset;
                  const screenX = (px - viewportOffset.x) * zoom;
                  const screenY = (py - viewportOffset.y) * zoom;

                  if (screenX >= 0 && screenY >= 0) {
                    ctx.fillRect(
                      Math.floor(screenX),
                      Math.floor(screenY),
                      zoom,
                      zoom
                    );
                  }
                }
              }

              if (x === x1 && y === y1) break;
              const e2 = 2 * err;
              if (e2 >= dy) {
                err += dy;
                x += sx;
              }
              if (e2 <= dx) {
                err += dx;
                y += sy;
              }
            }
          };

          ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.7)`;

          // Curva original
          drawPreviewCurve(
            curveStartRef.current,
            curveEndRef.current,
            canvasCoords,
            toolParameters.width
          );

          // Curvas reflejadas
          if (mirrorState.vertical) {
            drawPreviewCurve(
              {
                x: curveStartRef.current.x,
                y: reflectVertical(curveStartRef.current.y),
              },
              {
                x: curveEndRef.current.x,
                y: reflectVertical(curveEndRef.current.y),
              },
              { x: canvasCoords.x, y: reflectVertical(canvasCoords.y) },
              toolParameters.width
            );
          }
          if (mirrorState.horizontal) {
            drawPreviewCurve(
              {
                x: reflectHorizontal(curveStartRef.current.x),
                y: curveStartRef.current.y,
              },
              {
                x: reflectHorizontal(curveEndRef.current.x),
                y: curveEndRef.current.y,
              },
              { x: reflectHorizontal(canvasCoords.x), y: canvasCoords.y },
              toolParameters.width
            );
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPreviewCurve(
              {
                x: reflectHorizontal(curveStartRef.current.x),
                y: reflectVertical(curveStartRef.current.y),
              },
              {
                x: reflectHorizontal(curveEndRef.current.x),
                y: reflectVertical(curveEndRef.current.y),
              },
              {
                x: reflectHorizontal(canvasCoords.x),
                y: reflectVertical(canvasCoords.y),
              },
              toolParameters.width
            );
          }

          // Líneas de guía originales
          ctx.fillStyle = "rgba(234, 0, 255, 0.2)";
          drawPreviewLine(
            curveStartRef.current.x,
            curveStartRef.current.y,
            canvasCoords.x,
            canvasCoords.y
          );
          drawPreviewLine(
            curveEndRef.current.x,
            curveEndRef.current.y,
            canvasCoords.x,
            canvasCoords.y
          );

          // Líneas de guía reflejadas
          if (mirrorState.vertical) {
            drawPreviewLine(
              curveStartRef.current.x,
              reflectVertical(curveStartRef.current.y),
              canvasCoords.x,
              reflectVertical(canvasCoords.y)
            );
            drawPreviewLine(
              curveEndRef.current.x,
              reflectVertical(curveEndRef.current.y),
              canvasCoords.x,
              reflectVertical(canvasCoords.y)
            );
          }
          if (mirrorState.horizontal) {
            drawPreviewLine(
              reflectHorizontal(curveStartRef.current.x),
              curveStartRef.current.y,
              reflectHorizontal(canvasCoords.x),
              canvasCoords.y
            );
            drawPreviewLine(
              reflectHorizontal(curveEndRef.current.x),
              curveEndRef.current.y,
              reflectHorizontal(canvasCoords.x),
              canvasCoords.y
            );
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPreviewLine(
              reflectHorizontal(curveStartRef.current.x),
              reflectVertical(curveStartRef.current.y),
              reflectHorizontal(canvasCoords.x),
              reflectVertical(canvasCoords.y)
            );
            drawPreviewLine(
              reflectHorizontal(curveEndRef.current.x),
              reflectVertical(curveEndRef.current.y),
              reflectHorizontal(canvasCoords.x),
              reflectVertical(canvasCoords.y)
            );
          }

          // Puntos de control originales
          drawPointPreview(canvasCoords, "rgba(0, 150, 255, 0.8)");
          drawPointPreview(
            curveStartRef.current,
            `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
          );
          drawPointPreview(
            curveEndRef.current,
            `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
          );

          // Puntos de control reflejados
          if (mirrorState.vertical) {
            drawPointPreview(
              { x: canvasCoords.x, y: reflectVertical(canvasCoords.y) },
              "rgba(0, 150, 255, 0.8)"
            );
            drawPointPreview(
              {
                x: curveStartRef.current.x,
                y: reflectVertical(curveStartRef.current.y),
              },
              `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
            );
            drawPointPreview(
              {
                x: curveEndRef.current.x,
                y: reflectVertical(curveEndRef.current.y),
              },
              `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
            );
          }
          if (mirrorState.horizontal) {
            drawPointPreview(
              { x: reflectHorizontal(canvasCoords.x), y: canvasCoords.y },
              "rgba(0, 150, 255, 0.8)"
            );
            drawPointPreview(
              {
                x: reflectHorizontal(curveStartRef.current.x),
                y: curveStartRef.current.y,
              },
              `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
            );
            drawPointPreview(
              {
                x: reflectHorizontal(curveEndRef.current.x),
                y: curveEndRef.current.y,
              },
              `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
            );
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPointPreview(
              {
                x: reflectHorizontal(canvasCoords.x),
                y: reflectVertical(canvasCoords.y),
              },
              "rgba(0, 150, 255, 0.8)"
            );
            drawPointPreview(
              {
                x: reflectHorizontal(curveStartRef.current.x),
                y: reflectVertical(curveStartRef.current.y),
              },
              `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
            );
            drawPointPreview(
              {
                x: reflectHorizontal(curveEndRef.current.x),
                y: reflectVertical(curveEndRef.current.y),
              },
              `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
            );
          }
        }

        ctx.restore();
      } else if (tool === TOOLS.paint) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(
          ${toolParameters.fillColor.r},
          ${toolParameters.fillColor.g},
          ${toolParameters.fillColor.b},
          ${0.7}
        )`;
      } else if (tool === TOOLS.erase) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      } else if (tool === TOOLS.line && isPressed && lineStartRef.current) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );
        const selectedColor =
          isPressed === "left"
            ? toolParameters.foregroundColor
            : isPressed === "right"
            ? toolParameters.backgroundColor
            : toolParameters.foregroundColor; // fallback a foreground
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;
        const offset = Math.floor(toolParameters.width / 2);

        // Calcular centro basado en bounds (igual que en paint)
        const hasBounds =
          mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);

        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);

        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);

        // Ajustes para dimensiones impares (igual que en paint)
        const adjustment = -1;
        const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;

        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;

        const drawPreviewLine = (start, end) => {
          let x0 = start.x;
          let y0 = start.y;
          let x1 = end.x;
          let y1 = end.y;

          const dx = Math.abs(x1 - x0);
          const dy = -Math.abs(y1 - y0);
          const sx = x0 < x1 ? 1 : -1;
          const sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;

          while (true) {
            const drawDotAt = (px, py) => {
              const x = px - offset;
              const y = py - offset;

              const screenX = (x - viewportOffset.x) * zoom;
              const screenY = (y - viewportOffset.y) * zoom;

              ctx.fillRect(
                screenX,
                screenY,
                toolParameters.width * zoom,
                toolParameters.width * zoom
              );
            };

            // Punto original
            drawDotAt(x0, y0);

            // Espejo vertical (refleja Y)
            if (mirrorState.vertical) {
              drawDotAt(x0, reflectVertical(y0));
            }

            // Espejo horizontal (refleja X)
            if (mirrorState.horizontal) {
              drawDotAt(reflectHorizontal(x0), y0);
            }

            // Espejo diagonal (ambos ejes)
            if (mirrorState.vertical && mirrorState.horizontal) {
              drawDotAt(reflectHorizontal(x0), reflectVertical(y0));
            }

            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
              err += dy;
              x0 += sx;
            }
            if (e2 <= dx) {
              err += dx;
              y0 += sy;
            }
          }
        };

        drawPreviewLine(lineStartRef.current, currentCanvasCoords);
      } else if (tool === TOOLS.square && isPressed && squareStartRef.current) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );

        ctx.globalCompositeOperation = "source-over";

        // Obtener colores y configuración de los parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color; // Usar color principal como fallback
        const borderWidth = toolParameters.borderWidth || 0;
        const borderRadius = toolParameters.borderRadius || 0;

        drawPreviewRect(
          ctx,
          squareStartRef.current,
          currentCanvasCoords,
          borderRadius,
          borderWidth,
          borderColor,
          fillColor
        );
      } else if (
        tool === TOOLS.triangle &&
        isPressed &&
        triangleStartRef.current
      ) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );

        ctx.globalCompositeOperation = "source-over";

        // Obtener colores y configuración de los parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color; // Usar color principal como fallback
        const borderWidth = toolParameters.borderWidth || 0;

        drawPreviewTriangle(
          ctx,
          triangleStartRef.current,
          currentCanvasCoords,
          borderWidth,
          borderColor,
          fillColor
        );
      }

      // Después del bloque else if (tool === TOOLS.square && isPressed && squareStartRef.current), agregar:
      else if (tool === TOOLS.circle && isPressed && circleStartRef.current) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );

        ctx.globalCompositeOperation = "source-over";

        // Obtener colores y configuración de los parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color;
        const borderWidth = toolParameters.borderWidth || 0;

        drawPreviewCircle(
          ctx,
          circleStartRef.current,
          currentCanvasCoords,
          borderWidth,
          borderColor,
          fillColor
        );
      } else if (
        tool === TOOLS.ellipse &&
        isPressed &&
        ellipseStartRef.current
      ) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );

        ctx.globalCompositeOperation = "source-over";

        // Obtener colores y configuración de los parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color;
        const borderWidth = toolParameters.borderWidth || 0;

        drawPreviewEllipse(
          ctx,
          ellipseStartRef.current,
          currentCanvasCoords,
          borderWidth,
          borderColor,
          fillColor
        );
      } else if (
        tool === TOOLS.polygon &&
        isPressed &&
        polygonStartRef.current
      ) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const currentCanvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );

        ctx.globalCompositeOperation = "source-over";

        // Calcular centro y radio
        const centerX = polygonStartRef.current.x;
        const centerY = polygonStartRef.current.y;
        const dx = currentCanvasCoords.x - centerX;
        const dy = currentCanvasCoords.y - centerY;
        const radius = Math.sqrt(dx * dx + dy * dy);

        // Obtener parámetros de la herramienta
        const borderColor = toolParameters.borderColor || null;
        const fillColor = toolParameters.fillColor || color;
        const borderWidth = toolParameters.borderWidth || 0;
        const vertices = toolParameters.vertices || 6; // Default hexágono
        const rotation = ((toolParameters.rotation || 0) * Math.PI) / 180; // Convertir a radianes

        drawPreviewPolygon(
          ctx,
          centerX,
          centerY,
          radius,
          vertices,
          borderWidth,
          borderColor,
          fillColor,
          rotation
        );
      } 
      else if (tool === TOOLS.blurFinger) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(100, 200, 255, 0.4)"; // Color azul translúcido
        
        const width = toolParameters?.width || 3;
        const offset = Math.floor(width / 2);
        const x = canvasCoords.x - offset;
        const y = canvasCoords.y - offset;
        
        const screenX = (x - viewportOffset.x) * zoom;
        const screenY = (y - viewportOffset.y) * zoom;
        
        // Dibujar círculo con borde punteado para indicar área de blur
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          screenX + (width * zoom) / 2, 
          screenY + (width * zoom) / 2, 
          (width * zoom) / 2, 
          0, 
          2 * Math.PI
        );
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Círculo interior sólido
        ctx.fillRect(screenX, screenY, width * zoom, width * zoom);
      }      
      
      else if (tool === TOOLS.polygonPencil) {
        ctx.save();

        // Calcular centro para mirroring
        const hasBounds =
          mirrorState.bounds &&
          (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
            mirrorState.bounds.y2 > mirrorState.bounds.y1);

        const centerX = hasBounds
          ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
          : Math.floor(drawableWidth / 2);

        const centerY = hasBounds
          ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
          : Math.floor(drawableHeight / 2);

        const adjustment = -1;
        const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;

        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;

        const drawPolygonPreview = (points, curvePoints) => {
          if (points.length === 0) return;

          // Dibujar puntos existentes
          points.forEach((point, index) => {
            const screenX = (point.x - viewportOffset.x) * zoom;
            const screenY = (point.y - viewportOffset.y) * zoom;
            ctx.fillStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.8)`;
            ctx.fillRect(
              Math.floor(screenX - 2),
              Math.floor(screenY - 2),
              4,
              4
            );
          });

          // Dibujar líneas entre puntos
          for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            const curveKey = `${i}-${i + 1}`;

            ctx.strokeStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.6)`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);

            if (curvePoints.has(curveKey)) {
              // Dibujar curva
              const control = curvePoints.get(curveKey);
              const startScreen = {
                x: (start.x - viewportOffset.x) * zoom,
                y: (start.y - viewportOffset.y) * zoom,
              };
              const endScreen = {
                x: (end.x - viewportOffset.x) * zoom,
                y: (end.y - viewportOffset.y) * zoom,
              };
              const controlScreen = {
                x: (control.x - viewportOffset.x) * zoom,
                y: (control.y - viewportOffset.y) * zoom,
              };

              ctx.beginPath();
              ctx.moveTo(startScreen.x, startScreen.y);
              ctx.quadraticCurveTo(
                controlScreen.x,
                controlScreen.y,
                endScreen.x,
                endScreen.y
              );
              ctx.stroke();

              // Punto de control
              ctx.fillStyle = "rgba(0, 150, 255, 0.8)";
              ctx.fillRect(
                Math.floor(controlScreen.x - 2),
                Math.floor(controlScreen.y - 2),
                4,
                4
              );
            } else {
              // Línea recta
              const startScreen = {
                x: (start.x - viewportOffset.x) * zoom,
                y: (start.y - viewportOffset.y) * zoom,
              };
              const endScreen = {
                x: (end.x - viewportOffset.x) * zoom,
                y: (end.y - viewportOffset.y) * zoom,
              };

              ctx.beginPath();
              ctx.moveTo(startScreen.x, startScreen.y);
              ctx.lineTo(endScreen.x, endScreen.y);
              ctx.stroke();
            }
          }

          // Línea al cursor si hay puntos
          if (points.length > 0 && !isSettingCurve) {
            const lastPoint = points[points.length - 1];
            const lastScreen = {
              x: (lastPoint.x - viewportOffset.x) * zoom,
              y: (lastPoint.y - viewportOffset.y) * zoom,
            };
            const cursorScreen = {
              x: (canvasCoords.x - viewportOffset.x) * zoom,
              y: (canvasCoords.y - viewportOffset.y) * zoom,
            };

            ctx.strokeStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.4)`;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(lastScreen.x, lastScreen.y);
            ctx.lineTo(cursorScreen.x, cursorScreen.y);
            ctx.stroke();
          }

          // Preview de curva en configuración
          if (isSettingCurve && currentCurveIndex >= 0 && points.length >= 2) {
            const currentPoint = points[currentCurveIndex];
            const nextIndex =
              currentCurveIndex < points.length - 1 ? currentCurveIndex + 1 : 0;
            const nextPoint = points[nextIndex];

            const currentScreen = {
              x: (currentPoint.x - viewportOffset.x) * zoom,
              y: (currentPoint.y - viewportOffset.y) * zoom,
            };
            const nextScreen = {
              x: (nextPoint.x - viewportOffset.x) * zoom,
              y: (nextPoint.y - viewportOffset.y) * zoom,
            };
            const controlScreen = {
              x: (canvasCoords.x - viewportOffset.x) * zoom,
              y: (canvasCoords.y - viewportOffset.y) * zoom,
            };

            // Líneas de guía al punto de control
            ctx.strokeStyle = "rgba(0, 150, 255, 0.5)";
            ctx.setLineDash([2, 2]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(currentScreen.x, currentScreen.y);
            ctx.lineTo(controlScreen.x, controlScreen.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(nextScreen.x, nextScreen.y);
            ctx.lineTo(controlScreen.x, controlScreen.y);
            ctx.stroke();

            // Preview de la curva
            ctx.strokeStyle = `rgba(${toolParameters.fillColor.r}, ${toolParameters.fillColor.g}, ${toolParameters.fillColor.b}, 0.8)`;
            ctx.setLineDash([]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(currentScreen.x, currentScreen.y);
            ctx.quadraticCurveTo(
              controlScreen.x,
              controlScreen.y,
              nextScreen.x,
              nextScreen.y
            );
            ctx.stroke();

            // Punto de control
            ctx.fillStyle = "rgba(0, 150, 255, 0.8)";
            ctx.fillRect(
              Math.floor(controlScreen.x - 3),
              Math.floor(controlScreen.y - 3),
              6,
              6
            );
          }

          // Preview del polígono completo si hay suficientes puntos
          if (points.length >= 3) {
            drawPolygonWithCurves(
              ctx,
              points,
              curvePoints,
              toolParameters.width,
              toolParameters.borderColor,
              toolParameters.fillColor,
              true
            );
          }
        };

        // Dibujar polígono original
        drawPolygonPreview(polygonPoints, polygonCurvePoints);

        // Dibujar polígonos reflejados si el mirroring está activo
        if (mirrorState.vertical || mirrorState.horizontal) {
          const mirrorPolygonPoints = (points, horizontal, vertical) => {
            return points.map((point) => ({
              x: horizontal ? reflectHorizontal(point.x) : point.x,
              y: vertical ? reflectVertical(point.y) : point.y,
            }));
          };

          const mirrorCurvePoints = (curvePoints, horizontal, vertical) => {
            const mirrored = new Map();
            curvePoints.forEach((point, key) => {
              mirrored.set(key, {
                x: horizontal ? reflectHorizontal(point.x) : point.x,
                y: vertical ? reflectVertical(point.y) : point.y,
              });
            });
            return mirrored;
          };

          if (mirrorState.vertical) {
            const vPoints = mirrorPolygonPoints(polygonPoints, false, true);
            const vCurves = mirrorCurvePoints(polygonCurvePoints, false, true);
            drawPolygonPreview(vPoints, vCurves);
          }

          if (mirrorState.horizontal) {
            const hPoints = mirrorPolygonPoints(polygonPoints, true, false);
            const hCurves = mirrorCurvePoints(polygonCurvePoints, true, false);
            drawPolygonPreview(hPoints, hCurves);
          }

          if (mirrorState.vertical && mirrorState.horizontal) {
            const dhPoints = mirrorPolygonPoints(polygonPoints, true, true);
            const dhCurves = mirrorCurvePoints(polygonCurvePoints, true, true);
            drawPolygonPreview(dhPoints, dhCurves);
          }
        }

        ctx.setLineDash([]);
        ctx.restore();
      } else if (
        tool === TOOLS.move ||
        tool === TOOLS.select ||
        tool === TOOLS.lassoSelect
      ) {
        return;
      }

      const width = toolParameters?.width || 1;
      const offset = Math.floor(width / 2);

      // Verificar si los bounds están definidos y son válidos
      const hasBounds =
        mirrorState.bounds &&
        (mirrorState.bounds.x2 > mirrorState.bounds.x1 ||
          mirrorState.bounds.y2 > mirrorState.bounds.y1);

      // Calcular centros: usar bounds si están disponibles, sino usar totalWidth/totalHeight
      const centerX = hasBounds
        ? Math.floor((mirrorState.bounds.x1 + mirrorState.bounds.x2) / 2)
        : Math.floor(totalWidth / 2);

      const centerY = hasBounds
        ? Math.floor((mirrorState.bounds.y1 + mirrorState.bounds.y2) / 2)
        : Math.floor(totalHeight / 2);

      // Ajuste de -1 solo cuando hay bounds válidos
      const adjustment = -1;

      //Ajuste para numeros impares, sumar 1, ya que el centro al dividirse desfasa el reflejo
      const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
      const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;

      // Función para reflejar coordenadas
      const reflectHorizontal = (x) =>
        centerX * 2 - x + adjustment + imparAdjustmentWidth;
      const reflectVertical = (y) =>
        centerY * 2 - y + adjustment + imparAdjustmentHeight;

      const drawPreviewAt = (canvasX, canvasY) => {
        const x = canvasX - offset;
        const y = canvasY - offset;
        const screenX = (x - viewportOffset.x) * zoom;
        const screenY = (y - viewportOffset.y) * zoom;
        ctx.fillRect(screenX, screenY, width * zoom, width * zoom);
      };

      // Punto original
      drawPreviewAt(canvasCoords.x, canvasCoords.y);

      // Espejos
      if (mirrorState.vertical) {
        drawPreviewAt(canvasCoords.x, reflectVertical(canvasCoords.y));
      }
      if (mirrorState.horizontal) {
        drawPreviewAt(reflectHorizontal(canvasCoords.x), canvasCoords.y);
      }
      if (mirrorState.vertical && mirrorState.horizontal) {
        drawPreviewAt(
          reflectHorizontal(canvasCoords.x),
          reflectVertical(canvasCoords.y)
        );
      }
    }
  }, [
    tool,
    relativeToTarget,
    toolParameters,
    zoom,
    viewportToCanvasCoords,
    viewportOffset,
    curveState,
    color,
    mirrorState,
  ]);

  //Useeffect para el esc de herramientas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "Escape" &&
        tool === TOOLS.polygonPencil &&
        polygonPoints.length >= 3
      ) {
        // Finalizar polígono con ESC
        drawOnLayer(activeLayerId, (ctx) => {
          drawPolygonWithCurves(
            ctx,
            polygonPoints,
            polygonCurvePoints,
            toolParameters.width,
            toolParameters.borderColor,
            toolParameters.fillColor,
            false
          );
        });

        setPolygonPoints([]);
        setPolygonCurvePoints(new Map());
        setIsSettingCurve(false);
        setCurrentCurveIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tool, polygonPoints, polygonCurvePoints, activeLayerId, toolParameters]);

  // Efecto para manejar zoom con rueda del ratón
  // Función throttle para limitar la frecuencia de ejecución
  const throttle = (func, limit) => {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  };

  // Importar flushSync al principio del archivo

  // Usar useCallback para evitar recrear la función en cada render
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();

      const rect = workspaceRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const viewportMouseX = mouseX / zoom - panOffset.x / zoom;
      const viewportMouseY = mouseY / zoom - panOffset.y / zoom;
      const canvasMouseX = viewportMouseX + viewportOffset.x;
      const canvasMouseY = viewportMouseY + viewportOffset.y;

      const zoomDirection = e.deltaY > 0 ? -1 : 1;
      const zoomFactor = 1.2;
      const newZoomRaw = zoom * Math.pow(zoomFactor, zoomDirection);

      const newZoom = Math.max(
        1,
        Math.min(
          50,
          newZoomRaw < 10
            ? Math.round(newZoomRaw * 10) / 10 // 1 decimal para zoom < 10
            : Math.round(newZoomRaw) // enteros para zoom >= 10
        )
      );

      if (newZoom === zoom) return;

      const newViewportWidth = Math.min(
        totalWidth,
        Math.floor(workspaceWidth / newZoom)
      );
      const newViewportHeight = Math.min(
        totalHeight,
        Math.floor(workspaceHeight / newZoom)
      );

      const newViewportMouseX = mouseX / newZoom - panOffset.x / newZoom;
      const newViewportMouseY = mouseY / newZoom - panOffset.y / newZoom;

      const newViewportOffsetX = Math.floor(canvasMouseX - newViewportMouseX);
      const newViewportOffsetY = Math.floor(canvasMouseY - newViewportMouseY);

      const clampedOffsetX = Math.max(
        0,
        Math.min(totalWidth - newViewportWidth, newViewportOffsetX)
      );
      const clampedOffsetY = Math.max(
        0,
        Math.min(totalHeight - newViewportHeight, newViewportOffsetY)
      );

      const deltaX = clampedOffsetX - viewportOffset.x;
      const deltaY = clampedOffsetY - viewportOffset.y;

      // SOLUCIÓN: Usar flushSync para garantizar que todas las actualizaciones
      // se apliquen en el mismo frame, evitando el parpadeo
      flushSync(() => {
        setZoom(newZoom);
        setViewportWidth(newViewportWidth);
        setViewportHeight(newViewportHeight);

        if (deltaX !== 0 || deltaY !== 0) {
          moveViewport(deltaX, deltaY);
        }
      });
    },
    [
      zoom,
      workspaceWidth,
      workspaceHeight,
      totalWidth,
      totalHeight,
      viewportOffset,
      panOffset,
      moveViewport,
    ]
  );

  // Throttle la función para evitar demasiadas actualizaciones
  const throttledHandleWheel = useCallback(
    throttle(handleWheel, 16), // ~60fps
    [handleWheel]
  );

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace) {
      workspace.addEventListener("wheel", throttledHandleWheel, {
        passive: false,
      });

      return () => {
        workspace.removeEventListener("wheel", throttledHandleWheel);
      };
    }
  }, [throttledHandleWheel]);

  // Efecto para resetear estados de herramientas
  useEffect(() => {
    if (tool !== TOOLS.curve) {
      setCurveState("idle");
      setIsSettingControl(false);
      curveStartRef.current = null;
      curveEndRef.current = null;
      curveControlRef.current = null;
      setClickStartTime(null);
    }

    if (tool !== TOOLS.square) {
      squareStartRef.current = null;
    }
    if (tool !== TOOLS.triangle) {
      triangleStartRef.current = null;
    }
    // En el useEffect para resetear estado, agregar:
    if (tool !== TOOLS.circle) {
      circleStartRef.current = null;
    }
    if (tool !== TOOLS.circle) {
      circleStartRef.current = null;
    }
    if (tool !== TOOLS.polygon) {
      polygonStartRef.current = null;
    }
  }, [tool]);

  // Función para manejar cambio de zoom
  const handleZoomChange = (e) => {
    const newZoom = parseInt(e.target.value, 10);
    if (isNaN(newZoom) || newZoom <= 0) return;

    const currentCenterX = viewportOffset.x + viewportWidth / 2;
    const currentCenterY = viewportOffset.y + viewportHeight / 2;

    const newViewportWidth = Math.min(
      totalWidth,
      Math.floor(workspaceWidth / newZoom)
    );
    const newViewportHeight = Math.min(
      totalHeight,
      Math.floor(workspaceHeight / newZoom)
    );

    const newOffsetX = Math.max(
      0,
      Math.min(
        totalWidth - newViewportWidth,
        Math.round(currentCenterX - newViewportWidth / 2)
      )
    );
    const newOffsetY = Math.max(
      0,
      Math.min(
        totalHeight - newViewportHeight,
        Math.round(currentCenterY - newViewportHeight / 2)
      )
    );

    const deltaX = newOffsetX - viewportOffset.x;
    const deltaY = newOffsetY - viewportOffset.y;

    setZoom(newZoom);
    setViewportWidth(newViewportWidth);
    setViewportHeight(newViewportHeight);

    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
      moveViewport(deltaX, deltaY);
    }
  };

  /* ============================Logica de canvas de seleccion=================================================


  
 * 
Este canvas es necesario para seleccionar agrupaciones de pixeles, y poder manipularlos, principalmente arrastrarlos
 */
  const [clickInSelection, setClickInSelection] = useState(false);
  // Añadir estados para gestionar el arrastre
  const [dragStartPoint, setDragStartPoint] = useState(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);

  const getPixelColor = async (x, y) => {
    if (!activeLayerId) return null;
    const imageData = await getLayerData(activeLayerId, x, y, 1, 1);
    if (!imageData) return null;

    return {
      r: imageData.data[0],
      g: imageData.data[1],
      b: imageData.data[2],
      a: imageData.data[3] / 255,
    };
  };

  // Estados para la selección
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedPixels, setSelectedPixels] = useState([]);
  const [originalPixelColors, setOriginalPixelColors] = useState([]); // Nuevo estado para guardar colores originales
  const [finalizedSelection, setFinalizedSelection] = useState(false);
  const [selectionDragging, setSelectionDragging] = useState(false);
  const [selectionDragStart, setSelectionDragStart] = useState({ x: 0, y: 0 });
  const [selectionOffset, setSelectionOffset] = useState({ x: 0, y: 0 });
  const [selectionActive, setSelectionActive] = useState(false);
  const selectionCanvasRef = useRef(null);
  const [selectionCoords, setSelectionCoords] = useState([]);
  const [croppedSelectionBounds, setCroppedSelectionBounds] = useState(null);
  // Add a new state for lasso selection points
  const [lassoPoints, setLassoPoints] = useState([]);

  /// Funciones de utilidad para mi LASSO: ////===================
  // Función para verificar si un punto está dentro de un polígono
  const isPointInPolygon = useCallback((x, y, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Calcular los límites (bounds) del lazo
  const calculateLassoBounds = useCallback(() => {
    if (lassoPoints.length < 3) return;

    // Encontrar los límites del polígono
    const xCoords = lassoPoints.map((point) => point.x);
    const yCoords = lassoPoints.map((point) => point.y);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    // Establecer los límites del área de selección
    setCroppedSelectionBounds({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    });
  }, [lassoPoints]);

  const findNonEmptyBounds = useCallback((imageData, width, height) => {
    const data = imageData.data;

    let top = 0,
      bottom = height - 1;
    let left = 0,
      right = width - 1;

    let found = false;

    // Buscar el primer top con alpha > 0
    for (; top < height; top++) {
      for (let x = 0; x < width; x++) {
        if (data[(top * width + x) * 4 + 3] > 0) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // Buscar el primer bottom con alpha > 0
    found = false;
    for (; bottom >= top; bottom--) {
      for (let x = 0; x < width; x++) {
        if (data[(bottom * width + x) * 4 + 3] > 0) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // Buscar el primer left con alpha > 0
    found = false;
    for (; left < width; left++) {
      for (let y = top; y <= bottom; y++) {
        if (data[(y * width + left) * 4 + 3] > 0) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // Buscar el primer right con alpha > 0
    found = false;
    for (; right >= left; right--) {
      for (let y = top; y <= bottom; y++) {
        if (data[(y * width + right) * 4 + 3] > 0) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (left > right || top > bottom) return null; // No se encontró ningún pixel visible

    return {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    };
  }, []);

  // Función para limpiar la selección actual
  const clearCurrentSelection = useCallback(() => {
    
    // 1. Actualizar el grupo ANTES de limpiar (si hay arrastre y grupo seleccionado)
    if (selectedGroup && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      console.log("e actualizaron los pixeles del grupo");
      const updatedPixels = selectedPixels.map((pixel) => ({
        x: pixel.x + dragOffset.x,
        y: pixel.y + dragOffset.y,
        color: pixel.color,
      }));

      updatePixelGroup(selectedGroup.layerId, selectedGroup.id, updatedPixels);
    }

    // 2. Limpieza normal del canvas y estados
    const canvas = selectionCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Restaurar pixeles a colores originales
    if (selectedPixels.length > 0 && originalPixelColors.length > 0) {
      selectedPixels.forEach((pixel, index) => {
        if (originalPixelColors[index]) {
          pintarPixelConTamaño(
            pixel.x + dragOffset.x,
            pixel.y + dragOffset.y,
            originalPixelColors[index],
            1
          );
        }
      });
    }

    // 3. Resetear todos los estados
    setSelectionCoords([]);
    setSelectedPixels([]);
    setOriginalPixelColors([]);

    setCroppedSelectionBounds(null);
    setDragOffset({ x: 0, y: 0 });
    setSelectionActive(false);
    setLassoPoints([]);
    setIsDraggingSelection(false);
    setDragStartPoint(null);
  }, [
    selectedPixels,
    originalPixelColors,
    zoom,
    dragOffset,
    layers,
    activeLayerId,
    isDraggingSelection, // Nueva dependencia
    selectedGroup, // Nueva dependencia
    updatePixelGroup, // Función del hook useLayerManager,
  ]);

  // Auto-crop de la selección

  const autoCropSelection = useCallback(async () => {
    if (!activeLayerId || !selectionCoords || selectionCoords.length < 1)
      return;
    console.log("autoCropSelection - selectionCoords:", selectionCoords);

    // Calcular los bounds de TODOS los puntos de selección
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    selectionCoords.forEach((coord) => {
      minX = Math.min(minX, coord.x);
      minY = Math.min(minY, coord.y);
      maxX = Math.max(maxX, coord.x);
      maxY = Math.max(maxY, coord.y);
    });

    const x = minX;
    const y = minY;
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const totalPixels = width * height;

    console.log(
      `Calculated bounds: x=${x}, y=${y}, width=${width}, height=${height}, totalPixels=${totalPixels}`
    );

    // Si el área es muy grande, usar estrategia optimizada
    if (totalPixels > 1000000) {
      // 1 millón de píxeles
      console.log("Área muy grande, usando estrategia optimizada");

      // Usar directamente las coordenadas de selección para calcular bounds
      const croppedBounds = {
        x: minX,
        y: minY,
        width: width,
        height: height,
      };

      setCroppedSelectionBounds(croppedBounds);
      setSelectionCoords([]);
      return;
    }

    try {
      const imageData = await getLayerData(activeLayerId, x, y, width, height);
      if (!imageData) {
        console.log("No se pudo obtener imageData");
        return;
      }

      // Timeout dinámico basado en el tamaño
      const timeoutMs = Math.min(30000, Math.max(5000, totalPixels / 50000));
      console.log(`Using timeout: ${timeoutMs}ms for ${totalPixels} pixels`);

      const bounds = await new Promise((resolve, reject) => {
        const worker = new BoundsWorker();

        const timeout = setTimeout(() => {
          console.log("Worker timeout reached");
          worker.terminate();
          reject(new Error("Worker timeout"));
        }, timeoutMs);

        worker.onmessage = (e) => {
          clearTimeout(timeout);
          console.log("Worker completed successfully", e.data);
          resolve(e.data);
          worker.terminate();
        };

        worker.onerror = (error) => {
          clearTimeout(timeout);
          console.error("Worker error:", error);
          worker.terminate();
          reject(error);
        };

        // Verificar que el buffer sea válido
        if (!imageData.data || !imageData.data.buffer) {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error("Invalid imageData buffer"));
          return;
        }

        // Transferir el buffer
        worker.postMessage({ width, height, buffer: imageData.data.buffer }, [
          imageData.data.buffer,
        ]);
      });

      if (bounds) {
        const croppedBounds = {
          x: x + bounds.x,
          y: y + bounds.y,
          width: bounds.width,
          height: bounds.height,
        };
        setCroppedSelectionBounds(croppedBounds);

        // Verificar si algún pixel del área recortada pertenece a un grupo
        let groupFound = false;
        let groupData = null;

        for (
          let py = croppedBounds.y;
          py < croppedBounds.y + croppedBounds.height;
          py++
        ) {
          for (
            let px = croppedBounds.x;
            px < croppedBounds.x + croppedBounds.width;
            px++
          ) {
            const groupInfo = getPixelGroupAt(px, py, activeLayerId);
            if (groupInfo) {
              groupFound = true;
              groupData = groupInfo;
              break;
            }
          }
          if (groupFound) break;
        }

        if (groupFound) {
          console.log(
            `Pixel con grupo encontrado: ${JSON.stringify(groupData, null, 2)}`
          );
        } else {
          console.log(
            "Ningún pixel dentro del área recortada pertenece a un grupo"
          );
        }

        setSelectionCoords([]);
      } else {
        console.log("Worker returned null bounds, using original bounds");
        setCroppedSelectionBounds({ x, y, width, height });
        setSelectionCoords([]);
      }
    } catch (error) {
      console.error("Error in autoCropSelection:", error);

      // Fallback: usar los bounds originales si el worker falla
      console.log("Using fallback bounds due to error");
      setCroppedSelectionBounds({ x, y, width, height });
      setSelectionCoords([]);
    }
  }, [activeLayerId, selectionCoords, getLayerData]);

  const autoCropLasso = useCallback(async () => {
    if (!activeLayerId || !lassoPoints || lassoPoints.length < 1) return;
    console.log("autoCropLasso - lassoPoints length:", lassoPoints.length);

    // Calcular bounding box de manera más eficiente
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    lassoPoints.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    const x = minX;
    const y = minY;
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const totalPixels = width * height;

    console.log(
      `Lasso bounds: x=${x}, y=${y}, width=${width}, height=${height}, totalPixels=${totalPixels}`
    );

    // Si el área es muy grande, usar estrategia optimizada
    if (totalPixels > 1000000) {
      // 1 millón de píxeles
      console.log("Área de lasso muy grande, usando estrategia optimizada");

      // Usar directamente el bounding box del lasso
      const croppedBounds = {
        x: x,
        y: y,
        width: width,
        height: height,
      };

      setCroppedSelectionBounds(croppedBounds);
      return;
    }

    try {
      // Obtener datos de imagen en el bounding box
      const imageData = await getLayerData(activeLayerId, x, y, width, height);
      if (!imageData) {
        console.log("No se pudo obtener imageData para lasso");
        return;
      }

      // Timeout dinámico basado en el tamaño
      const timeoutMs = Math.min(30000, Math.max(5000, totalPixels / 50000));
      console.log(
        `Using timeout for lasso: ${timeoutMs}ms for ${totalPixels} pixels`
      );

      // Usar el worker optimizado para buscar bounds
      const bounds = await new Promise((resolve, reject) => {
        const worker = new BoundsWorker();

        const timeout = setTimeout(() => {
          console.log("Lasso worker timeout reached");
          worker.terminate();
          reject(new Error("Lasso worker timeout"));
        }, timeoutMs);

        worker.onmessage = (e) => {
          clearTimeout(timeout);
          console.log("Lasso worker completed successfully", e.data);
          resolve(e.data);
          worker.terminate();
        };

        worker.onerror = (error) => {
          clearTimeout(timeout);
          console.error("Lasso worker error:", error);
          worker.terminate();
          reject(error);
        };

        // Verificar que el buffer sea válido
        if (!imageData.data || !imageData.data.buffer) {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error("Invalid lasso imageData buffer"));
          return;
        }

        // Transferir el buffer
        worker.postMessage({ width, height, buffer: imageData.data.buffer }, [
          imageData.data.buffer,
        ]);
      });

      if (bounds) {
        const croppedBounds = {
          x: x + bounds.x,
          y: y + bounds.y,
          width: bounds.width,
          height: bounds.height,
        };

        console.log("Lasso cropped bounds:", croppedBounds);
        setCroppedSelectionBounds(croppedBounds);
      } else {
        console.log("Lasso worker returned null bounds, using original bounds");
        setCroppedSelectionBounds({ x, y, width, height });
      }
    } catch (error) {
      console.error("Error in autoCropLasso:", error);

      // Fallback: usar el bounding box original si el worker falla
      console.log("Using fallback lasso bounds due to error");
      setCroppedSelectionBounds({ x, y, width, height });
    }
  }, [activeLayerId, lassoPoints, getLayerData]);

  const clampCoordinates = useCallback(
    (coords, maxWidth = totalWidth, maxHeight = totalHeight) => {
      return {
        x: Math.max(0, Math.min(maxWidth - 1, coords.x)),
        y: Math.max(0, Math.min(maxHeight - 1, coords.y)),
      };
    },
    [totalWidth, totalHeight]
  );

  // Lógica para nueva selección
  useEffect(() => {
    if (isSpacePressed) return;

    if (tool !== TOOLS.select || !isPressed) return;

    // Si acabamos de iniciar el presionado y NO estamos arrastrando una selección existente
    if (path.length === 1 && !isDraggingSelection) {
      const clickPoint = path[0];
      const pixelCoords = getPixelCoordinates(clickPoint);
      const canvasCoords = viewportToCanvasCoords(pixelCoords.x, pixelCoords.y);

      // Solo procesar como nueva selección si no hay selección activa
      // o si clickeamos fuera de la selección existente
      if (!selectionActive) {
        // Iniciar nueva selección
        if (
          path.length === 0 &&
          (selectedPixels.length > 0 || croppedSelectionBounds)
        ) {
          clearCurrentSelection();
        }
      }
    }

    // No procesar nueva selección si estamos arrastrando
    if (isDraggingSelection) {
      return;
    }

    // Lógica existente para nueva selección (solo cuando NO hay selección activa)
    if (!selectionActive && path.length >= 1) {
      const canvasCoords = path.map((point) => {
        const viewportPixelCoords = getPixelCoordinates(point);
        const rawCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );

        // AGREGAR AQUÍ: Limitar coordenadas dentro del canvas
        return clampCoordinates(rawCoords);
      });

      setSelectionCoords(canvasCoords);
      setCroppedSelectionBounds(null);
    }
  }, [
    isPressed,
    path,
    tool,
    isDraggingSelection,
    activeLayerId,
    selectionActive,
    clampCoordinates,
  ]);

  // Finalizar arrastre cuando se suelta el mouse
  useEffect(() => {
    if (!isPressed && isDraggingSelection) {
      setIsDraggingSelection(false);
      setDragStartPoint(null);
    }
  }, [isPressed]);

  // Finalización de selección
  useEffect(() => {
    if (
      tool === TOOLS.select &&
      !isPressed &&
      selectionCoords.length >= 1 &&
      !isDraggingSelection
    ) {
      autoCropSelection();
      setSelectionActive(true);
    }
    if (
      tool === TOOLS.lassoSelect &&
      !isPressed &&
      lassoPoints.length >= 3 &&
      !isDraggingSelection
    ) {
      if (selectionActive) return;
      // Finalizar la selección del lazo
      // Primero cerramos el polígono si no está cerrado
      if (lassoPoints.length > 0) {
        const firstPoint = lassoPoints[0];
        const lastPoint = lassoPoints[lassoPoints.length - 1];

        // Si el último punto no es igual al primero, agregar el punto inicial al final
        if (firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y) {
          setLassoPoints([...lassoPoints, firstPoint]);
        }
      }

      // Calcular el rectángulo que contiene el lazo
      calculateLassoBounds();
      autoCropLasso();

      setSelectionActive(true);
    }
  }, [
    tool,
    isPressed,
    selectionCoords,
    autoCropSelection,
    isDraggingSelection,
    lassoPoints,
    activeLayerId,
  ]);

  const paintPixelInSelectionCanvas = useCallback(
    (x, y, color) => {
      const canvas = selectionCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
      // Aplicar tanto el viewportOffset como el panOffset
      const screenX = (x - viewportOffset.x) * zoom;
      const screenY = (y - viewportOffset.y) * zoom;
      ctx.fillRect(screenX, screenY, zoom, zoom);
    },
    [zoom, viewportOffset]
  ); // Añadir viewportOffset como dependencia

  // Dibujar el rectángulo de selección
  useEffect(() => {
    if (!croppedSelectionBounds || isPressed || selectedPixels.length > 0)
      return;

    const { x, y, width, height } = croppedSelectionBounds;

    // Verificación rápida si hay píxeles visibles
    const quickCheckPromise = async () => {
      const sampleSize = Math.min(100, width * height);
      const samplePromises = [];

      for (let i = 0; i < sampleSize; i++) {
        const sampleX = x + Math.floor(Math.random() * width);
        const sampleY = y + Math.floor(Math.random() * height);

        // Para el lazo, solo verificar puntos dentro del polígono
        if (
          tool === TOOLS.select ||
          (tool === TOOLS.lassoSelect &&
            isPointInPolygon(sampleX, sampleY, lassoPoints))
        ) {
          const promise = getPixelColor(sampleX, sampleY).then((color) => ({
            x: sampleX,
            y: sampleY,
            color,
          }));
          samplePromises.push(promise);
        }
      }

      const sampleResults = await Promise.all(samplePromises);
      const hasVisiblePixels = sampleResults.some(
        ({ color }) =>
          color &&
          color.a > 0 &&
          !(color.r === 0 && color.g === 0 && color.b === 0 && color.a === 0)
      );

      return hasVisiblePixels;
    };

    if (selectedPixels.length === 0) {
      quickCheckPromise()
        .then((hasVisiblePixels) => {
          if (!hasVisiblePixels) {
            console.log("No se encontraron píxeles visibles en la selección");
            setCroppedSelectionBounds(null);
            setSelectionActive(false);
            return;
          }

          // Procesar todos los píxeles en el área
          let pixelPromises = [];

          for (let i = y; i < y + height; i++) {
            for (let j = x; j < x + width; j++) {
              // Para el lazo, verificar si el punto está dentro del polígono
              const shouldCheck =
                tool === TOOLS.select ||
                (tool === TOOLS.lassoSelect &&
                  isPointInPolygon(j, i, lassoPoints));

              if (shouldCheck) {
                const promise = getPixelColor(j, i).then((color) => ({
                  x: j,
                  y: i,
                  color,
                }));
                pixelPromises.push(promise);
              }
            }
          }

          Promise.all(pixelPromises).then((allPixels) => {
            const selectionPixels = allPixels.filter(({ color }) => {
              return (
                color &&
                color.a > 0 &&
                !(
                  color.r === 0 &&
                  color.g === 0 &&
                  color.b === 0 &&
                  color.a === 0
                )
              );
            });

            if (selectionPixels.length > 0) {
              // Guardar colores originales antes de modificarlos
              const originalColors = selectionPixels.map(
                (pixel) => pixel.color
              );
              setOriginalPixelColors(originalColors);

              setSelectedPixels(selectionPixels);
              setFinalizedSelection(true);
            } else {
              setCroppedSelectionBounds(null);
              setSelectionActive(false);
            }
          });
        })
        .catch((error) => {
          console.error("Error en la verificación de píxeles:", error);
          setCroppedSelectionBounds(null);
          setSelectionActive(false);
        });
    }
  }, [
    croppedSelectionBounds,
    isPressed,
    selectedPixels.length,
    tool,
    lassoPoints,
    isPointInPolygon,
    getPixelColor,
    setOriginalPixelColors,
    setSelectedPixels,
    setFinalizedSelection,
    setCroppedSelectionBounds,
    setSelectionActive,
  ]);

  // Manejar el arrastre de la selección
  useEffect(() => {
    if (!isDraggingSelection || !isPressed) return;

    // Solo procesar si hay una selección activa
    if (!selectionActive || selectedPixels.length === 0) {
      setIsDraggingSelection(false);
      return;
    }

    if (path.length >= 2) {
      const currentPoint = path[path.length - 1];
      const pixelCoords = getPixelCoordinates(currentPoint);
      const canvasCoords = viewportToCanvasCoords(pixelCoords.x, pixelCoords.y);

      if (!dragStartPoint) {
        setDragStartPoint({
          x: canvasCoords.x,
          y: canvasCoords.y,
        });
        return;
      }

      const deltaX = Math.floor(canvasCoords.x - dragStartPoint.x);
      const deltaY = Math.floor(canvasCoords.y - dragStartPoint.y);

      if (deltaX !== 0 || deltaY !== 0) {
        setDragOffset((prevOffset) => ({
          x: prevOffset.x + deltaX,
          y: prevOffset.y + deltaY,
        }));
        setDragStartPoint({
          x: canvasCoords.x,
          y: canvasCoords.y,
        });
      }
    }
  }, [
    path,
    isDraggingSelection,
    isPressed,
    dragStartPoint,
    selectionActive,
    selectedPixels,
  ]);

  // Pintar pixel en el canvas de selección

  const pintarPixelConTamaño = (coordX, coordY, color, tamaño) => {
    if (!activeLayerId) return;

    drawOnLayer(activeLayerId, (ctx) => {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

      // Asegurarse de que coordX, coordY y tamaño sean enteros
      const intX = Math.floor(coordX);
      const intY = Math.floor(coordY);
      const intTamaño = Math.floor(tamaño);

      const offset = Math.floor(intTamaño / 2);
      const startX = intX - offset;
      const startY = intY - offset;

      ctx.fillRect(startX, startY, intTamaño, intTamaño, activeLayerId, layers);
    });
  };

  // Manejar clicks fuera de la selección
  useEffect(() => {
    if (isSpacePressed) return;
    if (
      selectionActive &&
      (tool === TOOLS.select || tool === TOOLS.lassoSelect) &&
      isPressed &&
      path.length === 1
    ) {
      const clickPoint = path[0];
      const pixelCoords = getPixelCoordinates(clickPoint);
      const canvasCoords = viewportToCanvasCoords(pixelCoords.x, pixelCoords.y);

      // Verificar si el click está en el área de los botones de acción
      const isOnActionButtons =
        croppedSelectionBounds &&
        canvasCoords.x >=
          croppedSelectionBounds.x +
            croppedSelectionBounds.width +
            dragOffset.x &&
        canvasCoords.x <=
          croppedSelectionBounds.x +
            croppedSelectionBounds.width +
            dragOffset.x +
            5 &&
        canvasCoords.y >= croppedSelectionBounds.y + dragOffset.y &&
        canvasCoords.y <=
          croppedSelectionBounds.y +
            dragOffset.y +
            croppedSelectionBounds.height;

      // CAMBIO PRINCIPAL: Verificar si está dentro del rectángulo completo de selección
      const isInsideSelectionBounds =
        croppedSelectionBounds &&
        canvasCoords.x >= croppedSelectionBounds.x + dragOffset.x &&
        canvasCoords.x <
          croppedSelectionBounds.x +
            croppedSelectionBounds.width +
            dragOffset.x &&
        canvasCoords.y >= croppedSelectionBounds.y + dragOffset.y &&
        canvasCoords.y <
          croppedSelectionBounds.y +
            croppedSelectionBounds.height +
            dragOffset.y;

      // MODIFICADO: Usar isInsideSelectionBounds en lugar de isOnSelectedPixel
      if (isInsideSelectionBounds && !isOnActionButtons) {
        // Si clickeó dentro del rectángulo de selección, iniciar arrastre
        setClickInSelection(true);
        setIsDraggingSelection(true);
        setDragStartPoint({
          x: canvasCoords.x,
          y: canvasCoords.y,
        });
      } else if (!isOnActionButtons) {
        clearCurrentSelection();
      }
    }
  }, [
    isPressed,
    path,
    tool,
    selectionActive,
    selectedPixels,
    dragOffset,
    activeLayerId,
    clearCurrentSelection,
    getPixelCoordinates,
    viewportToCanvasCoords,
    croppedSelectionBounds,
  ]);

  // Pintar pixeles seleccionados en el canvas de selección // aqui gestiona la rotacion:
  useEffect(() => {
    const canvas = selectionCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Si no estamos usando la herramienta de selección, limpiar y salir
    if (tool !== TOOLS.select && tool !== TOOLS.lassoSelect) {
      if (selectionActive) {
        clearCurrentSelection();
      }
      return;
    }

    // No mostrar el rectángulo azul de selección si estamos arrastrando
    if (isPressed && !isDraggingSelection && !croppedSelectionBounds) {
      if (selectionCoords.length < 1) return;
      const start = selectionCoords[0];
      const end = selectionCoords[selectionCoords.length - 1];
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x) + 1;
      const height = Math.abs(end.y - start.y) + 1;

      // Aplicar el viewportOffset para posicionar correctamente en pantalla
      const screenX = (x - viewportOffset.x) * zoom;
      const screenY = (y - viewportOffset.y) * zoom;

      ctx.strokeStyle = "rgba(0, 120, 255, 0.5)";
      ctx.fillStyle = "rgba(0, 120, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.fillRect(screenX, screenY, width * zoom, height * zoom);
      ctx.strokeRect(screenX, screenY, width * zoom, height * zoom);
    }

    // Si hay una selección activa, mostrar el borde y los pixeles seleccionados
    if (selectionActive && selectedPixels.length > 0) {
      if (croppedSelectionBounds) {
        const { x, y, width, height } = croppedSelectionBounds;

        // Aplicar tanto el dragOffset como el viewportOffset
        const finalX = x + dragOffset.x;
        const finalY = y + dragOffset.y;
        const screenX = Math.round((finalX - viewportOffset.x) * zoom);
        const screenY = Math.round((finalY - viewportOffset.y) * zoom);

        // Dibuja el área de selección (verde)
        ctx.strokeStyle = isDraggingSelection
          ? "rgba(255, 150, 0, 0.8)"
          : "rgba(0, 200, 100, 0.8)";
        ctx.fillStyle = isDraggingSelection
          ? "rgba(255, 150, 0, 0.2)"
          : "rgba(0, 200, 100, 0.2)";
        ctx.lineWidth = 2;
        ctx.fillRect(screenX, screenY, width * zoom, height * zoom);
        ctx.strokeRect(screenX, screenY, width * zoom, height * zoom);

        // Mantener marcadores de esquina
        const markerSize = 2;
        ctx.fillStyle = isDraggingSelection
          ? "rgba(255, 150, 0, 1)"
          : "rgba(0, 200, 100, 1)";
        ctx.fillRect(
          screenX - markerSize / 2,
          screenY - markerSize / 2,
          markerSize,
          markerSize
        );
        ctx.fillRect(
          screenX + width * zoom - markerSize / 2,
          screenY - markerSize / 2,
          markerSize,
          markerSize
        );
        ctx.fillRect(
          screenX - markerSize / 2,
          screenY + height * zoom - markerSize / 2,
          markerSize,
          markerSize
        );
        ctx.fillRect(
          screenX + width * zoom - markerSize / 2,
          screenY + height * zoom - markerSize / 2,
          markerSize,
          markerSize
        );
      }

      // Pintar píxeles seleccionados (ya corregido con la función paintPixelInSelectionCanvas)
      selectedPixels.forEach((pixel) => {
        paintPixelInSelectionCanvas(
          pixel.x + dragOffset.x,
          pixel.y + dragOffset.y,
          pixel.color
        );
      });
    }
  }, [
    selectedPixels,
    dragOffset,
    croppedSelectionBounds,
    isPressed,
    selectionActive,
    isDraggingSelection,
    viewportOffset,
    tool,
    clearCurrentSelection,
    selectionCoords,
    lassoPoints,
    paintPixelInSelectionCanvas,
  ]);

  // Añadir un nuevo estado
  const [pixelsAlreadyErased, setPixelsAlreadyErased] = useState(false);

  // Modificar el useEffect problemático
  useEffect(() => {
    // Solo borrar píxeles la PRIMERA vez que se establece una selección
    if (selectedPixels.length > 0 && !pixelsAlreadyErased && selectionActive) {
      selectedPixels.forEach((pixel) => {
        erasePixels(activeLayerId, pixel.x, pixel.y);
      });
      setPixelsAlreadyErased(true);
    }

    // Resetear el flag cuando se limpia la selección
    if (selectedPixels.length === 0) {
      setPixelsAlreadyErased(false);
    }
  }, [selectedPixels, pixelsAlreadyErased, selectionActive]);

  /////==================================Lógica para LAZO ==================================================================

  // useEffect para dibujar el poligono de seleccion para el lazo
  useEffect(() => {
    if (isPressed && isDraggingSelection && croppedSelectionBounds) return;
    if (selectionActive) return; // SI ya hemos seleccionado no necesitamos esto
    // Solo se activa para la herramienta de lasso
    if (tool !== TOOLS.lassoSelect || !selectionCanvasRef.current) return;

    const canvas = selectionCanvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If we're actively drawing (mouse is pressed), update the lasso points
    if (isPressed) {
      // Convert the current path points to canvas coordinates
      const canvasPoints = path.map((point) => {
        const viewportPixelCoords = getPixelCoordinates(point);
        const rawCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );

        // AGREGAR AQUÍ: Limitar coordenadas para lasso también
        return clampCoordinates(rawCoords);
      });

      // Make sure we don't have duplicate points
      const uniquePoints = [
        ...new Map(
          canvasPoints.map((coord) => [`${coord.x},${coord.y}`, coord])
        ).values(),
      ];

      setLassoPoints(uniquePoints);

      // Draw the lasso path
      if (canvasPoints.length > 1) {
        ctx.beginPath();

        // Apply viewport offset and zoom for drawing
        const startX = (uniquePoints[0].x - viewportOffset.x) * zoom;
        const startY = (uniquePoints[0].y - viewportOffset.y) * zoom;

        ctx.moveTo(startX, startY);

        // Draw lines to all other points
        for (let i = 1; i < uniquePoints.length; i++) {
          const x = (uniquePoints[i].x - viewportOffset.x) * zoom;
          const y = (uniquePoints[i].y - viewportOffset.y) * zoom;
          ctx.lineTo(x, y);
        }

        // Connect back to the first point if we have enough points
        if (canvasPoints.length > 2) {
          ctx.lineTo(startX, startY);
        }

        // Style the lasso selection
        ctx.strokeStyle = "rgba(0, 120, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fill with semi-transparent color
        ctx.fillStyle = "rgba(0, 120, 255, 0.1)";
        ctx.fill();
      }
    } else if (lassoPoints.length > 2) {
    }
  }, [
    tool,
    isPressed,
    path,
    viewportOffset,
    lassoPoints,
    selectionActive,
    clampCoordinates,
  ]);
  //  ============================ Logica de canvas de seleccion =================================================//

  //// funcion especial para rotar:
  /* 
1. Se debe partir desde que se tiene una rotacion activa:  

*/

  //-----------------------------Funciones de accion para la selección---------------------------------------//

  const deleteSelection = () => {
    const canvas = selectionCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // 3. Resetear todos los estados
    setSelectionCoords([]);
    setSelectedPixels([]);
    setOriginalPixelColors([]);

    setCroppedSelectionBounds(null);
    setDragOffset({ x: 0, y: 0 });
    setSelectionActive(false);
    setLassoPoints([]);
    setIsDraggingSelection(false);
    setDragStartPoint(null);
  };

  function duplicateSelection() {
    if (selectedPixels.length === 0 || originalPixelColors.length === 0) {
      alert("No hay píxeles seleccionados para duplicar");
      return;
    }

    // 1. Pintar los píxeles en la posición actual (los "fijas")
    selectedPixels.forEach((pixel, index) => {
      if (originalPixelColors[index]) {
        pintarPixelConTamaño(
          pixel.x + dragOffset.x,
          pixel.y + dragOffset.y,
          originalPixelColors[index],
          1
        );
      }
    });

    // 2. Actualizar selectedPixels a las nuevas posiciones
    const newPixels = selectedPixels.map((pixel) => ({
      x: pixel.x + dragOffset.x,
      y: pixel.y + dragOffset.y,
      color: pixel.color,
    }));

    // 3. NO necesitas resetear initialEraseDone porque ya están borrados
    setDragOffset((prev) => ({
      x: prev.x + 5,
      y: prev.y + 5,
    }));
  }

  const rotatePixels90 = useCallback(
    (pixels, direction = "right") => {
      if (!pixels.length) return [];

      const minX = Math.min(...pixels.map((p) => p.x));
      const maxX = Math.max(...pixels.map((p) => p.x));
      const minY = Math.min(...pixels.map((p) => p.y));
      const maxY = Math.max(...pixels.map((p) => p.y));

      const newPixels = pixels.map((p) => {
        const relativeX = p.x - minX;
        const relativeY = p.y - minY;

        let newX, newY;

        if (direction === "right") {
          // 90° clockwise
          newX = minX + (maxY - minY - relativeY);
          newY = minY + relativeX;
        } else if (direction === "left") {
          // 90° counter-clockwise
          newX = minX + relativeY;
          newY = minY + (maxX - minX - relativeX);
        } else {
          throw new Error("Invalid rotation direction: use 'right' or 'left'");
        }

        return {
          x: newX,
          y: newY,
          color: p.color,
        };
      });

      return newPixels;
    },
    
    dragOffset
  );

  const handleRotation = (direction) => {
    // Ya no necesitas borrar manualmente aquí
    // porque ya están borrados desde la selección inicial

    const rotatedPixels = rotatePixels90(selectedPixels, direction);
    setSelectedPixels(rotatedPixels);

    setCroppedSelectionBounds((prev) => ({
      ...prev,
      width: prev.height,
      height: prev.width,
    }));
  };

// 2. Modificar la función copySelection para asegurar copias limpias
const copySelection = useCallback(() => {
  if (selectedPixels.length === 0) {
    alert("No hay píxeles seleccionados para copiar");
    return;
  }

  // Crear copias completamente independientes para el portapapeles
  const pixelCopies = selectedPixels.map((pixel, index) => ({
    x: pixel.x,
    y: pixel.y,
    color: {
      r: pixel.color.r,
      g: pixel.color.g,
      b: pixel.color.b,
      a: pixel.color.a
    },
    // Agregar identificador de origen para debugging
    originalId: pixel.id || `original_${index}`
  }));

  const originalColorCopies = originalPixelColors.map(color => ({
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a
  }));

  const boundsCopy = croppedSelectionBounds ? {
    x: croppedSelectionBounds.x,
    y: croppedSelectionBounds.y,
    width: croppedSelectionBounds.width,
    height: croppedSelectionBounds.height
  } : null;

  setCopiedPixels({
    pixels: pixelCopies,
    offset: { x: dragOffset.x, y: dragOffset.y }, // Copia del offset también
    originalColors: originalColorCopies,
    bounds: boundsCopy,
    // Agregar timestamp para identificar cuándo se hizo la copia
    timestamp: Date.now()
  });

  console.log("Selección copiada al portapapeles:", pixelCopies.length, "píxeles");
}, [selectedPixels, dragOffset, originalPixelColors, croppedSelectionBounds]);

// 3. Modificar la función cutSelection para usar las mismas copias independientes
const cutSelection = useCallback(() => {
  if (selectedPixels.length === 0) {
    alert("No hay píxeles seleccionados para cortar");
    return;
  }

  // Primero copiar (esto crea copias independientes)
  copySelection();

  // Luego eliminar la selección actual
  deleteSelection();

  console.log("Selección cortada - copiada al portapapeles y eliminada");
}, [selectedPixels, copySelection, deleteSelection]);

// 4. Función de debugging para rastrear el estado del portapapeles
const debugClipboard = useCallback(() => {
  console.log("=== ESTADO DEL PORTAPAPELES ===");
  if (copiedPixels) {
    console.log("Píxeles en portapapeles:", copiedPixels.pixels?.length || 0);
    console.log("Timestamp de copia:", new Date(copiedPixels.timestamp || 0).toLocaleTimeString());
    console.log("Offset:", copiedPixels.offset);
    console.log("Bounds:", copiedPixels.bounds);
    if (copiedPixels.pixels?.length > 0) {
      console.log("Primer pixel:", copiedPixels.pixels[0]);
    }
  } else {
    console.log("Portapapeles vacío");
  }
  console.log("=== FIN ESTADO PORTAPAPELES ===");
}, [copiedPixels]);
  const pastePixels = useCallback(() => {
    // Limpiar selección actual si existe
    setPixelsAlreadyErased(true);
      clearCurrentSelection();
    
  
    if (
      !copiedPixels ||
      !copiedPixels.pixels ||
      copiedPixels.pixels.length === 0
    ) {
      alert("No hay píxeles en el portapapeles");
      return;
    }
  
    // Cambiar a herramienta de selección
    setTool(TOOLS.select);
  
    // Desplazar ligeramente los píxeles pegados
    const pasteOffset = {
      x: (copiedPixels.offset?.x || 0) + 10,
      y: (copiedPixels.offset?.y || 0) + 10,
    };
  
    // MODIFICACIÓN PRINCIPAL: Crear copias completamente independientes de los píxeles
    const independentPixels = copiedPixels.pixels.map((pixel, index) => ({
      // Crear un nuevo objeto pixel completamente independiente
      x: pixel.x, // Coordenadas originales (sin offset aplicado aún)
      y: pixel.y,
      color: {
        // Crear una copia profunda del color para evitar referencias compartidas
        r: pixel.color.r,
        g: pixel.color.g,
        b: pixel.color.b,
        a: pixel.color.a
      },
      // Agregar un identificador único para rastrear este pixel específico
      id: `pasted_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`
    }));
  
    // Crear copias independientes de los colores originales también
    const independentOriginalColors = (copiedPixels.originalColors || copiedPixels.pixels.map(p => p.color))
      .map(color => ({
        r: color.r,
        g: color.g,
        b: color.b,
        a: color.a
      }));
  
    // Crear copia independiente de los bounds
    const independentBounds = copiedPixels.bounds ? {
      x: copiedPixels.bounds.x,
      y: copiedPixels.bounds.y,
      width: copiedPixels.bounds.width,
      height: copiedPixels.bounds.height
    } : null;
  
    // Restaurar todos los estados necesarios con las copias independientes
    setSelectedPixels(independentPixels);
    setOriginalPixelColors(independentOriginalColors);
    setDragOffset(pasteOffset);
    setCroppedSelectionBounds(independentBounds);
    setSelectionActive(true);
  
    console.log("Píxeles pegados como copias independientes:", independentPixels.length);
  }, [copiedPixels, selectionActive, clearCurrentSelection]);
  

  const fillSelection = useCallback(() => {
    const color = toolParameters.foregroundColor;
    let newSelectedPixels = [];

    selectedPixels.forEach((pixel) => {
      newSelectedPixels.push({
        x: pixel.x,
        y: pixel.y,
        color: color,
      });
    });
    //Para hacer que el cambio sea permanente hay que modificar los originalColors
    setSelectedPixels(newSelectedPixels);
    const newColors = originalPixelColors.map(() => color);

    setOriginalPixelColors(newColors);
  }, [toolParameters, selectedPixels]);

  const isolateSelection = useCallback(()=>{
    
    clearCurrentSelection();

    const isolatedSelectedPixels = selectedPixels.map(({ x, y }) => ({ x, y }));

    console.log("mispixeles:", isolatedSelectedPixels);
    setIsolatedPixels(isolatedSelectedPixels);

  },[selectedPixels]);
  const groupSelection = useCallback(() => {
    if (!selectedPixels?.length) {
      alert("Selecciona píxeles primero");
      return;
    }

    const groupName = `Grupo ${getLayerGroups(activeLayerId).length + 1}`;

    // Aplicar el desplazamiento actual a las coordenadas de los píxeles
    const pixelsWithOffset = selectedPixels.map((pixel) => ({
      ...pixel,
      x: pixel.x + dragOffset.x,
      y: pixel.y + dragOffset.y,
    }));

    // Creamos el grupo y obtenemos su ID
    const newGroupId = createPixelGroup(
      activeLayerId,
      pixelsWithOffset,
      groupName
    );

    // Seleccionamos el grupo recién creado
    if (newGroupId) {
      selectPixelGroup(activeLayerId, newGroupId);
    }

    setActiveLayerId(newGroupId.groupLayerId);

    // Limpiamos
    /*
  setShowCreateGroup(null);
  setExpandedLayers(prev => ({ ...prev, [activeLayerId]: true }));
  setNewGroupName('');*/
  }, [
    selectedPixels,
    dragOffset,
    activeLayerId,
    createPixelGroup,
    selectPixelGroup,
  ]);

  const ungroupSelection = useCallback(() => {
    if (!selectedGroup) return;

    // 1. Eliminar el grupo usando la función existente
    deletePixelGroup(selectedGroup.layerId, selectedGroup.id);

    // 2. Limpiar la selección actual manteniendo los píxeles visibles

    // 3. Resetear los estados relacionados con la selección
  }, [selectedGroup, deletePixelGroup]);

  //Funciones de utilidad para layer manager:
  const handleSelectGroup = useCallback((pixels) => {
    setTool(TOOLS.select);

    if (pixels && pixels.length > 0) {
      const xCoords = pixels.map((p) => p.x);
      const yCoords = pixels.map((p) => p.y);

      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);

      // Guardar los píxeles originales con sus coordenadas absolutas
      setSelectedPixels(pixels);
      setOriginalPixelColors(
        pixels.map((p) => p.color || { r: 0, g: 0, b: 0, a: 1 })
      );
      setCroppedSelectionBounds({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      });

      // Resetear el desplazamiento al seleccionar nuevo grupo
      setDragOffset({ x: 0, y: 0 });
      setSelectionActive(true);
    }
  }, []);

  /////////////FUncion de prueba para seleccion de canvas//////////////////////////////////////////////////
  //
  const selectAllCanvas = useCallback(
    async (canvasWidth = totalWidth, canvasHeight = totalHeight) => {
      setTool(TOOLS.select);

      // Verificar que la capa existe

      try {
        // 1. Limpiar selección anterior si existe
        if (selectionActive || selectedPixels.length > 0) {
          clearCurrentSelection();
        }

        // 2. Simular el comportamiento de una selección rectangular completa
        // Definir las coordenadas desde (0,0) hasta (canvasWidth-1, canvasHeight-1)
        const startCoord = { x: 0, y: 0 };
        const endCoord = { x: canvasWidth - 1, y: canvasHeight - 1 };

        // 3. Establecer las coordenadas de selección (necesita ambos puntos para autoCropSelection)
        setSelectionCoords([startCoord, endCoord]);

        // 4. Establecer que la selección está activa temporalmente
        // Esto permitirá que el useEffect de autoCropSelection se ejecute
        setSelectionActive(true);

        // La función autoCropSelection se ejecutará automáticamente por el useEffect
        // cuando detecte que selectionCoords tiene valores y selectionActive es true
      } catch (error) {
        console.error("Error al seleccionar todo el canvas:", error);
        // Limpiar estados en caso de error
        setSelectionActive(false);
        setCroppedSelectionBounds(null);
        setSelectedPixels([]);
        setOriginalPixelColors([]);
        setSelectionCoords([]);
      }
    },
    [
      totalHeight,
      totalWidth,
      layers,
      activeLayerId,
      selectionActive,
      selectedPixels,
      clearCurrentSelection,
      setSelectionCoords,
      setSelectionActive,
      setCroppedSelectionBounds,
      setSelectedPixels,
      setOriginalPixelColors,
    ]
  );

  const colorSelection = useCallback(
    async (layerid, coords) => {
      setTool(TOOLS.select);

      try {
        // 1. Limpiar selección anterior si existe
        if (selectionActive || selectedPixels.length > 0) {
          clearCurrentSelection();
        }

        // 2. Obtener píxeles que coinciden con el color
        const pixelsByColor = getMatchingPixels(layerid, coords.x, coords.y);

        if (!pixelsByColor || pixelsByColor.length === 0) {
          console.log("No se encontraron píxeles con ese color");
          return;
        }

        // 3. NUEVA LÓGICA: En lugar de usar autoCropSelection,
        // establecer directamente los píxeles seleccionados

        // Calcular bounds reales de los píxeles encontrados
        const xCoords = pixelsByColor.map((p) => p.x);
        const yCoords = pixelsByColor.map((p) => p.y);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);

        // 4. Establecer directamente los píxeles y sus propiedades
        setSelectedPixels(pixelsByColor);

        // 5. Guardar colores originales
        const originalColors = pixelsByColor.map((pixel) => pixel.color);
        setOriginalPixelColors(originalColors);

        // 6. Establecer bounds del área seleccionada
        setCroppedSelectionBounds({
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        });

        // 7. Activar la selección
        setSelectionActive(true);
        setFinalizedSelection(true);

        // 8. Resetear offset de arrastre
        setDragOffset({ x: 0, y: 0 });

        // 9. Limpiar coordenadas de selección ya que no las necesitamos
        setSelectionCoords([]);

        console.log(`Seleccionados ${pixelsByColor.length} píxeles por color`);
      } catch (error) {
        console.error("Error al seleccionar por color:", error);
        // Limpiar estados en caso de error
        setSelectionActive(false);
        setCroppedSelectionBounds(null);
        setSelectedPixels([]);
        setOriginalPixelColors([]);
        setSelectionCoords([]);
      }
    },
    [
      layers,
      activeLayerId,
      selectionActive,
      selectedPixels,
      clearCurrentSelection,
      getMatchingPixels,
      setSelectedPixels,
      setOriginalPixelColors,
      setCroppedSelectionBounds,
      setSelectionActive,
      setFinalizedSelection,
      setDragOffset,
      setSelectionCoords,
    ]
  );

  //Funciones esenciales para el drag and dropp:
  // Mover una capa a una nueva posición en el array
  const moveLayerToPosition = (fromIndex, toIndex) => {
    const newLayers = [...layers];
    const [movedLayer] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, movedLayer);

    // Actualizar zIndex basado en la nueva posición
    newLayers.forEach((layer, index) => {
      layer.zIndex = newLayers.length - index;
    });

    setLayers(newLayers);
  };

  // Mover un grupo a otra capa
  const moveGroupToLayer = (fromLayerId, groupId, toLayerId) => {
    // Obtener el grupo de la capa origen
    const group = pixelGroups[fromLayerId]?.[groupId];
    if (!group) return;

    // Remover de la capa origen
    const newPixelGroups = { ...pixelGroups };
    delete newPixelGroups[fromLayerId][groupId];

    // Añadir a la capa destino
    if (!newPixelGroups[toLayerId]) {
      newPixelGroups[toLayerId] = {};
    }
    newPixelGroups[toLayerId][groupId] = group;

    setPixelGroups(newPixelGroups);
  };

  // Mover un grupo a una nueva posición dentro de la misma capa o entre capas
  const moveGroupToPosition = (
    fromLayerId,
    groupId,
    toLayerId,
    targetGroupId,
    position
  ) => {
    // Implementar lógica para reordenar grupos
    // Esta función dependerá de cómo manejes el orden de los grupos internamente
  };

  const updateLayerZIndex = (layerId, newZIndex) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === layerId ? { ...layer, zIndex: newZIndex } : layer
      )
    );
  };

  const previousFrozenProps = useRef();

  const frozenProps = useMemo(() => {
    if (!isPressed) {
      const newProps = {
        currentFrame,
        activeLayerId,
        frameCount,
        layers,
        frames,
       
      };
      previousFrozenProps.current = newProps;
      return newProps;
    } else {
      return previousFrozenProps.current;
    }
  }, [currentFrame, activeLayerId, frameCount, layers, frames, selectedPixels, dragOffset]);

  
  const MemoizedLayerAnimation = useMemo(() => {
    return (
      <LayerAnimation
        // Todas las props de LayerManager
        updateLayerZIndex={updateLayerZIndex}
        moveLayerToPosition={moveLayerToPosition}
        moveGroupToLayer={moveGroupToLayer}
        moveGroupToPosition={moveGroupToPosition}
        layers={layers}
        addLayer={addLayer}
        deleteLayer={deleteLayer}
        moveLayerUp={moveLayerUp}
        moveLayerDown={moveLayerDown}
        toggleLayerVisibility={toggleLayerVisibility}
        renameLayer={renameLayer}
        clearLayer={clearLayer}
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
        pixelGroups={pixelGroups}
        selectedGroup={selectedGroup}
        selectedPixels={selectedPixels}
        createPixelGroup={createPixelGroup}
        deletePixelGroup={deletePixelGroup}
        getLayerGroups={getLayerGroups}
        selectPixelGroup={selectPixelGroup}
        clearSelectedGroup={clearSelectedGroup}
        renamePixelGroup={renamePixelGroup}
        toggleGroupVisibility={toggleGroupVisibility}
        setSelectedPixels={setSelectedPixels}
        handleSelectGroup={handleSelectGroup}
        dragOffset={dragOffset}
        setSelectionCoords={setSelectionCoords}
        setSelectionActive={setSelectionActive}
        setCroppedSelectionBounds={setCroppedSelectionBounds}
        autoCropSelection={autoCropSelection}
        setOriginalPixelColors={setOriginalPixelColors}
        setDragOffset={setDragOffset}
        setTool={setTool}
        clearCurrentSelection={clearCurrentSelection}
        getHierarchicalLayers={getHierarchicalLayers}
        getMainLayers={getMainLayers}
        getGroupLayersForParent={getGroupLayersForParent}
        selectionActive={selectionActive}
        selectAllCanvas={selectAllCanvas}
        duplicateLayer={duplicateLayer}
        //Props para animacion:
        frames={frames}
        currentFrame={currentFrame}
        frameCount={frameCount}
        createFrame={createFrame}
        setActiveFrame={setActiveFrame}
        deleteFrame={deleteFrame}
        duplicateFrame={duplicateFrame}
        saveCurrentFrameState={saveCurrentFrameState}
        getFramesInfo={getFramesInfo}
        renameFrame={renameFrame}
        syncWithCurrentFrame={renameFrame}
        toggleLayerVisibilityInFrame={toggleLayerVisibilityInFrame}
        getLayerVisibility={getLayerVisibility}
        //Onion skin:

        toggleOnionSkin={toggleOnionSkin}
        setOnionSkinConfig={setOnionSkinConfig}
        setOnionSkinFrameConfig={setOnionSkinConfig}
        getOnionSkinFrameConfig={getOnionSkinFrameConfig}
        getOnionSkinPresets={getOnionSkinFrameConfig}
        applyOnionSkinPreset={applyOnionSkinPreset}
        getOnionSkinInfo={getOnionSkinFrameConfig}
        onionSkinEnabled={onionSkinEnabled}
        showOnionSkinForLayer={showOnionSkinForLayer}
        clearOnionSkinLayerFilter={clearOnionSkinLayerFilter}
        onionSkinSettings={onionSkinSettings}
        //gestion de tiempo de los frames:

        setFrameDuration={setFrameDuration}
        getFrameDuration={getFrameDuration}
        getFrameRate={getFrameRate}
        setDefaultFrameRate={setDefaultFrameRate}
        defaultFrameDuration={defaultFrameDuration}
        //gestion de opacidad de los frames:
        setFrameOpacity={setFrameOpacity}
        getFrameOpacity={getFrameOpacity}
        framesResume={framesResume}
        setFramesResume={setFramesResume}
        externalCanvasRef={previewAnimationRef}
        viewportOffset={viewportOffset}
        viewportWidth={viewportWidth}
        viewportHeight={viewportHeight}
        zoom={zoom}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />
    );
  }, [
    // Solo las dependencias que realmente afectan LayerAnimation
    frozenProps,
  isPlaying,
    viewportOffset,
    zoom,
    framesResume,
    selectedPixels,
    dragOffset

    // NO incluir position ni relativeToTarget aquí
  ]);

  const MemoizedRightPanel = useMemo(() => {
    return (
      <div
        className="right-panel"
        style={{
          padding: 10,
        }}
      >
        {true && (
          <ViewportNavigator
            totalWidth={totalWidth}
            totalHeight={totalHeight}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
            viewportOffset={viewportOffset}
            zoom={zoom}
            onViewportMove={moveViewport}
            onZoomChange={handleZoomChange} // Nueva prop necesaria
            compositeCanvasRef={compositeCanvasRef}
            getFullCanvas={getFullCanvas}
          />
        )}
        <LayerColor
          tool={tool}
          toolParameters={toolParameters}
          setToolParameters={setToolParameters}
          //funcion para obtener informacion de pixeles pintados:
          getLayerPixelData={getLayerPixelData}
          paintPixelsRGBA={paintPixelsRGBA}
          //otras props necesarias,
          currentFrame={currentFrame}
          activeLayerId={activeLayerId}
          isPressed={isPressed}
        />
        <PlayAnimation frames={frames} />
      </div>
    );
  }, [
    // Solo dependencias estables
    isPressed,
    viewportOffset,
    totalWidth,
    totalHeight,
    viewportWidth,
    viewportHeight,
    zoom,
    tool,
    toolParameters,
    framesResume,

    // NO incluir datos de mouse
  ]);
  const [contadorFrames, setContadorFrames] = useState(0);

  //autoguardado
  /*
  useEffect(()=>{
   setContadorFrames(contadorFrames+1);
    const esDivisibleEntre3 = contadorFrames % 3 === 0; 

    if(esDivisibleEntre3){
      console.log("autoguardado exitoso");
      handleExport();
    }

  },[framesResume])*/
  /*Cursor reactivo */

  useEffect(()=>{
    if(isSpacePressed){
      workspaceRef.current.style.cursor = "grab";
      return
    }
    if(isSpacePressed && isDragging){
      workspaceRef.current.style.cursor = "grabbing";
      return
    }
   
      workspaceRef.current.style.cursor = reactiveCursor(tool, toolParameters);
      

    
  },[tool,drawMode,isDragging, isSpacePressed,toolParameters])


  useEffect(() => {
    // Invalidar cache al cambiar de capa activa
    invalidateImageDataCache();
  }, [activeLayerId,toolParameters,currentFrame,drawableWidth, drawableHeight, isolatedPixels, tool, framesResume, selectedPixels]);
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Solo procesar si hay una selección activa o píxeles copiados (para pegar)
      const hasActiveSelection = selectionActive && selectedPixels.length > 0;
      const hasCopiedPixels = copiedPixels && copiedPixels.pixels && copiedPixels.pixels.length > 0;
      
      // Verificar si se está presionando Ctrl (o Cmd en Mac)
      const isCtrlPressed = e.ctrlKey || e.metaKey;
      
      if (!isCtrlPressed) return;
      
      // Prevenir el comportamiento por defecto del navegador
      e.preventDefault();
      
      switch (e.key.toLowerCase()) {
        case 'c':
          // Ctrl+C - Copiar selección
          if (hasActiveSelection) {
            copySelection();
            console.log('Selección copiada');
          } else {
            console.log('No hay selección activa para copiar');
          }
          break;
          
        case 'x':
          // Ctrl+X - Cortar selección
          if (hasActiveSelection) {
            cutSelection();
            console.log('Selección cortada');
          } else {
            console.log('No hay selección activa para cortar');
          }
          break;
          
        case 'v':
          // Ctrl+V - Pegar selección
          if (hasCopiedPixels) {
            pastePixels();
            console.log('Selección pegada');
          } else {
            console.log('No hay píxeles en el portapapeles para pegar');
          }
          break;
          
        default:
          break;
      }
    };
  
    // Agregar el event listener
    window.addEventListener('keydown', handleKeyDown);
  
    // Cleanup - remover el event listener cuando el componente se desmonte
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectionActive, 
    selectedPixels, 
    copiedPixels, 
    copySelection, 
    cutSelection, 
    pastePixels
  ]);

  //gESTION DE LAS BROCHAS PERSONALIZADAS
// estas seran un array de brochas [{}]
// GESTIÓN DE LAS BROCHAS PERSONALIZADAS
// estas serán un array de brochas [{}]
// GESTIÓN DE LAS BROCHAS PERSONALIZADAS
// estas serán un array de brochas [{}]
useEffect(() => {
  const handleKeyDown = (e) => {
    // Verificar si se está presionando Ctrl (o Cmd en Mac)
    const isCtrlPressed = e.ctrlKey || e.metaKey;
    
    // Solo procesar Ctrl+B
    if (!isCtrlPressed || e.key.toLowerCase() !== 'b') return;
    
    // Verificar si hay una selección activa con píxeles
    const hasActiveSelection = selectionActive && selectedPixels.length > 0 && originalPixelColors.length > 0;
    
    if (!hasActiveSelection) {
      console.log('No hay selección activa para convertir en brocha');
      return;
    }
    
    // Prevenir el comportamiento por defecto del navegador
    e.preventDefault();
    
    try {
      // Calcular el bounding box de la selección
      const xCoords = selectedPixels.map(p => p.x);
      const yCoords = selectedPixels.map(p => p.y);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);
      
      // Convertir píxeles a coordenadas relativas desde el centro de la brocha
      const centerX = Math.floor((minX + maxX) / 2);
      const centerY = Math.floor((minY + maxY) / 2);
      
      // Crear los datos de la brocha con coordenadas relativas y colores FIJOS
      const brushData = selectedPixels.map((pixel, index) => ({
        x: pixel.x - centerX,
        y: pixel.y - centerY,
        // CAMBIO PRINCIPAL: Usar colores fijos como en la brocha arcoíris
        color: originalPixelColors[index] ? {
          r: originalPixelColors[index].r,
          g: originalPixelColors[index].g,
          b: originalPixelColors[index].b,
          a: 255 // Usar alpha fijo de 255 como en arcoíris
        } : {
          r: 0,
          g: 0, 
          b: 0,
          a: 255
        }
        // NO incluir opacity aquí, ya que está en el color.a
      }));
      
      // Generar nombre único para la brocha
      const brushCount = myBrushes ? myBrushes.length : 0;
      const brushName = `Mi Brocha ${brushCount + 1}`;
      
      // Crear la nueva brocha con colores FIJOS (como arcoíris)
      const newBrush = {
        id: `custom_brush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: brushName,
        customBrush: true,
        useCurrentColor: false, // CAMBIO PRINCIPAL: false para usar colores fijos
        data: brushData,
        isMyBrush: true,
        createdAt: Date.now(),
        dimensions: {
          width: maxX - minX + 1,
          height: maxY - minY + 1
        }
      };
      
      // Actualizar el array de brochas personalizadas
      const updatedMyBrushes = myBrushes ? [...myBrushes, newBrush] : [newBrush];
      setMyBrushes(updatedMyBrushes);
      
      console.log(`Brocha "${brushName}" creada exitosamente con ${brushData.length} píxeles y colores fijos`);
      
      // Opcional: Limpiar la selección después de crear la brocha
      clearCurrentSelection();
      
      // Opcional: Cambiar automáticamente a la herramienta de pincel y seleccionar la nueva brocha
      setTool(TOOLS.paint);
      
    } catch (error) {
      console.error('Error al crear la brocha personalizada:', error);
    }
  };

  // Agregar el event listener
  window.addEventListener('keydown', handleKeyDown);

  // Cleanup - remover el event listener cuando el componente se desmonte
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [
  selectedPixels, 
  originalPixelColors, 
  selectionActive, 
  myBrushes, 
  setMyBrushes,
  clearCurrentSelection,
  setTool
]);
  const [checkerboardFactor, setCheckerboardFactor] = useState(32);
  return (
    <div className="complete-canvas-tracker">
       <TopToolbar companyName="Argánion">
        <div className="tools" style={{ display: "flex", gap: "8px" }}>
          <div
            className={true ? "grid-control active" : "grid-control"}
            onClick={true ? () => undo() : undefined}
          >
            <LuUndo />
            <p>Undo</p>
          </div>
          <div
            className={true ? "grid-control active" : "grid-control"}
            onClick={() => {
              redo();
            }}
          >
            <p>Redo</p>
            <LuRedo />
          </div>
          <div
            className={true ? "grid-control active" : "grid-control"}
            onClick={() => {
              setActiveAI(!activeAI);
            }}
          >
            <p>Generador IA</p>
            <LuBrainCircuit />
          </div>
          <div
            className={activeGrid ? "grid-control active" : "grid-control"}
            onClick={() => {
              setActiveGrid(!activeGrid);
            }}
          >
            <p>Grid</p>
            <LuGrid2X2 />
          </div>
          <div
            className={true ? "grid-control active" : "grid-control"}
            onClick={() => {
              handleExport();
            }}
          >
            <p>Guardar</p>
            <LuSave />
          </div>
          <div
            className={true ? "grid-control active" : "grid-control"}
            onClick={() => {
              pastePixels();
            }}
          >
            <p>Pegar</p>
            <p>P</p>
          </div>
          {isolatedPixels&&
          <div
            className={true ? "grid-control active" : "grid-control"}
            onClick={() => {
              setIsolatedPixels(null);
            }}
          >
            <p>Salir de aislamiento</p>
            <FaFileExport />
          </div>
          }
        </div>
        <ReflexMode
          mirrorState={mirrorState}
          setMirrorState={setMirrorState}
          totalHeight={totalHeight}
          totalWidth={totalWidth}
          setTotalHeight={setTotalHeight}
          setTotalWidth={setTotalWidth}
          setDrawableHeight={setDrawableHeight}
          setDrawableWidth={setDrawableWidth}
          setPositionCorners={setPositionCorners}
        />
      </TopToolbar>

      <div
        className="workspace2-container"
        style={{ position: "relative", display: "flex", maxWidth:'100vw' }}
      >
        <NavbarLateral
      logo={<div style={{ fontWeight: '400', fontSize: '1rem', marginTop:'0px', display:'flex', gap: '10px',
        alignContent:'center', justifyContent:'center', width: "60px"
       }}>
        
      
      </div>}
      tool={tool}
      activeTool={tool}
      items={navItemsLateral}
      variant={navConfigLateral.variant}
      theme={navConfigLateral.theme}
      showOnlyIcons={navConfigLateral.showOnlyIcons}
      twoColumns={navConfigLateral.twoColumns}
    />
    
        {
          <div style={{ display: activeAI ? "block" : "none" }}>
            <AIgenerator
              createLayerAndPaintDataUrlCentered={
                createLayerAndPaintDataUrlCentered
              }
            />
          </div>
        }

        {/* Canvas Area */}
        <div
          className="workspace-container"
          style={{ flex: "1", position: "relative" }}
        >
         
          <div
            className="toolbar"
            style={{
              display: "flex",
              padding: "8px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            
            <CustomTool tool={tool} setToolParameters={setToolParameters} myBrushes={myBrushes}/>

            {/* Coordinates info */}
          </div>

          <div
            onContextMenu={(e) => e.preventDefault()}
            className="workspace"
            ref={workspaceRef}
            style={{
              width: "100%",
              height: "calc(100% - 50px)",
              position: "relative",
              overflow: "hidden",
             
            }}
          >
            
            <div
              className="canvas-container"
              ref={canvasContainerRef}
              style={{
                transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
                position: "absolute",
                top: "50%",
                left: "50%",
                willChange: "transform",
              }}
            >
              <div
                className="artboard"
                ref={artboardRef}
                style={{
                  imageRendering: "pixelated",
                  width: viewportWidth * zoom,
                  height: viewportHeight * zoom,
                  position: "relative",

                  backgroundColor: "rgb(128, 128, 128)",
                  backgroundImage: `
      linear-gradient(45deg,rgb(185, 183, 183) 25%, transparent 25%), 
      linear-gradient(-45deg, rgb(185, 183, 183) 25%, transparent 25%), 
      linear-gradient(45deg, transparent 75%,rgb(185, 183, 183) 75%), 
      linear-gradient(-45deg, transparent 75%,rgb(185, 183, 183) 75%)
    `,
                  backgroundSize: `${zoom * 2 * checkerboardFactor}px ${
                    zoom * 2 * checkerboardFactor
                  }px`,
                  // MODIFICACIÓN PRINCIPAL: Ajustar backgroundPosition basándose en viewportOffset
                  backgroundPosition: `
      ${(-viewportOffset.x * zoom) % (zoom * 2 * checkerboardFactor)}px ${
                    (-viewportOffset.y * zoom) % (zoom * 2 * checkerboardFactor)
                  }px,
      ${(-viewportOffset.x * zoom) % (zoom * 2 * checkerboardFactor)}px ${
                    (-viewportOffset.y * zoom + zoom * checkerboardFactor) %
                    (zoom * 2 * checkerboardFactor)
                  }px,
      ${
        (-viewportOffset.x * zoom + zoom * checkerboardFactor) %
        (zoom * 2 * checkerboardFactor)
      }px ${
                    (-viewportOffset.y * zoom - zoom * checkerboardFactor) %
                    (zoom * 2 * checkerboardFactor)
                  }px,
      ${
        (-viewportOffset.x * zoom - zoom * checkerboardFactor) %
        (zoom * 2 * checkerboardFactor)
      }px ${(-viewportOffset.y * zoom) % (zoom * 2 * checkerboardFactor)}px
    `,
                }}
              >
                {croppedSelectionBounds && selectionActive && !isPressed && (
                  <div
                    ref={selectionActionsRef}
                    className="workspace-selection-actions"
                    style={{
                      position: "absolute",
                      top:
                        (croppedSelectionBounds.y +
                          dragOffset.y -
                          viewportOffset.y) *
                        zoom,
                      left:
                        (croppedSelectionBounds.x +
                          croppedSelectionBounds.width +
                          dragOffset.x -
                          viewportOffset.x) *
                        zoom,
                      zIndex: 10,
                      pointerEvents: "auto", // Asegurar que el div puede recibir eventos
                    }}
                  >
                    <div className="selection-actions-buttons">
                      <button
                        className="action-button"
                        onClick={() => {
                          handleRotation("left");
                        }}
                      >
                        <span className="icon">
                          <MdOutlineRotate90DegreesCcw />
                        </span>
                        <p className="action-text"></p>
                      </button>
                      <button
                        className="action-button"
                        onClick={() => {
                          handleRotation("right");
                        }}
                      >
                        <span className="icon">
                          <MdOutlineRotate90DegreesCw />
                        </span>
                        <p className="action-text"></p>
                      </button>
                      <button
                        className="action-button"
                        onClick={deleteSelection}
                      >
                        <span className="icon">
                          <LuEraser />
                        </span>
                        <p className="action-text">Borrar</p>
                      </button>
                      {
                        <button
                          className="action-button"
                          onClick={fillSelection}
                        >
                          <span className="icon">
                            <LuPaintBucket />
                          </span>
                          <p className="action-text">Rellenar</p>
                        </button>
                      }
                      <button
                        className="action-button"
                        onClick={clearCurrentSelection}
                      >
                        <span className="icon">
                          <LuPointerOff />
                        </span>
                        <p className="action-text">Deseleccionar</p>
                      </button>
                      <button
                        className="action-button"
                        onClick={groupSelection}
                      >
                        <span className="icon">
                          <LuGroup />
                        </span>
                        <p className="action-text">Agrupar</p>
                      </button>

                      <button
                        className="action-button"
                        onClick={ungroupSelection}
                      >
                        <span className="icon">
                          <LuGroup />
                        </span>
                        <p className="action-text">Desagrupar</p>
                      </button>
                      <button
                        className="action-button"
                        onClick={duplicateSelection}
                      >
                        <span className="icon">D</span>
                        <p className="action-text">Duplicar </p>
                      </button>
                      <button className="action-button" onClick={copySelection}>
                        <span className="icon">c</span>
                        <p className="action-text">Copiar </p>
                      </button>
                      <button className="action-button" onClick={cutSelection}>
                        <span className="icon">cu</span>
                        <p className="action-text">Cortar </p>
                      </button>
                      <button className="action-button" onClick={isolateSelection}>
                        <span className="icon">I</span>
                        <p className="action-text">Aislar pixeles </p>
                      </button>
                    </div>
                  </div>
                )}
              
  <div style={{display: mirrorState.customArea ? "block" : "none" }}>
    {/* Esquina superior izquierda */}
    <div
      ref={leftMirrorCornerRef}
      className="canvas-resize-handle-container"
      style={{
        position: "absolute",
        top: (positionCorners.y1 - viewportOffset.y) * zoom - 15,
        left: (positionCorners.x1 - viewportOffset.x) * zoom - 15,
        zIndex: 15, // Z-index más alto
        pointerEvents: "auto",
        cursor: leftIsPressedMirror ? 'grabbing' : 'grab',
      }}
    >
      <div className="resize-handle-wrapper">
        <button 
          className={`resize-handle resize-handle-nw ${leftIsPressedMirror ? 'dragging' : ''}`}
          style={{
            backgroundColor: leftIsPressedMirror ? '#ff4444' : '#4444ff',
            transform: leftIsPressedMirror ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.1s ease'
          }}
        >
          <span className="resize-handle-icon">
            <GrTopCorner />
          </span>
        </button>
        <p className="area-canvas-size-text">
          {Math.abs(mirrorState.bounds.x2 - mirrorState.bounds.x1)}x
          {Math.abs(mirrorState.bounds.y2 - mirrorState.bounds.y1)}
        </p>
      </div>
    </div>

    {/* Esquina inferior derecha */}
    <div
      ref={rightMirrorCornerRef}
      className="canvas-resize-handle-container"
      style={{
        position: "absolute",
        top: (positionCorners.y2 - viewportOffset.y) * zoom - 15,
        left: (positionCorners.x2 - viewportOffset.x) * zoom - 15,
        zIndex: 15, // Z-index más alto
        pointerEvents: "auto",
        cursor: rightIsPressedMirror ? 'grabbing' : 'grab',
      }}
    >
      <div className="resize-handle-wrapper">
        <button 
          className={`resize-handle resize-handle-se ${rightIsPressedMirror ? 'dragging' : ''}`}
          style={{
            backgroundColor: rightIsPressedMirror ? '#ff4444' : '#4444ff',
            transform: rightIsPressedMirror ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.1s ease'
          }}
        >
          <span className="resize-handle-icon">
            <GrBottomCorner />
          </span>
        </button>
      </div>
    </div>
  </div >


                {/* Composite Canvas - only this canvas is actually in the DOM */}

                <canvas
                  ref={isPlaying ? previewAnimationRef : compositeCanvasRef}
                  width={viewportWidth * zoom}
                  height={viewportHeight * zoom}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                  }}
                />

                <canvas
                  ref={selectionCanvasRef}
                  width={viewportWidth * zoom}
                  height={viewportHeight * zoom}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    zIndex: 11,
                  }}
                />

                <canvas
                  ref={mirrorCanvasRef}
                  width={viewportWidth * zoom}
                  height={viewportHeight * zoom}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    zIndex: 11,
                  }}
                />
                <canvas
                  ref={previewCanvasRef}
                  width={viewportWidth * zoom}
                  height={viewportHeight * zoom}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                  }}
                />

       
              </div>
            </div>
          </div>

          {
            <div
              onContextMenu={(e) => e.preventDefault()}
              ref={animationLayerRef}
              style={{
                height: "230px",
             
                width:"100%",
                userSelect: "none",
                bottom: "0",
              }}
            >



              {MemoizedLayerAnimation}
            </div>
          }
        </div>

        {MemoizedRightPanel}
        {false && (
          <SaveProject
            frames={frames}
            currentFrame={currentFrame}
            framesResume={framesResume}
            onProjectLoaded={""}
            projectMetadata={{
              author: "Tu Nombre",
              description: "Mi proyecto de pixel art",
              tags: ["pixel-art", "animación"],
            }}
          />
        )}
      </div>
    </div>
  );
}

export default CanvasTracker;
