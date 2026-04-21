"use no memo";

import ViewportNavigator from "../../../viewportNavigator";

export function renderViewportNavigator({
  totalWidth,
  totalHeight,
  viewportWidth,
  viewportHeight,
  viewportOffset,
  zoom,
  moveViewport,
  handleZoomChange,
  compositeCanvasRef,
  getFullCanvas,
}) {
  return (
    <ViewportNavigator
      totalWidth={totalWidth}
      totalHeight={totalHeight}
      viewportWidth={viewportWidth}
      viewportHeight={viewportHeight}
      viewportOffset={viewportOffset}
      zoom={zoom}
      onViewportMove={moveViewport}
      onZoomChange={handleZoomChange}
      compositeCanvasRef={compositeCanvasRef}
      getFullCanvas={getFullCanvas}
    />
  );
}
