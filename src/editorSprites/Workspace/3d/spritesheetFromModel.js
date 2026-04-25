// spritesheetFromModel.js — genera un sprite-sheet N-direccional desde un modelo 3D.
//
// Pipeline:
//   1. Cargar modelo (GLB/GLTF) — se delega al consumidor, que pasa un `THREE.Object3D`.
//   2. Para cada ángulo discreto (8 direcciones clásicas o N custom) renderizar
//      el modelo a un canvas offscreen de tamaño `tileWidth × tileHeight`.
//   3. Aplicar:
//        - down-sampling nearest (para look pixel-art)
//        - cuantización a la paleta seleccionada (usa color/indexedMode.js)
//   4. Devolver un arreglo de canvases (uno por ángulo), más un atlas compacto.
//
// Nota: este módulo depende de three.js (ya presente como dep). La carga del
// modelo se hace afuera; este módulo solo renderiza.

import * as THREE from 'three';
import { convertRgbToIndexed, convertIndexedToRgb } from '../color/indexedMode';

/**
 * @param {object} opts
 * @param {THREE.Object3D} opts.model        Modelo 3D ya cargado.
 * @param {number} [opts.directions=8]       Cantidad de ángulos equiespaciados.
 * @param {number} [opts.tileWidth=64]       Ancho del sprite final.
 * @param {number} [opts.tileHeight=64]      Alto del sprite final.
 * @param {number} [opts.superSample=2]      Render a tileW*ss × tileH*ss y reducir
 *                                            para calidad (evitando aliasing duro).
 * @param {Array<{r,g,b,a?}>} [opts.palette] Paleta para cuantizar (opcional).
 * @param {'none'|'bayer'|'floydSteinberg'} [opts.dither='bayer']
 * @param {number} [opts.cameraY=1.2]        Altura de la cámara sobre el modelo.
 * @param {number} [opts.cameraDistance=4]   Distancia de la cámara al centro del modelo.
 * @returns {{canvases: HTMLCanvasElement[], atlas: HTMLCanvasElement}}
 */
export function renderSpritesheetFromModel({
  model,
  directions = 8,
  tileWidth = 64,
  tileHeight = 64,
  superSample = 2,
  palette,
  dither = 'bayer',
  cameraY = 1.2,
  cameraDistance = 4,
  backgroundColor = null,
}) {
  const renderW = tileWidth * superSample;
  const renderH = tileHeight * superSample;

  // Escena aislada: una vez por call, con el modelo clonado para no mutar el original.
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 5, 2);
  scene.add(dir);
  const modelInstance = model.clone(true);
  scene.add(modelInstance);

  const camera = new THREE.PerspectiveCamera(35, renderW / renderH, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: backgroundColor === null,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(renderW, renderH);
  if (backgroundColor !== null) renderer.setClearColor(backgroundColor, 1);
  else renderer.setClearColor(0x000000, 0);

  // Calcular centro del modelo
  const bbox = new THREE.Box3().setFromObject(modelInstance);
  const center = bbox.getCenter(new THREE.Vector3());

  const canvases = [];
  for (let i = 0; i < directions; i++) {
    const angle = (i / directions) * Math.PI * 2;
    camera.position.set(
      center.x + Math.cos(angle) * cameraDistance,
      center.y + cameraY,
      center.z + Math.sin(angle) * cameraDistance
    );
    camera.lookAt(center);
    renderer.render(scene, camera);

    // Leer resultado
    const fullCanvas = renderer.domElement;
    // Escalar a tileWidth × tileHeight con nearest.
    const tile = document.createElement('canvas');
    tile.width = tileWidth;
    tile.height = tileHeight;
    const ctx = tile.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fullCanvas, 0, 0, renderW, renderH, 0, 0, tileWidth, tileHeight);

    // Cuantizar a paleta si se pidió.
    if (palette?.length) {
      const imageData = ctx.getImageData(0, 0, tileWidth, tileHeight);
      const indexed = convertRgbToIndexed(imageData, palette, { dither, ditherStrength: 0.5 });
      const back = convertIndexedToRgb(indexed, palette);
      ctx.putImageData(back, 0, 0);
    }
    canvases.push(tile);
  }

  renderer.dispose();

  // Atlas
  const atlas = document.createElement('canvas');
  atlas.width = tileWidth * directions;
  atlas.height = tileHeight;
  const atlasCtx = atlas.getContext('2d');
  atlasCtx.imageSmoothingEnabled = false;
  canvases.forEach((c, i) => atlasCtx.drawImage(c, i * tileWidth, 0));

  return { canvases, atlas };
}
