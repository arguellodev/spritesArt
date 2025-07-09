import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { nanoid } from 'nanoid';
import React from 'react';

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
  
  // Refs para el throttling
  const lastUpdateTime = useRef(0);
  const positionUpdateTimer = useRef(null);
  const POSITION_UPDATE_INTERVAL = 16; // ~60fps para preview
  
  // Refs estables para las dependencias
  const ignoreRefsRef = useRef(ignoreRefs);
  const optionsRef = useRef(options);
  
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
  
  // Función para actualizar estados de posición con throttling
  const schedulePositionUpdate = useCallback(() => {
    const now = Date.now();
    
    // Solo actualizar si ha pasado suficiente tiempo
    if (now - lastUpdateTime.current >= POSITION_UPDATE_INTERVAL) {
      const current = getCurrentPosition();
      setPosition(current.position);
      setRelativeToTarget(current.relativeToTarget);
      lastUpdateTime.current = now;
    } else {
      // Programar actualización para más tarde
      if (positionUpdateTimer.current) {
        clearTimeout(positionUpdateTimer.current);
      }
      
      positionUpdateTimer.current = setTimeout(() => {
        const current = getCurrentPosition();
        setPosition(current.position);
        setRelativeToTarget(current.relativeToTarget);
        lastUpdateTime.current = Date.now();
      }, POSITION_UPDATE_INTERVAL - (now - lastUpdateTime.current));
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

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (positionUpdateTimer.current) {
        clearTimeout(positionUpdateTimer.current);
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
export function useLayerManager({ width, height, viewportWidth, viewportHeight, zoom, isPressed }) {
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

  // 4. NUEVA FUNCIÓN para obtener capas de forma jerárquica
const getHierarchicalLayers = useCallback(() => {
  const mainLayers = layers.filter(layer => !layer.isGroupLayer);
  
  return mainLayers.map(mainLayer => ({
    ...mainLayer,
    groupLayers: layers.filter(layer => 
      layer.isGroupLayer && layer.parentLayerId === mainLayer.id
    ).sort((a, b) => a.zIndex - b.zIndex)
  }));
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

 // ✅ NUEVO: Cache para canvas bajo demanda
 const canvasCache = useRef(new Map());
 const maxCacheSize = useRef(50); // Límite de canvas en cache

 // ✅ NUEVO: Función para obtener o crear canvas solo cuando se necesita
 const getOrCreateCanvas = useCallback((layerId, frameNumber, forceCreate = false) => {
   const cacheKey = `${layerId}_${frameNumber}`;
   
   // Si existe en cache, devolverlo
   if (canvasCache.current.has(cacheKey) && !forceCreate) {
     return canvasCache.current.get(cacheKey);
   }
   
   // Crear nuevo canvas solo si es necesario
   const canvas = document.createElement('canvas');
   canvas.width = width;
   canvas.height = height;
   const ctx = canvas.getContext('2d');
   ctx.imageSmoothingEnabled = false;
   
   // Limpiar cache si está lleno
   if (canvasCache.current.size >= maxCacheSize.current) {
     const firstKey = canvasCache.current.keys().next().value;
     canvasCache.current.delete(firstKey);
   }
   
   canvasCache.current.set(cacheKey, canvas);
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
      const ctx = canvas.getContext('2d');
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

// Función para aplicar filtro de color a un canvas
// Función corregida para aplicar filtro de color a un canvas
const applyColorFilter = useCallback((sourceCanvas, hue, saturation, lightness, opacity) => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceCanvas.width;
  tempCanvas.height = sourceCanvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  try {
    tempCtx.drawImage(sourceCanvas, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // Convertir HSL deseado a RGB
    const [targetR, targetG, targetB] = hslToRgb(hue / 360, saturation / 100, lightness / 100);

    // Aplicar el nuevo color a cada píxel no transparente
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];

      if (a > 0) {
        data[i]     = targetR;
        data[i + 1] = targetG;
        data[i + 2] = targetB;
        data[i + 3] = Math.round(a * opacity); // mantener transparencia proporcional
      }
    }

    tempCtx.putImageData(imageData, 0, 0);
  } catch (error) {
    console.warn('Error aplicando filtro de color, usando método de respaldo:', error);
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

    const filters = [];
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
    if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
    if (lightness !== 50) filters.push(`brightness(${lightness}%)`);

    if (filters.length > 0) {
      tempCtx.filter = filters.join(' ');
    }

    tempCtx.globalAlpha = opacity;
    tempCtx.drawImage(sourceCanvas, 0, 0);
  }

  return tempCanvas;
}, []);


// Funciones auxiliares para conversión de color
const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return [h, s, l];
};

const hslToRgb = (h, s, l) => {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
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
  
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

// Función mejorada para renderizar con onion skin
// Cache para canvas filtrados
// Cache para canvas filtrados
// Cache para canvas filtrados
// Cache para canvas filtrados
const onionSkinCache = useRef(new Map());

// Función para generar key de cache
const getCacheKey = (frameNumber, layerId, config) => {
  return `${frameNumber}-${layerId}-${config.hue}-${config.saturation}-${config.lightness}-${config.opacity}`;
};

// Limpiar cache cuando sea necesario
const clearOnionSkinCache = useCallback(() => {
  onionSkinCache.current.clear();
}, []);

// Función optimizada para aplicar filtros con cache

////===================== LOgica para reproduccion de animacion =============================//
const [activePlay, setActivePlay] = useState(false);


////===================== LOgica para reproduccion de animacion =============================//







const getFilteredCanvas = useCallback((canvas, config, cacheKey) => {
  // Verificar cache primero
  if (onionSkinCache.current.has(cacheKey)) {
    return onionSkinCache.current.get(cacheKey);
  }
  
  // Crear canvas filtrado solo si no existe en cache
  const filteredCanvas = applyColorFilter(
    canvas, 
    config.hue, 
    config.saturation, 
    config.lightness, 
    config.opacity
  );
  
  // Guardar en cache con límite de tamaño
  if (onionSkinCache.current.size > 100) { // Limitar cache
    const firstKey = onionSkinCache.current.keys().next().value;
    onionSkinCache.current.delete(firstKey);
  }
  
  onionSkinCache.current.set(cacheKey, filteredCanvas);
  return filteredCanvas;
}, [applyColorFilter]);

// Memoizar cálculo de frames de onion skin
const onionFrames = useMemo(() => {
  if (!onionSkinEnabled) return [];
  
  const frames_array = [];
  const frameNumbers = Object.keys(frames).map(Number).sort((a, b) => a - b);
  
  // Frames anteriores
  for (let i = 1; i <= onionSkinSettings.previousFrames; i++) {
    const frameNumber = currentFrame - i;
    if (frames[frameNumber]) {
      const offset = -i;
      const config = getOnionSkinFrameConfig(offset);
      frames_array.push({
        frameNumber,
        frameData: frames[frameNumber],
        offset,
        type: 'previous',
        zIndex: config.zIndex,
        config
      });
    }
  }
  
  // Frames siguientes
  for (let i = 1; i <= onionSkinSettings.nextFrames; i++) {
    const frameNumber = currentFrame + i;
    if (frames[frameNumber]) {
      const offset = i;
      const config = getOnionSkinFrameConfig(offset);
      frames_array.push({
        frameNumber,
        frameData: frames[frameNumber],
        offset,
        type: 'next',
        zIndex: config.zIndex,
        config
      });
    }
  }
  
  // Frame actual
  if (frames[currentFrame]) {
    frames_array.push({
      frameNumber: currentFrame,
      frameData: frames[currentFrame],
      offset: 0,
      type: 'current',
      zIndex: 0,
      config: { opacity: 1.0, hue: 0, saturation: 100, lightness: 50 }
    });
  }

  return frames_array.sort((a, b) => a.zIndex - b.zIndex);
}, [
  onionSkinEnabled,
  currentFrame,
  frames,
  onionSkinSettings.previousFrames,
  onionSkinSettings.nextFrames,
  onionSkinSettings, // Agregar toda la configuración
  getOnionSkinFrameConfig
]);

// 8. NUEVA FUNCIÓN: renderWithOnionSkinOptimized
const renderWithOnionSkinOptimized = useCallback((ctx) => {
  // 1. Frames anteriores (con menor opacidad)
  for (let i = onionSkinSettings.previousFrames; i >= 1; i--) {
    const frameNumber = currentFrame - i;
    if (frames[frameNumber]) {
      const config = getOnionSkinFrameConfig(-i);
      renderFrameSimple(ctx, frameNumber, config.opacity);
    }
  }
  
  // 2. Frame actual (opacidad completa)
  renderFrameSimple(ctx, currentFrame, 1.0);
  
  // 3. Frames siguientes (con menor opacidad)
  for (let i = 1; i <= onionSkinSettings.nextFrames; i++) {
    const frameNumber = currentFrame + i;
    if (frames[frameNumber]) {
      const config = getOnionSkinFrameConfig(i);
      renderFrameSimple(ctx, frameNumber, config.opacity);
    }
  }
}, [onionSkinSettings, currentFrame, frames, getOnionSkinFrameConfig]);

// 4. FUNCIÓN DE RENDERIZADO SIMPLE POR FRAME (NUEVA)
const renderFrameSimple = useCallback((ctx, frameNumber, globalOpacity) => {
  const frameData = frames[frameNumber];
  if (!frameData) return;
  
  // Obtener capas jerárquicas del frame específico
  const frameLayers = frameData.layers || [];
  const hierarchicalLayers = frameLayers
    .filter(layer => !layer.isGroupLayer)
    .map(mainLayer => ({
      ...mainLayer,
      groupLayers: frameLayers
        .filter(layer => layer.isGroupLayer && layer.parentLayerId === mainLayer.id)
        .sort((a, b) => a.zIndex - b.zIndex)
    }))
    .sort((a, b) => a.zIndex - b.zIndex);
  
  // Renderizar cada capa con la opacidad global del onion skin
  for (const mainLayer of hierarchicalLayers) {
    // Verificar visibilidad en este frame específico
    const isVisible = mainLayer.visible && (mainLayer.visible[frameNumber] !== false);
    if (!isVisible) continue;
    
    // Verificar si debe mostrarse en onion skin
    const shouldShowInOnion = frameNumber === currentFrame || shouldShowLayerInOnionSkin(mainLayer.id);
    if (!shouldShowInOnion) continue;
    
    // Renderizar capa principal
    const mainCanvas = frameData.canvases[mainLayer.id];
    if (mainCanvas) {
      const layerOpacity = (mainLayer.opacity ?? 1.0);
      const finalOpacity = layerOpacity * globalOpacity;
      
      ctx.globalAlpha = finalOpacity;
      ctx.drawImage(
        mainCanvas,
        viewportOffset.x, viewportOffset.y,
        viewportWidth, viewportHeight,
        0, 0,
        viewportWidth * zoom, viewportHeight * zoom
      );
    }
    
    // Renderizar capas de grupo
    for (const groupLayer of mainLayer.groupLayers) {
      if (!groupLayer.visible) continue;
      
      const shouldShowGroup = frameNumber === currentFrame || shouldShowLayerInOnionSkin(groupLayer.id);
      if (!shouldShowGroup) continue;
      
      const groupCanvas = frameData.canvases[groupLayer.id];
      if (groupCanvas) {
        const groupOpacity = (groupLayer.opacity ?? 1.0);
        const finalOpacity = groupOpacity * globalOpacity;
        
        ctx.globalAlpha = finalOpacity;
        ctx.drawImage(
          groupCanvas,
          viewportOffset.x, viewportOffset.y,
          viewportWidth, viewportHeight,
          0, 0,
          viewportWidth * zoom, viewportHeight * zoom
        );
      }
    }
  }
  
  // Restaurar opacidad
  ctx.globalAlpha = 1.0;
}, [frames, shouldShowLayerInOnionSkin, currentFrame, viewportOffset, viewportWidth, viewportHeight, zoom]);


const renderCurrentFrameOnly = useCallback((ctx) => {
  const hierarchicalLayers = getHierarchicalLayers();
  const sortedMainLayers = hierarchicalLayers.sort((a, b) => a.zIndex - b.zIndex);
  
  for (const mainLayer of sortedMainLayers) {
    // CAMBIO: Usar la visibilidad del frame actual solamente
    const isVisible = mainLayer.visible[currentFrame] ?? true;
    if (!isVisible) continue;
    
    // Renderizar capa principal
    const mainCanvas = layerCanvasesRef.current[mainLayer.id];
    if (mainCanvas) {
      const layerOpacity = mainLayer.opacity ?? 1.0;
      
      if (layerOpacity !== 1.0) {
        ctx.globalAlpha = layerOpacity;
      }
      
      ctx.drawImage(
        mainCanvas,
        viewportOffset.x, viewportOffset.y,
        viewportWidth, viewportHeight,
        0, 0,
        viewportWidth * zoom, viewportHeight * zoom
      );
      
      if (layerOpacity !== 1.0) {
        ctx.globalAlpha = 1.0;
      }
    }
    
    // Renderizar capas de grupo
    for (const groupLayer of mainLayer.groupLayers) {
      if (!groupLayer.visible) continue;
      
      const groupCanvas = layerCanvasesRef.current[groupLayer.id];
      if (groupCanvas) {
        const groupOpacity = groupLayer.opacity ?? 1.0;
        
        if (groupOpacity !== 1.0) {
          ctx.globalAlpha = groupOpacity;
        }
        
        ctx.drawImage(
          groupCanvas,
          viewportOffset.x, viewportOffset.y,
          viewportWidth, viewportHeight,
          0, 0,
          viewportWidth * zoom, viewportHeight * zoom
        );
        
        if (groupOpacity !== 1.0) {
          ctx.globalAlpha = 1.0;
        }
      }
    }
  }
}, [getHierarchicalLayers, currentFrame, viewportOffset, viewportWidth, viewportHeight, zoom]);


//funcion pseudo onion skin:

const renderCurrentFrameWithAdjacent = useCallback((ctx) => {
  const hierarchicalLayers = getHierarchicalLayers();
  const sortedMainLayers = hierarchicalLayers.sort((a, b) => a.zIndex - b.zIndex);
  
  // Configuración de opacidad para frames adyacentes
  const previousFrameOpacity = 0.3; // Opacidad para frame anterior
  const nextFrameOpacity = 0.3;     // Opacidad para frame siguiente
  
  // Calcular números de frames anterior y siguiente
  const previousFrame = currentFrame - 1;
  const nextFrame = currentFrame + 1;
  
  // ============ RENDERIZAR FRAME ANTERIOR (solo capa activa) ============
  if (frames[previousFrame] && activeLayerId) {
    const previousFrameData = frames[previousFrame];
    
    // Buscar la capa activa en el frame anterior
    const previousActiveLayer = previousFrameData.layers.find(layer => layer.id === activeLayerId);
    
    if (previousActiveLayer) {
      // Verificar visibilidad en el frame anterior
      const isPreviousVisible = previousActiveLayer.visible[previousFrame] ?? true;
      
      if (isPreviousVisible) {
        // Renderizar capa principal del frame anterior
        const previousMainCanvas = previousFrameData.canvases[activeLayerId];
        if (previousMainCanvas) {
          const layerOpacity = (previousActiveLayer.opacity ?? 1.0) * previousFrameOpacity;
          
          ctx.globalAlpha = layerOpacity;
          
          ctx.drawImage(
            previousMainCanvas,
            viewportOffset.x, viewportOffset.y,
            viewportWidth, viewportHeight,
            0, 0,
            viewportWidth * zoom, viewportHeight * zoom
          );
          
          ctx.globalAlpha = 1.0;
        }
        
        // Renderizar capas de grupo relacionadas del frame anterior
        const previousGroupLayers = previousFrameData.layers.filter(layer => 
          layer.isGroupLayer && layer.parentLayerId === activeLayerId
        );
        
        for (const groupLayer of previousGroupLayers) {
          const isGroupVisible = groupLayer.visible && (groupLayer.visible[previousFrame] !== false);
          if (!isGroupVisible) continue;
          
          const previousGroupCanvas = previousFrameData.canvases[groupLayer.id];
          if (previousGroupCanvas) {
            const groupOpacity = (groupLayer.opacity ?? 1.0) * previousFrameOpacity;
            
            ctx.globalAlpha = groupOpacity;
            
            ctx.drawImage(
              previousGroupCanvas,
              viewportOffset.x, viewportOffset.y,
              viewportWidth, viewportHeight,
              0, 0,
              viewportWidth * zoom, viewportHeight * zoom
            );
            
            ctx.globalAlpha = 1.0;
          }
        }
      }
    }
  }
  
  // ============ RENDERIZAR FRAME ACTUAL (todas las capas) ============
  for (const mainLayer of sortedMainLayers) {
    // Usar la visibilidad del frame actual solamente
    const isVisible = mainLayer.visible[currentFrame] ?? true;
    if (!isVisible) continue;
    
    // Renderizar capa principal
    const mainCanvas = layerCanvasesRef.current[mainLayer.id];
    if (mainCanvas) {
      const layerOpacity = mainLayer.opacity ?? 1.0;
      
      if (layerOpacity !== 1.0) {
        ctx.globalAlpha = layerOpacity;
      }
      
      ctx.drawImage(
        mainCanvas,
        viewportOffset.x, viewportOffset.y,
        viewportWidth, viewportHeight,
        0, 0,
        viewportWidth * zoom, viewportHeight * zoom
      );
      
      if (layerOpacity !== 1.0) {
        ctx.globalAlpha = 1.0;
      }
    }
    
    // Renderizar capas de grupo
    for (const groupLayer of mainLayer.groupLayers) {
      if (!groupLayer.visible) continue;
      
      const groupCanvas = layerCanvasesRef.current[groupLayer.id];
      if (groupCanvas) {
        const groupOpacity = groupLayer.opacity ?? 1.0;
        
        if (groupOpacity !== 1.0) {
          ctx.globalAlpha = groupOpacity;
        }
        
        ctx.drawImage(
          groupCanvas,
          viewportOffset.x, viewportOffset.y,
          viewportWidth, viewportHeight,
          0, 0,
          viewportWidth * zoom, viewportHeight * zoom
        );
        
        if (groupOpacity !== 1.0) {
          ctx.globalAlpha = 1.0;
        }
      }
    }
  }
  
  // ============ RENDERIZAR FRAME SIGUIENTE (solo capa activa) ============
  if (frames[nextFrame] && activeLayerId) {
    const nextFrameData = frames[nextFrame];
    
    // Buscar la capa activa en el frame siguiente
    const nextActiveLayer = nextFrameData.layers.find(layer => layer.id === activeLayerId);
    
    if (nextActiveLayer) {
      // Verificar visibilidad en el frame siguiente
      const isNextVisible = nextActiveLayer.visible[nextFrame] ?? true;
      
      if (isNextVisible) {
        // Renderizar capa principal del frame siguiente
        const nextMainCanvas = nextFrameData.canvases[activeLayerId];
        if (nextMainCanvas) {
          const layerOpacity = (nextActiveLayer.opacity ?? 1.0) * nextFrameOpacity;
          
          ctx.globalAlpha = layerOpacity;
          
          ctx.drawImage(
            nextMainCanvas,
            viewportOffset.x, viewportOffset.y,
            viewportWidth, viewportHeight,
            0, 0,
            viewportWidth * zoom, viewportHeight * zoom
          );
          
          ctx.globalAlpha = 1.0;
        }
        
        // Renderizar capas de grupo relacionadas del frame siguiente
        const nextGroupLayers = nextFrameData.layers.filter(layer => 
          layer.isGroupLayer && layer.parentLayerId === activeLayerId
        );
        
        for (const groupLayer of nextGroupLayers) {
          const isGroupVisible = groupLayer.visible && (groupLayer.visible[nextFrame] !== false);
          if (!isGroupVisible) continue;
          
          const nextGroupCanvas = nextFrameData.canvases[groupLayer.id];
          if (nextGroupCanvas) {
            const groupOpacity = (groupLayer.opacity ?? 1.0) * nextFrameOpacity;
            
            ctx.globalAlpha = groupOpacity;
            
            ctx.drawImage(
              nextGroupCanvas,
              viewportOffset.x, viewportOffset.y,
              viewportWidth, viewportHeight,
              0, 0,
              viewportWidth * zoom, viewportHeight * zoom
            );
            
            ctx.globalAlpha = 1.0;
          }
        }
      }
    }
  }
}, [
  getHierarchicalLayers, 
  currentFrame, 
  viewportOffset, 
  viewportWidth, 
  viewportHeight, 
  zoom, 
  frames, 
  activeLayerId
]);

// 9. NUEVA FUNCIÓN: renderLayerWithConfig

// 10. NUEVA FUNCIÓN: invalidateRenderCache
const invalidateRenderCache = useCallback((reason = 'manual') => {
  renderCache.current.needsFullRender = true;
  
  // Limpiar también cache de onion skin si es necesario
  if (reason === 'onionSkinChange') {
    clearOnionSkinCache();
  }
}, [clearOnionSkinCache]);

// Efecto para limpiar cache cuando cambien configuraciones críticas
useEffect(() => {
  // Ya no hay cache de color que limpiar, solo invalidar render
  invalidateRenderCache('onionSkinChange');
}, [onionSkinSettings, invalidateRenderCache, frames, currentFrame]);
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
  const ctx = canvas.getContext('2d');
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

const compositeRender = useCallback(() => {
  if (!compositeCanvasRef.current) return;
  
  const ctx = compositeCanvasRef.current.getContext('2d');
  if (!ctx) return;
  
  // Limpiar canvas de una vez
  ctx.clearRect(0, 0, viewportWidth * zoom, viewportHeight * zoom);
  
  if (onionSkinSettings.enabled) {
    // MODO ONION SKIN: Renderizar frames con onion skin
    renderCurrentFrameWithAdjacent(ctx);
  } else {
    // MODO NORMAL: Solo frame actual
    renderCurrentFrameOnly(ctx);
  }
  
  // *** NUEVA FUNCIONALIDAD: Renderizar capa temporal encima ***
  if (tempLighterCanvas && activeLighter) {
    ctx.drawImage(
      tempLighterCanvas,
      viewportOffset.x, viewportOffset.y,
      viewportWidth, viewportHeight,
      0, 0,
      viewportWidth * zoom, viewportHeight * zoom
    );
  }
}, [
  viewportWidth, 
  viewportHeight, 
  zoom, 
  onionSkinSettings.enabled, 
  renderCurrentFrameWithAdjacent, 
  renderCurrentFrameOnly,
  tempLighterCanvas,
  activeLighter,
  viewportOffset
]);

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


 // Render the composite canvas whenever layers or viewport changes
 useEffect(() => {
  // Render directo sin timeouts
  requestAnimationFrame(compositeRender);
}, [layers, viewportOffset, compositeRender]);



// ===== SISTEMA DE UNDO/REDO SERIALIZADO GLOBAL =====

// Estados para el sistema de versiones (mantener existentes)
const [history, setHistory] = useState([]);
const [currentIndex, setCurrentIndex] = useState(-1);
const isRestoringRef = useRef(false);

// Stack específico para cambios de píxeles
const [pixelChangesStack, setPixelChangesStack] = useState([]);
const [pixelChangesIndex, setPixelChangesIndex] = useState(0);
const pendingPixelChanges = useRef([]);

// Referencias para controlar el guardado
const previousFramesResumeRef = useRef(null);
const isInitializedRef = useRef(false);

// ✅ FUNCIÓN SIMPLE: historyPush desde cero
const historyPush = useCallback((data) => {
  if (isRestoringRef.current) return;
  
  let entryToSave;
  
  if (data && data.changes && data.layerId && data.frameId) {
    // Es un cambio de píxeles - asegurar que tenga type
    entryToSave = {
      ...data,
      type: 'pixel_changes'
    };
  } else if (data) {
    // Es otro tipo de dato, preservar como está
    entryToSave = data;
  } else {
    // Es un cambio de frames - crear snapshot de framesResume
    if (!framesResume || !framesResume.frames || Object.keys(framesResume.frames).length === 0) {
      return;
    }
    
    entryToSave = {
      ...JSON.parse(JSON.stringify(framesResume)),
      timestamp: Date.now(),
      type: 'frame_state'
    };
  }
  
  setHistory(prev => {
    const newHistory = [...prev];
    
    // Eliminar versiones futuras si estamos en medio del historial
    if (currentIndex >= 0 && currentIndex < newHistory.length - 1) {
      newHistory.splice(currentIndex + 1);
    }
    
    // Verificar duplicados solo para frame_state
    if (entryToSave.type === 'frame_state' && newHistory.length > 0) {
      const lastEntry = newHistory[newHistory.length - 1];
      if (lastEntry.type === 'frame_state') {
        const currentStr = JSON.stringify(entryToSave);
        const lastStr = JSON.stringify(lastEntry);
        if (currentStr === lastStr) {
          return prev; // No agregar duplicados
        }
      }
    }
    
    newHistory.push(entryToSave);
    
    // Mantener solo los últimos 50 estados
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    return newHistory;
  });
  
  setCurrentIndex(prev => prev + 1);
}, [framesResume]);

// ✅ USEEFFECT SIMPLE: Detectar cambios en framesResume
useEffect(() => {
  // 1. Evitar guardado durante restauración (undo/redo)
  if (isRestoringRef.current) {
    console.log('⏸️ Guardado pausado: restauración activa');
    return;
  }
  
  // 2. Verificar que framesResume tiene contenido
  if (!framesResume || !framesResume.frames || Object.keys(framesResume.frames).length === 0) {
    console.log('⏳ Esperando frames válidos...');
    return;
  }
  
  // 3. Guardar automáticamente
  console.log('🔄 Cambio detectado en framesResume, guardando...');
  historyPush();
  
}, [framesResume, historyPush]);

// ✅ NUEVO: Función para inicializar el historial
const initializeHistory = useCallback(() => {
  if (history.length === 0) {
    const initialState = {
      ...framesResume,
      timestamp: Date.now(),
      reason: 'initial'
    };
    
    setHistory([initialState]);
    setCurrentIndex(0);
    console.log('📚 Historial inicializado');
  }
}, [framesResume, history.length]);

// ✅ NUEVO: useEffect para inicializar historial
useEffect(() => {
  if (Object.keys(framesResume.frames).length > 0) {
    initializeHistory();
  }
}, [framesResume, initializeHistory]);



// ✅ NUEVO: Función para guardar cambios de píxeles en el stack
const savePixelChangesToStack = useCallback((changes, layerId, frameId) => {
  if (isRestoringRef.current) return;
  
  if (!changes || (changes.added.length === 0 && changes.modified.length === 0 && changes.removed.length === 0)) {
    return;
  }

  const changeEntry = {
    id: nanoid(),
    timestamp: Date.now(),
    layerId,
    frameId,
    changes,
    type: 'pixel_changes'
  };
console.log("se agregaron los cambios.............................................", changes)
 historyPush(changeEntry);
}, [pixelChangesIndex]);

// ✅ MODIFICAR: Función logPixelChanges para incluir guardado en stack


// ✅ NUEVO: Función para aplicar cambios de píxeles al canvas
const applyPixelChangesToCanvas = useCallback((changes, layerId, frameId, reverse = false) => {
  const frame = frames[frameId];
  if (!frame || !frame.canvases[layerId]) return false;
  
  const canvas = frame.canvases[layerId];
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  if (reverse) {
    // Aplicar cambios en reversa para undo
    
    // Restaurar píxeles eliminados
    changes.removed.forEach(pixel => {
      const index = (pixel.y * canvas.width + pixel.x) * 4;
      data[index] = pixel.color.r;
      data[index + 1] = pixel.color.g;
      data[index + 2] = pixel.color.b;
      data[index + 3] = pixel.color.a;
    });
    
    // Restaurar píxeles modificados al estado anterior
    changes.modified.forEach(pixel => {
      const index = (pixel.y * canvas.width + pixel.x) * 4;
      data[index] = pixel.oldColor.r;
      data[index + 1] = pixel.oldColor.g;
      data[index + 2] = pixel.oldColor.b;
      data[index + 3] = pixel.oldColor.a;
    });
    
    // Eliminar píxeles añadidos
    changes.added.forEach(pixel => {
      const index = (pixel.y * canvas.width + pixel.x) * 4;
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
    });
    
  } else {
    // Aplicar cambios normales para redo
    
    // Aplicar píxeles añadidos
    changes.added.forEach(pixel => {
      const index = (pixel.y * canvas.width + pixel.x) * 4;
      data[index] = pixel.color.r;
      data[index + 1] = pixel.color.g;
      data[index + 2] = pixel.color.b;
      data[index + 3] = pixel.color.a;
    });
    
    // Aplicar píxeles modificados
    changes.modified.forEach(pixel => {
      const index = (pixel.y * canvas.width + pixel.x) * 4;
      data[index] = pixel.newColor.r;
      data[index + 1] = pixel.newColor.g;
      data[index + 2] = pixel.newColor.b;
      data[index + 3] = pixel.newColor.a;
    });
    
    // Eliminar píxeles removidos
    changes.removed.forEach(pixel => {
      const index = (pixel.y * canvas.width + pixel.x) * 4;
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
    });
  }
  
  ctx.putImageData(imageData, 0, 0);
  return true;
}, [frames]);

const syncFramesFromResume = useCallback((newFramesResume) => {
  if (!newFramesResume || !newFramesResume.frames) return;

  const newFrames = {};
  
  // Convertir cada frame del resume al formato de frames
  Object.keys(newFramesResume.frames).forEach(frameKey => {
    const frameNumber = Number(frameKey);
    const resumeFrame = newFramesResume.frames[frameKey];
    
    // Crear layers array desde la definición global y el frame específico
    const frameLayers = Object.keys(newFramesResume.layers).map(layerId => {
      const globalLayer = newFramesResume.layers[layerId];
      return {
        id: layerId,
        name: globalLayer.name,
        visible: {
          ...{}, // base
          [frameNumber]: resumeFrame.layerVisibility[layerId] ?? true
        },
        opacity: resumeFrame.layerOpacity[layerId] ?? 1.0,
        zIndex: globalLayer.zIndex,
        isGroupLayer: globalLayer.type === 'group',
        parentLayerId: globalLayer.parentLayerId || null
      };
    });

    // Crear canvases para este frame
    const frameCanvases = {};
    frameLayers.forEach(layer => {
      // Si existe canvas en resume, usarlo; si no, crear uno nuevo
      if (resumeFrame.canvases && resumeFrame.canvases[layer.id]) {
        frameCanvases[layer.id] = resumeFrame.canvases[layer.id];
      } else {
        frameCanvases[layer.id] = getOrCreateCanvas(layer.id, frameNumber, true);
      }
    });

    // Crear el frame completo
    newFrames[frameNumber] = {
      layers: frameLayers,
      pixelGroups: resumeFrame.pixelGroups || {},
      canvases: frameCanvases,
      frameDuration: resumeFrame.duration || defaultFrameDuration,
      tags: resumeFrame.tags || []
    };
  });

  return newFrames;
}, [getOrCreateCanvas, defaultFrameDuration]);


const undoPixelChanges = useCallback(() => {
  if (pixelChangesIndex <= 1) {
    console.warn("No hay cambios de píxeles para deshacer");
    return false;
  }
  
  const changeEntry = pixelChangesStack[pixelChangesIndex];
  if (!changeEntry) return false;
  
  console.log("🔄 Deshaciendo cambios de píxeles:", changeEntry);
  
  // Marcar que estamos restaurando
  isRestoringRef.current = true;
  
  // Aplicar cambios en reversa
  const success = applyPixelChangesToCanvas(
    changeEntry.changes, 
    changeEntry.layerId, 
    changeEntry.frameId, 
    true // reverse = true
  );
  
  if (success) {
    setPixelChangesIndex(prev => prev - 1);
    
    // Re-renderizar si es el frame actual
    if (changeEntry.frameId === currentFrame) {
      requestAnimationFrame(compositeRender);
    }
  }
  
  // Permitir guardar nuevamente después de un breve delay
  setTimeout(() => {
    isRestoringRef.current = false;
  }, 100);
  
  return success;
}, [pixelChangesStack, pixelChangesIndex, applyPixelChangesToCanvas, currentFrame, compositeRender]);

// ✅ NUEVO: Función para rehacer cambios de píxeles
const redoPixelChanges = useCallback(() => {
  if (pixelChangesIndex >= pixelChangesStack.length - 1) {
    console.warn("No hay cambios de píxeles para rehacer");
    return false;
  }
  
  const nextIndex = pixelChangesIndex + 1;
  const changeEntry = pixelChangesStack[nextIndex];
  if (!changeEntry) return false;
  
  console.log("🔄 Rehaciendo cambios de píxeles:", changeEntry);
  
  // Marcar que estamos restaurando
  isRestoringRef.current = true;
  
  // Aplicar cambios normales
  const success = applyPixelChangesToCanvas(
    changeEntry.changes, 
    changeEntry.layerId, 
    changeEntry.frameId, 
    false // reverse = false
  );
  
  if (success) {
    setPixelChangesIndex(nextIndex);
    
    // Re-renderizar si es el frame actual
    if (changeEntry.frameId === currentFrame) {
      requestAnimationFrame(compositeRender);
    }
  }
  
  // Permitir guardar nuevamente después de un breve delay
  setTimeout(() => {
    isRestoringRef.current = false;
  }, 100);
  
  return success;
}, [pixelChangesStack, pixelChangesIndex, applyPixelChangesToCanvas, currentFrame, compositeRender]);

const setActiveFrame = useCallback((frameNumber) => {
  if (frameNumber === currentFrame) {
    console.log(`Ya estamos en el frame ${frameNumber}, ignorando cambio`);
    return true;
  }

  if (!frames[frameNumber]) {
    console.warn(`Frame ${frameNumber} no existe`);
    return false;
  }

  const frameData = frames[frameNumber];
  
  frameData.layers.forEach(layer => {
    if (!frameData.canvases[layer.id]) {
      frameData.canvases[layer.id] = getOrCreateCanvas(layer.id, frameNumber, true);
    }
  });
  
  // Actualizar referencias
  setLayers(frameData.layers);
  setPixelGroups(frameData.pixelGroups);
  layerCanvasesRef.current = frameData.canvases;
  
  setCurrentFrame(frameNumber);
  
  // ✅ FIX: Actualizar activeLayerId al cambiar frame
  // Usar la primera capa visible del frame, o la primera capa si no hay visibles
  const visibleLayers = frameData.layers.filter(layer => 
    !layer.isGroupLayer && (layer.visible[frameNumber] !== false)
  );
  const targetLayer = visibleLayers.length > 0 ? visibleLayers[0] : frameData.layers[0];
  
  if (targetLayer && targetLayer.id !== activeLayerId) {
    setActiveLayerId(targetLayer.id);
  }
  
  requestAnimationFrame(compositeRender);
  return true;
}, [currentFrame, frames, getOrCreateCanvas, activeLayerId, compositeRender]);

// ✅ FUNCIONES ORIGINALES DE FRAMES (renombradas para evitar conflictos)
const undoFrames = useCallback(() => {
  console.log("Undo frames activado");
  console.log("Current index:", currentIndex);
  console.log("History length:", history.length);
  
  if (currentIndex < 1) {
    console.warn("No hay versiones anteriores para deshacer");
    return false;
  }
  
  isRestoringRef.current = true;
  
  const newIndex = currentIndex - 1;
  const previousVersion = history[newIndex];
  
  console.log("Restaurando versión anterior:", previousVersion);
  
  // 1. Actualizar framesResume
  setFramesResume(previousVersion);
  
  // 2. Sincronizar frames desde framesResume
  const newFrames = syncFramesFromResume(previousVersion);
  setFrames(newFrames);
  
  // 3. Actualizar frameCount
  setFrameCount(Object.keys(newFrames).length);
  
  // 4. Verificar si el currentFrame sigue siendo válido
  const newFrameNumbers = Object.keys(newFrames).map(Number);
  if (!newFrameNumbers.includes(currentFrame)) {
    // Si el frame actual ya no existe, cambiar al primer frame disponible
    const firstFrame = Math.min(...newFrameNumbers);
    setActiveFrame(firstFrame);
  } else {
    // Si el frame actual sigue existiendo, sincronizar layers y canvas
    const currentFrameData = newFrames[currentFrame];
    setLayers(currentFrameData.layers);
    setPixelGroups(currentFrameData.pixelGroups);
    layerCanvasesRef.current = { ...currentFrameData.canvases };
  }
  
  // 5. Actualizar índice
  setCurrentIndex(newIndex);
  
  setTimeout(() => {
    isRestoringRef.current = false;
  }, 100);
  
  return true;
}, [currentIndex, history, syncFramesFromResume, currentFrame, setActiveFrame]);

const redoFrames = useCallback(() => {
  console.log("Redo frames activado");
  
  if (currentIndex >= history.length - 1) {
    console.warn("No hay versiones posteriores para rehacer");
    return false;
  }
  
  isRestoringRef.current = true;
  
  const newIndex = currentIndex + 1;
  const nextVersion = history[newIndex];
  
  console.log("Restaurando versión posterior:", nextVersion);
  
  // 1. Actualizar framesResume
  setFramesResume(nextVersion);
  
  // 2. Sincronizar frames desde framesResume
  const newFrames = syncFramesFromResume(nextVersion);
  setFrames(newFrames);
  
  // 3. Actualizar frameCount
  setFrameCount(Object.keys(newFrames).length);
  
  // 4. Verificar si el currentFrame sigue siendo válido
  const newFrameNumbers = Object.keys(newFrames).map(Number);
  if (!newFrameNumbers.includes(currentFrame)) {
    // Si el frame actual ya no existe, cambiar al primer frame disponible
    const firstFrame = Math.min(...newFrameNumbers);
    setActiveFrame(firstFrame);
  } else {
    // Si el frame actual sigue existiendo, sincronizar layers y canvas
    const currentFrameData = newFrames[currentFrame];
    setLayers(currentFrameData.layers);
    setPixelGroups(currentFrameData.pixelGroups);
    layerCanvasesRef.current = { ...currentFrameData.canvases };
  }
  
  // 5. Actualizar índice
  setCurrentIndex(newIndex);
  
  setTimeout(() => {
    isRestoringRef.current = false;
  }, 100);
  
  return true;
}, [currentIndex, history, syncFramesFromResume, currentFrame, setActiveFrame]);


// ✅ NUEVO: Función combinada para undo (frames + píxeles)
const undoComplete = useCallback(() => {
  console.log("undocomplete");
  // Primero intentar deshacer cambios de píxeles
  const pixelUndoSuccess = undoPixelChanges();
  
  if (!pixelUndoSuccess) {
    // Si no hay cambios de píxeles, deshacer cambios de frames
    return undoFrames();
  }
  
  return pixelUndoSuccess;
}, [undoPixelChanges, undoFrames]);

// ✅ NUEVO: Función combinada para redo (frames + píxeles)
const redoComplete = useCallback(() => {
  // Primero intentar rehacer cambios de píxeles
  const pixelRedoSuccess = redoPixelChanges();
  
  if (!pixelRedoSuccess) {
    // Si no hay cambios de píxeles, rehacer cambios de frames
    return redoFrames();
  }
  
  return pixelRedoSuccess;
}, [redoPixelChanges, redoFrames]);

const undo = useCallback(() => {
  if (currentIndex < 0) {
    console.warn("No hay cambios para deshacer");
    return false;
  }
  
  const entryToUndo = history[currentIndex];
  
  // Detectar tipo de entrada
  const isPixelChange = entryToUndo.type === 'pixel_changes' || 
                       (entryToUndo.changes && entryToUndo.layerId && entryToUndo.frameId);
  
  const isFrameState = entryToUndo.type === 'frame_state' || 
                      (entryToUndo.frames && entryToUndo.layers && entryToUndo.metadata);
  
  console.log('Deshaciendo:', isPixelChange ? 'Cambio de píxeles' : 'Cambio de frames', entryToUndo);
  
  if (isPixelChange) {
    // Deshacer cambios de píxeles (esto está bien)
    const { layerId, frameId, changes } = entryToUndo;
    const frame = frames[frameId];
    
    if (frame && frame.canvases[layerId]) {
      isRestoringRef.current = true;
      
      const canvas = frame.canvases[layerId];
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Aplicar cambios en reversa
      changes.removed.forEach(pixel => {
        const index = (pixel.y * canvas.width + pixel.x) * 4;
        data[index] = pixel.color.r;
        data[index + 1] = pixel.color.g;
        data[index + 2] = pixel.color.b;
        data[index + 3] = pixel.color.a;
      });
      
      changes.modified.forEach(pixel => {
        const index = (pixel.y * canvas.width + pixel.x) * 4;
        data[index] = pixel.oldColor.r;
        data[index + 1] = pixel.oldColor.g;
        data[index + 2] = pixel.oldColor.b;
        data[index + 3] = pixel.oldColor.a;
      });
      
      changes.added.forEach(pixel => {
        const index = (pixel.y * canvas.width + pixel.x) * 4;
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 0;
      });
      
      ctx.putImageData(imageData, 0, 0);
      
      if (frameId === currentFrame) {
        requestAnimationFrame(compositeRender);
      }
      
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
    
  } else if (isFrameState) {
    // Buscar el estado de frame anterior
    let previousFrameState = null;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const entry = history[i];
      const isPreviousFrameState = entry.type === 'frame_state' || 
                                  (entry.frames && entry.layers && entry.metadata);
      if (isPreviousFrameState) {
        previousFrameState = entry;
        break;
      }
    }
    
    if (previousFrameState) {
      isRestoringRef.current = true;
      
      console.log('Restaurando estado de frames anterior:', previousFrameState);
      
      // Restaurar framesResume
      setFramesResume(previousFrameState);
      
      // ✅ PRESERVAR LOS CANVAS ACTUALES
      const currentCanvases = {};
      Object.keys(frames).forEach(frameKey => {
        const frameNumber = Number(frameKey);
        currentCanvases[frameNumber] = { ...frames[frameNumber].canvases };
      });
      
      // Sincronizar frames
      const newFrames = {};
      Object.keys(previousFrameState.frames).forEach(frameKey => {
        const frameNumber = Number(frameKey);
        const resumeFrame = previousFrameState.frames[frameKey];
        
        const frameLayers = Object.keys(previousFrameState.layers).map(layerId => {
          const globalLayer = previousFrameState.layers[layerId];
          return {
            id: layerId,
            name: globalLayer.name,
            visible: {
              [frameNumber]: resumeFrame.layerVisibility[layerId] ?? true
            },
            opacity: resumeFrame.layerOpacity[layerId] ?? 1.0,
            zIndex: globalLayer.zIndex,
            isGroupLayer: globalLayer.type === 'group',
            parentLayerId: globalLayer.parentLayerId || null
          };
        });
        
        // ✅ REUTILIZAR CANVAS EXISTENTES EN LUGAR DE CREAR NUEVOS
        const frameCanvases = {};
        frameLayers.forEach(layer => {
          // Si existe un canvas pintado, conservarlo
          if (currentCanvases[frameNumber] && currentCanvases[frameNumber][layer.id]) {
            frameCanvases[layer.id] = currentCanvases[frameNumber][layer.id];
          } else if (resumeFrame.canvases && resumeFrame.canvases[layer.id]) {
            frameCanvases[layer.id] = resumeFrame.canvases[layer.id];
          } else {
            frameCanvases[layer.id] = getOrCreateCanvas(layer.id, frameNumber, true);
          }
        });
        
        newFrames[frameNumber] = {
          layers: frameLayers,
          pixelGroups: resumeFrame.pixelGroups || {},
          canvases: frameCanvases,
          frameDuration: resumeFrame.duration || defaultFrameDuration,
          tags: resumeFrame.tags || []
        };
      });
      
      setFrames(newFrames);
      setFrameCount(Object.keys(newFrames).length);
      
      // Verificar frame actual
      const newFrameNumbers = Object.keys(newFrames).map(Number);
      if (!newFrameNumbers.includes(currentFrame)) {
        const firstFrame = Math.min(...newFrameNumbers);
        setActiveFrame(firstFrame);
      } else {
        const currentFrameData = newFrames[currentFrame];
        setLayers(currentFrameData.layers);
        setPixelGroups(currentFrameData.pixelGroups);
        layerCanvasesRef.current = { ...currentFrameData.canvases };
      }
      
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
  }
  
  setCurrentIndex(prev => prev - 1);
  return true;
}, [currentIndex, history, frames, currentFrame, compositeRender, getOrCreateCanvas, defaultFrameDuration, setActiveFrame]);

const redo = useCallback(() => {
  if (currentIndex >= history.length - 1) {
    console.warn("No hay cambios para rehacer");
    return false;
  }
  
  const nextIndex = currentIndex + 1;
  const entryToRedo = history[nextIndex];
  
  // Detectar tipo de entrada
  const isPixelChange = entryToRedo.type === 'pixel_changes' || 
                       (entryToRedo.changes && entryToRedo.layerId && entryToRedo.frameId);
  
  const isFrameState = entryToRedo.type === 'frame_state' || 
                      (entryToRedo.frames && entryToRedo.layers && entryToRedo.metadata);
  
  console.log('Rehaciendo:', isPixelChange ? 'Cambio de píxeles' : 'Cambio de frames', entryToRedo);
  
  if (isPixelChange) {
    // Rehacer cambios de píxeles
    const { layerId, frameId, changes } = entryToRedo;
    const frame = frames[frameId];
    
    if (frame && frame.canvases[layerId]) {
      isRestoringRef.current = true;
      
      const canvas = frame.canvases[layerId];
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Aplicar cambios normales (como si fuera la primera vez)
      changes.added.forEach(pixel => {
        const index = (pixel.y * canvas.width + pixel.x) * 4;
        data[index] = pixel.color.r;
        data[index + 1] = pixel.color.g;
        data[index + 2] = pixel.color.b;
        data[index + 3] = pixel.color.a;
      });
      
      changes.modified.forEach(pixel => {
        const index = (pixel.y * canvas.width + pixel.x) * 4;
        data[index] = pixel.newColor.r;
        data[index + 1] = pixel.newColor.g;
        data[index + 2] = pixel.newColor.b;
        data[index + 3] = pixel.newColor.a;
      });
      
      changes.removed.forEach(pixel => {
        const index = (pixel.y * canvas.width + pixel.x) * 4;
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 0;
      });
      
      ctx.putImageData(imageData, 0, 0);
      
      if (frameId === currentFrame) {
        requestAnimationFrame(compositeRender);
      }
      
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
    
  } else if (isFrameState) {
    // Rehacer cambios de frames
    isRestoringRef.current = true;
    
    console.log('Rehaciendo estado de frames:', entryToRedo);
    
    // Restaurar framesResume al estado que queremos rehacer
    setFramesResume(entryToRedo);
    
    // ✅ PRESERVAR LOS CANVAS ACTUALES
    const currentCanvases = {};
    Object.keys(frames).forEach(frameKey => {
      const frameNumber = Number(frameKey);
      currentCanvases[frameNumber] = { ...frames[frameNumber].canvases };
    });
    
    // Sincronizar frames al estado del redo
    const newFrames = {};
    Object.keys(entryToRedo.frames).forEach(frameKey => {
      const frameNumber = Number(frameKey);
      const resumeFrame = entryToRedo.frames[frameKey];
      
      const frameLayers = Object.keys(entryToRedo.layers).map(layerId => {
        const globalLayer = entryToRedo.layers[layerId];
        return {
          id: layerId,
          name: globalLayer.name,
          visible: {
            [frameNumber]: resumeFrame.layerVisibility[layerId] ?? true
          },
          opacity: resumeFrame.layerOpacity[layerId] ?? 1.0,
          zIndex: globalLayer.zIndex,
          isGroupLayer: globalLayer.type === 'group',
          parentLayerId: globalLayer.parentLayerId || null
        };
      });
      
      // ✅ REUTILIZAR CANVAS EXISTENTES EN LUGAR DE CREAR NUEVOS
      const frameCanvases = {};
      frameLayers.forEach(layer => {
        // Si existe un canvas pintado, conservarlo
        if (currentCanvases[frameNumber] && currentCanvases[frameNumber][layer.id]) {
          frameCanvases[layer.id] = currentCanvases[frameNumber][layer.id];
        } else if (resumeFrame.canvases && resumeFrame.canvases[layer.id]) {
          frameCanvases[layer.id] = resumeFrame.canvases[layer.id];
        } else {
          frameCanvases[layer.id] = getOrCreateCanvas(layer.id, frameNumber, true);
        }
      });
      
      newFrames[frameNumber] = {
        layers: frameLayers,
        pixelGroups: resumeFrame.pixelGroups || {},
        canvases: frameCanvases,
        frameDuration: resumeFrame.duration || defaultFrameDuration,
        tags: resumeFrame.tags || []
      };
    });
    
    setFrames(newFrames);
    setFrameCount(Object.keys(newFrames).length);
    
    // Verificar frame actual
    const newFrameNumbers = Object.keys(newFrames).map(Number);
    if (!newFrameNumbers.includes(currentFrame)) {
      const firstFrame = Math.min(...newFrameNumbers);
      setActiveFrame(firstFrame);
    } else {
      const currentFrameData = newFrames[currentFrame];
      setLayers(currentFrameData.layers);
      setPixelGroups(currentFrameData.pixelGroups);
      layerCanvasesRef.current = { ...currentFrameData.canvases };
    }
    
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 100);
  }
  
  setCurrentIndex(nextIndex);
  return true;
}, [currentIndex, history, frames, currentFrame, compositeRender, getOrCreateCanvas, defaultFrameDuration, setActiveFrame]);

// ✅ NUEVO: Estados mejorados para botones de undo/redo
const canUndoPixels = pixelChangesIndex > 0;
const canRedoPixels = pixelChangesIndex < pixelChangesStack.length - 1;
const canUndoFrames = currentIndex > 1;
const canRedoFrames = currentIndex < history.length - 1;

// Estados combinados para la UI
const canUndoComplete = canUndoPixels || canUndoFrames;
const canRedoComplete = canRedoPixels || canRedoFrames;

// ✅ NUEVO: Función para limpiar todo el historial
const clearAllHistory = useCallback(() => {
  setHistory([]);
  setCurrentIndex(-1);
  setPixelChangesStack([]);
  setPixelChangesIndex(-1);
  console.log("🧹 Todo el historial limpiado");
}, []);

// ✅ NUEVO: Función para obtener información de debug completa
const getCompleteDebugInfo = useCallback(() => {
  return {
    frames: {
      historyLength: history.length,
      currentIndex,
      canUndo: canUndoFrames,
      canRedo: canRedoFrames
    },
    pixels: {
      stackLength: pixelChangesStack.length,
      currentIndex: pixelChangesIndex,
      canUndo: canUndoPixels,
      canRedo: canRedoPixels
    },
    combined: {
      canUndoComplete,
      canRedoComplete
    }
  };
}, [
  history.length, currentIndex, canUndoFrames, canRedoFrames,
  pixelChangesStack.length, pixelChangesIndex, canUndoPixels, canRedoPixels,
  canUndoComplete, canRedoComplete
]);

// ✅ NUEVO: Función para obtener vista previa de cambios
const getChangePreview = useCallback(() => {
  const frameChanges = history[currentIndex];
  const pixelChanges = pixelChangesStack[pixelChangesIndex];
  
  return {
    nextPixelChange: pixelChangesIndex < pixelChangesStack.length - 1 ? 
      pixelChangesStack[pixelChangesIndex + 1] : null,
    previousPixelChange: pixelChangesIndex > 0 ? 
      pixelChangesStack[pixelChangesIndex - 1] : null,
    nextFrameChange: currentIndex < history.length - 1 ? 
      history[currentIndex + 1] : null,
    previousFrameChange: currentIndex > 0 ? 
      history[currentIndex - 1] : null
  };
}, [history, currentIndex, pixelChangesStack, pixelChangesIndex]);


// ===================== SISTEMA UNDO/REDO ====================================//


// 3. FUNCIÓN PARA RENDERIZAR UN FRAME COMO CAPA

  // Initialize the composite canvas
  useEffect(() => {
    if (compositeCanvasRef.current) {
      compositeCanvasRef.current.width = viewportWidth * zoom;
      compositeCanvasRef.current.height = viewportHeight * zoom;
      
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
    zIndex: highestZIndex + 1
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

  setFramesResume(prev => {
    const updated = { ...prev };
    
    updated.layers[newLayerId] = {
      id: newLayerId,
      name: `Layer ${Object.keys(prev.layers).length + 1}`,
      type: 'normal',
      parentLayerId: null,
      zIndex: highestZIndex + 1,
      blendMode: 'normal',
      locked: false,
    };

    Object.keys(updated.frames).forEach(frameKey => {
      const frame = updated.frames[frameKey];
      frame.layerVisibility[newLayerId] = true;
      frame.layerOpacity[newLayerId] = 1.0;
      frame.layerHasContent[newLayerId] = false;
    });

    updated.computed.framesByLayer[newLayerId] = [];
    updated.computed.keyframes[newLayerId] = [];
    Object.keys(updated.computed.resolvedFrames).forEach(frameKey => {
      updated.computed.resolvedFrames[frameKey].layerVisibility[newLayerId] = true;
      updated.computed.resolvedFrames[frameKey].layerOpacity[newLayerId] = 1.0;
      updated.computed.resolvedFrames[frameKey].layerHasContent[newLayerId] = false;
    });

    return updated;
  });

  setFrames(updatedFrames);
  
  if (currentFrameData) {
    setLayers(currentFrameData.layers);
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
  
    // ✅ AGREGAR: Actualizar framesResume
    setFramesResume(prev => {
      const updated = { ...prev };
      
      // Remover layer de la definición global
      delete updated.layers[layerId];
      
      // Si es capa principal, remover también capas de grupo
      if (!layerToDelete.isGroupLayer) {
        Object.keys(updated.layers).forEach(id => {
          const layer = updated.layers[id];
          if (layer.type === 'group' && layer.parentLayerId === layerId) {
            delete updated.layers[id];
          }
        });
      }
  
      // Remover de todos los frames
      Object.keys(updated.frames).forEach(frameKey => {
        const frame = updated.frames[frameKey];
        delete frame.layerVisibility[layerId];
        delete frame.layerOpacity[layerId];
        delete frame.layerHasContent[layerId];
        delete frame.canvases[layerId];
        delete frame.pixelGroups[layerId];
      });
  
      // Limpiar computed
      delete updated.computed.framesByLayer[layerId];
      delete updated.computed.keyframes[layerId];
      Object.keys(updated.computed.resolvedFrames).forEach(frameKey => {
        const resolved = updated.computed.resolvedFrames[frameKey];
        delete resolved.layerVisibility[layerId];
        delete resolved.layerOpacity[layerId];
        delete resolved.layerHasContent[layerId];
      });
  
      return updated;
    });
  
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
  
    // ✅ AGREGAR: Actualizar framesResume
    setFramesResume(prev => {
      const updated = { ...prev };
      
      // Actualizar zIndex en la definición global de layers
      const layer = updated.layers[layerId];
      if (!layer) return prev;
      
      // Encontrar la capa que está inmediatamente encima
      const relevantLayers = Object.values(updated.layers)
        .filter(l => layer.type === 'group' 
          ? l.type === 'group' && l.parentLayerId === layer.parentLayerId
          : l.type === 'normal'
        )
        .sort((a, b) => a.zIndex - b.zIndex);
      
      const currentIndex = relevantLayers.findIndex(l => l.id === layerId);
      if (currentIndex === relevantLayers.length - 1) return prev;
      
      const layerAbove = relevantLayers[currentIndex + 1];
      
      // Intercambiar zIndex
      updated.layers[layerId] = { ...layer, zIndex: layerAbove.zIndex };
      updated.layers[layerAbove.id] = { ...layerAbove, zIndex: layer.zIndex };
      
      return updated;
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
      pixelGroups: JSON.parse(JSON.stringify(sourceFrame.pixelGroups)),
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
  setFramesResume(prev => {
    const updated = { ...prev };
    const sourceFrameResume = prev.frames[sourceFrameNumber ?? currentFrame];
    
    // Shiftar frames existentes en framesResume
    const framesToShift = {};
    Object.keys(updated.frames).forEach(frameKey => {
      const num = Number(frameKey);
      if (num >= insertAt) {
        framesToShift[num + 1] = updated.frames[frameKey];
        delete updated.frames[frameKey];
      }
    });
    Object.assign(updated.frames, framesToShift);

    // Crear nuevo frame en framesResume
    if (mode === "duplicate") {
      updated.frames[insertAt] = {
        layerVisibility: { ...sourceFrameResume.layerVisibility },
        layerOpacity: { ...sourceFrameResume.layerOpacity },
        layerHasContent: { ...sourceFrameResume.layerHasContent },
        canvases: {}, // Se llenará después
        pixelGroups: JSON.parse(JSON.stringify(sourceFrameResume.pixelGroups)),
        duration: sourceFrameResume.duration,
        tags: [...(sourceFrameResume.tags || [])]
      };
    } else {
      updated.frames[insertAt] = {
        layerVisibility: { ...sourceFrameResume.layerVisibility },
        layerOpacity: { ...sourceFrameResume.layerOpacity },
        layerHasContent: Object.fromEntries(
          Object.keys(updated.layers).map(layerId => [layerId, false])
        ),
        canvases: {},
        pixelGroups: {},
        duration: customDuration ?? defaultFrameDuration,
        tags: []
      };
    }

    // Actualizar metadata
    updated.metadata.frameCount += 1;
    updated.metadata.totalDuration = Object.values(updated.frames)
      .reduce((sum, frame) => sum + frame.duration, 0);

    // Recalcular computed
    updated.computed.frameSequence = Object.keys(updated.frames)
      .map(Number).sort((a, b) => a - b);
    updated.computed.totalFrames = updated.computed.frameSequence.length;

    // Actualizar resolvedFrames (shiftar y agregar nuevo)
    const newResolvedFrames = {};
    Object.keys(updated.computed.resolvedFrames).forEach(frameKey => {
      const num = Number(frameKey);
      if (num >= insertAt) {
        newResolvedFrames[num + 1] = updated.computed.resolvedFrames[frameKey];
      } else {
        newResolvedFrames[frameKey] = updated.computed.resolvedFrames[frameKey];
      }
    });
    
    // Crear resolved frame para el nuevo frame
    newResolvedFrames[insertAt] = {
      layerVisibility: { ...updated.frames[insertAt].layerVisibility },
      layerOpacity: { ...updated.frames[insertAt].layerOpacity },
      layerHasContent: { ...updated.frames[insertAt].layerHasContent }
    };
    
    updated.computed.resolvedFrames = newResolvedFrames;

    return updated;
  });

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

  // ✅ AGREGAR: Actualizar framesResume PRIMERO
  setFramesResume(prev => {
    const updated = { ...prev };
    
    // Remover frames del resume
    validNumbers.forEach(num => {
      delete updated.frames[num];
      delete updated.computed.resolvedFrames[num];
    });
    
    // Renumerar frames restantes
    const remainingFrames = {};
    const remainingResolved = {};
    
    Object.keys(updated.frames)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((num, index) => {
        const newFrameNumber = index + 1;
        remainingFrames[newFrameNumber] = updated.frames[num];
        remainingResolved[newFrameNumber] = updated.computed.resolvedFrames[num];
      });
    
    updated.frames = remainingFrames;
    updated.computed.resolvedFrames = remainingResolved;
    
    // Actualizar metadata
    updated.metadata.frameCount = Object.keys(remainingFrames).length;
    updated.metadata.totalDuration = Object.values(remainingFrames)
      .reduce((sum, frame) => sum + frame.duration, 0);
    
    // Recalcular computed
    updated.computed.frameSequence = Object.keys(remainingFrames)
      .map(Number).sort((a, b) => a - b);
    updated.computed.totalFrames = updated.computed.frameSequence.length;
    
    // Recalcular framesByLayer y keyframes
    Object.keys(updated.layers).forEach(layerId => {
      updated.computed.framesByLayer[layerId] = [];
      updated.computed.keyframes[layerId] = [];
      
      Object.keys(remainingFrames).forEach(frameKey => {
        if (remainingFrames[frameKey].layerHasContent[layerId]) {
          updated.computed.framesByLayer[layerId].push(Number(frameKey));
        }
      });
    });
    
    return updated;
  });

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
    zIndex: highestZIndex + 1
  };

  const updatedFrames = { ...frames };

  Object.keys(updatedFrames).forEach(frameKey => {
    const frame = updatedFrames[frameKey];
    const originalLayerInFrame = frame.layers.find(l => l.id === layerId);
    if (!originalLayerInFrame) return;

    // Capa duplicada solo para este frame
    const duplicatedLayer = {
      ...baseLayer,
      visible: {
        ...baseLayer.visible,
        [frameKey]: true
      }
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

  // ✅ AGREGAR: Actualizar framesResume
  setFramesResume(prev => {
    const updated = { ...prev };
    
    // Agregar layer duplicado a la definición global
    updated.layers[newLayerId] = {
      id: newLayerId,
      name: newLayerName,
      type: originalLayer.isGroupLayer ? 'group' : 'normal',
      parentLayerId: originalLayer.parentLayerId || null,
      zIndex: highestZIndex + 1,
      blendMode: 'normal',
      locked: false,
    };

    // Actualizar todos los frames
    Object.keys(updated.frames).forEach(frameKey => {
      const frame = updated.frames[frameKey];
      const originalHasContent = frame.layerHasContent[layerId] ?? false;
      
      frame.layerVisibility[newLayerId] = true;
      frame.layerOpacity[newLayerId] = frame.layerOpacity[layerId] ?? 1.0;
      frame.layerHasContent[newLayerId] = originalHasContent;
      
      // Duplicar pixelGroups si existen
      if (frame.pixelGroups[layerId]) {
        frame.pixelGroups[newLayerId] = JSON.parse(JSON.stringify(frame.pixelGroups[layerId]));
      }
    });

    // Actualizar computed
    updated.computed.framesByLayer[newLayerId] = [...(updated.computed.framesByLayer[layerId] || [])];
    updated.computed.keyframes[newLayerId] = [...(updated.computed.keyframes[layerId] || [])];
    
    Object.keys(updated.computed.resolvedFrames).forEach(frameKey => {
      const resolved = updated.computed.resolvedFrames[frameKey];
      resolved.layerVisibility[newLayerId] = true;
      resolved.layerOpacity[newLayerId] = resolved.layerOpacity[layerId] ?? 1.0;
      resolved.layerHasContent[newLayerId] = resolved.layerHasContent[layerId] ?? false;
    });

    return updated;
  });

  setFrames(updatedFrames);

  const currentFrameData = updatedFrames[currentFrame];
  setLayers(currentFrameData.layers);
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

  // ✅ AGREGAR: Actualizar framesResume
  setFramesResume(prev => {
    const updated = { ...prev };
    
    frameList.forEach(frameKey => {
      if (updated.frames[frameKey]) {
        updated.frames[frameKey].layerOpacity[layerId] = opacity;
        updated.computed.resolvedFrames[frameKey].layerOpacity[layerId] = opacity;
      }
    });
    
    return updated;
  });

  return true;
}, []);



const getFrameOpacity = useCallback((layerId, frameNumber) => {
  const frame = frames[String(frameNumber)];
  if (!frame) return 1;

  const layer = frame.layers.find(l => l.id === layerId);
  return layer?.opacity ?? 1;
}, [frames]);





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

  // ✅ AGREGAR: Actualizar framesResume
  setFramesResume(prev => {
    const updated = { ...prev };
    
    validNumbers.forEach(num => {
      if (updated.frames[num]) {
        updated.frames[num].duration = duration;
      }
    });
    
    // Recalcular metadata
    updated.metadata.totalDuration = Object.values(updated.frames)
      .reduce((sum, frame) => sum + frame.duration, 0);
    updated.metadata.frameRate = Math.round(1000 / updated.metadata.defaultFrameDuration);
    
    return updated;
  });

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
  
    // ✅ AGREGAR: Actualizar framesResume
    setFramesResume(prev => {
      const updated = { ...prev };
      
      // Actualizar zIndex en la definición global de layers
      const layer = updated.layers[layerId];
      if (!layer) return prev;
      
      // Encontrar la capa que está inmediatamente debajo
      const relevantLayers = Object.values(updated.layers)
        .filter(l => layer.type === 'group' 
          ? l.type === 'group' && l.parentLayerId === layer.parentLayerId
          : l.type === 'normal'
        )
        .sort((a, b) => a.zIndex - b.zIndex);
      
      const currentIndex = relevantLayers.findIndex(l => l.id === layerId);
      if (currentIndex === 0) return prev;
      
      const layerBelow = relevantLayers[currentIndex - 1];
      
      // Intercambiar zIndex
      updated.layers[layerId] = { ...layer, zIndex: layerBelow.zIndex };
      updated.layers[layerBelow.id] = { ...layerBelow, zIndex: layer.zIndex };
      
      return updated;
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
  
    // ✅ AGREGAR: Actualizar framesResume
    setFramesResume(prev => {
      const updated = { ...prev };
      
      // Determinar el nuevo valor de visibilidad
      let atLeastOneVisible = false;
      let allVisible = true;
      
      Object.values(updated.frames).forEach(frame => {
        const isVisible = frame.layerVisibility[layerId] ?? true;
        if (isVisible) atLeastOneVisible = true;
        else allVisible = false;
      });
      
      const newVisibilityValue = allVisible ? false : true;
      
      // Aplicar a todos los frames
      Object.keys(updated.frames).forEach(frameKey => {
        updated.frames[frameKey].layerVisibility[layerId] = newVisibilityValue;
        updated.computed.resolvedFrames[frameKey].layerVisibility[layerId] = newVisibilityValue;
      });
      
      return updated;
    });
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
  
    // ✅ AGREGAR: Actualizar framesResume
    setFramesResume(prev => {
      const updated = { ...prev };
      
      if (updated.frames[frameStr]) {
        const currentVisibility = updated.frames[frameStr].layerVisibility[layerId] ?? true;
        const newVisibility = !currentVisibility;
        
        updated.frames[frameStr].layerVisibility[layerId] = newVisibility;
        updated.computed.resolvedFrames[frameStr].layerVisibility[layerId] = newVisibility;
      }
      
      return updated;
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
  
    // ✅ AGREGAR: Actualizar framesResume
    setFramesResume(prev => {
      const updated = { ...prev };
      
      frameNumbers.forEach(frameNum => {
        if (updated.frames[frameNum]) {
          // Marcar que la capa ya no tiene contenido
          updated.frames[frameNum].layerHasContent[layerId] = false;
          updated.computed.resolvedFrames[frameNum].layerHasContent[layerId] = false;
          
          // Limpiar pixelGroups
          updated.frames[frameNum].pixelGroups[layerId] = {};
        }
      });
      
      // Recalcular framesByLayer
      updated.computed.framesByLayer[layerId] = Object.keys(updated.frames)
        .map(Number)
        .filter(frameNum => updated.frames[frameNum].layerHasContent[layerId])
        .sort((a, b) => a - b);
      
      return updated;
    });
  
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
  

// Ref para trackear la última capa modificada
const lastModifiedLayer = useRef(null);
const geometricToolDrawn = useRef(false);
const [lastModifiedLayerState, setLastModifiedLayerState] = useState(null);
// useEffect para actualizar framesResume cuando termine el dibujo
useEffect(() => {
  if (lastModifiedLayerState && !isPressed) {
    const layerId = lastModifiedLayerState;
    
    setTimeout(() => {
      const canvas = layerCanvasesRef.current[layerId];
      let hasActualContent = false;
      
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // ✅ Convertir imageData actual a objeto de píxeles
        const currentPixels = imageDataToPixelObject(imageData);
        
        // ✅ Obtener estado anterior del canvas
        const canvasKey = `${layerId}_${currentFrame}`;
        const previousPixels = previousCanvasStatesRef.current[canvasKey] || {};
        
        // ✅ Detectar y mostrar cambios
        const changes = detectPixelChanges(previousPixels, currentPixels);
        logPixelChanges(changes, layerId, currentFrame);
        
        // ✅ Guardar el estado actual para la próxima comparación
        previousCanvasStatesRef.current[canvasKey] = { ...currentPixels };
        
        // Verificar si hay contenido real (lógica original)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) {
            hasActualContent = true;
            break;
          }
        }
      }
      
      setFramesResume(prev => {
        const updated = { ...prev };
        
        if (updated.frames[currentFrame]) {
          updated.frames[currentFrame].layerHasContent[layerId] = hasActualContent;
          updated.computed.resolvedFrames[currentFrame].layerHasContent[layerId] = hasActualContent;
          
          const currentFrames = updated.computed.framesByLayer[layerId] || [];
          if (hasActualContent && !currentFrames.includes(currentFrame)) {
            updated.computed.framesByLayer[layerId] = [...currentFrames, currentFrame].sort((a, b) => a - b);
          } else if (!hasActualContent && currentFrames.includes(currentFrame)) {
            updated.computed.framesByLayer[layerId] = currentFrames.filter(f => f !== currentFrame);
          }
        }
        
        return updated;
      });
    }, 50);
    
    // Limpiar el estado
    setLastModifiedLayerState(null);
    lastModifiedLayer.current = null;
  }
}, [lastModifiedLayerState, isPressed, currentFrame]);




// ===== FUNCIÓN DRAWONLAYER MODIFICADA =====

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

// 5. NUEVA FUNCIÓN: paintPixelsImmediate - ULTRA-OPTIMIZADA
const paintPixelsImmediate = useCallback((layerId, frameNumber, pixels, rgba) => {
  const frame = frames[frameNumber];
  if (!frame?.canvases[layerId]) return false;
  
  const canvas = frame.canvases[layerId];
  const ctx = canvas.getContext('2d', { 
    willReadFrequently: true,
    alpha: true
  });
  
  if (!ctx || pixels.length === 0) return false;

  // Crear imageData para toda la operación
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Optimización: usar TypedArray para mejor rendimiento
  const pixelCount = pixels.length;
  for (let i = 0; i < pixelCount; i++) {
    const pixel = pixels[i];
    if (pixel.x >= 0 && pixel.x < width && pixel.y >= 0 && pixel.y < height) {
      const index = (pixel.y * width + pixel.x) << 2; // Bit shift más rápido que * 4
      data[index] = rgba.r;
      data[index + 1] = rgba.g;
      data[index + 2] = rgba.b;
      data[index + 3] = rgba.a;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Solo re-renderizar si es el frame actual
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
const getLayerData = useCallback((layerId, x, y, width, height) => {
  return new Promise((resolve) => {
    const canvas = layerCanvasesRef.current[layerId];
    if (!canvas) {
      resolve(null);
      return;
    }
    
    // Make sure coordinates are within bounds
    const boundedX = Math.max(0, Math.min(x, canvas.width - 1));
    const boundedY = Math.max(0, Math.min(y, canvas.height - 1));
    const boundedWidth = Math.max(1, Math.min(width, canvas.width - boundedX));
    const boundedHeight = Math.max(1, Math.min(height, canvas.height - boundedY));
    
    const ctx = canvas.getContext('2d');
    try {
      const imageData = ctx.getImageData(boundedX, boundedY, boundedWidth, boundedHeight);
      resolve(imageData);
    } catch (e) {
      console.error('Error getting layer data:', e);
      resolve(null);
    }
  });
}, []);

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
        const layer = {
          id: layerId,
          name: layerData.name,
          visible: {
            [frameNumber]: layerData.visible
          },
          opacity: layerData.opacity,
          zIndex: layerData.zIndex,
          isGroupLayer: layerData.isGroupLayer,
          parentLayerId: layerData.parentLayerId
        };
        
        newFrame.layers.push(layer);
        
        // Recrear canvas con contenido
        const canvas = document.createElement('canvas');
        canvas.width = importData.metadata.width;
        canvas.height = importData.metadata.height;
        const ctx = canvas.getContext('2d');
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
  erasePixels,
  getCanvasCoordsFromPointer,
  getPointerCoordsFromCanvas,
//funcion para rellenado
  floodFill,
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

    //funciones para gestion de tiempo de los frames:
    setFrameDuration,
    getFrameDuration,
    getFrameRate,
    setDefaultFrameRate,
    defaultFrameDuration,
//Gestion de opacida de los frames
setFrameOpacity,
getFrameOpacity,

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
undoFrames, // Función específica para deshacer frames
redoFrames, // Función específica para rehacer frames

// Estados de disponibilidad
canUndo: canUndoComplete,
canRedo: canRedoComplete,
canUndoPixels,
canRedoPixels,
canUndoFrames,
canRedoFrames,

// Utilidades
clearHistory: clearAllHistory,
debugInfo: getCompleteDebugInfo,
getChangePreview,

// Información del stack
pixelChangesStack,
pixelChangesIndex,

// Función logPixelChanges modificada (ya incluye guardado en stack)
logPixelChanges,
history,

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


};
}