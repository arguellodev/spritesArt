// Hook por capa 3D. Detecta cambios en metadata y dispara re-render
// debounced del modelo al canvas2D de la capa.
//
// Modelo de uso (Fase 3 MVP):
//
//   const ctx = use3DLayer({
//     layerId,
//     metadata: getLayerThreeD(layerId),  // de useLayerManager
//     currentFrame,
//     totalFrames,
//     getCanvas: () => frames[currentFrame].canvases[layerId],
//     onAfterRender: () => triggerComposite(),
//   });
//
// El componente debe llamar a este hook por cada capa 3D que sea visible.
// En Fase 4 se ergonomiza: un solo punto de entrada en workspaceContainer
// itera sobre las capas 3D visibles.

import { useEffect, useRef } from "react";
import { acquireRenderer, releaseRenderer } from "./ThreeDLayerRenderer";

export function use3DLayer({
  layerId,
  metadata,
  currentFrame,
  totalFrames,
  getCanvas,
  width,
  height,
  onAfterRender,
}) {
  // Renderer compartido — se acquireea una vez por capa montada.
  const rendererRef = useRef(null);
  useEffect(() => {
    rendererRef.current = acquireRenderer();
    return () => {
      releaseRenderer();
      rendererRef.current = null;
    };
  }, []);

  // Re-render cuando cambia metadata/frame. Debounce para no machacar la GPU
  // mientras el usuario arrastra un slider; 50ms es imperceptible.
  const renderTimeoutRef = useRef(null);
  const lastRenderHashRef = useRef("");
  useEffect(() => {
    if (!metadata?.asset?.sha1) return;
    if (!getCanvas || !width || !height) return;

    const renderer = rendererRef.current;
    if (!renderer) return;

    // Hash de la entrada para evitar renders idénticos (ej. cambio de frame
    // sin overrides → mismas settings → mismo resultado).
    const override = metadata.frameOverrides?.[currentFrame] || {};
    const hash = JSON.stringify({
      sha1: metadata.asset.sha1,
      base: metadata.base,
      override,
      currentFrame,
      totalFrames,
      width,
      height,
    });
    if (hash === lastRenderHashRef.current) return;

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      const canvas = getCanvas();
      if (!canvas) return;
      try {
        renderer.renderToCanvas(
          canvas,
          metadata.asset.sha1,
          metadata.base,
          override,
          width,
          height,
          { frameIndex: currentFrame, totalFrames }
        );
        lastRenderHashRef.current = hash;
        if (onAfterRender) onAfterRender();
      } catch (err) {
        console.error("[use3DLayer] render error:", err);
      }
    }, 50);

    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata, currentFrame, totalFrames, width, height, layerId]);
}
