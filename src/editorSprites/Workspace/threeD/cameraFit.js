// Auto-fit de cámara — patrón estándar de three.js examples. Sin esto, los
// GLBs en escalas muy distintas (0.01m vs 100m) quedan invisibles (fuera de
// near/far o cámara dentro de la geometría).
//
// Centra el modelo en el origen, calcula la distancia para que su bounding
// box ocupe ~1.5× su altura visible, y ajusta near/far proporcionalmente.

import * as THREE from "three";

/**
 * @param {THREE.Object3D} object - el modelo a encuadrar (se mutará posición)
 * @param {object} opts
 * @param {THREE.PerspectiveCamera} opts.perspective - cámara perspectiva (mutada)
 * @param {THREE.OrthographicCamera} [opts.ortho] - cámara ortográfica opcional (mutada)
 * @param {{ width: number, height: number }} opts.viewportSize - canvas size
 * @param {THREE.OrbitControls} [opts.controls] - controls perspective (target reset)
 * @param {THREE.OrbitControls} [opts.orthoControls] - controls ortho (target reset)
 * @param {number} [opts.margin=1.5] - factor de margen (1.5 = el modelo ocupa 2/3)
 */
export function fitCamerasToObject(object, opts) {
  const {
    perspective,
    ortho,
    viewportSize,
    controls,
    orthoControls,
    margin = 1.5,
  } = opts;

  const box = new THREE.Box3().setFromObject(object);
  if (!isFinite(box.min.x) || box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // Centra el modelo en el origen mundial.
  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim <= 0) return;

  // Cámara perspectiva: distancia = (maxDim/2) / tan(fov/2) * margen.
  const fovRad = (perspective.fov * Math.PI) / 180;
  const distance = ((maxDim / 2) / Math.tan(fovRad / 2)) * margin;
  perspective.position.set(0, 0, distance);
  perspective.near = Math.max(0.01, distance / 1000);
  perspective.far = distance * 100;
  perspective.updateProjectionMatrix();

  // Cámara ortográfica: half-extents al maxDim con margen menor (0.75)
  // porque la ortho no tiene perspectiva — el modelo ocupa más en pantalla.
  if (ortho) {
    const half = maxDim * 0.75;
    const aspect = (viewportSize?.width || 1) / (viewportSize?.height || 1);
    ortho.left = -half * aspect;
    ortho.right = half * aspect;
    ortho.top = half;
    ortho.bottom = -half;
    ortho.position.set(0, 0, distance);
    ortho.near = Math.max(0.01, distance / 1000);
    ortho.far = distance * 100;
    ortho.updateProjectionMatrix();
  }

  // Resetear targets de OrbitControls al origen (donde quedó centrado).
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
  if (orthoControls) {
    orthoControls.target.set(0, 0, 0);
    orthoControls.update();
  }
}
