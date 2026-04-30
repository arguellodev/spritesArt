import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import './threejs.css';

// === Iconos inline (Lucide). Se declaran a nivel de módulo para no recrear
// componentes por render — exigido por la regla react-hooks/static-components
// y necesario para que el React Compiler pueda memoizar correctamente. ===
const Icon = ({ d, size = 14, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {d}
  </svg>
);
const IconBox = (p) => <Icon {...p} d={<><path d="m21 16-9 5-9-5V8l9-5 9 5v8z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" /></>} />;
const IconSliders = (p) => <Icon {...p} d={<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>} />;
const IconGrid = (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>} />;
const IconShapes = (p) => <Icon {...p} d={<><path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1z" /><rect x="3" y="14" width="7" height="7" rx="1" /><circle cx="17.5" cy="17.5" r="3.5" /></>} />;
const IconPalette = (p) => <Icon {...p} d={<><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></>} />;
const IconFilm = (p) => <Icon {...p} d={<><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></>} />;
const IconDownload = (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>} />;
const IconUpload = (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>} />;
const IconChevronDown = (p) => <Icon {...p} d={<polyline points="6 9 12 15 18 9" />} />;
const IconPlay = (p) => <Icon {...p} d={<polygon points="5 3 19 12 5 21 5 3" />} />;
const IconPause = (p) => <Icon {...p} d={<><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>} />;
const IconSend = (p) => <Icon {...p} d={<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>} />;
const IconImage = (p) => <Icon {...p} d={<><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>} />;
const IconInfo = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>} />;

// Helper de sección colapsable. Recibe el callback de toggle y el flag desde
// el padre — declarado a nivel de módulo para no recrear el componente.
const Section = ({ id, icon, title, open, onToggle, children }) => (
  <section className={`t3d-section ${open ? "t3d-section--open" : "t3d-section--collapsed"}`}>
    <button
      type="button"
      className="t3d-section__head"
      onClick={() => onToggle(id)}
      aria-expanded={open}
    >
      <span className="t3d-section__icon">{icon}</span>
      <span className="t3d-section__name">{title}</span>
      <IconChevronDown className="t3d-section__chevron" />
    </button>
    <div className="t3d-section__body">{children}</div>
  </section>
);

export default function Enhanced3DFlattener({paintPixelsRGBA, activeLayerId, onPixelDataReady}) {
  const containerRef = useRef(null);
  const modelRef = useRef(null);
  const loaderRef = useRef(new GLTFLoader());

//Controles para el control del background:
const [backgroundColor, setBackgroundColor] = useState('#00ff00'); // Verde pantalla verde
const backgroundColorRef = useRef(backgroundColor);


  // ✅ NUEVAS REFERENCIAS PARA ANIMACIONES
  const mixerRef = useRef(null);
  const animationsRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());

  const [brightness, setBrightness] = useState(1.0);
  const brightnessRef = useRef(brightness);

  // (Removido: pixelMode toggle. El render scale ya da el look pixelado en
  // el viewport — un mode que snapeaba UVs en el shader era redundante. Para
  // exportPixelData, los uniforms uPixelMode/uPixelSize se setean ahí mismo.)

  const [resolution, setResolution] = useState(128);
  const resolutionRef = useRef(resolution);

  const controlsRef = useRef(null);
const orthoControlsRef = useRef(null);
  // Nuevos controles para aplanar
  const [flattenMode, setFlattenMode] = useState('none');
  const flattenModeRef = useRef(flattenMode);

  const [colorMode, setColorMode] = useState('none');
  const colorModeRef = useRef(colorMode);

  const [flattenAmount, setFlattenAmount] = useState(0.5);
  const flattenAmountRef = useRef(flattenAmount);

  const [orthographic, setOrthographic] = useState(false);
  const orthographicRef = useRef(orthographic);

  const [antiAlias, setAntiAlias] = useState(false);
  const antiAliasRef = useRef(antiAlias);

  // Contornos basados en depth + normales (técnica de hello-threejs por
  // KodyJKing): renderiza la escena dos veces — RGBA+depth y normales —
  // y compara cada píxel con sus 4 vecinos en ambos buffers. Esto da
  // siluetas externas limpias (depth) y bordes internos entre caras
  // (normal) que el detector anterior basado en alpha no veía.
  const [outlineEnabled, setOutlineEnabled] = useState(true);
  const outlineEnabledRef = useRef(outlineEnabled);

  const [depthEdgeStrength, setDepthEdgeStrength] = useState(0.7);
  const depthEdgeStrengthRef = useRef(depthEdgeStrength);

  const [normalEdgeStrength, setNormalEdgeStrength] = useState(0.5);
  const normalEdgeStrengthRef = useRef(normalEdgeStrength);

  // Color del borde — antes era hardcoded (silueta hacia negro, normal
  // hacia blanco). Ahora ambos usan mix(color, uColor, strength*indicator):
  // negro = oscurece (look "outlined"), blanco = highlight, otros = tinte.
  const [depthEdgeColor, setDepthEdgeColor] = useState("#000000");
  const depthEdgeColorRef = useRef(depthEdgeColor);

  const [normalEdgeColor, setNormalEdgeColor] = useState("#000000");
  const normalEdgeColorRef = useRef(normalEdgeColor);

  // Umbral angular para considerar dos normales como "borde". 0.02 ≈ 7°,
  // 0.15 ≈ 31°, 0.5 ≈ 60°. Valores bajos detectan curvas suaves; altos
  // sólo pliegues pronunciados. Reemplaza el smoothstep hardcoded del demo.
  const [normalEdgeThreshold, setNormalEdgeThreshold] = useState(0.15);
  const normalEdgeThresholdRef = useRef(normalEdgeThreshold);

  // Cuando ON, el detector de normal edges ignora el depth gate. Resuelve
  // el caso de un brazo "delante" del cuerpo (depth casi idéntica) cuyo
  // contorno interior queremos ver. Trade-off: bordes 2px (ambos lados
  // marcan en vez de uno solo, como hacía hello-threejs).
  const [detectOccluded, setDetectOccluded] = useState(true);
  const detectOccludedRef = useRef(detectOccluded);

  // Render scale: divide la resolución del render target en modo no-pixel
  // (1 = nativa, 2 = mitad, etc). En el repo de KodyJKing usan /6 fijo.
  const [renderScale, setRenderScale] = useState(1);
  const renderScaleRef = useRef(renderScale);

  // (Removidos: edgeDetection / edgeThickness — el shader nuevo no los usa.
  // El antiguo detector por alpha era reemplazado por depth+normal edges.)

  // ✅ NUEVOS ESTADOS PARA ANIMACIONES
  const [hasAnimations, setHasAnimations] = useState(false);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [availableAnimations, setAvailableAnimations] = useState([]);

  const rtRef = useRef(null);
  const normalRtRef = useRef(null);
  const normalMaterialRef = useRef(null);
  const materialScreenRef = useRef(null);
  const rendererRef = useRef(null);
  const updateRTRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const orthoCameraRef = useRef(null);
  const fitCamerasToObjectRef = useRef(null);
  const pmremRef = useRef(null);
  const envTextureRef = useRef(null);
  // Lifteados a refs para que las funciones de export puedan reutilizar el
  // mismo pipeline de post-process que la pantalla — sin duplicar tempScene,
  // tempCamera, quad, ni el material. Garantiza pixel-perfect match.
  const dummySceneRef = useRef(null);
  const dummyCameraRef = useRef(null);
  const dummyQuadRef = useRef(null);

  // Preserva el gltf cargado entre cierre/reapertura del panel. <Activity>
  // tira los effects al ocultar; al reabrir el useEffect crea una scene
  // nueva, pero modelRef.current sigue apuntando al modelo. gltfRef permite
  // re-ejecutar setupAnimations contra el mismo gltf para reconectar el
  // mixer al modelo recién insertado.
  const gltfRef = useRef(null);
  // Id del requestAnimationFrame para cancelarlo en cleanup. Sin esto el
  // loop sigue corriendo tras renderer.dispose() y rompe el WebGL context.
  const rafIdRef = useRef(0);

  // (Removidos: showPixelGrid y pixelSizeValue — eran sólo del modo pixel UI.)

  const [showExportArea, setShowExportArea] = useState(true);
  const showExportAreaRef = useRef(showExportArea);

  useEffect(() => { showExportAreaRef.current = showExportArea; }, [showExportArea]);
  useEffect(() => { brightnessRef.current = brightness; }, [brightness]);
  useEffect(() => { resolutionRef.current = resolution; }, [resolution]);
  useEffect(() => { flattenModeRef.current = flattenMode; }, [flattenMode]);
  useEffect(() => { colorModeRef.current = colorMode; }, [colorMode]);
  useEffect(() => { flattenAmountRef.current = flattenAmount; }, [flattenAmount]);
  useEffect(() => { orthographicRef.current = orthographic; }, [orthographic]);
  useEffect(() => { antiAliasRef.current = antiAlias; }, [antiAlias]);
  useEffect(() => { outlineEnabledRef.current = outlineEnabled; }, [outlineEnabled]);
  useEffect(() => { depthEdgeStrengthRef.current = depthEdgeStrength; }, [depthEdgeStrength]);
  useEffect(() => { normalEdgeStrengthRef.current = normalEdgeStrength; }, [normalEdgeStrength]);
  useEffect(() => { depthEdgeColorRef.current = depthEdgeColor; }, [depthEdgeColor]);
  useEffect(() => { normalEdgeColorRef.current = normalEdgeColor; }, [normalEdgeColor]);
  useEffect(() => { normalEdgeThresholdRef.current = normalEdgeThreshold; }, [normalEdgeThreshold]);
  useEffect(() => { detectOccludedRef.current = detectOccluded; }, [detectOccluded]);
  useEffect(() => { renderScaleRef.current = renderScale; }, [renderScale]);
  useEffect(() => { backgroundColorRef.current = backgroundColor; }, [backgroundColor]);

  // FUNCIÓN PARA MANEJAR ANIMACIONES - CON MÁS DEBUGGING
  const setupAnimations = (gltf) => {
    console.log('🔍 Verificando animaciones en el modelo...');
    console.log('Animaciones encontradas:', gltf.animations);
    
    if (gltf.animations && gltf.animations.length > 0) {
      console.log(`📹 Encontradas ${gltf.animations.length} animaciones:`);
      
      // Crear mixer para el modelo
      const mixer = new THREE.AnimationMixer(gltf.scene);
      mixerRef.current = mixer;
      
      // Guardar todas las animaciones
      animationsRef.current = gltf.animations.map((clip, index) => {
        const action = mixer.clipAction(clip);
        
        // Configurar la acción correctamente
        action.clampWhenFinished = true;
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.paused = false;
        
        console.log(`🎭 Action creada para "${clip.name}":`, action);
        
        return {
          name: clip.name || `Animación ${index + 1}`,
          action: action,
          clip: clip
        };
      });
      
      setAvailableAnimations(animationsRef.current.map(anim => anim.name));
      setHasAnimations(true);
      setCurrentAnimation(0);
      
      console.log('✅ Animaciones configuradas correctamente');
    } else {
      console.log('❌ No se encontraron animaciones en el modelo');
      setHasAnimations(false);
      setAvailableAnimations([]);
    }
  };
  
  // ✅ FUNCIÓN MEJORADA PARA CONTROLAR REPRODUCCIÓN
  const toggleAnimation = () => {
    if (!mixerRef.current || animationsRef.current.length === 0) return;
    
    const currentAnim = animationsRef.current[currentAnimation];
    if (!currentAnim) return;
    
    if (animationPlaying) {
      // Pausar la animación actual
      currentAnim.action.paused = true;
      setAnimationPlaying(false);
      console.log('⏸️ Animación pausada');
    } else {
      // Reiniciar y reproducir la animación seleccionada
      currentAnim.action.reset();
      currentAnim.action.play();
      currentAnim.action.paused = false;
      currentAnim.action.timeScale = animationSpeed;
      
      setAnimationPlaying(true);
      console.log('▶️ Reproduciendo:', currentAnim.name);
    }
  };

  // ✅ FUNCIÓN PARA CAMBIAR ANIMACIÓN
  const changeAnimation = (index) => {
    if (!mixerRef.current || !animationsRef.current[index]) return;
    
    // Detener animación actual
    if (animationsRef.current[currentAnimation]) {
      animationsRef.current[currentAnimation].action.stop();
    }
    
    setCurrentAnimation(index);
    setAnimationPlaying(false);
    
    console.log(`🔄 Cambiado a: ${animationsRef.current[index].name}`);
  };

  // ✅ FUNCIÓN PARA CAMBIAR VELOCIDAD
  const updateAnimationSpeed = (speed) => {
    setAnimationSpeed(speed);
    if (mixerRef.current && animationPlaying) {
      animationsRef.current.forEach(anim => {
        anim.action.timeScale = speed;
      });
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    
    // Obtener tamaño del contenedor
    const getContainerSize = () => {
      const rect = container.getBoundingClientRect();
      return {
        width: rect.width || 950,
        height: rect.height || 950
      };
    };
    
    let { width: CANVAS_WIDTH, height: CANVAS_HEIGHT } = getContainerSize();
  
    // --- CÁMARAS RESPONSIVE ---
    const camera = new THREE.PerspectiveCamera(80, CANVAS_WIDTH / CANVAS_HEIGHT, 1, 10000);
    camera.position.set(0, 0, 500);
    cameraRef.current = camera;
  
    const orthoCamera = new THREE.OrthographicCamera(
      -400, 400, 300, -300, 1, 10000
    );
    orthoCamera.position.set(0, 0, 500);
    orthoCameraRef.current = orthoCamera;
  
    const dummyCamera = new THREE.OrthographicCamera(
      CANVAS_WIDTH / -2,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_HEIGHT / -2,
      -10000,
      10000
    );
    dummyCamera.position.z = 1;
  
    // --- ESCENAS ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const dummyScene = new THREE.Scene();
  
    // --- RENDER TARGET RESPONSIVE ---
    // El RT se renderiza a CANVAS / renderScale. renderScale=1 → nativo,
    // 6 → estilo hello-threejs (divideScalar(6)). Luego se upscalea con
    // NearestFilter para look pixelado, o Linear para suavizado.
    const computeRTSize = () => {
      const div = Math.max(1, renderScaleRef.current || 1);
      const w = Math.max(1, Math.round(CANVAS_WIDTH / div));
      const h = Math.max(1, Math.round(CANVAS_HEIGHT / div));
      return { w, h };
    };
    let { w: rtW, h: rtH } = computeRTSize();

    // RT principal: RGBA + DepthTexture (necesaria para edge detection por
    // diferencia de profundidad — patrón estándar de three.js post-procesado).
    const makeMainRT = (w, h) => {
      const rt = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        depthBuffer: true,
        depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType),
      });
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      return rt;
    };
    // RT de normales: la escena se re-renderiza con MeshNormalMaterial como
    // overrideMaterial para tener (nx, ny, nz) por píxel en view-space.
    const makeNormalRT = (w, h) => new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
    });

    let rtTexture = makeMainRT(rtW, rtH);
    rtRef.current = rtTexture;
    let normalRT = makeNormalRT(rtW, rtH);
    normalRtRef.current = normalRT;
    const normalMaterial = new THREE.MeshNormalMaterial();
    normalMaterialRef.current = normalMaterial;
  
    // --- SHADERS (MISMO QUE ANTES) ---
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform sampler2D tNormal;
    uniform float uBrightness;
    uniform int uFlattenMode;
    uniform float uFlattenAmount;
    uniform bool uAntiAlias;
    uniform bool uOutlineEnabled;
    uniform float uDepthEdgeStrength;
    uniform float uNormalEdgeStrength;
    uniform vec3 uDepthEdgeColor;
    uniform vec3 uNormalEdgeColor;
    uniform float uNormalEdgeThreshold;
    uniform bool uDetectOccluded;
    uniform vec2 uResolution;
    uniform vec2 uRtResolution;
    uniform bool uPixelMode;
    uniform float uPixelSize;
    uniform bool uShowGrid;
    uniform bool uShowExportArea;
    uniform float uExportResolution;
    uniform vec3 uBackgroundColor;
    varying vec2 vUv;

      vec3 posterize(vec3 color, float levels) {
        return floor(color * levels) / levels;
      }

      vec3 flattenColors(vec3 color) {
        color = smoothstep(0.0, 1.0, color);
        return posterize(color, 8.0);
      }

      vec2 pixelate(vec2 uv, float pixelSize) {
        if (!uPixelMode || pixelSize <= 1.0) return uv;
        
        vec2 screenCoords = uv * uResolution;
        vec2 pixelCoords = floor(screenCoords / pixelSize) * pixelSize;
        pixelCoords += pixelSize * 0.5;
        return pixelCoords / uResolution;
      }

      float getPixelGrid(vec2 uv, float pixelSize) {
        if (!uPixelMode || !uShowGrid || pixelSize <= 1.0) return 1.0;
        
        vec2 screenCoords = uv * uResolution;
        vec2 cellPos = mod(screenCoords, pixelSize);
        float lineWidth = 1.0;
        
        if (cellPos.x < lineWidth || cellPos.y < lineWidth) {
          return 0.7;
        }
        
        return 1.0;
      }

      vec3 getExportAreaOverlay(vec2 uv, vec3 color) {
        // Antes requería uPixelMode; ahora se muestra independiente para que
        // el usuario pueda alinear el modelo antes de exportar al editor.
        if (!uShowExportArea) return color;
        
        float canvasSize = min(uResolution.x, uResolution.y);
        vec2 center = vec2(0.5, 0.5);
        
        vec2 screenCoords = uv * uResolution;
        vec2 centerScreen = center * uResolution;
        
        float halfSize = canvasSize * 0.5;
        vec2 areaMin = centerScreen - halfSize;
        vec2 areaMax = centerScreen + halfSize;
        
        bool insideArea = screenCoords.x >= areaMin.x && screenCoords.x <= areaMax.x &&
                          screenCoords.y >= areaMin.y && screenCoords.y <= areaMax.y;
        
        float borderWidth = 4.0;
        bool onBorder = false;
        
        if (insideArea) {
          bool nearLeftEdge = screenCoords.x <= areaMin.x + borderWidth;
          bool nearRightEdge = screenCoords.x >= areaMax.x - borderWidth;
          bool nearTopEdge = screenCoords.y >= areaMax.y - borderWidth;
          bool nearBottomEdge = screenCoords.y <= areaMin.y + borderWidth;
          
          onBorder = nearLeftEdge || nearRightEdge || nearTopEdge || nearBottomEdge;
        }
        
        if (onBorder) {
          return mix(color, vec3(0.0, 1.0, 0.2), 0.8);
        } else if (!insideArea) {
          return color * 0.4;
        } else {
          return mix(color, vec3(1.0, 1.0, 1.0), 0.03);
        }
      }

      vec4 antiAliasFilter(sampler2D tex, vec2 uv, vec2 texelSize) {
        vec4 color = texture2D(tex, uv);
        vec4 sharp = color * 5.0;
        sharp -= texture2D(tex, uv + vec2(texelSize.x, 0.0));
        sharp -= texture2D(tex, uv - vec2(texelSize.x, 0.0));
        sharp -= texture2D(tex, uv + vec2(0.0, texelSize.y));
        sharp -= texture2D(tex, uv - vec2(0.0, texelSize.y));
        return mix(color, sharp, 0.3);
      }

      // ===== Edge detection portado de hello-threejs (KodyJKing) =====
      // Sample en el tamaño del render-target, no del canvas, para detectar
      // bordes a 1 píxel de distancia tanto en pixel mode como en no-pixel.
      // (Nota: GLSL ES 1.00 no permite globales no-const inicializadas desde
      // uniforms, así que el offset se calcula dentro de cada helper.)

      float getDepth(int x, int y) {
        vec2 off = vec2(float(x), float(y)) / uRtResolution;
        return texture2D(tDepth, vUv + off).r;
      }

      vec3 getNormal(int x, int y) {
        vec2 off = vec2(float(x), float(y)) / uRtResolution;
        return texture2D(tNormal, vUv + off).rgb * 2.0 - 1.0;
      }

      float depthEdgeIndicator() {
        float depth = getDepth(0, 0);
        float diff = 0.0;
        diff += clamp(getDepth(1, 0) - depth, 0.0, 1.0);
        diff += clamp(getDepth(-1, 0) - depth, 0.0, 1.0);
        diff += clamp(getDepth(0, 1) - depth, 0.0, 1.0);
        diff += clamp(getDepth(0, -1) - depth, 0.0, 1.0);
        return floor(smoothstep(0.01, 0.02, diff) * 2.0) / 2.0;
      }

      // Distancia angular SIMÉTRICA entre normales — independiente de la
      // orientación absoluta. Reemplaza el dot(diff, vec3(1,1,1)) del demo
      // original que solo detectaba bordes en ciertas direcciones (perdía,
      // p.ej., el contorno de un brazo a la izquierda del cuerpo).
      // 0 = normales idénticas; 1 = perpendiculares u opuestas.
      float neighborNormalEdgeIndicator(int x, int y, float depth, vec3 normal) {
        vec3 nbNormal = getNormal(x, y);
        float angleDiff = 1.0 - clamp(dot(normal, nbNormal), 0.0, 1.0);

        // Threshold suave: el cambio empieza a considerarse borde a partir
        // de uNormalEdgeThreshold/2 y es completo en uNormalEdgeThreshold.
        float angleIndicator = smoothstep(
          uNormalEdgeThreshold * 0.5,
          uNormalEdgeThreshold,
          angleDiff
        );

        if (uDetectOccluded) {
          // Sin depth gate: marca el borde aunque ambos píxeles estén a la
          // misma profundidad (caso brazo-sobre-cuerpo). Costo: 2px de grosor
          // porque ambos lados del borde marcan.
          return angleIndicator;
        }

        // Con depth gate: sólo el píxel más cercano marca → 1px crisp.
        // El bias +0.0025 permite que profundidades casi iguales también
        // se detecten (no solo cuando el vecino está claramente atrás).
        float depthDiff = getDepth(x, y) - depth;
        float depthIndicator = clamp(sign(depthDiff * 0.25 + 0.0025), 0.0, 1.0);
        return angleIndicator * depthIndicator;
      }

      float normalEdgeIndicator() {
        float depth = getDepth(0, 0);
        vec3 normal = getNormal(0, 0);
        float indicator = 0.0;
        indicator += neighborNormalEdgeIndicator(0, -1, depth, normal);
        indicator += neighborNormalEdgeIndicator(0,  1, depth, normal);
        indicator += neighborNormalEdgeIndicator(-1, 0, depth, normal);
        indicator += neighborNormalEdgeIndicator(1,  0, depth, normal);
        // Suma de hasta 4 vecinos; clamp a [0,1] en vez del step(0.1, ind)
        // original — así la intensidad del borde es proporcional al número
        // de vecinos diferentes, dando mejor antialiasing visual a baja res.
        return clamp(indicator, 0.0, 1.0);
      }

      void main() {
        vec2 texelSize = 1.0 / uResolution;
        vec2 pixelatedUV = pixelate(vUv, uPixelSize);
        
        vec4 texel;
        
        if (uAntiAlias) {
          texel = antiAliasFilter(tDiffuse, pixelatedUV, texelSize);
        } else {
          texel = texture2D(tDiffuse, pixelatedUV);
        }
        
        vec3 color = texel.rgb * uBrightness;
        
        if (uFlattenMode == 1) {
          color = flattenColors(color);
        } else if (uFlattenMode == 2) {
          color = posterize(color, 4.0);
          float luminance = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(color, vec3(luminance), 0.5);
        } else if (uFlattenMode == 3) {
          color = step(0.5, color);
        }
        
        // Outline depth+normal (hello-threejs). Ahora cada tipo de borde puede
        // tintarse a un color arbitrario. dei prioriza sobre nei (la silueta
        // gana cuando ambos coexisten en el mismo píxel). Fórmula:
        //   color = mix(color, uColor, strength * indicator)
        // → con uColor=negro: oscurece (look "outlined" clásico)
        // → con uColor=blanco: aclara (highlight como en hello-threejs original)
        // → cualquier otro color: tinte (ej. azul para edges estilo blueprint)
        if (uOutlineEnabled && texel.a > 0.1) {
          float dei = depthEdgeIndicator();
          float nei = normalEdgeIndicator();
          if (dei > 0.0) {
            color = mix(color, uDepthEdgeColor, clamp(uDepthEdgeStrength * dei, 0.0, 1.0));
          } else if (nei > 0.0) {
            color = mix(color, uNormalEdgeColor, clamp(uNormalEdgeStrength * nei, 0.0, 1.0));
          }
        }
        
        float gridMask = getPixelGrid(vUv, uPixelSize);
        color *= gridMask;
        
        color = getExportAreaOverlay(vUv, color);
        
 if (texel.a < 0.1) {
  vec3 bgColor = uBackgroundColor;  // USAR EL UNIFORM
  bgColor = getExportAreaOverlay(vUv, bgColor);
  gl_FragColor = vec4(bgColor, 1.0);
}
 else {
          gl_FragColor = vec4(color, texel.a);
        }
      }
    `;

    const materialScreen = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: rtTexture.texture },
        tDepth: { value: rtTexture.depthTexture },
        tNormal: { value: normalRT.texture },
        uBrightness: { value: brightnessRef.current },
        uFlattenMode: { value: 0 },
        uFlattenAmount: { value: flattenAmountRef.current },
        uAntiAlias: { value: antiAliasRef.current },
        uOutlineEnabled: { value: outlineEnabledRef.current },
        uDepthEdgeStrength: { value: depthEdgeStrengthRef.current },
        uNormalEdgeStrength: { value: normalEdgeStrengthRef.current },
        uDepthEdgeColor: { value: new THREE.Color(depthEdgeColorRef.current) },
        uNormalEdgeColor: { value: new THREE.Color(normalEdgeColorRef.current) },
        uNormalEdgeThreshold: { value: normalEdgeThresholdRef.current },
        uDetectOccluded: { value: detectOccludedRef.current },
        uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
        uRtResolution: { value: new THREE.Vector2(rtW, rtH) },
        uPixelMode: { value: false },
        uPixelSize: { value: 1.0 },
        uShowGrid: { value: false },
        uShowExportArea: { value: showExportAreaRef.current },
        uExportResolution: { value: resolutionRef.current },
        uBackgroundColor: { value: new THREE.Color(0x00ff00) },
      },
      vertexShader,
      fragmentShader,
      depthWrite: false,
    });
    materialScreenRef.current = materialScreen;
  
    // --- QUAD RESPONSIVE ---
    let quadGeo = new THREE.PlaneGeometry(CANVAS_WIDTH, CANVAS_HEIGHT);
    const quad = new THREE.Mesh(quadGeo, materialScreen);
    quad.position.z = -100;
    dummyScene.add(quad);

    // Refs para que exportPixelData/downloadImage reutilicen este mismo
    // post-process en vez de instanciar tempMaterial/tempScene paralelos
    // (que divergían visualmente con la pantalla).
    dummySceneRef.current = dummyScene;
    dummyCameraRef.current = dummyCamera;
    dummyQuadRef.current = quad;
  
    // --- LUCES ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
    fillLight.position.set(-5, -3, 2);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(0, 3, -5);
    scene.add(backLight);

    // --- RENDERER RESPONSIVE ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.autoClear = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- ENVIRONMENT (IBL) — debe ir DESPUÉS del renderer porque
    // PMREMGenerator necesita una instancia válida de WebGLRenderer ---
    // Los GLB modernos suelen usar materiales PBR (MeshStandardMaterial /
    // MeshPhysicalMaterial), que necesitan un environment map para reflejar
    // luz indirecta. Sin él los modelos se ven planos y oscuros aunque haya
    // direcionales. Patrón estándar del visor oficial threejs.org/examples:
    // PMREMGenerator + RoomEnvironment da iluminación neutra de estudio.
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremRef.current = pmrem;
    envTextureRef.current = envTexture;
  
    // --- CONTROLS ---
// --- CONTROLS ---


const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.enableZoom = true;
controls.target.set(0, 0, 0);
controlsRef.current = controls;

const orthoControls = new OrbitControls(orthoCamera, renderer.domElement);
orthoControls.enableDamping = true;
orthoControls.dampingFactor = 0.08;
orthoControls.enablePan = true;
orthoControls.screenSpacePanning = true;
orthoControls.enableZoom = true;
orthoControls.target.set(0, 0, 0);
orthoControlsRef.current = orthoControls;

    // --- AUTO-FIT DE CÁMARA ---
    // Patrón estándar de three.js examples: centra el modelo en el origen,
    // calcula el bounding box, y posiciona ambas cámaras para que el modelo
    // ocupe ~1.5x su altura visible. Se aplica al cargar cada modelo y al
    // resetear (botón "Encuadrar"). Sin esto un GLB de 0.01m o de 100m queda
    // invisible (fuera de near/far o cámara dentro de la geometría).
    const fitCamerasToObject = (object) => {
      const box = new THREE.Box3().setFromObject(object);
      if (!isFinite(box.min.x) || box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Centrar el modelo en el origen mundial.
      object.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim <= 0) return;

      // Cámara perspectiva: distancia para que maxDim quepa en el FOV con margen.
      const fovRad = (cameraRef.current.fov * Math.PI) / 180;
      const distance = (maxDim / 2) / Math.tan(fovRad / 2) * 1.5;
      cameraRef.current.position.set(0, 0, distance);
      cameraRef.current.near = Math.max(0.01, distance / 1000);
      cameraRef.current.far = distance * 100;
      cameraRef.current.updateProjectionMatrix();

      // Cámara ortográfica: ajustar half-extents al maxDim con margen.
      const half = maxDim * 0.75;
      const aspect = (CANVAS_WIDTH || 1) / (CANVAS_HEIGHT || 1);
      orthoCameraRef.current.left = -half * aspect;
      orthoCameraRef.current.right = half * aspect;
      orthoCameraRef.current.top = half;
      orthoCameraRef.current.bottom = -half;
      orthoCameraRef.current.position.set(0, 0, distance);
      orthoCameraRef.current.near = Math.max(0.01, distance / 1000);
      orthoCameraRef.current.far = distance * 100;
      orthoCameraRef.current.updateProjectionMatrix();

      // Resetear targets de OrbitControls al origen (donde quedó centrado).
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
      if (orthoControlsRef.current) {
        orthoControlsRef.current.target.set(0, 0, 0);
        orthoControlsRef.current.update();
      }
    };
    fitCamerasToObjectRef.current = fitCamerasToObject;

    // --- FUNCIONES ---
    const updateRenderTarget = () => {
      const { w, h } = computeRTSize();
      if (rtRef.current) {
        // dispose() también libera depthTexture asociada.
        rtRef.current.dispose();
      }
      if (normalRtRef.current) {
        normalRtRef.current.dispose();
      }
      const newRT = makeMainRT(w, h);
      const newNormalRT = makeNormalRT(w, h);
      rtRef.current = newRT;
      normalRtRef.current = newNormalRT;
      const m = materialScreenRef.current;
      if (m) {
        m.uniforms.tDiffuse.value = newRT.texture;
        m.uniforms.tDepth.value = newRT.depthTexture;
        m.uniforms.tNormal.value = newNormalRT.texture;
        m.uniforms.uRtResolution.value.set(w, h);
      }
    };
    updateRTRef.current = updateRenderTarget;
  
    // Función para aplanar geometría (MISMA QUE ANTES)
    const flattenGeometry = (object, mode, amount) => {
      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const positions = child.geometry.attributes.position;
          if (positions && !child.geometry.userData.originalPositions) {
            child.geometry.userData.originalPositions = positions.array.slice();
          }
          
          if (child.geometry.userData.originalPositions) {
            const original = child.geometry.userData.originalPositions;
            const current = positions.array;
            
            for (let i = 0; i < original.length; i += 3) {
              current[i] = original[i];
              current[i + 1] = original[i + 1];
              current[i + 2] = original[i + 2];
              
              if (mode === 'flatten-z') {
                current[i + 2] *= (1 - amount);
              } else if (mode === 'flatten-y') {
                current[i + 1] *= (1 - amount);
              } else if (mode === 'flatten-x') {
                current[i] *= (1 - amount);
              }
            }
            
            positions.needsUpdate = true;
            child.geometry.computeVertexNormals();
          }
        }
      });
    };
  
    // Función para resetear geometría (MISMA QUE ANTES)
    const resetGeometry = (object) => {
      object.traverse((child) => {
        if (child.isMesh && child.geometry && child.geometry.userData.originalPositions) {
          const positions = child.geometry.attributes.position;
          const original = child.geometry.userData.originalPositions;
          const current = positions.array;
          
          for (let i = 0; i < original.length; i++) {
            current[i] = original[i];
          }
          
          positions.needsUpdate = true;
          child.geometry.computeVertexNormals();
        }
      });
    };
  
    // Función onWindowResize RESPONSIVE COMPLETA
    const onWindowResize = () => {
      const { width, height } = getContainerSize();
      // Mantener CANVAS_WIDTH/HEIGHT vivos para computeRTSize tras un resize.
      CANVAS_WIDTH = width;
      CANVAS_HEIGHT = height;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      const aspect = width / height;
      const zoom = 400;
      orthoCamera.left = -zoom * aspect;
      orthoCamera.right = zoom * aspect;
      orthoCamera.top = zoom;
      orthoCamera.bottom = -zoom;
      orthoCamera.updateProjectionMatrix();

      dummyCamera.left = width / -2;
      dummyCamera.right = width / 2;
      dummyCamera.top = height / 2;
      dummyCamera.bottom = height / -2;
      dummyCamera.updateProjectionMatrix();

      renderer.setSize(width, height);
      materialScreenRef.current.uniforms.uResolution.value.set(width, height);

      quad.geometry.dispose();
      quad.geometry = new THREE.PlaneGeometry(width, height);

      updateRenderTarget();
    };
    window.addEventListener("resize", onWindowResize);
  
    const resizeObserver = new ResizeObserver(() => {
      onWindowResize();
    });
    resizeObserver.observe(container);
  
    // ✅ FUNCIÓN ANIMATE MODIFICADA PARA INCLUIR ANIMACIONES
    // Función animate completa
    const animate = () => {
      rafIdRef.current = requestAnimationFrame(animate);
      
      // Actualizar animaciones
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      
      // Actualizar uniforms básicos
      materialScreenRef.current.uniforms.uBrightness.value = brightnessRef.current;
      materialScreenRef.current.uniforms.uAntiAlias.value = antiAliasRef.current;
      materialScreenRef.current.uniforms.uOutlineEnabled.value = outlineEnabledRef.current;
      materialScreenRef.current.uniforms.uDepthEdgeStrength.value = depthEdgeStrengthRef.current;
      materialScreenRef.current.uniforms.uNormalEdgeStrength.value = normalEdgeStrengthRef.current;
      materialScreenRef.current.uniforms.uDepthEdgeColor.value.set(depthEdgeColorRef.current);
      materialScreenRef.current.uniforms.uNormalEdgeColor.value.set(normalEdgeColorRef.current);
      materialScreenRef.current.uniforms.uNormalEdgeThreshold.value = normalEdgeThresholdRef.current;
      materialScreenRef.current.uniforms.uDetectOccluded.value = detectOccludedRef.current;
      materialScreenRef.current.uniforms.uBackgroundColor.value.setHex(
        parseInt(backgroundColorRef.current.replace('#', '0x'))
      );
      
      // Actualizar efectos de color
      let colorModeValue = 0;
      if (colorModeRef.current === 'poster') colorModeValue = 1;
      else if (colorModeRef.current === 'toon') colorModeValue = 2;
      else if (colorModeRef.current === 'contrast') colorModeValue = 3;
      
      materialScreenRef.current.uniforms.uFlattenMode.value = colorModeValue;
      materialScreenRef.current.uniforms.uFlattenAmount.value = flattenAmountRef.current;
    
      // Display: nunca pixelado a nivel shader (renderScale ya da ese efecto).
      // uShowExportArea sigue activo independiente — sirve como guía visual
      // antes de exportar al editor con la resolución elegida.
      materialScreenRef.current.uniforms.uPixelMode.value = false;
      materialScreenRef.current.uniforms.uPixelSize.value = 1.0;
      materialScreenRef.current.uniforms.uShowGrid.value = false;
      materialScreenRef.current.uniforms.uShowExportArea.value = showExportAreaRef.current;
      materialScreenRef.current.uniforms.uExportResolution.value = resolutionRef.current;
      
      // Aplicar aplanamiento geométrico si hay modelo
      if (modelRef.current) {
        if (flattenModeRef.current !== 'none' && flattenModeRef.current.includes('flatten-')) {
          flattenGeometry(modelRef.current, flattenModeRef.current, flattenAmountRef.current);
        } else if (flattenModeRef.current === 'none') {
          resetGeometry(modelRef.current);
        }
      }

      // (Antes aquí se llamaba updateCanvasWithPixelData() cada frame: creaba 2
      // RenderTargets, un ShaderMaterial nuevo, y hacía readRenderTargetPixels
      // — readback síncrono GPU→CPU — para alimentar un canvas HTML duplicado.
      // El shader materialScreen ya pixela en GPU vía uPixelMode, así que el
      // canvas extra y todo ese trabajo por frame eran redundantes. La función
      // exportPixelData() sigue haciendo readback bajo demanda al pulsar el
      // botón "Exportar al Editor".)

      // Usar cámara apropiada
// Usar cámara apropiada
const activeCamera = orthographicRef.current ? orthoCamera : camera;
const activeControls = orthographicRef.current ? orthoControlsRef.current : controlsRef.current;

if (activeControls) {
  activeControls.update();
}
      
      // Pase 1: escena con materiales reales → RT principal (RGBA + depth).
      renderer.setRenderTarget(rtRef.current);
      renderer.clear();
      renderer.render(scene, activeCamera);

      // Pase 2: escena con MeshNormalMaterial como override → RT de normales.
      // Sólo necesario cuando contornos están activos; si no, se salta para
      // evitar el coste del segundo pase de geometría.
      if (outlineEnabledRef.current && normalRtRef.current && normalMaterialRef.current) {
        const prevOverride = scene.overrideMaterial;
        scene.overrideMaterial = normalMaterialRef.current;
        renderer.setRenderTarget(normalRtRef.current);
        renderer.clear();
        renderer.render(scene, activeCamera);
        scene.overrideMaterial = prevOverride;
      }

      // Pase 3: post-processing a la pantalla.
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(dummyScene, dummyCamera);
    };
    
    animate();

    // Re-anexión tras remount: si el usuario cargó un modelo, cerró el
    // panel y lo reabrió, modelRef.current sobrevive (no lo dispusimos en
    // cleanup). Lo metemos en la nueva escena y reconectamos el mixer.
    // En el primer mount (sin modelo) este bloque no hace nada.
    if (modelRef.current) {
      scene.add(modelRef.current);
      if (gltfRef.current) {
        // Reusa la lógica existente: crea un mixer fresco y resincroniza
        // el state de animaciones.
        setupAnimations(gltfRef.current);
      }
      if (fitCamerasToObjectRef.current) {
        // Re-encuadra para que el modelo siga visible (la cámara se
        // recreó en este mount, su posición es la inicial).
        fitCamerasToObjectRef.current(modelRef.current);
      }
    }

    return () => {
      // 1) Cancelar el rAF loop ANTES de disponer recursos. Si no se cancela
      //    el loop sigue corriendo, llama renderer.render() sobre un renderer
      //    disposed y rompe el contexto WebGL — al reabrir el panel <Activity>
      //    crea un nuevo contexto pero hereda el estado corrupto.
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }

      window.removeEventListener("resize", onWindowResize);
      resizeObserver.disconnect();

      // 2) Quitar el canvas del DOM. Sin esto al remontar se acumulan
      //    canvases muertos en el container; el usuario veía el viejo
      //    (con el contexto roto) en vez del nuevo.
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      if (controlsRef.current) controlsRef.current.dispose();
      if (orthoControlsRef.current) orthoControlsRef.current.dispose();
      if (rtRef.current) rtRef.current.dispose();
      if (normalRtRef.current) normalRtRef.current.dispose();
      if (normalMaterialRef.current) normalMaterialRef.current.dispose();
      if (envTextureRef.current) envTextureRef.current.dispose();
      if (pmremRef.current) pmremRef.current.dispose();
      renderer.dispose();

      // 3) Detener animaciones pero NO disponer modelRef/gltfRef ni sus
      //    geometries/materiales — al remontar, scene.add(modelRef.current)
      //    los reanexa a la nueva escena. setupAnimations recrea el mixer
      //    desde gltfRef.animations.
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      animationsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (typeof updateRTRef.current === "function") updateRTRef.current();
  }, [resolution, renderScale]);

  // (Antes había aquí un useEffect[pixelMode] que disposeaba y recreaba ambos
  // OrbitControls cada vez que se alternaba pixelMode, porque el canvas activo
  // cambiaba entre renderer.domElement y un canvas HTML duplicado. Ahora el
  // renderer.domElement es el único canvas visible en ambos modos — la
  // pixelación ocurre en el shader — así que los controles ya no necesitan
  // re-bindearse.)

  // ✅ FUNCIÓN PARA CARGAR MODELO CON SOPORTE DE ANIMACIONES
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    loaderRef.current.load(url, (gltf) => {
      const scene = sceneRef.current;
      if (!scene) return;

      // Limpiar modelo anterior
      if (modelRef.current) {
        scene.remove(modelRef.current);
        modelRef.current.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
      }

      // ✅ LIMPIAR ANIMACIONES ANTERIORES
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      animationsRef.current = [];
      setHasAnimations(false);
      setAnimationPlaying(false);
      setAvailableAnimations([]);

      // Agregar nuevo modelo. NO escalar arbitrariamente (antes: scale=50);
      // dejamos las dimensiones nativas y dejamos que fitCamerasToObject ajuste
      // la cámara al bounding box. Esto hace que cualquier GLB sea visible
      // (antes: invisible si era muy chico o cámara dentro si era muy grande).
      modelRef.current = gltf.scene;
      // Guardar el gltf entero para que el effect, al remontarse tras cerrar
      // y reabrir el panel, pueda re-ejecutar setupAnimations contra el
      // mismo objeto y reconectar el mixer al modelo.
      gltfRef.current = gltf;
      modelRef.current.position.set(0, 0, 0);
      modelRef.current.scale.set(1, 1, 1);
      scene.add(modelRef.current);

      // Encuadrar cámaras al modelo recién cargado.
      if (fitCamerasToObjectRef.current) {
        fitCamerasToObjectRef.current(modelRef.current);
      }

      // ✅ CONFIGURAR ANIMACIONES DEL NUEVO MODELO
      setupAnimations(gltf);

      console.log('✅ Modelo cargado:', file.name);
    },
    (progress) => {
      console.log('📥 Cargando:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('❌ Error cargando modelo:', error);
      alert('Error al cargar el archivo. Verifica que sea un archivo GLB/GLTF válido.');
    });
  };

  // Funciones de descarga (mismas que antes)
  // Helper: ejecuta el MISMO pipeline de pantalla (scene → rtRef + opcional
  // normals → normalRtRef + post-process con materialScreen) y deposita el
  // resultado en `outRT`. Garantiza que lo leído == lo que ve el usuario,
  // sólo sin uShowGrid/uShowExportArea (que serían ruido en exports).
  // Lo usan downloadImage y exportPixelData; downloadHighRes tiene su propio
  // pipeline a 2K que no comparte el RT de pantalla.
  const renderScreenToRT = (outRT) => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const material = materialScreenRef.current;
    const dummyScene = dummySceneRef.current;
    const dummyCamera = dummyCameraRef.current;
    if (!renderer || !scene || !material || !dummyScene || !dummyCamera) return null;

    const activeCamera = orthographicRef.current
      ? orthoCameraRef.current
      : cameraRef.current;

    // Salvar uniforms que sólo deben estar activos en pantalla.
    const prevShowGrid = material.uniforms.uShowGrid.value;
    const prevShowExportArea = material.uniforms.uShowExportArea.value;
    material.uniforms.uShowGrid.value = false;
    material.uniforms.uShowExportArea.value = false;

    // Pase 1: scene → RT principal (mismo RT que usa el animate loop, ya
    // dimensionado por renderScale).
    renderer.setRenderTarget(rtRef.current);
    renderer.clear();
    renderer.render(scene, activeCamera);

    // Pase 2: normales → normalRT (sólo si outlines activos).
    if (outlineEnabledRef.current && normalRtRef.current && normalMaterialRef.current) {
      const prevOverride = scene.overrideMaterial;
      scene.overrideMaterial = normalMaterialRef.current;
      renderer.setRenderTarget(normalRtRef.current);
      renderer.clear();
      renderer.render(scene, activeCamera);
      scene.overrideMaterial = prevOverride;
    }

    // Pase 3: post-process → outRT (en vez de a la pantalla).
    renderer.setRenderTarget(outRT);
    renderer.clear();
    renderer.render(dummyScene, dummyCamera);

    // Restaurar uniforms.
    material.uniforms.uShowGrid.value = prevShowGrid;
    material.uniforms.uShowExportArea.value = prevShowExportArea;
    renderer.setRenderTarget(null);
  };

  const downloadImage = () => {
    const renderer = rendererRef.current;
    if (!renderer || !modelRef.current) {
      alert("⚠️ Carga un modelo antes de exportar");
      return;
    }

    console.log('📸 Capturando imagen exactamente como se ve...');

    const currentSize = renderer.getSize(new THREE.Vector2());
    const canvasWidth = currentSize.x;
    const canvasHeight = currentSize.y;

    // Renderizar el pipeline de pantalla a un RT temporal y leer los píxeles.
    // No usamos `renderer.domElement.toDataURL()` porque el canvas usa
    // `preserveDrawingBuffer:false` por defecto y el contenido se descarta
    // tras el render — además queríamos quitar el grid y el área de export.
    const processedRT = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });
    renderScreenToRT(processedRT);

    const pixels = new Uint8Array(canvasWidth * canvasHeight * 4);
    renderer.readRenderTargetPixels(
      processedRT, 0, 0, canvasWidth, canvasHeight, pixels
    );

    // Volcar a un canvas 2D invirtiendo Y (GL → screen coords).
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const ctx = tempCanvas.getContext('2d');
    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
    for (let y = 0; y < canvasHeight; y++) {
      const srcRow = (canvasHeight - 1 - y) * canvasWidth * 4;
      const dstRow = y * canvasWidth * 4;
      for (let x = 0; x < canvasWidth * 4; x++) {
        imageData.data[dstRow + x] = pixels[srcRow + x];
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const link = document.createElement('a');
    link.download = `pixel-art-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    processedRT.dispose();

    console.log('✅ PNG descargado (pixel-perfect match con la pantalla)');
  };

  const downloadHighRes = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const materialScreen = materialScreenRef.current;
    const camera = orthographicRef.current ? orthoCameraRef.current : cameraRef.current;
    
    if (!renderer || !scene || !camera || !modelRef.current) {
      alert('⚠️ Primero carga un modelo GLB/GLTF para poder descargar en alta resolución');
      return;
    }

    console.log('🎨 Iniciando descarga en alta resolución con filtros...');
    
    const originalSize = renderer.getSize(new THREE.Vector2());
    
    const highResSize = 2048;
    const aspect = originalSize.x / originalSize.y;
    const width = highResSize;
    const height = Math.round(highResSize / aspect);
    
    // Para descarga 2K usamos LinearFilter (queda suavizado, ideal para PNG
    // estilo render). Si el usuario quiere un PNG pixelado, debe ajustar el
    // renderScale antes y exportar al editor para tener resolución exacta.
    const highResRT = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(width, height, THREE.UnsignedIntType),
    });
    const highResNormalRT = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
    });

    const finalRT = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    if (camera.isPerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    } else {
      const zoom = 400;
      camera.left = -zoom * (width / height);
      camera.right = zoom * (width / height);
      camera.top = zoom;
      camera.bottom = -zoom;
      camera.updateProjectionMatrix();
    }

    const tempMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: highResRT.texture },
        tDepth: { value: highResRT.depthTexture },
        tNormal: { value: highResNormalRT.texture },
        uBrightness: { value: brightnessRef.current },
        uFlattenMode: { value: materialScreen.uniforms.uFlattenMode.value },
        uFlattenAmount: { value: flattenAmountRef.current },
        uAntiAlias: { value: antiAliasRef.current },
        uOutlineEnabled: { value: outlineEnabledRef.current },
        uDepthEdgeStrength: { value: depthEdgeStrengthRef.current },
        uNormalEdgeStrength: { value: normalEdgeStrengthRef.current },
        uDepthEdgeColor: { value: new THREE.Color(depthEdgeColorRef.current) },
        uNormalEdgeColor: { value: new THREE.Color(normalEdgeColorRef.current) },
        uNormalEdgeThreshold: { value: normalEdgeThresholdRef.current },
        uDetectOccluded: { value: detectOccludedRef.current },
        uResolution: { value: new THREE.Vector2(width, height) },
        uRtResolution: { value: new THREE.Vector2(width, height) },
        uPixelMode: { value: false },
        uPixelSize: { value: 1.0 },
        uShowGrid: { value: false },
        uShowExportArea: { value: false },
        uExportResolution: { value: resolutionRef.current },
        uBackgroundColor: { value: new THREE.Color().setHex(parseInt(backgroundColorRef.current.replace('#', '0x'))) },
      },
      vertexShader: materialScreen.vertexShader,
      fragmentShader: materialScreen.fragmentShader,
      depthWrite: false,
    });

    const dummyScene = new THREE.Scene();
    const dummyCamera = new THREE.OrthographicCamera(
      width / -2, width / 2, height / 2, height / -2, -10000, 10000
    );
    dummyCamera.position.z = 1;

    const quadGeo = new THREE.PlaneGeometry(width, height);
    const quad = new THREE.Mesh(quadGeo, tempMaterial);
    quad.position.z = -100;
    dummyScene.add(quad);
    
    renderer.setRenderTarget(highResRT);
    renderer.clear();
    renderer.render(scene, camera);

    // Pase de normales para que los contornos funcionen en la exportación.
    if (outlineEnabledRef.current && normalMaterialRef.current) {
      const prevOverride = scene.overrideMaterial;
      scene.overrideMaterial = normalMaterialRef.current;
      renderer.setRenderTarget(highResNormalRT);
      renderer.clear();
      renderer.render(scene, camera);
      scene.overrideMaterial = prevOverride;
    }

    renderer.setRenderTarget(finalRT);
    renderer.clear();
    renderer.render(dummyScene, dummyCamera);

    const pixels = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(finalRT, 0, 0, width, height, pixels);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    
    const imageData = ctx.createImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = ((height - y - 1) * width + x) * 4;
        const dstIndex = (y * width + x) * 4;
        
        imageData.data[dstIndex] = pixels[srcIndex];
        imageData.data[dstIndex + 1] = pixels[srcIndex + 1];
        imageData.data[dstIndex + 2] = pixels[srcIndex + 2];
        imageData.data[dstIndex + 3] = pixels[srcIndex + 3];
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const link = document.createElement('a');
    link.download = `pixel-art-highres-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    renderer.setSize(originalSize.x, originalSize.y);
    renderer.setRenderTarget(null);
    
    if (camera.isPerspectiveCamera) {
      camera.aspect = originalSize.x / originalSize.y;
      camera.updateProjectionMatrix();
    } else {
      const zoom = 400;
      camera.left = -zoom * (originalSize.x / originalSize.y);
      camera.right = zoom * (originalSize.x / originalSize.y);
      camera.top = zoom;
      camera.bottom = -zoom;
      camera.updateProjectionMatrix();
    }
    
    highResRT.dispose();
    highResNormalRT.dispose();
    finalRT.dispose();
    tempMaterial.dispose();
    quadGeo.dispose();
    dummyScene.remove(quad);
    
    console.log('✅ Imagen en alta resolución descargada con todos los filtros aplicados');
  };

  const exportPixelData = () => {
    if (!modelRef.current) {
      alert("⚠️ Carga un modelo primero");
      return;
    }

    const renderer = rendererRef.current;
    const workingResolution = resolutionRef.current;
    const currentSize = renderer.getSize(new THREE.Vector2());
    const canvasWidth = currentSize.x;
    const canvasHeight = currentSize.y;

    // Área de exportación = cuadrado centrado de lado min(canvasW, canvasH),
    // exactamente la misma que muestra el overlay verde en pantalla.
    const exportSize = Math.min(canvasWidth, canvasHeight);
    const exportStartX = Math.floor((canvasWidth - exportSize) / 2);
    const exportStartY = Math.floor((canvasHeight - exportSize) / 2);

    console.log(
      `📐 Export ${workingResolution}×${workingResolution} desde área ${exportSize}×${exportSize} en (${exportStartX}, ${exportStartY})`
    );

    // RT del tamaño del canvas (= lo que se ve), sin filtrado para no contaminar.
    const processedRT = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });

    // Ejecutar el pipeline de pantalla → processedRT.
    renderScreenToRT(processedRT);

    // Leer todos los píxeles del canvas. readRenderTargetPixels devuelve la
    // imagen con Y invertido (origen abajo-izquierda en GL).
    const fullPixels = new Uint8Array(canvasWidth * canvasHeight * 4);
    renderer.readRenderTargetPixels(
      processedRT, 0, 0, canvasWidth, canvasHeight, fullPixels
    );

    // Sample directo desde el área cuadrada hacia la grilla workingResolution.
    // No promediamos vecinos — cada píxel exportado es 1 sample puntual del
    // canvas, así "lo que veo == lo que se exporta" se cumple incluso a
    // resolución alta del visor con renderScale=1.
    const pixelDataForEditor = [];
    const step = exportSize / workingResolution;

    for (let py = 0; py < workingResolution; py++) {
      for (let px = 0; px < workingResolution; px++) {
        // Centro del píxel destino en el área de export.
        const srcX = exportStartX + Math.floor((px + 0.5) * step);
        // Y invertido: el píxel py=0 (arriba en editor) corresponde a la fila
        // visualmente superior del canvas, que en coordenadas GL es la última.
        const srcYscreen = exportStartY + Math.floor((py + 0.5) * step);
        const srcYgl = canvasHeight - 1 - srcYscreen;

        if (srcX < 0 || srcX >= canvasWidth || srcYgl < 0 || srcYgl >= canvasHeight) continue;
        const idx = (srcYgl * canvasWidth + srcX) * 4;
        const r = fullPixels[idx];
        const g = fullPixels[idx + 1];
        const b = fullPixels[idx + 2];
        const a = fullPixels[idx + 3];

        if (a > 10) {
          pixelDataForEditor.push({
            x: px,
            y: py,
            color: { r, g, b, a },
          });
        }
      }
    }

    processedRT.dispose();

    console.log(
      `✅ Exportados ${pixelDataForEditor.length} píxeles a ${workingResolution}×${workingResolution}`
    );

    if (onPixelDataReady && pixelDataForEditor.length > 0) {
      onPixelDataReady(pixelDataForEditor);
    } else if (pixelDataForEditor.length === 0) {
      console.warn('⚠️ No se encontraron píxeles visibles en el área de exportación');
      alert('⚠️ El modelo no generó píxeles visibles en el área cuadrada central. Ajusta posición, zoom o área de captura.');
    }

    return pixelDataForEditor;
  };

  // (Eliminado: updateCanvasWithPixelData. Antes alimentaba un canvas HTML
  // duplicado en cada frame creando 2 RenderTargets, un ShaderMaterial nuevo y
  // haciendo readRenderTargetPixels — readback síncrono GPU→CPU. Era la causa
  // del lag al activar pixelMode. La pixelación ya la hace el shader
  // materialScreen vía uniforms uPixelMode/uPixelSize sobre el mismo canvas
  // del renderer, así que ese canvas extra y todo ese trabajo por frame eran
  // redundantes. exportPixelData() sigue haciendo el readback bajo demanda
  // cuando el usuario pulsa "Exportar al Editor".)

  // Estado de colapso de secciones del panel — todas abiertas por defecto.
  const [collapsed, setCollapsed] = useState({
    modelo: false,
    animacion: false,
    render: false,
    contornos: false,
    color: false,
    exportar: false,
  });
  const toggleSection = (key) =>
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="three-container">
      <aside className="t3d-controls" aria-label="Panel de controles del visor 3D">
        <header className="t3d-controls__header">
          <span className="t3d-controls__header-icon"><IconBox size={16} /></span>
          <div>
            <div className="t3d-controls__title">Visor 3D</div>
            <div className="t3d-controls__subtitle">Convierte modelos a pixel art</div>
          </div>
        </header>

        <div className="t3d-controls__scroll">

          {/* === MODELO === */}
          <Section id="modelo" icon={<IconBox />} title="Modelo" open={!collapsed.modelo} onToggle={toggleSection}>
            <label className="t3d-file">
              <IconUpload className="t3d-file__icon" />
              <span className="t3d-file__text">Cargar archivo GLB / GLTF</span>
              <input type="file" accept=".glb,.gltf" onChange={handleFileChange} />
            </label>
          </Section>

          {/* === ANIMACIÓN === */}
          {hasAnimations && (
            <Section id="animacion" icon={<IconFilm />} title="Animación" open={!collapsed.animacion} onToggle={toggleSection}>
              <div className="t3d-row">
                <div className="t3d-row__head">
                  <span className="t3d-label">Clip activo</span>
                </div>
                <select
                  className="t3d-select"
                  value={currentAnimation}
                  onChange={(e) => changeAnimation(parseInt(e.target.value))}
                  disabled={animationPlaying}
                >
                  {availableAnimations.map((name, index) => (
                    <option key={index} value={index}>{name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className={`t3d-btn ${animationPlaying ? "t3d-btn--warn" : "t3d-btn--accent"}`}
                onClick={toggleAnimation}
              >
                {animationPlaying ? <IconPause className="t3d-btn__icon" /> : <IconPlay className="t3d-btn__icon" />}
                {animationPlaying ? "Pausar" : "Reproducir"}
              </button>
              <div className="t3d-row">
                <div className="t3d-row__head">
                  <span className="t3d-label">Velocidad</span>
                  <span className="t3d-value">{animationSpeed.toFixed(1)}x</span>
                </div>
                <input
                  className="t3d-slider"
                  type="range" min="0.1" max="3.0" step="0.1"
                  value={animationSpeed}
                  onChange={(e) => updateAnimationSpeed(parseFloat(e.target.value))}
                />
              </div>
            </Section>
          )}

          {/* === RENDER === */}
          <Section id="render" icon={<IconSliders />} title="Render" open={!collapsed.render} onToggle={toggleSection}>
            <label className="t3d-toggle">
              <input
                type="checkbox"
                checked={orthographic}
                onChange={(e) => setOrthographic(e.target.checked)}
              />
              <span className="t3d-toggle__track" aria-hidden="true" />
              <span className="t3d-toggle__text">
                Cámara ortográfica
                <span className="t3d-toggle__hint">Sin distorsión de perspectiva</span>
              </span>
            </label>

            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Brillo</span>
                <span className="t3d-value">{brightness.toFixed(2)}</span>
              </div>
              <input
                className="t3d-slider"
                type="range" min="0" max="10" step="0.01"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
              />
            </div>

            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Render scale (1/n)</span>
                <span className="t3d-value">{renderScale}×</span>
              </div>
              <select
                className="t3d-select"
                value={renderScale}
                onChange={(e) => setRenderScale(parseInt(e.target.value))}
              >
                <option value={1}>1 — nativo (mejor calidad)</option>
                <option value={2}>1/2 — half (más rápido)</option>
                <option value={4}>1/4 — pixelado suave</option>
                <option value={6}>1/6 — estilo hello-threejs</option>
                <option value={8}>1/8 — máximo crunch</option>
              </select>
            </div>

            <label className="t3d-toggle">
              <input
                type="checkbox"
                checked={showExportArea}
                onChange={(e) => setShowExportArea(e.target.checked)}
              />
              <span className="t3d-toggle__track" aria-hidden="true" />
              <span className="t3d-toggle__text">
                Mostrar área de exportación
                <span className="t3d-toggle__hint">Guía cuadrada para alinear el modelo</span>
              </span>
            </label>

            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Color de fondo</span>
              </div>
              <div className="t3d-color">
                <input
                  type="color"
                  className="t3d-color__swatch"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  aria-label="Color de fondo"
                />
                <span className="t3d-color__hex">{backgroundColor}</span>
              </div>
            </div>
          </Section>

          {/* === CONTORNOS (depth + normal, hello-threejs) === */}
          <Section id="contornos" icon={<IconShapes />} title="Contornos" open={!collapsed.contornos} onToggle={toggleSection}>
            <label className="t3d-toggle">
              <input
                type="checkbox"
                checked={outlineEnabled}
                onChange={(e) => setOutlineEnabled(e.target.checked)}
              />
              <span className="t3d-toggle__track" aria-hidden="true" />
              <span className="t3d-toggle__text">
                Activar outlines
                <span className="t3d-toggle__hint">Edge depth + normales</span>
              </span>
            </label>

            {outlineEnabled && (
              <>
                {/* === Silueta exterior (depth edges) === */}
                <div className="t3d-edge-group">
                  <div className="t3d-edge-group__title">Silueta exterior</div>
                  <div className="t3d-row">
                    <div className="t3d-row__head">
                      <span className="t3d-label">Intensidad</span>
                      <span className="t3d-value">{depthEdgeStrength.toFixed(2)}</span>
                    </div>
                    <input
                      className="t3d-slider"
                      type="range" min="0" max="1" step="0.01"
                      value={depthEdgeStrength}
                      onChange={(e) => setDepthEdgeStrength(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="t3d-row">
                    <div className="t3d-row__head">
                      <span className="t3d-label">Color</span>
                    </div>
                    <div className="t3d-color">
                      <input
                        type="color"
                        className="t3d-color__swatch"
                        value={depthEdgeColor}
                        onChange={(e) => setDepthEdgeColor(e.target.value)}
                        aria-label="Color de silueta exterior"
                      />
                      <span className="t3d-color__hex">{depthEdgeColor}</span>
                    </div>
                  </div>
                </div>

                {/* === Caras internas (normal edges) === */}
                <div className="t3d-edge-group">
                  <div className="t3d-edge-group__title">Caras internas</div>
                  <div className="t3d-row">
                    <div className="t3d-row__head">
                      <span className="t3d-label">Intensidad</span>
                      <span className="t3d-value">{normalEdgeStrength.toFixed(2)}</span>
                    </div>
                    <input
                      className="t3d-slider"
                      type="range" min="0" max="1" step="0.01"
                      value={normalEdgeStrength}
                      onChange={(e) => setNormalEdgeStrength(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="t3d-row">
                    <div className="t3d-row__head">
                      <span className="t3d-label">Umbral angular</span>
                      <span className="t3d-value">{normalEdgeThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      className="t3d-slider"
                      type="range" min="0.02" max="0.5" step="0.01"
                      value={normalEdgeThreshold}
                      onChange={(e) => setNormalEdgeThreshold(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="t3d-row">
                    <div className="t3d-row__head">
                      <span className="t3d-label">Color</span>
                    </div>
                    <div className="t3d-color">
                      <input
                        type="color"
                        className="t3d-color__swatch"
                        value={normalEdgeColor}
                        onChange={(e) => setNormalEdgeColor(e.target.value)}
                        aria-label="Color de caras internas"
                      />
                      <span className="t3d-color__hex">{normalEdgeColor}</span>
                    </div>
                  </div>
                  <label className="t3d-toggle">
                    <input
                      type="checkbox"
                      checked={detectOccluded}
                      onChange={(e) => setDetectOccluded(e.target.checked)}
                    />
                    <span className="t3d-toggle__track" aria-hidden="true" />
                    <span className="t3d-toggle__text">
                      Detectar a través de oclusión
                      <span className="t3d-toggle__hint">
                        Marca brazo/cuerpo aunque solapen
                      </span>
                    </span>
                  </label>
                </div>

                <div className="t3d-hint" role="note">
                  <IconInfo className="t3d-hint__icon" />
                  <span>
                    Umbral bajo (0.05) capta curvas suaves; alto (0.4) sólo
                    pliegues marcados. "A través de oclusión" activado
                    permite ver el contorno del brazo sobre el cuerpo.
                  </span>
                </div>
              </>
            )}
          </Section>

          {/* === COLOR Y EFECTOS === */}
          <Section id="color" icon={<IconPalette />} title="Color y efectos" open={!collapsed.color} onToggle={toggleSection}>
            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Modo de color</span>
              </div>
              <select
                className="t3d-select"
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value)}
              >
                <option value="none">Sin efectos</option>
                <option value="poster">Posterizado (planos)</option>
                <option value="toon">Toon shading</option>
                <option value="contrast">Alto contraste</option>
              </select>
            </div>

            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Aplanado geométrico</span>
              </div>
              <select
                className="t3d-select"
                value={flattenMode}
                onChange={(e) => setFlattenMode(e.target.value)}
              >
                <option value="none">Sin aplanar</option>
                <option value="flatten-z">Profundidad (Z)</option>
                <option value="flatten-y">Altura (Y)</option>
                <option value="flatten-x">Ancho (X)</option>
              </select>
            </div>

            {flattenMode.includes("flatten-") && (
              <div className="t3d-row">
                <div className="t3d-row__head">
                  <span className="t3d-label">Intensidad aplanado</span>
                  <span className="t3d-value">{flattenAmount.toFixed(2)}</span>
                </div>
                <input
                  className="t3d-slider"
                  type="range" min="0" max="1" step="0.01"
                  value={flattenAmount}
                  onChange={(e) => setFlattenAmount(parseFloat(e.target.value))}
                />
              </div>
            )}

            <label className="t3d-toggle">
              <input
                type="checkbox"
                checked={antiAlias}
                onChange={(e) => setAntiAlias(e.target.checked)}
              />
              <span className="t3d-toggle__track" aria-hidden="true" />
              <span className="t3d-toggle__text">
                Anti-aliasing
                <span className="t3d-toggle__hint">Realza bordes en modo no-pixel</span>
              </span>
            </label>
          </Section>

          {/* === EXPORTAR === */}
          <Section id="exportar" icon={<IconDownload />} title="Exportar" open={!collapsed.exportar} onToggle={toggleSection}>
            <div className="t3d-row">
              <div className="t3d-row__head">
                <span className="t3d-label">Resolución para el editor</span>
                <span className="t3d-value">{resolution}px</span>
              </div>
              <select
                className="t3d-select"
                value={resolution}
                onChange={(e) => setResolution(parseInt(e.target.value))}
              >
                <option value={16}>16 × 16</option>
                <option value={32}>32 × 32</option>
                <option value={64}>64 × 64</option>
                <option value={128}>128 × 128</option>
                <option value={256}>256 × 256</option>
              </select>
            </div>

            <button
              type="button"
              className="t3d-btn t3d-btn--purple"
              onClick={exportPixelData}
              title="Exportar al editor con la resolución elegida"
            >
              <IconSend className="t3d-btn__icon" />
              Al editor ({resolution}×{resolution})
            </button>

            <button
              type="button"
              className="t3d-btn"
              onClick={downloadImage}
            >
              <IconImage className="t3d-btn__icon" />
              PNG actual
            </button>
            <button
              type="button"
              className="t3d-btn t3d-btn--warn"
              onClick={downloadHighRes}
            >
              <IconDownload className="t3d-btn__icon" />
              PNG alta resolución (2K)
            </button>
          </Section>

        </div>
      </aside>

      <div ref={containerRef} className="three-canvas-container" />
    </div>
  );
}