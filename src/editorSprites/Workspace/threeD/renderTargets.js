// Helpers para crear los WebGLRenderTargets que usa el pipeline 3D.
// Compartidos por el visor modal y el renderer singleton de capas 3D.

import * as THREE from "three";

// RT principal: RGBA + DepthTexture (24 bits) + colorSpace sRGB.
// El depth se lee en el fragment shader para detectar la silueta exterior.
export function makeMainRT(w, h) {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType),
  });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  return rt;
}

// RT de normales: la escena se re-renderiza con MeshNormalMaterial como
// overrideMaterial → cada píxel guarda (nx, ny, nz) en view-space encoded
// como rgb [0,1]. El shader decodifica con `rgb * 2.0 - 1.0`.
export function makeNormalRT(w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
  });
}
