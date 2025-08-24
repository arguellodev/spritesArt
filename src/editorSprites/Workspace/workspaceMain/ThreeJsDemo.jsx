import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import './threejs.css';

export default function Enhanced3DFlattener({paintPixelsRGBA, activeLayerId, onPixelDataReady}) {
  const containerRef = useRef(null);
  const modelRef = useRef(null);
  const loaderRef = useRef(new GLTFLoader());

//Controles para el control del background:
const [backgroundColor, setBackgroundColor] = useState('#00ff00'); // Verde pantalla verde
const backgroundColorRef = useRef(backgroundColor);
  
const pixelCanvasRef = useRef(null);


  // ✅ NUEVAS REFERENCIAS PARA ANIMACIONES
  const mixerRef = useRef(null);
  const animationsRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());

  const [brightness, setBrightness] = useState(1.0);
  const brightnessRef = useRef(brightness);

  const [pixelMode, setPixelMode] = useState(false);
  const pixelModeRef = useRef(pixelMode);

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

  const [edgeDetection, setEdgeDetection] = useState(false);
  const edgeDetectionRef = useRef(edgeDetection);

  const [edgeThickness, setEdgeThickness] = useState(1.0);
  const edgeThicknessRef = useRef(edgeThickness);

  // ✅ NUEVOS ESTADOS PARA ANIMACIONES
  const [hasAnimations, setHasAnimations] = useState(false);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [availableAnimations, setAvailableAnimations] = useState([]);

  const rtRef = useRef(null);
  const materialScreenRef = useRef(null);
  const rendererRef = useRef(null);
  const updateRTRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const orthoCameraRef = useRef(null);

  const [showPixelGrid, setShowPixelGrid] = useState(true);
  const showPixelGridRef = useRef(showPixelGrid);

  const [pixelSizeValue, setPixelSizeValue] = useState(32);
  const pixelSizeValueRef = useRef(pixelSizeValue);

  const [showExportArea, setShowExportArea] = useState(true);
  const showExportAreaRef = useRef(showExportArea);

  useEffect(() => { showExportAreaRef.current = showExportArea; }, [showExportArea]);
  useEffect(() => { brightnessRef.current = brightness; }, [brightness]);
  useEffect(() => { pixelModeRef.current = pixelMode; }, [pixelMode]);
  useEffect(() => { resolutionRef.current = resolution; }, [resolution]);
  useEffect(() => { flattenModeRef.current = flattenMode; }, [flattenMode]);
  useEffect(() => { colorModeRef.current = colorMode; }, [colorMode]);
  useEffect(() => { flattenAmountRef.current = flattenAmount; }, [flattenAmount]);
  useEffect(() => { orthographicRef.current = orthographic; }, [orthographic]);
  useEffect(() => { antiAliasRef.current = antiAlias; }, [antiAlias]);
  useEffect(() => { edgeDetectionRef.current = edgeDetection; }, [edgeDetection]);
  useEffect(() => { edgeThicknessRef.current = edgeThickness; }, [edgeThickness]);
  useEffect(() => { showPixelGridRef.current = showPixelGrid; }, [showPixelGrid]);
  useEffect(() => { pixelSizeValueRef.current = pixelSizeValue; }, [pixelSizeValue]);
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
    const computeRTSize = () => {
      if (pixelModeRef.current) {
        const w = Math.max(1, Math.round(resolutionRef.current));
        const aspect = CANVAS_HEIGHT / CANVAS_WIDTH;
        const h = Math.max(1, Math.round(w * aspect));
        return { w, h };
      } else {
        return { w: CANVAS_WIDTH, h: CANVAS_HEIGHT };
      }
    };
    let { w: rtW, h: rtH } = computeRTSize();
  
    let rtTexture = new THREE.WebGLRenderTarget(rtW, rtH, {
      minFilter: pixelModeRef.current ? THREE.NearestFilter : THREE.LinearFilter,
      magFilter: pixelModeRef.current ? THREE.NearestFilter : THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    rtTexture.texture.colorSpace = THREE.SRGBColorSpace;
    rtRef.current = rtTexture;
  
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
    uniform float uBrightness;
    uniform int uFlattenMode;
    uniform float uFlattenAmount;
    uniform bool uAntiAlias;
    uniform bool uEdgeDetection;
    uniform float uEdgeThickness;
    uniform vec2 uResolution;
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
        if (!uShowExportArea || !uPixelMode) return color;
        
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
        
        if (uEdgeDetection) {
          vec2 offset = texelSize * uEdgeThickness;
          float centerLuminance = dot(color, vec3(0.299, 0.587, 0.114));
          
          if (texel.a > 0.1 && centerLuminance > 0.05) {
            float edgeStrength = 0.0;
            
            vec4 samples[8];
            samples[0] = texture2D(tDiffuse, pixelatedUV + vec2(-offset.x, -offset.y));
            samples[1] = texture2D(tDiffuse, pixelatedUV + vec2(0.0, -offset.y));
            samples[2] = texture2D(tDiffuse, pixelatedUV + vec2(offset.x, -offset.y));
            samples[3] = texture2D(tDiffuse, pixelatedUV + vec2(offset.x, 0.0));
            samples[4] = texture2D(tDiffuse, pixelatedUV + vec2(offset.x, offset.y));
            samples[5] = texture2D(tDiffuse, pixelatedUV + vec2(0.0, offset.y));
            samples[6] = texture2D(tDiffuse, pixelatedUV + vec2(-offset.x, offset.y));
            samples[7] = texture2D(tDiffuse, pixelatedUV + vec2(-offset.x, 0.0));
            
            for (int i = 0; i < 8; i++) {
              vec3 sampleColor = samples[i].rgb * uBrightness;
              float sampleLuminance = dot(sampleColor, vec3(0.299, 0.587, 0.114));
              bool sampleIsBackground = samples[i].a < 0.1 || sampleLuminance < 0.05;
              
              if (sampleIsBackground) {
                edgeStrength += 1.0;
              }
            }
            
            edgeStrength /= 8.0;
            float edge = smoothstep(0.1, 0.5, edgeStrength);
            color = mix(color, vec3(0.0), edge);
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
        uBrightness: { value: brightnessRef.current },
        uFlattenMode: { value: 0 },
        uFlattenAmount: { value: flattenAmountRef.current },
        uAntiAlias: { value: antiAliasRef.current },
        uEdgeDetection: { value: edgeDetectionRef.current },
        uEdgeThickness: { value: edgeThicknessRef.current },
        uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
        uPixelMode: { value: pixelModeRef.current },
        uPixelSize: { value: 32.0 },
        uShowGrid: { value: true },
        uShowExportArea: { value: showExportAreaRef.current },
        uExportResolution: { value: resolutionRef.current },
        uBackgroundColor: { value: new THREE.Color(0x00ff00) }, // Verde inicial
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
  
    // --- LUCES ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, -3, 2);
    scene.add(fillLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
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
  // Nuevas referencias para controles dinámicos

    // --- FUNCIONES ---
    const updateRenderTarget = () => {
      if (rtRef.current) rtRef.current.dispose();
      const { w, h } = computeRTSize();
      const newRT = new THREE.WebGLRenderTarget(w, h, {
        minFilter: pixelModeRef.current ? THREE.NearestFilter : THREE.LinearFilter,
        magFilter: pixelModeRef.current ? THREE.NearestFilter : THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });
      newRT.texture.colorSpace = THREE.SRGBColorSpace;
      rtRef.current = newRT;
      materialScreenRef.current.uniforms.tDiffuse.value = newRT.texture;
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
      requestAnimationFrame(animate);
      
      // Actualizar animaciones
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      
      // Actualizar uniforms básicos
      materialScreenRef.current.uniforms.uBrightness.value = brightnessRef.current;
      materialScreenRef.current.uniforms.uAntiAlias.value = antiAliasRef.current;
      materialScreenRef.current.uniforms.uEdgeDetection.value = edgeDetectionRef.current;
      materialScreenRef.current.uniforms.uEdgeThickness.value = edgeThicknessRef.current;
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
    
      materialScreenRef.current.uniforms.uPixelMode.value = pixelModeRef.current;
      materialScreenRef.current.uniforms.uShowGrid.value = showPixelGridRef.current;
      materialScreenRef.current.uniforms.uShowExportArea.value = showExportAreaRef.current;
      materialScreenRef.current.uniforms.uExportResolution.value = resolutionRef.current;
      
      if (pixelModeRef.current) {
        const currentSize = rendererRef.current.getSize(new THREE.Vector2());
        const canvasSize = Math.min(currentSize.x, currentSize.y);
        const workingResolution = resolutionRef.current;
        const calculatedPixelSize = canvasSize / workingResolution;
        
        materialScreenRef.current.uniforms.uPixelSize.value = calculatedPixelSize;
      } else {
        materialScreenRef.current.uniforms.uPixelSize.value = 1.0;
      }
      
      // Aplicar aplanamiento geométrico si hay modelo
      if (modelRef.current) {
        if (flattenModeRef.current !== 'none' && flattenModeRef.current.includes('flatten-')) {
          flattenGeometry(modelRef.current, flattenModeRef.current, flattenAmountRef.current);
        } else if (flattenModeRef.current === 'none') {
          resetGeometry(modelRef.current);
        }
      }
      
      // Actualizar canvas en tiempo real
      updateCanvasWithPixelData();
      
      // Usar cámara apropiada
// Usar cámara apropiada
const activeCamera = orthographicRef.current ? orthoCamera : camera;
const activeControls = orthographicRef.current ? orthoControlsRef.current : controlsRef.current;

if (activeControls) {
  activeControls.update();
}
      
      // Renderizar escena 3D al render target
      renderer.setRenderTarget(rtRef.current);
      renderer.clear();
      renderer.render(scene, activeCamera);
      
      // Renderizar post-processing a la pantalla
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(dummyScene, dummyCamera);
    };
    
    animate();
  
    return () => {
      window.removeEventListener("resize", onWindowResize);
      resizeObserver.disconnect();
      if (controlsRef.current) controlsRef.current.dispose();
      if (orthoControlsRef.current) orthoControlsRef.current.dispose();
      renderer.dispose();
      
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      animationsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (typeof updateRTRef.current === "function") updateRTRef.current();
  }, [pixelMode, resolution]);


  // Efecto para cambiar controles dinámicamente según el modo pixel
useEffect(() => {
  const canvas = pixelCanvasRef.current;
  const container = containerRef.current;
  
  if (canvas && container && rendererRef.current) {
    if (pixelMode) {
      // Cambiar controles al canvas pixel
      const canvas3D = rendererRef.current.domElement;
      if (controlsRef.current && orthoControlsRef.current) {
        const currentTarget = controlsRef.current.target.clone();
        const currentPosition = cameraRef.current.position.clone();
        const currentOrthoPosition = orthoCameraRef.current.position.clone();
        
        controlsRef.current.dispose();
        orthoControlsRef.current.dispose();
        
        const newControls = new OrbitControls(cameraRef.current, canvas);
        newControls.enableDamping = true;
        newControls.dampingFactor = 0.08;
        newControls.enablePan = true;
        newControls.screenSpacePanning = true;
        newControls.enableZoom = true;
        newControls.target.copy(currentTarget);
        controlsRef.current = newControls;
        
        const newOrthoControls = new OrbitControls(orthoCameraRef.current, canvas);
        newOrthoControls.enableDamping = true;
        newOrthoControls.dampingFactor = 0.08;
        newOrthoControls.enablePan = true;
        newOrthoControls.screenSpacePanning = true;
        newOrthoControls.enableZoom = true;
        newOrthoControls.target.copy(currentTarget);
        orthoControlsRef.current = newOrthoControls;
        
        cameraRef.current.position.copy(currentPosition);
        orthoCameraRef.current.position.copy(currentOrthoPosition);
      }
    } else {
      // Cambiar controles de vuelta al contenedor 3D
      const canvas3D = rendererRef.current.domElement;
      if (controlsRef.current && orthoControlsRef.current) {
        const currentTarget = controlsRef.current.target.clone();
        const currentPosition = cameraRef.current.position.clone();
        const currentOrthoPosition = orthoCameraRef.current.position.clone();
        
        controlsRef.current.dispose();
        orthoControlsRef.current.dispose();
        
        const newControls = new OrbitControls(cameraRef.current, canvas3D);
        newControls.enableDamping = true;
        newControls.dampingFactor = 0.08;
        newControls.enablePan = true;
        newControls.screenSpacePanning = true;
        newControls.enableZoom = true;
        newControls.target.copy(currentTarget);
        controlsRef.current = newControls;
        
        const newOrthoControls = new OrbitControls(orthoCameraRef.current, canvas3D);
        newOrthoControls.enableDamping = true;
        newOrthoControls.dampingFactor = 0.08;
        newOrthoControls.enablePan = true;
        newOrthoControls.screenSpacePanning = true;
        newOrthoControls.enableZoom = true;
        newOrthoControls.target.copy(currentTarget);
        orthoControlsRef.current = newOrthoControls;
        
        cameraRef.current.position.copy(currentPosition);
        orthoCameraRef.current.position.copy(currentOrthoPosition);
      }
    }
  }
}, [pixelMode]);

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

      // Agregar nuevo modelo
      modelRef.current = gltf.scene;
      modelRef.current.position.set(0, 0, 0);
      modelRef.current.scale.set(50, 50, 50);
      scene.add(modelRef.current);

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
  const downloadImage = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const materialScreen = materialScreenRef.current;
    const rt = rtRef.current;

    if (!renderer || !modelRef.current) {
      alert("⚠️ Carga un modelo antes de exportar");
      return;
    }

    console.log('📸 Capturando imagen con filtros aplicados...');

    const dummyScene = new THREE.Scene();
    const dummyCamera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      -10000,
      10000
    );
    dummyCamera.position.z = 1;

    const quadGeo = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    const quad = new THREE.Mesh(quadGeo, materialScreen);
    quad.position.z = -100;
    dummyScene.add(quad);

    const activeCamera = orthographicRef.current ? orthoCameraRef.current : cameraRef.current;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, activeCamera);

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(dummyScene, dummyCamera);

    const dataURL = renderer.domElement.toDataURL("image/png");

    const link = document.createElement("a");
    link.download = `pixel-art-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    quadGeo.dispose();
    dummyScene.remove(quad);

    console.log('✅ Imagen descargada con filtros aplicados');
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
    
    const highResRT = new THREE.WebGLRenderTarget(width, height, {
      minFilter: pixelModeRef.current ? THREE.NearestFilter : THREE.LinearFilter,
      magFilter: pixelModeRef.current ? THREE.NearestFilter : THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    
    const finalRT = new THREE.WebGLRenderTarget(width, height, {
      minFilter: pixelModeRef.current ? THREE.NearestFilter : THREE.LinearFilter,
      magFilter: pixelModeRef.current ? THREE.NearestFilter : THREE.LinearFilter,
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
        uBrightness: { value: brightnessRef.current },
        uFlattenMode: { value: materialScreen.uniforms.uFlattenMode.value },
        uFlattenAmount: { value: flattenAmountRef.current },
        uAntiAlias: { value: antiAliasRef.current },
        uEdgeDetection: { value: edgeDetectionRef.current },
        uEdgeThickness: { value: edgeThicknessRef.current },
        uResolution: { value: new THREE.Vector2(width, height) },
      
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
    finalRT.dispose();
    tempMaterial.dispose();
    quadGeo.dispose();
    dummyScene.remove(quad);
    
    console.log('✅ Imagen en alta resolución descargada con todos los filtros aplicados');
  };

  const exportPixelData = () => {
    if (!pixelModeRef.current || !modelRef.current) {
      alert("⚠️ Activa el modo pixel y carga un modelo primero");
      return;
    }

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const materialScreen = materialScreenRef.current;
    const workingResolution = resolutionRef.current;
    
    console.log(`📐 Exportando área cuadrada: ${workingResolution}×${workingResolution}`);
    
    const currentSize = renderer.getSize(new THREE.Vector2());
    const canvasWidth = currentSize.x;
    const canvasHeight = currentSize.y;
    
    const canvasSize = Math.min(canvasWidth, canvasHeight);
    const exportStartX = Math.floor((canvasWidth - canvasSize) / 2);
    const exportStartY = Math.floor((canvasHeight - canvasSize) / 2);
    const exportSize = canvasSize;
    
    console.log(`📍 Área de exportación: ${exportStartX}, ${exportStartY}, ${exportSize}×${exportSize}`);
    
    const fullRT = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });

    const activeCamera = orthographicRef.current ? orthoCameraRef.current : cameraRef.current;
    
    renderer.setRenderTarget(fullRT);
    renderer.clear();
    renderer.render(scene, activeCamera);

    const tempMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: fullRT.texture },
        uBrightness: { value: brightnessRef.current },
        uFlattenMode: { value: materialScreen.uniforms.uFlattenMode.value },
        uFlattenAmount: { value: flattenAmountRef.current },
        uAntiAlias: { value: antiAliasRef.current },
        uEdgeDetection: { value: edgeDetectionRef.current },
        uEdgeThickness: { value: edgeThicknessRef.current },
        uResolution: { value: new THREE.Vector2(canvasWidth, canvasHeight) },
        uPixelMode: { value: true },
        uPixelSize: { value: canvasSize / workingResolution },
        uShowGrid: { value: false },
        uShowExportArea: { value: false },
        uExportResolution: { value: workingResolution },
        // AGREGAR ESTA LÍNEA:
        uBackgroundColor: { value: new THREE.Color().setHex(parseInt(backgroundColorRef.current.replace('#', '0x'))) },
      },
      vertexShader: materialScreen.vertexShader,
      fragmentShader: materialScreen.fragmentShader,
      depthWrite: false,
    });

    const processedRT = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });

    const dummyScene = new THREE.Scene();
    const dummyCamera = new THREE.OrthographicCamera(
      canvasWidth / -2, 
      canvasWidth / 2, 
      canvasHeight / 2, 
      canvasHeight / -2, 
      -10000, 
      10000
    );
    dummyCamera.position.z = 1;

    const quadGeo = new THREE.PlaneGeometry(canvasWidth, canvasHeight);
    const quad = new THREE.Mesh(quadGeo, tempMaterial);
    quad.position.z = -100;
    dummyScene.add(quad);

    renderer.setRenderTarget(processedRT);
    renderer.clear();
    renderer.render(dummyScene, dummyCamera);

    const fullPixels = new Uint8Array(canvasWidth * canvasHeight * 4);
    renderer.readRenderTargetPixels(processedRT, 0, 0, canvasWidth, canvasHeight, fullPixels);

    const finalRT = new THREE.WebGLRenderTarget(workingResolution, workingResolution, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });

    const extractedPixels = new Uint8Array(exportSize * exportSize * 4);
    
    for (let y = 0; y < exportSize; y++) {
      for (let x = 0; x < exportSize; x++) {
        const srcX = exportStartX + x;
        const srcY = exportStartY + y;
        
        if (srcX >= 0 && srcX < canvasWidth && srcY >= 0 && srcY < canvasHeight) {
          const srcIndex = (srcY * canvasWidth + srcX) * 4;
          const dstIndex = (y * exportSize + x) * 4;
          
          extractedPixels[dstIndex] = fullPixels[srcIndex];
          extractedPixels[dstIndex + 1] = fullPixels[srcIndex + 1];
          extractedPixels[dstIndex + 2] = fullPixels[srcIndex + 2];
          extractedPixels[dstIndex + 3] = fullPixels[srcIndex + 3];
        }
      }
    }

    const pixelDataForEditor = [];
    const pixelSize = exportSize / workingResolution;
    
    for (let py = 0; py < workingResolution; py++) {
      for (let px = 0; px < workingResolution; px++) {
        const srcX = Math.floor(px * pixelSize);
        const srcY = Math.floor(py * pixelSize);
        
        if (srcX < exportSize && srcY < exportSize) {
          const index = (srcY * exportSize + srcX) * 4;
          const r = extractedPixels[index];
          const g = extractedPixels[index + 1];
          const b = extractedPixels[index + 2];
          const a = extractedPixels[index + 3];
          
          if (a > 10) {
            pixelDataForEditor.push({
              x: px,
              y: py,
              color: {
                r: Math.max(0, Math.min(255, Math.floor(r || 0))),
                g: Math.max(0, Math.min(255, Math.floor(g || 0))),
                b: Math.max(0, Math.min(255, Math.floor(b || 0))),
                a: Math.max(0, Math.min(255, Math.floor(a || 0)))
              }
            });
          }
        }
      }
    }

    fullRT.dispose();
    processedRT.dispose();
    finalRT.dispose();
    tempMaterial.dispose();
    quadGeo.dispose();
    dummyScene.remove(quad);
    renderer.setRenderTarget(null);

    console.log(`✅ Pixel data exportado del área cuadrada: ${workingResolution}×${workingResolution} (${pixelDataForEditor.length} píxeles)`);

    if (onPixelDataReady && pixelDataForEditor.length > 0) {
      onPixelDataReady(pixelDataForEditor);
    } else if (pixelDataForEditor.length === 0) {
      console.warn('⚠️ No se encontraron píxeles visibles en el área de exportación');
      alert('⚠️ El modelo no generó píxeles visibles en el área de exportación. Ajusta la posición, zoom o área de captura.');
    }
    
    return pixelDataForEditor;
  };

  // Agregar esta nueva función después de exportPixelData y antes del return:

// Función updateCanvasWithPixelData (agregar antes de animate)
const updateCanvasWithPixelData = () => {
  if (!pixelModeRef.current || !modelRef.current || !rendererRef.current) {
    return;
  }

  const renderer = rendererRef.current;
  const scene = sceneRef.current;
  const materialScreen = materialScreenRef.current;
  const workingResolution = resolutionRef.current;
  
  const currentSize = renderer.getSize(new THREE.Vector2());
  const canvasWidth = currentSize.x;
  const canvasHeight = currentSize.y;
  
  const canvasSize = Math.min(canvasWidth, canvasHeight);
  const exportStartX = Math.floor((canvasWidth - canvasSize) / 2);
  const exportStartY = Math.floor((canvasHeight - canvasSize) / 2);
  const exportSize = canvasSize;
  
  // Crear render target temporal
  const tempRT = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });

  const activeCamera = orthographicRef.current ? orthoCameraRef.current : cameraRef.current;
  
  // Renderizar escena actual al render target temporal
  const originalTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(tempRT);
  renderer.clear();
  renderer.render(scene, activeCamera);

  // Crear material temporal para procesar efectos
  const tempMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: tempRT.texture },
      uBrightness: { value: brightnessRef.current },
      uFlattenMode: { value: materialScreen.uniforms.uFlattenMode.value },
      uFlattenAmount: { value: flattenAmountRef.current },
      uAntiAlias: { value: antiAliasRef.current },
      uEdgeDetection: { value: edgeDetectionRef.current },
      uEdgeThickness: { value: edgeThicknessRef.current },
      uResolution: { value: new THREE.Vector2(canvasWidth, canvasHeight) },
      uPixelMode: { value: true },
      uPixelSize: { value: canvasSize / workingResolution },
      uShowGrid: { value: false },
      uShowExportArea: { value: false },
      uExportResolution: { value: workingResolution },
      uBackgroundColor: { value: new THREE.Color().setHex(parseInt(backgroundColorRef.current.replace('#', '0x'))) },
    },
    vertexShader: materialScreen.vertexShader,
    fragmentShader: materialScreen.fragmentShader,
    depthWrite: false,
  });

  const processedRT = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });

  // Crear escena temporal para aplicar efectos
  const dummyScene = new THREE.Scene();
  const dummyCamera = new THREE.OrthographicCamera(
    canvasWidth / -2, 
    canvasWidth / 2, 
    canvasHeight / 2, 
    canvasHeight / -2, 
    -10000, 
    10000
  );
  dummyCamera.position.z = 1;

  const quadGeo = new THREE.PlaneGeometry(canvasWidth, canvasHeight);
  const quad = new THREE.Mesh(quadGeo, tempMaterial);
  quad.position.z = -100;
  dummyScene.add(quad);

  // Renderizar con efectos aplicados
  renderer.setRenderTarget(processedRT);
  renderer.clear();
  renderer.render(dummyScene, dummyCamera);

  // Leer píxeles del render target
  const fullPixels = new Uint8Array(canvasWidth * canvasHeight * 4);
  renderer.readRenderTargetPixels(processedRT, 0, 0, canvasWidth, canvasHeight, fullPixels);

  // Extraer área cuadrada
  const extractedPixels = new Uint8Array(exportSize * exportSize * 4);
  
  for (let y = 0; y < exportSize; y++) {
    for (let x = 0; x < exportSize; x++) {
      const srcX = exportStartX + x;
      const srcY = exportStartY + y;
      
      if (srcX >= 0 && srcX < canvasWidth && srcY >= 0 && srcY < canvasHeight) {
        const srcIndex = (srcY * canvasWidth + srcX) * 4;
        const dstIndex = (y * exportSize + x) * 4;
        
        extractedPixels[dstIndex] = fullPixels[srcIndex];
        extractedPixels[dstIndex + 1] = fullPixels[srcIndex + 1];
        extractedPixels[dstIndex + 2] = fullPixels[srcIndex + 2];
        extractedPixels[dstIndex + 3] = fullPixels[srcIndex + 3];
      }
    }
  }

  // Actualizar canvas HTML
  const canvas = pixelCanvasRef.current;
  if (canvas) {
    // Calcular tamaño del canvas basado en el tamaño de la pantalla
    const screenSize = Math.min(window.innerWidth, window.innerHeight);
    const canvasDisplaySize = Math.min(Math.max(window.innerHeight * 1, 200), 800);
    
    // Configurar tamaño de renderizado y display
    canvas.width = workingResolution;
    canvas.height = workingResolution;
    canvas.style.width = canvasDisplaySize + 'px';
    canvas.style.height = canvasDisplaySize + 'px';
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const imageData = ctx.createImageData(workingResolution, workingResolution);
    
    const pixelSize = exportSize / workingResolution;
    
    for (let py = 0; py < workingResolution; py++) {
      for (let px = 0; px < workingResolution; px++) {
        const srcX = Math.floor(px * pixelSize);
        // Corregir inversión vertical
        const srcY = Math.floor((workingResolution - 1 - py) * pixelSize);
        
        if (srcX < exportSize && srcY < exportSize) {
          const srcIndex = (srcY * exportSize + srcX) * 4;
          const dstIndex = (py * workingResolution + px) * 4;
          
          imageData.data[dstIndex] = extractedPixels[srcIndex];
          imageData.data[dstIndex + 1] = extractedPixels[srcIndex + 1];
          imageData.data[dstIndex + 2] = extractedPixels[srcIndex + 2];
          imageData.data[dstIndex + 3] = extractedPixels[srcIndex + 3];
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  // Limpiar recursos temporales
  tempRT.dispose();
  processedRT.dispose();
  tempMaterial.dispose();
  quadGeo.dispose();
  dummyScene.remove(quad);
  renderer.setRenderTarget(originalTarget);
};

  return (
    <div className="three-container">
      <div className="controls">
        <div className="control-group">
          <label className="control-label">Archivo GLB/GLTF:</label>
          <input 
            type="file" 
            accept=".glb,.gltf" 
            onChange={handleFileChange}
            className="control-input"
          />
        </div>

        {/* ✅ CONTROLES DE ANIMACIÓN */}
        {hasAnimations && (
          <>
            <div className="control-group">
              <label className="control-label">🎬 Animaciones disponibles:</label>
              <select 
                value={currentAnimation} 
                onChange={(e) => changeAnimation(parseInt(e.target.value))}
                className="control-input"
                disabled={animationPlaying}
              >
                {availableAnimations.map((name, index) => (
                  <option key={index} value={index}>{name}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <button 
                onClick={toggleAnimation}
                className="download-button"
                style={{background: animationPlaying ? '#f44336' : '#4CAF50'}}
              >
                {animationPlaying ? '⏸️ Pausar' : '▶️ Reproducir'} Animación
              </button>
            </div>

            <div className="control-group">
              <label className="control-label">Velocidad: {animationSpeed.toFixed(1)}x</label>
              <input 
                type="range" 
                min="0.1" 
                max="3.0" 
                step="0.1" 
                value={animationSpeed} 
                onChange={(e) => updateAnimationSpeed(parseFloat(e.target.value))}
                className="control-range"
              />
            </div>
          </>
        )}

        <div className="control-group">
          <label className="control-label">Brillo: {brightness.toFixed(2)}</label>
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.01" 
            value={brightness} 
            onChange={(e) => setBrightness(parseFloat(e.target.value))}
            className="control-range"
          />
        </div>

        <div className="control-group">
          <label className="control-label">
            <input 
              type="checkbox" 
              checked={orthographic} 
              onChange={(e) => setOrthographic(e.target.checked)}
              className="control-checkbox"
            />
            Cámara Ortográfica (sin perspectiva)
          </label>
        </div>

        <div className="control-group">
          <label className="control-label">Efectos de Color:</label>
          <select 
            value={colorMode} 
            onChange={(e) => setColorMode(e.target.value)}
            className="control-input"
          >
            <option value="none">Sin efectos</option>
            <option value="poster">Colores planos (Poster)</option>
            <option value="toon">Estilo Toon</option>
            <option value="contrast">Alto contraste</option>
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">Aplanamiento Geométrico:</label>
          <select 
            value={flattenMode} 
            onChange={(e) => setFlattenMode(e.target.value)}
            className="control-input"
          >
            <option value="none">Sin aplanamiento</option>
            <option value="flatten-z">Aplanar profundidad (Z)</option>
            <option value="flatten-y">Aplanar altura (Y)</option>
            <option value="flatten-x">Aplanar ancho (X)</option>
          </select>
        </div>

        {flattenMode.includes('flatten-') && (
          <div className="control-group">
            <label className="control-label">Intensidad: {flattenAmount.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={flattenAmount} 
              onChange={(e) => setFlattenAmount(parseFloat(e.target.value))}
              className="control-range"
            />
          </div>
        )}

        <div className="control-group">
          <label className="control-label">
            <input 
              type="checkbox" 
              checked={antiAlias} 
              onChange={(e) => setAntiAlias(e.target.checked)}
              className="control-checkbox"
            />
            Anti-Aliasing (quitar blur)
          </label>
        </div>

        <div className="control-group">
          <label className="control-label">
            <input 
              type="checkbox" 
              checked={edgeDetection} 
              onChange={(e) => setEdgeDetection(e.target.checked)}
              className="control-checkbox"
            />
            Contorno exterior
          </label>
        </div>

        {edgeDetection && (
          <div className="control-group">
            <label className="control-label">Grosor de bordes: {edgeThickness.toFixed(1)}</label>
            <input 
              type="range" 
              min="0.5" 
              max="3.0" 
              step="0.1" 
              value={edgeThickness} 
              onChange={(e) => setEdgeThickness(parseFloat(e.target.value))}
              className="control-range"
            />
          </div>
        )}

        <div className="control-group">
          <label className="control-label">
            <input 
              type="checkbox" 
              checked={pixelMode} 
              onChange={(e) => setPixelMode(e.target.checked)}
              className="control-checkbox"
            />
            Modo Pixelado
          </label>
        </div>
        <div className="control-group">
  <label className="control-label">Color de fondo:</label>
  <input 
    type="color" 
    value={backgroundColor} 
    onChange={(e) => setBackgroundColor(e.target.value)}
    className="control-input"
    style={{height: '40px', width: '100%'}}
  />
</div>

        <div className="control-group">
          <button 
            onClick={downloadImage}
            className="download-button"
          >
            📥 Descargar Imagen Actual
          </button>
        </div>

        <div className="control-group">
          <button 
            onClick={downloadHighRes}
            className="download-button download-button-highres"
          >
            🎨 Descargar Alta Resolución
          </button>
        </div>

        {pixelMode && (
          <>
            <div className="control-group">
              <label className="control-label">Resolución de trabajo:</label>
              <select 
                value={resolution} 
                onChange={(e) => setResolution(parseInt(e.target.value))}
                className="control-input"
              >
                <option value={16}>16×16 píxeles</option>
                <option value={32}>32×32 píxeles</option>
                <option value={64}>64×64 píxeles</option>
                <option value={128}>128×128 píxeles</option>
                <option value={256}>256×256 píxeles</option>
              </select>
            </div>

            <div className="control-group">
              <label className="control-label">
                <input 
                  type="checkbox" 
                  checked={showPixelGrid} 
                  onChange={(e) => setShowPixelGrid(e.target.checked)}
                  className="control-checkbox"
                />
                Mostrar grid de píxeles
              </label>
            </div>

            <div className="control-group">
              <label className="control-label">
                <input 
                  type="checkbox" 
                  checked={showExportArea} 
                  onChange={(e) => setShowExportArea(e.target.checked)}
                  className="control-checkbox"
                />
                Mostrar área de exportación
              </label>
            </div>
          </>
        )}

        <div className="control-group">
          <button 
            onClick={exportPixelData}
            className="download-button"
            style={{background: '#9C27B0'}}
          >
            🎨 Exportar al Editor ({resolution}×{resolution})
          </button>
        </div>
      </div>

      <div ref={containerRef} className="three-canvas-container" style={{
  display: pixelMode ? 'none' : 'block'
}} />

{pixelMode && (
  <canvas
    ref={pixelCanvasRef}
    className="threejs-pixelcanvas">
  </canvas>
)}
    </div>
  );
}