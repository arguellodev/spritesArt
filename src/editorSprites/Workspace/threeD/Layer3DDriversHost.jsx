// Host invisible que monta un driver por cada capa 3D activa. Cada driver
// llama use3DLayer(), que se suscribe a cambios de metadata + frame y
// re-renderiza el modelo al canvas2D de la capa.
//
// Por qué un host: hooks no se pueden llamar dinámicamente en bucles. Un
// componente por capa permite que React maneje montaje/desmontaje.

import React from "react";
import { use3DLayer } from "./use3DLayer";

const Layer3DDriver = ({
  layerId,
  metadata,
  currentFrame,
  totalFrames,
  width,
  height,
  getCanvas,
  onAfterRender,
}) => {
  use3DLayer({
    layerId,
    metadata,
    currentFrame,
    totalFrames,
    width,
    height,
    getCanvas,
    onAfterRender,
  });
  return null;
};

const Layer3DDriversHost = ({
  layers,
  getLayerThreeD,
  currentFrame,
  totalFrames,
  width,
  height,
  getCanvasForLayer,
  onAfterRender,
}) => {
  const layers3D = (layers || []).filter((l) => l.type === "3d");
  if (layers3D.length === 0) return null;
  return (
    <>
      {layers3D.map((l) => (
        <Layer3DDriver
          key={l.id}
          layerId={l.id}
          metadata={getLayerThreeD ? getLayerThreeD(l.id) : null}
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          width={width}
          height={height}
          getCanvas={() => getCanvasForLayer && getCanvasForLayer(l.id)}
          onAfterRender={onAfterRender}
        />
      ))}
    </>
  );
};

export default Layer3DDriversHost;
