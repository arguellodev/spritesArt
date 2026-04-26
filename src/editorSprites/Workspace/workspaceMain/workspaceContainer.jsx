import { useCallback, useEffect, useRef, useState, useMemo, Activity } from "react";
import { usePointer, useLayerManager } from "../hooks/hooks";
import { flushSync } from "react-dom";
import PlayingAnimation from "./playingAnimation";
import { jsAlgorithm } from "../rotesprite";
import reactiveCursor from "./cursorIcons";
import AnimationExporter from "../export/animationExporter";
import SimpleEyedropper from "../customTool/simpleEyeDropper";
import FramesTimeline from "./timeline";
import ThreeJSModal from "./ThreeJsDemo";
import SimpleObjModal from "./Threeloader";
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
  LuUpload,
  LuBox,
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
import { BsEyedropper, BsPentagon } from "react-icons/bs";

import Enhanced3DFlattener from "./ThreeJsDemo";

import { rasterEllipse, rasterPolygon, rasterLine } from "../rasterizers/primitives";
import { pixelPerfect, pixelPerfectPath } from "../rasterizers/pixelPerfect";
import { gaussianBlurRGBA } from "../rasterizers/filters";

// Módulos extraídos durante la refactorización (ver ./container/*).
import { TOOLS } from "./container/constants/tools";
import { buildNavItemsLateral } from "./container/constants/navItems";
import {
  isPointInPolygon as isPointInPolygonUtil,
  calculateLassoBoundsFromPoints,
  findNonEmptyBounds as findNonEmptyBoundsUtil,
  clampCoordinates as clampCoordinatesUtil,
  calculateRotationAngle as calculateRotationAngleUtil,
  getRotationHandlerPosition as getRotationHandlerPositionUtil,
} from "./container/utils/geometry";
import {
  buildIsolatedPixelsSet,
  canPaintAtPixel as canPaintAtPixelUtil,
  isPixelIsolated as isPixelIsolatedUtil,
  isPixelIsolatedOptimized as isPixelIsolatedOptimizedUtil,
} from "./container/utils/pixelMask";
import {
  initializeWebGLImageRenderer as initializeWebGLImageRendererUtil,
  putImageDataOptimized as putImageDataOptimizedUtil,
  disposeWebGLImageRenderer,
} from "./container/utils/webglRenderer";
import {
  smoothStroke as smoothStrokeUtil,
  straightenNearStraightSegments as straightenNearStraightSegmentsUtil,
  applyCurveSmoothing as applyCurveSmoothingUtil,
} from "./container/utils/strokeSmoothing";
import { drawQuadraticCurve as drawQuadraticCurveUtil } from "./container/utils/curveDrawing";
import { applyRotSprite as applyRotSpriteUtil } from "./container/utils/rotSpriteHelpers";
import RotationCircle from "./container/components/RotationCircle";
import SelectionActionsMenu from "./container/components/SelectionActionsMenu";
import MirrorCornerHandles from "./container/components/MirrorCornerHandles";
import { renderLayerAnimation } from "./container/components/memoized/memoizedLayerAnimation";
import { renderFramesTimeline } from "./container/components/memoized/memoizedFramesTimeline";
import { renderViewportNavigator } from "./container/components/memoized/memoizedViewportNavigator";
import { renderLayerColor } from "./container/components/memoized/memoizedLayerColor";
import { renderPlayAnimation } from "./container/components/memoized/memoizedPlayAnimation";
import { RightPanel } from "../panels/rightPanel";

// Modales/paneles nuevos (features del plan ambicioso — Sprint 1–6).
import FiltersModal from "../filters/filtersModal";
import TextTool from "../customTool/tools/textTool";
import ScriptRunnerPanel from "../scripting/scriptRunnerPanel";
import { buildScriptSnapshot, applyScriptPatch } from "../scripting/api";
import HistoryPanel from "../history/historyPanel";
import TagsPanel from "../animation/tagsPanel";
import KeybindingsPanel from "../settings/keybindingsPanel";
import { useKeybindingsRegistry, useKeybindingsListener } from "../input/useKeybindings";
import { maskFromMagicWand, countSelected } from "../selection/selectionMask";
import { combineMasks } from "../selection/selectionOps";
import MarchingAnts from "../overlays/marchingAnts";
import Rulers from "../overlays/rulers";
import TilesetPanel from "../tilemap/tilesetPanel";
import { createTileset } from "../tilemap/tileset";
import { serializeTileset, deserializeTileset } from "../tilemap/tilesetSerialization";
import SlicesPanel from "../slices/slicesPanel";
import { drawSlicesOverlay } from "../slices/sliceLayer";
import { loadReferenceFromFile } from "../layers/referenceLayer";
import { loadAsepriteFile, asepriteDocToPixcalli } from "../formats/aseprite";
import { autoCrop } from "../canvas/autoCrop";
import MagicWandTool from "../customTool/tools/magicWandTool";
import ReferenceLayersPanel from "../layers/referenceLayersPanel";
import StabilizerSlider from "../customTool/stabilizerSlider";

// TOOLS ahora vive en ./container/constants/tools.js (import arriba).

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

  // navItemsLateral ahora lo construye `buildNavItemsLateral` desde
  // ./container/constants/navItems.jsx. Se memoiza para estabilizar
  // identidad mientras `setTool` no cambie.
  const navItemsLateral = useMemo(() => buildNavItemsLateral(setTool), [setTool]);

  const [navConfigLateral, setNavLateralConfig] = useState({
    variant: "vertical",
    theme: "dark",
    showOnlyIcons: true,
    twoColumns: false,
  });

//Brochas creadas:

const [myBrushes, setMyBrushes] = useState(null);



const [rotationAngle, setRotationAngle] = useState(0);
  //Reproduccion:
  const [isPlaying, setIsPlaying] = useState(false);
  // Frame actualmente mostrado por el motor de animación durante playback.
  // Emitido por `useAnimationPlayer` en `layerAnimation.jsx` vía `onFrameChange`
  // y propagado a `FramesTimeline` para que su header-row ilumine el frame
  // activo (la celda que "se enciende" al darle play).
  const [animationTickFrame, setAnimationTickFrame] = useState(null);
  const handleAnimationFrameChange = useCallback((_frameIndex, frameNumber) => {
    setAnimationTickFrame(frameNumber);
  }, []);

  // --- Panel de animación: altura redimensionable + modo colapsado ---
  // Ambos persisten en localStorage. El resize handle vive en el borde
  // superior del contenedor `.layer-animation` (ver JSX más abajo).
  const LAYER_ANIM_H_KEY = 'layerAnimationHeight';
  const LAYER_ANIM_COLLAPSED_KEY = 'layerAnimationCollapsed';
  const LAYER_ANIM_MIN_H = 120;   // altura mínima en modo expandido
  const LAYER_ANIM_MAX_H = 720;   // cap razonable (no tapar toda la pantalla)
  // Modo collapsed: toolbar (44px) + timeline-header-row (28px) + bordes/separaciones.
  // Mantenemos el strip de frame-numbers visible para ver el frame que se
  // ilumina durante playback; ocultamos solo las filas de capas (ver CSS
  // `.layer-animation.collapsed .timeline-layers`).
  const LAYER_ANIM_COLLAPSED_H = 84;
  const [layerAnimationHeight, setLayerAnimationHeight] = useState(() => {
    try {
      const raw = localStorage.getItem(LAYER_ANIM_H_KEY);
      const n = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(n) && n >= LAYER_ANIM_MIN_H && n <= LAYER_ANIM_MAX_H) return n;
    } catch { /* localStorage unavailable, fall through */ }
    return 230;
  });
  const [isLayerAnimationCollapsed, setIsLayerAnimationCollapsed] = useState(() => {
    try { return localStorage.getItem(LAYER_ANIM_COLLAPSED_KEY) === '1'; }
    catch { return false; }
  });
  const toggleLayerAnimationCollapse = useCallback(() => {
    setIsLayerAnimationCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(LAYER_ANIM_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  }, []);

  // Drag-to-resize vertical: handle en el top del contenedor. El panel vive
  // anclado al bottom (`bottom: 0`), así que mover el handle HACIA ARRIBA
  // aumenta la altura; hacia abajo, la reduce. Usamos refs para evitar
  // re-renders en cada pixel (pattern idéntico al resizer de columnas de
  // FramesTimeline).
  const [isResizingLayerAnim, setIsResizingLayerAnim] = useState(false);
  const layerAnimResizeStartYRef = useRef(0);
  const layerAnimResizeStartHRef = useRef(layerAnimationHeight);
  const handleLayerAnimResizeMouseDown = useCallback((e) => {
    if (isLayerAnimationCollapsed) return; // no resize cuando está colapsado
    e.preventDefault();
    e.stopPropagation();
    layerAnimResizeStartYRef.current = e.clientY;
    layerAnimResizeStartHRef.current = layerAnimationHeight;
    setIsResizingLayerAnim(true);
  }, [isLayerAnimationCollapsed, layerAnimationHeight]);

  useEffect(() => {
    if (!isResizingLayerAnim) return;
    const onMove = (e) => {
      const dy = layerAnimResizeStartYRef.current - e.clientY; // up = positivo
      const next = Math.max(
        LAYER_ANIM_MIN_H,
        Math.min(LAYER_ANIM_MAX_H, layerAnimResizeStartHRef.current + dy)
      );
      setLayerAnimationHeight(next);
    };
    const onUp = () => {
      setIsResizingLayerAnim(false);
      // Persistir al final del drag (no en cada tick) para no spammear localStorage
      try { localStorage.setItem(LAYER_ANIM_H_KEY, String(layerAnimationHeight)); } catch { /* noop */ }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizingLayerAnim, layerAnimationHeight]);
  // estado especial para manejo de gradiente editable
  const [gradientPixels, setGradientPixels] = useState(null);
  //Estados de la inteligencia artificial:
  const [activeAI, setActiveAI] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] =useState(false);

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
  // Ref imperativo al reproductor `PlayAnimation` (mini, en RightPanel).
  const playAnimationRef = useRef(null);
  // Ref imperativo al reproductor principal (el que vive en LayerAnimation
  // — el mismo motor que se ve play/pause desde la animation-bar). Se
  // popula desde layerAnimation.jsx via useEffect. Permite que
  // handlePlayTag/handlePlayRange dispare bucles en el reproductor
  // principal y no solo en el mini.
  const mainPlayerApiRef = useRef(null);
  const rotationHandlerRef = useRef(null);

// Agregar estos refs al inicio del componente CanvasTracker
const webglRendererRef = useRef(null);
const textureRef = useRef(null);

//PARA EXPORTAR:

const [showExporter, setShowExporter] = useState(false);
const [showSaveProject, setShowSaveProject] = useState(false);

// Modales nuevos del plan ambicioso.
const [showFiltersModal, setShowFiltersModal] = useState(false);
const [showTextTool, setShowTextTool] = useState(false);
const [showScriptRunner, setShowScriptRunner] = useState(false);

// Estado para paneles del dock: animation tags (lista persistible a .pixcalli).
const [animationTags, setAnimationTags] = useState([]);
// Bucle global de la animacion. Se lift-ea aqui (no en LayerAnimation)
// para que tanto el panel de timeline como el reproductor del dock derecho
// (PlayAnimation) compartan el mismo estado y se persista en .pixcalli.
const [loopEnabled, setLoopEnabled] = useState(true);
// Info del bucle activo: rango actualmente reproduciendose (con nombre/color
// si proviene de un tag), y target (cual reproductor lo esta corriendo).
// Sirve para mostrar chips en cada reproductor con el contexto del bucle y
// para implementar "salir del bucle" (clear).
//
//   { from: number, to: number,
//     target: 'main' | 'mini',
//     tagId?: string, tagName?: string, tagColor?: string }
const [loopInfo, setLoopInfo] = useState(null);
// Slices (regiones nombradas con bounds/pivot/9-slice); ver slices/sliceLayer.js.
const [slices, setSlices] = useState([]);
// Tileset opcional (un documento puede tener cero o un tileset global por ahora).
const [tileset, setTileset] = useState(null);
// Capas de referencia (imágenes bloqueadas, no exportables; solo metadata serializable).
const [referenceLayers, setReferenceLayers] = useState([]);
// Guías arrastradas desde las reglas.
const [guides, setGuides] = useState([]);
// Paletas custom del usuario (mirror del localStorage — se persisten también en .pixcalli).
const [customPalettes, setCustomPalettes] = useState([]);

// Toggle de overlays visuales (rulers / guides / slices).
const [showRulers, setShowRulers] = useState(false);
const [showSlicesOverlay, setShowSlicesOverlay] = useState(true);

// Último cursor en coordenadas de canvas lógico — útil para las reglas.
const [rulersCursor, setRulersCursor] = useState(null);

// Magic wand: máscara de selección activa (Uint8Array wrapper).
// Null hasta el primer click con la varita. Se combina con modifiers Shift/Alt
// usando combineMasks para permitir add/subtract/intersect.
const [magicWandMask, setMagicWandMask] = useState(null);
const [magicWandParams, setMagicWandParams] = useState({
  tolerance: 0,
  contiguous: true,
  matchAlpha: true,
  booleanOp: 'replace',
});

// Registry de keybindings (compartido entre el listener global y el panel de Settings).
// Los handlers individuales se registran con registry.register(...) más abajo
// una vez que las funciones (undo/redo, navegación, etc.) estén en scope.
const keybindingsRegistry = useKeybindingsRegistry();
useKeybindingsListener(keybindingsRegistry);

  // Refs para inicio de herramientas
  const squareStartRef = useRef(null);
  const triangleStartRef = useRef(null);
  const circleStartRef = useRef(null);
  const ellipseStartRef = useRef(null);
  const polygonStartRef = useRef(null);
  const pencilPerfectPathRef = useRef([]);
  
//pencil perfect



  // Estados principales

  const [zoom, setZoom] = useState(10);
  const [workspaceWidth, setWorkspaceWidth] = useState(1000);
  const [workspaceHeight, setWorkspaceHeight] = useState(1000);
  const [color, setColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  const [activeGrid, setActiveGrid] = useState(true);
  const [rotationAngleSelection, setRotationAngleSelection] = useState(0);
  const [threeJsVisualizer, setThreeJsVisualizer] = useState(false);

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
  //estado para eyedropper

  const [eyeDropperColor, setEyeDropperColor] = useState('#ffffff');

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

  //Inicializadores de color: deben coincidir con los defaults internos de
  // LayerColor (layerColor.jsx:23-28). Si no coinciden y el RightPanel arranca
  // colapsado, LayerColor nunca se monta, su useEffect de sincronización no
  // corre y toolParameters se queda con estos valores → todo se pinta en negro.
  const [foregroundColor, setForegroundColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
  const [backgroundCOlor, setBackgroundColor] = useState({ r: 255, g: 255, b: 255, a: 1 });
  const [fillColor, setFillColor] = useState({ r: 255, g: 0, b: 0, a: 1 });
  const [borderColor, setBorderColor] = useState({ r: 0, g: 0, b: 0, a: 1 });
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
    rotationHandlerRef
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
    compositeRender,
    historyPush,
    moveViewport,
    viewportToCanvasCoords,
    drawPixelLine,
    getLayerData,
    getCompositeLayerData,
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

    //modos de fusión:
    resolveLayerBlendMode,
    setLayerBlendMode,
    setFrameBlendModeOverride,

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
    clearHistory,
    canUndo,
    canRedo,
    debugInfo,
    history,
    commitShapeWithHistory,

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

    //el verdadero onion skin:
    onionFramesConfig, // Recibir la configuración actual del estado principal
  setOnionFramesConfig, // Función para actualizar la configuración
  updateFrameConfig,
  addPreviousFrame,
  addNextFrame,
  removeFrame,
  toggleOnionFrames,
  applyOnionFramesPreset,
  clearTintCache,

  // Restauración desde formato .pixcalli v2
  restoreFromProjectData,

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

  // Sincronizar compositeRenderRef (declarada más arriba) con la fn real
  // del hook. Necesario para que los handlers definidos antes de la
  // declaración final (handleImportAseprite, handleAutoCrop) puedan invocarla.
  useEffect(() => { compositeRenderRef.current = compositeRender; }, [compositeRender]);

  // Registrar keybindings centralizados. Los handlers cierran sobre las fns de
  // useLayerManager y las setters de modales. El listener global ya está montado
  // (línea arriba) — esto solo puebla el registry para que el panel de Settings
  // los muestre y permita rebindar.
  // Refs estables para los handlers de undo/redo — el registry captura una
  // cerradura en su callback al ejecutarse el useEffect, y necesitamos que
  // siempre llame a la última versión (que incluye cache invalidation).
  const handleUndoRef = useRef(() => undo?.());
  const handleRedoRef = useRef(() => redo?.());

  // Ref wrappers para funciones que se declaran más abajo en el componente
  // pero necesitan ser referenciadas por handlers definidos aquí (TDZ guard).
  // Se sincronizan vía useEffect tras la declaración real (ver más abajo).
  const invalidateCacheRef = useRef(() => {});
  const compositeRenderRef = useRef(() => {});

  useEffect(() => {
    // Nota: los Ctrl+Z / Ctrl+Y también están enganchados via listener keydown
    // directo más abajo. Ambos caminos van a través de handleUndo/handleRedo
    // que invalidan `cachedImageDataRef` tras el undo, evitando el bug de
    // "pixels fantasma reaparecen al repintar sobre el trazo deshecho".
    keybindingsRegistry.register('editor.undo',          ['ctrl+z', 'meta+z'],          () => handleUndoRef.current(),          'Deshacer');
    keybindingsRegistry.register('editor.redo',          ['ctrl+y', 'ctrl+shift+z'],    () => handleRedoRef.current(),          'Rehacer');
    keybindingsRegistry.register('editor.save',          ['ctrl+s', 'meta+s'],          () => setShowSaveProject(true),                              'Guardar proyecto');
    keybindingsRegistry.register('editor.filters',       ['ctrl+f'],                    () => setShowFiltersModal(true),                             'Abrir filtros');
    keybindingsRegistry.register('editor.text',          ['t'],                         () => setShowTextTool(true),                                 'Insertar texto');
    keybindingsRegistry.register('editor.scripts',       ['ctrl+shift+s'],              () => setShowScriptRunner((v) => !v),                        'Abrir script runner');
    keybindingsRegistry.register('editor.export',        ['ctrl+e'],                    () => setShowExporter((v) => !v),                            'Exportar animación');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Callback de carga de proyecto (.pixcalli v2) ---
  // Declarado ANTES que handleImportAseprite / handleAutoCrop porque esos dos
  // lo usan en sus deps de useCallback. En TDZ, una const declarada abajo no
  // puede referenciarse arriba aunque el handler se ejecute más tarde.
  const handleProjectLoaded = useCallback(async ({ success, projectData, restoredCanvases }) => {
    if (!success || !projectData) return;

    // Restaurar canvas y estado del editor a través del hook
    await restoreFromProjectData(projectData, restoredCanvases ?? {});

    // Restaurar viewport
    if (projectData.viewport?.zoom != null) {
      setZoom(projectData.viewport.zoom);
    }
    if (projectData.viewport?.panOffset) {
      setPanOffset(projectData.viewport.panOffset);
    }

    // Restaurar colores
    if (projectData.palette) {
      const p = projectData.palette;
      if (p.foreground) {
        setForegroundColor(p.foreground);
        setToolParameters(prev => ({ ...prev, foregroundColor: p.foreground }));
      }
      if (p.background) {
        setBackgroundColor(p.background);
        setToolParameters(prev => ({ ...prev, backgroundColor: p.background }));
      }
      if (p.fillColor) {
        setFillColor(p.fillColor);
        setToolParameters(prev => ({ ...prev, fillColor: p.fillColor }));
      }
      if (p.borderColor) {
        setBorderColor(p.borderColor);
        setToolParameters(prev => ({ ...prev, borderColor: p.borderColor }));
      }
    }

    // Restaurar extensions v2.1 (paletas custom, tags, slices, referenceLayers, guides, tileset).
    const ext = projectData.extensions;
    if (ext) {
      if (Array.isArray(ext.customPalettes)) setCustomPalettes(ext.customPalettes);
      if (Array.isArray(ext.animationTags))  setAnimationTags(ext.animationTags);
      if (Array.isArray(ext.slices))         setSlices(ext.slices);
      if (Array.isArray(ext.referenceLayers)) {
        Promise.all(
          ext.referenceLayers.map(
            (r) =>
              new Promise((resolve) => {
                if (!r.dataURL) {
                  resolve({ ...r });
                  return;
                }
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = r.width || img.naturalWidth;
                  canvas.height = r.height || img.naturalHeight;
                  canvas.getContext('2d').drawImage(img, 0, 0);
                  resolve({ ...r, canvas });
                };
                img.onerror = () => resolve({ ...r });
                img.src = r.dataURL;
              })
          )
        ).then((restored) => setReferenceLayers(restored));
      }
      if (Array.isArray(ext.guides))         setGuides(ext.guides);
      if (ext.tilesets) {
        deserializeTileset(ext.tilesets).then((ts) => {
          if (ts) setTileset(ts);
        }).catch((err) => {
          console.warn('No se pudo restaurar el tileset:', err);
        });
      }
    }

    // animation.loop: si el proyecto lo trae, restaurarlo. Default true para
    // compat con .pixcalli antiguos sin la clave (el typeof guard la skip-ea).
    const loopFromProject = projectData?.animation?.loop;
    if (typeof loopFromProject === 'boolean') setLoopEnabled(loopFromProject);
  }, [restoreFromProjectData, setZoom, setPanOffset,
      setForegroundColor, setBackgroundColor, setFillColor, setBorderColor, setToolParameters,
      setLoopEnabled]);

  // --- Importar .aseprite/.ase ---
  // Abre file picker, parsea con loadAsepriteFile y aplica el documento al
  // canvas mediante `restoreFromProjectData` (mismo camino que cargar un
  // .pixcalli). Adicionalmente importa tags/slices al estado del workspace.
  const handleImportAseprite = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ase,.aseprite';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const doc = await loadAsepriteFile(file);
        const pix = asepriteDocToPixcalli(doc);

        // Construir el payload con la shape que restoreFromProjectData espera.
        // - framesResume: metadata por frame (duration, tags)
        // - layers: definición de capas
        // - restoredCanvases: mapa plano "frame_N_layerId" → HTMLCanvasElement
        const framesResumeShape = {
          frames: {},
          metadata: { defaultFrameDuration: 100, frameRate: 10 },
          computed: { frameSequence: [] },
        };
        const restoredCanvases = {};

        for (const [frameKeyStr, frameData] of Object.entries(pix.frames)) {
          const frameN = Number(frameKeyStr);
          framesResumeShape.frames[frameN] = {
            duration: frameData.duration ?? 100,
            tags: [],
          };
          framesResumeShape.computed.frameSequence.push(frameN);
          // Para cada capa del frame, añadir un canvas al tamaño del doc.
          for (const layer of pix.layers) {
            const celCanvas = frameData.canvases[layer.id];
            // Si la capa no tiene cel en este frame, crear uno vacío del tamaño
            // del documento para mantener consistencia.
            if (celCanvas) {
              restoredCanvases[`frame_${frameN}_${layer.id}`] = celCanvas;
            } else {
              const empty = document.createElement('canvas');
              empty.width = pix.width;
              empty.height = pix.height;
              restoredCanvases[`frame_${frameN}_${layer.id}`] = empty;
            }
          }
        }

        const projectData = {
          format: { name: 'PixCalli Studio', version: '2.0.0', migratedFrom: 'aseprite' },
          metadata: { title: file.name.replace(/\.(ase|aseprite)$/i, '') },
          viewport: {
            zoom: 1,
            panOffset: { x: 0, y: 0 },
            activeLayerId: pix.layers[0]?.id ?? null,
            currentFrame: framesResumeShape.computed.frameSequence[0] ?? 1,
          },
          animation: { defaultFrameDuration: 100, frameRate: 10 },
          framesResume: framesResumeShape,
          layers: pix.layers.map((l) => ({
            id: l.id,
            name: l.name,
            visible: l.visible,
            opacity: l.opacity ?? 1,
            zIndex: l.zIndex ?? 0,
            blendMode: l.blendMode ?? 'normal',
            isGroupLayer: false,
            parentLayerId: null,
          })),
          canvases: {},
          palette: {
            foreground: { r: 0, g: 0, b: 0, a: 255 },
            background: { r: 255, g: 255, b: 255, a: 255 },
            fillColor: { r: 0, g: 0, b: 0, a: 255 },
            borderColor: { r: 0, g: 0, b: 0, a: 255 },
            recentColors: [],
          },
          onionSkin: { enabled: false, settings: null, framesConfig: null },
          dimensions: { width: pix.width, height: pix.height },
        };

        // Delegar al handler de proyecto existente (restaura canvas + metadata).
        await handleProjectLoaded({ success: true, projectData, restoredCanvases });

        // Tags y slices importados (ya estaban funcionando).
        if (Array.isArray(doc.tags) && doc.tags.length) {
          setAnimationTags(doc.tags.map((t, i) => ({
            id: `tag_imported_${i}`,
            name: t.name || `tag_${i}`,
            from: t.from,
            to: t.to,
            direction: t.direction,
            color: t.color || '#4a90e2',
            repeat: 0,
          })));
        }
        if (Array.isArray(doc.slices) && doc.slices.length) {
          setSlices(doc.slices.map((s, i) => ({
            id: `slice_imported_${i}`,
            name: s.name,
            color: '#ffcc44',
            bounds: s.bounds,
            ...(s.center ? { center: s.center } : {}),
            ...(s.pivot ? { pivot: s.pivot } : {}),
          })));
        }

        // Tras aplicar canvases, asegurar que el pipeline no use cache stale.
        invalidateCacheRef.current?.();
        compositeRenderRef.current?.();

        console.log(
          `[aseprite] Import OK — ${doc.framesCount} frames × ${doc.layers.length} capas, ` +
          `${doc.palette?.length ?? 0} colores, ${doc.tags.length} tags, ${doc.slices.length} slices.`
        );
      } catch (err) {
        console.error('Error importando .aseprite:', err);
        alert(`No se pudo importar el archivo: ${err.message}`);
      }
    };
    input.click();
  }, [handleProjectLoaded]);

  // --- Importar imagen como capa de referencia ---
  // PNG/JPEG → ReferenceLayer (bloqueada, opacidad 0.5, no exportable).
  // El objeto completo (incluyendo el canvas HTML) se guarda en `referenceLayers`.
  // Al persistir el proyecto, el serializador filtra props no-serializables
  // (el canvas pesa demasiado para el JSON por ahora — futuro: dataURL opcional).
  const handleImportReferenceImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const layer = await loadReferenceFromFile(file);
        setReferenceLayers((prev) => [...prev, layer]);
      } catch (err) {
        console.error('Error cargando referencia:', err);
        alert(`No se pudo cargar la imagen: ${err.message ?? err}`);
      }
    };
    input.click();
  }, []);

  // --- Auto-crop mutativo ---
  // Calcula el bounding box opaco global, recorta cada canvas de cada capa de
  // cada frame al mismo rect, y reconstruye el proyecto con las nuevas
  // dimensiones vía handleProjectLoaded (mismo camino que cargar un .pixcalli).
  // Pide confirmación porque es destructivo (los píxeles fuera del bbox se pierden).
  const handleAutoCrop = useCallback(async () => {
    // Unir canvases de todos los frames y capas.
    const allCanvases = [];
    for (const frame of Object.values(frames ?? {})) {
      for (const canvas of Object.values(frame?.canvases ?? {})) {
        if (canvas && canvas.width && canvas.height) allCanvases.push(canvas);
      }
    }
    if (allCanvases.length === 0) {
      alert('No hay capas con contenido para recortar.');
      return;
    }
    const result = autoCrop(allCanvases, { padding: 0 });
    if (!result) {
      alert('Todas las capas están vacías. No hay nada que recortar.');
      return;
    }
    if (result.width === totalWidth && result.height === totalHeight) {
      alert('El documento ya está recortado — no hay margen opaco que quitar.');
      return;
    }
    const confirmed = confirm(
      `Auto-crop: ${totalWidth}×${totalHeight} → ${result.width}×${result.height} px.\n\n` +
      `Esto recorta TODOS los frames y capas al mismo rect. Los píxeles fuera del bbox ` +
      `se perderán. ¿Continuar?`
    );
    if (!confirmed) return;

    // Reutilizamos los bounds calculados por computeUnionBounds dentro de autoCrop.
    // `autoCrop` devuelve `result.bounds` { minX, minY, maxX, maxY }.
    const { minX, minY } = result.bounds;
    const newW = result.width;
    const newH = result.height;

    // Construir un nuevo set de canvases recortados por (frame, layer).
    // Nota: NO usamos result.canvases porque esa lista es plana (no preserva
    // la asociación (frame, layer)) — volvemos a recortar individualmente.
    const restoredCanvases = {};
    const framesResumeShape = {
      frames: {},
      metadata: { defaultFrameDuration: 100, frameRate: 10 },
      computed: { frameSequence: [] },
    };
    const frameKeys = Object.keys(frames ?? {}).sort((a, b) => Number(a) - Number(b));
    for (const frameKey of frameKeys) {
      const frame = frames[frameKey];
      if (!frame) continue;
      const frameN = Number(frameKey);
      framesResumeShape.frames[frameN] = {
        duration: frame.frameDuration ?? 100,
        tags: frame.tags ?? [],
      };
      framesResumeShape.computed.frameSequence.push(frameN);
      for (const [layerId, canvas] of Object.entries(frame.canvases ?? {})) {
        const cropped = document.createElement('canvas');
        cropped.width = newW;
        cropped.height = newH;
        cropped.getContext('2d').drawImage(canvas, minX, minY, newW, newH, 0, 0, newW, newH);
        restoredCanvases[`frame_${frameN}_${layerId}`] = cropped;
      }
    }

    const projectData = {
      format: { name: 'PixCalli Studio', version: '2.0.0' },
      metadata: { title: 'auto-crop' },
      viewport: {
        zoom,
        panOffset,
        activeLayerId,
        currentFrame,
      },
      animation: { defaultFrameDuration: 100, frameRate: 10 },
      framesResume: framesResumeShape,
      layers,
      canvases: {},
      palette: {
        foreground: toolParameters?.foregroundColor ?? { r: 0, g: 0, b: 0, a: 255 },
        background: toolParameters?.backgroundColor ?? { r: 255, g: 255, b: 255, a: 255 },
        fillColor: toolParameters?.fillColor ?? { r: 0, g: 0, b: 0, a: 255 },
        borderColor: toolParameters?.borderColor ?? { r: 0, g: 0, b: 0, a: 255 },
        recentColors: [],
      },
      onionSkin: { enabled: onionSkinEnabled, settings: onionSkinSettings, framesConfig: onionFramesConfig },
      dimensions: { width: newW, height: newH },
    };

    await handleProjectLoaded({ success: true, projectData, restoredCanvases });

    // Reajustar slices y guías al nuevo origen: todo se corre (-minX, -minY).
    if (slices.length && (minX !== 0 || minY !== 0)) {
      setSlices((prev) =>
        prev.map((s) => ({
          ...s,
          bounds: {
            x: Math.max(0, s.bounds.x - minX),
            y: Math.max(0, s.bounds.y - minY),
            w: s.bounds.w,
            h: s.bounds.h,
          },
        }))
      );
    }
    if (guides.length && (minX !== 0 || minY !== 0)) {
      setGuides((prev) =>
        prev.map((g) => ({
          ...g,
          position: Math.max(0, g.position - (g.axis === 'x' ? minX : minY)),
        }))
      );
    }

    invalidateCacheRef.current?.();
    compositeRenderRef.current?.();
  }, [
    frames, totalWidth, totalHeight, layers, zoom, panOffset, activeLayerId,
    currentFrame, toolParameters, onionSkinEnabled, onionSkinSettings,
    onionFramesConfig, slices, guides, handleProjectLoaded,
  ]);

  // ---- Callback de carga de proyecto (.pixcalli v2) ----
  // Hook para rastreo del puntero




// Helpers delegados a ./container/utils/pixelMask.js.
const isPixelIsolated = useCallback(
  (x, y) => isPixelIsolatedUtil(x, y, isolatedPixels),
  [isolatedPixels]
);

const isolatedPixelsSet = useMemo(
  () => buildIsolatedPixelsSet(isolatedPixels),
  [isolatedPixels]
);

const isPixelIsolatedOptimized = useCallback(
  (x, y) => isPixelIsolatedOptimizedUtil(x, y, isolatedPixelsSet),
  [isolatedPixelsSet]
);

const canPaintAtPixel = useCallback(
  (x, y) => canPaintAtPixelUtil(x, y, isolatedPixelsSet),
  [isolatedPixelsSet]
);



const pencilPerfectButtonRef = useRef(null);
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
      const preview = getJSONDataPreview(loadedData);
      console.log("Preview de datos:", preview);
  
      if (!preview.isValid) {
        alert("Error en los datos: " + preview.error);
        return;
      }
  
      // APLICAR LAS DIMENSIONES ANTES DE IMPORTAR
      if (preview.dimensions && preview.dimensions.width && preview.dimensions.height) {
        console.log(`Aplicando dimensiones: ${preview.dimensions.width}x${preview.dimensions.height}`);
        
        setTotalWidth(preview.dimensions.width);
        setTotalHeight(preview.dimensions.height);
        setDrawableWidth(preview.dimensions.width);
        setDrawableHeight(preview.dimensions.height);
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


const [isRotationHandlerActive, setIsRotationHandlerActive] = useState(false);
const [rotationHandlerRadius, setRotationHandlerRadius] = useState(50);
const {
  isPressed: isRotationHandlerContainerPressed,
  relativeToTarget: rotationHandlerRelative,
} = usePointer(rotationHandlerRef, artboardRef, [], {
  endPressOnLeave: false,
  preventContextMenu: true
});


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

//Obtener rápido el nombre de una capa:
const getActiveLayerName = useCallback(() => {
  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  return activeLayer?.name || 'Capa sin nombre';
}, [layers, activeLayerId]);


//Lógica para el gotero: 
// 3. FUNCIÓN PRINCIPAL: Obtener color del pixel clickeado
const getPixelColorAt = useCallback(async (x, y) => {
  if (!activeLayerId) {
    console.warn('No hay capa activa para obtener color');
    return null;
  }

  try {
    // Asegurar que las coordenadas estén dentro del canvas
    const clampedX = Math.max(0, Math.min(totalWidth - 1, Math.round(x)));
    const clampedY = Math.max(0, Math.min(totalHeight - 1, Math.round(y)));

    // Obtener datos del pixel en la posición específica
    const pixelData = await getCompositeLayerData(clampedX, clampedY, 1, 1);
    if (!pixelData || !pixelData.data) {
      console.warn('No se pudieron obtener los datos del pixel');
      return null;
    }

    const data = pixelData.data;
    
    // Extraer los valores RGBA
    const color = {
      r: data[0],
      g: data[1], 
      b: data[2],
      a: data[3] / 255 // Convertir alpha de 0-255 a 0-1
    };

    console.log(`Color obtenido en (${clampedX}, ${clampedY}):`, color);
    setEyeDropperColor(color);
    return color;

  } catch (error) {
    console.error('Error obteniendo color del pixel:', error);
    return null;
  }
}, [activeLayerId, getLayerData, totalWidth, totalHeight, setEyeDropperColor]);

// 4. FUNCIÓN: Aplicar color obtenido
const applyEyeDropperColor = useCallback((color, buttonPressed) => {
  if (!color) return;

  // Normalizar el color para asegurar que esté en el formato correcto
  const normalizedColor = {
    r: Math.round(Math.max(0, Math.min(255, color.r))),
    g: Math.round(Math.max(0, Math.min(255, color.g))),
    b: Math.round(Math.max(0, Math.min(255, color.b))),
    a: Math.max(0, Math.min(1, color.a))
  };

  // GUARDAR EN LA VARIABLE eyeDropperColor
  setEyeDropperColor(normalizedColor);
  console.log('Color capturado con EyeDropper:', normalizedColor);

  // Opcional: También aplicar según el botón presionado si quieres mantener esa funcionalidad
  if (buttonPressed === "left" || buttonPressed === true) {
    // Click izquierdo: establecer como color principal (foreground)
    setToolParameters(prev => ({
      ...prev,
      foregroundColor: normalizedColor
    }));
    console.log('Color también establecido como foreground');
  } else if (buttonPressed === "right") {
    // Click derecho: establecer como color de fondo (background)
    setToolParameters(prev => ({
      ...prev,
      backgroundColor: normalizedColor
    }));
    console.log('Color también establecido como background');
  }

  // Opcional: Cambiar automáticamente a la herramienta de pincel después de usar el gotero
  // setTool(TOOLS.paint);
}, [setEyeDropperColor, setToolParameters]);

  
  // Ejemplos específicos de escalones
  const stairPattern = [
    {x: 0, y: 0},
    {x: 1, y: 0},   // horizontal
    {x: 1, y: 1},   // escalón - DEBE eliminarse
    {x: 2, y: 1},   // horizontal
    {x: 2, y: 2},   // escalón - DEBE eliminarse
    {x: 3, y: 2},   // horizontal
    {x: 3, y: 3}    // fin
  ];
  
  const diagonalCurve = [
    {x: 0, y: 0},
    {x: 1, y: 1},   // diagonal - NO debe eliminarse
    {x: 2, y: 2},   // diagonal - NO debe eliminarse
    {x: 3, y: 3},   // diagonal - NO debe eliminarse
    {x: 4, y: 4}
  ];
  
  const mixedPattern = [
    {x: 0, y: 0},
    {x: 2, y: 0},   // línea horizontal - conservar
    {x: 2, y: 1},   // escalón - eliminar
    {x: 4, y: 1},   // horizontal
    {x: 5, y: 2},   // diagonal - conservar
    {x: 6, y: 3},   // diagonal - conservar
    {x: 6, y: 5}    // vertical - conservar
  ];
  

  //


//version 2:


  
  // Delegado a ./container/utils/curveDrawing.js.
  const drawQuadraticCurve = useCallback(
    (ctx, start, end, control, width, color) =>
      drawQuadraticCurveUtil(ctx, start, end, control, width, color),
    []
  );
  // La definición real de `drawPreviewCurve` vive como closure dentro del
  // bloque de curveState === "setting-control" (más abajo), donde sí tiene
  // acceso a `ctx`. La versión outer era dead code (ctx fuera de scope).

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
          ?.fillRect(Math.floor(screenX), Math.floor(screenY), Math.floor(screenX + zoom) - Math.floor(screenX), Math.floor(screenY + zoom) - Math.floor(screenY));
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

    // Early exit para figuras muy grandes (más de 50,000 píxeles de canvas)
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

    // Solo procesar píxeles visibles (en resolución de canvas, sin zoom)
    const visibleWidth = Math.max(0, Math.ceil(viewportEndX - viewportStartX));
    const visibleHeight = Math.max(0, Math.ceil(viewportEndY - viewportStartY));

    if (visibleWidth <= 0 || visibleHeight <= 0) return;

    // Construimos ImageData a resolución de CANVAS (no a resolución de pantalla)
    // y luego la escalamos con drawImage + nearest-neighbor. Antes el ImageData
    // se creaba a `visibleWidth*zoom` x `visibleHeight*zoom` y el bucle interno
    // escribía zoom*zoom píxeles por cada píxel del canvas: el coste y la
    // memoria crecían con zoom² y la previa se trababa a zooms altos.
    const imageData = ctx.createImageData(visibleWidth, visibleHeight);
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

    for (let py = 0; py < visibleHeight; py++) {
      for (let px = 0; px < visibleWidth; px++) {
        const canvasX = viewportStartX + viewportOffset.x + px;
        const canvasY = viewportStartY + viewportOffset.y + py;

        const relativeX = canvasX - startX;
        const relativeY = canvasY - startY;

        if (
          relativeX < 0 ||
          relativeX >= rectWidth ||
          relativeY < 0 ||
          relativeY >= rectHeight
        ) {
          continue;
        }

        // Lógica del rectángulo redondeado
        let isInside = true;
        if (radius > 0) {
          if (relativeX < radius && relativeY < radius) {
            const dx = radius - relativeX;
            const dy = radius - relativeY;
            isInside = dx * dx + dy * dy <= radius * radius;
          } else if (relativeX >= rectWidth - radius && relativeY < radius) {
            const dx = relativeX - (rectWidth - radius - 1);
            const dy = radius - relativeY;
            isInside = dx * dx + dy * dy <= radius * radius;
          } else if (relativeX < radius && relativeY >= rectHeight - radius) {
            const dx = radius - relativeX;
            const dy = relativeY - (rectHeight - radius - 1);
            isInside = dx * dx + dy * dy <= radius * radius;
          } else if (
            relativeX >= rectWidth - radius &&
            relativeY >= rectHeight - radius
          ) {
            const dx = relativeX - (rectWidth - radius - 1);
            const dy = relativeY - (rectHeight - radius - 1);
            isInside = dx * dx + dy * dy <= radius * radius;
          }
        }

        if (!isInside) continue;

        const isBorder =
          borderWidth > 0 &&
          (relativeX < borderWidth ||
            relativeX >= rectWidth - borderWidth ||
            relativeY < borderWidth ||
            relativeY >= rectHeight - borderWidth ||
            (radius > 0 &&
              !isInsideInnerRoundedRect(
                relativeX - borderWidth,
                relativeY - borderWidth,
                rectWidth - 2 * borderWidth,
                rectHeight - 2 * borderWidth,
                Math.max(0, radius - borderWidth)
              )));

        const idx = (py * visibleWidth + px) * 4;

        if (isBorder && borderColor && borderWidth > 0) {
          data[idx] = borderR;
          data[idx + 1] = borderG;
          data[idx + 2] = borderB;
          data[idx + 3] = borderA;
        } else if (!isBorder && fillColor) {
          data[idx] = fillR;
          data[idx + 1] = fillG;
          data[idx + 2] = fillB;
          data[idx + 3] = fillA;
        }
      }
    }

    // Escalado pixel-perfect a pantalla: volcamos el ImageData a un canvas
    // offscreen del tamaño del canvas-res y lo blitteamos escalado. El coste
    // del escalado ya no depende del zoom.
    const off = document.createElement("canvas");
    off.width = visibleWidth;
    off.height = visibleHeight;
    off.getContext("2d").putImageData(imageData, 0, 0);

    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    const dx0 = Math.round(viewportStartX * zoom);
    const dy0 = Math.round(viewportStartY * zoom);
    ctx.drawImage(
      off,
      0,
      0,
      visibleWidth,
      visibleHeight,
      dx0,
      dy0,
      Math.round((viewportStartX + visibleWidth) * zoom) - dx0,
      Math.round((viewportStartY + visibleHeight) * zoom) - dy0
    );
    ctx.imageSmoothingEnabled = prevSmoothing;
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
  const handlePixelDataFromThreeJS = useCallback((pixelData) => {
    if (!activeLayerId) {
      console.error('❌ No hay capa activa seleccionada');
      return;
    }
  
    if (!pixelData || pixelData.length === 0) {
      console.warn('⚠️ No hay datos de píxeles para aplicar');
      return;
    }
  
    try {
      // ✅ DETERMINAR RESOLUCIÓN BASADA EN LOS DATOS RECIBIDOS
      // Buscar la coordenada Y máxima para inferir el tamaño
      const maxY = Math.max(...pixelData.map(p => p.y));
      const maxX = Math.max(...pixelData.map(p => p.x));
      const canvasSize = Math.max(maxX, maxY) + 1; // +1 porque las coordenadas empiezan en 0
      
      // Aplicar píxeles usando drawOnLayer con FLIP Y
      drawOnLayer(activeLayerId, (ctx) => {
        ctx.globalCompositeOperation = "source-over";
        
        pixelData.forEach(pixel => {
          if (pixel && pixel.color) {
            // ✅ FLIP Y: Invertir la coordenada Y basado en el tamaño del canvas
            const flippedY = canvasSize - pixel.y - 1;
            
            ctx.fillStyle = `rgba(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b}, ${pixel.color.a / 255})`;
            ctx.fillRect(pixel.x, flippedY, 1, 1); // ✅ Usar flippedY
          }
        });
      });
      
      console.log(`🎉 ${pixelData.length} píxeles aplicados exitosamente con efectos (orientación corregida)`);
      alert(`✅ Modelo 3D convertido: ${pixelData.length} píxeles aplicados`);
      
    } catch (error) {
      console.error('❌ Error al aplicar píxeles:', error);
      alert('❌ Error al aplicar los píxeles al editor');
    }
  }, [activeLayerId, drawOnLayer]);

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
    const startX = Math.min(start.x, end.x) | 0;
    const startY = Math.min(start.y, end.y) | 0;
    const width = Math.abs(end.x - start.x) | 0;
    const height = Math.abs(end.y - start.y) | 0;
    if (width === 0 || height === 0) return;

    const verts = [
      { x: startX + Math.floor(width / 2), y: startY },
      { x: startX, y: startY + height },
      { x: startX + width, y: startY + height },
    ];

    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const stampPx = (x, y) => {
      if (x < 0 || x >= cw || y < 0 || y >= ch) return;
      ctx.fillRect(x, y, 1, 1);
    };

    if (fillColor) {
      ctx.fillStyle = `rgba(${fillColor.r}, ${fillColor.g}, ${fillColor.b}, ${fillColor.a})`;
      rasterPolygon(verts, stampPx, true);
    }

    if (borderColor && borderWidth > 0) {
      ctx.fillStyle = `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, ${borderColor.a})`;
      const bw = borderWidth | 0;
      const half = (bw / 2) | 0;
      const thickStamp = bw > 1
        ? (x, y) => {
            for (let dy = 0; dy < bw; dy++) {
              for (let dx = 0; dx < bw; dx++) stampPx(x + dx - half, y + dy - half);
            }
          }
        : stampPx;
      for (let i = 0; i < 3; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % 3];
        rasterLine(a.x, a.y, b.x, b.y, thickStamp);
      }
    }
  };
  // Dibujar la previa del triangulo
  const drawPreviewTriangleSimplified = (
    ctx,
    startX,
    startY,
    width,
    height,
    borderColor
  ) => {
    const sx = (startX - viewportOffset.x) * zoom;
    const sy = (startY - viewportOffset.y) * zoom;
    const sw = width * zoom;
    const sh = height * zoom;

    ctx.strokeStyle = borderColor
      ? `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, 0.8)`
      : "rgba(100, 100, 100, 0.5)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + sw / 2, sy);
    ctx.lineTo(sx, sy + sh);
    ctx.lineTo(sx + sw, sy + sh);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.font = "12px monospace";
    ctx.fillText(`${width}x${height}`, sx + 5, sy + 15);
  };

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

    // Early exit para triángulos muy grandes (igual umbral que el cuadrado).
    if (width * height > 50000) {
      drawPreviewTriangleSimplified(ctx, startX, startY, width, height, borderColor);
      return;
    }

    // Vértices en coords de canvas
    const verts = [
      { x: startX + Math.floor(width / 2), y: startY },
      { x: startX, y: startY + height },
      { x: startX + width, y: startY + height },
    ];

    // Padding por el thickStamp del borde: puede desbordar `half` píxeles fuera
    // del bounding box del triángulo.
    const bw = borderColor && borderWidth > 0 ? Math.max(0, borderWidth | 0) : 0;
    const half = (bw / 2) | 0;
    const pad = Math.max(half, bw - half);

    const viewportStartX = Math.max(0, startX - pad - viewportOffset.x);
    const viewportStartY = Math.max(0, startY - pad - viewportOffset.y);
    const viewportEndX = Math.min(
      viewportWidth,
      startX + width + pad - viewportOffset.x
    );
    const viewportEndY = Math.min(
      viewportHeight,
      startY + height + pad - viewportOffset.y
    );

    const visibleWidth = Math.max(0, Math.ceil(viewportEndX - viewportStartX));
    const visibleHeight = Math.max(0, Math.ceil(viewportEndY - viewportStartY));

    if (visibleWidth <= 0 || visibleHeight <= 0) return;

    // ImageData a resolución de CANVAS. Antes se hacía `ctx.fillRect(sx, sy,
    // zoom, zoom)` por cada píxel del canvas — O(área) llamadas a Canvas2D y
    // O(área × zoom²) píxeles escritos. A zooms altos (20-50) esto dominaba
    // la previa en cada movimiento del mouse. Ahora escribimos bytes puros en
    // un buffer pequeño y blitteamos una sola vez con drawImage nearest-
    // neighbor (GPU), quedando el coste independiente del zoom.
    const imageData = ctx.createImageData(visibleWidth, visibleHeight);
    const data = imageData.data;

    const originX = viewportStartX + viewportOffset.x;
    const originY = viewportStartY + viewportOffset.y;

    const fillR = fillColor?.r || 0;
    const fillG = fillColor?.g || 0;
    const fillB = fillColor?.b || 0;
    const fillA = Math.floor((fillColor?.a || 0) * 255 * 0.6);

    const borderR = borderColor?.r || 0;
    const borderG = borderColor?.g || 0;
    const borderB = borderColor?.b || 0;
    const borderA = Math.floor((borderColor?.a || 0) * 255 * 0.8);

    const plotFill = (x, y) => {
      const lx = x - originX;
      const ly = y - originY;
      if (lx < 0 || ly < 0 || lx >= visibleWidth || ly >= visibleHeight) return;
      const idx = (ly * visibleWidth + lx) * 4;
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;
    };

    const plotBorder = (x, y) => {
      const lx = x - originX;
      const ly = y - originY;
      if (lx < 0 || ly < 0 || lx >= visibleWidth || ly >= visibleHeight) return;
      const idx = (ly * visibleWidth + lx) * 4;
      data[idx] = borderR;
      data[idx + 1] = borderG;
      data[idx + 2] = borderB;
      data[idx + 3] = borderA;
    };

    if (fillColor) {
      rasterPolygon(verts, plotFill, true);
    }

    if (bw > 0) {
      const thickStamp = bw > 1
        ? (x, y) => {
            for (let dy = 0; dy < bw; dy++) {
              for (let dx = 0; dx < bw; dx++) plotBorder(x + dx - half, y + dy - half);
            }
          }
        : plotBorder;
      for (let i = 0; i < 3; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % 3];
        rasterLine(a.x, a.y, b.x, b.y, thickStamp);
      }
    }

    const off = document.createElement("canvas");
    off.width = visibleWidth;
    off.height = visibleHeight;
    off.getContext("2d").putImageData(imageData, 0, 0);

    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    const tdx0 = Math.round(viewportStartX * zoom);
    const tdy0 = Math.round(viewportStartY * zoom);
    ctx.drawImage(
      off,
      0,
      0,
      visibleWidth,
      visibleHeight,
      tdx0,
      tdy0,
      Math.round((viewportStartX + visibleWidth) * zoom) - tdx0,
      Math.round((viewportStartY + visibleHeight) * zoom) - tdy0
    );
    ctx.imageSmoothingEnabled = prevSmoothing;
  };

  // Preview version: rasteriza en coords de canvas pero pinta en coords de
  // pantalla (zoom-scaled) con alpha de preview. Debe producir la misma forma
  // que rasterizeEllipseToCtx para que el shape no salte al soltar el mouse.
  const drawPreviewEllipseSimplified = (ctx, cx, cy, rx, ry, borderColor) => {
    const sx = (cx - viewportOffset.x) * zoom;
    const sy = (cy - viewportOffset.y) * zoom;
    ctx.strokeStyle = borderColor
      ? `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, 0.8)`
      : "rgba(100, 100, 100, 0.5)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx * zoom, ry * zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.font = "12px monospace";
    ctx.fillText(`${rx * 2}x${ry * 2}`, sx - rx * zoom + 5, sy - ry * zoom + 15);
  };

  const rasterizeEllipsePreview = (
    ctx,
    cx,
    cy,
    rx,
    ry,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    if (rx <= 0 && ry <= 0) return;

    const viewportStartX = Math.max(0, cx - rx - viewportOffset.x);
    const viewportStartY = Math.max(0, cy - ry - viewportOffset.y);
    const viewportEndX = Math.min(
      viewportWidth,
      cx + rx + 1 - viewportOffset.x
    );
    const viewportEndY = Math.min(
      viewportHeight,
      cy + ry + 1 - viewportOffset.y
    );
    const visibleWidth = Math.max(0, Math.ceil(viewportEndX - viewportStartX));
    const visibleHeight = Math.max(0, Math.ceil(viewportEndY - viewportStartY));
    if (visibleWidth <= 0 || visibleHeight <= 0) return;

    // Safety net contra elipses gigantes. Antes el umbral era 50k canvas-px
    // (y en bbox, no en área visible), así que a zoom bajo el mismo drag en
    // pantalla generaba radios grandes y el preview caía en ctx.ellipse()
    // suavizado — el borde dejaba de verse pixel-perfect. Ahora usamos área
    // VISIBLE con un tope mucho más alto: cualquier circulo que quepa dentro
    // del viewport se rasteriza a canvas-res con ImageData + blit (rapidísimo).
    if (visibleWidth * visibleHeight > 4_000_000) {
      drawPreviewEllipseSimplified(ctx, cx, cy, rx, ry, borderColor);
      return;
    }

    const bw = Math.max(0, borderWidth | 0);
    const hasBorder = bw > 0 && borderColor;
    const innerRx = hasBorder ? Math.max(0, rx - bw) : rx;
    const innerRy = hasBorder ? Math.max(0, ry - bw) : ry;

    const originX = viewportStartX + viewportOffset.x;
    const originY = viewportStartY + viewportOffset.y;

    // ImageData a resolución de CANVAS. Antes `plotScreen` hacía un
    // `fillRect(sx, sy, Math.ceil(zoom), Math.ceil(zoom))` por cada píxel del
    // perímetro/área — O(área) llamadas a Canvas2D + O(área × zoom²) píxeles
    // escritos. Ahora escribimos bytes al buffer pequeño y blitteamos una
    // sola vez con nearest-neighbor.
    const imageData = ctx.createImageData(visibleWidth, visibleHeight);
    const data = imageData.data;

    const fillR = fillColor?.r || 0;
    const fillG = fillColor?.g || 0;
    const fillB = fillColor?.b || 0;
    const fillA = Math.floor((fillColor?.a || 0) * 255 * 0.6);

    const borderR = borderColor?.r || 0;
    const borderG = borderColor?.g || 0;
    const borderB = borderColor?.b || 0;
    const borderA = Math.floor((borderColor?.a || 0) * 255 * 0.8);

    const plotPixel = (x, y, r, g, b, a) => {
      const lx = x - originX;
      const ly = y - originY;
      if (lx < 0 || ly < 0 || lx >= visibleWidth || ly >= visibleHeight) return;
      const idx = (ly * visibleWidth + lx) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    };

    // Ver comentario en rasterizeEllipseToCtx: para bw=1 usar perímetro
    // directo (fill=false) garantiza grosor uniforme de 1 px. El método
    // `filled(rx) \ filled(rx-1)` generaba bordes "gordos" en diagonales.
    if (hasBorder && bw === 1) {
      if (fillColor) {
        rasterEllipse(cx, cy, rx, ry,
          (x, y) => plotPixel(x, y, fillR, fillG, fillB, fillA), true);
      }
      rasterEllipse(cx, cy, rx, ry,
        (x, y) => plotPixel(x, y, borderR, borderG, borderB, borderA), false);
    } else {
      if (fillColor && innerRx > 0 && innerRy > 0) {
        rasterEllipse(cx, cy, innerRx, innerRy,
          (x, y) => plotPixel(x, y, fillR, fillG, fillB, fillA), true);
      } else if (fillColor && !hasBorder) {
        rasterEllipse(cx, cy, rx, ry,
          (x, y) => plotPixel(x, y, fillR, fillG, fillB, fillA), true);
      }

      if (hasBorder) {
        const inner = new Set();
        rasterEllipse(cx, cy, innerRx, innerRy, (x, y) => {
          inner.add((x << 16) ^ y);
        }, true);
        rasterEllipse(cx, cy, rx, ry, (x, y) => {
          if (!inner.has((x << 16) ^ y)) plotPixel(x, y, borderR, borderG, borderB, borderA);
        }, true);
      }
    }

    const off = document.createElement("canvas");
    off.width = visibleWidth;
    off.height = visibleHeight;
    off.getContext("2d").putImageData(imageData, 0, 0);

    // Snap de coords de destino a enteros. handleWheel permite zoom fraccional
    // (1 decimal cuando zoom<10: 1.2, 2.4, 3.1…) y `viewportStartX * zoom` cae
    // en medio pixel. drawImage con dest fraccional suaviza el resultado
    // aunque `imageSmoothingEnabled` esté en false — en formas rellenas no se
    // nota, pero el borde de 1 px del círculo queda difuminado. Redondear
    // origen+tamaño mantiene el borde crispy a cualquier zoom.
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    const dx = Math.round(viewportStartX * zoom);
    const dy = Math.round(viewportStartY * zoom);
    const dw = Math.round((viewportStartX + visibleWidth) * zoom) - dx;
    const dh = Math.round((viewportStartY + visibleHeight) * zoom) - dy;
    ctx.drawImage(off, 0, 0, visibleWidth, visibleHeight, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = prevSmoothing;
  };

  // Rasteriza elipse/círculo con soporte de border + fill usando rasterEllipse
  // canónico (midpoint + ajuste Capello). Clipa al canvas vía plot.
  const rasterizeEllipseToCtx = (
    ctx,
    cx,
    cy,
    rx,
    ry,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    if (rx <= 0 && ry <= 0) return;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const bw = Math.max(0, borderWidth | 0);

    const paintColor = (c) => {
      ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
    };
    const plotIfIn = (x, y) => {
      if (x >= 0 && x < W && y >= 0 && y < H) ctx.fillRect(x, y, 1, 1);
    };

    const hasBorder = bw > 0 && borderColor;
    const innerRx = hasBorder ? Math.max(0, rx - bw) : rx;
    const innerRy = hasBorder ? Math.max(0, ry - bw) : ry;

    // Para borde de 1 px: rellenar elipse completa y estampar el perímetro
    // (rasterEllipse fill=false) encima. El método `filled(rx) \ filled(rx-1)`
    // daba un anillo de grosor irregular — 1 px en los cardinales pero
    // 2-4 px en diagonales/mesetas — y el borde se veía "gordo" o no
    // pixel-perfect según el ángulo. Con el perímetro directo el grosor
    // es uniforme 1 px en todo el contorno.
    if (hasBorder && bw === 1) {
      if (fillColor) {
        paintColor(fillColor);
        rasterEllipse(cx, cy, rx, ry, plotIfIn, true);
      }
      paintColor(borderColor);
      rasterEllipse(cx, cy, rx, ry, plotIfIn, false);
    } else {
      if (fillColor && innerRx > 0 && innerRy > 0) {
        paintColor(fillColor);
        rasterEllipse(cx, cy, innerRx, innerRy, plotIfIn, true);
      } else if (fillColor && !hasBorder) {
        paintColor(fillColor);
        rasterEllipse(cx, cy, rx, ry, plotIfIn, true);
      }

      if (hasBorder) {
        const inner = new Set();
        rasterEllipse(cx, cy, innerRx, innerRy, (x, y) => {
          inner.add((x << 16) ^ y);
        }, true);
        paintColor(borderColor);
        rasterEllipse(cx, cy, rx, ry, (x, y) => {
          if (!inner.has((x << 16) ^ y)) plotIfIn(x, y);
        }, true);
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
    rasterizeEllipseToCtx(
      ctx,
      centerX | 0,
      centerY | 0,
      radius | 0,
      radius | 0,
      borderWidth,
      borderColor,
      fillColor
    );
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
    rasterizeEllipsePreview(
      ctx,
      center.x | 0,
      center.y | 0,
      radius,
      radius,
      borderWidth,
      borderColor,
      fillColor
    );
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
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    if (width <= 0 || height <= 0) return;

    const cx = Math.round(Math.min(startX, endX) + width / 2);
    const cy = Math.round(Math.min(startY, endY) + height / 2);
    const rx = Math.max(0, Math.round(width / 2));
    const ry = Math.max(0, Math.round(height / 2));

    rasterizeEllipseToCtx(ctx, cx, cy, rx, ry, borderWidth, borderColor, fillColor);
  };

  const drawPreviewEllipse = (
    ctx,
    start,
    end,
    borderWidth,
    borderColor,
    fillColor
  ) => {
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    if (w <= 0 || h <= 0) return;
    const cx = Math.round(Math.min(start.x, end.x) + w / 2);
    const cy = Math.round(Math.min(start.y, end.y) + h / 2);
    const rx = Math.max(0, Math.round(w / 2));
    const ry = Math.max(0, Math.round(h / 2));
    rasterizeEllipsePreview(ctx, cx, cy, rx, ry, borderWidth, borderColor, fillColor);
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
    if (radius <= 0 || vertices < 3) return;

    const outer = calculatePolygonPoints(centerX, centerY, radius, vertices, rotation);

    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const stampPx = (x, y) => {
      if (x < 0 || x >= cw || y < 0 || y >= ch) return;
      ctx.fillRect(x, y, 1, 1);
    };

    const bw = Math.max(0, borderWidth | 0);
    const hasBorder = bw > 0 && borderColor;

    if (fillColor) {
      ctx.fillStyle = `rgba(${fillColor.r}, ${fillColor.g}, ${fillColor.b}, ${fillColor.a})`;
      rasterPolygon(outer, stampPx, true);
    }

    if (hasBorder) {
      ctx.fillStyle = `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, ${borderColor.a})`;
      if (bw === 1) {
        rasterPolygon(outer, stampPx, false);
      } else {
        const half = (bw / 2) | 0;
        const thickStamp = (x, y) => {
          for (let dy = 0; dy < bw; dy++) {
            for (let dx = 0; dx < bw; dx++) stampPx(x + dx - half, y + dy - half);
          }
        };
        for (let i = 0; i < outer.length; i++) {
          const a = outer[i];
          const b = outer[(i + 1) % outer.length];
          rasterLine(a.x, a.y, b.x, b.y, thickStamp);
        }
      }
    }
  };

  // 7. Función para dibujar preview del polígono
  const drawPreviewPolygonSimplified = (ctx, outer, borderColor) => {
    ctx.strokeStyle = borderColor
      ? `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, 0.8)`
      : "rgba(100, 100, 100, 0.5)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < outer.length; i++) {
      const p = outer[i];
      const sx = (p.x - viewportOffset.x) * zoom;
      const sy = (p.y - viewportOffset.y) * zoom;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  };

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
    if (radius <= 0 || vertices < 3) return;

    const outer = calculatePolygonPoints(centerX, centerY, radius, vertices, rotation);

    // Bounding box a partir de los vértices externos.
    let minX = outer[0].x, maxX = outer[0].x;
    let minY = outer[0].y, maxY = outer[0].y;
    for (let i = 1; i < outer.length; i++) {
      const p = outer[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const bw = Math.max(0, borderWidth | 0);
    const hasBorder = bw > 0 && borderColor;
    const half = (bw / 2) | 0;
    const pad = hasBorder ? Math.max(half, bw - half) : 0;

    const bboxW = (maxX - minX + 1) + pad * 2;
    const bboxH = (maxY - minY + 1) + pad * 2;

    if (bboxW * bboxH > 50000) {
      drawPreviewPolygonSimplified(ctx, outer, borderColor);
      return;
    }

    const viewportStartX = Math.max(0, minX - pad - viewportOffset.x);
    const viewportStartY = Math.max(0, minY - pad - viewportOffset.y);
    const viewportEndX = Math.min(viewportWidth, maxX + pad + 1 - viewportOffset.x);
    const viewportEndY = Math.min(viewportHeight, maxY + pad + 1 - viewportOffset.y);
    const visibleWidth = Math.max(0, Math.ceil(viewportEndX - viewportStartX));
    const visibleHeight = Math.max(0, Math.ceil(viewportEndY - viewportStartY));
    if (visibleWidth <= 0 || visibleHeight <= 0) return;

    const originX = viewportStartX + viewportOffset.x;
    const originY = viewportStartY + viewportOffset.y;

    // ImageData a resolución de CANVAS. Mismo patrón que cuadrado/triángulo/elipse:
    // blit único con nearest-neighbor, coste independiente del zoom.
    const imageData = ctx.createImageData(visibleWidth, visibleHeight);
    const data = imageData.data;

    const fillR = fillColor?.r || 0;
    const fillG = fillColor?.g || 0;
    const fillB = fillColor?.b || 0;
    const fillA = Math.floor((fillColor?.a || 0) * 255 * 0.6);

    const borderR = borderColor?.r || 0;
    const borderG = borderColor?.g || 0;
    const borderB = borderColor?.b || 0;
    const borderA = Math.floor((borderColor?.a || 0) * 255 * 0.8);

    const plotPixel = (x, y, r, g, b, a) => {
      const lx = x - originX;
      const ly = y - originY;
      if (lx < 0 || ly < 0 || lx >= visibleWidth || ly >= visibleHeight) return;
      const idx = (ly * visibleWidth + lx) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    };

    if (fillColor) {
      rasterPolygon(outer, (x, y) => plotPixel(x, y, fillR, fillG, fillB, fillA), true);
    }

    if (hasBorder) {
      if (bw === 1) {
        rasterPolygon(outer, (x, y) => plotPixel(x, y, borderR, borderG, borderB, borderA), false);
      } else {
        const thickPlot = (x, y) => {
          for (let dy = 0; dy < bw; dy++) {
            for (let dx = 0; dx < bw; dx++) plotPixel(x + dx - half, y + dy - half, borderR, borderG, borderB, borderA);
          }
        };
        for (let i = 0; i < outer.length; i++) {
          const a = outer[i];
          const b = outer[(i + 1) % outer.length];
          rasterLine(a.x, a.y, b.x, b.y, thickPlot);
        }
      }
    }

    const off = document.createElement("canvas");
    off.width = visibleWidth;
    off.height = visibleHeight;
    off.getContext("2d").putImageData(imageData, 0, 0);

    // Snap de coords de destino a enteros para bordes nítidos a zoom fraccional
    // (mismo patrón que rasterizeEllipsePreview:1482-1486).
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    const dx = Math.round(viewportStartX * zoom);
    const dy = Math.round(viewportStartY * zoom);
    const dw = Math.round((viewportStartX + visibleWidth) * zoom) - dx;
    const dh = Math.round((viewportStartY + visibleHeight) * zoom) - dy;
    ctx.drawImage(off, 0, 0, visibleWidth, visibleHeight, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = prevSmoothing;
  };

  //Funcion para pincel de poligono creador de formas: /////////
  // Estados necesarios para la herramienta (agregar al componente principal)
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [polygonCurvePoints, setPolygonCurvePoints] = useState(new Map());
  const [isSettingCurve, setIsSettingCurve] = useState(false);
  const [currentCurveIndex, setCurrentCurveIndex] = useState(-1);
  const polygonStartTimeRef = useRef(null);

  // Aplana anchors + curvas cuadráticas a una polilínea de vértices enteros.
  // Subdivisión adaptativa de De Casteljau con tolerancia de 0.5 px — sustituye
  // el muestreo fijo de 20 pasos (subsampleado a zoom bajo, sobresampleado a
  // zoom alto). Si `close === false` omite la arista de cierre last→first.
  // El vértice inicial se emite una sola vez; cada segmento/curva emite
  // solo sus vértices finales.
  const flattenPolygonPath = (points, curvePoints, close = true) => {
    const n = points.length;
    if (n === 0) return [];
    const out = [{ x: points[0].x | 0, y: points[0].y | 0 }];
    const emit = (x, y) => {
      const ix = x | 0, iy = y | 0;
      const last = out[out.length - 1];
      if (last.x !== ix || last.y !== iy) out.push({ x: ix, y: iy });
    };

    const flattenQuad = (p0, c, p2, tol) => {
      const ax = p2.x - p0.x, ay = p2.y - p0.y;
      const len = Math.hypot(ax, ay) || 1;
      const nx = -ay / len, ny = ax / len;
      const d = Math.abs((c.x - p0.x) * nx + (c.y - p0.y) * ny);
      if (d < tol) { emit(p2.x, p2.y); return; }
      const m0 = { x: (p0.x + c.x) * 0.5, y: (p0.y + c.y) * 0.5 };
      const m1 = { x: (c.x + p2.x) * 0.5, y: (c.y + p2.y) * 0.5 };
      const mid = { x: (m0.x + m1.x) * 0.5, y: (m0.y + m1.y) * 0.5 };
      flattenQuad(p0, m0, mid, tol);
      flattenQuad(mid, m1, p2, tol);
    };

    const segCount = close ? n : n - 1;
    for (let i = 0; i < segCount; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      const key = `${i}-${(i + 1) % n}`;
      const ctrl = curvePoints.get(key);
      if (ctrl) flattenQuad(a, ctrl, b, 0.5);
      else emit(b.x, b.y);
    }
    return out;
  };

  const drawPolygonWithCurves = (ctx, points, curvePoints, borderWidth, borderColor, fillColor) => {
    if (points.length < 3) return;
    const polyline = flattenPolygonPath(points, curvePoints, true);
    if (polyline.length < 3) return;

    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const stampPx = (x, y) => {
      if (x < 0 || x >= cw || y < 0 || y >= ch) return;
      ctx.fillRect(x, y, 1, 1);
    };

    const bw = Math.max(0, borderWidth | 0);
    const hasBorder = bw > 0 && borderColor;

    if (fillColor) {
      ctx.fillStyle = `rgba(${fillColor.r}, ${fillColor.g}, ${fillColor.b}, ${fillColor.a})`;
      rasterPolygon(polyline, stampPx, true);
    }

    if (hasBorder) {
      ctx.fillStyle = `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, ${borderColor.a})`;
      if (bw === 1) {
        rasterPolygon(polyline, stampPx, false);
      } else {
        const half = (bw / 2) | 0;
        const thickStamp = (x, y) => {
          for (let dy = 0; dy < bw; dy++) {
            for (let dx = 0; dx < bw; dx++) stampPx(x + dx - half, y + dy - half);
          }
        };
        for (let i = 0; i < polyline.length; i++) {
          const a = polyline[i];
          const b = polyline[(i + 1) % polyline.length];
          rasterLine(a.x, a.y, b.x, b.y, thickStamp);
        }
      }
    }
  };

  // Preview de pixel-art para la herramienta polygonPencil.
  // Lee viewportOffset, zoom, viewportWidth, viewportHeight del closure (igual que drawPreviewPolygon).
  const drawPolygonPencilPreview = (
    ctx,
    points,
    curvePoints,
    cursor,
    borderWidth,
    borderColor,
    fillColor,
    isSettingCurve,
    currentCurveIndex
  ) => {
    if (points.length === 0 && !cursor) return;

    // --- Construir curvePoints efectivos ---
    let effectivePoints = points;
    let effectiveCurves = curvePoints;
    if (isSettingCurve && currentCurveIndex >= 0 && cursor && points.length >= 2) {
      const j = (currentCurveIndex + 1) % points.length;
      effectiveCurves = new Map(curvePoints);
      effectiveCurves.set(`${currentCurveIndex}-${j}`, cursor);
    }

    // --- Info de la curva activa (para guías visuales y segmento de cierre) ---
    let activeCurveInfo = null;
    if (isSettingCurve && currentCurveIndex >= 0 && cursor && points.length >= 2) {
      const j = (currentCurveIndex + 1) % points.length;
      activeCurveInfo = {
        start: points[currentCurveIndex],
        end: points[j],
        control: cursor,
        isClosing: j <= currentCurveIndex, // wrap = segmento de cierre
      };
    }

    // --- Polilínea abierta para strokes (sin arista de cierre) ---
    const openFlattened = points.length >= 2
      ? flattenPolygonPath(effectivePoints, effectiveCurves, false)
      : points.length === 1 ? [{ x: points[0].x | 0, y: points[0].y | 0 }] : [];

    // Rubber band: agregar cursor como próximo segmento recto (solo si no estamos en modo curva)
    let strokePolyline = openFlattened;
    if (cursor && !isSettingCurve && points.length >= 1) {
      const cx = cursor.x | 0, cy = cursor.y | 0;
      const last = openFlattened[openFlattened.length - 1];
      if (!last || last.x !== cx || last.y !== cy) {
        strokePolyline = [...openFlattened, { x: cx, y: cy }];
      }
    }

    // Si la curva activa es la de cierre (last → first), la polilínea abierta no
    // la incluye; aplánala aparte y apéndela al stroke.
    if (activeCurveInfo && activeCurveInfo.isClosing) {
      const extra = [];
      const pushVert = (x, y) => {
        const ix = x | 0, iy = y | 0;
        const prev = extra.length > 0
          ? extra[extra.length - 1]
          : strokePolyline[strokePolyline.length - 1];
        if (!prev || prev.x !== ix || prev.y !== iy) extra.push({ x: ix, y: iy });
      };
      const flatQ = (p0, c, p2, tol) => {
        const ax = p2.x - p0.x, ay = p2.y - p0.y;
        const len = Math.hypot(ax, ay) || 1;
        const nx = -ay / len, ny = ax / len;
        const d = Math.abs((c.x - p0.x) * nx + (c.y - p0.y) * ny);
        if (d < tol) { pushVert(p2.x, p2.y); return; }
        const m0 = { x: (p0.x + c.x) * 0.5, y: (p0.y + c.y) * 0.5 };
        const m1 = { x: (c.x + p2.x) * 0.5, y: (c.y + p2.y) * 0.5 };
        const mid = { x: (m0.x + m1.x) * 0.5, y: (m0.y + m1.y) * 0.5 };
        flatQ(p0, m0, mid, tol);
        flatQ(mid, m1, p2, tol);
      };
      flatQ(activeCurveInfo.start, activeCurveInfo.control, activeCurveInfo.end, 0.5);
      if (extra.length > 0) strokePolyline = [...strokePolyline, ...extra];
    }

    // --- Polilínea cerrada para fill (solo si hay ≥3 puntos y no en modo curva) ---
    const closedPoly = (points.length >= 3 && !isSettingCurve && fillColor)
      ? flattenPolygonPath(effectivePoints, effectiveCurves, true)
      : null;

    // --- Bounding box de todos los vértices ---
    const allVerts = [...strokePolyline, ...(closedPoly || [])];
    if (cursor) allVerts.push({ x: cursor.x | 0, y: cursor.y | 0 });
    effectiveCurves.forEach((cp) => allVerts.push({ x: cp.x | 0, y: cp.y | 0 }));

    if (allVerts.length === 0) return;

    let minX = allVerts[0].x, maxX = allVerts[0].x;
    let minY = allVerts[0].y, maxY = allVerts[0].y;
    for (const v of allVerts) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }

    const bw = Math.max(0, borderWidth | 0);
    const half = (bw / 2) | 0;
    const pad = Math.max(half, bw - half);

    const bboxW = (maxX - minX + 1) + pad * 2;
    const bboxH = (maxY - minY + 1) + pad * 2;

    // --- Ruta simplificada para áreas muy grandes ---
    if (bboxW * bboxH > 50000) {
      // Dibujo fino sólido (sin guiones) como fallback
      if (strokePolyline.length >= 2) {
        ctx.strokeStyle = borderColor
          ? `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, 0.8)`
          : "rgba(100, 100, 100, 0.8)";
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < strokePolyline.length; i++) {
          const p = strokePolyline[i];
          const sx = (p.x - viewportOffset.x) * zoom;
          const sy = (p.y - viewportOffset.y) * zoom;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      // Marcadores de anclas
      for (const p of points) {
        const sx = (p.x - viewportOffset.x) * zoom;
        const sy = (p.y - viewportOffset.y) * zoom;
        ctx.fillStyle = "rgba(0, 200, 255, 0.9)";
        ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 2, 4, 4);
      }
      if (activeCurveInfo) {
        const { start, end, control } = activeCurveInfo;
        const toScreen = (p) => ({
          x: (p.x - viewportOffset.x) * zoom,
          y: (p.y - viewportOffset.y) * zoom,
        });
        const s = toScreen(start);
        const e = toScreen(end);
        const c = toScreen(control);
        ctx.strokeStyle = "rgba(234, 0, 255, 0.45)";
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y); ctx.lineTo(c.x, c.y);
        ctx.moveTo(e.x, e.y); ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }
      return;
    }

    // --- ImageData pattern (igual que drawPreviewPolygon) ---
    const viewportStartX = Math.max(0, minX - pad - viewportOffset.x);
    const viewportStartY = Math.max(0, minY - pad - viewportOffset.y);
    const viewportEndX = Math.min(viewportWidth, maxX + pad + 1 - viewportOffset.x);
    const viewportEndY = Math.min(viewportHeight, maxY + pad + 1 - viewportOffset.y);
    const visibleWidth = Math.max(0, Math.ceil(viewportEndX - viewportStartX));
    const visibleHeight = Math.max(0, Math.ceil(viewportEndY - viewportStartY));
    if (visibleWidth <= 0 || visibleHeight <= 0) {
      // Aún así dibujar marcadores en pantalla
    } else {
      const originX = viewportStartX + viewportOffset.x;
      const originY = viewportStartY + viewportOffset.y;

      const imageData = ctx.createImageData(visibleWidth, visibleHeight);
      const data = imageData.data;

      const plotPixel = (x, y, r, g, b, a) => {
        const lx = x - originX;
        const ly = y - originY;
        if (lx < 0 || ly < 0 || lx >= visibleWidth || ly >= visibleHeight) return;
        const idx = (ly * visibleWidth + lx) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      };

      // Paso de fill
      if (closedPoly && closedPoly.length >= 3) {
        const fillR = fillColor.r;
        const fillG = fillColor.g;
        const fillB = fillColor.b;
        const fillA = Math.floor((fillColor.a || 0) * 255 * 0.6);
        rasterPolygon(closedPoly, (x, y) => plotPixel(x, y, fillR, fillG, fillB, fillA), true);
      }

      // Paso de stroke (borde / polilínea)
      if (strokePolyline.length >= 2 && borderColor) {
        const borderR = borderColor.r;
        const borderG = borderColor.g;
        const borderB = borderColor.b;
        const borderA = Math.floor((borderColor.a ?? 1) * 255 * 0.9);

        if (bw <= 1) {
          for (let i = 0; i < strokePolyline.length - 1; i++) {
            const a = strokePolyline[i];
            const b = strokePolyline[i + 1];
            rasterLine(a.x, a.y, b.x, b.y, (x, y) => plotPixel(x, y, borderR, borderG, borderB, borderA));
          }
        } else {
          const thickPlot = (x, y) => {
            for (let dy = 0; dy < bw; dy++) {
              for (let dx = 0; dx < bw; dx++) plotPixel(x + dx - half, y + dy - half, borderR, borderG, borderB, borderA);
            }
          };
          for (let i = 0; i < strokePolyline.length - 1; i++) {
            const a = strokePolyline[i];
            const b = strokePolyline[i + 1];
            rasterLine(a.x, a.y, b.x, b.y, thickPlot);
          }
        }
      }

      // Guías tipo herramienta de curva: dos líneas magenta desde cada ancla
      // al punto de control (cursor). Mismo estilo visual que el curve tool.
      if (activeCurveInfo) {
        const gR = 234, gG = 0, gB = 255;
        const gA = Math.floor(255 * 0.35);
        const guidePlot = bw <= 1
          ? (x, y) => plotPixel(x, y, gR, gG, gB, gA)
          : (x, y) => {
              for (let dy = 0; dy < bw; dy++) {
                for (let dx = 0; dx < bw; dx++) {
                  plotPixel(x + dx - half, y + dy - half, gR, gG, gB, gA);
                }
              }
            };
        const { start, end, control } = activeCurveInfo;
        rasterLine(start.x | 0, start.y | 0, control.x | 0, control.y | 0, guidePlot);
        rasterLine(end.x | 0, end.y | 0, control.x | 0, control.y | 0, guidePlot);
      }

      const off = document.createElement("canvas");
      off.width = visibleWidth;
      off.height = visibleHeight;
      off.getContext("2d").putImageData(imageData, 0, 0);

      const prevSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      const dx = Math.round(viewportStartX * zoom);
      const dy = Math.round(viewportStartY * zoom);
      const dw = Math.round((viewportStartX + visibleWidth) * zoom) - dx;
      const dh = Math.round((viewportStartY + visibleHeight) * zoom) - dy;
      ctx.drawImage(off, 0, 0, visibleWidth, visibleHeight, dx, dy, dw, dh);
      ctx.imageSmoothingEnabled = prevSmoothing;
    }

    // --- Marcadores UI en espacio de pantalla ---
    // Anclas
    for (const p of points) {
      const sx = (p.x - viewportOffset.x) * zoom;
      const sy = (p.y - viewportOffset.y) * zoom;
      ctx.fillStyle = "rgba(0, 200, 255, 0.9)";
      ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 2, 4, 4);
    }

    // Puntos de control existentes
    curvePoints.forEach((cp) => {
      const sx = (cp.x - viewportOffset.x) * zoom;
      const sy = (cp.y - viewportOffset.y) * zoom;
      ctx.fillStyle = "rgba(0, 150, 255, 0.9)";
      ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 2, 4, 4);
    });

    // Punto de control en vivo (modo curva)
    if (isSettingCurve && cursor) {
      const sx = (cursor.x - viewportOffset.x) * zoom;
      const sy = (cursor.y - viewportOffset.y) * zoom;
      ctx.fillStyle = "rgba(0, 150, 255, 0.9)";
      ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 3, 6, 6);
    }

    // Anillo amarillo de cierre cuando el cursor está cerca del primer punto
    if (points.length >= 3 && cursor && !isSettingCurve) {
      const fp = points[0];
      const distSq = (cursor.x - fp.x) ** 2 + (cursor.y - fp.y) ** 2;
      if (distSq <= 100) { // <= 10px
        const sx = (fp.x - viewportOffset.x) * zoom;
        const sy = (fp.y - viewportOffset.y) * zoom;
        ctx.strokeStyle = "rgba(255, 220, 0, 0.95)";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(Math.round(sx) - 4, Math.round(sy) - 4, 8, 8);
      }
    }
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
  // Acumula screen-pixels exactos para panning suave. Es un ref, sin re-renders.
  const panAccumRef = useRef({ x: 0, y: 0 });

  const handleStartDrag = useCallback(
    (e) => {
      if (drawMode === "move" || isSpacePressed) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        panAccumRef.current = { x: 0, y: 0 };
      }
    },
    [drawMode, isSpacePressed]
  );

  const handleDrag = useCallback(
    (e) => {
      if (isDragging && (drawMode === "move" || isSpacePressed)) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        // Acumular desplazamiento exacto en screen-pixels
        panAccumRef.current.x += dx;
        panAccumRef.current.y += dy;

        // Píxeles enteros de sprite (drag derecha = viewportOffset disminuye)
        const moveX = -Math.trunc(panAccumRef.current.x / zoom);
        const moveY = -Math.trunc(panAccumRef.current.y / zoom);

        if (moveX !== 0 || moveY !== 0) {
          moveViewport(moveX, moveY);
          // Descontar lo ya comprometido al viewport
          panAccumRef.current.x += moveX * zoom;
          panAccumRef.current.y += moveY * zoom;
        }

        // Aplicar sub-píxel restante como CSS transform (sin re-render del canvas)
        setPanOffset({ x: panAccumRef.current.x, y: panAccumRef.current.y });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    },
    [isDragging, dragStart, zoom, drawMode, moveViewport, isSpacePressed]
  );

  const handleEndDrag = useCallback(() => {
    setIsDragging(false);

    // Redondear el sub-píxel restante al sprite-pixel más cercano y confirmarlo
    const snapX = Math.round(panAccumRef.current.x / zoom);
    const snapY = Math.round(panAccumRef.current.y / zoom);
    if (snapX !== 0 || snapY !== 0) {
      moveViewport(-snapX, -snapY);
    }
    panAccumRef.current = { x: 0, y: 0 };
    setPanOffset({ x: 0, y: 0 });
  }, [zoom, moveViewport]);

  const rellenar = useCallback(
    (coords, color) => {
      floodFill(activeLayerId, coords.x, coords.y, color);
      getMatchingPixels(activeLayerId, coords.x, coords.y);
      invalidateImageDataCacheOptimized();
    },
    [layers, activeLayerId, toolParameters, zoom, viewportOffset]
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
      invalidateImageDataCacheOptimized();
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

  const withIsolationCheck = (() => {
    let cachedMask = null;
    let lastPixelsHash = null;
    let cachedMaskCanvas = null;
    let cachedTempCanvas = null;
  
    const hashPixels = (pixels) => {
      let hash = 0;
      for (let i = 0; i < pixels.length; i++) {
        const { x, y } = pixels[i];
        hash ^= ((x + 1) * 31 + (y + 1)) << (i % 8);
      }
      return hash;
    };
  
    return (drawFunction) => {
      if (!isolatedPixels || isolatedPixels.length === 0) {
        return drawFunction;
      }
  
      return (ctx, ...args) => {
        const { width, height } = ctx.canvas;
        const currentHash = hashPixels(isolatedPixels);
  
        // Regenerar la máscara solo si los píxeles han cambiado
        if (lastPixelsHash !== currentHash) {
          if (!cachedMaskCanvas) {
            cachedMaskCanvas = document.createElement('canvas');
          }
          cachedMaskCanvas.width = width;
          cachedMaskCanvas.height = height;
  
          const maskCtx = cachedMaskCanvas.getContext('2d');
          maskCtx.clearRect(0, 0, width, height);
          maskCtx.fillStyle = 'white';
          for (const { x, y } of isolatedPixels) {
            maskCtx.fillRect(x, y, 1, 1);
          }
  
          cachedMask = cachedMaskCanvas;
          lastPixelsHash = currentHash;
        }
  
        // Reutilizar canvas temporal
        if (!cachedTempCanvas) {
          cachedTempCanvas = document.createElement('canvas');
        }
        cachedTempCanvas.width = width;
        cachedTempCanvas.height = height;
  
        const tempCtx = cachedTempCanvas.getContext('2d');
        tempCtx.clearRect(0, 0, width, height);
  
        // Ejecutar la función de dibujo sobre el canvas temporal
        const result = drawFunction(tempCtx, ...args);
  
        // Aplicar la máscara con composición
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(cachedMask, 0, 0);
  
        // Dibujar el resultado final sobre el canvas real
        ctx.drawImage(cachedTempCanvas, 0, 0);
  
        return result;
      };
    };
  })();
  
  const cachedImageDataRef = useRef(null);
const cacheValidRef = useRef(false);
const webglFallbackWarnedRef = useRef(false);

// Dirty-rect tracking para cachedImageDataRef.
// Los tools que escriben en el ImageData cacheado pueden reportar el bbox tocado
// via markCachedImageDataDirty(). Al flushear con flushCachedImageDataToCanvas(),
// si hay un bbox válido, usamos ctx.putImageData(imgData, 0, 0, dx, dy, dw, dh) —
// el navegador solo sube esa sub-región a GPU, en vez de los ~67MB del canvas
// completo (4096²).
// Si el tool no reporta nada, el helper cae a putImageData(imgData, 0, 0) como
// antes — backward compatible.
const cachedImageDataDirtyRectRef = useRef(null);

const resetCachedImageDataDirtyRect = useCallback(() => {
  cachedImageDataDirtyRectRef.current = null;
}, []);

const markCachedImageDataDirty = useCallback((x, y, w, h) => {
  if (w <= 0 || h <= 0) return;
  const rect = cachedImageDataDirtyRectRef.current;
  const endX = x + w - 1;
  const endY = y + h - 1;
  if (!rect) {
    cachedImageDataDirtyRectRef.current = { minX: x, minY: y, maxX: endX, maxY: endY };
    return;
  }
  if (x < rect.minX) rect.minX = x;
  if (y < rect.minY) rect.minY = y;
  if (endX > rect.maxX) rect.maxX = endX;
  if (endY > rect.maxY) rect.maxY = endY;
}, []);

const flushCachedImageDataToCanvas = useCallback((ctx) => {
  const imgData = cachedImageDataRef.current;
  if (!imgData) return;
  const canvas = ctx.canvas;
  const rect = cachedImageDataDirtyRectRef.current;

  if (rect) {
    // Clamp al canvas real
    const dx = Math.max(0, rect.minX);
    const dy = Math.max(0, rect.minY);
    const dEndX = Math.min(canvas.width - 1, rect.maxX);
    const dEndY = Math.min(canvas.height - 1, rect.maxY);
    const dw = dEndX - dx + 1;
    const dh = dEndY - dy + 1;
    if (dw > 0 && dh > 0) {
      // putImageData con dirty rect: solo sube la sub-región a GPU.
      ctx.putImageData(imgData, 0, 0, dx, dy, dw, dh);
    }
  } else {
    // Fallback: tool no reportó bbox, subimos todo como antes.
    ctx.putImageData(imgData, 0, 0);
  }
  cachedImageDataDirtyRectRef.current = null;
}, []);

// Helpers WebGL delegados a ./container/utils/webglRenderer.js.
const initializeWebGLImageRenderer = useCallback(
  (canvas) => initializeWebGLImageRendererUtil(canvas),
  []
);

const putImageDataOptimized = useCallback(
  (imageData, x = 0, y = 0) =>
    putImageDataOptimizedUtil(
      compositeCanvasRef.current,
      webglRendererRef.current,
      imageData,
      x,
      y
    ),
  []
);




const glCacheRef = useRef(null);

const initializeImageDataCacheOptimized = (ctx) => {
  const canvas = ctx.canvas;

  if (cachedImageDataRef.current &&
      cachedImageDataRef.current.width === canvas.width &&
      cachedImageDataRef.current.height === canvas.height &&
      cacheValidRef.current) {
    return;
  }

  let gl = glCacheRef.current;
  if (!gl || gl.canvas !== canvas) {
    try {
      gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true }) ||
           canvas.getContext('webgl',  { preserveDrawingBuffer: true });
    } catch {
      gl = null;
    }
    glCacheRef.current = gl;
  }

  if (gl) {
    const w = canvas.width, h = canvas.height;
    let buf = cachedImageDataRef.current?.data;
    if (!buf || buf.length !== w * h * 4) {
      buf = new Uint8ClampedArray(w * h * 4);
    }
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(buf.buffer));
    cachedImageDataRef.current = new ImageData(buf, w, h);
  } else {
    // Fallback sin WebGL: ctx.getImageData completo es O(w*h) síncrono en main thread.
    // En canvas grandes (>2048²) bloquea visiblemente. Avisamos una sola vez por
    // sesión para que el usuario sepa que el rendimiento se degradará.
    if (!webglFallbackWarnedRef.current) {
      webglFallbackWarnedRef.current = true;
      const megaPx = (canvas.width * canvas.height) / 1_000_000;
      if (megaPx >= 2) {
        console.warn(
          `[PixCalli] WebGL no disponible. Canvas de ${canvas.width}×${canvas.height} ` +
          `(${megaPx.toFixed(1)} MP): cada operación usará getImageData completo ` +
          `(~${(canvas.width * canvas.height * 4 / 1024 / 1024).toFixed(0)} MB síncrono). ` +
          `Si notás lag, bajá el tamaño del canvas o habilitá aceleración por GPU.`
        );
      }
    }
    cachedImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  cacheValidRef.current = true;
};

// 5. INICIALIZACIÓN WEBGL EN useEffect
// Agregar este useEffect después de los existentes
useEffect(() => {
  const canvas = compositeCanvasRef.current;
  if (canvas) {
    // Inicializar WebGL renderer
    webglRendererRef.current = initializeWebGLImageRenderer(canvas);
    
    if (!webglRendererRef.current) {
      console.log('WebGL no disponible, usando fallback a Canvas 2D');
    } else {
      console.log('WebGL inicializado correctamente para putImageData optimizado');
    }
  }
}, [initializeWebGLImageRenderer]);


useEffect(() => {
  return () => {
    disposeWebGLImageRenderer(webglRendererRef.current);
  };
}, []);

// 10. FUNCIÓN PARA INVALIDAR CACHE WEBGL
const invalidateImageDataCacheOptimized = useCallback(() => {
  cacheValidRef.current = false;
  cachedImageDataDirtyRectRef.current = null;
}, []);
// Sincroniza la ref declarada arriba (usada por handlers del plan ambicioso
// que se declaran ANTES que esta función y no pueden tenerla en deps — TDZ).
// eslint-disable-next-line react-hooks/rules-of-hooks
useEffect(() => { invalidateCacheRef.current = invalidateImageDataCacheOptimized; }, [invalidateImageDataCacheOptimized]);

// Invalidar solo cuando la composición externa del canvas pudo cambiar.
// Antes dependía de isPressed → forzaba readPixels completo en cada trazo.
// framesResume se omite a propósito: checkIfCanvasIsPaintedViaBlob lo actualiza
// async tras cada pointerup, lo que invalidaba el caché justo antes del siguiente
// trazo (contraproducente). Las mutaciones reales del composite (undo/redo, fill,
// paste) invalidan explícitamente en sus handlers.
useEffect(() => {
  invalidateImageDataCacheOptimized();
}, [
  activeLayerId,
  currentFrame,
  layers.length,
  drawableWidth,
  drawableHeight,
  isolatedPixels,
  invalidateImageDataCacheOptimized,
]);

// Pre-warm eliminado a propósito: el caché está atado al contexto del *layer*
// canvas (resolución nativa), no al composite (escalado por zoom). Pre-calentar
// con el composite ctx leía la resolución equivocada y además forzaba un
// getImageData grande justo tras pointerup — ese stall causaba pérdida de
// nitidez visible durante el re-render del composite. Los callsites de pintura
// ya llenan el caché con el ctx correcto al primer píxel del trazo.
// Función auxiliar para voltear ImageData verticalmente (WebGL lee al revés)
const flipImageDataVertically = (imageData) => {
  const { data, width, height } = imageData;
  const flippedData = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceIndex = ((height - 1 - y) * width + x) * 4;
      const targetIndex = (y * width + x) * 4;
      
      flippedData[targetIndex] = data[sourceIndex];         // R
      flippedData[targetIndex + 1] = data[sourceIndex + 1]; // G
      flippedData[targetIndex + 2] = data[sourceIndex + 2]; // B
      flippedData[targetIndex + 3] = data[sourceIndex + 3]; // A
    }
  }
  
  return new ImageData(flippedData, width, height);
};

// Función para invalidar el cache (llamar cuando sea necesario)
const invalidateImageDataCache = () => {
  cacheValidRef.current = false;
};

///=======================PIXEL PERFECT ============================================================
// En el componente CanvasTracker, agregar estos estados:
const [strokeHistory, setStrokeHistory] = useState([]);
const [isRecordingStroke, setIsRecordingStroke] = useState(false);
// Helpers de suavizado delegados a ./container/utils/strokeSmoothing.js.
const smoothStroke = useCallback(
  (points, perfectionLevel) => smoothStrokeUtil(points, perfectionLevel),
  []
);
const straightenNearStraightSegments = useCallback(
  (points, perfectionLevel) =>
    straightenNearStraightSegmentsUtil(points, perfectionLevel),
  []
);
const applyCurveSmoothing = useCallback(
  (points, perfectionLevel) => applyCurveSmoothingUtil(points, perfectionLevel),
  []
);
// Asegurarse de que perfection esté en toolParameters (en tu CustomTool component)
// toolParameters.perfection = 0 a 1 (0 = sin suavizado, 1 = máximo suavizado)
const resetCanvasToolState = useCallback(() => {
  console.log("🧹 Reseteando estado de herramientas del canvas");
  
  // Limpiar todas las referencias globales
  lastPixelRef.current = null;
  cachedImageDataRef.current = null;
  
  // Limpiar referencias de curva
  curveStartRef.current = null;
  curveEndRef.current = null;
  curveControlRef.current = null;
  curveButton.current = null;
  setCurveState("idle");
  setIsSettingControl(false);
  
  // Limpiar referencias de línea
  lineStartRef.current = null;
  lineButton.current = null;
  
  // Limpiar otras herramientas
  squareStartRef.current = null;
  triangleStartRef.current = null;
  circleStartRef.current = null;
  ellipseStartRef.current = null;
  polygonStartRef.current = null;
  
  // Limpiar pattern offset
  initialPatternOffset.current = null;
  
  // Limpiar perfect pencil
  pencilPerfectPathRef.current = [];
  pencilPerfectButtonRef.current = null;
  
  // Invalidar cache
  cacheValidRef.current = false;
}, [
  setCurveState, 
  setIsSettingControl
]);

// 2. USEEFFECT SEPARADO PARA LIMPIEZA AL CAMBIAR HERRAMIENTA
useEffect(() => {
  // Ejecutar limpieza cada vez que cambie la herramienta
  resetCanvasToolState();
}, [tool, resetCanvasToolState]);
  // Efecto principal para manejar el dibujo
  useEffect(() => {

    if (tool === TOOLS.eyeDropper) {
      
      if (isPressed && lastPixelRef.current === null) {
        // Se acaba de presionar - obtener color inmediatamente
        console.log("🎨 EyeDropper: Iniciando obtención de color");
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const canvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );
  
        // Ejecutar la obtención de color de forma asíncrona
        getPixelColorAt(canvasCoords.x, canvasCoords.y)
          .then(color => {
            if (color) {
              applyEyeDropperColor(color, isPressed);
            } else {
              console.warn('No se pudo obtener el color del pixel');
            }
          })
          .catch(error => {
            console.error('Error en EyeDropper:', error);
          });
  
        // Marcar que ya se ejecutó
        lastPixelRef.current = viewportPixelCoords;
      } else if (!isPressed && lastPixelRef.current !== null) {
        // Se acaba de soltar - limpiar
        console.log("🎨 EyeDropper: Limpiando");
        lastPixelRef.current = null;
      }
      return; // Salir temprano para no procesar otras herramientas
    }
 


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

    // Magic Wand (plan ambicioso, Sprint 2).
    // Genera una máscara de selección basada en similitud de color. Contiguo
    // (flood 4-vecinos) o global según params. Combina con máscara previa usando
    // Shift/Alt/Shift+Alt para add/subtract/intersect.
    if (tool === TOOLS.magicWand) {
      if (isPressed && lastPixelRef.current === null) {
        const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
        const canvasCoords = viewportToCanvasCoords(
          viewportPixelCoords.x,
          viewportPixelCoords.y
        );
        const layerCanvas =
          frames?.[currentFrame]?.canvases?.[activeLayerId] ?? null;
        if (layerCanvas) {
          const newMask = maskFromMagicWand(
            layerCanvas,
            canvasCoords.x,
            canvasCoords.y,
            {
              tolerance: magicWandParams.tolerance,
              contiguous: magicWandParams.contiguous,
              matchAlpha: magicWandParams.matchAlpha,
            }
          );
          // Modifier keys: Shift/Alt/Shift+Alt se inspeccionan del último evento
          // global. Por ahora usamos el booleanOp del panel como default.
          const op =
            magicWandMask && magicWandParams.booleanOp !== 'replace'
              ? magicWandParams.booleanOp
              : 'replace';
          const combined =
            op === 'replace' || !magicWandMask
              ? newMask
              : combineMasks(magicWandMask, newMask, op);
          setMagicWandMask(combined);
          console.log(
            `🪄 Magic Wand: ${countSelected(combined)} píxeles seleccionados (${op})`
          );
        }
        lastPixelRef.current = viewportPixelCoords;
      } else if (!isPressed && lastPixelRef.current !== null) {
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

            // bbox de la curva cuadrática: cubre los 3 puntos (start/end/control).
            // Una curva de Bézier siempre queda dentro del bbox de sus puntos de
            // control, así que ese bbox + padding del pincel es suficiente.
            const curveBrushW = toolParameters.width || 1;
            const curvePad = Math.ceil(curveBrushW) + 2;
            let curveBbox;
            if (mirrorState.vertical || mirrorState.horizontal) {
              // Con mirror, los reflejos pueden caer lejos — usamos el drawable completo.
              curveBbox = { x: 0, y: 0, w: drawableWidth, h: drawableHeight };
            } else {
              const cMinX = Math.min(start.x, end.x, control.x) - curvePad;
              const cMinY = Math.min(start.y, end.y, control.y) - curvePad;
              const cMaxX = Math.max(start.x, end.x, control.x) + curvePad;
              const cMaxY = Math.max(start.y, end.y, control.y) + curvePad;
              curveBbox = { x: cMinX, y: cMinY, w: cMaxX - cMinX, h: cMaxY - cMinY };
            }

            commitShapeWithHistory(activeLayerId, currentFrame, curveBbox, withIsolationCheck((ctx) => {
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
    if (tool === TOOLS.line || (isShiftPressed && tool === TOOLS.paint)) {
      if (isPressed) {
        if (!lineStartRef.current) {
          // SOLO guardar el botón cuando se inicia la línea por primera vez
          lineButton.current = isPressed;


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

          // Usar la referencia guardada (no isPressed actual)
          const selectedColor =
            lineButton.current === "left"
              ? toolParameters.foregroundColor
              : lineButton.current === "right"
              ? toolParameters.backgroundColor
              : toolParameters.foregroundColor; // fallback a foreground

          // bbox de la línea: extremos + padding del pincel (cubre blur/width y mirrors básicos).
          const lineBrushW = toolParameters?.width || 1;
          const linePad = Math.ceil(lineBrushW) + 2;
          const lsx = lineStartRef.current.x, lsy = lineStartRef.current.y;
          const lineBbox = {
            x: Math.min(lsx, endCoords.x) - linePad,
            y: Math.min(lsy, endCoords.y) - linePad,
            w: Math.abs(endCoords.x - lsx) + linePad * 2,
            h: Math.abs(endCoords.y - lsy) + linePad * 2,
          };
          // Ampliar bbox cuando hay mirror activo — los reflejos pueden caer lejos.
          if (mirrorState.vertical || mirrorState.horizontal) {
            lineBbox.x = 0;
            lineBbox.y = 0;
            lineBbox.w = drawableWidth;
            lineBbox.h = drawableHeight;
          }

          commitShapeWithHistory(activeLayerId, currentFrame, lineBbox, (ctx) => {
            const canvas = ctx.canvas;
            const width = toolParameters?.width || 1;
            const blur = toolParameters.blur || 0;
            const paintMode = toolParameters?.paintMode || "manual";
    
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
    
            // Ajustes para dimensiones impares (igual que en paint)
            const adjustment = -1;
            const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
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
    
            // Función para obtener la posición de grilla más cercana
            const getGridPosition = (x, y) => {
              if (patternAlignment === "normal") {
                return { x: x, y: y, shouldPaint: true };
              }
    
              const brushDims = getBrushDimensions();
              let gridOriginX, gridOriginY;
    
              if (patternAlignment === "source") {
                // Para líneas, usar el punto de inicio como origen
                gridOriginX = lineStartRef.current.x;
                gridOriginY = lineStartRef.current.y;
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
    
              return { x: gridX, y: gridY, shouldPaint: true };
            };
    
            // Función para dibujar brocha personalizada
            const drawCustomBrush = (centerX, centerY) => {
              for (const pixel of customBrushData) {
                const pixelX = centerX + pixel.x;
                const pixelY = centerY + pixel.y;
    
                if (pixelX < 0 || pixelX >= canvas.width || pixelY < 0 || pixelY >= canvas.height)
                  continue;
    
                if (paintMode === "composite") {
                  ctx.globalAlpha = pixel.color.a / 255;
                  ctx.fillStyle = `rgba(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b}, ${pixel.color.a})`;
                  ctx.fillRect(pixelX, pixelY, 1, 1);
                } else {
                  // Modo manual - para líneas, usar fillRect directo
                  ctx.fillStyle = `rgba(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b}, ${pixel.color.a})`;
                  ctx.fillRect(pixelX, pixelY, 1, 1);
                }
              }
            };
    
            // Función para dibujar brocha personalizada con espejos
            const drawCustomBrushWithMirrors = (x, y) => {
              const gridPos = getGridPosition(x, y);
              if (gridPos.shouldPaint) {
                drawCustomBrush(gridPos.x, gridPos.y);
    
                if (mirrorState.vertical) {
                  drawCustomBrush(gridPos.x, reflectVertical(gridPos.y));
                }
                if (mirrorState.horizontal) {
                  drawCustomBrush(reflectHorizontal(gridPos.x), gridPos.y);
                }
                if (mirrorState.vertical && mirrorState.horizontal) {
                  drawCustomBrush(reflectHorizontal(gridPos.x), reflectVertical(gridPos.y));
                }
              }
            };
    
            // Función para dibujar brocha estándar
            const drawStandardBrush = (x, y) => {
              const gridPos = getGridPosition(x, y);
              if (!gridPos.shouldPaint) return;
    
              ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${selectedColor.a})`;
    
              if (blur === 0) {
                // Sin blur: rectángulo simple
                ctx.fillRect(gridPos.x - halfWidth, gridPos.y - halfWidth, width, width);
              } else {
                // Con blur: gradiente
                const coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
                const gradient = ctx.createRadialGradient(
                  gridPos.x,
                  gridPos.y,
                  0,
                  gridPos.x,
                  gridPos.y,
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
                ctx.arc(gridPos.x, gridPos.y, maxRadius, 0, 2 * Math.PI);
                ctx.fill();
              }
            };
    
            // Función para dibujar brocha estándar con espejos
            const drawStandardBrushWithMirrors = (x, y) => {
              drawStandardBrush(x, y);
    
              if (mirrorState.vertical) {
                drawStandardBrush(x, reflectVertical(y));
              }
              if (mirrorState.horizontal) {
                drawStandardBrush(reflectHorizontal(x), y);
              }
              if (mirrorState.vertical && mirrorState.horizontal) {
                drawStandardBrush(reflectHorizontal(x), reflectVertical(y));
              }
            };
    
            // Función principal para dibujar línea usando algoritmo de Bresenham
            const drawLineWithBrush = (startX, startY, endX, endY) => {
              let x0 = startX, y0 = startY;
              let x1 = endX, y1 = endY;
              let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
              let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
              let err = dx + dy;
    
              // Elegir función de dibujo según el tipo de brocha
              const drawFunction = useCustomBrush && customBrushData.length > 0
                ? drawCustomBrushWithMirrors
                : drawStandardBrushWithMirrors;
    
              while (true) {
                drawFunction(x0, y0);
    
                if (x0 === x1 && y0 === y1) break;
    
                const e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
              }
            };
    
            // Configurar contexto
            ctx.globalCompositeOperation = "source-over";
    
            const start = lineStartRef.current;
            const startX = start.x;
            const startY = start.y;
            const endX = endCoords.x;
            const endY = endCoords.y;
    
            // Dibujar la línea principal
            drawLineWithBrush(startX, startY, endX, endY);
          });
    
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

          const borderColor = toolParameters.borderColor || null;
          const fillColor = toolParameters.fillColor || color;
          const borderWidth = toolParameters.borderWidth || 0;
          const borderRadius = toolParameters.borderRadius || 0;

          // bbox de la figura para undo/redo: cubre rectángulo completo + borde
          const pad = Math.max(borderWidth, 1) + 2;
          const sx = squareStartRef.current.x, sy = squareStartRef.current.y;
          const bbox = {
            x: Math.min(sx, endCoords.x) - pad,
            y: Math.min(sy, endCoords.y) - pad,
            w: Math.abs(endCoords.x - sx) + pad * 2,
            h: Math.abs(endCoords.y - sy) + pad * 2,
          };

          commitShapeWithHistory(activeLayerId, currentFrame, bbox, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";

            const width = endCoords.x - squareStartRef.current.x;
            const height = endCoords.y - squareStartRef.current.y;

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

          const borderColor = toolParameters.borderColor || null;
          const fillColor = toolParameters.fillColor || color;
          const borderWidth = toolParameters.borderWidth || 0;

          const pad = Math.max(borderWidth, 1) + 2;
          const sx = triangleStartRef.current.x, sy = triangleStartRef.current.y;
          const bbox = {
            x: Math.min(sx, endCoords.x) - pad,
            y: Math.min(sy, endCoords.y) - pad,
            w: Math.abs(endCoords.x - sx) + pad * 2,
            h: Math.abs(endCoords.y - sy) + pad * 2,
          };

          commitShapeWithHistory(activeLayerId, currentFrame, bbox, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";
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

          const deltaX = endCoords.x - circleStartRef.current.x;
          const deltaY = endCoords.y - circleStartRef.current.y;
          const radius = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));

          const borderColor = toolParameters.borderColor || null;
          const fillColor = toolParameters.fillColor || color;
          const borderWidth = toolParameters.borderWidth || 0;

          const pad = Math.max(borderWidth, 1) + 2;
          const cx = circleStartRef.current.x, cy = circleStartRef.current.y;
          const bbox = {
            x: cx - radius - pad,
            y: cy - radius - pad,
            w: radius * 2 + pad * 2,
            h: radius * 2 + pad * 2,
          };

          commitShapeWithHistory(activeLayerId, currentFrame, bbox, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";
            drawCircle(ctx, cx, cy, radius, borderWidth, borderColor, fillColor);
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

          const borderColor = toolParameters.borderColor || null;
          const fillColor = toolParameters.fillColor || color;
          const borderWidth = toolParameters.borderWidth || 0;

          const pad = Math.max(borderWidth, 1) + 2;
          const sx = ellipseStartRef.current.x, sy = ellipseStartRef.current.y;
          const bbox = {
            x: Math.min(sx, endCoords.x) - pad,
            y: Math.min(sy, endCoords.y) - pad,
            w: Math.abs(endCoords.x - sx) + pad * 2,
            h: Math.abs(endCoords.y - sy) + pad * 2,
          };

          commitShapeWithHistory(activeLayerId, currentFrame, bbox, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";
            drawEllipse(
              ctx,
              sx,
              sy,
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

          const centerX = polygonStartRef.current.x;
          const centerY = polygonStartRef.current.y;
          const dxP = endCoords.x - centerX;
          const dyP = endCoords.y - centerY;
          const radius = Math.sqrt(dxP * dxP + dyP * dyP);

          const borderColor = toolParameters.borderColor || null;
          const fillColor = toolParameters.fillColor || color;
          const borderWidth = toolParameters.borderWidth || 0;
          const vertices = toolParameters.vertices || 6;
          const rotation = ((toolParameters.rotation || 0) * Math.PI) / 180;

          const pad = Math.max(borderWidth, 1) + 2;
          const bbox = {
            x: centerX - radius - pad,
            y: centerY - radius - pad,
            w: radius * 2 + pad * 2,
            h: radius * 2 + pad * 2,
          };

          commitShapeWithHistory(activeLayerId, currentFrame, bbox, withIsolationCheck((ctx) => {
            ctx.globalCompositeOperation = "source-over";
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
                    toolParameters.fillColor
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

      // Detectar hold mientras se mantiene presionado.
      // Comportamiento estilo Illustrator: la curva deforma el segmento
      // (anterior → recién colocado), no el segmento de cierre. Requiere al
      // menos 2 anclas colocadas: la penúltima y la actual.
      if (isPressed && !isSettingCurve && polygonPoints.length >= 2) {
        const holdTime = Date.now() - (polygonStartTimeRef.current || 0);
        if (holdTime > 300) {
          setIsSettingCurve(true);
          setCurrentCurveIndex(polygonPoints.length - 2); // Ancla anterior (la penúltima)
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

    if (tool === TOOLS.paint && !isShiftPressed && toolParameters.perfectCurves) {
      const viewportPixelCoords = getPixelCoordinates(relativeToTarget);
      const canvasCoords = viewportToCanvasCoords(
        viewportPixelCoords.x,
        viewportPixelCoords.y
      );
    
      if (isPressed) {
        // Mientras está presionado, recolectar coordenadas
        if (!lastPixelRef.current) {
          // Primer punto - inicializar el path Y guardar qué botón fue presionado
          pencilPerfectPathRef.current = [canvasCoords];
          // NUEVO: Guardar qué botón fue presionado (asumiendo que tienes esta info disponible)
          // Reemplaza 'buttonPressed' con la variable real que contiene esta información
          pencilPerfectButtonRef.current = isPressed; // 'left' o 'right'
        } else {
          // Agregar punto al path
          pencilPerfectPathRef.current.push(canvasCoords);
        }
        
        // Actualizar lastPixelRef para el siguiente frame
        lastPixelRef.current = viewportPixelCoords;
        return; // No dibujar todavía, solo recolectar
      } else {
        // Se soltó el cursor - ejecutar el dibujo si hay un path
        if (lastPixelRef.current && pencilPerfectPathRef.current.length > 0) {
          // CORREGIDO: Usar la referencia del botón guardada al inicio del trazo
          const selectedColor =
            pencilPerfectButtonRef.current === "left"
              ? toolParameters.foregroundColor
              : pencilPerfectButtonRef.current === "right"
              ? toolParameters.backgroundColor
              : toolParameters.foregroundColor; // fallback a foreground
    
          // `pixelPerfectPath` interpola con Bresenham entre los pointer
          // events crudos y luego descarta los corner-pixels. El pipeline
          // anterior (pixelPerfect sobre pointer-raw + rasterLine entre
          // puntos filtrados) dejaba los corners intactos porque los
          // pointer events casi nunca están a 1 px consecutivo — los saltos
          // típicos son de 3-10 px y el filtro no disparaba nunca.
          const pathCoordinates = pixelPerfectPath(pencilPerfectPathRef.current);
    
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
            const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
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
          
            // MODIFICACIÓN: Inicializar offset de patrón con el primer punto del path
            let initialPatternOffsetValue = null;
          
            // Función para obtener la posición de grilla más cercana
            const getGridPosition = (x, y, isInitialClick = false) => {
              if (patternAlignment === "normal") {
                return { x: x, y: y, shouldPaint: true };
              }
          
              const brushDims = getBrushDimensions();
              let gridOriginX, gridOriginY;
          
              if (patternAlignment === "source") {
                // Alinear al punto donde se hizo el primer clic
                if (isInitialClick || !initialPatternOffsetValue) {
                  // Guardar la coordenada inicial como origen de la grilla
                  initialPatternOffsetValue = { x: x, y: y };
                  gridOriginX = x;
                  gridOriginY = y;
                } else {
                  // Usar la coordenada inicial guardada como origen
                  gridOriginX = initialPatternOffsetValue.x;
                  gridOriginY = initialPatternOffsetValue.y;
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
          
              const baseOpacity = selectedColor.a / Math.max(1, width / 6);
              const velocityReduction = normalizedVelocity * 0.8;
              const finalOpacity = baseOpacity * (1 - velocityReduction);
              const minOpacity = baseOpacity * 0.05;
          
              return Math.max(finalOpacity, minOpacity);
            };
          
            // INICIALIZACIÓN PARA EL PATH COMPLETO
            let shouldInitializeCache = true;
          
            // Si se usa brocha personalizada, usar la lógica personalizada
            if (useCustomBrush && customBrushData.length > 0) {
              const originalComposite = ctx.globalCompositeOperation;
          
              if (paintMode === "composite") {
                ctx.globalCompositeOperation = "source-over";
              } else {
                // MODO MANUAL CON BROCHA PERSONALIZADA Y CACHE
                if (shouldInitializeCache) {
                  // Inicializar ImageData cache
                  initializeImageDataCacheOptimized(ctx);
                 
                  shouldInitializeCache = false;
                }
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
                  let brushMinX = Infinity, brushMinY = Infinity, brushMaxX = -Infinity, brushMaxY = -Infinity;

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

                    if (pixelX < brushMinX) brushMinX = pixelX;
                    if (pixelY < brushMinY) brushMinY = pixelY;
                    if (pixelX > brushMaxX) brushMaxX = pixelX;
                    if (pixelY > brushMaxY) brushMaxY = pixelY;
                  }
                  if (brushMinX !== Infinity) {
                    markCachedImageDataDirty(brushMinX, brushMinY, brushMaxX - brushMinX + 1, brushMaxY - brushMinY + 1);
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
          
              // PROCESAR TODO EL PATH
              for (let i = 0; i < pathCoordinates.length; i++) {
                const currentPoint = pathCoordinates[i]; // Ya son coordenadas de canvas
                
                if (i === 0) {
                  // Primer punto del path
                  const gridPos = getGridPosition(currentPoint.x, currentPoint.y, true);
                  if (gridPos.shouldPaint) {
                    drawCustomBrushWithMirrors(gridPos.x, gridPos.y, 1.0);
                  }
                } else {
                  // Puntos subsecuentes - interpolar desde el punto anterior
                  const lastPoint = pathCoordinates[i - 1];
          
                  // Algoritmo de Bresenham para interpolar entre puntos
                  let x0 = lastPoint.x, y0 = lastPoint.y;
                  let x1 = currentPoint.x, y1 = currentPoint.y;
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
              }
          
              // Aplicar cambios al canvas
              if (paintMode === "composite") {
                ctx.globalCompositeOperation = originalComposite;
                ctx.globalAlpha = 1;
              } else {
                // Para modo manual, aplicar el ImageData modificado
                flushCachedImageDataToCanvas(ctx);
              }
          
              return; // Salir temprano si se usó brocha personalizada
            }
          
            // Lógica para brochas estándar con pattern alignment
            if (paintMode === "composite") {
              // MODO COMPOSITE OPTIMIZADO
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
          
              // PROCESAR TODO EL PATH
              for (let i = 0; i < pathCoordinates.length; i++) {
                const currentPoint = pathCoordinates[i]; // Ya son coordenadas de canvas
                
                if (i === 0) {
                  // Primer punto del path
                  const gridPos = getGridPosition(currentPoint.x, currentPoint.y, true);
                  if (gridPos.shouldPaint) {
                    drawWithMirrors(gridPos.x, gridPos.y, 1.0);
                  }
                } else {
                  // Puntos subsecuentes - interpolar desde el punto anterior
                  const lastPoint = pathCoordinates[i - 1];
          
                  // Algoritmo de Bresenham optimizado
                  let x0 = lastPoint.x, y0 = lastPoint.y;
                  let x1 = currentPoint.x, y1 = currentPoint.y;
                  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
                  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
                  let err = dx + dy;
                  let prevX = x0, prevY = y0;
          
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
              }
          
              ctx.globalCompositeOperation = originalComposite;
              ctx.globalAlpha = 1;
            } else {
              // MODO MANUAL ULTRA-OPTIMIZADO CON CACHE
             
              if (shouldInitializeCache) {
                // Inicializar ImageData cache
                initializeImageDataCacheOptimized(ctx);
               
                shouldInitializeCache = false;
              }
              
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
                  // Sin blur: optimización máxima
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

              // Dirty-rect: bbox del path completo + reflejos + padding del pincel.
              // Permite que flushCachedImageDataToCanvas use putImageData con dirty
              // rect al final, evitando subir los ~67MB del canvas completo (4096²).
              {
                const pad = Math.ceil(maxRadius) + 1;
                let dMinX = Infinity, dMinY = Infinity, dMaxX = -Infinity, dMaxY = -Infinity;
                const accumPoint = (px, py) => {
                  if (px - pad < dMinX) dMinX = px - pad;
                  if (py - pad < dMinY) dMinY = py - pad;
                  if (px + pad > dMaxX) dMaxX = px + pad;
                  if (py + pad > dMaxY) dMaxY = py + pad;
                };
                for (let k = 0; k < pathCoordinates.length; k++) {
                  const p = pathCoordinates[k];
                  accumPoint(p.x, p.y);
                  if (mirrorState.vertical) accumPoint(p.x, reflectVertical(p.y));
                  if (mirrorState.horizontal) accumPoint(reflectHorizontal(p.x), p.y);
                  if (mirrorState.vertical && mirrorState.horizontal) {
                    accumPoint(reflectHorizontal(p.x), reflectVertical(p.y));
                  }
                }
                if (dMinX !== Infinity) {
                  const dx = Math.max(0, Math.floor(dMinX));
                  const dy = Math.max(0, Math.floor(dMinY));
                  const dEndX = Math.min(canvas.width - 1, Math.ceil(dMaxX));
                  const dEndY = Math.min(canvas.height - 1, Math.ceil(dMaxY));
                  if (dEndX >= dx && dEndY >= dy) {
                    markCachedImageDataDirty(dx, dy, dEndX - dx + 1, dEndY - dy + 1);
                  }
                }
              }

              // PROCESAR TODO EL PATH
              for (let i = 0; i < pathCoordinates.length; i++) {
                const currentPoint = pathCoordinates[i]; // Ya son coordenadas de canvas

                if (i === 0) {
                  // Primer punto del path
                  const gridPos = getGridPosition(currentPoint.x, currentPoint.y, true);
                  if (gridPos.shouldPaint) {
                    drawWithMirrors(gridPos.x, gridPos.y);
                  }
                } else {
                  // Puntos subsecuentes - interpolar desde el punto anterior
                  const lastPoint = pathCoordinates[i - 1];

                  // Bresenham optimizado
                  let x0 = lastPoint.x, y0 = lastPoint.y;
                  let x1 = currentPoint.x, y1 = currentPoint.y;
                  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
                  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
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
              }

              // Una sola llamada a putImageData al final
              flushCachedImageDataToCanvas(ctx);
            }
          }));
    
          // Limpiar después de dibujar
          pencilPerfectPathRef.current = [];
          lastPixelRef.current = null;
          pencilPerfectButtonRef.current = null; // NUEVO: Limpiar también la referencia del botón
        }
        return;
      }
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
    if (tool === TOOLS.paint2) {
      drawOnLayer(activeLayerId, (ctx) => {
        const canvas = ctx.canvas;
        const width = toolParameters.width;
        const offset = Math.floor(width / 2);

        // Calcular bbox del trazo (punto actual + anterior si existe) con padding del pincel.
        // Antes este tool leía todo el canvas con getImageData(0, 0, w, h) en cada
        // pointer move, escalando O(w*h) con el tamaño total del proyecto.
        const x1 = canvasCoords.x, y1 = canvasCoords.y;
        const last = lastPixelRef.current
          ? viewportToCanvasCoords(lastPixelRef.current.x, lastPixelRef.current.y)
          : null;
        const x0 = last ? last.x : x1;
        const y0 = last ? last.y : y1;

        const minPx = Math.min(x0, x1) - offset;
        const minPy = Math.min(y0, y1) - offset;
        const maxPx = Math.max(x0, x1) - offset + width - 1;
        const maxPy = Math.max(y0, y1) - offset + width - 1;

        const regionX = Math.max(0, minPx);
        const regionY = Math.max(0, minPy);
        const regionEndX = Math.min(canvas.width - 1, maxPx);
        const regionEndY = Math.min(canvas.height - 1, maxPy);
        const regionW = regionEndX - regionX + 1;
        const regionH = regionEndY - regionY + 1;

        if (regionW <= 0 || regionH <= 0) return;

        const imageData = ctx.getImageData(regionX, regionY, regionW, regionH);
        const data = imageData.data;

        const drawDot = (x, y) => {
          for (let dy = 0; dy < width; dy++) {
            for (let dx = 0; dx < width; dx++) {
              const px = x + dx - offset;
              const py = y + dy - offset;

              // bounds del sub-rect (no del canvas completo)
              if (px < regionX || px > regionEndX || py < regionY || py > regionEndY) continue;

              const index = ((py - regionY) * regionW + (px - regionX)) * 4;
              data[index] = color.r;
              data[index + 1] = color.g;
              data[index + 2] = color.b;
              data[index + 3] = color.a * 255;
            }
          }
        };

        if (!last) {
          drawDot(x1, y1);
        } else {
          // Bresenham's line
          let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
          let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
          let x = x0, y = y0;

          while (true) {
            drawDot(x, y);
            if (x === x1 && y === y1) break;
            let e2 = 2 * err;
            if (e2 >= dy) { err += dy; x += sx; }
            if (e2 <= dx) { err += dx; y += sy; }
          }
        }

        ctx.putImageData(imageData, regionX, regionY);
      });
    }



  if (tool === TOOLS.paint && !isShiftPressed && !toolParameters.perfectCurves) {
   
 
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
    const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
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

    // APLICAR SUAVIZADO AL PUNTO ACTUAL
    let finalCanvasCoords = canvasCoords;
    
    // Mantener historial de trayectoria para suavizado
    if (!lastPixelRef.current) {
      // Resetear historial al iniciar nuevo trazo
      ctx.pathHistory = [];
    }
    
   

    // Si se usa brocha personalizada, usar la lógica personalizada
    if (useCustomBrush && customBrushData.length > 0) {
      const originalComposite = ctx.globalCompositeOperation;

      if (paintMode === "composite") {
        ctx.globalCompositeOperation = "source-over";
      } else {
        // MODO MANUAL CON BROCHA PERSONALIZADA Y CACHE
       
        if (!lastPixelRef.current) {
          // Primera vez en este trazo - obtener ImageData
          initializeImageDataCacheOptimized(ctx)
        }
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
        const gridPos = getGridPosition(finalCanvasCoords.x, finalCanvasCoords.y, true);
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
        let x1 = finalCanvasCoords.x, y1 = finalCanvasCoords.y;
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
        flushCachedImageDataToCanvas(ctx);
      }

      return; // Salir temprano si se usó brocha personalizada
    }

    // Lógica para brochas estándar con pattern alignment
    if (paintMode === "composite") {
      // MODO COMPOSITE OPTIMIZADO (LÓGICA ORIGINAL COMPLETA)
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
          finalCanvasCoords.x,
          finalCanvasCoords.y,
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
        let x1 = finalCanvasCoords.x,
          y1 = finalCanvasCoords.y;
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
      if (!lastPixelRef.current ) {
       // Primera vez en este trazo - obtener ImageData
       initializeImageDataCacheOptimized(ctx)
     }
      const data = cachedImageDataRef.current.data;
      const canvasWidth = canvas.width;

      // Dirty-rect: bbox del segmento + puntos reflejados + padding. Se acumula
      // en cachedImageDataDirtyRectRef entre pointer moves; el flush al final
      // solo sube esa región a GPU en vez de los ~67MB del canvas completo.
      {
        const last = lastPixelRef.current
          ? viewportToCanvasCoords(lastPixelRef.current.x, lastPixelRef.current.y)
          : null;
        const px1 = finalCanvasCoords.x, py1 = finalCanvasCoords.y;
        const px0 = last ? last.x : px1;
        const py0 = last ? last.y : py1;
        const pad = Math.ceil(maxRadius) + 1;
        const pts = [[px0, py0], [px1, py1]];
        if (mirrorState.vertical) {
          pts.push([px0, reflectVertical(py0)], [px1, reflectVertical(py1)]);
        }
        if (mirrorState.horizontal) {
          pts.push([reflectHorizontal(px0), py0], [reflectHorizontal(px1), py1]);
        }
        if (mirrorState.vertical && mirrorState.horizontal) {
          pts.push(
            [reflectHorizontal(px0), reflectVertical(py0)],
            [reflectHorizontal(px1), reflectVertical(py1)]
          );
        }
        let dMinX = Infinity, dMinY = Infinity, dMaxX = -Infinity, dMaxY = -Infinity;
        for (const [px, py] of pts) {
          if (px - pad < dMinX) dMinX = px - pad;
          if (py - pad < dMinY) dMinY = py - pad;
          if (px + pad > dMaxX) dMaxX = px + pad;
          if (py + pad > dMaxY) dMaxY = py + pad;
        }
        const dx = Math.max(0, Math.floor(dMinX));
        const dy = Math.max(0, Math.floor(dMinY));
        const dEndX = Math.min(canvas.width - 1, Math.ceil(dMaxX));
        const dEndY = Math.min(canvas.height - 1, Math.ceil(dMaxY));
        if (dEndX >= dx && dEndY >= dy) {
          markCachedImageDataDirty(dx, dy, dEndX - dx + 1, dEndY - dy + 1);
        }
      }

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
          finalCanvasCoords.x,
          finalCanvasCoords.y,
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
        let x1 = finalCanvasCoords.x,
          y1 = finalCanvasCoords.y;
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
      flushCachedImageDataToCanvas(ctx);
    }
  }));

}




// En el useEffect principal, modificar la lógica de pencilPerfect:


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
          // MODO MANUAL ULTRA-OPTIMIZADO Y CORREGIDO (dirty rect)
          // Antes leía todo el canvas en cada pointer move con getImageData(0, 0, w, h),
          // lo que escalaba O(w*h) con el tamaño total del proyecto. Ahora calculamos
          // el bbox del segmento + puntos reflejados por mirror, con padding del pincel,
          // y solo leemos/escribimos esa sub-región.
          const x1 = canvasCoords.x, y1 = canvasCoords.y;
          const last = lastPixelRef.current
            ? viewportToCanvasCoords(lastPixelRef.current.x, lastPixelRef.current.y)
            : null;
          const x0 = last ? last.x : x1;
          const y0 = last ? last.y : y1;

          const bboxPoints = [[x0, y0], [x1, y1]];
          if (mirrorState.vertical) {
            bboxPoints.push([x0, reflectVertical(y0)], [x1, reflectVertical(y1)]);
          }
          if (mirrorState.horizontal) {
            bboxPoints.push([reflectHorizontal(x0), y0], [reflectHorizontal(x1), y1]);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            bboxPoints.push(
              [reflectHorizontal(x0), reflectVertical(y0)],
              [reflectHorizontal(x1), reflectVertical(y1)]
            );
          }

          // padding = maxRadius (cubre blur) + 1 por seguridad en redondeos
          const padding = Math.ceil(maxRadius) + 1;
          let minPx = Infinity, minPy = Infinity, maxPx = -Infinity, maxPy = -Infinity;
          for (const [px, py] of bboxPoints) {
            if (px - padding < minPx) minPx = px - padding;
            if (py - padding < minPy) minPy = py - padding;
            if (px + padding > maxPx) maxPx = px + padding;
            if (py + padding > maxPy) maxPy = py + padding;
          }

          const regionX = Math.max(0, Math.floor(minPx));
          const regionY = Math.max(0, Math.floor(minPy));
          const regionEndX = Math.min(canvas.width - 1, Math.ceil(maxPx));
          const regionEndY = Math.min(canvas.height - 1, Math.ceil(maxPy));
          const regionW = regionEndX - regionX + 1;
          const regionH = regionEndY - regionY + 1;

          if (regionW > 0 && regionH > 0) {
            const imageData = ctx.getImageData(regionX, regionY, regionW, regionH);
            const data = imageData.data;

            // Precalcular valores para blur
            let coreRadius, blurEnabled;
            if (blur > 0) {
              coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
              blurEnabled = true;
            } else {
              blurEnabled = false;
            }

            const drawDot = (x, y) => {
              const startX = x - halfWidth;
              const startY = y - halfWidth;

              if (!blurEnabled) {
                // Clamp al sub-rect
                const endX = Math.min(startX + width, regionEndX + 1);
                const endY = Math.min(startY + width, regionEndY + 1);
                const actualStartX = Math.max(startX, regionX);
                const actualStartY = Math.max(startY, regionY);

                for (let py = actualStartY; py < endY; py++) {
                  const rowIndex = (py - regionY) * regionW * 4;
                  for (let px = actualStartX; px < endX; px++) {
                    const index = rowIndex + (px - regionX) * 4;
                    data[index] = selectedColor.r;
                    data[index + 1] = selectedColor.g;
                    data[index + 2] = selectedColor.b;
                    data[index + 3] = selectedColor.a * 255;
                  }
                }
              } else {
                const maxRadiusSquared = maxRadius * maxRadius;
                const coreRadiusSquared = coreRadius * coreRadius;
                const blurRange = maxRadius - coreRadius;

                for (let dy = 0; dy < width; dy++) {
                  for (let dx = 0; dx < width; dx++) {
                    const px = startX + dx;
                    const py = startY + dy;

                    if (px < regionX || px > regionEndX || py < regionY || py > regionEndY) continue;

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

                    const index = ((py - regionY) * regionW + (px - regionX)) * 4;
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

            if (!last) {
              drawWithMirrors(x1, y1);
            } else {
              // Bresenham optimizado
              let cx = x0, cy = y0;
              let dx = Math.abs(x1 - cx), dy = -Math.abs(y1 - cy);
              let sx = cx < x1 ? 1 : -1, sy = cy < y1 ? 1 : -1;
              let err = dx + dy;

              while (true) {
                drawWithMirrors(cx, cy);
                if (cx === x1 && cy === y1) break;

                const e2 = 2 * err;
                if (e2 >= dy) {
                  err += dy;
                  cx += sx;
                }
                if (e2 <= dx) {
                  err += dx;
                  cy += sy;
                }
              }
            }

            // Una sola llamada a putImageData al final, con offset del sub-rect
            ctx.putImageData(imageData, regionX, regionY);
          }
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
          // MODO MANUAL ULTRA-OPTIMIZADO Y CORREGIDO (dirty rect)
          // Antes leía todo el canvas en cada pointer move con getImageData(0, 0, w, h),
          // lo que escalaba O(w*h) con el tamaño total del proyecto. Ahora calculamos
          // el bbox del segmento + puntos reflejados por mirror, con padding del pincel,
          // y solo leemos/escribimos esa sub-región.
          const x1 = canvasCoords.x, y1 = canvasCoords.y;
          const last = lastPixelRef.current
            ? viewportToCanvasCoords(lastPixelRef.current.x, lastPixelRef.current.y)
            : null;
          const x0 = last ? last.x : x1;
          const y0 = last ? last.y : y1;

          const bboxPoints = [[x0, y0], [x1, y1]];
          if (mirrorState.vertical) {
            bboxPoints.push([x0, reflectVertical(y0)], [x1, reflectVertical(y1)]);
          }
          if (mirrorState.horizontal) {
            bboxPoints.push([reflectHorizontal(x0), y0], [reflectHorizontal(x1), y1]);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            bboxPoints.push(
              [reflectHorizontal(x0), reflectVertical(y0)],
              [reflectHorizontal(x1), reflectVertical(y1)]
            );
          }

          // padding = maxRadius (cubre blur) + 1 por seguridad en redondeos
          const padding = Math.ceil(maxRadius) + 1;
          let minPx = Infinity, minPy = Infinity, maxPx = -Infinity, maxPy = -Infinity;
          for (const [px, py] of bboxPoints) {
            if (px - padding < minPx) minPx = px - padding;
            if (py - padding < minPy) minPy = py - padding;
            if (px + padding > maxPx) maxPx = px + padding;
            if (py + padding > maxPy) maxPy = py + padding;
          }

          const regionX = Math.max(0, Math.floor(minPx));
          const regionY = Math.max(0, Math.floor(minPy));
          const regionEndX = Math.min(canvas.width - 1, Math.ceil(maxPx));
          const regionEndY = Math.min(canvas.height - 1, Math.ceil(maxPy));
          const regionW = regionEndX - regionX + 1;
          const regionH = regionEndY - regionY + 1;

          if (regionW > 0 && regionH > 0) {
            const imageData = ctx.getImageData(regionX, regionY, regionW, regionH);
            const data = imageData.data;

            // Precalcular valores para blur
            let coreRadius, blurEnabled;
            if (blur > 0) {
              coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
              blurEnabled = true;
            } else {
              blurEnabled = false;
            }

            const drawDot = (x, y) => {
              const startX = x - halfWidth;
              const startY = y - halfWidth;

              if (!blurEnabled) {
                // Clamp al sub-rect
                const endX = Math.min(startX + width, regionEndX + 1);
                const endY = Math.min(startY + width, regionEndY + 1);
                const actualStartX = Math.max(startX, regionX);
                const actualStartY = Math.max(startY, regionY);

                for (let py = actualStartY; py < endY; py++) {
                  const rowIndex = (py - regionY) * regionW * 4;
                  for (let px = actualStartX; px < endX; px++) {
                    const index = rowIndex + (px - regionX) * 4;
                    data[index] = selectedColor.r;
                    data[index + 1] = selectedColor.g;
                    data[index + 2] = selectedColor.b;
                    data[index + 3] = selectedColor.a * 255;
                  }
                }
              } else {
                const maxRadiusSquared = maxRadius * maxRadius;
                const coreRadiusSquared = coreRadius * coreRadius;
                const blurRange = maxRadius - coreRadius;

                for (let dy = 0; dy < width; dy++) {
                  for (let dx = 0; dx < width; dx++) {
                    const px = startX + dx;
                    const py = startY + dy;

                    if (px < regionX || px > regionEndX || py < regionY || py > regionEndY) continue;

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

                    const index = ((py - regionY) * regionW + (px - regionX)) * 4;
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

            if (!last) {
              drawWithMirrors(x1, y1);
            } else {
              // Bresenham optimizado
              let cx = x0, cy = y0;
              let dx = Math.abs(x1 - cx), dy = -Math.abs(y1 - cy);
              let sx = cx < x1 ? 1 : -1, sy = cy < y1 ? 1 : -1;
              let err = dx + dy;

              while (true) {
                drawWithMirrors(cx, cy);
                if (cx === x1 && cy === y1) break;

                const e2 = 2 * err;
                if (e2 >= dy) {
                  err += dy;
                  cx += sx;
                }
                if (e2 <= dx) {
                  err += dx;
                  cy += sy;
                }
              }
            }

            // Una sola llamada a putImageData al final, con offset del sub-rect
            ctx.putImageData(imageData, regionX, regionY);
          }
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
    
        // Aplica gaussian blur separable (filters.js) en la región del pincel
        // y mezcla con el original según intensity. O(n·k) vs O(n·k²) del box loop.
        const applyBlurAt = (centerX, centerY) => {
          const halfWidth = Math.floor(width / 2);
          const regionX = Math.max(0, centerX - halfWidth);
          const regionY = Math.max(0, centerY - halfWidth);
          const regionWidth = Math.min(width, canvas.width - regionX);
          const regionHeight = Math.min(width, canvas.height - regionY);

          if (regionWidth <= 0 || regionHeight <= 0) return;

          const imageData = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);
          const src = imageData.data;
          const blurred = gaussianBlurRGBA(src, regionWidth, regionHeight, blurRadius);

          // Mezcla original ↔ blurred por intensity (píxel a píxel, sin allocs extra).
          const out = new Uint8ClampedArray(src.length);
          for (let i = 0; i < src.length; i++) {
            out[i] = src[i] + (blurred[i] - src[i]) * intensity;
          }

          ctx.putImageData(new ImageData(out, regionWidth, regionHeight), regionX, regionY);
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
    
        // Unsharp mask: original + k * (original - gaussianBlur(original)).
        // Usa gaussianBlurRGBA (separable) como paso de blur — O(n·k) en lugar del
        // triple bucle 3×3 manual. Alpha se copia tal cual (el sharpening solo
        // afecta RGB).
        const applyDeblurAt = (centerX, centerY) => {
          const halfWidth = Math.floor(width / 2);
          const regionX = Math.max(0, centerX - halfWidth);
          const regionY = Math.max(0, centerY - halfWidth);
          const regionWidth = Math.min(width, canvas.width - regionX);
          const regionHeight = Math.min(width, canvas.height - regionY);

          if (regionWidth <= 0 || regionHeight <= 0) return;

          const imageData = ctx.getImageData(regionX, regionY, regionWidth, regionHeight);
          const src = imageData.data;
          const blurred = gaussianBlurRGBA(src, regionWidth, regionHeight, 1);

          const out = new Uint8ClampedArray(src.length);
          const k = intensity * sharpening;
          for (let i = 0; i < src.length; i += 4) {
            out[i]     = Math.max(0, Math.min(255, src[i]     + k * (src[i]     - blurred[i])));
            out[i + 1] = Math.max(0, Math.min(255, src[i + 1] + k * (src[i + 1] - blurred[i + 1])));
            out[i + 2] = Math.max(0, Math.min(255, src[i + 2] + k * (src[i + 2] - blurred[i + 2])));
            out[i + 3] = src[i + 3];
          }

          ctx.putImageData(new ImageData(out, regionWidth, regionHeight), regionX, regionY);
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
        // GUARDAR estado original COMPLETO
        const originalState = {
          globalCompositeOperation: ctx.globalCompositeOperation,
          fillStyle: ctx.fillStyle,
          strokeStyle: ctx.strokeStyle,
          lineWidth: ctx.lineWidth,
          globalAlpha: ctx.globalAlpha,
          lineCap: ctx.lineCap,
          lineJoin: ctx.lineJoin,
          shadowColor: ctx.shadowColor,
          shadowBlur: ctx.shadowBlur,
          shadowOffsetX: ctx.shadowOffsetX,
          shadowOffsetY: ctx.shadowOffsetY
        };
        
        try {
          // Aplicar configuraciones de goma
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
        } finally {
          // RESTAURAR estado original SIEMPRE (incluso si hay error)
          Object.assign(ctx, originalState);
   
          // FORZAR limpieza adicional
          ctx.save();
          ctx.restore();
        }
      }));
    }
  
    lastPixelRef.current = viewportPixelCoords;
    return () => {
      // Limpiar referencias cuando cambie la herramienta
      if (tool !== TOOLS.curve) {
        setCurveState("idle");
        setIsSettingControl(false);
        curveStartRef.current = null;
        curveEndRef.current = null;
        curveControlRef.current = null;
        curveButton.current = null;
      }
      
      // Limpiar referencias de otras herramientas
      if (tool !== TOOLS.line) {
        lineStartRef.current = null;
        lineButton.current = null;
      }
      
      // Si no es una herramienta de pintura, limpiar cache
      if (![TOOLS.paint, TOOLS.dark, TOOLS.light].includes(tool)) {
        cachedImageDataRef.current = null;
        initialPatternOffset.current = null;
      }
    };
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
    getPixelColorAt,
    applyEyeDropperColor
  
  ]);



  // Efecto para manejar navegación con teclado
  // Reemplaza el useEffect existente para manejar navegación con teclado
useEffect(() => {
  const isTyping = () => {
    const tag = document.activeElement.tagName;
    const isContentEditable = document.activeElement.isContentEditable;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      isContentEditable
    );
  };

  const handleKeyDown = (e) => {
    if (activeAI || isTyping()) return;

    console.log("se presionó una tecla");

    if (e.code === "Space" && !isSpacePressed) {
      e.preventDefault();
      setIsSpacePressed(true);
      // Cambiar cursor temporalmente
      return;
    }

    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      if (!isShiftPressed) {
        e.preventDefault(); // Opcional
        setIsShiftPressed(true);
      }
      return;
    }

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
    if (activeAI || isTyping()) return;

    if (e.code === "Space") {
      setIsSpacePressed(false);
    }

    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      setIsShiftPressed(false);
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}, [moveViewport, isSpacePressed, drawMode, activeAI]);

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
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.floor(screenX + zoom) - Math.floor(screenX), Math.floor(screenY + zoom) - Math.floor(screenY));
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
              const last = points[points.length - 1];
              if (!last || last.x !== x || last.y !== y) points.push({ x, y });
            }

            const adjustedPoints = pixelPerfect(points);
            const offset = (width / 2) | 0;
            const drawnPixels = new Set();

            const stampPreview = (x, y) => {
              for (let dy = 0; dy < width; dy++) {
                for (let dx = 0; dx < width; dx++) {
                  const px = x + dx - offset;
                  const py = y + dy - offset;
                  const key = (px << 16) ^ py;
                  if (drawnPixels.has(key)) continue;
                  drawnPixels.add(key);
                  const screenX = (px - viewportOffset.x) * zoom;
                  const screenY = (py - viewportOffset.y) * zoom;
                  if (screenX < 0 || screenY < 0) continue;
                  ctx.fillRect(
                    Math.floor(screenX),
                    Math.floor(screenY),
                    zoom,
                    zoom
                  );
                }
              }
            };

            for (let i = 0; i < adjustedPoints.length - 1; i++) {
              const cur = adjustedPoints[i];
              const next = adjustedPoints[i + 1];
              rasterLine(cur.x, cur.y, next.x, next.y, stampPreview);
            }

            stampPreview(start.x | 0, start.y | 0);
            stampPreview(end.x | 0, end.y | 0);
          };

          const drawPointPreview = (point, fillStyle) => {
            const screenX = (point.x - viewportOffset.x) * zoom;
            const screenY = (point.y - viewportOffset.y) * zoom;
            ctx.fillStyle = fillStyle;
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.floor(screenX + zoom) - Math.floor(screenX), Math.floor(screenY + zoom) - Math.floor(screenY));
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
      } else if ((tool === TOOLS.paint) && !isShiftPressed && toolParameters.perfectCurves) {

        // Determinar el color basado en el botón presionado
        const selectedColor =
          isPressed === "left"
            ? toolParameters.foregroundColor
            : isPressed === "right"
            ? toolParameters.backgroundColor
            : toolParameters.foregroundColor; // fallback a foreground
      
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${0.5})`;
       
        // Configuración básica
        const width = toolParameters?.width || 1;
        const blur = toolParameters.blur || 0;
        const offset = Math.floor(width / 2);
      
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
        const imparAdjustmentHeight = drawableHeight % 2 !== 0 ? 1 : 0;
        const imparAdjustmentWidth = drawableWidth % 2 !== 0 ? 1 : 0;
      
        const reflectHorizontal = (x) =>
          centerX * 2 - x + adjustment + imparAdjustmentWidth;
        const reflectVertical = (y) =>
          centerY * 2 - y + adjustment + imparAdjustmentHeight;
      
        // Función para dibujar preview con espejos
        const drawPreviewDot = (canvasX, canvasY) => {
          const x = canvasX - offset;
          const y = canvasY - offset;
          const screenX = (x - viewportOffset.x) * zoom;
          const screenY = (y - viewportOffset.y) * zoom;
      
          if (blur === 0) {
            // Sin blur: rectángulo simple
            ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.round(width * zoom), Math.round(width * zoom));
          } else {
            // Con blur: círculo con gradiente
            const maxRadius = (width / 2) * zoom;
            const coreRadius = Math.max(0.5, (1 - blur) * maxRadius);
            
            const gradient = ctx.createRadialGradient(
              screenX + (width * zoom) / 2,
              screenY + (width * zoom) / 2,
              0,
              screenX + (width * zoom) / 2,
              screenY + (width * zoom) / 2,
              maxRadius
            );
      
            const coreStop = coreRadius / maxRadius;
            const coreColor = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, 0.7)`;
            const edgeColor = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, 0.1)`;
      
            gradient.addColorStop(0, coreColor);
            gradient.addColorStop(coreStop, coreColor);
            gradient.addColorStop(1, edgeColor);
      
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(
              screenX + (width * zoom) / 2,
              screenY + (width * zoom) / 2,
              maxRadius,
              0,
              2 * Math.PI
            );
            ctx.fill();
            
            // Restaurar color para próximos dibujos
            ctx.fillStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, 0.7)`;
          }
        };
      
        const drawPreviewWithMirrors = (x, y) => {
          drawPreviewDot(x, y);
      
          if (mirrorState.vertical) {
            drawPreviewDot(x, reflectVertical(y));
          }
          if (mirrorState.horizontal) {
            drawPreviewDot(reflectHorizontal(x), y);
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            drawPreviewDot(reflectHorizontal(x), reflectVertical(y));
          }
        };
      
        // Si está presionado, mostrar todo el trazo con el MISMO filtro que
        // aplica el commit final (pixelPerfectPath: Bresenham + drop de
        // L-corners). Antes la previa rasterizaba sin filtrar, así que al
        // soltar el mouse el trazo "saltaba" a otro shape. Ahora coincide.
        if (isPressed && path.length > 0) {
          const canvasPath = path.map((point) => {
            const viewportPixelCoords = getPixelCoordinates(point);
            return viewportToCanvasCoords(viewportPixelCoords.x, viewportPixelCoords.y);
          });

          const filtered = pixelPerfectPath(canvasPath);
          for (let i = 0; i < filtered.length; i++) {
            drawPreviewWithMirrors(filtered[i].x, filtered[i].y);
          }
        }
        // Si no está presionado, solo mostrar el cursor
        else if (!isPressed) {
          drawPreviewWithMirrors(canvasCoords.x, canvasCoords.y);
        }
      } 
      
      else if (tool === TOOLS.eyeDropper) {
        // Preview simple para gotero
        ctx.save();
        
        const screenX = (canvasCoords.x - viewportOffset.x) * zoom;
        const screenY = (canvasCoords.y - viewportOffset.y) * zoom;
        const size = 12; // Tamaño fijo para el preview
        
        // Círculo con cruz para indicar área de muestreo
        ctx.strokeStyle = isPressed ? "rgba(255, 100, 0, 0.9)" : "rgba(0, 0, 0, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Cruz central
        ctx.beginPath();
        ctx.moveTo(screenX - 6, screenY);
        ctx.lineTo(screenX + 6, screenY);
        ctx.moveTo(screenX, screenY - 6);
        ctx.lineTo(screenX, screenY + 6);
        ctx.stroke();
        
        // Mostrar color capturado si existe
        if (eyeDropperColor && eyeDropperColor !== '#ffffff') {
          let colorObj = typeof eyeDropperColor === 'string' 
            ? hexToRgb(eyeDropperColor) 
            : eyeDropperColor;
            
          ctx.fillStyle = `rgba(${colorObj.r}, ${colorObj.g}, ${colorObj.b}, ${colorObj.a || 1})`;
          ctx.fillRect(screenX + 15, screenY - 4, 8, 8);
          ctx.strokeRect(screenX + 15, screenY - 4, 8, 8);
        }
        
        ctx.restore();
      }
      else if (tool === TOOLS.erase) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      } else if ((tool === TOOLS.line || (isShiftPressed && tool=== TOOLS.paint)) && isPressed && lineStartRef.current) {
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
        ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.round(width * zoom), Math.round(width * zoom));
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

        const mirrorPolygonPoints = (pts, horizontal, vertical) => {
          return pts.map((point) => ({
            x: horizontal ? reflectHorizontal(point.x) : point.x,
            y: vertical ? reflectVertical(point.y) : point.y,
          }));
        };

        const mirrorCurvePoints = (curves, horizontal, vertical) => {
          const mirrored = new Map();
          curves.forEach((point, key) => {
            mirrored.set(key, {
              x: horizontal ? reflectHorizontal(point.x) : point.x,
              y: vertical ? reflectVertical(point.y) : point.y,
            });
          });
          return mirrored;
        };

        const renderPreview = (pts, curves) => {
          drawPolygonPencilPreview(
            ctx,
            pts,
            curves,
            canvasCoords,
            toolParameters.width,
            toolParameters.borderColor,
            toolParameters.fillColor,
            isSettingCurve,
            currentCurveIndex
          );
        };

        renderPreview(polygonPoints, polygonCurvePoints);

        if (mirrorState.vertical || mirrorState.horizontal) {
          if (mirrorState.vertical) {
            renderPreview(
              mirrorPolygonPoints(polygonPoints, false, true),
              mirrorCurvePoints(polygonCurvePoints, false, true)
            );
          }
          if (mirrorState.horizontal) {
            renderPreview(
              mirrorPolygonPoints(polygonPoints, true, false),
              mirrorCurvePoints(polygonCurvePoints, true, false)
            );
          }
          if (mirrorState.vertical && mirrorState.horizontal) {
            renderPreview(
              mirrorPolygonPoints(polygonPoints, true, true),
              mirrorCurvePoints(polygonCurvePoints, true, true)
            );
          }
        }

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
        ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.round(width * zoom), Math.round(width * zoom));
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
            toolParameters.fillColor
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
  const [originalSelectedPixels, setOriginalSelectedPixels] = useState([]); // Píxeles originales sin rotar
const [originalSelectionBounds, setOriginalSelectionBounds] = useState(null); // Bounds originales
const [cumulativeRotationAngle, setCumulativeRotationAngle] = useState(0); // Ángulo total acumulado

  const [originalPixelColors, setOriginalPixelColors] = useState([]); // Nuevo estado para guardar colores originales
  const [finalizedSelection, setFinalizedSelection] = useState(false);
  const [selectionDragging, setSelectionDragging] = useState(false);
  const [selectionDragStart, setSelectionDragStart] = useState({ x: 0, y: 0 });
  const [selectionOffset, setSelectionOffset] = useState({ x: 0, y: 0 });
  const [selectionActive, setSelectionActive] = useState(false);
  const selectionCanvasRef = useRef(null);
  const [selectionCoords, setSelectionCoords] = useState([]);
  const [croppedSelectionBounds, setCroppedSelectionBounds] = useState(null);
  // Refs para evitar remapear toda la ruta del puntero en cada frame durante el arrastre de selección.
  const selectionStartRef = useRef(null);
  const lastSelectionEndRef = useRef(null);
  // Add a new state for lasso selection points
  const [lassoPoints, setLassoPoints] = useState([]);

  /// Funciones de utilidad para mi LASSO: ////===================
  // Helpers de geometría delegados a ./container/utils/geometry.js.
  const isPointInPolygon = useCallback(
    (x, y, polygon) => isPointInPolygonUtil(x, y, polygon),
    []
  );

  const calculateLassoBounds = useCallback(() => {
    const bounds = calculateLassoBoundsFromPoints(lassoPoints);
    if (bounds) setCroppedSelectionBounds(bounds);
  }, [lassoPoints]);

  const findNonEmptyBounds = useCallback(
    (imageData, width, height) =>
      findNonEmptyBoundsUtil(imageData, width, height),
    []
  );

  // Función para limpiar la selección actual
  const clearCurrentSelection = useCallback(() => {
    setRotationAngleSelection(0);
    setCumulativeRotationAngle(0);
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

    invalidateImageDataCacheOptimized();
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
    invalidateImageDataCacheOptimized,
  ]);



  // Auto-crop de la selección
  const autoCropSelection = useCallback(async (shouldAutoCrop = true) => {
    if (!activeLayerId || !selectionCoords || selectionCoords.length < 2)
      return;
    console.log("autoCropSelection - selectionCoords:", selectionCoords);
    console.log("autoCropSelection - shouldAutoCrop:", shouldAutoCrop);
  
    // CAMBIO PRINCIPAL: Solo usar el primer y último punto para el rectángulo final
    const startPoint = selectionCoords[0];
    const endPoint = selectionCoords[selectionCoords.length - 1];
  
    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);
  
    const x = minX;
    const y = minY;
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const totalPixels = width * height;
  
    console.log(
      `Calculated bounds from start/end points: x=${x}, y=${y}, width=${width}, height=${height}, totalPixels=${totalPixels}`
    );
  
    // Si shouldAutoCrop es false, usar directamente los bounds originales
    if (!shouldAutoCrop) {
      console.log("Auto-crop disabled, using original selection bounds");
      const croppedBounds = {
        x: minX,
        y: minY,
        width: width,
        height: height,
      };
      setCroppedSelectionBounds(croppedBounds);
      setSelectionCoords([]);
      
      // Verificar si algún pixel del área seleccionada pertenece a un grupo
      let groupFound = false;
      let groupData = null;

      for (let py = croppedBounds.y; py < croppedBounds.y + croppedBounds.height; py++) {
        for (let px = croppedBounds.x; px < croppedBounds.x + croppedBounds.width; px++) {
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
        console.log(`Pixel con grupo encontrado: ${JSON.stringify(groupData, null, 2)}`);
      } else {
        console.log("Ningún pixel dentro del área seleccionada pertenece a un grupo");
      }
      
      return;
    }

    // Resto del código permanece igual para cuando shouldAutoCrop es true...
    if (totalPixels > 1000000) {
      console.log("Área muy grande, usando estrategia optimizada");
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
    (coords, maxWidth = totalWidth, maxHeight = totalHeight) =>
      clampCoordinatesUtil(coords, maxWidth, maxHeight),
    [totalWidth, totalHeight]
  );

  // Lógica para nueva selección (rectángulo).
  // Optimización: los consumidores de `selectionCoords` sólo leen el primer y el último punto,
  // así que evitamos mapear toda la ruta acumulada del puntero y sólo actualizamos el estado
  // cuando el píxel final cambia. Esto quita el trabajo O(n) por frame y los re-renders
  // innecesarios durante el arrastre.
  useEffect(() => {
    if (isSpacePressed) return;
    if (tool !== TOOLS.select || !isPressed) return;
    if (isDraggingSelection) return;
    if (selectionActive) return;
    if (path.length === 0) return;

    // Primer frame del press: fijar punto de inicio y limpiar bounds anteriores una sola vez.
    if (path.length === 1 || !selectionStartRef.current) {
      const first = path[0];
      const firstPixel = getPixelCoordinates(first);
      const firstCanvas = clampCoordinates(
        viewportToCanvasCoords(firstPixel.x, firstPixel.y)
      );
      selectionStartRef.current = firstCanvas;
      lastSelectionEndRef.current = null;
      setCroppedSelectionBounds(null);
    }

    // Punto final actual en coordenadas de canvas (snap a píxel).
    const last = path[path.length - 1];
    const lastPixel = getPixelCoordinates(last);
    const endCanvas = clampCoordinates(
      viewportToCanvasCoords(lastPixel.x, lastPixel.y)
    );

    const prevEnd = lastSelectionEndRef.current;
    if (prevEnd && prevEnd.x === endCanvas.x && prevEnd.y === endCanvas.y) {
      // Mismo píxel: no hay cambios visuales, saltar update.
      return;
    }
    lastSelectionEndRef.current = endCanvas;

    setSelectionCoords([selectionStartRef.current, endCanvas]);
  }, [
    isSpacePressed,
    isPressed,
    path,
    tool,
    isDraggingSelection,
    selectionActive,
    clampCoordinates,
  ]);

  // Reset de refs cuando se suelta el puntero, para el próximo arrastre.
  useEffect(() => {
    if (!isPressed) {
      selectionStartRef.current = null;
      lastSelectionEndRef.current = null;
    }
  }, [isPressed]);

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
      ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.floor(screenX + zoom) - Math.floor(screenX), Math.floor(screenY + zoom) - Math.floor(screenY));
    },
    [zoom, viewportOffset]
  ); // Añadir viewportOffset como dependencia

  // Calcular píxeles dentro del área de selección.
  // Optimización: UNA sola lectura de la capa con `getLayerData(x, y, w, h)` en lugar de
  // N·M promesas de 1×1. La versión anterior disparaba una promesa (y un getImageData)
  // por píxel — en un bounds de 200×200 eso eran 40.000 lecturas async y causaba el retraso
  // de ~2s antes de que apareciera el contenido seleccionado.
  useEffect(() => {
    if (!croppedSelectionBounds || isPressed || selectedPixels.length > 0) return;
    if (!activeLayerId) return;

    const { x, y, width, height } = croppedSelectionBounds;
    if (width <= 0 || height <= 0) return;

    let cancelled = false;

    (async () => {
      let imageData;
      try {
        imageData = await getLayerData(activeLayerId, x, y, width, height);
      } catch (err) {
        console.error("Error leyendo la capa para la selección:", err);
        if (!cancelled) {
          setCroppedSelectionBounds(null);
          setSelectionActive(false);
        }
        return;
      }

      if (cancelled) return;
      if (!imageData || !imageData.data) {
        setCroppedSelectionBounds(null);
        setSelectionActive(false);
        return;
      }

      const data = imageData.data;
      const useLasso = tool === TOOLS.lassoSelect;

      const selectionPixels = [];
      const originalColors = [];

      for (let row = 0; row < height; row++) {
        const py = y + row;
        const rowBase = row * width * 4;
        for (let col = 0; col < width; col++) {
          const px = x + col;
          if (useLasso && !isPointInPolygon(px, py, lassoPoints)) continue;

          const idx = rowBase + col * 4;
          const aRaw = data[idx + 3];
          if (aRaw === 0) continue; // píxel transparente → fuera de la selección

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = aRaw / 255;

          selectionPixels.push({ x: px, y: py, color: { r, g, b, a } });
          originalColors.push({ r, g, b, a });
        }
      }

      if (cancelled) return;

      if (selectionPixels.length === 0) {
        console.log("No se encontraron píxeles visibles en la selección");
        setCroppedSelectionBounds(null);
        setSelectionActive(false);
        return;
      }

      const originalPixelsCopy = selectionPixels.map((p) => ({
        x: p.x,
        y: p.y,
        color: { r: p.color.r, g: p.color.g, b: p.color.b, a: p.color.a },
      }));
      const originalBoundsCopy = { x, y, width, height };

      setOriginalSelectedPixels(originalPixelsCopy);
      setOriginalSelectionBounds(originalBoundsCopy);
      setCumulativeRotationAngle(0);
      setOriginalPixelColors(originalColors);
      setSelectedPixels(selectionPixels);
      setFinalizedSelection(true);

      console.log(`Selección creada: ${selectionPixels.length} píxeles`);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    croppedSelectionBounds,
    isPressed,
    selectedPixels.length,
    tool,
    lassoPoints,
    isPointInPolygon,
    getLayerData,
    activeLayerId,
    setOriginalPixelColors,
    setSelectedPixels,
    setFinalizedSelection,
    setCroppedSelectionBounds,
    setSelectionActive,
    setOriginalSelectedPixels,
    setOriginalSelectionBounds,
    setCumulativeRotationAngle,
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
      ctx.fillRect(Math.floor(screenX), Math.floor(screenY), Math.round(width * zoom), Math.round(height * zoom));
      ctx.strokeRect(Math.floor(screenX), Math.floor(screenY), Math.round(width * zoom), Math.round(height * zoom));
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

        // bloquear el dibujado del recuadro verde mientras se rota: 
        if(!isRotationHandlerContainerPressed){
          ctx.strokeStyle = isDraggingSelection
          ? "rgba(255, 150, 0, 0.8)"
          : "rgba(0, 200, 100, 0.8)";
        ctx.fillStyle = isDraggingSelection
          ? "rgba(255, 150, 0, 0.2)"
          : "rgba(0, 200, 100, 0.2)";
        ctx.lineWidth = 2;
        ctx.fillRect(screenX, screenY, Math.round(width * zoom), Math.round(height * zoom));
        ctx.strokeRect(screenX, screenY, Math.round(width * zoom), Math.round(height * zoom));

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
       
      }

      // Pintar píxeles seleccionados via OffscreenCanvas 1:1 → drawImage escalado,
      // igual que compositeRender, para evitar líneas de malla a zooms fraccionarios.
      const offscreen = new OffscreenCanvas(viewportWidth, viewportHeight);
      const offCtx = offscreen.getContext("2d");

      selectedPixels.forEach((pixel) => {
        const px = pixel.x + dragOffset.x - viewportOffset.x;
        const py = pixel.y + dragOffset.y - viewportOffset.y;
        if (px < 0 || py < 0 || px >= viewportWidth || py >= viewportHeight) return;
        const { r, g, b, a } = pixel.color;
        offCtx.fillStyle = `rgba(${r},${g},${b},${a})`;
        offCtx.fillRect(px, py, 1, 1);
      });

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        offscreen,
        0, 0, viewportWidth, viewportHeight,
        0, 0,
        Math.round(viewportWidth * zoom),
        Math.round(viewportHeight * zoom)
      );
    }
  }, [
    selectedPixels,
    dragOffset,
    croppedSelectionBounds,
    isPressed,
    selectionActive,
    isDraggingSelection,
    viewportOffset,
    viewportWidth,
    viewportHeight,
    zoom,
    tool,
    clearCurrentSelection,
    selectionCoords,
    lassoPoints,
    isRotationHandlerContainerPressed
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



// Funciones especificas de seleccion ==============================//

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
    setRotationAngleSelection(0);
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

    invalidateImageDataCacheOptimized();
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
    [dragOffset]
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

// Funciones especificas de seleccion ==============================//


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
  
        // 3. Calcular bounds reales de los píxeles encontrados
        const xCoords = pixelsByColor.map((p) => p.x);
        const yCoords = pixelsByColor.map((p) => p.y);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
  
        const bounds = {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        };
  
        // 4. Establecer píxeles seleccionados
        setSelectedPixels(pixelsByColor);
  
        // 5. Guardar colores originales
        const originalColors = pixelsByColor.map((pixel) => pixel.color);
        setOriginalPixelColors(originalColors);
  
        // *** AGREGADO: Estados originales para RotSprite ***
        // Crear copias profundas de los píxeles originales
        const originalPixelsCopy = pixelsByColor.map((pixel) => ({
          x: pixel.x,
          y: pixel.y,
          color: {
            r: pixel.color.r,
            g: pixel.color.g,
            b: pixel.color.b,
            a: pixel.color.a
          }
        }));
  
        // Crear copia profunda de los bounds originales
        const originalBoundsCopy = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        };
  
        // Guardar estados originales para RotSprite
        setOriginalSelectedPixels(originalPixelsCopy);
        setOriginalSelectionBounds(originalBoundsCopy);
        
        // Resetear ángulo de rotación acumulado
        setCumulativeRotationAngle(0);
        setRotationAngleSelection(0);
        // *** FIN AGREGADO ***
  
        // 6. Establecer bounds del área seleccionada
        setCroppedSelectionBounds(bounds);
  
        // 7. Activar la selección
        setSelectionActive(true);
        setFinalizedSelection(true);
  
        // 8. Resetear offset de arrastre
        setDragOffset({ x: 0, y: 0 });
  
        // 9. Limpiar coordenadas de selección
        setSelectionCoords([]);
  
        console.log(`Seleccionados ${pixelsByColor.length} píxeles por color`);
        console.log('Estado original guardado para RotSprite');
        
      } catch (error) {
        console.error("Error al seleccionar por color:", error);
        // Limpiar estados en caso de error
        setSelectionActive(false);
        setCroppedSelectionBounds(null);
        setSelectedPixels([]);
        setOriginalPixelColors([]);
        setSelectionCoords([]);
        setOriginalSelectedPixels([]); // Limpiar también estados de RotSprite
        setOriginalSelectionBounds(null);
        setCumulativeRotationAngle(0);
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
      // Nuevas dependencias para RotSprite
      setOriginalSelectedPixels,
      setOriginalSelectionBounds,
      setCumulativeRotationAngle,
      setRotationAngleSelection
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

  // handlePlayTag declarado ANTES que MemoizedLayerAnimation y
  // MemoizedFramesTimeline porque esos useMemo lo capturan en sus factory.
  // useMemo evalua la factory sincronamente durante render — un const
  // declarado abajo lanza TDZ ReferenceError. Mismo patron que handleProjectLoaded
  // (linea ~630).
  //
  // `onPlayTag` del panel de tags: configura rango + modo del reproductor
  // y arranca la reproducción usando el API imperativo expuesto por PlayAnimation.
  // Mapeo de direcciones de tag → playbackMode soportado. `pingpong-reverse`
  // no existe en el reproductor (es `pingpong` con primer paso inverso); por
  // ahora se degrada a `pingpong`.
  // Reproduce un tag en el reproductor objetivo:
  //   target = 'main' → motor de LayerAnimation (animation-bar)
  //   target = 'mini' → motor de PlayAnimation (RightPanel)
  // Por defecto 'mini' para no romper call-sites previos.
  //
  // Convierte tag.from/to (1-based) a indices 0-based porque la API del
  // reproductor (setFrame, setFrameRangeSafe) trabaja con indices.
  // Activa loopEnabled y publica loopInfo para que ambos chips muestren
  // contexto (nombre de tag + rango) y exista un punto de "salir del bucle".
  const handlePlayTag = useCallback((tag, target = 'mini') => {
    const ref = target === 'main' ? mainPlayerApiRef : playAnimationRef;
    const api = ref.current;
    if (!api || !tag) return;
    const mode = tag.direction === 'reverse' ? 'reverse'
               : tag.direction === 'pingpong' || tag.direction === 'pingpong-reverse' ? 'pingpong'
               : 'forward';
    const startIdx = tag.from - 1;
    const endIdx   = tag.to   - 1;
    setLoopEnabled(true);
    setLoopInfo({
      from: tag.from, to: tag.to,
      target,
      tagId: tag.id, tagName: tag.name, tagColor: tag.color,
    });
    api.setFrameRange?.({ start: startIdx, end: endIdx });
    api.setPlaybackMode?.(mode);
    api.setFrame?.(mode === 'reverse' ? endIdx : startIdx);
    api.play?.();
  }, [setLoopEnabled]);

  // Reproduce un rango ad-hoc (sin tag) en el reproductor objetivo. Mismo
  // contrato que handlePlayTag: from/to son frame numbers 1-based.
  const handlePlayRange = useCallback((from, to, target = 'mini') => {
    const ref = target === 'main' ? mainPlayerApiRef : playAnimationRef;
    const api = ref.current;
    if (!api) return;
    const startIdx = from - 1;
    const endIdx   = to   - 1;
    setLoopEnabled(true);
    setLoopInfo({ from, to, target });
    api.setFrameRange?.({ start: startIdx, end: endIdx });
    api.setPlaybackMode?.('forward');
    api.setFrame?.(startIdx);
    api.play?.();
  }, [setLoopEnabled]);

  // Salir del bucle activo en un reproductor concreto. Cada chip (uno en
  // LayerAnimation, otro en PlayAnimation) llama con su propio target:
  //   - main → reset al main player + clear loopInfo si es de main
  //   - mini → reset al mini player + clear loopInfo si es de mini
  // El "clear loopInfo solo si coincide" evita que el chip del main borre
  // un loopInfo que pertenece al mini y viceversa.
  const handleClearLoop = useCallback((target = 'mini') => {
    const ref = target === 'main' ? mainPlayerApiRef : playAnimationRef;
    const api = ref.current;
    if (api) {
      api.pause?.();
      const lastIdx = (api.frameCount ?? 1) - 1;
      api.setFrameRange?.({ start: 0, end: Math.max(0, lastIdx) });
    }
    setLoopInfo(prev => (prev?.target === target ? null : prev));
  }, []);

  const MemoizedLayerAnimation = useMemo(
    () =>
      renderLayerAnimation({
        updateLayerZIndex,
        moveLayerToPosition,
        moveGroupToLayer,
        moveGroupToPosition,
        layers,
        addLayer,
        deleteLayer,
        moveLayerUp,
        moveLayerDown,
        toggleLayerVisibility,
        renameLayer,
        clearLayer,
        activeLayerId,
        setActiveLayerId,
        pixelGroups,
        selectedGroup,
        selectedPixels,
        createPixelGroup,
        deletePixelGroup,
        getLayerGroups,
        selectPixelGroup,
        clearSelectedGroup,
        renamePixelGroup,
        toggleGroupVisibility,
        setSelectedPixels,
        handleSelectGroup,
        dragOffset,
        setSelectionCoords,
        setSelectionActive,
        setCroppedSelectionBounds,
        autoCropSelection,
        setOriginalPixelColors,
        setDragOffset,
        setTool,
        clearCurrentSelection,
        getHierarchicalLayers,
        getMainLayers,
        getGroupLayersForParent,
        selectionActive,
        selectAllCanvas,
        duplicateLayer,
        frames,
        currentFrame,
        frameCount,
        createFrame,
        setActiveFrame,
        deleteFrame,
        duplicateFrame,
        saveCurrentFrameState,
        getFramesInfo,
        renameFrame,
        syncWithCurrentFrame,
        toggleLayerVisibilityInFrame,
        getLayerVisibility,
        toggleOnionSkin,
        setOnionSkinConfig,
        setOnionSkinFrameConfig,
        getOnionSkinFrameConfig,
        getOnionSkinPresets,
        applyOnionSkinPreset,
        getOnionSkinInfo,
        onionSkinEnabled,
        showOnionSkinForLayer,
        clearOnionSkinLayerFilter,
        onionSkinSettings,
        setFrameDuration,
        getFrameDuration,
        getFrameRate,
        setDefaultFrameRate,
        defaultFrameDuration,
        setFrameOpacity,
        getFrameOpacity,
        resolveLayerBlendMode,
        setLayerBlendMode,
        setFrameBlendModeOverride,
        framesResume,
        setFramesResume,
        externalCanvasRef: previewAnimationRef,
        viewportOffset,
        viewportWidth,
        viewportHeight,
        zoom,
        isPlaying,
        setIsPlaying,
        loopEnabled,
        setLoopEnabled,
        // onFrameChange: el motor en useAnimationPlayer llama a este callback
        // cada vez que avanza durante playback; el padre guarda frameNumber en
        // `animationTickFrame` y lo pasa a FramesTimeline para resaltar la
        // celda que se enciende.
        onFrameChange: handleAnimationFrameChange,
        eyeDropperColor,
        onionFramesConfig,
        setOnionFramesConfig,
        updateFrameConfig,
        addPreviousFrame,
        addNextFrame,
        removeFrame,
        toggleOnionFrames,
        applyOnionFramesPreset,
        clearTintCache,
        isCollapsed: isLayerAnimationCollapsed,
        onToggleCollapse: toggleLayerAnimationCollapse,
        animationTags,
        setAnimationTags,
        handlePlayTag,
        handlePlayRange,
        playerApiRef: playAnimationRef,
        mainPlayerApiRef,
        loopInfo,
        onClearLoop: handleClearLoop,
      }),
    [
      // `frozenProps` ya cubre currentFrame/activeLayerId/frameCount/layers/frames
      // (con el pin-durante-drawing via isPressed). Lo demás son valores
      // reactivos que SÍ consume el builder y antes no estaban — su ausencia
      // causaba UI stale (preview no refrescaba dimensiones al cambiar zoom/
      // viewport, onion-skin no se actualizaba al togglear, etc.).
      frozenProps,
      isPlaying,
      loopEnabled,
      setLoopEnabled,
      handleAnimationFrameChange,
      viewportOffset,
      viewportWidth,
      viewportHeight,
      zoom,
      framesResume,
      selectedPixels,
      selectionActive,
      pixelGroups,
      selectedGroup,
      dragOffset,
      layers,
      eyeDropperColor,
      initialHeight,
      initialWidth,
      onionFramesConfig,
      onionSkinEnabled,
      onionSkinSettings,
      isLayerAnimationCollapsed,
      toggleLayerAnimationCollapse,
      animationTags,
      handlePlayRange,
      loopInfo,
      handleClearLoop,
    ]
  );

  const MemoizedFramesTimeline = useMemo(
    () =>
      renderFramesTimeline({
        updateLayerZIndex,
        moveLayerToPosition,
        moveGroupToLayer,
        moveGroupToPosition,
        layers,
        addLayer,
        deleteLayer,
        moveLayerUp,
        moveLayerDown,
        toggleLayerVisibility,
        renameLayer,
        clearLayer,
        activeLayerId,
        setActiveLayerId,
        pixelGroups,
        selectedGroup,
        selectedPixels,
        createPixelGroup,
        deletePixelGroup,
        getLayerGroups,
        selectPixelGroup,
        clearSelectedGroup,
        renamePixelGroup,
        toggleGroupVisibility,
        setSelectedPixels,
        handleSelectGroup,
        dragOffset,
        setSelectionCoords,
        setSelectionActive,
        setCroppedSelectionBounds,
        autoCropSelection,
        setOriginalPixelColors,
        setDragOffset,
        setTool,
        clearCurrentSelection,
        getHierarchicalLayers,
        getMainLayers,
        getGroupLayersForParent,
        selectionActive,
        selectAllCanvas,
        duplicateLayer,
        frames,
        currentFrame,
        frameCount,
        createFrame,
        setActiveFrame,
        deleteFrame,
        duplicateFrame,
        saveCurrentFrameState,
        getFramesInfo,
        renameFrame,
        syncWithCurrentFrame,
        toggleLayerVisibilityInFrame,
        getLayerVisibility,
        toggleOnionSkin,
        setOnionSkinConfig,
        setOnionSkinFrameConfig,
        getOnionSkinFrameConfig,
        getOnionSkinPresets,
        applyOnionSkinPreset,
        getOnionSkinInfo,
        onionSkinEnabled,
        showOnionSkinForLayer,
        clearOnionSkinLayerFilter,
        onionSkinSettings,
        setFrameDuration,
        getFrameDuration,
        getFrameRate,
        setDefaultFrameRate,
        defaultFrameDuration,
        setFrameOpacity,
        getFrameOpacity,
        resolveLayerBlendMode,
        setLayerBlendMode,
        setFrameBlendModeOverride,
        framesResume,
        setFramesResume,
        externalCanvasRef: previewAnimationRef,
        viewportOffset,
        viewportWidth,
        viewportHeight,
        zoom,
        isPlaying,
        setIsPlaying,
        // animationTickFrame: frameNumber que el motor de animación está
        // mostrando en este instante durante playback. FramesTimeline lo usa
        // en su header-row para iluminar la celda activa.
        animationTickFrame,
        eyeDropperColor,
        animationTags,
        setAnimationTags,
        handlePlayTag,
        handlePlayRange,
        playerApiRef: playAnimationRef,
        setLoopEnabled,
      }),
    [
      // Mismas deps que MemoizedLayerAnimation: ambos builders consumen el
      // mismo conjunto de props reactivas (el wrapper es un espejo).
      frozenProps,
      isPlaying,
      animationTickFrame,
      viewportOffset,
      viewportWidth,
      viewportHeight,
      zoom,
      framesResume,
      selectedPixels,
      selectionActive,
      pixelGroups,
      selectedGroup,
      dragOffset,
      layers,
      eyeDropperColor,
      initialHeight,
      initialWidth,
      onionSkinEnabled,
      onionSkinSettings,
      animationTags,
      setLoopEnabled,
      handlePlayRange,
    ]
  );

  const MemoizedViewportNavigator = useMemo(
    () =>
      renderViewportNavigator({
        totalWidth,
        totalHeight,
        viewportWidth,
        viewportHeight,
        viewportOffset,
        zoom,
        moveViewport,
        handleZoomChange,
        compositeCanvasRef,
        getFullCanvas,
      }),
    [viewportOffset, zoom]
  );

  const MemoizedLayerColor = useMemo(
    () =>
      renderLayerColor({
        tool,
        toolParameters,
        setToolParameters,
        getLayerPixelData,
        paintPixelsRGBA,
        currentFrame,
        activeLayerId,
        isPressed,
        eyeDropperColor,
      }),
    [tool, toolParameters, currentFrame, activeLayerId]
  );

  // PlayAnimation (miniatura) maneja su propio `isPlaying` internamente — es
  // un reproductor independiente del panel LayerAnimation. Dar play en el
  // panel NO arranca la miniatura y viceversa; comparten el código de motor
  // (`useAnimationPlayer`) pero cada instancia tiene su propio loop RAF y
  // estado de play.
  // `onPlayTag` dispara solo este reproductor miniatura vía `playAnimationRef`.
  const MemoizedPlayAnimation = useMemo(
    () => renderPlayAnimation({
      frames,
      playerRef: playAnimationRef,
      loopEnabled,
      setLoopEnabled,
      // Chip de bucle activo dentro del mini player. Solo se renderea
      // cuando loopInfo.target === 'mini' (asi no compite con el chip de
      // LayerAnimation que cubre target === 'main').
      loopInfo,
      onClearLoop: handleClearLoop,
    }),
    [frames, loopEnabled, setLoopEnabled, loopInfo, handleClearLoop]
  );

  //autoguardado
  /*
  const [contadorFrames,setContadorFrames] = useState(0);

  
  useEffect(()=>{
   setContadorFrames(contadorFrames+1);
    const esDivisibleEntre3 = contadorFrames % 3 === 0; 

    if(esDivisibleEntre3){
      console.log("autoguardado exitoso");
      handleExport();
    }

  },[framesResume,isPressed]);*/
  
  /*Cursor reactivo 
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
      

    
  },[tool,drawMode,isDragging, isSpacePressed,toolParameters])*/

/*

  useEffect(() => {
    // Invalidar cache al cambiar de capa activa
    invalidateImageDataCache();
  }, [activeLayerId,toolParameters,currentFrame,drawableWidth, drawableHeight, isolatedPixels, tool, framesResume, selectedPixels, !isPressed]);
  */
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

  // Wrappers centralizados de undo/redo.
  // CRÍTICO: tras deshacer/rehacer hay que invalidar `cachedImageDataRef`, el
  // buffer de ImageData que el pipeline de trazo reutiliza entre pinceladas.
  // Si no se invalida, el próximo trazo lee pixels "fantasma" del estado
  // anterior al undo y los rescribe al hacer flush — los pixels deshechos
  // reaparecen al pintar encima. Los botones del toolbar ya lo hacían inline;
  // estos wrappers unifican la lógica para teclado + registry + botones.
  const handleUndo = useCallback(() => {
    undo();
    invalidateImageDataCacheOptimized();
  }, [undo, invalidateImageDataCacheOptimized]);

  const handleRedo = useCallback(() => {
    redo();
    invalidateImageDataCacheOptimized();
  }, [redo, invalidateImageDataCacheOptimized]);

  // Mantener sincronizadas las refs que usa el keybindings registry (ver arriba).
  useEffect(() => { handleUndoRef.current = handleUndo; }, [handleUndo]);
  useEffect(() => { handleRedoRef.current = handleRedo; }, [handleRedo]);

  // Ctrl+Z → undo  /  Ctrl+Y o Ctrl+Shift+Z → redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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

//====== Algoritmo de RotSprite ==================//

const [showRotationInput, setShowRotationInput] = useState(false);

const [isRotating, setIsRotating] = useState(false);

// Wrapper de RotSprite: delega el algoritmo puro a ./container/utils/rotSpriteHelpers.js
// y conserva aquí el estado `isRotating` (spinner/UX) que no pertenece al util.
const applyRotSprite = useCallback(
  async (pixels, angle, bounds) => {
    if (!pixels.length || angle === 0) return pixels;
    try {
      setIsRotating(true);
      return await applyRotSpriteUtil(
        pixels,
        angle,
        bounds,
        totalWidth,
        totalHeight
      );
    } catch (error) {
      console.error("Error en RotSprite:", error);
      return pixels;
    } finally {
      setIsRotating(false);
    }
  },
  [totalWidth, totalHeight]
);

// 4. FUNCIÓN PARA MANEJAR LA ROTACIÓN

// Función modificada para aplicar rotación automáticamente
const handleRotSprite = useCallback(async (angle,applyBounds) => {
  if (!selectedPixels.length || !croppedSelectionBounds) {
    console.warn('No hay selección para rotar');
    return;
  }

  if (angle === 0) {
    console.warn('Ángulo de rotación es 0, no se aplicará rotación');
    return;
  }

  try {
    // Normalizar el ángulo para mantenerlo entre 0-360°
    const normalizedAngle = ((angle % 360) + 360) % 360;

    // SIEMPRE usar píxeles originales si están disponibles
    const pixelsToRotate = originalSelectedPixels.length > 0 
      ? originalSelectedPixels 
      : selectedPixels;
    
    const boundsToUse = originalSelectionBounds || croppedSelectionBounds;

    let rotatedPixels;

    // Verificar si el ángulo normalizado es múltiplo de 90°
    if (normalizedAngle % 90 === 0) {
      console.log(`🎯 Usando rotación optimizada de 90° (ángulo: ${normalizedAngle}°)`);
      
      // Calcular cuántas rotaciones de 90° necesitamos
      const rotations90 = (normalizedAngle / 90) % 4;
      
      // Aplicar rotaciones de 90° secuencialmente para mayor precisión
      let currentPixels = [...pixelsToRotate];
      
      for (let i = 0; i < rotations90; i++) {
        currentPixels = rotatePixels90(currentPixels, "right");
      }
      
      rotatedPixels = currentPixels;
      
      console.log(`✅ Rotación de 90° aplicada ${rotations90} veces`);
      
    } else {
      console.log(`🎨 Usando algoritmo RotSprite para ángulo: ${normalizedAngle}°`);
      
      // Usar RotSprite para ángulos que no son múltiplos de 90°
      rotatedPixels = await applyRotSprite(
        pixelsToRotate, 
        normalizedAngle,
        boundsToUse
      );
    }

    if (rotatedPixels && rotatedPixels.length > 0) {
      // Actualizar píxeles seleccionados con los rotados
      setSelectedPixels(rotatedPixels);
      
      // Crear copias profundas para los colores originales
      const newOriginalColors = rotatedPixels.map(pixel => ({
        r: pixel.color.r,
        g: pixel.color.g,
        b: pixel.color.b,
        a: pixel.color.a
      }));
      setOriginalPixelColors(newOriginalColors);

      // Calcular nuevos bounds basados en los píxeles rotados
      const xCoords = rotatedPixels.map(p => p.x);
      const yCoords = rotatedPixels.map(p => p.y);
      const newBounds = {
        x: Math.min(...xCoords),
        y: Math.min(...yCoords),
        width: Math.max(...xCoords) - Math.min(...xCoords) + 1,
        height: Math.max(...yCoords) - Math.min(...yCoords) + 1
      };
      
      // Actualizar bounds y resetear controles
   if(applyBounds){
    setCroppedSelectionBounds(newBounds);
   }
     /*
        setCroppedSelectionBounds(null);
        setRotationAngleSelection(0);
        setDragOffset({ x: 0, y: 0 });
     
      /*
      if()
      ;*/

      console.log(`✅ Rotación aplicada exitosamente!`);
      console.log(`   Método usado: ${normalizedAngle % 90 === 0 ? 'Rotación de 90°' : 'RotSprite'}`);
      console.log(`   Ángulo aplicado: ${normalizedAngle}°`);
      console.log(`   Nuevos bounds: ${newBounds.width}x${newBounds.height} en (${newBounds.x}, ${newBounds.y})`);
      console.log(`   Píxeles resultantes: ${rotatedPixels.length}`);
      
    } else {
      console.warn('❌ La rotación no produjo píxeles válidos');
    }
    
  } catch (error) {
    console.error('💥 Error aplicando rotación:', error);
    alert('Error al aplicar la rotación');
  }
}, [
  selectedPixels, 
  croppedSelectionBounds, 
  rotatePixels90,
  applyRotSprite, 
  setSelectedPixels, 
  setOriginalPixelColors, 
  setCroppedSelectionBounds, 
  setDragOffset, 
  setRotationAngleSelection
]);



// Helper de ángulo de rotación delegado a ./container/utils/geometry.js.
const calculateRotationAngle = useCallback(
  (mouseX, mouseY, centerX, centerY) =>
    calculateRotationAngleUtil(mouseX, mouseY, centerX, centerY),
  []
);
// 4. useEffect para manejar la rotación en tiempo real
useEffect(() => {
  if (!isRotationHandlerContainerPressed || !rotationHandlerRelative.x || !rotationHandlerRelative.y) {
    return;
  }

  if (!croppedSelectionBounds) return;

  // Calcular el centro de la selección en coordenadas de pantalla
  const selectionCenterX = (croppedSelectionBounds.x + croppedSelectionBounds.width/2 + dragOffset.x - viewportOffset.x) * zoom;
  const selectionCenterY = (croppedSelectionBounds.y + croppedSelectionBounds.height/2 + dragOffset.y - viewportOffset.y) * zoom;

  // Calcular el ángulo basado en la posición del mouse
  const newAngle = calculateRotationAngle(
    rotationHandlerRelative.x,
    rotationHandlerRelative.y,
    selectionCenterX,
    selectionCenterY
  );

  setRotationAngleSelection(newAngle);
  setIsRotationHandlerActive(true);

}, [isRotationHandlerContainerPressed, rotationHandlerRelative, croppedSelectionBounds, dragOffset, viewportOffset, zoom, calculateRotationAngle]);

// 5. useEffect para resetear el estado cuando se suelta
useEffect(() => {
  if (!isRotationHandlerContainerPressed) {
    setIsRotationHandlerActive(false);
  }
}, [isRotationHandlerContainerPressed]);

// Posición del handle de rotación — delegada a ./container/utils/geometry.js.
const getRotationHandlerPosition = useCallback(
  () =>
    getRotationHandlerPositionUtil({
      croppedSelectionBounds,
      dragOffset,
      rotationAngleSelection,
      rotationHandlerRadius,
      zoom,
    }),
  [
    croppedSelectionBounds,
    dragOffset,
    rotationAngleSelection,
    rotationHandlerRadius,
    zoom,
  ]
);

// RotationCircleComponent extraído a ./container/components/RotationCircle.jsx.
// Se renderiza como `<RotationCircle .../>` en el JSX principal, pasando props equivalentes.

useEffect(()=>{
  
handleRotSprite(rotationAngleSelection);
if(!isRotationHandlerContainerPressed){

//este parametro true es para aplicar los nuevos bounds despues de soltar
handleRotSprite(rotationAngleSelection, true);
}
  },[rotationAngleSelection, isRotationHandlerContainerPressed]);

  return (
    <div className="complete-canvas-tracker">
       <TopToolbar companyName="Argánion">
     
       
        <div className="workspace-actual-layername">
          <p className="layer-name-label">
            Capa actual:
          </p>
          <p className="actual-layername">{getActiveLayerName()}</p>


        </div>
        <div className="tools">
          {/* Grupo: Historial */}
          <div className="tools-group">
            <button
              type="button"
              className="grid-control active"
              title="Deshacer (Ctrl+Z)"
              aria-label="Deshacer"
              onClick={handleUndo}
            >
              <LuUndo aria-hidden="true" />
              <p>Undo</p>
            </button>
            <button
              type="button"
              className="grid-control active"
              title="Rehacer (Ctrl+Y)"
              aria-label="Rehacer"
              onClick={handleRedo}
            >
              <LuRedo aria-hidden="true" />
              <p>Redo</p>
            </button>
          </div>

          <div className="tools-divider" />

          {/* Grupo: Herramientas avanzadas */}
          <div className="tools-group">
            <button
              type="button"
              className="grid-control active"
              title="Generador con IA"
              aria-label="Generador con IA"
              aria-pressed={activeAI}
              onClick={() => { setActiveAI(!activeAI); }}
            >
              <LuBrainCircuit aria-hidden="true" />
              <p>Gen. IA</p>
            </button>
            <button
              type="button"
              className="grid-control active"
              title="Visualizador 3D"
              aria-label="Visualizador 3D"
              aria-pressed={threeJsVisualizer}
              onClick={() => { setThreeJsVisualizer(!threeJsVisualizer); }}
            >
              <LuBox aria-hidden="true" />
              <p>3D</p>
            </button>
          </div>

          <div className="tools-divider" />

          {/* Grupo: Filtros y utilidades del plan ambicioso */}
          <div className="tools-group">
            <button
              type="button"
              className="grid-control active"
              title="Filtros (Replace Color / Outline / Hue-Sat)"
              aria-label="Filtros"
              onClick={() => setShowFiltersModal(true)}
            >
              <MdGradient aria-hidden="true" />
              <p>Filtros</p>
            </button>
            <button
              type="button"
              className="grid-control active"
              title="Insertar texto bitmap"
              aria-label="Insertar texto"
              onClick={() => setShowTextTool(true)}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, fontFamily: 'monospace' }}>T</span>
              <p>Texto</p>
            </button>
            <button
              type="button"
              className="grid-control active"
              title="Script runner (JS + sandbox)"
              aria-label="Scripts"
              onClick={() => setShowScriptRunner((v) => !v)}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, fontFamily: 'monospace' }}>{'{}'}</span>
              <p>Script</p>
            </button>
          </div>

          <div className="tools-divider" />

          {/* Grupo: Import / Utilidades del plan ambicioso */}
          <div className="tools-group">
            <button
              type="button"
              className="grid-control active"
              title="Importar .ase / .aseprite"
              aria-label="Importar Aseprite"
              onClick={handleImportAseprite}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, fontFamily: 'monospace' }}>.ase</span>
              <p>.ase</p>
            </button>
            <button
              type="button"
              className="grid-control active"
              title="Importar imagen como capa de referencia"
              aria-label="Importar referencia"
              onClick={handleImportReferenceImage}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, fontFamily: 'monospace' }}>IMG</span>
              <p>Ref</p>
            </button>
            <button
              type="button"
              className="grid-control active"
              title="Auto-crop al bounding box opaco"
              aria-label="Auto-crop"
              onClick={handleAutoCrop}
            >
              <GrTopCorner aria-hidden="true" />
              <p>Crop</p>
            </button>
            <button
              type="button"
              className={`grid-control${showRulers ? ' active' : ''}`}
              title="Mostrar reglas y guías"
              aria-label="Toggle rulers"
              aria-pressed={showRulers}
              onClick={() => setShowRulers((v) => !v)}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, fontFamily: 'monospace' }}>┼</span>
              <p>Reglas</p>
            </button>
          </div>

          <div className="tools-divider" />

          {/* Grupo: Acciones de archivo */}
          <div className="tools-group">
            <button
              type="button"
              className="grid-control active"
              title="Exportar animacion"
              aria-label="Exportar animacion"
              onClick={() => { setShowExporter(!showExporter); }}
            >
              <LuUpload aria-hidden="true" />
              <p>Exportar</p>
            </button>
            <button
              type="button"
              className="grid-control active grid-control--save"
              title="Guardar proyecto (Ctrl+S)"
              aria-label="Guardar proyecto"
              onClick={() => setShowSaveProject(true)}
            >
              <LuSave aria-hidden="true" />
              <p>Guardar</p>
            </button>
          </div>

          {/* Salir de aislamiento (condicional) */}
          {isolatedPixels && (
            <button
              type="button"
              className="grid-control active grid-control--danger"
              title="Salir del modo aislamiento"
              aria-label="Salir del modo aislamiento"
              onClick={() => { setIsolatedPixels(null); }}
            >
              <FaFileExport aria-hidden="true" />
              <p>Salir</p>
            </button>
          )}
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
    
        
          <div style={{ display: activeAI ? "block" : "none" }}>
            <AIgenerator
              createLayerAndPaintDataUrlCentered={
                createLayerAndPaintDataUrlCentered
              }
            />
            

          </div>
          {/* <Activity> preserva estado y DOM del visor 3D (igual que el
              display:none anterior), pero además destruye los efectos mientras
              está oculto: el render-loop de Three.js se pausa en vez de quemar
              CPU/GPU en segundo plano. */}
          <Activity mode={threeJsVisualizer ? 'visible' : 'hidden'}>
            <div>
              <Enhanced3DFlattener onPixelDataReady={handlePixelDataFromThreeJS} paintPixelsRGBA={paintPixelsRGBA} activeLayerId={activeLayerId}/>
            </div>
          </Activity>
          

      
          <AnimationExporter
  isOpen={showExporter}
  onClose={() => setShowExporter(false)}
  frames={frames}
  framesResume={framesResume}
  getFullCanvas={getFullCanvas}
  width={initialWidth}
  height={initialHeight}
/>
          
          
        

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
            
            <CustomTool
  setToolParameters={setToolParameters}
  tool={tool}
  toolParameters={toolParameters}
  myBrushes={myBrushes}
  copySelection={copySelection}
  cutSelection={cutSelection}
  pastePixels={pastePixels}
  duplicateSelection={duplicateSelection}
  handleRotation={handleRotation}
  fillSelection={fillSelection}
  isolateSelection={isolateSelection}
  groupSelection={groupSelection}
  ungroupSelection={ungroupSelection}
  deleteSelection={deleteSelection}
/>

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
              {/* Overlay Rulers (reglas + guías arrastrables).
                  Se monta como sibling del artboard pero solo cuando el toggle
                  está activado, para que el artboard quede completamente limpio
                  cuando el usuario solo quiere pintar. */}
              {showRulers && (
                <Rulers
                  width={Math.round(viewportWidth * zoom)}
                  height={Math.round(viewportHeight * zoom)}
                  zoom={zoom}
                  panOffset={{ x: 0, y: 0 }}
                  guides={guides}
                  onGuidesChange={setGuides}
                  cursorPos={rulersCursor}
                />
              )}

              {/* Overlay de Slices: canvas pointer-events:none que dibuja el rect
                  y la etiqueta de cada slice con drawSlicesOverlay. */}
              {showSlicesOverlay && slices.length > 0 && (
                <SlicesCanvasOverlay
                  slices={slices}
                  zoom={zoom}
                  width={Math.round(viewportWidth * zoom)}
                  height={Math.round(viewportHeight * zoom)}
                />
              )}

              {/* Overlay de Reference Layers: cada capa de referencia visible se
                  dibuja con su transform propio (x/y/scale/rotation/opacity).
                  Ninguna bloquea el pointer (pointer-events: none). */}
              {referenceLayers.some((l) => l.visible) && (
                <ReferenceLayersOverlay
                  layers={referenceLayers.filter((l) => l.visible)}
                  zoom={zoom}
                  width={Math.round(viewportWidth * zoom)}
                  height={Math.round(viewportHeight * zoom)}
                />
              )}

              {/* Overlay marching ants (Magic Wand). Se monta como sibling del
                  artboard para compartir las mismas coordenadas de viewport y zoom.
                  No bloquea el pointer (pointer-events: none en el canvas interno). */}
              {magicWandMask && (
                <div
                  style={{
                    position: 'absolute',
                    width: Math.round(viewportWidth * zoom),
                    height: Math.round(viewportHeight * zoom),
                    pointerEvents: 'none',
                    zIndex: 100,
                  }}
                >
                  <MarchingAnts
                    mask={magicWandMask}
                    zoom={zoom}
                    offset={{
                      x: -Math.round(viewportOffset.x * zoom),
                      y: -Math.round(viewportOffset.y * zoom),
                    }}
                    canvasWidth={viewportWidth}
                    canvasHeight={viewportHeight}
                  />
                </div>
              )}

              <div
                className="artboard"
                ref={artboardRef}
                style={{
                  imageRendering: "pixelated",
                  width: Math.round(viewportWidth * zoom),
                  height: Math.round(viewportHeight * zoom),
                  position: "relative",

                  backgroundColor: "rgb(128, 128, 128)",
                  // Checkerboard como SVG inline: un solo layer, sin gradientes
                  // diagonales. Las 4 capas de linear-gradient(±45deg) anteriores
                  // dejaban costuras sub-píxel visibles como líneas oscuras
                  // diagonales en zooms no enteros. shape-rendering=crispEdges +
                  // image-rendering:pixelated del artboard garantizan bordes netos.
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2' shape-rendering='crispEdges'><rect width='1' height='1' fill='%23b9b7b7'/><rect x='1' y='1' width='1' height='1' fill='%23b9b7b7'/></svg>\")",
                  backgroundSize: `${zoom * 2 * checkerboardFactor}px ${
                    zoom * 2 * checkerboardFactor
                  }px`,
                  backgroundRepeat: "repeat",
                  backgroundPosition: `${
                    (((-viewportOffset.x * zoom) %
                      (zoom * 2 * checkerboardFactor)) +
                      zoom * 2 * checkerboardFactor) %
                    (zoom * 2 * checkerboardFactor)
                  }px ${
                    (((-viewportOffset.y * zoom) %
                      (zoom * 2 * checkerboardFactor)) +
                      zoom * 2 * checkerboardFactor) %
                    (zoom * 2 * checkerboardFactor)
                  }px`,
                }}
              >


                  <div
                ref={rotationHandlerRef}>
                <RotationCircle
                  croppedSelectionBounds={croppedSelectionBounds}
                  selectionActive={selectionActive}
                  selectedPixels={selectedPixels}
                  artboardRef={artboardRef}
                  viewportOffset={viewportOffset}
                  zoom={zoom}
                  dragOffset={dragOffset}
                  rotationHandlerRadius={rotationHandlerRadius}
                  rotationAngleSelection={rotationAngleSelection}
                  setRotationAngleSelection={setRotationAngleSelection}
                  isRotationHandlerActive={isRotationHandlerActive}
                  setIsRotationHandlerActive={setIsRotationHandlerActive}
                />
                </div>
                
                
            
                <SelectionActionsMenu
                  croppedSelectionBounds={croppedSelectionBounds}
                  selectionActive={selectionActive}
                  isPressed={isPressed}
                  isRotationHandlerContainerPressed={isRotationHandlerContainerPressed}
                  selectedPixels={selectedPixels}
                  selectionActionsRef={selectionActionsRef}
                  dragOffset={dragOffset}
                  viewportOffset={viewportOffset}
                  zoom={zoom}
                  handleRotation={handleRotation}
                  deleteSelection={deleteSelection}
                  fillSelection={fillSelection}
                  clearCurrentSelection={clearCurrentSelection}
                  groupSelection={groupSelection}
                  ungroupSelection={ungroupSelection}
                  duplicateSelection={duplicateSelection}
                  copySelection={copySelection}
                  cutSelection={cutSelection}
                  isolateSelection={isolateSelection}
                />

                <MirrorCornerHandles
                  mirrorState={mirrorState}
                  leftMirrorCornerRef={leftMirrorCornerRef}
                  rightMirrorCornerRef={rightMirrorCornerRef}
                  positionCorners={positionCorners}
                  viewportOffset={viewportOffset}
                  zoom={zoom}
                  leftIsPressedMirror={leftIsPressedMirror}
                  rightIsPressedMirror={rightIsPressedMirror}
                />


                {/* Composite Canvas - only this canvas is actually in the DOM */}

                <canvas
                  ref={isPlaying ? previewAnimationRef : compositeCanvasRef}
                  width={Math.round(viewportWidth * zoom)}
                  height={Math.round(viewportHeight * zoom)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                  }}
                />

                <canvas
                  ref={selectionCanvasRef}
                  width={Math.round(viewportWidth * zoom)}
                  height={Math.round(viewportHeight * zoom)}
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
                  width={Math.round(viewportWidth * zoom)}
                  height={Math.round(viewportHeight * zoom)}
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
                  width={Math.round(viewportWidth * zoom)}
                  height={Math.round(viewportHeight * zoom)}
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

          { true &&
            <div
              className={`layer-animation ${isLayerAnimationCollapsed ? 'collapsed' : ''} ${isResizingLayerAnim ? 'resizing' : ''}`}
              onContextMenu={(e) => e.preventDefault()}
              ref={animationLayerRef}
              style={{
                height: isLayerAnimationCollapsed
                  ? `${LAYER_ANIM_COLLAPSED_H}px`
                  : `${layerAnimationHeight}px`,
                width: "100%",
                userSelect: isResizingLayerAnim ? "none" : undefined,
                bottom: "0",
              }}
            >
              {/* Resize handle: barra horizontal en el borde superior del
                  panel. Solo visible/funcional cuando NO está colapsado;
                  cursor ns-resize, hover tint morado, drag mueve el top
                  edge. Persistencia en localStorage al soltar. */}
              {!isLayerAnimationCollapsed && (
                <div
                  className="layer-animation-resizer"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Redimensionar panel de animación"
                  onMouseDown={handleLayerAnimResizeMouseDown}
                />
              )}

              {MemoizedLayerAnimation}
              {/* FramesTimeline se mantiene montado SIEMPRE. En modo collapsed,
                  el CSS oculta únicamente `.timeline-layers` y el grip de
                  resize de columna; el `timeline-header-row` con el strip de
                  frame-numbers sigue visible para ver qué frame se ilumina
                  durante playback. La navegación de capa se maneja con el
                  grupo ◀ NombreCapa ▶ en la toolbar. */}
              {MemoizedFramesTimeline}
            </div>
          }
        </div>

       <RightPanel
         paneles={{
           viewportNavigator: MemoizedViewportNavigator,
           layerColor: MemoizedLayerColor,
           playAnimation: MemoizedPlayAnimation,
           history: (
             <HistoryPanel
               history={history ?? []}
               currentIndex={(history?.length ?? 0) - 1}
               onJumpTo={() => {
                 // Jump arbitrario requiere que useLayerManager exponga setHistoryIndex.
                 // Hasta que exista, sólo mostramos la lista; undo/redo cubren la navegación.
               }}
               onClear={() => { if (typeof clearHistory === 'function') clearHistory(); }}
             />
           ),
           tags: (
             <TagsPanel
               tags={animationTags}
               onChange={setAnimationTags}
               frameCount={Object.keys(frames ?? {}).length || 1}
               onPlayTag={handlePlayTag}
             />
           ),
           keybindings: <KeybindingsPanel registry={keybindingsRegistry} />,
           tileset: tileset ? (
             <TilesetPanel
               tileset={tileset}
               activeTileId={null}
               onSelectTile={() => { /* wiring a tileTool: pendiente */ }}
               onTilesetChange={setTileset}
             />
           ) : (
             <div style={{ padding: 10, fontSize: 11, color: '#8a8a95' }}>
               Sin tileset activo.{' '}
               <button
                 type="button"
                 onClick={() => setTileset(createTileset(16, 16))}
                 style={{
                   background: '#3a3a45', color: '#e7e7ea',
                   border: '1px solid #4a4a55', borderRadius: 3,
                   padding: '3px 8px', fontSize: 11, cursor: 'pointer', marginLeft: 6,
                 }}
               >
                 Crear 16×16
               </button>
             </div>
           ),
           slices: (
             <SlicesPanel
               slices={slices}
               onChange={setSlices}
               canvasWidth={totalWidth}
               canvasHeight={totalHeight}
             />
           ),
           references: (
             <ReferenceLayersPanel
               layers={referenceLayers}
               onChange={setReferenceLayers}
             />
           ),
           magicWand: (
             <MagicWandTool
               parameters={magicWandParams}
               onChange={setMagicWandParams}
             />
           ),
           stabilizer: (
             <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
               <StabilizerSlider
                 value={toolParameters?.stabilizerLevel ?? 0}
                 onChange={(v) => setToolParameters((prev) => ({ ...prev, stabilizerLevel: v }))}
               />
               <div style={{ fontSize: 10, color: '#8a8a95', fontStyle: 'italic' }}>
                 Suaviza el trazo al pintar con pencil/line/curve. 0 = fiel al input,
                 100 = líneas casi rectas. Motor:{' '}
                 <code style={{ background: '#2a2a33', padding: '1px 4px', borderRadius: 2 }}>
                   strokeSmoothing.js
                 </code>
                 .
               </div>
             </div>
           ),
         }}
       />
        {showSaveProject && (
          <SaveProject
            frames={frames}
            currentFrame={currentFrame}
            framesResume={framesResume}
            layers={layers}
            zoom={zoom}
            panOffset={panOffset}
            activeLayerId={activeLayerId}
            toolParameters={toolParameters}
            onionSkinSettings={onionSkinSettings}
            onionFramesConfig={onionFramesConfig}
            onionSkinEnabled={onionSkinEnabled}
            onProjectLoaded={handleProjectLoaded}
            onClose={() => setShowSaveProject(false)}
            canvasWidth={totalWidth}
            canvasHeight={totalHeight}
            // Extensions del plan ambicioso (aditivas en .pixcalli v2.1).
            customPalettes={customPalettes}
            animationTags={animationTags}
            slices={slices}
            loopEnabled={loopEnabled}
            // Tilesets → dataURL por tile (canvases DOM no serializables directo).
            tilesets={tileset ? serializeTileset(tileset) : null}
            // Metadata + bitmap de cada capa codificado como dataURL (PNG).
            // Esto hace crecer el .pixcalli por referencia (~KB/referencia) pero
            // garantiza round-trip completo: guardar → cerrar → reabrir → sigue la imagen.
            referenceLayerMeta={referenceLayers.map(({ id, name, opacity, x, y, scale, rotation, visible, locked, canvas }) => ({
              id, name, opacity, x, y, scale, rotation, visible, locked,
              dataURL: canvas?.toDataURL ? canvas.toDataURL('image/png') : null,
              width:  canvas?.width  ?? 0,
              height: canvas?.height ?? 0,
            }))}
            guides={guides}
          />
        )}

        {/* Filtros (Replace Color / Outline / Hue-Sat) */}
        <FiltersModal
          isOpen={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          sourceCanvas={frames?.[currentFrame]?.canvases?.[activeLayerId] ?? null}
          initialFrom={toolParameters?.foregroundColor}
          initialTo={toolParameters?.backgroundColor}
          onApply={(resultCanvas) => {
            const target = frames?.[currentFrame]?.canvases?.[activeLayerId];
            if (!target || !resultCanvas) return;
            // Snapshot ANTES del cambio para que un undo pueda restaurarlo.
            const beforeCanvas = document.createElement('canvas');
            beforeCanvas.width = target.width;
            beforeCanvas.height = target.height;
            beforeCanvas.getContext('2d').drawImage(target, 0, 0);

            const ctx = target.getContext('2d');
            ctx.clearRect(0, 0, target.width, target.height);
            ctx.drawImage(resultCanvas, 0, 0);

            if (typeof historyPush === 'function') {
              historyPush({
                type: 'frame_state',
                label: 'Filtro aplicado',
                timestamp: Date.now(),
                layerId: activeLayerId,
                frameId: currentFrame,
                beforeCanvas,
                afterCanvas: resultCanvas,
              });
            }
            // Invalidar cachedImageDataRef: igual que con undo/redo, el pipeline
            // de trazo reutiliza un buffer ImageData entre pinceladas. Si tras
            // un filtro masivo no lo invalidamos, la próxima pincelada restaura
            // pixels "fantasma" anteriores al filtro.
            invalidateImageDataCacheOptimized();
            if (typeof compositeRender === 'function') compositeRender();
          }}
        />

        {/* Insertar texto bitmap */}
        <TextTool
          isOpen={showTextTool}
          onClose={() => setShowTextTool(false)}
          color={toolParameters?.foregroundColor}
          canvasWidth={totalWidth}
          canvasHeight={totalHeight}
          onInsert={(textCanvas, x, y) => {
            const target = frames?.[currentFrame]?.canvases?.[activeLayerId];
            if (!target || !textCanvas) return;
            const beforeCanvas = document.createElement('canvas');
            beforeCanvas.width = target.width;
            beforeCanvas.height = target.height;
            beforeCanvas.getContext('2d').drawImage(target, 0, 0);

            const ctx = target.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(textCanvas, x, y);

            if (typeof historyPush === 'function') {
              historyPush({
                type: 'frame_state',
                label: 'Insertar texto',
                timestamp: Date.now(),
                layerId: activeLayerId,
                frameId: currentFrame,
                beforeCanvas,
              });
            }
            invalidateImageDataCacheOptimized();
            if (typeof compositeRender === 'function') compositeRender();
          }}
        />

        {/* Script runner (API JS con sandbox Worker) */}
        {showScriptRunner && (
          <div
            style={{
              position: 'fixed',
              top: 60,
              right: 20,
              width: 540,
              maxHeight: '80vh',
              zIndex: 9999,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <ScriptRunnerPanel
              onClose={() => setShowScriptRunner(false)}
              snapshotBuilder={() =>
                buildScriptSnapshot({
                  width: totalWidth,
                  height: totalHeight,
                  palette: [],
                  frames,
                  layers,
                  activeFrame: currentFrame,
                  activeLayerId,
                })
              }
              onApplyPatch={(patch) => {
                applyScriptPatch(frames, patch);
                if (typeof historyPush === 'function') {
                  historyPush({
                    type: 'frame_state',
                    label: 'Script aplicado',
                    timestamp: Date.now(),
                    affectedEntries: patch?.length ?? 0,
                  });
                }
                invalidateImageDataCacheOptimized();
                if (typeof compositeRender === 'function') compositeRender();
              }}
            />
          </div>
        )}
      </div>


    </div>
  );
}

// ReferenceLayersOverlay — dibuja todas las capas de referencia visibles sobre
// el artboard. Respeta x/y/scale/rotation/opacity por layer. Se re-renderiza
// cuando cambian las capas, el zoom o el tamaño del viewport.
function ReferenceLayersOverlay({ layers, zoom, width, height }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    for (const layer of layers) {
      if (!layer.canvas) continue;
      const w = layer.canvas.width * layer.scale;
      const h = layer.canvas.height * layer.scale;
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 0.5;
      ctx.translate((layer.x + w / 2) * zoom, (layer.y + h / 2) * zoom);
      if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.drawImage(
        layer.canvas,
        (-w / 2) * zoom,
        (-h / 2) * zoom,
        w * zoom,
        h * zoom
      );
      ctx.restore();
    }
  }, [layers, zoom, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 80,
      }}
    />
  );
}

// SlicesCanvasOverlay — canvas overlay que redibuja los slices cada vez que
// cambian. No interactivo (pointer-events: none); las ediciones pasan por el
// SlicesPanel del dock.
function SlicesCanvasOverlay({ slices, zoom, width, height }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    drawSlicesOverlay(ctx, { slices }, { zoom, showPivot: true, showCenter: true });
  }, [slices, zoom, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 90,
      }}
    />
  );
}

export default CanvasTracker;
