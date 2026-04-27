import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { nanoid } from 'nanoid';
import React from 'react';
import { produce, setAutoFreeze } from 'immer';

// Deshabilitar autoFreeze global de Immer. Por default freezea el resultado,
// lo cual es correcto para consumidores puros pero rompe código existente
// que muta arrays derivados (`.sort()`, `.push()`, etc. sobre slices de
// framesResume como `frameSequence`, `keyframes`, `framesByLayer`). Migrar
// todos los consumidores a clones antes de mutar sería invasivo; deshabilitar
// el freeze aquí preserva compatibilidad. Se pierde la salvaguarda de dev
// ("mutaste sin produce"), pero ganamos no romper código viejo.
setAutoFreeze(false);
import { useOptimizedFloodFill } from './optimizedFloodFill';
import { isValidBlendMode, DEFAULT_BLEND_MODE } from '../blendModes';
import { drawLayerBlended } from '../pixelBlender';
/**
 * Custom hook for tracking pointer/mouse interactions
 */

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}


// ✅ NUEVA: Función debounce personalizada  
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}




export function usePointer(containerRef, targetRef, ignoreRefs = [], options = {}) {
  const { endPressOnLeave = false, preventContextMenu = true } = options;
  
  // Refs para datos que cambian frecuentemente
  const positionRef = useRef({ x: 0, y: 0 });
  const relativeToTargetRef = useRef({ x: 0, y: 0 });
  const isPressedRef = useRef(null);
  const pathRef = useRef([]);
  
  // Estados que SÍ necesitan causar re-render
  const [isPressed, setIsPressed] = useState(null);
  const [path, setPath] = useState([]);
  
  // NUEVO: Estados para posición con throttling para preview
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [relativeToTarget, setRelativeToTarget] = useState({ x: 0, y: 0 });
  
  // Refs estables para las dependencias
  const ignoreRefsRef = useRef(ignoreRefs);
  const optionsRef = useRef(options);

  // RAF id para el throttling de posición — solo 1 actualización por frame del monitor
  const positionRafRef = useRef(null);

  // Función para obtener posición actual sin causar re-render
  const getCurrentPosition = useCallback(() => {
    const currentPosition = positionRef.current || { x: 0, y: 0 };
    const currentRelativeToTarget = relativeToTargetRef.current || { x: 0, y: 0 };

    return {
      position: {
        x: typeof currentPosition.x === 'number' ? currentPosition.x : 0,
        y: typeof currentPosition.y === 'number' ? currentPosition.y : 0
      },
      relativeToTarget: {
        x: typeof currentRelativeToTarget.x === 'number' ? currentRelativeToTarget.x : 0,
        y: typeof currentRelativeToTarget.y === 'number' ? currentRelativeToTarget.y : 0
      }
    };
  }, []);

  // Actualización de posición sincronizada con el refresh rate del monitor.
  // RAF garantiza exactamente 1 actualización por frame, sin apilamiento de timers.
  const schedulePositionUpdate = useCallback(() => {
    if (positionRafRef.current === null) {
      positionRafRef.current = requestAnimationFrame(() => {
        const current = getCurrentPosition();
        setPosition(current.position);
        setRelativeToTarget(current.relativeToTarget);
        positionRafRef.current = null;
      });
    }
  }, [getCurrentPosition]);
  
  // Actualizar refs cuando cambien las props
  useEffect(() => {
    ignoreRefsRef.current = ignoreRefs;
  }, [ignoreRefs]);
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    isPressedRef.current = isPressed;
  }, [isPressed]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  // Limpiar RAF pendiente al desmontar.
  // (Antes usaba un `setTimeout` en `positionUpdateTimer` — ese ref ya no existe
  // tras migrar a `positionRafRef` + requestAnimationFrame; esto es el cleanup
  // actualizado para la implementación RAF.)
  useEffect(() => {
    return () => {
      if (positionRafRef.current !== null) {
        cancelAnimationFrame(positionRafRef.current);
        positionRafRef.current = null;
      }
    };
  }, []);

  const getButtonType = useCallback((e) => {
    if (!e || typeof e.button !== 'number') return null;
    if (e.button === 0) return 'left';
    if (e.button === 2) return 'right';
    return null;
  }, []);

  const isInsideIgnore = useCallback((e, shouldApplyIgnore = true) => {
    if (!e || !shouldApplyIgnore) return false;
    
    try {
      const currentIgnoreRefs = ignoreRefsRef.current;
      if (!currentIgnoreRefs) return false;
      
      const refsArray = Array.isArray(currentIgnoreRefs) ? currentIgnoreRefs : [currentIgnoreRefs];
      
      return refsArray.some(ignoreRef => {
        const ignore = ignoreRef?.current;
        if (!ignore) return false;
        
        if (!e.target) return false;
        
        try {
          return ignore.contains(e.target) || e.composedPath?.().includes(ignore);
        } catch (error) {
          console.warn('Error checking ignore refs:', error);
          return false;
        }
      });
    } catch (error) {
      console.warn('Error in isInsideIgnore:', error);
      return false;
    }
  }, []);

  const isInsideContainer = useCallback((e) => {
    if (!e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') {
      return false;
    }
    
    const container = containerRef.current;
    if (!container) return false;
    
    try {
      const rect = container.getBoundingClientRect();
      return (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
    } catch (error) {
      console.warn('Error checking container bounds:', error);
      return false;
    }
  }, [containerRef]);

  // CAMBIO CRÍTICO: Actualizar refs Y programar actualización de estados
  const updatePosition = useCallback((e) => {
    if (!e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') {
      return null;
    }
    
    const container = containerRef.current;
    const target = targetRef.current;
    
    if (!container || !target) return null;

    try {
      const rect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const relX = e.clientX - targetRect.left;
      const relY = e.clientY - targetRect.top;

      const validX = typeof x === 'number' && !isNaN(x) ? x : 0;
      const validY = typeof y === 'number' && !isNaN(y) ? y : 0;
      const validRelX = typeof relX === 'number' && !isNaN(relX) ? relX : 0;
      const validRelY = typeof relY === 'number' && !isNaN(relY) ? relY : 0;

      // Actualizar refs inmediatamente (para getCurrentPosition)
      positionRef.current = { x: validX, y: validY };
      relativeToTargetRef.current = { x: validRelX, y: validRelY };

      // Programar actualización de estados con throttling (para previews)
      schedulePositionUpdate();

      return { 
        container: { x: validX, y: validY }, 
        target: { x: validRelX, y: validRelY } 
      };
    } catch (error) {
      console.warn('Error updating position:', error);
      return null;
    }
  }, [containerRef, targetRef, schedulePositionUpdate]);

  const endPress = useCallback(() => {
    isPressedRef.current = null;
    setIsPressed(null);
  }, []);

  const clearPath = useCallback(() => {
    pathRef.current = [];
    setPath([]);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const target = targetRef.current;

    if (!container || !target) return;

    const handlePointerDown = (e) => {
      try {
        if (isInsideIgnore(e, !isPressedRef.current)) return;
        
        const buttonType = getButtonType(e);
        if (!buttonType) return;
        
        const positions = updatePosition(e);
        if (!positions) return;

        isPressedRef.current = buttonType;
        setIsPressed(buttonType);
        
        const newPath = [positions.target];
        pathRef.current = newPath;
        setPath(newPath);
      } catch (error) {
        console.warn('Error in pointer down:', error);
      }
    };

    const handlePointerMove = (e) => {
      try {
        if (isInsideIgnore(e, !isPressedRef.current)) return;
        
        // SIEMPRE actualizar posición (para preview), con throttling
        const positions = updatePosition(e);
        if (!positions) return;

        // Solo actualizar path si hay presión
        if (isPressedRef.current) {
          const newPath = [...pathRef.current, positions.target];
          pathRef.current = newPath;
          setPath(newPath);
        }

        const currentOptions = optionsRef.current;
        if (currentOptions.endPressOnLeave && isPressedRef.current && !isInsideContainer(e)) {
          endPress();
        }
      } catch (error) {
        console.warn('Error in pointer move:', error);
      }
    };

    const handlePointerUp = (e) => {
      try {
        if (!isPressedRef.current) return;
        
        if (isInsideIgnore(e, false)) return;
        
        updatePosition(e);
        endPress();
      } catch (error) {
        console.warn('Error in pointer up:', error);
      }
    };

    const handlePointerLeave = (e) => {
      try {
        const currentOptions = optionsRef.current;
        
        if (!isPressedRef.current) {
          positionRef.current = { x: 0, y: 0 };
          relativeToTargetRef.current = { x: 0, y: 0 };
          // También actualizar estados para que preview desaparezca
          setPosition({ x: 0, y: 0 });
          setRelativeToTarget({ x: 0, y: 0 });
        }
        
        if (currentOptions.endPressOnLeave && isPressedRef.current) {
          endPress();
        }
      } catch (error) {
        console.warn('Error in pointer leave:', error);
      }
    };

    const handleContextMenu = (e) => {
      try {
        const currentOptions = optionsRef.current;
        if (currentOptions.preventContextMenu) {
          e.preventDefault();
        }
      } catch (error) {
        console.warn('Error in context menu:', error);
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('pointerleave', handlePointerLeave);
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      try {
        container.removeEventListener('pointerdown', handlePointerDown);
        container.removeEventListener('contextmenu', handleContextMenu);
        container.removeEventListener('pointerleave', handlePointerLeave);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      } catch (error) {
        console.warn('Error cleaning up event listeners:', error);
      }
    };
  }, [
    containerRef, 
    targetRef, 
    getButtonType, 
    isInsideIgnore, 
    updatePosition, 
    isInsideContainer, 
    endPress
  ]);

  return { 
    // Estados para preview (con throttling a ~60fps)
    position,
    relativeToTarget,
    
    // Estados normales para interacción
    isPressed,
    path,
    clearPath,
    
    // Función para acceso inmediato sin re-render
    getCurrentPosition
  };
}
/**
 * Improved Layer Manager hook
 * Uses a composite rendering approach for better performance
 */
//Ultima version: 
export function useLayerManager({ width, height, viewportWidth, viewportHeight, zoom, isPressed, isolatedPixels }) {
  // Agregar estos estados al inicio del hook useLayerManager (después de los estados existentes)
//Nuevas optimizaciones-------------------------------
// 1. CACHE PARA RENDERIZADO


//=== optimizacion de datos para el uso de frames mejorado ====//
const [activeLayerId, setActiveLayerId] = useState(null);
const [activeLighter, setActiveLighter] = useState(false)





const renderCache = useRef({
  lastRenderFrame: -1,
  lastRenderLayers: [],
  lastRenderViewport: { x: -1, y: -1 },
  lastRenderZoom: -1,
  needsFullRender: true
});

// 2. BATCH DE OPERACIONES DE PINTADO
const pendingPaintOperations = useRef([]);
const paintBatchTimer = useRef(null);


// Estados para manejo de frames
const [frames, setFrames] = useState({});
// Ref siempre actualizada — permite leer frames sin stale closure en undo/redo
const framesRef = useRef({});
useEffect(() => { framesRef.current = frames; }, [frames]);
const [framesResume, setFramesResume] = useState({
  metadata: {
    frameCount: 1,
    defaultFrameDuration: 100,
    frameRate: 10,
    totalDuration: 100,
  },
  layers: {},
  frames: {},
  computed: {
    resolvedFrames: {},
    framesByLayer: {},
    frameSequence: [1],
    totalFrames: 1,
    keyframes: {}
  }
});
const [currentFrame, setCurrentFrame] = useState(1);
const [frameCount, setFrameCount] = useState(1);
const [defaultFrameDuration, setDefaultFrameDuration] = useState(100); // 100ms = 10 FPS


// Estado para almacenar los grupos de píxeles por capa
const [pixelGroups, setPixelGroups] = useState({});

// Estado para el grupo actualmente seleccionado
const [selectedGroup, setSelectedGroup] = useState(null);
  // Reference to the composite canvas (what's actually shown to the user)
  const compositeCanvasRef = useRef(null);
  
  // State for layers - each layer is just data, not an actual DOM canvas element
  const [layers, setLayers] = useState([]);
  
  // In-memory canvases for each layer (not attached to DOM)
  const layerCanvasesRef = useRef({});
  
  // Current viewport position
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });

  ///=========Funciones de utilidad para la gestion de grupos =================

  // Cache para la jerarquía: se recalcula solo cuando cambia la referencia de `layers`.
  // Evita el O(n²) filter-dentro-de-map en cada render.
  const hierarchicalLayersCache = useRef({ layersRef: null, result: [] });

  // 4. NUEVA FUNCIÓN para obtener capas de forma jerárquica
const getHierarchicalLayers = useCallback(() => {
  if (hierarchicalLayersCache.current.layersRef === layers) {
    return hierarchicalLayersCache.current.result;
  }
  const mainLayers = layers.filter(layer => !layer.isGroupLayer);
  const result = mainLayers.map(mainLayer => ({
    ...mainLayer,
    groupLayers: layers.filter(layer =>
      layer.isGroupLayer && layer.parentLayerId === mainLayer.id
    ).sort((a, b) => a.zIndex - b.zIndex)
  }));
  hierarchicalLayersCache.current = { layersRef: layers, result };
  return result;
}, [layers]);

// 7. NUEVA FUNCIÓN para obtener solo las capas principales (para UI)
const getMainLayers = useCallback(() => {
  return layers.filter(layer => !layer.isGroupLayer);
}, [layers]);

// 8. NUEVA FUNCIÓN para obtener capas de grupo de una capa específica
const getGroupLayersForParent = useCallback((parentLayerId) => {
  return layers.filter(layer => 
    layer.isGroupLayer && layer.parentLayerId === parentLayerId
  ).sort((a, b) => a.zIndex - b.zIndex);
}, [layers]);

 // Cache LRU para canvas bajo demanda: elimina el más antiguo (primer entry del Map)
 // cuando supera el límite, en lugar de limpiar todo.
 const canvasCache = useRef(new Map());
 const MAX_CANVAS_CACHE = 100;

 // ✅ NUEVO: Función para obtener o crear canvas solo cuando se necesita
 const getOrCreateCanvas = useCallback((layerId, frameNumber, forceCreate = false) => {
   const cacheKey = `${layerId}_${frameNumber}`;
   const cache = canvasCache.current;

   if (!forceCreate && cache.has(cacheKey)) {
     // Mover al final para marcar como recientemente usado (LRU)
     const existing = cache.get(cacheKey);
     cache.delete(cacheKey);
     cache.set(cacheKey, existing);
     return existing;
   }

   const canvas = document.createElement('canvas');
   canvas.width = width;
   canvas.height = height;
   const ctx = canvas.getContext('2d', { willReadFrequently: true });
   ctx.imageSmoothingEnabled = false;

   // LRU eviction: eliminar el entry más antiguo (primero del Map)
   if (cache.size >= MAX_CANVAS_CACHE) {
     cache.delete(cache.keys().next().value);
   }

   cache.set(cacheKey, canvas);
   return canvas;
 }, [width, height]);

 // ✅ NUEVO: Limpiar cache cuando cambien dimensiones
 useEffect(() => {
   canvasCache.current.clear();
 }, [width, height]);
  
  // Initialize with a default layer when the hook is first used
  useEffect(() => {
    if (layers.length === 0 && Object.keys(frames).length === 0) {
      const defaultLayerId = nanoid();
      
      const defaultLayer = {
        id: defaultLayerId,
        name: 'Layer 1',
        visible: {1: true},
        opacity: 1.0,
        zIndex: 0
      };
      
      const initialFrame = {
        layers: [defaultLayer],
        pixelGroups: {},
        canvases: {},
        frameDuration: defaultFrameDuration,
        tags: []
      };
  
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      ctx.imageSmoothingEnabled = false;
      
      initialFrame.canvases[defaultLayerId] = canvas;
  
      const initialFramesResume = {
        metadata: {
          frameCount: 1,
          defaultFrameDuration: defaultFrameDuration,
          frameRate: Math.round(1000 / defaultFrameDuration),
          totalDuration: defaultFrameDuration,
        },
        layers: {
          [defaultLayerId]: {
            id: defaultLayerId,
            name: 'Layer 1',
            type: 'normal',
            parentLayerId: null,
            zIndex: 0,
            blendMode: 'normal',
            locked: false,
          }
        },
        frames: {
          1: {
            layerVisibility: { [defaultLayerId]: true },
            layerOpacity: { [defaultLayerId]: 1.0 },
            layerHasContent: { [defaultLayerId]: false },
            canvases: {},
            pixelGroups: {},
            duration: defaultFrameDuration,
            tags: []
          }
        },
        computed: {
          resolvedFrames: {
            1: {
              layerVisibility: { [defaultLayerId]: true },
              layerOpacity: { [defaultLayerId]: 1.0 },
              layerHasContent: { [defaultLayerId]: false }
            }
          },
          framesByLayer: { [defaultLayerId]: [] },
          frameSequence: [1],
          totalFrames: 1,
          keyframes: { [defaultLayerId]: [] }
        }
      };
  
      setFramesResume(initialFramesResume);
      setFrames({ 1: initialFrame });
      setLayers([defaultLayer]);
      layerCanvasesRef.current[defaultLayerId] = canvas;
      
      // ✅ FIX: Establecer la primera capa como activa
      setActiveLayerId(defaultLayerId);
    }
  }, [width, height, defaultFrameDuration]);

  //==================================Funciones para el manejo de los frames ==============================================//



//=============================== O N I O N---- S K I N -----=============================================================================================//

// Agregar estos estados al inicio del hook useLayerManager (después de los estados existentes)

// Estados para Onion Skin
const [onionSkinEnabled, setOnionSkinEnabled] = useState(false);
// 1. CONFIGURACIÓN SIMPLIFICADA (reemplazar onionSkinSettings)
const [onionSkinSettings, setOnionSkinSettings] = useState({
  enabled: false,
  previousOpacity: 0.3,  // Opacidad del frame -1
  nextOpacity: 0.3,      // Opacidad del frame +1 
  previousMatiz: null,
  nextMatiz: null,
});

const setOnionSkinActiveLayer = useCallback((layerId) => {
  setOnionSkinSettings(prev => ({
    ...prev,
    activeLayerId: layerId
  }));
}, []);

// Función para limpiar filtro de capa (mostrar todas)
const clearOnionSkinLayerFilter = useCallback(() => {
  setOnionSkinSettings(prev => ({
    ...prev,
    activeLayerId: null
  }));
}, []);

// Función auxiliar para verificar si una capa debe mostrarse en onion skin
const shouldShowLayerInOnionSkin = useCallback((layerId) => {
  // Si no hay capa activa específica, mostrar todas las capas
  if (onionSkinSettings.activeLayerId === null) {
    return true;
  }
  
  // Solo mostrar la capa específica
  return layerId === onionSkinSettings.activeLayerId;
}, [onionSkinSettings.activeLayerId]);

// Función para habilitar/deshabilitar onion skin
const toggleOnionSkin = useCallback(() => {
  setOnionSkinSettings(prev => ({
    ...prev,
    enabled: !prev.enabled
  }));
}, []);

// Función para configurar los ajustes generales de onion skin
const setOnionSkinConfig = useCallback((config) => {
  setOnionSkinSettings(prev => ({
    ...prev,
    ...config
  }));
}, []);

// Función para configurar un frame específico de onion skin
const setOnionSkinFrameConfig = useCallback((frameOffset, config) => {
  setOnionSkinSettings(prev => ({
    ...prev,
    frameSettings: {
      ...prev.frameSettings,
      [frameOffset]: {
        ...prev.frameSettings[frameOffset],
        ...config
      }
    }
  }));
}, []);

// Función para obtener la configuración de un frame específico
const getOnionSkinFrameConfig = useCallback((frameOffset) => {
  if (frameOffset < 0) {
    return { opacity: onionSkinSettings.previousOpacity };
  } else if (frameOffset > 0) {
    return { opacity: onionSkinSettings.nextOpacity };
  } else {
    return { opacity: 1.0 }; // Frame actual
  }
}, [onionSkinSettings]);




////===================== LOgica para reproduccion de animacion =============================//










// === Modos de fusión de capa ===
//
// Granularidad: cada capa tiene un blendMode global (denormalizado por frame
// para seguir el patrón de visible/opacity). Un override opcional por frame
// vive en `frame.layers[i].blendModeOverride` y, si !== null, gana sobre el
// blendMode de capa.
//
// IMPORTANTE: declarado AQUI (no junto a setLayerBlendMode/setFrameBlendModeOverride
// abajo) porque los useCallback de renderCurrentFrameOnly y
// renderCurrentFrameWithAdjacent listan resolveLayerBlendMode en su deps array
// — declararlo abajo causa TDZ ReferenceError al primer render.

const resolveLayerBlendMode = useCallback((layerId, frameNumber) => {
  const frame = frames[String(frameNumber)];
  if (!frame) return DEFAULT_BLEND_MODE;
  const layer = frame.layers.find(l => l.id === layerId);
  if (!layer) return DEFAULT_BLEND_MODE;
  const override = layer.blendModeOverride;
  if (override != null && isValidBlendMode(override)) return override;
  return isValidBlendMode(layer.blendMode) ? layer.blendMode : DEFAULT_BLEND_MODE;
}, [frames]);


// 4. FUNCIÓN DE RENDERIZADO SIMPLE POR FRAME (NUEVA)


const renderCurrentFrameOnly = useCallback((ctx) => {
  const hierarchicalLayers = getHierarchicalLayers();
  const sortedMainLayers = hierarchicalLayers.sort((a, b) => a.zIndex - b.zIndex);

  // Cada layer va via drawLayerBlended: 'normal' fast-path nativo, otros modos
  // pixel-by-pixel exacto (match Aseprite math). isFirstDrawn fuerza 'normal'
  // en la primera capa visible (no hay nada debajo para blendear).
  let isFirstDrawn = true;
  const dstW = Math.round(viewportWidth * zoom);
  const dstH = Math.round(viewportHeight * zoom);
  const srcRect = { x: viewportOffset.x, y: viewportOffset.y, w: viewportWidth, h: viewportHeight };
  const dstRect = { w: dstW, h: dstH };

  for (const mainLayer of sortedMainLayers) {
    const isVisible = mainLayer.visible[currentFrame] ?? true;
    if (!isVisible) continue;

    const mainCanvas = layerCanvasesRef.current[mainLayer.id];
    if (mainCanvas) {
      const layerOpacity = mainLayer.opacity ?? 1.0;
      const blendId = isFirstDrawn ? 'normal' : resolveLayerBlendMode(mainLayer.id, currentFrame);
      drawLayerBlended(ctx, mainCanvas, blendId, layerOpacity, srcRect, dstRect);
      isFirstDrawn = false;
    }

    for (const groupLayer of mainLayer.groupLayers) {
      if (!groupLayer.visible) continue;
      const groupCanvas = layerCanvasesRef.current[groupLayer.id];
      if (groupCanvas) {
        const groupOpacity = groupLayer.opacity ?? 1.0;
        const groupBlendId = isFirstDrawn ? 'normal' : resolveLayerBlendMode(groupLayer.id, currentFrame);
        drawLayerBlended(ctx, groupCanvas, groupBlendId, groupOpacity, srcRect, dstRect);
        isFirstDrawn = false;
      }
    }
  }
}, [getHierarchicalLayers, currentFrame, viewportOffset, viewportWidth, viewportHeight, zoom, resolveLayerBlendMode]);


//funcion pseudo onion skin:

// ============ ESTADO ONION FRAMES CONFIG ============
// ============ CAMBIO 1: ACTUALIZAR EL ESTADO DE CONFIGURACIÓN ============
// REEMPLAZA tu estado actual por este:
const [onionFramesConfig, setOnionFramesConfig] = useState({
  enabled: true,
  // Configuración para múltiples frames anteriores
  previousFrames: [
    {
      enabled: true,
      opacity: 0.4,
      hue: 240,        // Azul directo
      saturation: 60,  // Saturación moderada
      brightness: 90,  // Ligeramente más oscuro
      offset: 1        // Frame -1 (anterior inmediato)
    },
    {
      enabled: true,  // Deshabilitado por defecto
      opacity: 0.25,   // Más transparente para frames más lejanos
      hue: 220,        // Azul más oscuro
      saturation: 40,
      brightness: 80,
      offset: 2        // Frame -2
    },
    {
      enabled: true,  // Deshabilitado por defecto
      opacity: 0.15,
      hue: 200,        // Azul aún más oscuro
      saturation: 30,
      brightness: 70,
      offset: 3        // Frame -3
    }
  ],
  // Configuración para múltiples frames siguientes
  nextFrames: [
    {
      enabled: true,
      opacity: 0.4,
      hue: 30,         // Naranja directo
      saturation: 60,  // Saturación moderada
      brightness: 110, // Ligeramente más brillante
      offset: 1        // Frame +1 (siguiente inmediato)
    },
    {
      enabled: true,  // Deshabilitado por defecto
      opacity: 0.25,   // Más transparente para frames más lejanos
      hue: 50,         // Naranja más claro
      saturation: 40,
      brightness: 120,
      offset: 2        // Frame +2
    },
    {
      enabled: false,  // Deshabilitado por defecto
      opacity: 0.15,
      hue: 70,         // Amarillo-naranja
      saturation: 30,
      brightness: 130,
      offset: 3        // Frame +3
    }
  ]
});

// ============ SISTEMA DE CANVAS PRE-RENDERIZADO CON MATICES ============
const tintedCanvasCache = useRef(new Map()); // Cache para canvas con matices

// Versión de contenido por capa+frame: se incrementa al pintar.
// Permite invalidar el caché de onion skin cuando cambia el contenido real.
const paintVersionRef = useRef({});

// Límite del cache de canvas teñidos. Con keys por viewport, puede crecer
// durante un paneo; mantenemos LRU-ish por orden de inserción del Map.
const TINTED_CACHE_MAX = 64;

// Aplica matiz a la REGIÓN DEL VIEWPORT de un canvas (no al canvas completo).
// - Crea un canvas del tamaño del viewport, no del canvas fuente.
// - El recoloreado usa compositing GPU (`source-in` + fillRect) en lugar de un
//   loop JS sobre w*h píxeles con getImageData/putImageData.
const applyTintToCanvas = useCallback((sourceCanvas, config, frameNumber, layerId, vx, vy, vw, vh) => {
  const { hue, saturation, brightness, opacity } = config;

  // Clamp mínimo para no crear canvas 0x0 cuando el viewport queda fuera
  const regionW = Math.max(1, Math.round(vw));
  const regionH = Math.max(1, Math.round(vh));
  const regionX = Math.round(vx);
  const regionY = Math.round(vy);

  const contentVersion = paintVersionRef.current[`${layerId}_${frameNumber}`] ?? 0;
  const cacheKey = `f${frameNumber}_l${layerId}_${hue}_${saturation}_${brightness}_${opacity}_v${contentVersion}_r${regionX},${regionY},${regionW},${regionH}`;

  const cached = tintedCanvasCache.current.get(cacheKey);
  if (cached) {
    // refresh LRU: reinsertar lo mueve al final
    tintedCanvasCache.current.delete(cacheKey);
    tintedCanvasCache.current.set(cacheKey, cached);
    return cached;
  }

  const tintedCanvas = document.createElement('canvas');
  tintedCanvas.width = regionW;
  tintedCanvas.height = regionH;
  const tintedCtx = tintedCanvas.getContext('2d');

  // drawImage con source rect = viewport del source. Si la región se sale del
  // source, el navegador recorta sola — igual que el comportamiento previo.
  tintedCtx.drawImage(sourceCanvas, regionX, regionY, regionW, regionH, 0, 0, regionW, regionH);

  if (hue !== 0 || saturation !== 100 || brightness !== 100) {
    const targetHue = (hue % 360) / 360;
    const targetSaturation = saturation / 100;
    const targetLightness = (brightness / 100) * 0.5;
    const [targetR, targetG, targetB] = hslToRgb(targetHue, targetSaturation, targetLightness);

    // Reemplaza el color preservando el alpha: 'source-in' mantiene solo los
    // píxeles donde ya había contenido y los pinta con el fill. Equivalente al
    // loop original pero sin salir a CPU ni iterar en JS.
    tintedCtx.globalCompositeOperation = 'source-in';
    tintedCtx.fillStyle = `rgb(${targetR}, ${targetG}, ${targetB})`;
    tintedCtx.fillRect(0, 0, regionW, regionH);
    tintedCtx.globalCompositeOperation = 'source-over';
  }

  if (tintedCanvasCache.current.size >= TINTED_CACHE_MAX) {
    const oldestKey = tintedCanvasCache.current.keys().next().value;
    if (oldestKey !== undefined) tintedCanvasCache.current.delete(oldestKey);
  }
  tintedCanvasCache.current.set(cacheKey, tintedCanvas);

  return tintedCanvas;
}, []);

// Funciones auxiliares para conversión de color más precisas
const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }
  
  return [h, s, l];
};

const hslToRgb = (h, s, l) => {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // Gris
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
};

// Función para limpiar cache cuando cambian las configuraciones
const clearTintCache = useCallback(() => {
  tintedCanvasCache.current.clear();
}, []);

// ============ FUNCIÓN DE RENDERIZADO ACTUALIZADA ============
const renderCurrentFrameWithAdjacent = useCallback((ctx) => {
  if (!onionFramesConfig.enabled) {
    // Si los onion frames están deshabilitados, renderizar solo el frame actual
    renderCurrentFrameOnly(ctx);
    return;
  }

  const hierarchicalLayers = getHierarchicalLayers();
  const sortedMainLayers = hierarchicalLayers.sort((a, b) => a.zIndex - b.zIndex);
  
  // Función auxiliar para renderizar un frame específico con configuración
  const renderFrameWithConfig = (frameIndex, config) => {
    if (!frames[frameIndex] || !activeLayerId) return;
    
    const frameData = frames[frameIndex];
    const activeLayer = frameData.layers.find(layer => layer.id === activeLayerId);
    
    if (!activeLayer) return;
    
    const isVisible = activeLayer.visible[frameIndex] ?? true;
    if (!isVisible) return;
    
    // Renderizar capa principal del frame con matiz
    const mainCanvas = frameData.canvases[activeLayerId];
    if (mainCanvas) {
      // El tinted canvas ya viene recortado al viewport, se dibuja 1:1 y se
      // escala al zoom en destino.
      const tintedCanvas = applyTintToCanvas(
        mainCanvas, config, frameIndex, activeLayerId,
        viewportOffset.x, viewportOffset.y, viewportWidth, viewportHeight
      );
      const layerOpacity = (activeLayer.opacity ?? 1.0) * config.opacity;

      ctx.globalAlpha = layerOpacity;
      ctx.drawImage(
        tintedCanvas,
        0, 0, tintedCanvas.width, tintedCanvas.height,
        0, 0,
        Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom)
      );
      ctx.globalAlpha = 1.0;
    }

    // Renderizar capas de grupo relacionadas con matiz
    const groupLayers = frameData.layers.filter(layer =>
      layer.isGroupLayer && layer.parentLayerId === activeLayerId
    );

    for (const groupLayer of groupLayers) {
      const isGroupVisible = groupLayer.visible && (groupLayer.visible[frameIndex] !== false);
      if (!isGroupVisible) continue;

      const groupCanvas = frameData.canvases[groupLayer.id];
      if (groupCanvas) {
        const tintedGroupCanvas = applyTintToCanvas(
          groupCanvas, config, frameIndex, groupLayer.id,
          viewportOffset.x, viewportOffset.y, viewportWidth, viewportHeight
        );
        const groupOpacity = (groupLayer.opacity ?? 1.0) * config.opacity;

        ctx.globalAlpha = groupOpacity;
        ctx.drawImage(
          tintedGroupCanvas,
          0, 0, tintedGroupCanvas.width, tintedGroupCanvas.height,
          0, 0,
          Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom)
        );
        ctx.globalAlpha = 1.0;
      }
    }
  };

  // ============ RENDERIZAR FRAMES ANTERIORES ============
  // Ordenar por offset descendente para que los más lejanos se rendericen primero
  const enabledPreviousFrames = onionFramesConfig.previousFrames
    .filter(config => config.enabled)
    .sort((a, b) => b.offset - a.offset);
    
  for (const config of enabledPreviousFrames) {
    const frameIndex = currentFrame - config.offset;
    renderFrameWithConfig(frameIndex, config);
  }
  
  // ============ RENDERIZAR FRAME ACTUAL ============
  // Mismo flujo que renderCurrentFrameOnly pero comparte ctx con neighbors.
  let isFirstDrawnActive = true;
  const _activeDstW = Math.round(viewportWidth * zoom);
  const _activeDstH = Math.round(viewportHeight * zoom);
  const _activeSrcRect = { x: viewportOffset.x, y: viewportOffset.y, w: viewportWidth, h: viewportHeight };
  const _activeDstRect = { w: _activeDstW, h: _activeDstH };
  for (const mainLayer of sortedMainLayers) {
    const isVisible = mainLayer.visible[currentFrame] ?? true;
    if (!isVisible) continue;

    const mainCanvas = layerCanvasesRef.current[mainLayer.id];
    if (mainCanvas) {
      const layerOpacity = mainLayer.opacity ?? 1.0;
      const blendId = isFirstDrawnActive ? 'normal' : resolveLayerBlendMode(mainLayer.id, currentFrame);
      drawLayerBlended(ctx, mainCanvas, blendId, layerOpacity, _activeSrcRect, _activeDstRect);
      isFirstDrawnActive = false;
    }

    for (const groupLayer of mainLayer.groupLayers) {
      if (!groupLayer.visible) continue;
      const groupCanvas = layerCanvasesRef.current[groupLayer.id];
      if (groupCanvas) {
        const groupOpacity = groupLayer.opacity ?? 1.0;
        const groupBlendId = isFirstDrawnActive ? 'normal' : resolveLayerBlendMode(groupLayer.id, currentFrame);
        drawLayerBlended(ctx, groupCanvas, groupBlendId, groupOpacity, _activeSrcRect, _activeDstRect);
        isFirstDrawnActive = false;
      }
    }
  }

  // ============ RENDERIZAR FRAMES SIGUIENTES ============
  // Ordenar por offset descendente para que los más lejanos se rendericen primero
  const enabledNextFrames = onionFramesConfig.nextFrames
    .filter(config => config.enabled)
    .sort((a, b) => b.offset - a.offset);
    
  for (const config of enabledNextFrames) {
    const frameIndex = currentFrame + config.offset;
    renderFrameWithConfig(frameIndex, config);
  }
  
}, [
  onionFramesConfig,
  applyTintToCanvas,
  getHierarchicalLayers,
  currentFrame,
  viewportOffset,
  viewportWidth,
  viewportHeight,
  zoom,
  frames,
  activeLayerId,
  resolveLayerBlendMode
]);


// ============ FUNCIONES DE UTILIDAD PARA MANEJAR LA CONFIG ============

// Actualizar configuración del frame anterior
// Función para agregar un nuevo frame anterior
const addPreviousFrame = useCallback(() => {
  setOnionFramesConfig(prev => {
    const maxOffset = Math.max(0, ...prev.previousFrames.map(f => f.offset));
    const newFrame = {
      enabled: false,
      opacity: Math.max(0.1, 0.4 - (maxOffset * 0.1)), // Opacidad decrece con la distancia
      hue: 240 - (maxOffset * 20), // Hue cambia gradualmente
      saturation: Math.max(20, 60 - (maxOffset * 10)),
      brightness: Math.max(50, 90 - (maxOffset * 10)),
      offset: maxOffset + 1
    };
    
    return {
      ...prev,
      previousFrames: [...prev.previousFrames, newFrame]
    };
  });
}, []);

// Función para agregar un nuevo frame siguiente
const addNextFrame = useCallback(() => {
  setOnionFramesConfig(prev => {
    const maxOffset = Math.max(0, ...prev.nextFrames.map(f => f.offset));
    const newFrame = {
      enabled: false,
      opacity: Math.max(0.1, 0.4 - (maxOffset * 0.1)),
      hue: 30 + (maxOffset * 20), // Hue cambia gradualmente hacia amarillo
      saturation: Math.max(20, 60 - (maxOffset * 10)),
      brightness: Math.min(150, 110 + (maxOffset * 10)),
      offset: maxOffset + 1
    };
    
    return {
      ...prev,
      nextFrames: [...prev.nextFrames, newFrame]
    };
  });
}, []);

// Función para remover un frame por índice
const removeFrame = useCallback((type, index) => {
  setOnionFramesConfig(prev => ({
    ...prev,
    [type]: prev[type].filter((_, i) => i !== index)
  }));
  clearTintCache(); // Limpiar cache al remover frames
}, [clearTintCache]);

// Función para actualizar un frame específico
const updateFrameConfig = useCallback((type, index, updates) => {
  setOnionFramesConfig(prev => ({
    ...prev,
    [type]: prev[type].map((frame, i) => 
      i === index ? { ...frame, ...updates } : frame
    )
  }));
  clearTintCache(); // Limpiar cache al actualizar configuración
}, [clearTintCache]);

// Actualizar configuración del frame anterior (para compatibilidad)
const updatePreviousFrameConfig = useCallback((updates) => {
  updateFrameConfig('previousFrames', 0, updates);
}, [updateFrameConfig]);

// Actualizar configuración del frame siguiente (para compatibilidad)
const updateNextFrameConfig = useCallback((updates) => {
  updateFrameConfig('nextFrames', 0, updates);
}, [updateFrameConfig]);

// Alternar onion frames
const toggleOnionFrames = useCallback(() => {
  setOnionFramesConfig(prev => ({
    ...prev,
    enabled: !prev.enabled
  }));
}, []);

// Presets predefinidos
const applyOnionFramesPreset = useCallback((presetName) => {
  const presets = {
    classic: {
      previousFrames: [
        { enabled: true, hue: 240, saturation: 50, brightness: 100, opacity: 0.3, offset: 1 }
      ],
      nextFrames: [
        { enabled: true, hue: 0, saturation: 50, brightness: 100, opacity: 0.3, offset: 1 }
      ]
    },
    warm: {
      previousFrames: [
        { enabled: true, hue: 60, saturation: 30, brightness: 90, opacity: 0.25, offset: 1 }
      ],
      nextFrames: [
        { enabled: true, hue: 300, saturation: 30, brightness: 90, opacity: 0.25, offset: 1 }
      ]
    },
    subtle: {
      previousFrames: [
        { enabled: true, hue: 0, saturation: 0, brightness: 80, opacity: 0.2, offset: 1 }
      ],
      nextFrames: [
        { enabled: true, hue: 0, saturation: 0, brightness: 120, opacity: 0.2, offset: 1 }
      ]
    },
    neon: {
      previousFrames: [
        { enabled: true, hue: 180, saturation: 100, brightness: 150, opacity: 0.4, offset: 1 }
      ],
      nextFrames: [
        { enabled: true, hue: 320, saturation: 100, brightness: 150, opacity: 0.4, offset: 1 }
      ]
    }
  };
  
  if (presets[presetName]) {
    setOnionFramesConfig(prev => ({
      ...prev,
      ...presets[presetName]
    }));
    clearTintCache();
  }
}, [clearTintCache]);


// ============ CLEANUP ============
useEffect(() => {
  return () => {
    clearTintCache(); // Limpiar cache al desmontar el componente
  };
}, [clearTintCache, currentFrame]);

// 9. NUEVA FUNCIÓN: renderLayerWithConfig



// Efecto para limpiar cache cuando cambien configuraciones críticas

// Función para obtener configuraciones predefinidas de onion skin
const getOnionSkinPresets = useCallback(() => {
  return {
    light: {
      previousFrames: 1,
      nextFrames: 1,
      previousOpacity: 0.2,
      nextOpacity: 0.2,
      activeLayerId: null
    },
    medium: {
      previousFrames: 1,
      nextFrames: 1,
      previousOpacity: 0.4,
      nextOpacity: 0.4,
      activeLayerId: null
    },
    strong: {
      previousFrames: 2,
      nextFrames: 2,
      previousOpacity: 0.6,
      nextOpacity: 0.6,
      activeLayerId: null
    },
    subtle: {
      previousFrames: 1,
      nextFrames: 1,
      previousOpacity: 0.15,
      nextOpacity: 0.15,
      activeLayerId: null
    }
  };
}, []);

// Función para obtener información del estado actual del onion skin (actualizada)

// FUNCIONES DE CONVENIENCIA PARA USO COMÚN

// Función para mostrar onion skin solo para una capa específica
const showOnionSkinForLayer = useCallback((layerId) => {
  setOnionSkinActiveLayer(layerId);

}, [onionSkinEnabled, setOnionSkinActiveLayer]);

// Función para aplicar un preset
const applyOnionSkinPreset = useCallback((presetName) => {
  const presets = getOnionSkinPresets();
  const preset = presets[presetName];
  if (preset) {
    setOnionSkinSettings(preset);
  }
}, [getOnionSkinPresets]);

// Reemplazar la función compositeRender original con la nueva


// Función para obtener información del estado actual del onion skin
const getOnionSkinInfo = useCallback(() => {
  return {
    enabled: onionSkinEnabled,
    settings: onionSkinSettings,
    activeLayerId: onionSkinSettings.activeLayerId,
    activeFrames: {
      previous: Array.from({ length: onionSkinSettings.previousFrames }, (_, i) => currentFrame - (i + 1))
        .filter(frameNum => frames[frameNum]),
      current: currentFrame,
      next: Array.from({ length: onionSkinSettings.nextFrames }, (_, i) => currentFrame + (i + 1))
        .filter(frameNum => frames[frameNum])
    },
    opacities: {
      previous: onionSkinSettings.previousOpacity,
      next: onionSkinSettings.nextOpacity
    }
  };
}, [onionSkinEnabled, onionSkinSettings, currentFrame, frames]);



//=======================================MANEJO DE LOS FRAMES===============================================//
//FUnciones especiales para hacer la fusion de modo lighter o darker:

// Estado para la capa temporal de iluminación
const [tempLighterCanvas, setTempLighterCanvas] = useState(null);
const [tempLighterLayerId, setTempLighterLayerId] = useState(null);
const [tempLighterFrameId, setTempLighterFrameId] = useState(null);

// ===== FUNCIÓN PARA CREAR CAPA TEMPORAL =====

const createTempLighterCanvas = useCallback((layerId, frameId) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  
  setTempLighterCanvas(canvas);
  setTempLighterLayerId(layerId);
  setTempLighterFrameId(frameId);
  
  return canvas;
}, [width, height]);


// ===== FUNCIÓN PARA LIMPIAR CAPA TEMPORAL =====

const clearTempLighterCanvas = useCallback(() => {
  setTempLighterCanvas(null);
  setTempLighterLayerId(null);
  setTempLighterFrameId(null);
}, []);


// =================== MÁSCARA DE AISLAMIENTO CORREGIDA ===================

// Estado para cachear la máscara (mantener igual)
const [isolationMaskCache, setIsolationMaskCache] = useState({
  canvas: null,
  lastPixelsHash: null,
  lastViewportHash: null
});

// Función para generar hash (simplificada - solo píxeles)
const generateIsolationHash = useCallback((pixels) => {
  if (!pixels || !Array.isArray(pixels) || pixels.length === 0) return null;
  
  const pixelsStr = pixels.map(p => `${p.x},${p.y}`).sort().join('|');
  return pixelsStr;
}, []);

// ✅ FUNCIÓN CORREGIDA: Crear máscara en coordenadas del canvas original
const updateIsolationMask = useCallback(() => {
  if (!isolatedPixels || !Array.isArray(isolatedPixels) || isolatedPixels.length === 0) {
    setIsolationMaskCache({ canvas: null, lastPixelsHash: null, lastViewportHash: null });
    return;
  }

  const currentHash = generateIsolationHash(isolatedPixels);

  // Si ya tenemos esta máscara en cache, no hacer nada
  if (isolationMaskCache.lastPixelsHash === currentHash) {
    return;
  }

  console.log(`🔄 Generando nueva máscara de aislamiento para ${isolatedPixels.length} píxeles`);

  // ✅ CORRECCIÓN: Crear máscara en tamaño del canvas original, no del viewport
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width; // Tamaño completo del canvas
  maskCanvas.height = height; // Tamaño completo del canvas
  const maskCtx = maskCanvas.getContext('2d');
  
  if (!maskCtx) return;

  // 1. Llenar todo el canvas con negro semitransparente (la máscara base)
  maskCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

  // 2. Usar 'destination-out' para hacer agujeros transparentes en los píxeles aislados
  maskCtx.globalCompositeOperation = 'destination-out';
  maskCtx.fillStyle = 'rgba(0, 0, 0, 1)'; // Color no importa con destination-out

  // ✅ CORRECCIÓN: Crear transparencia en coordenadas reales del canvas
  isolatedPixels.forEach(pixel => {
    const { x, y } = pixel;
    
    // ✅ SIN CONVERSIÓN DE VIEWPORT - usar coordenadas directas del canvas
    // Solo verificar que esté dentro del canvas completo
    if (x >= 0 && x < width && y >= 0 && y < height) {
      // Crear un cuadrado transparente para este píxel (1x1)
      maskCtx.fillRect(x, y, 1, 1);
    }
  });

  // Guardar en cache
  setIsolationMaskCache({
    canvas: maskCanvas,
    lastPixelsHash: currentHash,
    lastViewportHash: currentHash
  });

  console.log(`✅ Nueva máscara de aislamiento cacheada (${width}x${height})`);
}, [isolatedPixels, width, height, generateIsolationHash, isolationMaskCache.lastPixelsHash]);

// ✅ FUNCIÓN CORREGIDA: Renderizar la máscara respetando viewport y zoom
const renderCachedIsolationMask = useCallback((ctx) => {
  if (!isolationMaskCache.canvas) return;
  
  // ✅ GUARDAR el estado completo del contexto ANTES de aplicar la máscara
  ctx.save();
  
  // ✅ RESETEAR cualquier composite operation previa
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
  
  // Dibujar solo la porción visible de la máscara
  ctx.drawImage(
    isolationMaskCache.canvas,
    viewportOffset.x, viewportOffset.y,     // Origen en la máscara
    viewportWidth, viewportHeight,          // Tamaño a tomar de la máscara
    0, 0,                                   // Destino en el canvas composite
    Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom)  // Tamaño escalado
  );
  
  // ✅ RESTAURAR el estado del contexto INMEDIATAMENTE
  ctx.restore();
  
}, [isolationMaskCache.canvas, viewportOffset, viewportWidth, viewportHeight, zoom]);

// ✅ EFECTO ACTUALIZADO: Solo actualizar cuando cambien los píxeles (no viewport/zoom)
useEffect(() => {
  updateIsolationMask();
}, [isolatedPixels]); // ✅ SOLO cuando cambien los píxeles aislados

// ✅ COMPOSITE RENDER OPTIMIZADO (mantener igual)
const compositeRender = useCallback(() => {
  if (!compositeCanvasRef.current) return;
  
  const ctx = compositeCanvasRef.current.getContext('2d');
  if (!ctx) return;
  
  // ✅ GUARDAR estado inicial del contexto
  ctx.save();
  
  // Limpiar canvas
  ctx.clearRect(0, 0, Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom));
  
  // ✅ ASEGURAR estado limpio para renderizado base
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
  
  // 1. Renderizar el contenido base
  if (onionFramesConfig.enabled) {
    renderCurrentFrameWithAdjacent(ctx);
  } else {
    renderCurrentFrameOnly(ctx);
  }
  
  // 2. Verificar elementos a renderizar
  const hasIsolationMask = isolatedPixels && Array.isArray(isolatedPixels) && isolatedPixels.length > 0;
  const hasTempLighter = tempLighterCanvas && activeLighter;
  
  if (hasTempLighter) {
    // ✅ RENDERIZAR tempLighter con estado limpio
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    
    ctx.drawImage(
      tempLighterCanvas,
      viewportOffset.x, viewportOffset.y,
      viewportWidth, viewportHeight,
      0, 0,
      Math.round(viewportWidth * zoom), Math.round(viewportHeight * zoom)
    );
    
    ctx.restore();
  }
  
  if (hasIsolationMask) {
    // ✅ RENDERIZAR máscara en un contexto completamente aislado
    renderCachedIsolationMask(ctx);
  }
  
  // ✅ RESTAURAR estado inicial
  ctx.restore();

}, [
  viewportWidth, 
  viewportHeight, 
  zoom, 
  onionSkinSettings.enabled, 
  renderCurrentFrameWithAdjacent, 
  renderCurrentFrameOnly,
  tempLighterCanvas,
  activeLighter,
  viewportOffset,
  isolatedPixels,
  renderCachedIsolationMask
]);


// ✅ FUNCIÓN PARA LIMPIAR CACHE CUANDO SEA NECESARIO
const clearIsolationMaskCache = useCallback(() => {
  setIsolationMaskCache({ canvas: null, lastPixelsHash: null, lastViewportHash: null });
}, []);

// ===== FUNCIÓN PARA FUSIONAR CAPA TEMPORAL =====

const mergeTempLighterCanvas = useCallback(() => {
  if (!tempLighterCanvas || !tempLighterLayerId || !tempLighterFrameId) {
    return;
  }

  // Obtener el canvas de destino
  const targetFrame = frames[tempLighterFrameId];
  if (!targetFrame) {
    console.warn('Frame de destino no encontrado para fusionar lighter');
    clearTempLighterCanvas();
    return;
  }

  let targetCanvas = targetFrame.canvases[tempLighterLayerId];
  if (!targetCanvas) {
    targetCanvas = getOrCreateCanvas(tempLighterLayerId, tempLighterFrameId, true);
    targetFrame.canvases[tempLighterLayerId] = targetCanvas;
  }

  const targetCtx = targetCanvas.getContext('2d');
  
  // Fusionar la capa temporal con la capa de destino
  targetCtx.drawImage(tempLighterCanvas, 0, 0);
  
  // Actualizar el estado de modificación de la capa
  lastModifiedLayer.current = tempLighterLayerId;
  setLastModifiedLayerState(tempLighterLayerId);
  
  // Limpiar la capa temporal
  clearTempLighterCanvas();
  
  // Re-renderizar
  requestAnimationFrame(compositeRender);
  
  console.log(`✨ Capa temporal fusionada con ${tempLighterLayerId} en frame ${tempLighterFrameId}`);
}, [tempLighterCanvas, tempLighterLayerId, tempLighterFrameId, frames, getOrCreateCanvas, compositeRender]);

// ===== FUNCIÓN PARA FORZAR FUSIÓN MANUAL =====

const forceMergeLighterCanvas = useCallback(() => {
  if (tempLighterCanvas) {
    mergeTempLighterCanvas();
    console.log('💡 Capa de iluminación fusionada manualmente');
    return true;
  }
  return false;
}, [tempLighterCanvas, mergeTempLighterCanvas]);

// ===== FUNCIÓN PARA OBTENER INFO DE LIGHTER =====

const getLighterInfo = useCallback(() => {
  return {
    isActive: activeLighter,
    hasTempCanvas: !!tempLighterCanvas,
    targetLayerId: tempLighterLayerId,
    targetFrameId: tempLighterFrameId,
    canMerge: !!(tempLighterCanvas && tempLighterLayerId && tempLighterFrameId)
  };
}, [activeLighter, tempLighterCanvas, tempLighterLayerId, tempLighterFrameId]);


 // Viewport changes: render directo en el mismo frame que el CSS para evitar desync
 useEffect(() => {
  compositeRender();
}, [viewportOffset, compositeRender]);

 // Layer changes: rAF para no bloquear el hilo principal
 useEffect(() => {
  requestAnimationFrame(compositeRender);
}, [layers, compositeRender]);






// ===== SISTEMA DE UNDO/REDO — STACK UNIFICADO (v2) =====
//
// Diseño:
//  - historyRef: array de entradas, nunca causa re-renders. Max 200 entradas.
//  - historyIndexRef: posición actual en el stack (apunta a la última entrada aplicada).
//  - isRestoringRef: bloquea pushes durante undo/redo.
//  - historyVersion: estado mínimo solo para que canUndo/canRedo cambien en UI.
//
// Tipos de entrada:
//  - { type:'pixel_changes', layerId, frameId, timestamp, changes:{added,modified,removed} }
//  - { type:'frame_state', timestamp, ...framesResume }
//
// Merge automático de pixel_changes:
//  Pinceladas dentro de la misma capa, mismo frame y <300ms se fusionan en
//  una sola entrada, así Ctrl+Z deshace la pincelada completa, no píxel a píxel.

const historyRef = useRef([]);
const historyIndexRef = useRef(-1);
const isRestoringRef = useRef(false);
const framesResumeDebounceRef = useRef(null);

// Estado mínimo — solo para disparar re-render cuando canUndo/canRedo cambia.
const [historyVersion, setHistoryVersion] = useState(0);
const _bumpVersion = useCallback(() => setHistoryVersion(v => v + 1), []);

// ---- Merge de dos entradas pixel_changes ----
// Concatena los arrays en orden: undo/redo los recorre en sentido inverso/directo.
// No deduplicamos aquí para mantener la lógica simple y sin errores.
const _mergePixelEntries = (base, incoming) => {
  base.changes.added.push(...incoming.changes.added);
  base.changes.modified.push(...incoming.changes.modified);
  base.changes.removed.push(...incoming.changes.removed);
  base.timestamp = incoming.timestamp; // actualizar timestamp al último trazo
};

// ---- Push principal ----
const historyPush = useCallback((entry) => {
  if (isRestoringRef.current) return;

  const stack = historyRef.current;
  const idx = historyIndexRef.current;

  // Truncar el futuro si estamos en medio del stack
  if (idx < stack.length - 1) {
    stack.splice(idx + 1);
  }

  let entryToSave;

  if (entry && entry.type === 'pixel_changes') {
    // Intentar fusionar con la entrada anterior si es elegible
    const last = stack[stack.length - 1];
    if (
      last &&
      last.type === 'pixel_changes' &&
      last.layerId === entry.layerId &&
      last.frameId === entry.frameId &&
      entry.timestamp - last.timestamp < 300
    ) {
      _mergePixelEntries(last, entry);
      // No mover el índice ni cambiar la versión aquí — la entrada ya existe
      _bumpVersion();
      return;
    }
    entryToSave = entry;

  } else if (entry) {
    entryToSave = entry;

  } else {
    // Snapshot de framesResume para cambios estructurales
    if (!framesResume?.frames || Object.keys(framesResume.frames).length === 0) return;

    const snapshot = {
      ...structuredClone(framesResume),
      timestamp: Date.now(),
      type: 'frame_state',
    };

    // Evitar duplicados consecutivos de frame_state
    const last = stack[stack.length - 1];
    if (last?.type === 'frame_state') {
      const a = JSON.stringify({ frames: last.frames, layers: last.layers, metadata: last.metadata });
      const b = JSON.stringify({ frames: snapshot.frames, layers: snapshot.layers, metadata: snapshot.metadata });
      if (a === b) return;
    }

    entryToSave = snapshot;
  }

  stack.push(entryToSave);
  historyIndexRef.current = stack.length - 1;

  // Limitar a 200 entradas — eliminar las más antiguas
  if (stack.length > 200) {
    stack.shift();
    historyIndexRef.current = stack.length - 1;
  }

  _bumpVersion();
}, [framesResume, _bumpVersion]);

// ---- Firma estructural de framesResume ----
// Solo incluye campos que el usuario puede deshacer:
// layers, frames, visibilidad, opacidad, duración, nombre, orden, blend modes.
// EXCLUYE: layerHasContent, canvases, pixelGroups, computed
// (esos cambian al pintar y NO deben generar entradas de historial).
const lastStructuralSigRef = useRef(null);

const _getStructuralSig = (fr) => {
  if (!fr?.frames || !fr?.layers) return '';
  try {
    return JSON.stringify({
      fk: Object.keys(fr.frames).sort(),
      lk: Object.keys(fr.layers).sort(),
      ln: Object.fromEntries(Object.entries(fr.layers).map(([k, l]) => [k, l.name])),
      lz: Object.fromEntries(Object.entries(fr.layers).map(([k, l]) => [k, l.zIndex])),
      lp: Object.fromEntries(Object.entries(fr.layers).map(([k, l]) => [k, l.parentLayerId ?? null])),
      lb: Object.fromEntries(Object.entries(fr.layers).map(([k, l]) => [k, l.blendMode ?? 'normal'])),
      fv: Object.fromEntries(Object.entries(fr.frames).map(([k, f]) => [k, f.layerVisibility])),
      fo: Object.fromEntries(Object.entries(fr.frames).map(([k, f]) => [k, f.layerOpacity])),
      fd: Object.fromEntries(Object.entries(fr.frames).map(([k, f]) => [k, f.duration])),
      ft: Object.fromEntries(Object.entries(fr.frames).map(([k, f]) => [k, f.tags])),
      fbo: Object.fromEntries(Object.entries(fr.frames).map(([k, f]) => [k, f.layerBlendModeOverride ?? {}])),
      fc: fr.metadata?.frameCount,
    });
  } catch {
    return '';
  }
};

// ---- Detectar cambios ESTRUCTURALES en framesResume (debounced 80ms) ----
// Se ignoran cambios de layerHasContent/canvases/pixelGroups/computed para
// que los trazos de pintura no contaminen el stack con frame_states inútiles.
useEffect(() => {
  if (isRestoringRef.current) return;
  if (!framesResume?.frames || Object.keys(framesResume.frames).length === 0) return;

  const sig = _getStructuralSig(framesResume);
  if (sig === lastStructuralSigRef.current) return; // Solo metadata cambió — ignorar

  clearTimeout(framesResumeDebounceRef.current);
  framesResumeDebounceRef.current = setTimeout(() => {
    if (isRestoringRef.current) return;
    const currentSig = _getStructuralSig(framesResume);
    if (currentSig === lastStructuralSigRef.current) return;
    lastStructuralSigRef.current = currentSig;
    historyPush();
  }, 80);

  return () => clearTimeout(framesResumeDebounceRef.current);
}, [framesResume]); // historyPush excluido intencionalmente

// ---- Guardar cambios de píxeles en el stack ----
const savePixelChangesToStack = useCallback((changes, layerId, frameId) => {
  if (isRestoringRef.current) return;
  if (!changes || (changes.added.length === 0 && changes.modified.length === 0 && changes.removed.length === 0)) return;

  historyPush({
    id: nanoid(),
    timestamp: Date.now(),
    layerId,
    frameId,
    changes,
    type: 'pixel_changes',
  });
}, [historyPush]);

// ✅ MODIFICAR: Función logPixelChanges para incluir guardado en stack


// ---- Aplicar patch de píxeles al canvas (undo reverse=true, redo reverse=false) ----
// Antes leía/escribía TODO el canvas con getImageData/putImageData(0,0,w,h), lo
// que escalaba O(w*h) aunque el patch afectara 10 píxeles. Ahora computamos el
// bbox de los puntos tocados y operamos solo en esa sub-región.
const applyPixelChangesToCanvas = useCallback((changes, layerId, frameId, reverse = false) => {
  const frame = framesRef.current[frameId];
  if (!frame?.canvases[layerId]) return false;

  const canvas = frame.canvases[layerId];
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  // Calcular bbox de todos los puntos del patch
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const updateBbox = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  };
  updateBbox(changes.added);
  updateBbox(changes.modified);
  updateBbox(changes.removed);

  if (minX === Infinity) return true; // patch vacío, nada que aplicar

  const regionX = Math.max(0, minX);
  const regionY = Math.max(0, minY);
  const regionEndX = Math.min(canvas.width - 1, maxX);
  const regionEndY = Math.min(canvas.height - 1, maxY);
  const regionW = regionEndX - regionX + 1;
  const regionH = regionEndY - regionY + 1;
  if (regionW <= 0 || regionH <= 0) return true;

  const imageData = ctx.getImageData(regionX, regionY, regionW, regionH);
  const data = imageData.data;

  const idxAt = (x, y) => ((y - regionY) * regionW + (x - regionX)) * 4;
  const inRegion = (x, y) => x >= regionX && x <= regionEndX && y >= regionY && y <= regionEndY;

  if (reverse) {
    // Iterar en orden inverso para deshacer correctamente múltiples sub-patches mergeados
    for (let i = changes.removed.length - 1; i >= 0; i--) {
      const p = changes.removed[i];
      if (!inRegion(p.x, p.y)) continue;
      const idx = idxAt(p.x, p.y);
      data[idx] = p.color.r; data[idx+1] = p.color.g; data[idx+2] = p.color.b; data[idx+3] = p.color.a;
    }
    for (let i = changes.modified.length - 1; i >= 0; i--) {
      const p = changes.modified[i];
      if (!inRegion(p.x, p.y)) continue;
      const idx = idxAt(p.x, p.y);
      data[idx] = p.oldColor.r; data[idx+1] = p.oldColor.g; data[idx+2] = p.oldColor.b; data[idx+3] = p.oldColor.a;
    }
    for (let i = changes.added.length - 1; i >= 0; i--) {
      const p = changes.added[i];
      if (!inRegion(p.x, p.y)) continue;
      const idx = idxAt(p.x, p.y);
      data[idx] = 0; data[idx+1] = 0; data[idx+2] = 0; data[idx+3] = 0;
    }
  } else {
    changes.added.forEach(p => {
      if (!inRegion(p.x, p.y)) return;
      const idx = idxAt(p.x, p.y);
      data[idx] = p.color.r; data[idx+1] = p.color.g; data[idx+2] = p.color.b; data[idx+3] = p.color.a;
    });
    changes.modified.forEach(p => {
      if (!inRegion(p.x, p.y)) return;
      const idx = idxAt(p.x, p.y);
      data[idx] = p.newColor.r; data[idx+1] = p.newColor.g; data[idx+2] = p.newColor.b; data[idx+3] = p.newColor.a;
    });
    changes.removed.forEach(p => {
      if (!inRegion(p.x, p.y)) return;
      const idx = idxAt(p.x, p.y);
      data[idx] = 0; data[idx+1] = 0; data[idx+2] = 0; data[idx+3] = 0;
    });
  }

  ctx.putImageData(imageData, regionX, regionY);
  return true;
}, []);

// ---- Reconstruir frames desde un snapshot de framesResume, preservando canvases actuales ----
const syncFramesFromResume = useCallback((snapshot) => {
  if (!snapshot?.frames) return null;

  const currentCanvases = {};
  Object.keys(framesRef.current).forEach(k => {
    currentCanvases[Number(k)] = { ...framesRef.current[k].canvases };
  });

  const newFrames = {};
  Object.keys(snapshot.frames).forEach(frameKey => {
    const frameNumber = Number(frameKey);
    const resumeFrame = snapshot.frames[frameKey];

    const frameLayers = Object.keys(snapshot.layers).map(layerId => {
      const gl = snapshot.layers[layerId];
      return {
        id: layerId,
        name: gl.name,
        visible: { [frameNumber]: resumeFrame.layerVisibility[layerId] ?? true },
        opacity: resumeFrame.layerOpacity[layerId] ?? 1.0,
        zIndex: gl.zIndex,
        isGroupLayer: gl.type === 'group',
        parentLayerId: gl.parentLayerId || null,
        blendMode: gl.blendMode ?? 'normal',
        blendModeOverride: resumeFrame.layerBlendModeOverride?.[layerId] ?? null,
      };
    });

    const frameCanvases = {};
    frameLayers.forEach(layer => {
      frameCanvases[layer.id] =
        currentCanvases[frameNumber]?.[layer.id] ||
        resumeFrame.canvases?.[layer.id] ||
        getOrCreateCanvas(layer.id, frameNumber, true);
    });

    newFrames[frameNumber] = {
      layers: frameLayers,
      pixelGroups: resumeFrame.pixelGroups || {},
      canvases: frameCanvases,
      frameDuration: resumeFrame.duration || defaultFrameDuration,
      tags: resumeFrame.tags || [],
    };
  });

  return newFrames;
}, [frames, getOrCreateCanvas, defaultFrameDuration]);

// ---- Helpers de aplicación de frame_state ----
const _applyFrameSnapshot = useCallback((snapshot) => {
  isRestoringRef.current = true;
  setFramesResume(snapshot);
  const newFrames = syncFramesFromResume(snapshot);
  if (!newFrames) { isRestoringRef.current = false; return; }
  setFrames(newFrames);
  setFrameCount(Object.keys(newFrames).length);
  const nums = Object.keys(newFrames).map(Number);
  if (!nums.includes(currentFrame)) {
    setCurrentFrame(Math.min(...nums));
  } else {
    const fd = newFrames[currentFrame];
    setLayers(fd.layers);
    setPixelGroups(fd.pixelGroups);
    layerCanvasesRef.current = { ...fd.canvases };
  }
  setTimeout(() => { isRestoringRef.current = false; }, 100);
}, [syncFramesFromResume, currentFrame]);

// ---- setActiveFrame (necesario para varios lugares) ----
const setActiveFrame = useCallback((frameNumber) => {
  if (frameNumber === currentFrame) return true;
  if (!frames[frameNumber]) return false;

  const frameData = frames[frameNumber];
  frameData.layers.forEach(layer => {
    if (!frameData.canvases[layer.id]) {
      frameData.canvases[layer.id] = getOrCreateCanvas(layer.id, frameNumber, true);
    }
  });
  setLayers(frameData.layers);
  setPixelGroups(frameData.pixelGroups);
  layerCanvasesRef.current = frameData.canvases;
  setCurrentFrame(frameNumber);

  const visibleLayers = frameData.layers.filter(l => !l.isGroupLayer && l.visible[frameNumber] !== false);
  const target = visibleLayers[0] ?? frameData.layers[0];
  if (target && target.id !== activeLayerId) setActiveLayerId(target.id);

  requestAnimationFrame(compositeRender);
  return true;
}, [currentFrame, frames, getOrCreateCanvas, activeLayerId, compositeRender]);

// ---- UNDO ----
const undo = useCallback(() => {
  const stack = historyRef.current;
  const idx = historyIndexRef.current;

  // idx=0 es el estado inicial — nada que deshacer
  if (idx < 1) return false;

  const entry = stack[idx];
  isRestoringRef.current = true;

  if (entry.type === 'pixel_changes') {
    // Deshacer trazo: revertir los píxeles en el canvas
    const frame = framesRef.current[entry.frameId];
    if (frame?.canvases[entry.layerId]) {
      applyPixelChangesToCanvas(entry.changes, entry.layerId, entry.frameId, true);
      if (entry.frameId === currentFrame) requestAnimationFrame(compositeRender);
    }
    setTimeout(() => { isRestoringRef.current = false; }, 100);

  } else if (entry.type === 'frame_state') {
    // Deshacer cambio estructural: restaurar el snapshot anterior al actual.
    // Los pixel_changes entre dos FS no se tocan — se deshacen uno a uno
    // cuando el usuario sigue presionando Ctrl+Z.
    let prevSnapshot = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (stack[i].type === 'frame_state') { prevSnapshot = stack[i]; break; }
    }
    if (prevSnapshot) {
      _applyFrameSnapshot(prevSnapshot);
    } else {
      setTimeout(() => { isRestoringRef.current = false; }, 100);
    }
  }

  historyIndexRef.current = idx - 1;
  _bumpVersion();
  return true;
}, [currentFrame, applyPixelChangesToCanvas, compositeRender, _applyFrameSnapshot, _bumpVersion]);

// ---- REDO ----
const redo = useCallback(() => {
  const stack = historyRef.current;
  const idx = historyIndexRef.current;
  if (idx >= stack.length - 1) return false;

  const nextIdx = idx + 1;
  const entry = stack[nextIdx];
  isRestoringRef.current = true;

  if (entry.type === 'pixel_changes') {
    const frame = framesRef.current[entry.frameId];
    if (frame?.canvases[entry.layerId]) {
      applyPixelChangesToCanvas(entry.changes, entry.layerId, entry.frameId, false);
      if (entry.frameId === currentFrame) requestAnimationFrame(compositeRender);
    }
    setTimeout(() => { isRestoringRef.current = false; }, 100);

  } else if (entry.type === 'frame_state') {
    _applyFrameSnapshot(entry);
  }

  historyIndexRef.current = nextIdx;
  _bumpVersion();
  return true;
}, [currentFrame, applyPixelChangesToCanvas, compositeRender, _applyFrameSnapshot, _bumpVersion]);

// ---- Alias y compatibilidad con el resto del codebase ----
const undoFrames = undo;
const redoFrames = redo;
const undoPixelChanges = undo;
const redoPixelChanges = redo;
const undoComplete = undo;
const redoComplete = redo;

// canUndo/canRedo — se recalculan cada vez que historyVersion cambia
const canUndo = historyIndexRef.current > 0;
const canRedo = historyIndexRef.current < historyRef.current.length - 1;
const canUndoComplete = canUndo;
const canRedoComplete = canRedo;
const canUndoPixels = canUndo;
const canRedoPixels = canRedo;
const canUndoFrames = canUndo;
const canRedoFrames = canRedo;

// history expuesto como vista de solo lectura (sin causar re-renders)
const history = historyRef.current;
const currentIndex = historyIndexRef.current;

const clearAllHistory = useCallback(() => {
  historyRef.current = [];
  historyIndexRef.current = -1;
  _bumpVersion();
}, [_bumpVersion]);

const getCompleteDebugInfo = useCallback(() => ({
  historyLength: historyRef.current.length,
  currentIndex: historyIndexRef.current,
  canUndo,
  canRedo,
}), [canUndo, canRedo]);

const getChangePreview = useCallback(() => {
  const idx = historyIndexRef.current;
  const stack = historyRef.current;
  return {
    current: stack[idx] ?? null,
    next: stack[idx + 1] ?? null,
    previous: stack[idx - 1] ?? null,
  };
}, []);

// ===================== FIN SISTEMA UNDO/REDO ====================================//


// 3. FUNCIÓN PARA RENDERIZAR UN FRAME COMO CAPA

  // Initialize the composite canvas
  useEffect(() => {
    if (compositeCanvasRef.current) {
      compositeCanvasRef.current.width = Math.round(viewportWidth * zoom);
      compositeCanvasRef.current.height = Math.round(viewportHeight * zoom);
      
      const ctx = compositeCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
      }
    
      requestAnimationFrame(compositeRender);
    }
  }, [viewportWidth, viewportHeight, zoom, compositeRender]);
  
  /**
   * Render all visible layers to the composite canvas
   */
  // 6. MODIFICAR LA FUNCIÓN compositeRender para respetar la jerarquía

  

  //AQui mejor estamos probando la nueva funcion de composite render






 
  
  /**
   * Add a new layer
   */
//logica especial para manejar las capas de grupos: 
// Dentro de useLayerManager:
// 2. MODIFICAR LA FUNCIÓN addGroupLayer
const addGroupLayer = useCallback((parentLayerId) => {
  const newLayerId = nanoid();
  
  const newLayer = {
    id: newLayerId,
    name: `Grupo Layer ${layers.length + 1}`,
    visible: true,
    zIndex: Math.max(...layers.map(l => l.zIndex)) + 1,
    isGroupLayer: true,
    parentLayerId: parentLayerId, // Nueva propiedad para vincular con la capa padre
    children: [] // Para futuras subcapas si es necesario
  };

  // Crear canvas para esta capa
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  layerCanvasesRef.current[newLayerId] = canvas;

  // Agregar la nueva capa a la estructura
  setLayers(prev => {
    return prev.map(layer => {
      // Si esta es la capa padre, agregar el ID del grupo a sus children
      if (layer.id === parentLayerId) {
        return {
          ...layer,
          children: [...(layer.children || []), newLayerId]
        };
      }
      return layer;
    }).concat([newLayer]); // Agregar la nueva capa al final
  });

  return newLayerId;
}, [layers, width, height]);



// ✅ VERSIÓN CORREGIDA de addLayer - Sin duplicación de variables

const addLayer = useCallback(() => {
  const newLayerId = nanoid();
  const highestZIndex = layers.length > 0
    ? Math.max(...layers.map(layer => layer.zIndex))
    : -1;

  const baseLayer = {
    id: newLayerId,
    name: `Layer ${layers.length + 1}`,
    visible: {},
    zIndex: highestZIndex + 1,
    blendMode: 'normal',
    blendModeOverride: null,
  };

  const updatedFrames = { ...frames };
  const currentFrameData = updatedFrames[currentFrame];
  
  if (currentFrameData) {
    const currentFrameLayer = {
      ...baseLayer,
      visible: {
        ...baseLayer.visible,
        [currentFrame]: true
      }
    };
    
    currentFrameData.layers.push(currentFrameLayer);
    currentFrameData.canvases[newLayerId] = getOrCreateCanvas(newLayerId, currentFrame, true);
    
    if (!currentFrameData.pixelGroups[newLayerId]) {
      currentFrameData.pixelGroups[newLayerId] = {};
    }
  }

  Object.keys(updatedFrames).forEach(frameKey => {
    if (frameKey === currentFrame.toString()) return;
    
    const frame = updatedFrames[frameKey];
    const frameLayer = {
      ...baseLayer,
      visible: {
        ...baseLayer.visible,
        [frameKey]: true
      }
    };
    
    frame.layers.push(frameLayer);
    
    if (!frame.pixelGroups[newLayerId]) {
      frame.pixelGroups[newLayerId] = {};
    }
  });

  setFramesResume(prev => produce(prev, draft => {
    draft.layers[newLayerId] = {
      id: newLayerId,
      name: `Layer ${Object.keys(prev.layers).length + 1}`,
      type: 'normal',
      parentLayerId: null,
      zIndex: highestZIndex + 1,
      blendMode: 'normal',
      locked: false,
    };

    Object.keys(draft.frames).forEach(frameKey => {
      const frame = draft.frames[frameKey];
      frame.layerVisibility[newLayerId] = true;
      frame.layerOpacity[newLayerId] = 1.0;
      frame.layerHasContent[newLayerId] = false;
    });

    draft.computed.framesByLayer[newLayerId] = [];
    draft.computed.keyframes[newLayerId] = [];
    Object.keys(draft.computed.resolvedFrames).forEach(frameKey => {
      draft.computed.resolvedFrames[frameKey].layerVisibility[newLayerId] = true;
      draft.computed.resolvedFrames[frameKey].layerOpacity[newLayerId] = 1.0;
      draft.computed.resolvedFrames[frameKey].layerHasContent[newLayerId] = false;
    });
  }));

  setFrames(updatedFrames);

  if (currentFrameData) {
    // IMPORTANTE: arriba se hizo `currentFrameData.layers.push(...)` (mutación
    // in-place). Pasar esa MISMA ref a setLayers haría que React bail-out por
    // Object.is(prev, next) — y consumers memoizados sobre [layers] no
    // recomputarían (ej: `orderedLayers` en timeline.jsx). Clonar aquí.
    setLayers([...currentFrameData.layers]);
    layerCanvasesRef.current[newLayerId] = currentFrameData.canvases[newLayerId];
  }

  // ✅ FIX: Establecer la nueva capa como activa
  setActiveLayerId(newLayerId);

  return newLayerId;
}, [layers, width, height, frames, currentFrame, getOrCreateCanvas]);
  /**
   * Delete a layer by ID
   */
  const deleteLayer = useCallback((layerId) => {
    const mainLayers = layers.filter(layer => !layer.isGroupLayer);
    if (mainLayers.length <= 1 && mainLayers.some(layer => layer.id === layerId)) {
      return;
    }
  
    const layerToDelete = layers.find(layer => layer.id === layerId);
    if (!layerToDelete) return;
  
    // Actualizar todos los frames
    const updatedFrames = { ...frames };
    Object.keys(updatedFrames).forEach(frameKey => {
      const frameData = updatedFrames[frameKey];
      
      // Si es una capa principal, eliminar también sus capas de grupo
      if (!layerToDelete.isGroupLayer) {
        const groupLayersToDelete = frameData.layers.filter(layer =>
          layer.isGroupLayer && layer.parentLayerId === layerId
        );
        
        // Eliminar canvas de todas las capas relacionadas
        groupLayersToDelete.forEach(groupLayer => {
          delete frameData.canvases[groupLayer.id];
          delete frameData.pixelGroups[groupLayer.id];
        });
      }
  
      // Eliminar el canvas de la capa principal
      delete frameData.canvases[layerId];
      delete frameData.pixelGroups[layerId];
  
      // Remover la capa y todas sus capas de grupo del frame
      frameData.layers = frameData.layers.filter(layer => {
        if (layer.id === layerId) return false;
        if (layer.isGroupLayer && layer.parentLayerId === layerId) return false;
        return true;
      });
    });
  
    setFramesResume(prev => produce(prev, draft => {
      delete draft.layers[layerId];
      if (!layerToDelete.isGroupLayer) {
        Object.keys(draft.layers).forEach(id => {
          const layer = draft.layers[id];
          if (layer.type === 'group' && layer.parentLayerId === layerId) {
            delete draft.layers[id];
          }
        });
      }
      Object.keys(draft.frames).forEach(frameKey => {
        const frame = draft.frames[frameKey];
        delete frame.layerVisibility[layerId];
        delete frame.layerOpacity[layerId];
        delete frame.layerHasContent[layerId];
        delete frame.canvases[layerId];
        delete frame.pixelGroups[layerId];
      });
      delete draft.computed.framesByLayer[layerId];
      delete draft.computed.keyframes[layerId];
      Object.keys(draft.computed.resolvedFrames).forEach(frameKey => {
        const resolved = draft.computed.resolvedFrames[frameKey];
        delete resolved.layerVisibility[layerId];
        delete resolved.layerOpacity[layerId];
        delete resolved.layerHasContent[layerId];
      });
    }));
  
    setFrames(updatedFrames);
    
    // Actualizar el estado actual
    const currentFrameData = updatedFrames[currentFrame];
    setLayers(currentFrameData.layers);
    
    // Actualizar las referencias de canvas actuales
    Object.keys(layerCanvasesRef.current).forEach(id => {
      if (!currentFrameData.canvases[id]) {
        delete layerCanvasesRef.current[id];
      }
    });
    
    Object.assign(layerCanvasesRef.current, currentFrameData.canvases);
  
  }, [layers, frames, currentFrame]);
  
  /**
   * Move a layer up in the stack (increase zIndex)
   */
  // 9. MODIFICAR LA FUNCIÓN moveLayerUp para manejar jerarquía
  const moveLayerUp = useCallback((layerId) => {
    setFrames(prevFrames => {
      const updatedFrames = { ...prevFrames };
      const currentFrameData = updatedFrames[currentFrame];
      
      if (!currentFrameData) return prevFrames;
  
      // Obtener la capa a mover
      const layer = currentFrameData.layers.find(l => l.id === layerId);
      if (!layer) return prevFrames;
  
      // Detectar si es una capa de grupo
      const isGroupLayer = layer.isGroupLayer;
      const parentLayerId = layer.parentLayerId;
  
      // Obtener la lista de capas del frame actual relevantes
      const relevantLayers = currentFrameData.layers
        .filter(l => isGroupLayer
          ? l.isGroupLayer && l.parentLayerId === parentLayerId
          : !l.isGroupLayer
        )
        .sort((a, b) => a.zIndex - b.zIndex);
  
      const currentIndex = relevantLayers.findIndex(l => l.id === layerId);
      if (currentIndex === relevantLayers.length - 1) return prevFrames;
  
      const layerAbove = relevantLayers[currentIndex + 1];
  
      // Guardar los nuevos zIndex para las dos capas
      const zIndexMap = {
        [layerId]: layerAbove.zIndex,
        [layerAbove.id]: layer.zIndex
      };
  
      // Aplicar el cambio de zIndex a todos los frames
      Object.keys(updatedFrames).forEach(frameKey => {
        const frame = updatedFrames[frameKey];
  
        frame.layers = frame.layers.map(l => {
          if (zIndexMap[l.id] !== undefined) {
            return { ...l, zIndex: zIndexMap[l.id] };
          }
          return l;
        });
      });
  
      return updatedFrames;
    });
  
    setFramesResume(prev => {
      const layer = prev.layers[layerId];
      if (!layer) return prev;
      const relevantLayers = Object.values(prev.layers)
        .filter(l => layer.type === 'group'
          ? l.type === 'group' && l.parentLayerId === layer.parentLayerId
          : l.type === 'normal'
        )
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = relevantLayers.findIndex(l => l.id === layerId);
      if (currentIndex === relevantLayers.length - 1) return prev;
      const layerAbove = relevantLayers[currentIndex + 1];
      return produce(prev, draft => {
        draft.layers[layerId].zIndex = layerAbove.zIndex;
        draft.layers[layerAbove.id].zIndex = layer.zIndex;
      });
    });
  }, [currentFrame]);
  
// Función para crear un nuevo frame
const createFrame = useCallback((mode = "newContent", customDuration = null, sourceFrameNumber = null) => {
  const insertAt = currentFrame + 1;
  const sourceFrame = frames[sourceFrameNumber ?? currentFrame];
  if (!sourceFrame) return null;

  let newFrameData;

  if (mode === "duplicate") {
    newFrameData = {
      layers: sourceFrame.layers.map(layer => {
        const currentVisibility = layer.visible[sourceFrameNumber ?? currentFrame] ?? true;
        return {
          ...layer,
          visible: {
            ...layer.visible,
            [insertAt]: currentVisibility
          }
        };
      }),
      pixelGroups: structuredClone(sourceFrame.pixelGroups),
      canvases: {}, // ✅ Se llenará abajo con canvas duplicados
      frameDuration: sourceFrame.frameDuration,
      tags: [...(sourceFrame.tags || [])]
    };

    // ✅ FIX CRÍTICO: Duplicar REALMENTE el contenido de los canvas
    sourceFrame.layers.forEach(layer => {
      const sourceCanvas = sourceFrame.canvases[layer.id];
      if (sourceCanvas) {
        // Crear nuevo canvas con el mismo tamaño
        const newCanvas = document.createElement('canvas');
        newCanvas.width = sourceCanvas.width;
        newCanvas.height = sourceCanvas.height;
        
        const newCtx = newCanvas.getContext('2d');
        newCtx.imageSmoothingEnabled = false;
        
        // ✅ COPIAR PIXEL POR PIXEL el contenido del canvas original
        newCtx.drawImage(sourceCanvas, 0, 0);
        
        // Guardar el nuevo canvas
        newFrameData.canvases[layer.id] = newCanvas;
      } else {
        // Si no existe canvas, crear uno vacío
        newFrameData.canvases[layer.id] = getOrCreateCanvas(layer.id, insertAt, true);
      }
    });

  } else if (mode === "newContent") {
    newFrameData = {
      layers: sourceFrame.layers.map(layer => ({
        ...layer,
        visible: {
          ...layer.visible,
          [insertAt]: true
        }
      })),
      pixelGroups: {},
      canvases: {},
      frameDuration: customDuration ?? defaultFrameDuration,
      tags: []
    };

    // Para contenido nuevo, crear canvas vacíos
    sourceFrame.layers.forEach(layer => {
      newFrameData.pixelGroups[layer.id] = {};
      newFrameData.canvases[layer.id] = getOrCreateCanvas(layer.id, insertAt, true);
    });
  }

  // ✅ AGREGAR: Actualizar framesResume ANTES de setFrames
  setFramesResume(prev => produce(prev, draft => {
    const sourceFrameResume = prev.frames[sourceFrameNumber ?? currentFrame];

    // Shiftar frames existentes en framesResume (N ≥ insertAt → N+1).
    // Con produce, podemos mutar draft directamente — Immer crea estructuras
    // nuevas para las branches tocadas y conserva refs en las no tocadas.
    const framesToShift = {};
    Object.keys(draft.frames).forEach(frameKey => {
      const num = Number(frameKey);
      if (num >= insertAt) {
        framesToShift[num + 1] = draft.frames[frameKey];
        delete draft.frames[frameKey];
      }
    });
    Object.assign(draft.frames, framesToShift);

    // Crear nuevo frame en framesResume
    if (mode === "duplicate") {
      draft.frames[insertAt] = {
        layerVisibility: { ...sourceFrameResume.layerVisibility },
        layerOpacity: { ...sourceFrameResume.layerOpacity },
        layerHasContent: { ...sourceFrameResume.layerHasContent },
        canvases: {},
        pixelGroups: structuredClone(sourceFrameResume.pixelGroups),
        duration: sourceFrameResume.duration,
        tags: [...(sourceFrameResume.tags || [])],
      };
    } else {
      draft.frames[insertAt] = {
        layerVisibility: { ...sourceFrameResume.layerVisibility },
        layerOpacity: { ...sourceFrameResume.layerOpacity },
        layerHasContent: Object.fromEntries(
          Object.keys(draft.layers).map(layerId => [layerId, false])
        ),
        canvases: {},
        pixelGroups: {},
        duration: customDuration ?? defaultFrameDuration,
        tags: [],
      };
    }

    // Metadata
    draft.metadata.frameCount += 1;
    draft.metadata.totalDuration = Object.values(draft.frames)
      .reduce((sum, frame) => sum + frame.duration, 0);

    // Recalcular computed
    draft.computed.frameSequence = Object.keys(draft.frames)
      .map(Number).sort((a, b) => a - b);
    draft.computed.totalFrames = draft.computed.frameSequence.length;

    // Shiftar resolvedFrames + crear el nuevo
    const prevResolved = draft.computed.resolvedFrames;
    const newResolvedFrames = {};
    Object.keys(prevResolved).forEach(frameKey => {
      const num = Number(frameKey);
      if (num >= insertAt) {
        newResolvedFrames[num + 1] = prevResolved[frameKey];
      } else {
        newResolvedFrames[frameKey] = prevResolved[frameKey];
      }
    });
    newResolvedFrames[insertAt] = {
      layerVisibility: { ...draft.frames[insertAt].layerVisibility },
      layerOpacity: { ...draft.frames[insertAt].layerOpacity },
      layerHasContent: { ...draft.frames[insertAt].layerHasContent },
    };
    draft.computed.resolvedFrames = newResolvedFrames;
  }));

  // Actualizar numeración de frames existentes
  setFrames(prev => {
    const updated = {};

    Object.keys(prev)
      .map(Number)
      .sort((a, b) => b - a)
      .forEach(frameNum => {
        const num = Number(frameNum);
        if (num >= insertAt) {
          const shiftedFrame = {
            ...prev[num],
            layers: prev[num].layers.map(layer => {
              const newVisible = {};
              Object.entries(layer.visible).forEach(([key, value]) => {
                const keyNum = Number(key);
                newVisible[keyNum >= insertAt ? keyNum + 1 : keyNum] = value;
              });
              return {
                ...layer,
                visible: newVisible
              };
            })
          };
          updated[num + 1] = shiftedFrame;
        } else {
          updated[num] = prev[num];
        }
      });

    updated[insertAt] = newFrameData;
    return updated;
  });

  setFrameCount(prev => prev + 1);
  setCurrentFrame(insertAt);
  return insertAt;
}, [frames, currentFrame, width, height, defaultFrameDuration, getOrCreateCanvas]);



// Función para eliminar un frame
const deleteFrame = useCallback((frameNumber) => {
  if (frameCount <= 1) return false;

  const numbersToDelete = Array.isArray(frameNumber)
    ? frameNumber.map(Number)
    : [Number(frameNumber)];

  // Validar que todos existan
  const validNumbers = numbersToDelete.filter(num => frames[num]);
  if (validNumbers.length === 0) return false;

  setFramesResume(prev => produce(prev, draft => {
    validNumbers.forEach(num => {
      delete draft.frames[num];
      delete draft.computed.resolvedFrames[num];
    });

    // Renumerar frames restantes (1-based, secuencial)
    const remainingFrames = {};
    const remainingResolved = {};
    Object.keys(draft.frames)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((num, index) => {
        const newFrameNumber = index + 1;
        remainingFrames[newFrameNumber] = draft.frames[num];
        remainingResolved[newFrameNumber] = draft.computed.resolvedFrames[num];
      });

    draft.frames = remainingFrames;
    draft.computed.resolvedFrames = remainingResolved;

    draft.metadata.frameCount = Object.keys(remainingFrames).length;
    draft.metadata.totalDuration = Object.values(remainingFrames)
      .reduce((sum, frame) => sum + frame.duration, 0);

    draft.computed.frameSequence = Object.keys(remainingFrames)
      .map(Number).sort((a, b) => a - b);
    draft.computed.totalFrames = draft.computed.frameSequence.length;

    Object.keys(draft.layers).forEach(layerId => {
      draft.computed.framesByLayer[layerId] = [];
      draft.computed.keyframes[layerId] = [];
      Object.keys(remainingFrames).forEach(frameKey => {
        if (remainingFrames[frameKey].layerHasContent[layerId]) {
          draft.computed.framesByLayer[layerId].push(Number(frameKey));
        }
      });
    });
  }));

  // 1. Convertir frames a array y filtrar los que no se eliminarán
  const framesArray = Object.entries(frames)
    .filter(([num]) => !validNumbers.includes(Number(num)))
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  // 2. Recrear el objeto de frames con numeración secuencial
  const newFrames = {};
  framesArray.forEach(([_, frameData], index) => {
    const newFrameNumber = index + 1;
    newFrames[newFrameNumber] = frameData;

    // 3. Actualizar visibilidad en las capas
    if (frameData.layers) {
      newFrames[newFrameNumber].layers = frameData.layers.map(layer => {
        const newVisible = {};
        Object.entries(layer.visible || {}).forEach(([fNum, isVisible]) => {
          let num = Number(fNum);
          const countBefore = validNumbers.filter(del => del < num).length;
          if (!validNumbers.includes(num)) {
            newVisible[num - countBefore] = isVisible;
          }
        });
        return { ...layer, visible: newVisible };
      });
    }
  });

  // 4. Determinar el nuevo frame actual
  let newCurrentFrame = currentFrame;
  const deletedCurrent = validNumbers.includes(currentFrame);

  if (deletedCurrent) {
    newCurrentFrame = Math.min(currentFrame, framesArray.length) || 1;
  } else {
    const countBefore = validNumbers.filter(num => num < currentFrame).length;
    newCurrentFrame = currentFrame - countBefore;
  }

  // 5. Actualizar estados
  setFrames(newFrames);
  setFrameCount(Object.keys(newFrames).length);
  if (newCurrentFrame !== currentFrame) {
    setActiveFrame(newCurrentFrame);
  }

  return true;
}, [frames, currentFrame, frameCount, setActiveFrame]);

const duplicateLayer = useCallback((layerId) => {
  const originalLayer = layers.find(layer => layer.id === layerId);
  if (!originalLayer) return null;

  const newLayerId = nanoid();
  const newLayerName = `${originalLayer.name} (copia)`;
  const highestZIndex = layers.length > 0
    ? Math.max(...layers.map(layer => layer.zIndex))
    : -1;

  const baseLayer = {
    ...originalLayer,
    id: newLayerId,
    name: newLayerName,
    visible: {}, // Se llenará por frame
    zIndex: highestZIndex + 1,
    blendMode: originalLayer.blendMode ?? 'normal',
    blendModeOverride: null, // default; cada frame copia su override del original abajo
  };

  const updatedFrames = { ...frames };

  Object.keys(updatedFrames).forEach(frameKey => {
    const frame = updatedFrames[frameKey];
    const originalLayerInFrame = frame.layers.find(l => l.id === layerId);
    if (!originalLayerInFrame) return;

    // Capa duplicada solo para este frame.
    // Spec: la copia hereda blendModeOverride por frame del original.
    const duplicatedLayer = {
      ...baseLayer,
      visible: {
        ...baseLayer.visible,
        [frameKey]: true
      },
      blendModeOverride: originalLayerInFrame.blendModeOverride ?? null,
    };

    frame.layers.push(duplicatedLayer);

    // Canvas duplicado
    const originalCanvas = frame.canvases[layerId];
    if (originalCanvas) {
      const newCanvas = document.createElement('canvas');
      newCanvas.width = originalCanvas.width;
      newCanvas.height = originalCanvas.height;
      const ctx = newCanvas.getContext('2d');
      ctx.drawImage(originalCanvas, 0, 0);
      frame.canvases[newLayerId] = newCanvas;
    }

    // PixelGroups
    if (frame.pixelGroups[layerId]) {
      frame.pixelGroups[newLayerId] = { ...frame.pixelGroups[layerId] };
    }
  });

  setFramesResume(prev => produce(prev, draft => {
    draft.layers[newLayerId] = {
      id: newLayerId,
      name: newLayerName,
      type: originalLayer.isGroupLayer ? 'group' : 'normal',
      parentLayerId: originalLayer.parentLayerId || null,
      zIndex: highestZIndex + 1,
      blendMode: originalLayer.blendMode ?? 'normal',
      locked: false,
    };
    Object.keys(draft.frames).forEach(frameKey => {
      const frame = draft.frames[frameKey];
      const originalHasContent = frame.layerHasContent[layerId] ?? false;
      frame.layerVisibility[newLayerId] = true;
      frame.layerOpacity[newLayerId] = frame.layerOpacity[layerId] ?? 1.0;
      frame.layerHasContent[newLayerId] = originalHasContent;
      if (frame.pixelGroups[layerId]) {
        frame.pixelGroups[newLayerId] = structuredClone(frame.pixelGroups[layerId]);
      }
      // Sembrar override de blend mode por frame: sin esto el siguiente
      // ciclo de undo (syncFramesFromResume) perdería el override duplicado.
      const originalOverride = frame.layerBlendModeOverride?.[layerId];
      if (originalOverride != null) {
        if (!frame.layerBlendModeOverride) frame.layerBlendModeOverride = {};
        frame.layerBlendModeOverride[newLayerId] = originalOverride;
      }
    });
    draft.computed.framesByLayer[newLayerId] = [...(draft.computed.framesByLayer[layerId] || [])];
    draft.computed.keyframes[newLayerId] = [...(draft.computed.keyframes[layerId] || [])];
    Object.keys(draft.computed.resolvedFrames).forEach(frameKey => {
      const resolved = draft.computed.resolvedFrames[frameKey];
      resolved.layerVisibility[newLayerId] = true;
      resolved.layerOpacity[newLayerId] = resolved.layerOpacity[layerId] ?? 1.0;
      resolved.layerHasContent[newLayerId] = resolved.layerHasContent[layerId] ?? false;
    });
  }));

  setFrames(updatedFrames);

  const currentFrameData = updatedFrames[currentFrame];
  // Clonar (ver comentario en addLayer): `frame.layers.push(...)` arriba
  // mutó in-place, la misma ref haría bail-out en setLayers.
  setLayers([...currentFrameData.layers]);
  layerCanvasesRef.current[newLayerId] = currentFrameData.canvases[newLayerId];

  return newLayerId;
}, [layers, frames, currentFrame]);



// Función para duplicar un frame específico
const duplicateFrame = useCallback((frameNumber) => {
  const numbersToDuplicate = Array.isArray(frameNumber)
    ? frameNumber.map(Number).reverse()
    : [Number(frameNumber)];

  const results = [];

  for (const num of numbersToDuplicate) {
    if (!frames[num]) continue;
    
    // ✅ CORREGIDO: Solo llamar a createFrame - ya maneja framesResume completo
    // Se eliminó toda la sección de actualización de framesResume que causaba duplicación
    const duplicated = createFrame("duplicate", frames[num].frameDuration, num);
    results.push(duplicated);
  }

  return Array.isArray(frameNumber) ? results : results[0] || null;
}, [frames, createFrame]);


// Función para guardar el estado actual del frame
const saveCurrentFrameState = useCallback(() => {
  if (!frames[currentFrame]) return;

  const updatedFrames = { ...frames };
  updatedFrames[currentFrame] = {
    ...updatedFrames[currentFrame],
    layers: [...layers],
    pixelGroups: { ...pixelGroups },
    canvases: { ...layerCanvasesRef.current }
  };

  setFrames(updatedFrames);
}, [frames, currentFrame, layers, pixelGroups]);

// Función para obtener información de todos los frames
const getFramesInfo = useCallback(() => {
  return {
    frames: Object.keys(frames).map(Number).sort((a, b) => a - b),
    currentFrame,
    totalFrames: frameCount,
    frameData: frames,
    frameDurations: Object.fromEntries(
      Object.entries(frames).map(([num, data]) => [num, data.frameDuration])
    )
  };
}, [frames, currentFrame, frameCount]);

// Función para renombrar un frame (opcional)
const renameFrame = useCallback((frameNumber, newName) => {
  if (!frames[frameNumber]) return false;

  const updatedFrames = { ...frames };
  updatedFrames[frameNumber] = {
    ...updatedFrames[frameNumber],
    name: newName
  };

  setFrames(updatedFrames);
  return true;
}, [frames]);

//Funciones para gestionar opacidad de los frames======================================================//

const setFrameOpacity = useCallback((layerId, frameNumbers, opacity) => {
  if (opacity < 0 || opacity > 1) return false;

  const frameList = Array.isArray(frameNumbers)
    ? frameNumbers.map(String)
    : [String(frameNumbers)];

  setFrames(prevFrames => {
    const updatedFrames = { ...prevFrames };

    frameList.forEach(frameKey => {
      const frame = updatedFrames[frameKey];
      if (!frame) return;

      const newLayers = frame.layers.map(layer => {
        if (layer.id !== layerId) return layer;
        return {
          ...layer,
          opacity
        };
      });

      updatedFrames[frameKey] = {
        ...frame,
        layers: newLayers
      };
    });

    return updatedFrames;
  });

  setFramesResume(prev => produce(prev, draft => {
    frameList.forEach(frameKey => {
      if (draft.frames[frameKey]) {
        draft.frames[frameKey].layerOpacity[layerId] = opacity;
        draft.computed.resolvedFrames[frameKey].layerOpacity[layerId] = opacity;
      }
    });
  }));

  return true;
}, []);



const getFrameOpacity = useCallback((layerId, frameNumber) => {
  const frame = frames[String(frameNumber)];
  if (!frame) return 1;

  const layer = frame.layers.find(l => l.id === layerId);
  return layer?.opacity ?? 1;
}, [frames]);


// (resolveLayerBlendMode movido arriba de renderCurrentFrameOnly por TDZ —
// los renders lo referencian en sus deps arrays. Ver linea ~700.)

// Escritura — modo de capa global, afecta a TODOS los frames.
// Snapshot único en el historial gracias al setFrames batch.
const setLayerBlendMode = useCallback((layerId, mode) => {
  if (!isValidBlendMode(mode)) {
    console.warn(`[blendMode] modo invalido: ${mode}`);
    return false;
  }
  setFrames(prevFrames => {
    const updated = { ...prevFrames };
    Object.keys(updated).forEach(frameKey => {
      const frame = updated[frameKey];
      const newLayers = frame.layers.map(layer => {
        if (layer.id !== layerId) return layer;
        return { ...layer, blendMode: mode };
      });
      updated[frameKey] = { ...frame, layers: newLayers };
    });
    return updated;
  });
  setFramesResume(prev => produce(prev, draft => {
    if (draft.layers[layerId]) {
      draft.layers[layerId].blendMode = mode;
    }
  }));
  return true;
}, []);

// Escritura — override solo en un frame. mode === null limpia el override.
const setFrameBlendModeOverride = useCallback((layerId, frameNumber, mode) => {
  if (mode !== null && !isValidBlendMode(mode)) {
    console.warn(`[blendMode] override invalido: ${mode}`);
    return false;
  }
  const frameKey = String(frameNumber);
  setFrames(prevFrames => {
    const frame = prevFrames[frameKey];
    if (!frame) return prevFrames;
    const newLayers = frame.layers.map(layer => {
      if (layer.id !== layerId) return layer;
      return { ...layer, blendModeOverride: mode };
    });
    return {
      ...prevFrames,
      [frameKey]: { ...frame, layers: newLayers },
    };
  });
  setFramesResume(prev => produce(prev, draft => {
    const fr = draft.frames[frameKey];
    if (!fr) return;
    if (!fr.layerBlendModeOverride) fr.layerBlendModeOverride = {};
    if (mode === null) {
      delete fr.layerBlendModeOverride[layerId];
    } else {
      fr.layerBlendModeOverride[layerId] = mode;
    }
  }));
  return true;
}, []);



//Funciones para gestionar opacidad de los frames======================================================//


//Funciones para gestionar el tiempo de los frames======================================================//
const setFrameDuration = useCallback((frameNumbers, duration) => {
  if (duration <= 0) return false;

  const numbers = Array.isArray(frameNumbers) ? frameNumbers : [frameNumbers];

  const validNumbers = numbers.filter(num => frames[num]);

  if (validNumbers.length === 0) return false;

  setFrames(prev => {
    const updated = { ...prev };
    validNumbers.forEach(num => {
      updated[num] = {
        ...updated[num],
        frameDuration: duration,
      };
    });
    return updated;
  });

  setFramesResume(prev => produce(prev, draft => {
    validNumbers.forEach(num => {
      if (draft.frames[num]) {
        draft.frames[num].duration = duration;
      }
    });
    draft.metadata.totalDuration = Object.values(draft.frames)
      .reduce((sum, frame) => sum + frame.duration, 0);
    draft.metadata.frameRate = Math.round(1000 / draft.metadata.defaultFrameDuration);
  }));

  return true;
}, [frames]);


// 5. Función para obtener la duración de un frame
const getFrameDuration = useCallback((frameNumber) => {
  return frames[frameNumber]?.frameDuration ?? defaultFrameDuration;
}, [frames, defaultFrameDuration]);

// 7. Función para cambiar la duración por defecto de los nuevos frames
const setDefaultFrameRate = useCallback((fps) => {
  const duration = Math.max(1, Math.floor(1000 / fps));
  setDefaultFrameDuration(duration);
}, []);

// 8. Función para obtener el framerate actual de un frame
const getFrameRate = useCallback((frameNumber) => {
  const duration = getFrameDuration(frameNumber);
  return Math.round(1000 / duration);
}, [getFrameDuration]);

//=============================================tiempo de los frames=============================================//
  /**
   * Move a layer down in the stack (decrease zIndex)
   */
  const moveLayerDown = useCallback((layerId) => {
    setFrames(prevFrames => {
      const updatedFrames = { ...prevFrames };
      const currentFrameData = updatedFrames[currentFrame];
  
      if (!currentFrameData) return prevFrames;
  
      // Obtener la capa actual
      const layer = currentFrameData.layers.find(l => l.id === layerId);
      if (!layer) return prevFrames;
  
      const isGroupLayer = layer.isGroupLayer;
      const parentLayerId = layer.parentLayerId;
  
      // Obtener las capas relevantes según sea de grupo o no
      const relevantLayers = currentFrameData.layers
        .filter(l => isGroupLayer
          ? l.isGroupLayer && l.parentLayerId === parentLayerId
          : !l.isGroupLayer
        )
        .sort((a, b) => a.zIndex - b.zIndex);
  
      const currentIndex = relevantLayers.findIndex(l => l.id === layerId);
      if (currentIndex === 0) return prevFrames;
  
      const layerBelow = relevantLayers[currentIndex - 1];
  
      // Mapear los nuevos zIndex
      const zIndexMap = {
        [layerId]: layerBelow.zIndex,
        [layerBelow.id]: layer.zIndex
      };
  
      // Aplicar el cambio en todos los frames
      Object.keys(updatedFrames).forEach(frameKey => {
        const frame = updatedFrames[frameKey];
  
        frame.layers = frame.layers.map(l => {
          if (zIndexMap[l.id] !== undefined) {
            return { ...l, zIndex: zIndexMap[l.id] };
          }
          return l;
        });
      });
  
      return updatedFrames;
    });
  
    setFramesResume(prev => {
      const layer = prev.layers[layerId];
      if (!layer) return prev;
      const relevantLayers = Object.values(prev.layers)
        .filter(l => layer.type === 'group'
          ? l.type === 'group' && l.parentLayerId === layer.parentLayerId
          : l.type === 'normal'
        )
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = relevantLayers.findIndex(l => l.id === layerId);
      if (currentIndex === 0) return prev;
      const layerBelow = relevantLayers[currentIndex - 1];
      return produce(prev, draft => {
        draft.layers[layerId].zIndex = layerBelow.zIndex;
        draft.layers[layerBelow.id].zIndex = layer.zIndex;
      });
    });
  }, [currentFrame]);
  
  
  
  /**
   * Toggle a layer's visibility
   */
  const toggleLayerVisibility = useCallback((layerId) => {
    setFrames(prevFrames => {
      const updatedFrames = { ...prevFrames };
      let atLeastOneVisible = false;
      let allVisible = true;
  
      // Primero: verificar el estado de visibilidad de la capa en todos los frames
      Object.keys(updatedFrames).forEach(frameNumber => {
        const frame = updatedFrames[frameNumber];
        const layer = frame.layers.find(l => l.id === layerId);
  
        if (layer) {
          const isVisibleInFrame = layer.visible?.[frameNumber] ?? true;
          if (isVisibleInFrame) atLeastOneVisible = true;
          else allVisible = false;
        }
      });
  
      const newVisibilityValue = allVisible ? false : true;
  
      // Segundo: aplicar nueva visibilidad según la lógica detectada
      Object.keys(updatedFrames).forEach(frameNumber => {
        const frame = updatedFrames[frameNumber];
        const layerIndex = frame.layers.findIndex(l => l.id === layerId);
  
        if (layerIndex !== -1) {
          const newLayers = [...frame.layers];
          const currentLayer = newLayers[layerIndex];
          const currentVisibility = { ...currentLayer.visible };
  
          currentVisibility[frameNumber] = newVisibilityValue;
  
          newLayers[layerIndex] = {
            ...currentLayer,
            visible: currentVisibility
          };
  
          updatedFrames[frameNumber] = {
            ...frame,
            layers: newLayers
          };
        }
      });
  
      return updatedFrames;
    });
  
    setFramesResume(prev => produce(prev, draft => {
      let allVisible = true;
      Object.values(draft.frames).forEach(frame => {
        const isVisible = frame.layerVisibility[layerId] ?? true;
        if (!isVisible) allVisible = false;
      });
      const newVisibilityValue = !allVisible;
      Object.keys(draft.frames).forEach(frameKey => {
        draft.frames[frameKey].layerVisibility[layerId] = newVisibilityValue;
        draft.computed.resolvedFrames[frameKey].layerVisibility[layerId] = newVisibilityValue;
      });
    }));
  }, []);
  

  const toggleLayerVisibilityInFrame = useCallback((layerId, frameNumber) => {
    // Convertir a string para consistencia (las claves de objeto son strings)
    const frameStr = String(frameNumber);
    
    setFrames(prevFrames => {
      const updatedFrames = { ...prevFrames };
      
      Object.keys(updatedFrames).forEach(frameKey => {
        const frame = updatedFrames[frameKey];
        const layerIndex = frame.layers.findIndex(l => l.id === layerId);
        
        if (layerIndex !== -1) {
          const newLayers = [...frame.layers];
          const currentVisibility = newLayers[layerIndex].visible;
          
          // Solo modificar el frame especificado
          if (frameKey === frameStr) {
            newLayers[layerIndex] = {
              ...newLayers[layerIndex],
              visible: {
                ...currentVisibility,
                [frameStr]: !(currentVisibility[frameStr] ?? true)
              }
            };
          }
          
          updatedFrames[frameKey] = {
            ...frame,
            layers: newLayers
          };
        }
      });
      
      return updatedFrames;
    });
  
    setFramesResume(prev => {
      if (!prev.frames[frameStr]) return prev;
      const newVisibility = !(prev.frames[frameStr].layerVisibility[layerId] ?? true);
      return produce(prev, draft => {
        draft.frames[frameStr].layerVisibility[layerId] = newVisibility;
        draft.computed.resolvedFrames[frameStr].layerVisibility[layerId] = newVisibility;
      });
    });
  }, [frames]);

  const getLayerVisibility = useCallback((layerId, frameNumber) => {
    const frame = frames[frameNumber];
    if (!frame) return false;
    
    const layer = frame.layers.find(l => l.id === layerId);
    return layer?.visible[frameNumber] ?? false;
  }, [frames]);
  
  
  /**
   * Rename a layer
   */
  const renameLayer = useCallback((layerId, newName) => {
    // Actualizar en todos los frames
    setFrames(prevFrames => {
      const updatedFrames = { ...prevFrames };
      Object.keys(updatedFrames).forEach(frameKey => {
        const frame = updatedFrames[frameKey];
        frame.layers = frame.layers.map(layer => 
          layer.id === layerId ? { ...layer, name: newName } : layer
        );
      });
      return updatedFrames;
    });
  
    // Actualizar estado actual
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, name: newName } : layer
    ));
  }, []);
  
  /**
   * Clear a layer (erase all content)
   */
  const clearLayer = useCallback((layerId, framesToClear = 'current') => {
    // Determinar frames a limpiar
    const frameNumbers = 
      framesToClear === 'current' ? [currentFrame] :
      framesToClear === 'all' ? Object.keys(frames).map(Number) :
      Array.isArray(framesToClear) ? framesToClear :
      [framesToClear];
  
    frameNumbers.forEach(frameNum => {
      const frame = frames[frameNum];
      if (!frame) return;
      
      const canvas = frame.canvases[layerId];
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      
      // Limpiar grupos de píxeles en este frame
      if (frame.pixelGroups[layerId]) {
        frame.pixelGroups[layerId] = {};
      }
    });
  
    setFramesResume(prev => produce(prev, draft => {
      frameNumbers.forEach(frameNum => {
        if (draft.frames[frameNum]) {
          draft.frames[frameNum].layerHasContent[layerId] = false;
          draft.computed.resolvedFrames[frameNum].layerHasContent[layerId] = false;
          draft.frames[frameNum].pixelGroups[layerId] = {};
        }
      });
      draft.computed.framesByLayer[layerId] = Object.keys(draft.frames)
        .map(Number)
        .filter(frameNum => draft.frames[frameNum].layerHasContent[layerId])
        .sort((a, b) => a - b);
    }));
  
    // Re-renderizar si el frame actual está incluido
    if (frameNumbers.includes(currentFrame)) {
      requestAnimationFrame(compositeRender);
    }
  }, [width, height, compositeRender, frames, currentFrame]);
  /**
   * Draw on a specific layer
   * }
   * 
   */

  const imageDataToPixelObject = (imageData) => {
    const pixels = {};
    const data = imageData.data;
    const width = imageData.width;
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Solo guardar píxeles que no sean transparentes
      if (a > 0) {
        const pixelKey = `${x},${y}`;
        pixels[pixelKey] = { r, g, b, a };
      }
    }
    
    return pixels;
  };
  
  // ✅ Función para detectar cambios entre dos estados de píxeles
  const detectPixelChanges = (oldPixels, newPixels) => {
    const changes = {
      added: [],
      modified: [],
      removed: []
    };
    
    // Detectar píxeles nuevos o modificados
    Object.keys(newPixels).forEach(pixelKey => {
      const [x, y] = pixelKey.split(',').map(Number);
      const newColor = newPixels[pixelKey];
      const oldColor = oldPixels[pixelKey];
      
      if (!oldColor) {
        changes.added.push({
          x,
          y,
          color: newColor
        });
      } else if (!colorsEqual(oldColor, newColor)) {
        changes.modified.push({
          x,
          y,
          oldColor,
          newColor
        });
      }
    });
    
    // Detectar píxeles eliminados
    Object.keys(oldPixels).forEach(pixelKey => {
      if (!newPixels[pixelKey]) {
        const [x, y] = pixelKey.split(',').map(Number);
        changes.removed.push({
          x,
          y,
          color: oldPixels[pixelKey]
        });
      }
    });
    
    return changes;
  };
  
  // ✅ Función auxiliar para comparar colores

  // ✅ Función para mostrar los cambios en la consola
  const logPixelChanges = useCallback((changes, layerId, frameId) => {
    const totalChanges = changes.added.length + changes.modified.length + changes.removed.length;
    if (totalChanges === 0) return;
    
    // Guardar en stack de cambios
    savePixelChangesToStack(changes, layerId, frameId);
    
    console.group(`🎨 Cambios en Layer ${layerId}, Frame ${frameId}: ${totalChanges} píxeles modificados`);
    
    if (changes.added.length > 0) {
      console.log('➕ Píxeles añadidos:', {
        action: 'added',
        pixels: changes.added.map(pixel => ({
          x: pixel.x,
          y: pixel.y,
          color: {
            r: pixel.color.r,
            g: pixel.color.g,
            b: pixel.color.b,
            a: pixel.color.a
          }
        }))
      });
    }
    
    if (changes.modified.length > 0) {
      console.log('✏️ Píxeles modificados:', {
        action: 'modified',
        pixels: changes.modified.map(pixel => ({
          x: pixel.x,
          y: pixel.y,
          oldColor: {
            r: pixel.oldColor.r,
            g: pixel.oldColor.g,
            b: pixel.oldColor.b,
            a: pixel.oldColor.a
          },
          newColor: {
            r: pixel.newColor.r,
            g: pixel.newColor.g,
            b: pixel.newColor.b,
            a: pixel.newColor.a
          }
        }))
      });
    }
    
    if (changes.removed.length > 0) {
      console.log('❌ Píxeles eliminados:', {
        action: 'removed',
        pixels: changes.removed.map(pixel => ({
          x: pixel.x,
          y: pixel.y,
          color: {
            r: pixel.color.r,
            g: pixel.color.g,
            b: pixel.color.b,
            a: pixel.color.a
          }
        }))
      });
    }
    
    console.groupEnd();
  }, [savePixelChangesToStack]);
  // ✅ Ref para guardar el estado anterior del canvas
  const previousCanvasStatesRef = useRef({});

// ---- Captura de trazo para undo/redo ----
const strokeSnapshotRef = useRef(null);

const computePixelChanges = (beforeData, afterData, width) => {
  const added = [];
  const modified = [];
  const removed = [];
  const len = beforeData.data.length;
  for (let i = 0; i < len; i += 4) {
    const bA = beforeData.data[i + 3];
    const aA = afterData.data[i + 3];
    const bR = beforeData.data[i], bG = beforeData.data[i + 1], bB = beforeData.data[i + 2];
    const aR = afterData.data[i], aG = afterData.data[i + 1], aB = afterData.data[i + 2];
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const wasEmpty = bA === 0;
    const isEmpty = aA === 0;
    if (wasEmpty && !isEmpty) {
      added.push({ x, y, color: { r: aR, g: aG, b: aB, a: aA } });
    } else if (!wasEmpty && isEmpty) {
      removed.push({ x, y, color: { r: bR, g: bG, b: bB, a: bA } });
    } else if (!wasEmpty && !isEmpty && (bR !== aR || bG !== aG || bB !== aB || bA !== aA)) {
      modified.push({ x, y, oldColor: { r: bR, g: bG, b: bB, a: bA }, newColor: { r: aR, g: aG, b: aB, a: aA } });
    }
  }
  return { added, modified, removed };
};

const captureStrokeStart = useCallback((layerId, frameId) => {
  const frame = framesRef.current[frameId];
  if (!frame?.canvases?.[layerId]) return;
  const canvas = frame.canvases[layerId];
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  strokeSnapshotRef.current = {
    layerId,
    frameId,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
  };
}, []);

const finalizeStroke = useCallback((layerId, frameId) => {
  const snapshot = strokeSnapshotRef.current;
  if (!snapshot || snapshot.layerId !== layerId || snapshot.frameId !== frameId) {
    strokeSnapshotRef.current = null;
    return;
  }
  const frame = framesRef.current[frameId];
  if (!frame?.canvases?.[layerId]) { strokeSnapshotRef.current = null; return; }
  const canvas = frame.canvases[layerId];
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) { strokeSnapshotRef.current = null; return; }
  const afterData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const changes = computePixelChanges(snapshot.imageData, afterData, canvas.width);
  strokeSnapshotRef.current = null;
  if (changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0) {
    logPixelChanges(changes, layerId, frameId);
  }
}, [logPixelChanges]);

// Variante de computePixelChanges que opera sobre un sub-rect y traduce los
// índices locales a coords absolutas del canvas.
const computePixelChangesRegion = (beforeData, afterData, bx, by, bw) => {
  const added = [];
  const modified = [];
  const removed = [];
  const data0 = beforeData.data;
  const data1 = afterData.data;
  const len = data0.length;
  for (let i = 0; i < len; i += 4) {
    const bA = data0[i + 3];
    const aA = data1[i + 3];
    const bR = data0[i], bG = data0[i + 1], bB = data0[i + 2];
    const aR = data1[i], aG = data1[i + 1], aB = data1[i + 2];
    const pixelIndex = i / 4;
    const x = bx + (pixelIndex % bw);
    const y = by + Math.floor(pixelIndex / bw);
    const wasEmpty = bA === 0;
    const isEmpty = aA === 0;
    if (wasEmpty && !isEmpty) {
      added.push({ x, y, color: { r: aR, g: aG, b: aB, a: aA } });
    } else if (!wasEmpty && isEmpty) {
      removed.push({ x, y, color: { r: bR, g: bG, b: bB, a: bA } });
    } else if (!wasEmpty && !isEmpty && (bR !== aR || bG !== aG || bB !== aB || bA !== aA)) {
      modified.push({ x, y, oldColor: { r: bR, g: bG, b: bB, a: bA }, newColor: { r: aR, g: aG, b: aB, a: aA } });
    }
  }
  return { added, modified, removed };
};

// Ref para trackear la última capa modificada
const lastModifiedLayer = useRef(null);
const geometricToolDrawn = useRef(false);
const [lastModifiedLayerState, setLastModifiedLayerState] = useState(null);

const checkIfCanvasIsPaintedViaBlob = async (ctx, layerId, currentFrame, setFramesResume) => {
  try {
    const canvas = ctx.canvas;
    if (!canvas) {
      console.warn('[BlobCheck] No se encontró canvas');
      return;
    }

    const getBlobSize = (canvasRef) => {
      return new Promise((resolve, reject) => {
        canvasRef.toBlob((blob) => {
          if (!blob) {
            reject('[BlobCheck] Blob no generado');
            return;
          }
          resolve(blob.size);
        }, 'image/png');
      });
    };

    const blankCanvas = document.createElement('canvas');
    blankCanvas.width = canvas.width;
    blankCanvas.height = canvas.height;

    const [currentSize, blankSize] = await Promise.all([
      getBlobSize(canvas),
      getBlobSize(blankCanvas),
    ]);

    const hasContent = currentSize !== blankSize;

    console.log(
      hasContent
        ? '%cCanvas pintado ✅'
        : '%cCanvas vacío 💤',
      hasContent ? 'color: green; font-weight: bold' : 'color: gray; font-style: italic'
    );

    // ✅ Actualizar estado de framesResume inmutablemente (Immer).
    // Antes: `{...prev}` + mutación in-place rompía React.memo downstream
    // (los sub-objetos compartían referencia y las mutaciones no se
    // detectaban por identidad). Con produce(), cada branch modificado
    // tiene nueva referencia, las no tocadas la conservan → LayerRow.memo
    // puede skippear limpiamente cuando no hay cambios para esa capa.
    setFramesResume(prev => {
      const currentHasContent = prev.frames[currentFrame]?.layerHasContent[layerId];
      if (currentHasContent === hasContent) return prev;

      return produce(prev, draft => {
        draft.frames[currentFrame].layerHasContent[layerId] = hasContent;
        draft.computed.resolvedFrames[currentFrame].layerHasContent[layerId] = hasContent;

        const currentFrames = draft.computed.framesByLayer[layerId] || [];
        if (hasContent && !currentFrames.includes(currentFrame)) {
          draft.computed.framesByLayer[layerId] = [...currentFrames, currentFrame].sort((a, b) => a - b);
        } else if (!hasContent && currentFrames.includes(currentFrame)) {
          draft.computed.framesByLayer[layerId] = currentFrames.filter(f => f !== currentFrame);
        }
      });
    });

  } catch (error) {
    console.error('[BlobCheck] Error:', error);
  }
};
// useEffect para actualizar framesResume cuando termine el dibujo y capturar trazos para undo/redo

useEffect(() => {
  if (isPressed) {
    // Inicio de trazo: capturar estado del canvas antes de pintar
    captureStrokeStart(activeLayerId, currentFrame);
  } else {
    // Fin de trazo: comparar antes/después y registrar en historial
    finalizeStroke(activeLayerId, currentFrame);

    const layerId = activeLayerId;
    const canvas = layerCanvasesRef.current?.[layerId];
    if (canvas && layerId != null) {
      const ctx = canvas.getContext('2d');
      setTimeout(() => {
        checkIfCanvasIsPaintedViaBlob(ctx, layerId, currentFrame, setFramesResume);
      }, 50);
    }
  }
}, [isPressed]); // captureStrokeStart/finalizeStroke excluidos intencionalmente (refs estables)

/*
const drawOnLayer = useCallback((layerId, drawFn, shouldBatch = false) => {
  let targetCanvas;
  let targetLayerId = layerId;
  let targetFrameId = currentFrame;
  
  if (activeLighter) {
    // MODO LIGHTER: Usar capa temporal
    
    // Si no hay capa temporal o es para diferente capa/frame, crear nueva
    if (!tempLighterCanvas || 
        tempLighterLayerId !== layerId || 
        tempLighterFrameId !== currentFrame) {
      
      // Si había una capa temporal anterior, fusionarla primero
      if (tempLighterCanvas) {
        mergeTempLighterCanvas();
      }
      
      // Crear nueva capa temporal
      targetCanvas = createTempLighterCanvas(layerId, currentFrame);
    } else {
      // Usar la capa temporal existente
      targetCanvas = tempLighterCanvas;
    }
  } else {
    // MODO NORMAL: Usar capa directamente
    
    // Si había una capa temporal activa, fusionarla antes de continuar
    if (tempLighterCanvas) {
      mergeTempLighterCanvas();
    }
    
    // Obtener o crear canvas normal
    targetCanvas = layerCanvasesRef.current[layerId];
    if (!targetCanvas) {
      targetCanvas = getOrCreateCanvas(layerId, currentFrame, true);
      layerCanvasesRef.current[layerId] = targetCanvas;
    }
  }
  
  // Ejecutar la función de dibujo
  const ctx = targetCanvas.getContext('2d');
  drawFn(ctx);
  
  // Solo actualizar el estado si no estamos en modo lighter
  if (!activeLighter) {
    lastModifiedLayer.current = layerId;
    setLastModifiedLayerState(layerId);
  }
  
  requestAnimationFrame(compositeRender);
}, [
  activeLighter, 
  tempLighterCanvas, 
  tempLighterLayerId, 
  tempLighterFrameId,
  currentFrame, 
  frames, 
  getOrCreateCanvas, 
  createTempLighterCanvas,
  mergeTempLighterCanvas,
  compositeRender
]);
*/

const drawOnLayer = useCallback((layerId, drawFn, shouldBatch = false) => {
  let targetCanvas;

  // --- Determinar canvas destino ---
  if (activeLighter) {
    const needsNewTemp =
      !tempLighterCanvas ||
      tempLighterLayerId !== layerId ||
      tempLighterFrameId !== currentFrame;

    if (needsNewTemp) {
      if (tempLighterCanvas) mergeTempLighterCanvas();
      targetCanvas = createTempLighterCanvas(layerId, currentFrame);
    } else {
      targetCanvas = tempLighterCanvas;
    }
  } else {
    if (tempLighterCanvas) mergeTempLighterCanvas();

    targetCanvas =
      layerCanvasesRef.current[layerId] ??
      (layerCanvasesRef.current[layerId] = getOrCreateCanvas(
        layerId,
        currentFrame,
        true
      ));
  }

  // --- Cachear contexto 2D ---
  if (!targetCanvas._ctx) {
    targetCanvas._ctx = targetCanvas.getContext("2d", { willReadFrequently: false });
  }

  // --- Ejecutar función de dibujo ---
  drawFn(targetCanvas._ctx);

  // --- Invalidar caché de onion skin para este layer+frame ---
  if (!activeLighter) {
    const pvKey = `${layerId}_${currentFrame}`;
    paintVersionRef.current[pvKey] = (paintVersionRef.current[pvKey] ?? 0) + 1;

    if (lastModifiedLayer.current !== layerId) {
      lastModifiedLayer.current = layerId;
      setLastModifiedLayerState(layerId);
    }
  }

  // --- Renderizar con batch ---
  if (!shouldBatch) {
    requestAnimationFrame(compositeRender);
  }
}, [
  activeLighter,
  tempLighterCanvas,
  tempLighterLayerId,
  tempLighterFrameId,
  currentFrame,
  getOrCreateCanvas,
  createTempLighterCanvas,
  mergeTempLighterCanvas,
  compositeRender,
  setLastModifiedLayerState
]);

// Commit explícito para figuras geométricas (square, circle, line, etc.).
// Antes las figuras dibujaban con drawOnLayer pero NUNCA registraban en el
// historial — el mecanismo automático captureStrokeStart/finalizeStroke es
// dependiente del timing de useEffect [isPressed] y no capturaba los cambios
// de figuras de forma fiable. Este helper diffea el bbox de la figura y emite
// la entrada al history, además de cancelar el snapshot automático para evitar
// doble registro. Usa drawOnLayer internamente, por lo que respeta lighter mode,
// onion-skin cache invalidation y compositeRender.
const commitShapeWithHistory = useCallback((layerId, frameId, bbox, drawFn) => {
  // En modo lighter, el dibujo va a un canvas temporal que se mergea después;
  // el diff por bbox no aplica directamente. Caemos al drawOnLayer normal sin
  // registrar en history (fallback seguro, sin ruido).
  if (activeLighter) {
    drawOnLayer(layerId, drawFn);
    return;
  }

  const canvas = layerCanvasesRef.current[layerId];
  if (!canvas) {
    drawOnLayer(layerId, drawFn);
    return;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    drawOnLayer(layerId, drawFn);
    return;
  }

  // Clamp del bbox a los bordes del canvas
  const bx = Math.max(0, Math.floor(bbox.x));
  const by = Math.max(0, Math.floor(bbox.y));
  const bex = Math.min(canvas.width, Math.ceil(bbox.x + bbox.w));
  const bey = Math.min(canvas.height, Math.ceil(bbox.y + bbox.h));
  const bw = bex - bx;
  const bh = bey - by;

  let beforeData = null;
  if (bw > 0 && bh > 0) {
    beforeData = ctx.getImageData(bx, by, bw, bh);
  }

  // drawOnLayer dibuja sincronamente, maneja onion invalidation y programa render.
  drawOnLayer(layerId, drawFn);

  // Cancelar snapshot automático para que finalizeStroke no duplique el registro.
  strokeSnapshotRef.current = null;

  if (beforeData) {
    const afterData = ctx.getImageData(bx, by, bw, bh);
    const changes = computePixelChangesRegion(beforeData, afterData, bx, by, bw);
    if (changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0) {
      logPixelChanges(changes, layerId, frameId);
    }
  }
}, [activeLighter, drawOnLayer, logPixelChanges]);

// ===== FUNCIÓN PARA MANEJAR CAMBIO DE ACTIVELIGHTER =====

useEffect(() => {
  // Cuando activeLighter se desactiva, fusionar cualquier capa temporal pendiente
  if (!activeLighter && tempLighterCanvas) {
    mergeTempLighterCanvas();
  }
}, [activeLighter, tempLighterCanvas, mergeTempLighterCanvas]);

// ===== FUNCIÓN PARA MANEJAR CAMBIO DE CAPA ACTIVA =====

useEffect(() => {
  // Cuando cambia la capa activa y hay capa temporal, fusionarla
  if (tempLighterCanvas && tempLighterLayerId !== activeLayerId) {
    mergeTempLighterCanvas();
  }
}, [activeLayerId, tempLighterCanvas, tempLighterLayerId, mergeTempLighterCanvas]);

// ===== FUNCIÓN PARA MANEJAR CAMBIO DE FRAME =====

useEffect(() => {
  // Cuando cambia el frame y hay capa temporal, fusionarla
  if (tempLighterCanvas && tempLighterFrameId !== currentFrame) {
    mergeTempLighterCanvas();
  }
}, [currentFrame, tempLighterCanvas, tempLighterFrameId, mergeTempLighterCanvas]);

  //pintar pixeles especificos:
  const paintPixelsRGBA = useCallback((
    layerId, 
    frameNumber, 
    pixels, 
    color, // {r, g, b, a} o string RGBA/hex
    updateView = true
  ) => {
    // 1. Validar y normalizar color
    const rgba = normalizeToRGBA(color);
    if (!rgba) {
      console.error("Color inválido:", color);
      return false;
    }
  
    // 2. Obtener el frame y capa específicos
    const frame = frames[frameNumber];
    if (!frame || !frame.canvases[layerId]) return false;
    
    const canvas = frame.canvases[layerId];
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
  
    // 3. Crear ImageData para modificar píxeles
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 4. Actualizar píxeles específicos
    pixels.forEach(pixel => {
      if (pixel.x >= 0 && pixel.x < width && pixel.y >= 0 && pixel.y < height) {
        const index = (pixel.y * width + pixel.x) * 4;
        
        // Reemplazar completamente el píxel (incluyendo alpha)
        data[index] = rgba.r;       // Red
        data[index + 1] = rgba.g;   // Green
        data[index + 2] = rgba.b;   // Blue
        data[index + 3] = rgba.a;   // Alpha
      }
    });
  
    // 5. Aplicar cambios al canvas
    ctx.putImageData(imageData, 0, 0);
  
    // 6. Actualizar vista si es necesario
    if (frameNumber === currentFrame && updateView) {
      requestAnimationFrame(compositeRender);
    }
  
    return true;
  }, [frames, width, height, currentFrame, compositeRender]);

  // 4. NUEVA FUNCIÓN: processPaintBatch
const processPaintBatch = useCallback(() => {
  if (pendingPaintOperations.current.length === 0) return;

  // Agrupar operaciones por capa y frame
  const groupedOps = {};
  pendingPaintOperations.current.forEach(op => {
    const key = `${op.layerId}-${op.frameNumber}`;
    if (!groupedOps[key]) {
      groupedOps[key] = {
        layerId: op.layerId,
        frameNumber: op.frameNumber,
        pixels: [],
        rgba: op.rgba
      };
    }
    groupedOps[key].pixels.push(...op.pixels);
  });

  // Procesar cada grupo de una vez
  Object.values(groupedOps).forEach(group => {
    paintPixelsImmediate(group.layerId, group.frameNumber, group.pixels, group.rgba);
  });

  pendingPaintOperations.current = [];
  paintBatchTimer.current = null;
}, []);

// 5. paintPixelsImmediate: dirty-rect para leer/escribir solo la región modificada.
// Evita getImageData/putImageData de toda la canvas cuando solo cambian pocos píxeles.
const paintPixelsImmediate = useCallback((layerId, frameNumber, pixels, rgba) => {
  const frame = frames[frameNumber];
  if (!frame?.canvases[layerId]) return false;

  const canvas = frame.canvases[layerId];
  if (!canvas._ctx) {
    canvas._ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
  }
  const ctx = canvas._ctx;

  const pixelCount = pixels.length;
  if (!ctx || pixelCount === 0) return false;

  // Calcular bounding rect de los píxeles a modificar
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let i = 0; i < pixelCount; i++) {
    const { x, y } = pixels[i];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);
  maxX = Math.min(width - 1, maxX);
  maxY = Math.min(height - 1, maxY);

  const dirtyW = maxX - minX + 1;
  const dirtyH = maxY - minY + 1;

  // Leer solo la región sucia — mucho menos datos que la canvas completa
  const imageData = ctx.getImageData(minX, minY, dirtyW, dirtyH);
  const data = imageData.data;

  for (let i = 0; i < pixelCount; i++) {
    const { x, y } = pixels[i];
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const index = ((y - minY) * dirtyW + (x - minX)) << 2;
      data[index]     = rgba.r;
      data[index + 1] = rgba.g;
      data[index + 2] = rgba.b;
      data[index + 3] = rgba.a;
    }
  }

  ctx.putImageData(imageData, minX, minY);

  // Invalidar caché de onion skin para esta capa+frame
  const pvKey = `${layerId}_${frameNumber}`;
  paintVersionRef.current[pvKey] = (paintVersionRef.current[pvKey] ?? 0) + 1;

  if (frameNumber === currentFrame) {
    requestAnimationFrame(compositeRender);
  }

  return true;
}, [frames, width, height, currentFrame, compositeRender]);

  /**
   * Update the viewport position (pan/scroll)
   */
  const updateViewport = useCallback((x, y) => {
    // Ensure the viewport stays within bounds
    const boundedX = Math.max(0, Math.min(x, width - viewportWidth));
    const boundedY = Math.max(0, Math.min(y, height - viewportHeight));
    
    setViewportOffset({
      x: boundedX,
      y: boundedY
    });
  }, [width, height, viewportWidth, viewportHeight]);
  
  /**
   * Move the viewport by a delta amount
   */
  const moveViewport = useCallback((deltaX, deltaY) => {
    setViewportOffset(prev => {
      // Calculate new position
      const newX = prev.x + deltaX;
      const newY = prev.y + deltaY;
      
      // Ensure the viewport stays within bounds
      const boundedX = Math.max(0, Math.min(newX, width - viewportWidth));
      const boundedY = Math.max(0, Math.min(newY, height - viewportHeight));
      
      return {
        x: boundedX,
        y: boundedY
      };
    });
  }, [width, height, viewportWidth, viewportHeight]);
  
  /**
   * Get the current viewport position
   */
  const getViewportPosition = useCallback(() => {
    return { ...viewportOffset };
  }, [viewportOffset]);
  
  /**
   * Convert viewport coordinates to canvas coordinates
   */
  const viewportToCanvasCoords = useCallback((viewportX, viewportY) => {
    return {
      x: Math.floor(viewportX + viewportOffset.x),
      y: Math.floor(viewportY + viewportOffset.y)
    };
  }, [viewportOffset]);
  
  
  /**
   * Convert canvas coordinates to viewport coordinates
   */
  const canvasToViewportCoords = useCallback((canvasX, canvasY) => {
    return {
      x: canvasX - viewportOffset.x,
      y: canvasY - viewportOffset.y
    };
  }, [viewportOffset]);
  
  /**
   * Bresenham's line algorithm for drawing smooth pixel lines
   * 
   * 
   */
  function drawBrush(ctx, canvasCoords, size) {
    const offset = Math.floor(size / 2);
    const startX = canvasCoords.x - offset;
    const startY = canvasCoords.y - offset;
    
    ctx.fillRect(startX, startY, size, size);
  }
  const drawPixelLine = useCallback((ctx, x0, y0, x1, y1, brushSize = 1) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
      // Usa el pincel centrado en vez de un solo píxel
      drawBrush(ctx, { x: x0, y: y0 }, brushSize);
  
      if (x0 === x1 && y0 === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }, []);
  


/**
 * Hook para gestión de workers de imagen
 * Maneja la creación, reutilización y limpieza de workers
 */
const useImageWorkers = () => {
  const workersRef = useRef(new Map());
  const workerCountRef = useRef(0);
  
  const createWorker = useCallback(() => {
    const workerCode = `
      // Worker para procesamiento de ImageData con OffscreenCanvas
      self.onmessage = function(e) {
        const { type, requestId, canvas, x, y, width, height, imageData } = e.data;
        
        try {
          switch(type) {
            case 'getImageData':
              if (canvas) {
                // Usar OffscreenCanvas transferido
                const ctx = canvas.getContext('2d');
                const result = ctx.getImageData(x, y, width, height);
                
                self.postMessage({
                  type: 'success',
                  requestId,
                  imageData: result
                });
              } else if (imageData) {
                // Fallback: trabajar con ImageData directamente
                self.postMessage({
                  type: 'success',
                  requestId,
                  imageData: imageData
                });
              }
              break;
              
            case 'processImageData':
              // Aquí puedes agregar procesamiento adicional
              if (imageData) {
                // Ejemplo: aplicar filtro simple
                const processed = new ImageData(
                  new Uint8ClampedArray(imageData.data),
                  imageData.width,
                  imageData.height
                );
                
                self.postMessage({
                  type: 'success',
                  requestId,
                  imageData: processed
                });
              }
              break;
              
            default:
              throw new Error('Unknown operation type: ' + type);
          }
        } catch (error) {
          self.postMessage({
            type: 'error',
            requestId,
            error: error.message
          });
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    // Limpiar blob URL cuando el worker termine
    worker.addEventListener('error', () => {
      URL.revokeObjectURL(blob);
    });
    
    return { worker, blobUrl: blob };
  }, []);
  
  const getWorker = useCallback(() => {
    const workerId = `worker_${workerCountRef.current++}`;
    const { worker, blobUrl } = createWorker();
    
    workersRef.current.set(workerId, { worker, blobUrl });
    
    return {
      workerId,
      worker,
      cleanup: () => {
        const workerData = workersRef.current.get(workerId);
        if (workerData) {
          workerData.worker.terminate();
          URL.revokeObjectURL(workerData.blobUrl);
          workersRef.current.delete(workerId);
        }
      }
    };
  }, [createWorker]);
  
  const cleanupAllWorkers = useCallback(() => {
    workersRef.current.forEach(({ worker, blobUrl }) => {
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
    });
    workersRef.current.clear();
  }, []);
  
  return { getWorker, cleanupAllWorkers };
};

/**
 * Utilidad para verificar si OffscreenCanvas está disponible
 */
const useOffscreenCanvasSupport = () => {
  const isSupported = typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype;
  
  return {
    isSupported,
    canUseWorkers: typeof Worker !== 'undefined'
  };
};

/**
 * Función principal: getLayerData híbrida con soporte OffscreenCanvas
 * @param {Object} layerCanvasesRef - Ref que contiene los canvas de las layers
 * @returns {Function} getLayerData function
 */
const useHybridLayerData = (layerCanvasesRef) => {
  const { getWorker } = useImageWorkers();
  const { isSupported: isOffscreenSupported, canUseWorkers } = useOffscreenCanvasSupport();
  
  /**
   * Get image data from a specific layer within a defined region
   * @param {string} layerId - ID of the layer to get data from
   * @param {number} x - X coordinate of the top-left corner of the region
   * @param {number} y - Y coordinate of the top-left corner of the region
   * @param {number} width - Width of the region
   * @param {number} height - Height of the region
   * @param {boolean} useWorker - Whether to use web worker for processing
   * @param {boolean} forceOffscreen - Force use of OffscreenCanvas even for small operations
   * @returns {Promise<ImageData>} Promise resolving to the image data from the specified region
   */
  const getLayerData = useCallback((layerId, x, y, width, height, useWorker = false, forceOffscreen = false) => {
    return new Promise((resolve) => {
      const canvas = layerCanvasesRef.current[layerId];
      if (!canvas) {
        resolve(null);
        return;
      }
      
      // Bounds checking
      const boundedX = Math.max(0, Math.min(x, canvas.width - 1));
      const boundedY = Math.max(0, Math.min(y, canvas.height - 1));
      const boundedWidth = Math.max(1, Math.min(width, canvas.width - boundedX));
      const boundedHeight = Math.max(1, Math.min(height, canvas.height - boundedY));
      
      // Decidir si usar worker basado en el tamaño de la operación
      const area = boundedWidth * boundedHeight;
      const shouldUseWorker = useWorker || forceOffscreen || area > 250000; // > 500x500 px
      
      // Método tradicional (sin worker)
      if (!shouldUseWorker || !canUseWorkers) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        try {
          const imageData = ctx.getImageData(boundedX, boundedY, boundedWidth, boundedHeight);
          resolve(imageData);
        } catch (e) {
          console.error('Error getting layer data:', e);
          resolve(null);
        }
        return;
      }
      
      // Método con worker
      const { worker, cleanup } = getWorker();
      const requestId = Math.random().toString(36).substr(2, 9);
      
      const handleWorkerMessage = (e) => {
        if (e.data.requestId === requestId) {
          worker.removeEventListener('message', handleWorkerMessage);
          
          if (e.data.type === 'success') {
            resolve(e.data.imageData);
          } else {
            console.error('Worker error:', e.data.error);
            // Fallback al método tradicional
            fallbackToMainThread();
          }
          
          cleanup();
        }
      };
      
      const handleWorkerError = (error) => {
        console.error('Worker failed:', error);
        worker.removeEventListener('error', handleWorkerError);
        fallbackToMainThread();
        cleanup();
      };
      
      const fallbackToMainThread = () => {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        try {
          const imageData = ctx.getImageData(boundedX, boundedY, boundedWidth, boundedHeight);
          resolve(imageData);
        } catch (e) {
          console.error('Fallback error:', e);
          resolve(null);
        }
      };
      
      worker.addEventListener('message', handleWorkerMessage);
      worker.addEventListener('error', handleWorkerError);
      
      // Intentar usar OffscreenCanvas si está disponible
      if (isOffscreenSupported && forceOffscreen) {
        try {
          // Crear OffscreenCanvas temporal
          const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
          const offscreenCtx = offscreen.getContext('2d');
          
          // Copiar contenido del canvas principal
          const mainCtx = canvas.getContext('2d', { willReadFrequently: true });
          const fullImageData = mainCtx.getImageData(0, 0, canvas.width, canvas.height);
          offscreenCtx.putImageData(fullImageData, 0, 0);
          
          worker.postMessage({
            type: 'getImageData',
            requestId,
            canvas: offscreen,
            x: boundedX,
            y: boundedY,
            width: boundedWidth,
            height: boundedHeight
          }, [offscreen]);
          
        } catch (error) {
          console.warn('OffscreenCanvas failed, using fallback:', error);
          fallbackToMainThread();
          cleanup();
        }
      } else {
        // Usar worker sin OffscreenCanvas - solo pasar ImageData
        try {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const imageData = ctx.getImageData(boundedX, boundedY, boundedWidth, boundedHeight);
          
          worker.postMessage({
            type: 'processImageData',
            requestId,
            imageData
          });
          
        } catch (error) {
          console.error('Failed to get ImageData:', error);
          fallbackToMainThread();
          cleanup();
        }
      }
    });
  }, [getWorker, isOffscreenSupported, canUseWorkers]);
  
  return { getLayerData };
};

/**
 * Función inteligente que decide automáticamente cuándo usar worker
 * @param {Object} layerCanvasesRef - Ref que contiene los canvas de las layers
 * @returns {Function} getLayerData function with automatic optimization
 */
const useSmartLayerData = (layerCanvasesRef) => {
  const { getLayerData: hybridGetLayerData } = useHybridLayerData(layerCanvasesRef);
  
  const getLayerData = useCallback((layerId, x, y, width, height) => {
    const area = width * height;
    
    // Lógica automática para decidir cuándo usar worker
    const useWorker = area > 250000; // Área > 500x500 píxeles
    const forceOffscreen = area > 1000000; // Área > 1000x1000 píxeles
    
    return hybridGetLayerData(layerId, x, y, width, height, useWorker, forceOffscreen);
  }, [hybridGetLayerData]);
  
  return { getLayerData };
};

/**
 * Hook principal para usar en tu componente
 * Reemplaza directamente tu función getLayerData actual
 */
const useLayerDataManager = (layerCanvasesRef, options = {}) => {
  const { 
    autoOptimize = true, 
    workerThreshold = 250000,
    offscreenThreshold = 1000000 
  } = options;
  
  const { getLayerData: hybridGetLayerData } = useHybridLayerData(layerCanvasesRef);
  const { getLayerData: smartGetLayerData } = useSmartLayerData(layerCanvasesRef);
  
  if (autoOptimize) {
    return { getLayerData: smartGetLayerData };
  }
  
  return { getLayerData: hybridGetLayerData };
};

// EJEMPLO DE USO EN TU COMPONENTE:
/*
const MyComponent = () => {
  const layerCanvasesRef = useRef({});
  
  // Opción 1: Automático (recomendado)
  const { getLayerData } = useLayerDataManager(layerCanvasesRef);
  
  // Opción 2: Control manual
  // const { getLayerData } = useLayerDataManager(layerCanvasesRef, { autoOptimize: false });
  
  const handleGetData = async () => {
    // Uso simple - automáticamente optimizado
    const data = await getLayerData('layer1', 0, 0, 100, 100);
    
    // Uso manual (si autoOptimize = false)
    // const data = await getLayerData('layer1', 0, 0, 100, 100, true, false);
  };
  
  return (
    // Tu JSX aquí
  );
};
*/


// Add this to your useLayerManager hook right before the return statement

/**
 * Get image data from a specific layer within a defined region
 * @param {string} layerId - ID of the layer to get data from
 * @param {number} x - X coordinate of the top-left corner of the region
 * @param {number} y - Y coordinate of the top-left corner of the region
 * @param {number} width - Width of the region
 * @param {number} height - Height of the region
 * @returns {Promise<ImageData>} - Promise resolving to the image data from the specified region
 */
const { getLayerData } = useLayerDataManager(layerCanvasesRef);

// Cache para contexto WebGL
let webglContext = null;
let webglProgram = null;
let webglCanvas = null;

// Inicializar WebGL (solo una vez)
const initWebGL = () => {
  if (webglContext) return webglContext;
  
  webglCanvas = document.createElement('canvas');
  webglContext = webglCanvas.getContext('webgl2') || webglCanvas.getContext('webgl');
  
  if (!webglContext) {
    console.warn('WebGL no disponible, usando Canvas 2D');
    return null;
  }
  
  // Shader vertex simple
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;
  
  // Shader fragment para composición con alpha blending
  const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_opacity;
    varying vec2 v_texCoord;
    
    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      gl_FragColor = vec4(color.rgb, color.a * u_opacity);
    }
  `;
  
  // Compilar shaders
  const vertexShader = compileShader(webglContext, webglContext.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(webglContext, webglContext.FRAGMENT_SHADER, fragmentShaderSource);
  
  // Crear programa
  webglProgram = webglContext.createProgram();
  webglContext.attachShader(webglProgram, vertexShader);
  webglContext.attachShader(webglProgram, fragmentShader);
  webglContext.linkProgram(webglProgram);
  
  if (!webglContext.getProgramParameter(webglProgram, webglContext.LINK_STATUS)) {
    console.error('Error linking WebGL program');
    return null;
  }
  
  // Configurar geometría (quad completo)
  const positions = new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
     1,  1,  1, 1,
  ]);
  
  const buffer = webglContext.createBuffer();
  webglContext.bindBuffer(webglContext.ARRAY_BUFFER, buffer);
  webglContext.bufferData(webglContext.ARRAY_BUFFER, positions, webglContext.STATIC_DRAW);
  
  return webglContext;
};

// Función auxiliar para compilar shaders
const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
};

// ===== FUNCIÓN OPTIMIZADA CON DETECCIÓN AUTOMÁTICA =====
const getCompositeLayerData = useCallback((x, y, regionWidth, regionHeight, includeHiddenLayers = false) => {
  return new Promise((resolve) => {
    try {
      // Asegurar que las coordenadas estén dentro de los límites
      const boundedX = Math.max(0, Math.min(x, width - 1));
      const boundedY = Math.max(0, Math.min(y, height - 1));
      const boundedWidth = Math.max(1, Math.min(regionWidth, width - boundedX));
      const boundedHeight = Math.max(1, Math.min(regionHeight, height - boundedY));
      
      // Obtener capas jerárquicas
      const hierarchicalLayers = getHierarchicalLayers();
      const sortedMainLayers = hierarchicalLayers.sort((a, b) => a.zIndex - b.zIndex);
      
      // Filtrar capas visibles
      const visibleLayers = [];
      for (const mainLayer of sortedMainLayers) {
        const isMainLayerVisible = includeHiddenLayers || 
                                 (mainLayer.visible && 
                                  (mainLayer.visible[currentFrame] !== false));
        
        if (isMainLayerVisible && layerCanvasesRef.current[mainLayer.id]) {
          visibleLayers.push({
            canvas: layerCanvasesRef.current[mainLayer.id],
            opacity: mainLayer.opacity ?? 1.0
          });
        }
        
        // Agregar capas de grupo
        for (const groupLayer of mainLayer.groupLayers) {
          const isGroupLayerVisible = includeHiddenLayers || 
                                    (groupLayer.visible && 
                                     (groupLayer.visible[currentFrame] !== false));
          
          if (isGroupLayerVisible && layerCanvasesRef.current[groupLayer.id]) {
            visibleLayers.push({
              canvas: layerCanvasesRef.current[groupLayer.id],
              opacity: groupLayer.opacity ?? 1.0
            });
          }
        }
      }
      
      // ===== LÓGICA DE DECISIÓN AUTOMÁTICA =====
      const totalPixels = boundedWidth * boundedHeight;
      const layerCount = visibleLayers.length;
      const complexity = totalPixels * layerCount;
      
      // Umbrales para usar WebGL
      const WEBGL_THRESHOLD = 10000; // píxeles * capas
      const useWebGL = complexity > WEBGL_THRESHOLD && initWebGL();
      
      if (useWebGL) {
        // ===== RENDERIZADO CON WEBGL =====
        resolveWithWebGL();
      } else {
        // ===== RENDERIZADO CON CANVAS 2D (OPTIMIZADO) =====
        resolveWithCanvas2D();
      }
      
      // Función WebGL
      function resolveWithWebGL() {
        try {
          const gl = webglContext;
          
          // Configurar canvas
          webglCanvas.width = boundedWidth;
          webglCanvas.height = boundedHeight;
          gl.viewport(0, 0, boundedWidth, boundedHeight);
          
          // Configurar blending para composición alpha
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          
          // Limpiar
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          
          // Usar programa
          gl.useProgram(webglProgram);
          
          // Configurar atributos
          const positionLocation = gl.getAttribLocation(webglProgram, 'a_position');
          const texCoordLocation = gl.getAttribLocation(webglProgram, 'a_texCoord');
          const textureLocation = gl.getUniformLocation(webglProgram, 'u_texture');
          const opacityLocation = gl.getUniformLocation(webglProgram, 'u_opacity');
          
          gl.enableVertexAttribArray(positionLocation);
          gl.enableVertexAttribArray(texCoordLocation);
          
          // Configurar buffer
          gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
          gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
          
          // Renderizar cada capa
          visibleLayers.forEach(layer => {
            // Crear textura desde canvas
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            
            // Subir solo la región necesaria
            const regionCanvas = document.createElement('canvas');
            regionCanvas.width = boundedWidth;
            regionCanvas.height = boundedHeight;
            const regionCtx = regionCanvas.getContext('2d');
            regionCtx.drawImage(
              layer.canvas,
              boundedX, boundedY, boundedWidth, boundedHeight,
              0, 0, boundedWidth, boundedHeight
            );
            
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, regionCanvas);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            
            // Configurar uniforms
            gl.uniform1i(textureLocation, 0);
            gl.uniform1f(opacityLocation, layer.opacity);
            
            // Dibujar
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            // Limpiar textura
            gl.deleteTexture(texture);
          });
          
          // Leer píxeles con readPixels (MUY RÁPIDO)
          const pixels = new Uint8Array(boundedWidth * boundedHeight * 4);
          gl.readPixels(0, 0, boundedWidth, boundedHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          
          // Crear ImageData
          const imageData = new ImageData(new Uint8ClampedArray(pixels), boundedWidth, boundedHeight);
          
          console.log(`🚀 WebGL utilizado para región ${boundedWidth}x${boundedHeight} con ${layerCount} capas`);
          resolve(imageData);
          
        } catch (error) {
          console.warn('Error en WebGL, fallback a Canvas 2D:', error);
          resolveWithCanvas2D();
        }
      }
      
      // Función Canvas 2D (versión optimizada)
      function resolveWithCanvas2D() {
        // Crear canvas temporal más pequeño
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = boundedWidth;
        tempCanvas.height = boundedHeight;
        const tempCtx = tempCanvas.getContext('2d', { 
          alpha: true,
          willReadFrequently: true 
        });
        tempCtx.imageSmoothingEnabled = false;
        
        // Renderizar capas (sin cambios en la lógica)
        visibleLayers.forEach(layer => {
          if (layer.opacity !== 1.0) {
            tempCtx.globalAlpha = layer.opacity;
          }
          
          tempCtx.drawImage(
            layer.canvas,
            boundedX, boundedY, boundedWidth, boundedHeight,
            0, 0, boundedWidth, boundedHeight
          );
          
          if (layer.opacity !== 1.0) {
            tempCtx.globalAlpha = 1.0;
          }
        });
        
        // Obtener ImageData
        const imageData = tempCtx.getImageData(0, 0, boundedWidth, boundedHeight);
        
        console.log(`🎨 Canvas 2D utilizado para región ${boundedWidth}x${boundedHeight} con ${layerCount} capas`);
        resolve(imageData);
      }
      
    } catch (error) {
      console.error('Error getting composite layer data:', error);
      resolve(null);
    }
  });
}, [width, height, currentFrame, getHierarchicalLayers]);

// Dentro del hook useLayerManager, en la sección de retorno
const getLayerPixelData = useCallback((frameNumber, layerId) => {
  // 1. Verificar si el frame existe
  const frame = frames[frameNumber];
  if (!frame) {
    console.error(`Frame ${frameNumber} no existe`);
    return [];
  }

  // 2. Verificar si la capa existe en ese frame
  const layer = frame.layers.find(l => l.id === layerId);
  if (!layer) {
    console.error(`Capa ${layerId} no encontrada en el frame ${frameNumber}`);
    return [];
  }

  // 3. Obtener el canvas de la capa
  const canvas = frame.canvases[layerId];
  if (!canvas) {
    console.error(`Canvas no encontrado para capa ${layerId}`);
    return [];
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error(`Contexto no disponible para capa ${layerId}`);
    return [];
  }

  // 4. Obtener datos de imagen
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixels = [];

  // 5. Procesar cada píxel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      
      pixels.push({
        x,
        y,
        color: {
          r: data[index],
          g: data[index + 1],
          b: data[index + 2],
          a: data[index + 3]
        }
      });
    }
  }

  return pixels;
}, [frames, width, height]);

/**
 * Función para borrar píxeles en un punto específico de una capa
 * @param {string} layerId - ID de la capa donde borrar los píxeles
 * @param {number} x - Coordenada X del centro del borrador
 * @param {number} y - Coordenada Y del centro del borrador
 * @param {number} size - Tamaño del borrador (ancho y alto en píxeles)
 * @param {boolean} circle - Si es true, borra en forma circular, si es false, en forma cuadrada
 * @returns {boolean} - True si se realizó el borrado correctamente, false si hubo algún error
 */
const erasePixels = useCallback((layerId, x, y, size = 1, circle = false) => {
  const canvas = layerCanvasesRef.current[layerId];
  if (!canvas) return false;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  
  // Calcular las coordenadas del área a borrar
  const offset = Math.floor(size / 2);
  const startX = Math.max(0, x - offset);
  const startY = Math.max(0, y - offset);
  const boundedWidth = Math.min(size, canvas.width - startX);
  const boundedHeight = Math.min(size, canvas.height - startY);
  
  if (boundedWidth <= 0 || boundedHeight <= 0) return false;
  
  if (circle) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.clearRect(startX, startY, boundedWidth, boundedHeight);
  }
  
  // RENDER DIRECTO
  requestAnimationFrame(compositeRender);
  
  return true;
}, [compositeRender]);

// Puedes añadir esta función a tu objeto de retorno en useLayerManager para exponerla:
// En el return { ... } añade:
// erasePixels,
useEffect(() => {
  return () => {
    if (paintBatchTimer.current) {
      clearTimeout(paintBatchTimer.current);
      cancelAnimationFrame(paintBatchTimer.current);
    }
  };
}, []);
const getCanvasCoordsFromPointer = useCallback((pointerX, pointerY) => {
  // Convierte coordenadas del puntero a coordenadas del canvas
  const viewportX = Math.floor(pointerX / zoom);
  const viewportY = Math.floor(pointerY / zoom);
  return viewportToCanvasCoords(viewportX, viewportY);
}, [zoom, viewportToCanvasCoords]);

const getPointerCoordsFromCanvas = useCallback((canvasX, canvasY) => {
  // Convierte coordenadas del canvas a coordenadas del puntero
  const viewportCoords = canvasToViewportCoords(canvasX, canvasY);
  return {
    x: viewportCoords.x * zoom,
    y: viewportCoords.y * zoom
  };
}, [zoom, canvasToViewportCoords]);

 /**
 * Función de flood fill (relleno por inundación) para rellenar un área con un color específico
 * @param {string} layerId - ID de la capa donde aplicar el flood fill
 * @param {number} startX - Coordenada X del punto de inicio
 * @param {number} startY - Coordenada Y del punto de inicio  
 * @param {Object|string} fillColor - Color de relleno como objeto {r, g, b, a} o string "rgba(r,g,b,a)"
 * @param {number} tolerance - Tolerancia de color (0-255, por defecto 0 para color exacto)
 * @returns {boolean} - True si se realizó el relleno correctamente, false si hubo algún error
 */
 const floodFill = useCallback((layerId, startX, startY, fillColor, tolerance = 0) => {
  const canvas = layerCanvasesRef.current[layerId];
  if (!canvas) return false;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  
  // Verificar que las coordenadas estén dentro del canvas
  if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) {
    return false;
  }
  
  // Normalizar el color de relleno a objeto RGBA
  const fillRGBA = normalizeToRGBA(fillColor);
  if (!fillRGBA) return false;
  
  // Obtener los datos de imagen del canvas completo
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Obtener el color del píxel inicial
  const startIndex = (startY * canvas.width + startX) * 4;
  const targetColor = {
    r: data[startIndex],
    g: data[startIndex + 1], 
    b: data[startIndex + 2],
    a: data[startIndex + 3]
  };
  
  // Si el color inicial es igual al color de relleno, no hacer nada
  if (colorsEqual(targetColor, fillRGBA, 0)) {
    return true;
  }
  
  // Pila para almacenar los píxeles a procesar
  const pixelStack = [{x: startX, y: startY}];
  const processedPixels = new Set();
  
  while (pixelStack.length > 0) {
    const {x, y} = pixelStack.pop();
    
    // Crear clave única para este píxel
    const pixelKey = `${x},${y}`;
    if (processedPixels.has(pixelKey)) continue;
    
    // Verificar límites
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
    
    // Obtener el color del píxel actual
    const currentIndex = (y * canvas.width + x) * 4;
    const currentColor = {
      r: data[currentIndex],
      g: data[currentIndex + 1],
      b: data[currentIndex + 2], 
      a: data[currentIndex + 3]
    };
    
    // Verificar si el color actual coincide con el color objetivo (dentro de la tolerancia)
    if (!colorsEqual(currentColor, targetColor, tolerance)) {
      continue;
    }
    
    // Marcar este píxel como procesado
    processedPixels.add(pixelKey);
    
    // Cambiar el color del píxel actual
    data[currentIndex] = fillRGBA.r;
    data[currentIndex + 1] = fillRGBA.g;
    data[currentIndex + 2] = fillRGBA.b;
    data[currentIndex + 3] = fillRGBA.a;
    
    // Añadir píxeles adyacentes a la pila (4-conectividad)
    pixelStack.push({x: x + 1, y: y});     // Derecha
    pixelStack.push({x: x - 1, y: y});     // Izquierda  
    pixelStack.push({x: x, y: y + 1});     // Abajo
    pixelStack.push({x: x, y: y - 1});     // Arriba
  }
  
  // Aplicar los cambios al canvas
  ctx.putImageData(imageData, 0, 0);
  
  // Re-renderizar la vista compuesta
  compositeRender();
  
  return true;
}, [compositeRender]);

//Funcion para obtener los pixeles que coinciden con ese color: 
const getMatchingPixels = useCallback((layerId, startX, startY, tolerance = 0) => {
  const canvas = layerCanvasesRef.current[layerId];
  if (!canvas) return [];
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  
  // Verificar que las coordenadas estén dentro del canvas
  if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) {
    return [];
  }
  
  // Obtener los datos de imagen del canvas completo
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Obtener el color del píxel inicial
  const startIndex = (startY * canvas.width + startX) * 4;
  const targetColor = {
    r: data[startIndex],
    g: data[startIndex + 1], 
    b: data[startIndex + 2],
    a: data[startIndex + 3]
  };
  
  // Array para almacenar los píxeles coincidentes
  const matchingPixels = [];
  
  // Pila para almacenar los píxeles a procesar
  const pixelStack = [{x: startX, y: startY}];
  const processedPixels = new Set();
  
  while (pixelStack.length > 0) {
    const {x, y} = pixelStack.pop();
    
    // Crear clave única para este píxel
    const pixelKey = `${x},${y}`;
    if (processedPixels.has(pixelKey)) continue;
    
    // Verificar límites
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
    
    // Obtener el color del píxel actual
    const currentIndex = (y * canvas.width + x) * 4;
    const currentColor = {
      r: data[currentIndex],
      g: data[currentIndex + 1],
      b: data[currentIndex + 2], 
      a: data[currentIndex + 3]
    };
    
    // Verificar si el color actual coincide con el color objetivo (dentro de la tolerancia)
    if (!colorsEqual(currentColor, targetColor, tolerance)) {
      continue;
    }
    
    // Marcar este píxel como procesado
    processedPixels.add(pixelKey);
    
    // Agregar el píxel coincidente al array
    matchingPixels.push({
      x: x,
      y: y,
      color: {
        r: currentColor.r,
        g: currentColor.g,
        b: currentColor.b,
        a: currentColor.a
      }
    });
    
    // Añadir píxeles adyacentes a la pila (4-conectividad)
    pixelStack.push({x: x + 1, y: y});     // Derecha
    pixelStack.push({x: x - 1, y: y});     // Izquierda  
    pixelStack.push({x: x, y: y + 1});     // Abajo
    pixelStack.push({x: x, y: y - 1});     // Arriba
  }
  
  // NUEVA FUNCIONALIDAD: Ordenar píxeles por distancia al origen (0,0)
  const orderedPixels = matchingPixels.sort((a, b) => {
    // Calcular distancia euclidiana al origen para cada píxel
    const distanceA = Math.sqrt(a.x * a.x + a.y * a.y);
    const distanceB = Math.sqrt(b.x * b.x + b.y * b.y);
    
    // Ordenar de menor a mayor distancia
    return distanceA - distanceB;
  });
  
  // Mostrar información de ordenamiento en consola
  console.log(`🔍 Píxeles encontrados: ${orderedPixels.length}`);
  if (orderedPixels.length > 0) {
    const closest = orderedPixels[0];
    const farthest = orderedPixels[orderedPixels.length - 1];
    const closestDistance = Math.sqrt(closest.x * closest.x + closest.y * closest.y);
    const farthestDistance = Math.sqrt(farthest.x * farthest.x + farthest.y * farthest.y);
    
    console.log(`📐 Más cercano a (0,0): (${closest.x}, ${closest.y}) - distancia: ${closestDistance.toFixed(2)}`);
    console.log(`📐 Más alejado de (0,0): (${farthest.x}, ${farthest.y}) - distancia: ${farthestDistance.toFixed(2)}`);
  }
  
  // Retornar el array ordenado
  return orderedPixels;
}, []);


const gradientFloodFill = useCallback((layerId, startX, startY, gradientParams, gradientPixels, tolerance = 0) => {
  const canvas = layerCanvasesRef.current[layerId];
  if (!canvas) return false;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  
  // Verificar que las coordenadas estén dentro del canvas
  if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) {
    return false;
  }
  
  // Destructurar parámetros del gradiente
  const {
    isGradientMode,
    gradientStops,
    gradientType = 'linear',
    gradientAngle = 90,
    dithering = false,          // Nuevo parámetro para activar dithering
    ditheringType = 'halftone-radial',    // Tipo de dithering: 'noise', 'ordered', 'checkerboard', 'horizontal', 'vertical', 'diagonal', 'random', 'halftone_radial'
    ditheringStrength = 1     // Intensidad del dithering (0.0 - 1.0)
  } = gradientParams;
  
  // Si no está en modo gradiente, retornar false
  if (!isGradientMode || !gradientStops || gradientStops.length < 2) {
    return false;
  }
  
  // Obtener los píxeles que coinciden con el área a rellenar
  const matchingPixels = gradientPixels ? gradientPixels : getMatchingPixels(layerId, startX, startY, tolerance);
  
  if (matchingPixels.length === 0) {
    return true; // No hay píxeles que cambiar
  }
  
  // Calcular el bounding box de los píxeles coincidentes
  const minX = Math.min(...matchingPixels.map(p => p.x));
  const maxX = Math.max(...matchingPixels.map(p => p.x));
  const minY = Math.min(...matchingPixels.map(p => p.y));
  const maxY = Math.max(...matchingPixels.map(p => p.y));
  
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Ordenar los gradient stops por posición
  const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
  
  // Función para interpolar color entre dos stops
  const interpolateColor = (stop1, stop2, t) => {
    return {
      r: Math.round(stop1.color.r + (stop2.color.r - stop1.color.r) * t),
      g: Math.round(stop1.color.g + (stop2.color.g - stop1.color.g) * t),
      b: Math.round(stop1.color.b + (stop2.color.b - stop1.color.b) * t),
      a: stop1.color.a + (stop2.color.a - stop1.color.a) * t
    };
  };
  
  // Función para obtener color en una posición específica del gradiente
  const getGradientColorAt = (position) => {
    // Clamp position entre 0 y 100
    position = Math.max(0, Math.min(100, position));
    
    // Encontrar los stops entre los que está la posición
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const currentStop = sortedStops[i];
      const nextStop = sortedStops[i + 1];
      
      if (position >= currentStop.position && position <= nextStop.position) {
        // Calcular el factor de interpolación
        const range = nextStop.position - currentStop.position;
        const t = range === 0 ? 0 : (position - currentStop.position) / range;
        
        return interpolateColor(currentStop, nextStop, t);
      }
    }
    
    // Si llegamos aquí, usar el primer o último stop
    if (position <= sortedStops[0].position) {
      return sortedStops[0].color;
    } else {
      return sortedStops[sortedStops.length - 1].color;
    }
  };
  
  // Función para aplicar diferentes tipos de dithering
  const applyDithering = (color, x, y) => {
    if (!dithering) return color;
    
    let ditherValue = 0;
    
    switch (ditheringType) {
      case 'noise':
        // Ruido pseudoaleatorio basado en coordenadas
        const noise = ((x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        ditherValue = (noise - 0.5) * ditheringStrength * 32;
        break;
        
      case 'ordered':
        // Dithering ordenado (Bayer matrix 4x4)
        const bayerMatrix = [
          [0, 8, 2, 10],
          [12, 4, 14, 6],
          [3, 11, 1, 9],
          [15, 7, 13, 5]
        ];
        const patternX = x % 4;
        const patternY = y % 4;
        ditherValue = ((bayerMatrix[patternY][patternX] / 16) - 0.5) * ditheringStrength * 24;
        break;
        
      case 'checkerboard':
        // Patrón de tablero de ajedrez
        const isEven = (x + y) % 2 === 0;
        ditherValue = isEven ? ditheringStrength * 16 : -ditheringStrength * 16;
        break;
        
      case 'horizontal':
        // Líneas horizontales
        ditherValue = (y % 2 === 0) ? ditheringStrength * 12 : -ditheringStrength * 12;
        break;
        
      case 'vertical':
        // Líneas verticales
        ditherValue = (x % 2 === 0) ? ditheringStrength * 12 : -ditheringStrength * 12;
        break;
        
      case 'diagonal':
        // Líneas diagonales
        ditherValue = ((x + y) % 2 === 0) ? ditheringStrength * 12 : -ditheringStrength * 12;
        break;
        
      case 'random':
        // Completamente aleatorio (usando coordenadas como seed)
        const seed = x * 1000 + y;
        const randomValue = (Math.sin(seed) * 10000) % 1;
        ditherValue = (randomValue - 0.5) * ditheringStrength * 28;
        break;
        
      case 'dots':
        // Patrón de puntos
        const dotPattern = (x % 3 === 1 && y % 3 === 1) ? 1 : 0;
        ditherValue = dotPattern * ditheringStrength * 20 - ditheringStrength * 10;
        break;
        
      case 'cross':
        // Patrón de cruces
        const crossPattern = (x % 3 === 1 || y % 3 === 1) ? 1 : 0;
        ditherValue = crossPattern * ditheringStrength * 15 - ditheringStrength * 7.5;
        break;
        
      case 'halftone':
        // Simulación de halftone (puntos que varían según la intensidad)
        const centerX = x % 4;
        const centerY = y % 4;
        const distance = Math.sqrt(Math.pow(centerX - 1.5, 2) + Math.pow(centerY - 1.5, 2));
        ditherValue = (distance < 1.5) ? ditheringStrength * 18 : -ditheringStrength * 6;
        break;
        
      case 'halftone_radial':
        // Halftone radial como en tu imagen - puntos que varían de tamaño según intensidad
        const cellSize = 8; // Tamaño de la celda del halftone
        const cellX = x % cellSize;
        const cellY = y % cellSize;
        const centerCellX = cellSize / 2;
        const centerCellY = cellSize / 2;
        
        // Calcular distancia desde el centro de la celda
        const distanceFromCenter = Math.sqrt(
          Math.pow(cellX - centerCellX, 2) + Math.pow(cellY - centerCellY, 2)
        );
        
        // Calcular la intensidad del color original (brightness)
        const brightness = (color.r * 0.299 + color.g * 0.587 + color.b * 0.114) / 255;
        
        // El radio del punto depende de la intensidad (más oscuro = punto más grande)
        const maxRadius = cellSize * 0.4;
        const pointRadius = maxRadius * (1 - brightness) * ditheringStrength;
        
        // Si estamos dentro del radio del punto, hacer más oscuro, sino más claro
        if (distanceFromCenter <= pointRadius) {
          ditherValue = -80 * ditheringStrength; // Hacer más oscuro (el punto)
        } else {
          ditherValue = 40 * ditheringStrength; // Hacer más claro (el fondo)
        }
        break;
        case 'orderedThreshold': {
          // Matriz Bayer 4x4 normalizada [0, 1)
          const bayerMatrix = [
            [ 0 / 16,  8 / 16,  2 / 16, 10 / 16],
            [12 / 16,  4 / 16, 14 / 16,  6 / 16],
            [ 3 / 16, 11 / 16,  1 / 16,  9 / 16],
            [15 / 16,  7 / 16, 13 / 16,  5 / 16]
          ];
          const patternX = x % 4;
          const patternY = y % 4;
          const threshold = bayerMatrix[patternY][patternX];
        
          // Obtener brillo normalizado del color
          const brightness = (color.r * 0.299 + color.g * 0.587 + color.b * 0.114) / 255;
        
          // Comparar brillo con threshold
          const isOn = brightness > threshold;
        
          const value = isOn ? 255 : 0;
          return { r: value, g: value, b: value, a: color.a };
        }
        break;
        
        case 'orderedColor': {
          const bayerMatrix = [
            [ 0 / 16,  8 / 16,  2 / 16, 10 / 16],
            [12 / 16,  4 / 16, 14 / 16,  6 / 16],
            [ 3 / 16, 11 / 16,  1 / 16,  9 / 16],
            [15 / 16,  7 / 16, 13 / 16,  5 / 16]
          ];
        
          const patternX = x % 4;
          const patternY = y % 4;
          const threshold = bayerMatrix[patternY][patternX]; // entre 0 y 1
        
          // Para cada canal, compara contra el umbral + ditheringStrength
          const applyToChannel = (channelValue) => {
            const normalized = channelValue / 255;
            return normalized > threshold ? 255 : 0;
          };
        
          return {
            r: applyToChannel(color.r),
            g: applyToChannel(color.g),
            b: applyToChannel(color.b),
            a: color.a
          };
        }
        
      default:
        ditherValue = 0;
    }
    
    // Aplicar el dithering al color
    return {
      r: Math.max(0, Math.min(255, Math.round(color.r + ditherValue))),
      g: Math.max(0, Math.min(255, Math.round(color.g + ditherValue))),
      b: Math.max(0, Math.min(255, Math.round(color.b + ditherValue))),
      a: color.a
    };
  };
  
  // Función para calcular la posición en el gradiente según el tipo
  const calculateGradientPosition = (x, y) => {
    if (gradientType === 'linear') {
      const angleRad = (gradientAngle * Math.PI) / 180;
      
      // Centrar las coordenadas (-0.5 a 0.5)
      const normalizedX = (x - minX) / Math.max(width - 1, 1) - 0.5;
      const normalizedY = (y - minY) / Math.max(height - 1, 1) - 0.5;
      
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      
      // Proyectar el punto
      const projection = normalizedX * cos + normalizedY * sin;
      
      // Mapear de [-0.5, 0.5] a [0, 100]
      return (projection + 0.5) * 100;
    } else if (gradientType === 'radial') {
      // Para gradiente radial, calcular distancia desde el centro
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      
      // Calcular distancia máxima posible (desde el centro a la esquina más lejana)
      const maxDistance = Math.sqrt(
        Math.pow(width / 2, 2) + Math.pow(height / 2, 2)
      );
      
      // Calcular distancia actual desde el centro
      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );
      
      // Convertir a porcentaje (0-100)
      return Math.min(100, (distance / maxDistance) * 100);
    }
    
    return 0;
  };
  
  // Obtener los datos de imagen del canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Aplicar el gradiente a cada píxel coincidente
  matchingPixels.forEach(pixel => {
    const { x, y } = pixel;
    
    // Calcular la posición en el gradiente para este píxel
    const gradientPosition = calculateGradientPosition(x, y);
    
    // Obtener el color del gradiente en esa posición
    let gradientColor = getGradientColorAt(gradientPosition);
    
    // Aplicar dithering si está activado
    if (dithering) {
      gradientColor = applyDithering(gradientColor, x, y);
    }
    
    // Aplicar el color al píxel en el imageData
    const index = (y * canvas.width + x) * 4;
    data[index] = gradientColor.r;
    data[index + 1] = gradientColor.g;
    data[index + 2] = gradientColor.b;
    data[index + 3] = Math.round(gradientColor.a * 255);
  });
  
  // Aplicar los cambios al canvas
  ctx.putImageData(imageData, 0, 0);
  
  // Re-renderizar la vista compuesta
  compositeRender();
  
  console.log(`🎨 Gradiente aplicado a ${matchingPixels.length} píxeles`);
  console.log(`📐 Área: ${width}x${height} px, Tipo: ${gradientType}, Ángulo: ${gradientAngle}°`);
  if (dithering) {
    console.log(`🔀 Dithering activado (tipo: ${ditheringType}, fuerza: ${ditheringStrength})`);
  }
  
  return true;
}, [getMatchingPixels, compositeRender]);
// Ejemplo de uso:
// const pixelesCoincidentes = getMatchingPixels('layer1', 100, 150, 10);
// console.log(`Se encontraron ${pixelesCoincidentes.length} píxeles coincidentes`);

/**
 * Función auxiliar para normalizar diferentes formatos de color a objeto RGBA
 * @param {Object|string} color - Color en formato objeto {r,g,b,a}, string "rgba(r,g,b,a)", hex "#RRGGBB", etc.
 * @returns {Object|null} - Objeto con propiedades r, g, b, a (0-255) o null si es inválido
 */
function normalizeToRGBA(color) {
  // Si ya es un objeto RGBA válido
  if (typeof color === 'object' && color !== null) {
    const { r, g, b, a = 255 } = color;
    if (isValidRGBAValue(r) && isValidRGBAValue(g) && isValidRGBAValue(b) && isValidRGBAValue(a)) {
      return { 
        r: Math.round(r), 
        g: Math.round(g), 
        b: Math.round(b), 
        a: Math.round(a*255) 
      };
    }
  }
  
  // Si es un string, intentar parsearlo
  if (typeof color === 'string') {
    const trimmed = color.trim();
    
    // Formato rgba(r, g, b, a) o rgb(r, g, b)
    const rgbaMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      const a = rgbaMatch[4] ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255;
      
      if (isValidRGBAValue(r) && isValidRGBAValue(g) && isValidRGBAValue(b) && isValidRGBAValue(a)) {
        return { r, g, b, a };
      }
    }
    
    // Formato hex #RRGGBB o #RRGGBBAA
    const hex = trimmed.replace('#', '');
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) : 255;
      
      if (isValidRGBAValue(r) && isValidRGBAValue(g) && isValidRGBAValue(b) && isValidRGBAValue(a)) {
        return { r, g, b, a };
      }
    }
  }
  
  return null; // Formato no reconocido o inválido
}

/**
 * Función auxiliar para validar si un valor RGBA está en el rango correcto
 * @param {number} value - Valor a validar
 * @returns {boolean} - True si el valor está entre 0 y 255
 */
function isValidRGBAValue(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 255;
}

/**
 * Función auxiliar para comparar dos colores con tolerancia
 * @param {Object} color1 - Primer color {r, g, b, a}
 * @param {Object} color2 - Segundo color {r, g, b, a}
 * @param {number} tolerance - Tolerancia de diferencia (0-255)
 * @returns {boolean} - True si los colores son similares dentro de la tolerancia
 */
function colorsEqual(color1, color2, tolerance) {
  return Math.abs(color1.r - color2.r) <= tolerance &&
         Math.abs(color1.g - color2.g) <= tolerance &&
         Math.abs(color1.b - color2.b) <= tolerance &&
         Math.abs(color1.a - color2.a) <= tolerance;
}

/**
 * Función auxiliar para convertir objeto RGBA a string CSS
 * @param {Object} rgba - Objeto color {r, g, b, a}
 * @returns {string} - String en formato "rgba(r, g, b, a)"
 */
function rgbaToString(rgba) {
  const alpha = rgba.a / 255; // Convertir de 0-255 a 0-1 para CSS
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`;
}

/**
 * Función auxiliar para crear un objeto RGBA desde valores individuales
 * @param {number} r - Valor rojo (0-255)
 * @param {number} g - Valor verde (0-255)
 * @param {number} b - Valor azul (0-255)
 * @param {number} a - Valor alpha (0-255, por defecto 255)
 * @returns {Object} - Objeto RGBA
 */
function createRGBA(r, g, b, a = 255) {
  return { 
    r: Math.max(0, Math.min(255, Math.round(r))), 
    g: Math.max(0, Math.min(255, Math.round(g))), 
    b: Math.max(0, Math.min(255, Math.round(b))), 
    a: Math.max(0, Math.min(255, Math.round(a))) 
  };
}


// Agregar estas funciones antes del return del hook

/**
 * Crear un nuevo grupo de píxeles en una capa específica
 * @param {string} layerId - ID de la capa donde crear el grupo
 * @param {Array} selectedPixels - Array de píxeles con formato [{x, y, color: {r, g, b, a}}, ...]
 * @param {string} groupName - Nombre opcional para el grupo
 * @returns {string} - ID del grupo creado
 */
// Modificar la estructura de grupos para incluir zIndex
// 3. MODIFICAR LA FUNCIÓN createPixelGroup (cambiar la llamada a addGroupLayer)
const createPixelGroup = useCallback((layerId, selectedPixels, groupName) => {
  const groupLayerId = addGroupLayer(layerId);
  const groupId = nanoid();
  
  // 1. Crear nueva capa de grupo
  const newGroupLayer = {
    id: groupLayerId,
    name: `Grupo ${groupName}`,
    visible: true,
    zIndex: Math.max(...layers.map(l => l.zIndex), 0) + 1,
    isGroupLayer: true,
    parentLayerId: layerId
  };

  // 2. Crear canvas para el grupo
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  layerCanvasesRef.current[groupLayerId] = canvas;

  // 3. Actualizar el frame actual INMEDIATAMENTE
  if (frames[currentFrame]) {
    const updatedFrames = { ...frames };
    const currentFrameData = updatedFrames[currentFrame];
    
    // Actualizar capas del frame
    currentFrameData.layers = [...currentFrameData.layers, newGroupLayer];
    
    // Actualizar grupos de píxeles
    if (!currentFrameData.pixelGroups[groupLayerId]) {
      currentFrameData.pixelGroups[groupLayerId] = {};
    }
    currentFrameData.pixelGroups[groupLayerId][groupId] = {
      id: groupId,
      name: groupName,
      pixels: selectedPixels,
      visible: true,
      zIndex: 0
    };
    
    // Actualizar canvases
    currentFrameData.canvases[groupLayerId] = canvas;
    
    setFrames(updatedFrames);
    setPixelGroups(currentFrameData.pixelGroups);
    setLayers(prev => [...prev, newGroupLayer]); // Sincronizar estado global
  }

  return { groupId, groupLayerId };
}, [layers, frames, currentFrame, width, height]);

/**
 * Eliminar un grupo de píxeles
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo a eliminar
 * @returns {boolean} - True si se eliminó correctamente
 */
const deletePixelGroup = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    delete layerGroups[groupId];
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });

  // Si el grupo eliminado era el seleccionado, limpiar la selección
  if (selectedGroup && selectedGroup.id === groupId) {
    setSelectedGroup(null);
  }

  return true;
}, [selectedGroup]);

/**
 * Obtener todos los grupos de una capa específica
 * @param {string} layerId - ID de la capa
 * @returns {Array} - Array de grupos de la capa
 */
const getLayerGroups = useCallback((layerId) => {
  return Object.values(pixelGroups[layerId] || {});
}, [pixelGroups]);

/**
 * Obtener todos los grupos de todas las capas
 * @returns {Object} - Objeto con todos los grupos organizados por capa
 */
const getAllGroups = useCallback(() => {
  return pixelGroups;
}, [pixelGroups]);

/**
 * Verificar si un píxel específico pertenece a algún grupo y devolver los píxeles del grupo
 * @param {number} x - Coordenada X del píxel
 * @param {number} y - Coordenada Y del píxel
 * @param {string} layerId - ID de la capa (opcional, si no se proporciona busca en todas las capas)
 * @returns {Object|null} - Objeto con información del grupo y sus píxeles, o null si no pertenece a ningún grupo
 */
const getPixelGroupAt = useCallback((x, y, layerId = null) => {
  // Si se especifica una capa, buscar solo en esa capa
  if (layerId) {
    const layerGroups = pixelGroups[layerId] || {};
    
    for (const group of Object.values(layerGroups)) {
      if (!group.visible) continue; // Saltar grupos invisibles
      
      const foundPixel = group.pixels.find(pixel => pixel.x === x && pixel.y === y);
      if (foundPixel) {
        return {
          group: group,
          selectedPixels: group.pixels,
          layerId: layerId
        };
      }
    }
  } else {
    // Buscar en todas las capas
    for (const [currentLayerId, layerGroups] of Object.entries(pixelGroups)) {
      for (const group of Object.values(layerGroups)) {
        if (!group.visible) continue; // Saltar grupos invisibles
        
        const foundPixel = group.pixels.find(pixel => pixel.x === x && pixel.y === y);
        if (foundPixel) {
          return {
            group: group,
            selectedPixels: group.pixels,
            layerId: currentLayerId
          };
        }
      }
    }
  }
  
  return null; // No se encontró el píxel en ningún grupo
}, [pixelGroups]);

/**
 * Verificar si un píxel pertenece a un grupo específico
 * @param {number} x - Coordenada X del píxel
 * @param {number} y - Coordenada Y del píxel
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @returns {boolean} - True si el píxel pertenece al grupo
 */
const isPixelInGroup = useCallback((x, y, layerId, groupId) => {
  const layerGroups = pixelGroups[layerId] || {};
  const group = layerGroups[groupId];
  
  if (!group) return false;
  
  return group.pixels.some(pixel => pixel.x === x && pixel.y === y);
}, [pixelGroups]);

/**
 * Seleccionar un grupo específico (establecer como grupo activo)
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @returns {Array} - Array de píxeles del grupo seleccionado
 */
const selectPixelGroup = useCallback((layerId, groupId) => {
  const layerGroups = pixelGroups[layerId] || {};
  const group = layerGroups[groupId];
  
  if (!group) {
    console.warn(`Grupo ${groupId} no encontrado en la capa ${layerId}`);
    return [];
  }
  
  setSelectedGroup({
    ...group,
    layerId: layerId
  });
  
  return group.pixels;
}, [pixelGroups]);

/**
 * Limpiar la selección de grupo activo
 */
const clearSelectedGroup = useCallback(() => {
  setSelectedGroup(null);
}, []);

/**
 * Renombrar un grupo
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @param {string} newName - Nuevo nombre para el grupo
 * @returns {boolean} - True si se renombró correctamente
 */
const renamePixelGroup = useCallback((layerId, groupId, newName) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    if (layerGroups[groupId]) {
      layerGroups[groupId] = {
        ...layerGroups[groupId],
        name: newName
      };
    }
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
  
  return true;
}, []);

/**
 * Alternar la visibilidad de un grupo
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @returns {boolean} - Nuevo estado de visibilidad
 */
const toggleGroupVisibility = useCallback((layerId, groupId) => {
  let newVisibility = false;
  
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    if (layerGroups[groupId]) {
      newVisibility = !layerGroups[groupId].visible;
      layerGroups[groupId] = {
        ...layerGroups[groupId],
        visible: newVisibility
      };
    }
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
  
  return newVisibility;
}, []);

/**
 * Actualizar los píxeles de un grupo existente
 * @param {string} layerId - ID de la capa
 * @param {string} groupId - ID del grupo
 * @param {Array} newPixels - Nuevos píxeles para el grupo
 * @returns {boolean} - True si se actualizó correctamente
 */
const updatePixelGroup = useCallback((layerId, groupId, newPixels) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    if (layerGroups[groupId]) {
      layerGroups[groupId] = {
        ...layerGroups[groupId],
        pixels: [...newPixels]
      };
    }
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
  
  return true;
}, []);

// Aquìi todo lo relacionado con la mejora de overlays de los grupos y jerarquia:
// Funciones para manejar la jerarquía de grupos
const moveGroupUp = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    const allGroups = Object.values(layerGroups);
    const currentGroup = layerGroups[groupId];
    
    if (!currentGroup) return prevGroups;
    
    // Encontrar el grupo que está inmediatamente encima
    const sortedGroups = allGroups.sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedGroups.findIndex(g => g.id === groupId);
    
    // Si ya está en la cima, no hacer nada
    if (currentIndex === sortedGroups.length - 1) return prevGroups;
    
    // Intercambiar zIndex con el grupo de arriba
    const groupAbove = sortedGroups[currentIndex + 1];
    const tempZIndex = currentGroup.zIndex;
    
    layerGroups[groupId] = { ...currentGroup, zIndex: groupAbove.zIndex };
    layerGroups[groupAbove.id] = { ...groupAbove, zIndex: tempZIndex };
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
}, []);

const moveGroupDown = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    const allGroups = Object.values(layerGroups);
    const currentGroup = layerGroups[groupId];
    
    if (!currentGroup) return prevGroups;
    
    // Encontrar el grupo que está inmediatamente debajo
    const sortedGroups = allGroups.sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedGroups.findIndex(g => g.id === groupId);
    
    // Si ya está en el fondo, no hacer nada
    if (currentIndex === 0) return prevGroups;
    
    // Intercambiar zIndex con el grupo de abajo
    const groupBelow = sortedGroups[currentIndex - 1];
    const tempZIndex = currentGroup.zIndex;
    
    layerGroups[groupId] = { ...currentGroup, zIndex: groupBelow.zIndex };
    layerGroups[groupBelow.id] = { ...groupBelow, zIndex: tempZIndex };
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
}, []);

const moveGroupToTop = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    const currentGroup = layerGroups[groupId];
    
    if (!currentGroup) return prevGroups;
    
    // Asignar un nuevo zIndex que sea el más alto
    const maxZIndex = Math.max(...Object.values(layerGroups).map(g => g.zIndex), -1);
    layerGroups[groupId] = { ...currentGroup, zIndex: maxZIndex + 1 };
    
    // Actualizar el contador global si es necesario
    setNextGroupZIndex(prev => Math.max(prev, maxZIndex + 2));
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
}, []);

const moveGroupToBottom = useCallback((layerId, groupId) => {
  setPixelGroups(prevGroups => {
    const layerGroups = { ...prevGroups[layerId] };
    const currentGroup = layerGroups[groupId];
    
    if (!currentGroup) return prevGroups;
    
    // Asignar un nuevo zIndex que sea el más bajo
    const minZIndex = Math.min(...Object.values(layerGroups).map(g => g.zIndex), 1);
    layerGroups[groupId] = { ...currentGroup, zIndex: minZIndex - 1 };
    
    return {
      ...prevGroups,
      [layerId]: layerGroups
    };
  });
}, []);

// Función mejorada para obtener grupos en una posición considerando jerarquía
const getGroupsAtPosition = useCallback((x, y, layerId = null) => {
  const foundGroups = [];
  
  // Si se especifica una capa, buscar solo en esa capa
  if (layerId) {
    const layerGroups = pixelGroups[layerId] || {};
    
    Object.values(layerGroups).forEach(group => {
      if (!group.visible) return;
      
      const foundPixel = group.pixels.find(pixel => pixel.x === x && pixel.y === y);
      if (foundPixel) {
        foundGroups.push({
          group: group,
          layerId: layerId,
          pixel: foundPixel
        });
      }
    });
  } else {
    // Buscar en todas las capas
    Object.entries(pixelGroups).forEach(([currentLayerId, layerGroups]) => {
      Object.values(layerGroups).forEach(group => {
        if (!group.visible) return;
        
        const foundPixel = group.pixels.find(pixel => pixel.x === x && pixel.y === y);
        if (foundPixel) {
          foundGroups.push({
            group: group,
            layerId: currentLayerId,
            pixel: foundPixel
          });
        }
      });
    });
  }
  
  // Ordenar por zIndex (el más alto primero)
  return foundGroups.sort((a, b) => b.group.zIndex - a.group.zIndex);
}, [pixelGroups]);

// Obtener el grupo más alto en una posición
const getTopGroupAt = useCallback((x, y, layerId = null) => {
  const groups = getGroupsAtPosition(x, y, layerId);
  return groups.length > 0 ? groups[0] : null;
}, [getGroupsAtPosition]);

// Renderizado de overlays mejorado con jerarquía
const renderGroupOverlays = useCallback((ctx) => {
  // Obtener todos los grupos de todas las capas visibles
  const allGroupsToRender = [];
  
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  
  for (const layer of sortedLayers) {
    if (!layer.visible) continue;
    
    const layerGroups = pixelGroups[layer.id] || {};
    
    Object.values(layerGroups).forEach(group => {
      if (!group.visible) return;
      
      allGroupsToRender.push({
        ...group,
        layerId: layer.id,
        layerZIndex: layer.zIndex
      });
    });
  }
  
  // Ordenar primero por capa, luego por zIndex del grupo
  allGroupsToRender.sort((a, b) => {
    if (a.layerZIndex !== b.layerZIndex) {
      return a.layerZIndex - b.layerZIndex;
    }
    return a.zIndex - b.zIndex;
  });
  
  // Renderizar grupos en orden jerárquico
  allGroupsToRender.forEach(group => {
    const isSelected = selectedGroup?.id === group.id;
    
    group.pixels.forEach(pixel => {
      // Verificar si el píxel está en el viewport
      if (pixel.x < viewportOffset.x || 
          pixel.x >= viewportOffset.x + viewportWidth ||
          pixel.y < viewportOffset.y || 
          pixel.y >= viewportOffset.y + viewportHeight) {
        return;
      }
      
      // Calcular posición en el viewport
      const viewportX = (pixel.x - viewportOffset.x) * zoom;
      const viewportY = (pixel.y - viewportOffset.y) * zoom;
      
      // Renderizar overlay del grupo con estilo jerárquico
      renderHierarchicalGroupOverlay(ctx, viewportX, viewportY, zoom, group, isSelected);
    });
  });
}, [layers, pixelGroups, selectedGroup, viewportOffset, viewportWidth, viewportHeight, zoom]);

const renderHierarchicalGroupOverlay = useCallback((ctx, x, y, zoom, group, isSelected) => {
  ctx.save();
  
  // Calcular intensidad del overlay basada en el zIndex
  const normalizedZIndex = Math.min(group.zIndex / 10, 1); // Normalizar para que no sea demasiado intenso
  
  if (isSelected) {
    // Grupo seleccionado: animación y borde distintivo
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = Math.max(2, zoom * 0.25);
    ctx.setLineDash([zoom * 0.4, zoom * 0.2]);
    
    const time = Date.now() * 0.005;
    ctx.lineDashOffset = time * zoom;
    
    // Fondo más visible para el grupo seleccionado
    ctx.fillStyle = `rgba(0, 255, 0, ${0.15 + normalizedZIndex * 0.1})`;
  } else {
    // Grupos normales: intensidad basada en jerarquía
    const hue = (group.zIndex * 60) % 360; // Diferentes colores por zIndex
    const saturation = 60 + normalizedZIndex * 30; // Más saturación = más arriba
    const lightness = 50;
    const alpha = 0.3 + normalizedZIndex * 0.3; // Más opacidad = más arriba
    
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    ctx.lineWidth = Math.max(1, zoom * (0.1 + normalizedZIndex * 0.15));
    ctx.setLineDash([]);
    
    // Fondo con intensidad jerárquica
    ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.2})`;
  }
  
  // Dibujar el overlay
  ctx.strokeRect(x, y, zoom, zoom);
  ctx.fillRect(x, y, zoom, zoom);
  
  // Añadir un pequeño indicador de nivel para grupos muy altos
  if (group.zIndex > 5) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `${Math.max(8, zoom * 0.3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(group.zIndex.toString(), x + zoom/2, y + zoom/2 + 2);
  }
  
  ctx.restore();
}, []);

// Función para obtener información detallada de jerarquía en una posición
const getHierarchyInfoAt = useCallback((x, y, layerId) => {
  const groups = getGroupsAtPosition(x, y, layerId);
  
  return {
    totalGroups: groups.length,
    topGroup: groups[0] || null,
    allGroups: groups,
    hasHierarchy: groups.length > 1,
    hierarchy: groups.map((g, index) => ({
      ...g,
      hierarchyLevel: groups.length - index,
      isTop: index === 0,
      isBottom: index === groups.length - 1
    }))
  };
}, [getGroupsAtPosition]);

// Función para ciclar entre grupos en una posición (útil para selección)
const cycleGroupSelectionAt = useCallback((x, y, layerId) => {
  const groups = getGroupsAtPosition(x, y, layerId);
  if (groups.length === 0) return null;
  
  if (!selectedGroup) {
    // Si no hay grupo seleccionado, seleccionar el de arriba
    selectPixelGroup(groups[0].layerId, groups[0].group.id);
    return groups[0];
  }
  
  // Encontrar el grupo actualmente seleccionado en la pila
  const currentIndex = groups.findIndex(g => g.group.id === selectedGroup.id);
  
  if (currentIndex === -1) {
    // El grupo seleccionado no está en esta posición, seleccionar el de arriba
    selectPixelGroup(groups[0].layerId, groups[0].group.id);
    return groups[0];
  }
  
  // Ciclar al siguiente grupo (o volver al primero)
  const nextIndex = (currentIndex + 1) % groups.length;
  selectPixelGroup(groups[nextIndex].layerId, groups[nextIndex].group.id);
  return groups[nextIndex];
}, [getGroupsAtPosition, selectedGroup, selectPixelGroup]);

const syncWithCurrentFrame = useCallback(() => {
  if (frames[currentFrame]) {
    const frameData = frames[currentFrame];
    setLayers(frameData.layers);
    setPixelGroups(frameData.pixelGroups);
    layerCanvasesRef.current = { ...frameData.canvases };
  }
}, [frames, currentFrame]);

// Usar useEffect para sincronizar cuando cambie el frame actual
useEffect(() => {
  syncWithCurrentFrame();
}, [currentFrame, syncWithCurrentFrame]);

//Funciones especiales para generar el canvas completo sin considerar viewport ni zoom=================================================================//
/**
 * Genera un canvas con todo el contenido completo (sin zoom ni viewport)
 * @param {boolean} includeHiddenLayers - Si incluir capas ocultas (por defecto false)
 * @returns {HTMLCanvasElement} - Canvas con todo el contenido en tamaño real
 */
const getFullCanvas = useCallback((includeHiddenLayers = false) => {
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = width;
  fullCanvas.height = height;
  const ctx = fullCanvas.getContext('2d');
  
  if (!ctx) return null;
  
  ctx.imageSmoothingEnabled = false;
  
  // Obtener capas jerárquicas del frame actual
  const hierarchicalLayers = getHierarchicalLayers();
  
  // Ordenar capas principales por zIndex
  const sortedMainLayers = hierarchicalLayers.sort((a, b) => a.zIndex - b.zIndex);
  
  // Renderizar cada capa
  for (const mainLayer of sortedMainLayers) {
    // Verificar visibilidad (considerando includeHiddenLayers y visibilidad por frame)
    const isMainLayerVisible = 
                             (mainLayer.visible && 
                              (mainLayer.visible[currentFrame] !== false));
    
    if (!isMainLayerVisible) continue;
    
    // Renderizar capa principal
    const mainCanvas = layerCanvasesRef.current[mainLayer.id];
    if (mainCanvas) {
      ctx.drawImage(mainCanvas, 0, 0);
    }
    
    // Renderizar capas de grupo
    for (const groupLayer of mainLayer.groupLayers) {
      const isGroupLayerVisible = includeHiddenLayers || 
                                (groupLayer.visible && 
                                 (groupLayer.visible[currentFrame] !== false));
      
      if (!isGroupLayerVisible) continue;
      
      const groupCanvas = layerCanvasesRef.current[groupLayer.id];
      if (groupCanvas) {
        ctx.drawImage(groupCanvas, 0, 0);
      }
    }
  }
  
  return fullCanvas;
  
}, [width, height, currentFrame, getHierarchicalLayers]);

/**
 * Obtiene una referencia al canvas completo como blob/URL
 * @param {string} format - Formato de imagen ('image/png', 'image/jpeg', etc.)
 * @param {number} quality - Calidad para JPEG (0-1)
 * @param {boolean} includeHiddenLayers - Si incluir capas ocultas
 * @returns {Promise<Blob>} - Blob del canvas completo
 */
const getFullCanvasBlob = useCallback(async (format = 'image/png', quality = 1.0, includeHiddenLayers = false) => {
  const fullCanvas = getFullCanvas(includeHiddenLayers);
  if (!fullCanvas) return null;
  
  return new Promise((resolve) => {
    fullCanvas.toBlob(resolve, format, quality);
  });
}, [getFullCanvas]);

/**
 * Obtiene una URL de datos del canvas completo
 * @param {string} format - Formato de imagen ('image/png', 'image/jpeg', etc.)
 * @param {number} quality - Calidad para JPEG (0-1)
 * @param {boolean} includeHiddenLayers - Si incluir capas ocultas
 * @returns {string} - Data URL del canvas completo
 */
const getFullCanvasDataURL = useCallback((format = 'image/png', quality = 1.0, includeHiddenLayers = false) => {
  const fullCanvas = getFullCanvas(includeHiddenLayers);
  if (!fullCanvas) return null;
  
  return fullCanvas.toDataURL(format, quality);
}, [getFullCanvas]);

/**
 * Descarga el canvas completo como imagen
 * @param {string} filename - Nombre del archivo (sin extensión)
 * @param {string} format - Formato de imagen ('image/png', 'image/jpeg', etc.)
 * @param {number} quality - Calidad para JPEG (0-1)
 * @param {boolean} includeHiddenLayers - Si incluir capas ocultas
 */
const downloadFullCanvas = useCallback(async (filename = 'artwork', format = 'image/png', quality = 1.0, includeHiddenLayers = false) => {
  const blob = await getFullCanvasBlob(format, quality, includeHiddenLayers);
  if (!blob) return false;
  
  // Determinar extensión basada en el formato
  const extension = format.split('/')[1] || 'png';
  
  // Crear URL temporal y descargar
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return true;
}, [getFullCanvasBlob]);

/**
 * Obtiene ImageData de una región específica del canvas completo
 * @param {number} x - Coordenada X de inicio
 * @param {number} y - Coordenada Y de inicio  
 * @param {number} regionWidth - Ancho de la región
 * @param {number} regionHeight - Alto de la región
 * @param {boolean} includeHiddenLayers - Si incluir capas ocultas
 * @returns {ImageData|null} - ImageData de la región especificada
 */
const getFullCanvasImageData = useCallback((x = 0, y = 0, regionWidth = width, regionHeight = height, includeHiddenLayers = false) => {
  const fullCanvas = getFullCanvas(includeHiddenLayers);
  if (!fullCanvas) return null;
  
  const ctx = fullCanvas.getContext('2d');
  if (!ctx) return null;
  
  // Asegurar que las coordenadas estén dentro de los límites
  const boundedX = Math.max(0, Math.min(x, width - 1));
  const boundedY = Math.max(0, Math.min(y, height - 1));
  const boundedWidth = Math.max(1, Math.min(regionWidth, width - boundedX));
  const boundedHeight = Math.max(1, Math.min(regionHeight, height - boundedY));
  
  try {
    return ctx.getImageData(boundedX, boundedY, boundedWidth, boundedHeight);
  } catch (e) {
    console.error('Error getting full canvas image data:', e);
    return null;
  }
}, [getFullCanvas, width, height]);

/**
 * Crea una copia temporal del canvas completo para manipulación externa
 * @param {boolean} includeHiddenLayers - Si incluir capas ocultas
 * @returns {HTMLCanvasElement} - Copia independiente del canvas completo
 */
const createFullCanvasCopy = useCallback((includeHiddenLayers = false) => {
  const originalCanvas = getFullCanvas(includeHiddenLayers);
  if (!originalCanvas) return null;
  
  // Crear una copia completamente independiente
  const copyCanvas = document.createElement('canvas');
  copyCanvas.width = originalCanvas.width;
  copyCanvas.height = originalCanvas.height;
  
  const copyCtx = copyCanvas.getContext('2d');
  if (!copyCtx) return null;
  
  copyCtx.imageSmoothingEnabled = false;
  copyCtx.drawImage(originalCanvas, 0, 0);
  
  return copyCanvas;
}, [getFullCanvas]);

//=============== Exportación/Importación ============================================== //

// Agregar esta función al hook useLayerManager
const exportLayersAndFrames = useCallback(() => {
  const exportData = {
    metadata: {
      ...framesResume.metadata,
      width: width,
      height: height,
      exportDate: new Date().toISOString(),
      version: "1.0"
    },
    
    // Definición global de capas
    layerDefinitions: { ...framesResume.layers },
    
    // Datos por frame
    frameData: {}
  };
  
  // Exportar cada frame con sus capas individuales
  Object.keys(frames).forEach(frameNumber => {
    const frame = frames[frameNumber];
    
    exportData.frameData[frameNumber] = {
      duration: frame.frameDuration,
      tags: frame.tags || [],
      layers: {}
    };
    
    // Exportar cada capa del frame
    frame.layers.forEach(layer => {
      const canvas = frame.canvases[layer.id];
      
      // Exportar canvas como ImageData comprimido
      let canvasData = null;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Solo guardar píxeles no transparentes para eficiencia
        const compressedPixels = [];
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]; // Alpha
          if (a > 0) { // Solo píxeles visibles
            const pixelIndex = i / 4;
            const x = pixelIndex % canvas.width;
            const y = Math.floor(pixelIndex / canvas.width);
            
            compressedPixels.push({
              x: x,
              y: y,
              r: data[i],
              g: data[i + 1],
              b: data[i + 2],
              a: data[i + 3]
            });
          }
        }
        
        canvasData = {
          width: canvas.width,
          height: canvas.height,
          pixels: compressedPixels
        };
      }
      
      exportData.frameData[frameNumber].layers[layer.id] = {
        // Propiedades de la capa en este frame
        name: layer.name,
        visible: layer.visible[frameNumber] ?? true,
        opacity: layer.opacity ?? 1.0,
        zIndex: layer.zIndex,
        isGroupLayer: layer.isGroupLayer || false,
        parentLayerId: layer.parentLayerId || null,
        blendMode: layer.blendMode ?? 'normal',
        blendModeOverride: layer.blendModeOverride ?? null,

        // Contenido pintado
        canvasData: canvasData,

        // Grupos de píxeles
        pixelGroups: frame.pixelGroups[layer.id] || {}
      };
    });
  });
  
  return exportData;
}, [frames, framesResume, width, height]);

// Continuando la función importLayersAndFrames...

const importLayersAndFrames = useCallback((importData) => {
  try {
    // Validar datos
    if (!importData.metadata || !importData.frameData) {
      throw new Error('Datos de importación inválidos');
    }
    
    console.log('🔄 Iniciando importación de animación...');
    
    // 1. Actualizar framesResume primero
    const newFramesResume = {
      metadata: {
        ...importData.metadata,
        frameCount: Object.keys(importData.frameData).length
      },
      layers: { ...importData.layerDefinitions },
      frames: {},
      computed: {
        resolvedFrames: {},
        framesByLayer: {},
        frameSequence: [],
        totalFrames: 0,
        keyframes: {}
      }
    };
    
    // 2. Procesar cada frame
    const newFrames = {};
    const frameNumbers = Object.keys(importData.frameData).map(Number).sort((a, b) => a - b);
    
    frameNumbers.forEach(frameNumber => {
      const frameData = importData.frameData[frameNumber];
      
      // Crear frame en framesResume
      newFramesResume.frames[frameNumber] = {
        layerVisibility: {},
        layerOpacity: {},
        layerHasContent: {},
        layerBlendModeOverride: {},
        canvases: {},
        pixelGroups: {},
        duration: frameData.duration || defaultFrameDuration,
        tags: frameData.tags || []
      };
      
      // Crear frame en structure
      const newFrame = {
        layers: [],
        pixelGroups: {},
        canvases: {},
        frameDuration: frameData.duration || defaultFrameDuration,
        tags: frameData.tags || []
      };
      
      // 3. Recrear capas y canvas para este frame
      Object.keys(frameData.layers).forEach(layerId => {
        const layerData = frameData.layers[layerId];
        
        // Recrear capa
        const rawBlend = layerData.blendMode;
        const rawOverride = layerData.blendModeOverride;
        const layer = {
          id: layerId,
          name: layerData.name,
          visible: {
            [frameNumber]: layerData.visible
          },
          opacity: layerData.opacity,
          zIndex: layerData.zIndex,
          isGroupLayer: layerData.isGroupLayer,
          parentLayerId: layerData.parentLayerId,
          blendMode: isValidBlendMode(rawBlend) ? rawBlend : 'normal',
          blendModeOverride: (rawOverride != null && isValidBlendMode(rawOverride))
            ? rawOverride
            : null,
        };
        
        newFrame.layers.push(layer);
        
        // Recrear canvas con contenido
        const canvas = document.createElement('canvas');
        canvas.width = importData.metadata.width;
        canvas.height = importData.metadata.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        
        // Restaurar píxeles del canvas
        if (layerData.canvasData && layerData.canvasData.pixels) {
          const imageData = ctx.createImageData(canvas.width, canvas.height);
          const data = imageData.data;
          
          // Pintar cada píxel guardado
          layerData.canvasData.pixels.forEach(pixel => {
            if (pixel.x >= 0 && pixel.x < canvas.width && 
                pixel.y >= 0 && pixel.y < canvas.height) {
              const index = (pixel.y * canvas.width + pixel.x) * 4;
              data[index] = pixel.r;
              data[index + 1] = pixel.g;
              data[index + 2] = pixel.b;
              data[index + 3] = pixel.a;
            }
          });
          
          ctx.putImageData(imageData, 0, 0);
        }
        
        newFrame.canvases[layerId] = canvas;
        newFrame.pixelGroups[layerId] = layerData.pixelGroups || {};
        
        // Actualizar framesResume para esta capa
        newFramesResume.frames[frameNumber].layerVisibility[layerId] = layerData.visible;
        newFramesResume.frames[frameNumber].layerOpacity[layerId] = layerData.opacity;
        newFramesResume.frames[frameNumber].layerHasContent[layerId] =
          layerData.canvasData && layerData.canvasData.pixels.length > 0;
        newFramesResume.frames[frameNumber].pixelGroups[layerId] = layerData.pixelGroups || {};
        // Sembrar override per-frame (sin esto, primer Ctrl+Z post-load borra los overrides importados).
        if (rawOverride != null && isValidBlendMode(rawOverride)) {
          newFramesResume.frames[frameNumber].layerBlendModeOverride[layerId] = rawOverride;
        }
        
        // Actualizar resolved frames
        if (!newFramesResume.computed.resolvedFrames[frameNumber]) {
          newFramesResume.computed.resolvedFrames[frameNumber] = {
            layerVisibility: {},
            layerOpacity: {},
            layerHasContent: {}
          };
        }
        
        newFramesResume.computed.resolvedFrames[frameNumber].layerVisibility[layerId] = layerData.visible;
        newFramesResume.computed.resolvedFrames[frameNumber].layerOpacity[layerId] = layerData.opacity;
        newFramesResume.computed.resolvedFrames[frameNumber].layerHasContent[layerId] = 
          layerData.canvasData && layerData.canvasData.pixels.length > 0;
      });
      
      newFrames[frameNumber] = newFrame;
    });
    
    // 4. Calcular computed data
    newFramesResume.computed.frameSequence = frameNumbers;
    newFramesResume.computed.totalFrames = frameNumbers.length;
    
    // Calcular framesByLayer y keyframes
    Object.keys(newFramesResume.layers).forEach(layerId => {
      const framesWithContent = [];
      const keyframesList = [];
      
      frameNumbers.forEach(frameNum => {
        if (newFramesResume.frames[frameNum].layerHasContent[layerId]) {
          framesWithContent.push(frameNum);
          keyframesList.push(frameNum); // Por simplicidad, todos los frames con contenido son keyframes
        }
      });
      
      newFramesResume.computed.framesByLayer[layerId] = framesWithContent;
      newFramesResume.computed.keyframes[layerId] = keyframesList;
    });
    
    // 5. Aplicar cambios al estado
    isRestoringRef.current = true; // Evitar guardar en historial
    
    setFramesResume(newFramesResume);
    setFrames(newFrames);
    setFrameCount(frameNumbers.length);
    
    // 6. Configurar el frame actual
    const firstFrame = Math.min(...frameNumbers);
    setCurrentFrame(firstFrame);
    
    // 7. Sincronizar estado actual
    const currentFrameData = newFrames[firstFrame];
    if (currentFrameData) {
      setLayers(currentFrameData.layers);
      setPixelGroups(currentFrameData.pixelGroups);
      layerCanvasesRef.current = { ...currentFrameData.canvases };
      
      // Establecer capa activa
      const firstLayer = currentFrameData.layers.find(l => !l.isGroupLayer);
      if (firstLayer) {
        setActiveLayerId(firstLayer.id);
      }
    }
    
    // 8. Re-renderizar
    setTimeout(() => {
      isRestoringRef.current = false;
      requestAnimationFrame(compositeRender);
    }, 100);
    
    console.log('✅ Importación completada exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    return false;
  }
 }, [defaultFrameDuration, setFramesResume, setFrames, setFrameCount, setCurrentFrame, 
    setLayers, setPixelGroups, setActiveLayerId, compositeRender]);

    // Función para exportar a archivo JSON
const exportToJSONFile = useCallback((filename = 'animation') => {
  const data = exportLayersAndFrames();
  const jsonString = JSON.stringify(data, null, 2);
  
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  
  console.log('📁 Archivo exportado como:', `${filename}.json`);
}, [exportLayersAndFrames]);

// Función para importar desde archivo JSON
// Función simplificada para importar desde variable JSON
const importFromJSONData = useCallback((loadedData) => {
  return new Promise((resolve, reject) => {
    try {
      // Validar que loadedData sea un objeto válido
      if (!loadedData || typeof loadedData !== 'object') {
        reject(new Error('Los datos cargados no son válidos'));
        return;
      }
      
      // Si loadedData es un string, parsearlo
      let jsonData = loadedData;
      if (typeof loadedData === 'string') {
        jsonData = JSON.parse(loadedData);
      }
      
      // Importar los datos
      const success = importLayersAndFrames(jsonData);
      
      if (success) {
        console.log('📂 Datos JSON importados exitosamente');
        resolve(true);
      } else {
        reject(new Error('Error al procesar los datos importados'));
      }
      
    } catch (error) {
      reject(new Error('Error al procesar el JSON: ' + error.message));
    }
  });
}, [importLayersAndFrames]);

// Función para obtener preview de los datos JSON
const getJSONDataPreview = useCallback((loadedData) => {
  try {
    // Si es string, parsearlo
    let jsonData = loadedData;
    if (typeof loadedData === 'string') {
      jsonData = JSON.parse(loadedData);
    }
    
    const preview = {
      metadata: jsonData.metadata,
      totalFrames: Object.keys(jsonData.frameData || {}).length,
      totalLayers: Object.keys(jsonData.layerDefinitions || {}).length,
      frameNumbers: Object.keys(jsonData.frameData || {}).map(Number).sort((a, b) => a - b),
      layerNames: Object.values(jsonData.layerDefinitions || {}).map(layer => layer.name),
      isValid: !!(jsonData.metadata && jsonData.frameData && jsonData.layerDefinitions),
      exportDate: jsonData.metadata?.exportDate,
      version: jsonData.metadata?.version,
      dimensions: {
        width: jsonData.metadata?.width,
        height: jsonData.metadata?.height
      }
    };
    
    return preview;
  } catch (error) {
    return {
      isValid: false,
      error: 'JSON inválido: ' + error.message
    };
  }
}, []);

// Función que recuerda la carpeta elegida
// Clave para localStorage
const FOLDER_HANDLE_KEY = 'animationFolderHandle';

// Estado para el handle de la carpeta
const [rememberedFolderHandle, setRememberedFolderHandle] = useState(null);

// Función para guardar el handle en localStorage
const saveFolderHandleToStorage = useCallback(async (dirHandle) => {
  try {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      // Verificar si tenemos almacenamiento persistente
      const isPersistent = await navigator.storage.persist();
      console.log('📁 Almacenamiento persistente:', isPersistent);
    }
    
    // Guardar referencia del handle (solo el nombre/path para referencia)
    const folderInfo = {
      name: dirHandle.name,
      kind: dirHandle.kind,
      timestamp: Date.now()
    };
    
    localStorage.setItem(FOLDER_HANDLE_KEY, JSON.stringify(folderInfo));
    localStorage.setItem(`${FOLDER_HANDLE_KEY}_handle`, 'stored'); // Marcador
    
    // Guardar el handle real en IndexedDB (más seguro para objetos complejos)
    if ('indexedDB' in window) {
      const request = indexedDB.open('AnimationFolderDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('folderHandles')) {
          db.createObjectStore('folderHandles');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['folderHandles'], 'readwrite');
        const store = transaction.objectStore('folderHandles');
        store.put(dirHandle, 'currentFolder');
        
        console.log('✅ Carpeta guardada en IndexedDB');
      };
    }
    
  } catch (error) {
    console.warn('⚠️ No se pudo guardar la carpeta:', error);
  }
}, []);

// Función para recuperar el handle desde localStorage/IndexedDB
const loadFolderHandleFromStorage = useCallback(async () => {
  try {
    const folderInfoStr = localStorage.getItem(FOLDER_HANDLE_KEY);
    const hasHandle = localStorage.getItem(`${FOLDER_HANDLE_KEY}_handle`);
    
    if (!folderInfoStr || !hasHandle) {
      console.log('📁 No hay carpeta guardada');
      return null;
    }
    
    const folderInfo = JSON.parse(folderInfoStr);
    console.log('📁 Intentando recuperar carpeta:', folderInfo.name);
    
    // Intentar recuperar desde IndexedDB
    if ('indexedDB' in window) {
      return new Promise((resolve) => {
        const request = indexedDB.open('AnimationFolderDB', 1);
        
        request.onsuccess = async (event) => {
          try {
            const db = event.target.result;
            const transaction = db.transaction(['folderHandles'], 'readonly');
            const store = transaction.objectStore('folderHandles');
            const getRequest = store.get('currentFolder');
            
            getRequest.onsuccess = async () => {
              const dirHandle = getRequest.result;
              
              if (dirHandle) {
                // Verificar que el handle sigue siendo válido
                try {
                  const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
                  if (permission === 'granted') {
                    console.log('✅ Carpeta recuperada exitosamente:', dirHandle.name);
                    resolve(dirHandle);
                  } else {
                    console.log('❌ Permisos denegados para la carpeta guardada');
                    clearStoredFolderHandle();
                    resolve(null);
                  }
                } catch (error) {
                  console.log('❌ Carpeta guardada ya no es válida:', error);
                  clearStoredFolderHandle();
                  resolve(null);
                }
              } else {
                resolve(null);
              }
            };
            
            getRequest.onerror = () => {
              console.log('❌ Error al recuperar carpeta desde IndexedDB');
              resolve(null);
            };
          } catch (error) {
            console.log('❌ Error accediendo a IndexedDB:', error);
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.log('❌ Error abriendo IndexedDB');
          resolve(null);
        };
      });
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Error recuperando carpeta guardada:', error);
    return null;
  }
}, []);

// Función para limpiar la carpeta guardada
const clearStoredFolderHandle = useCallback(() => {
  localStorage.removeItem(FOLDER_HANDLE_KEY);
  localStorage.removeItem(`${FOLDER_HANDLE_KEY}_handle`);
  
  // Limpiar también de IndexedDB
  if ('indexedDB' in window) {
    const request = indexedDB.open('AnimationFolderDB', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['folderHandles'], 'readwrite');
      const store = transaction.objectStore('folderHandles');
      store.delete('currentFolder');
    };
  }
  
  setRememberedFolderHandle(null);
  console.log('🧹 Carpeta guardada eliminada');
}, []);

// useEffect para cargar la carpeta al inicializar
useEffect(() => {
  const initializeFolderHandle = async () => {
    if ('showDirectoryPicker' in window) {
      const savedHandle = await loadFolderHandleFromStorage();
      if (savedHandle) {
        setRememberedFolderHandle(savedHandle);
        console.log('📁 Carpeta cargada desde almacenamiento:', savedHandle.name);
      }
    }
  };
  
  initializeFolderHandle();
}, [loadFolderHandleFromStorage]);

// Función principal modificada
const exportToRememberedFolder = useCallback(async (filename = 'animation', options = {}) => {
  const {
    folderName = 'animations',
    askForFolderEachTime = false,
    createSubfolder = true
  } = options;
  
  try {
    let targetDirHandle = rememberedFolderHandle;
    
    // Si no hay carpeta recordada o se pide elegir cada vez
    if (!targetDirHandle || askForFolderEachTime) {
      if ('showDirectoryPicker' in window) {
        // Elegir carpeta base
        const baseDirHandle = await window.showDirectoryPicker();
        
        if (createSubfolder) {
          // Crear/obtener subcarpeta
          try {
            targetDirHandle = await baseDirHandle.getDirectoryHandle(folderName);
          } catch {
            targetDirHandle = await baseDirHandle.getDirectoryHandle(folderName, { create: true });
          }
        } else {
          targetDirHandle = baseDirHandle;
        }
        
        // Guardar la carpeta para próximas veces
        setRememberedFolderHandle(targetDirHandle);
        await saveFolderHandleToStorage(targetDirHandle);
        
      } else {
        // Fallback para navegadores antiguos
        return exportToDownloads(filename);
      }
    }
    
    // Verificar permisos
    try {
      const permission = await targetDirHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        // Si se deniegan los permisos, limpiar handle guardado y pedir nueva carpeta
        clearStoredFolderHandle();
        throw new Error('Permisos de escritura denegados. Seleccione una nueva carpeta.');
      }
    } catch (error) {
      // Si hay error con los permisos, la carpeta ya no es válida
      clearStoredFolderHandle();
      throw error;
    }
    
    // Crear nombre único si el archivo ya existe
    let finalFilename = `${filename}.json`;
    
    try {
      await targetDirHandle.getFileHandle(finalFilename);
      // Si llegamos aquí, el archivo existe, crear nombre único con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      finalFilename = `${filename}_${timestamp}.json`;
    } catch {
      // El archivo no existe, usar nombre original
    }
    
    // Guardar archivo
    const fileHandle = await targetDirHandle.getFileHandle(finalFilename, { create: true });
    const writable = await fileHandle.createWritable();
    
    const data = exportLayersAndFrames();
    const jsonString = JSON.stringify(data, null, 2);
    
    await writable.write(jsonString);
    await writable.close();
    
    console.log(`✅ Archivo guardado: ${finalFilename}`);
    console.log(`📁 En carpeta: ${targetDirHandle.name}`);
    
    return { 
      success: true, 
      filename: finalFilename,
      folderName: targetDirHandle.name,
      path: createSubfolder ? `${folderName}/${finalFilename}` : finalFilename
    };
    
  } catch (error) {
    console.error('❌ Error al guardar:', error);
    
    // Si hay error de permisos o carpeta inválida, limpiar almacenamiento
    if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
      clearStoredFolderHandle();
    }
    
    return { success: false, error: error.message };
  }
}, [rememberedFolderHandle, exportLayersAndFrames, saveFolderHandleToStorage, clearStoredFolderHandle]);

// Función para obtener información de la carpeta guardada
const getStoredFolderInfo = useCallback(() => {
  try {
    const folderInfoStr = localStorage.getItem(FOLDER_HANDLE_KEY);
    if (folderInfoStr) {
      const folderInfo = JSON.parse(folderInfoStr);
      return {
        hasStoredFolder: true,
        folderName: folderInfo.name,
        savedAt: new Date(folderInfo.timestamp).toLocaleString(),
        isCurrentlyLoaded: !!rememberedFolderHandle
      };
    }
  } catch (error) {
    console.warn('Error obteniendo info de carpeta:', error);
  }
  
  return {
    hasStoredFolder: false,
    folderName: null,
    savedAt: null,
    isCurrentlyLoaded: false
  };
}, [rememberedFolderHandle]);

// Función para forzar nueva selección de carpeta
const selectNewFolder = useCallback(async () => {
  clearStoredFolderHandle();
  
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setRememberedFolderHandle(dirHandle);
      await saveFolderHandleToStorage(dirHandle);
      
      console.log('✅ Nueva carpeta seleccionada:', dirHandle.name);
      return { success: true, folderName: dirHandle.name };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Selección cancelada' };
      }
      return { success: false, error: error.message };
    }
  } else {
    return { success: false, error: 'API no soportada' };
  }
}, [clearStoredFolderHandle, saveFolderHandleToStorage]);



// Función para guardar en carpeta específica usando File System Access API
const exportToSpecificFolder = useCallback(async (filename = 'animation', folderName = 'animations') => {
  try {
    // Verificar si el navegador soporta File System Access API
    if ('showDirectoryPicker' in window) {
      // Permitir al usuario elegir una carpeta
      const dirHandle = await window.showDirectoryPicker();
      
      // Crear o obtener la subcarpeta deseada
      let targetDirHandle;
      try {
        targetDirHandle = await dirHandle.getDirectoryHandle(folderName);
      } catch {
        // Si la carpeta no existe, crearla
        targetDirHandle = await dirHandle.getDirectoryHandle(folderName, { create: true });
      }
      
      // Crear el archivo en la carpeta específica
      const fileHandle = await targetDirHandle.getFileHandle(`${filename}.json`, { create: true });
      const writable = await fileHandle.createWritable();
      
      // Obtener datos y escribir
      const data = exportLayersAndFrames();
      const jsonString = JSON.stringify(data, null, 2);
      
      await writable.write(jsonString);
      await writable.close();
      
      console.log(`✅ Archivo guardado en carpeta: ${folderName}/${filename}.json`);
      return { success: true, path: `${folderName}/${filename}.json` };
      
    } else {
      // Fallback para navegadores que no soportan File System Access API
      return exportToDownloads(filename);
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('❌ Usuario canceló la selección de carpeta');
      return { success: false, error: 'Cancelado por el usuario' };
    }
    
    console.error('❌ Error al guardar en carpeta específica:', error);
    return { success: false, error: error.message };
  }
}, [exportLayersAndFrames]);

// Función fallback para navegadores antiguos
const exportToDownloads = useCallback((filename) => {
  const data = exportLayersAndFrames();
  const jsonString = JSON.stringify(data, null, 2);
  
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  
  console.log('📁 Archivo descargado a carpeta Downloads:', `${filename}.json`);
  return { success: true, path: `Downloads/${filename}.json` };
}, [exportLayersAndFrames]);

//============================== Gestion de Data URL a pintado del canvas ========================================= //
/**
 * Función para crear una nueva capa, posicionarse en el primer frame y pintar un data URL
 * @param {string} dataUrl - Data URL de la imagen a pintar
 * @param {Object} options - Opciones de configuración
 * @param {number} options.x - Posición X donde pintar (por defecto 0)
 * @param {number} options.y - Posición Y donde pintar (por defecto 0)
 * @param {number} options.width - Ancho de destino (por defecto tamaño original)
 * @param {number} options.height - Alto de destino (por defecto tamaño original)
 * @param {boolean} options.maintainAspectRatio - Mantener aspecto original (por defecto true)
 * @param {string} options.layerName - Nombre para la nueva capa (por defecto "Imported Image")
 * @param {string} options.blendMode - Modo de mezcla ('source-over', 'multiply', etc.)
 * @param {number} options.opacity - Opacidad de la imagen (0-1)
 * @returns {Promise<Object>} - Promise que resuelve con info de la capa creada
 */
const createLayerAndPaintDataUrl = useCallback(async (dataUrl, options = {}) => {
  const {
    x = 0,
    y = 0,
    width = null,
    height = null,
    maintainAspectRatio = true,
    layerName = "Imported Image",
    blendMode = 'source-over',
    opacity = 1.0
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // Validar el data URL
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        reject(new Error('Data URL inválido'));
        return;
      }

      // Crear imagen desde data URL
      const img = new Image();
      
      img.onload = () => {
        try {
          // 1. Crear una nueva capa
          const newLayerId = addLayer();
          
          // 2. Renombrar la capa
          renameLayer(newLayerId, layerName);
          
          // 3. Ir al primer frame
          const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
          const firstFrame = frameNumbers[0] || 1;
          
          if (firstFrame !== currentFrame) {
            setActiveFrame(firstFrame);
          }
          
          // 4. Calcular dimensiones finales
          let finalWidth = width || img.width;
          let finalHeight = height || img.height;
          
          // Mantener aspecto si se especifica
          if (maintainAspectRatio && (width || height)) {
            const aspectRatio = img.width / img.height;
            
            if (width && height) {
              // Si se especifican ambos, ajustar para mantener aspecto
              if (width / height > aspectRatio) {
                finalWidth = height * aspectRatio;
              } else {
                finalHeight = width / aspectRatio;
              }
            } else if (width) {
              finalHeight = width / aspectRatio;
            } else if (height) {
              finalWidth = height * aspectRatio;
            }
          }

          // 5. Pintar la imagen en la nueva capa
          drawOnLayer(newLayerId, (ctx) => {
            // Guardar estado del contexto
            ctx.save();
            
            // Aplicar configuraciones
            if (blendMode !== 'source-over') {
              ctx.globalCompositeOperation = blendMode;
            }
            
            if (opacity !== 1.0) {
              ctx.globalAlpha = opacity;
            }
            
            // Dibujar la imagen
            ctx.drawImage(
              img,
              0, 0, img.width, img.height,  // Fuente completa
              x, y, finalWidth, finalHeight  // Destino
            );
            
            // Restaurar estado del contexto
            ctx.restore();
          });

          // 6. Información de resultado
          const result = {
            layerId: newLayerId,
            layerName: layerName,
            frameId: firstFrame,
            position: { x, y },
            dimensions: { 
              width: finalWidth, 
              height: finalHeight,
              originalWidth: img.width,
              originalHeight: img.height
            },
            success: true
          };

          console.log(`✅ Nueva capa creada: "${layerName}" (ID: ${newLayerId})`);
          console.log(`📐 Imagen pintada en frame ${firstFrame}`);
          console.log(`📍 Posición: (${x}, ${y}), Tamaño: ${finalWidth}x${finalHeight}`);
          console.log(`🖼️ Tamaño original: ${img.width}x${img.height}`);
          
          resolve(result);
          
        } catch (error) {
          console.error('❌ Error al crear capa y pintar imagen:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar la imagen desde data URL'));
      };
      
      // Cargar la imagen
      img.src = dataUrl;
      
    } catch (error) {
      console.error('❌ Error en createLayerAndPaintDataUrl:', error);
      reject(error);
    }
  });
}, [addLayer, renameLayer, frames, currentFrame, setActiveFrame, drawOnLayer]);

// Función simplificada para uso rápido
const importImageFromDataUrl = useCallback(async (dataUrl, imageName = "Imported Image") => {
  try {
    const result = await createLayerAndPaintDataUrl(dataUrl, {
      layerName: imageName,
      x: 0,
      y: 0,
      maintainAspectRatio: true
    });
    
    console.log(`🎨 Imagen "${imageName}" importada exitosamente`);
    return result;
    
  } catch (error) {
    console.error(`❌ Error importando imagen "${imageName}":`, error);
    throw error;
  }
}, [createLayerAndPaintDataUrl]);

// Función para centrar la imagen en el canvas
const createLayerAndPaintDataUrlCentered = useCallback(async (dataUrl, options = {}) => {
  const {
    layerName = "Centered Image",
    maxWidth = null,
    maxHeight = null,
    ...otherOptions
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // Validar el data URL
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        reject(new Error('Data URL inválido'));
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        try {
          // Calcular dimensiones centradas
          let finalWidth = img.width;
          let finalHeight = img.height;
          
          // Aplicar límites máximos si se especifican
          if (maxWidth && finalWidth > maxWidth) {
            const ratio = maxWidth / finalWidth;
            finalWidth = maxWidth;
            finalHeight = finalHeight * ratio;
          }
          
          if (maxHeight && finalHeight > maxHeight) {
            const ratio = maxHeight / finalHeight;
            finalHeight = maxHeight;
            finalWidth = finalWidth * ratio;
          }
          
          // Calcular posición centrada
          const centerX = Math.floor((width - finalWidth) / 2);
          const centerY = Math.floor((height - finalHeight) / 2);
          
          // Usar la función principal con posición centrada
          createLayerAndPaintDataUrl(dataUrl, {
            ...otherOptions,
            x: centerX,
            y: centerY,
            width: finalWidth,
            height: finalHeight,
            layerName: layerName,
            maintainAspectRatio: true
          }).then(resolve).catch(reject);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar la imagen desde data URL'));
      };
      
      img.src = dataUrl;
      
    } catch (error) {
      reject(error);
    }
  });
}, [createLayerAndPaintDataUrl, width, height]);

// Agregar estas funciones al return del hook useLayerManager:
// createLayerAndPaintDataUrl,
// importImageFromDataUrl,
// createLayerAndPaintDataUrlCentered
//============================== Gestion de Data URL a pintado del canvas ========================================= //



// ===== RESTAURACIÓN DESDE FORMATO v2 =====
// Recibe el projectData del nuevo formato .pixcalli y los canvases ya
// deserializados (objetos canvas DOM), y restaura todo el estado del editor.
const restoreFromProjectData = useCallback(async (projectData, restoredCanvases) => {
  try {
    isRestoringRef.current = true;

    // 1. Restaurar framesResume si viene válido
    if (projectData.framesResume) {
      setFramesResume(projectData.framesResume);
    }

    // 2. Restaurar capas
    if (Array.isArray(projectData.layers) && projectData.layers.length > 0) {
      setLayers(projectData.layers);
    }

    // 3. Reconstruir `frames` desde restoredCanvases + framesResume
    // restoredCanvases tiene claves "frame_N_layerId"
    if (projectData.framesResume?.frames && restoredCanvases) {
      const newFrames = {};

      for (const [frameKey, frameResume] of Object.entries(projectData.framesResume.frames)) {
        const frameNumber = Number(frameKey);
        const frameCanvases = {};

        // Buscar todos los canvases que pertenecen a este frame
        for (const [key, canvas] of Object.entries(restoredCanvases)) {
          const prefix = `frame_${frameNumber}_`;
          if (key.startsWith(prefix)) {
            const layerId = key.slice(prefix.length);
            frameCanvases[layerId] = canvas;
          }
        }

        // Reconstruir capas del frame combinando los datos planos (layers) con
        // los datos por-frame almacenados en framesResume (opacidad, visibilidad,
        // blend mode override). Sin este merge, los overrides per-frame se pierden
        // al recargar el proyecto.
        const perFrameLayers = (projectData.layers ?? []).map((flat) => ({
          ...flat,
          visible: typeof flat.visible === 'object'
            ? flat.visible
            : { [frameNumber]: frameResume.layerVisibility?.[flat.id] ?? true },
          opacity: frameResume.layerOpacity?.[flat.id] ?? flat.opacity ?? 1,
          blendMode: flat.blendMode ?? 'normal',
          blendModeOverride: frameResume.layerBlendModeOverride?.[flat.id] ?? null,
        }));

        newFrames[frameNumber] = {
          canvases: frameCanvases,
          layers: perFrameLayers,
          frameDuration: frameResume.duration ?? (projectData.animation?.defaultFrameDuration ?? 100),
          tags: frameResume.tags ?? [],
        };
      }

      setFrames(newFrames);
    }

    // 4. Restaurar frame activo
    if (projectData.viewport?.currentFrame) {
      setCurrentFrame(projectData.viewport.currentFrame);
    }

    // 5. Restaurar capa activa
    if (projectData.viewport?.activeLayerId) {
      setActiveLayerId(projectData.viewport.activeLayerId);
    }

    // 6. Restaurar onion skin
    if (projectData.onionSkin?.settings) {
      setOnionSkinSettings(prev => ({ ...prev, ...projectData.onionSkin.settings }));
    }
    if (projectData.onionSkin?.framesConfig) {
      setOnionFramesConfig(projectData.onionSkin.framesConfig);
    }
    if (typeof projectData.onionSkin?.enabled === 'boolean') {
      setOnionSkinEnabled(projectData.onionSkin.enabled);
    }

    console.log('Proyecto restaurado correctamente desde formato v2');
    return true;
  } catch (err) {
    console.error('Error restaurando proyecto:', err);
    return false;
  } finally {
    // Pequeño delay para que React procese todos los setState antes de
    // volver a permitir que el historial registre cambios.
    setTimeout(() => { isRestoringRef.current = false; }, 100);
  }
}, [setLayers, setFramesResume, setFrames, setCurrentFrame, setActiveLayerId,
    setOnionSkinSettings, setOnionFramesConfig, setOnionSkinEnabled]);

return {
  // State
  layers,
  compositeCanvasRef,
  viewportOffset,
  activeLayerId,
  setActiveLayerId,
  
  // Layer management
  addLayer,
  deleteLayer,
  moveLayerUp,
  moveLayerDown,
  toggleLayerVisibility,
  renameLayer,
  clearLayer,
  duplicateLayer,
  
  // Drawing and rendering
  drawOnLayer,
  compositeRender,
  
  // Viewport management
  updateViewport,
  moveViewport,
  getViewportPosition,
  viewportToCanvasCoords,
  canvasToViewportCoords,
  
  // Utilities
  drawPixelLine,
  
  // Add the new function here
  getLayerData,
  getCompositeLayerData,
  erasePixels,
  getCanvasCoordsFromPointer,
  getPointerCoordsFromCanvas,
//funcion para rellenado
  floodFill,
  getMatchingPixels,
  gradientFloodFill,
  // Estado de grupos
pixelGroups,
selectedGroup,

// Funciones de manejo de grupos
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

 
  // Nuevas funciones jerárquicas
  moveGroupUp,
  moveGroupDown,
  moveGroupToTop,
  moveGroupToBottom,
  getGroupsAtPosition,
  getTopGroupAt,
  getHierarchyInfoAt,
  cycleGroupSelectionAt,
  
  // Renderizado mejorado
  renderGroupOverlays,

   // Nuevas funciones jerárquicas
   getHierarchicalLayers,
   getMainLayers,
   getGroupLayersForParent,
   setLayers,
   setPixelGroups,

   //Estados y funciones relacionadas a los frames
   // Estados de frames
  frames,
  currentFrame,
  frameCount,
   // Nuevas funciones de frames
  setActiveFrame,
  createFrame,
  deleteFrame,
  duplicateFrame,
  saveCurrentFrameState,
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

  // Onion Skin functions
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

    //funciones para gestion de tiempo de los frames:
    setFrameDuration,
    getFrameDuration,
    getFrameRate,
    setDefaultFrameRate,
    defaultFrameDuration,
//Gestion de opacida de los frames
setFrameOpacity,
getFrameOpacity,

  // === Modos de fusión ===
  resolveLayerBlendMode,
  setLayerBlendMode,
  setFrameBlendModeOverride,

    getFramesInfo, // ahora incluye información de duración



    //gestion de informacion de pintado de pixeles:
    getLayerPixelData,
    paintPixelsRGBA,

    //mejor estado de frames para el layerAnimation:
    framesResume,
    setFramesResume,

// Sistema de undo/redo mejorado
undo,
redo,
undoPixelChanges,
redoPixelChanges,
undoFrames,
redoFrames,

// Estados de disponibilidad
canUndo,
canRedo,
canUndoPixels,
canRedoPixels,
canUndoFrames,
canRedoFrames,

// Utilidades
clearHistory: clearAllHistory,
debugInfo: getCompleteDebugInfo,
getChangePreview,

// Función logPixelChanges (incluye guardado en stack)
logPixelChanges,
history,

// API low-level del historial (requerida por modales que mutan canvas completo —
// filtros, insertar texto, scripts). Permite registrar frame_state snapshots
// desde fuera del hook. Ver plan-ambicioso: cableado Sprint 1–6.
historyPush,

// Captura de trazos para undo/redo
captureStrokeStart,
finalizeStroke,
commitShapeWithHistory,

//exportacion: 
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

  //funcion especial para activar o desactivar la capa temporal:
  setActiveLighter,
//gestion del data url:

createLayerAndPaintDataUrlCentered,

// Restauración completa desde formato .pixcalli v2
restoreFromProjectData,

};
}