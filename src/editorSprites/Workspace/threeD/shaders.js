// Shaders + factory de ShaderMaterial usados por el visor 3D modal y por el
// renderer singleton de capas 3D. Una sola fuente de verdad para que ambos
// caminos produzcan exactamente el mismo look.
//
// Pipeline: scene → rtMain (RGBA + depth) + scene-con-MeshNormalMaterial →
// rtNormal. El fragment shader samplea ambos y aplica:
//   1. Pixel-snap UV (uPixelMode/uPixelSize) — usado por la ruta de export.
//   2. Brillo, modos de color (poster/toon/contrast).
//   3. Detección de bordes depth+normal (KodyJKing/hello-threejs adaptado).
//   4. Overlay opcional de área de exportación.
//   5. Fondo sólido o transparente cuando texel.a < 0.1.

import * as THREE from "three";

export const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
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
  uniform float uBackgroundAlpha;
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
  // (GLSL ES 1.00 no permite globales no-const inicializadas desde uniforms,
  // así que el offset se calcula dentro de cada helper.)

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
  // original que solo detectaba bordes en ciertas direcciones.
  // 0 = normales idénticas; 1 = perpendiculares u opuestas.
  float neighborNormalEdgeIndicator(int x, int y, float depth, vec3 normal) {
    vec3 nbNormal = getNormal(x, y);
    float angleDiff = 1.0 - clamp(dot(normal, nbNormal), 0.0, 1.0);
    float angleIndicator = smoothstep(
      uNormalEdgeThreshold * 0.5,
      uNormalEdgeThreshold,
      angleDiff
    );
    if (uDetectOccluded) {
      return angleIndicator;
    }
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
      // Fondo: usa uBackgroundAlpha. El visor modal lo deja en 1.0 (siempre
      // sólido). Las capas 3D lo dejan en 0.0 para integrarse con otras capas
      // — el resultado es transparente donde no hay modelo.
      vec3 bgColor = uBackgroundColor;
      bgColor = getExportAreaOverlay(vUv, bgColor);
      gl_FragColor = vec4(bgColor, uBackgroundAlpha);
    } else {
      gl_FragColor = vec4(color, texel.a);
    }
  }
`;

// Factory: construye un ShaderMaterial con uniforms iniciales razonables.
// El caller asignará texturas (tDiffuse/tDepth/tNormal) y mutará uniforms
// según necesite.
export function createScreenShaderMaterial({
  rtTexture = null,
  depthTexture = null,
  normalTexture = null,
  resolution = { x: 1, y: 1 },
  rtResolution = { x: 1, y: 1 },
  backgroundColor = 0x000000,
  backgroundAlpha = 1.0,
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: rtTexture },
      tDepth: { value: depthTexture },
      tNormal: { value: normalTexture },
      uBrightness: { value: 1.0 },
      uFlattenMode: { value: 0 },
      uFlattenAmount: { value: 0.5 },
      uAntiAlias: { value: false },
      uOutlineEnabled: { value: true },
      uDepthEdgeStrength: { value: 0.7 },
      uNormalEdgeStrength: { value: 0.5 },
      uDepthEdgeColor: { value: new THREE.Color(0x000000) },
      uNormalEdgeColor: { value: new THREE.Color(0x000000) },
      uNormalEdgeThreshold: { value: 0.15 },
      uDetectOccluded: { value: true },
      uResolution: { value: new THREE.Vector2(resolution.x, resolution.y) },
      uRtResolution: { value: new THREE.Vector2(rtResolution.x, rtResolution.y) },
      uPixelMode: { value: false },
      uPixelSize: { value: 1.0 },
      uShowGrid: { value: false },
      uShowExportArea: { value: false },
      uExportResolution: { value: 64 },
      uBackgroundColor: { value: new THREE.Color(backgroundColor) },
      uBackgroundAlpha: { value: backgroundAlpha },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    depthWrite: false,
  });
}
