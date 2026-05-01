// Singleton que renderiza capas 3D al canvas 2D de la capa.
// Una sola instancia compartida entre TODAS las capas 3D del proyecto —
// los navegadores limitan ~16 contextos WebGL por documento, así que crear
// uno por capa explotaría con 20+ capas. Compartiendo, una sola instancia
// sirve a N capas iterativamente.
//
// Cycle: lazy. Se crea cuando la primera capa 3D pide renderizar. Se mantiene
// vivo mientras haya capas 3D en el proyecto. Se libera con dispose() cuando
// el último consumidor se desuscribe (refcount).
//
// Cache de modelos: por sha1 del GLB. Dos capas con el mismo modelo comparten
// la geometría/materiales en GPU. El refcount permite saber cuándo liberarla.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { makeMainRT, makeNormalRT } from "./renderTargets";
import { createScreenShaderMaterial } from "./shaders";
import { fitCamerasToObject } from "./cameraFit";
import { flattenGeometry, resetGeometry } from "./geometry";

// ---- Hashing helpers ----
// SHA-1 sobre el ArrayBuffer del archivo. Web Crypto está disponible en
// todos los browsers que soportan WebGL2. Un GLB pesado (50MB) se hashea
// en ~200ms — aceptable para una operación que se hace una vez por carga.
async function sha1OfBuffer(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Singleton ----
let instance = null;
let refCount = 0;

class ThreeDLayerRenderer {
  constructor() {
    // OffscreenCanvas si está disponible, fallback a un canvas DOM hidden.
    // Tres.js soporta ambos. OffscreenCanvas evita un nodo extra en el DOM.
    this.canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(1, 1)
        : document.createElement("canvas");

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // Pixel art queremos NEAREST puro.
      alpha: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.autoClear = false;

    // Environment map para que materiales PBR se vean bien sin necesidad de
    // configurar luces complicadas por capa.
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();
    this.envTexture = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.normalMaterial = new THREE.MeshNormalMaterial();
    this.gltfLoader = new GLTFLoader();

    // Material de post-process compartido — sus uniforms se actualizan por
    // capa en cada renderToCanvas. Es seguro porque renderToCanvas es
    // sincrónico (sin gaps donde otra capa modifique uniforms a mitad).
    this.shaderMaterial = createScreenShaderMaterial();
    this.dummyScene = new THREE.Scene();
    this.dummyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10000, 10000);
    this.dummyCamera.position.z = 1;
    this.dummyQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2), // tamaño dummy, lo recreamos por render
      this.shaderMaterial
    );
    this.dummyQuad.position.z = -100;
    this.dummyScene.add(this.dummyQuad);

    // RTs reutilizables. Se redimensionan on-demand si la resolución cambia.
    this._rtSize = { w: 0, h: 0 };
    this.rtMain = null;
    this.rtNormal = null;

    // Cache de modelos: sha1 → { gltf, refs: number }
    this.modelCache = new Map();

    // Scene template global — un único Scene reutilizado: limpia children
    // antes de cada render y añade modelo + luces.
    this.scene = new THREE.Scene();
    this.scene.environment = this.envTexture;
    // Luces fijas (mismo setup que el visor modal).
    this._setupLights();

    // Cámaras reutilizables. Se mutan posición/proyección por capa.
    this.cameraPersp = new THREE.PerspectiveCamera(80, 1, 0.01, 10000);
    this.cameraOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10000);
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(5, 10, 7.5);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-5, -3, 2);
    this.scene.add(fill);
    const back = new THREE.DirectionalLight(0xffffff, 0.4);
    back.position.set(0, 3, -5);
    this.scene.add(back);
    this._modelGroup = new THREE.Group();
    this.scene.add(this._modelGroup);
  }

  _ensureRTs(w, h) {
    if (this._rtSize.w === w && this._rtSize.h === h && this.rtMain && this.rtNormal) {
      return;
    }
    if (this.rtMain) this.rtMain.dispose();
    if (this.rtNormal) this.rtNormal.dispose();
    this.rtMain = makeMainRT(w, h);
    this.rtNormal = makeNormalRT(w, h);
    this._rtSize = { w, h };
    this.shaderMaterial.uniforms.tDiffuse.value = this.rtMain.texture;
    this.shaderMaterial.uniforms.tDepth.value = this.rtMain.depthTexture;
    this.shaderMaterial.uniforms.tNormal.value = this.rtNormal.texture;
  }

  // -------- Carga de modelos --------

  /**
   * Carga un GLB desde un File del input file picker. Devuelve sha1 + gltf.
   * Idempotente: si ese sha1 ya está cacheado, reusa la instancia y aumenta
   * el refcount.
   */
  async loadModelFromFile(file) {
    const buffer = await file.arrayBuffer();
    const sha1 = await sha1OfBuffer(buffer);
    return this._parseAndCache(sha1, buffer, file.name);
  }

  /**
   * Carga desde un ArrayBuffer ya en memoria (ej. al restaurar un proyecto).
   */
  async loadModelFromBuffer(buffer, filename, knownSha1 = null) {
    const sha1 = knownSha1 || (await sha1OfBuffer(buffer));
    return this._parseAndCache(sha1, buffer, filename);
  }

  async _parseAndCache(sha1, buffer, filename) {
    const cached = this.modelCache.get(sha1);
    if (cached) {
      cached.refs += 1;
      return { sha1, filename, gltf: cached.gltf, animations: cached.animations };
    }
    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(
        buffer,
        "",
        (gltf) => {
          this.modelCache.set(sha1, { gltf, animations: gltf.animations || [], refs: 1 });
          resolve({ sha1, filename, gltf, animations: gltf.animations || [] });
        },
        (err) => reject(err)
      );
    });
  }

  /** Decrementa refs; si llega a 0, libera memoria GPU del modelo. */
  releaseModel(sha1) {
    const entry = this.modelCache.get(sha1);
    if (!entry) return;
    entry.refs -= 1;
    if (entry.refs <= 0) {
      // Dispose recursivo de geometrías y materiales.
      entry.gltf.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this.modelCache.delete(sha1);
    }
  }

  // -------- Render --------

  /**
   * Renderiza una capa 3D al canvas2D destino con la metadata dada.
   * El canvas se ajusta a (width, height) si difiere — corresponde a las
   * dimensiones del proyecto.
   *
   * @param {HTMLCanvasElement} outCanvas - canvas de la capa (ya existe en frames[N].canvases[layerId])
   * @param {string} sha1 - hash del modelo cacheado
   * @param {ThreeDLayerBase} base - metadata global de la capa
   * @param {ThreeDFrameOverride} override - overrides de este frame (puede ser {})
   * @param {number} width - ancho del canvas
   * @param {number} height - alto del canvas
   * @param {{ frameIndex: number, totalFrames: number }} timing - para autoTimeline
   */
  renderToCanvas(outCanvas, sha1, base, override, width, height, timing) {
    const entry = this.modelCache.get(sha1);
    if (!entry) {
      // Sin modelo cargado — limpiar el canvas para que no muestre stale.
      const ctx = outCanvas.getContext("2d");
      ctx.clearRect(0, 0, outCanvas.width, outCanvas.height);
      return;
    }

    // Tamaño del RT = canvas / renderScale (look pixelado). Mínimo 4×4 para
    // evitar RTs degenerados.
    const div = Math.max(1, base.renderScale || 1);
    const rtW = Math.max(4, Math.round(width / div));
    const rtH = Math.max(4, Math.round(height / div));
    this._ensureRTs(rtW, rtH);
    this.renderer.setSize(width, height, false);

    // Limpiar y poblar la scene con el modelo de esta capa.
    this._modelGroup.clear();
    const modelClone = entry.gltf.scene; // No clonar — los uniforms del shader son los que cambian.
    this._modelGroup.add(modelClone);

    // Aplicar transformaciones del override.
    const rotation = override?.rotation || [0, 0, 0];
    modelClone.rotation.set(rotation[0], rotation[1], rotation[2]);

    // Aplicar aplanamiento geométrico si aplica.
    if (base.flattenMode && base.flattenMode !== "none") {
      flattenGeometry(modelClone, base.flattenMode, base.flattenAmount || 0);
    } else {
      resetGeometry(modelClone);
    }

    // Animation pose: si hay clip y autoTimeline, mapear frameIndex → time.
    if (base.animation?.clipIndex >= 0 && entry.animations.length > 0) {
      const clip = entry.animations[base.animation.clipIndex];
      if (clip) {
        let time;
        if (override?.animationTime != null) {
          time = override.animationTime;
        } else if (base.animation.autoTimeline && timing && timing.totalFrames > 1) {
          const t = (timing.frameIndex - 1) / (timing.totalFrames - 1);
          time = t * clip.duration * (base.animation.speed || 1);
        } else {
          time = 0;
        }
        // Aplicar pose evaluando el clip directo (sin mixer.update — más
        // determinístico para snapshots por frame).
        const mixer = new THREE.AnimationMixer(modelClone);
        const action = mixer.clipAction(clip);
        action.play();
        mixer.setTime(time);
      }
    }

    // Cámara: por simplicidad de Fase 3, perspective con auto-fit en cada
    // render (overhead pequeño porque Box3 sobre la misma geometría es <1ms).
    // Fase 4 añade controles de cámara persistentes.
    const camera = this.cameraPersp;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitCamerasToObject(modelClone, {
      perspective: camera,
      viewportSize: { width, height },
    });

    // Pase 1: scene → rtMain (RGBA + depth).
    this.renderer.setRenderTarget(this.rtMain);
    this.renderer.clear();
    this.renderer.render(this.scene, camera);

    // Pase 2: scene con MeshNormalMaterial → rtNormal (sólo si outline).
    if (base.outline?.enabled) {
      const prev = this.scene.overrideMaterial;
      this.scene.overrideMaterial = this.normalMaterial;
      this.renderer.setRenderTarget(this.rtNormal);
      this.renderer.clear();
      this.renderer.render(this.scene, camera);
      this.scene.overrideMaterial = prev;
    }

    // Configurar uniforms del post-process según la metadata de la capa.
    const u = this.shaderMaterial.uniforms;
    u.uBrightness.value = base.brightness || 1.0;
    u.uFlattenMode.value =
      { none: 0, poster: 1, toon: 2, contrast: 3 }[base.colorMode || "none"] || 0;
    u.uFlattenAmount.value = base.flattenAmount || 0;
    u.uAntiAlias.value = !!base.antiAlias;
    u.uOutlineEnabled.value = !!base.outline?.enabled;
    u.uDepthEdgeStrength.value = base.outline?.depthStrength ?? 0.7;
    u.uNormalEdgeStrength.value = base.outline?.normalStrength ?? 0.5;
    u.uDepthEdgeColor.value.set(base.outline?.depthColor || "#000000");
    u.uNormalEdgeColor.value.set(base.outline?.normalColor || "#000000");
    u.uNormalEdgeThreshold.value = base.outline?.normalThreshold ?? 0.15;
    u.uDetectOccluded.value = !!base.outline?.detectOccluded;
    u.uResolution.value.set(width, height);
    u.uRtResolution.value.set(rtW, rtH);
    u.uPixelMode.value = false;
    u.uPixelSize.value = 1.0;
    u.uShowGrid.value = false;
    u.uShowExportArea.value = false;
    // Las capas 3D usan fondo transparente para integrarse con otras capas.
    u.uBackgroundColor.value.set(0x000000);
    u.uBackgroundAlpha.value = 0.0;

    // Resize quad geometry si las dimensiones cambiaron (raro, pero pasa al
    // cambiar el tamaño del proyecto).
    if (
      this.dummyQuad.geometry.parameters.width !== width ||
      this.dummyQuad.geometry.parameters.height !== height
    ) {
      this.dummyQuad.geometry.dispose();
      this.dummyQuad.geometry = new THREE.PlaneGeometry(width, height);
    }
    this.dummyCamera.left = -width / 2;
    this.dummyCamera.right = width / 2;
    this.dummyCamera.top = height / 2;
    this.dummyCamera.bottom = -height / 2;
    this.dummyCamera.updateProjectionMatrix();

    // Pase 3: post-process → RT temporal del tamaño del canvas, luego copiar
    // al canvas2D de la capa via readPixels.
    const finalRT = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });
    this.renderer.setRenderTarget(finalRT);
    this.renderer.clear();
    this.renderer.render(this.dummyScene, this.dummyCamera);

    const pixels = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(finalRT, 0, 0, width, height, pixels);

    // Copiar al canvas2D de la capa con flip vertical (GL → screen coords).
    if (outCanvas.width !== width) outCanvas.width = width;
    if (outCanvas.height !== height) outCanvas.height = height;
    const ctx = outCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const imageData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width * 4;
      const dstRow = y * width * 4;
      imageData.data.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow);
    }
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(imageData, 0, 0);

    finalRT.dispose();
    this.renderer.setRenderTarget(null);
  }

  // -------- Cleanup --------

  dispose() {
    if (this.rtMain) this.rtMain.dispose();
    if (this.rtNormal) this.rtNormal.dispose();
    this.shaderMaterial.dispose();
    this.dummyQuad.geometry.dispose();
    this.normalMaterial.dispose();
    this.envTexture.dispose();
    this.pmrem.dispose();
    // Liberar todos los modelos cacheados.
    for (const sha1 of Array.from(this.modelCache.keys())) {
      const entry = this.modelCache.get(sha1);
      if (entry) {
        entry.gltf.scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      }
    }
    this.modelCache.clear();
    this.renderer.dispose();
  }
}

// ---- API pública ----

export function acquireRenderer() {
  if (!instance) {
    instance = new ThreeDLayerRenderer();
  }
  refCount += 1;
  return instance;
}

export function releaseRenderer() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && instance) {
    instance.dispose();
    instance = null;
  }
}

export function getRendererIfAlive() {
  return instance;
}
