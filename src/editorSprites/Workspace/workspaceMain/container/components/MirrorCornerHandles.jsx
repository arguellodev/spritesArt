import { GrTopCorner, GrBottomCorner } from "react-icons/gr";

// Handles arrastrables de las esquinas (superior-izquierda e inferior-derecha)
// que definen el rectángulo del "custom area" del modo espejo. Los refs de
// puntero que consumen estos handles viven en el padre — aquí solo los
// conectamos al DOM y aplicamos el styling según `leftIsPressedMirror` /
// `rightIsPressedMirror`.
export default function MirrorCornerHandles({
  mirrorState,
  leftMirrorCornerRef,
  rightMirrorCornerRef,
  positionCorners,
  viewportOffset,
  zoom,
  leftIsPressedMirror,
  rightIsPressedMirror,
}) {
  return (
    <div style={{ display: mirrorState.customArea ? "block" : "none" }}>
      <div
        ref={leftMirrorCornerRef}
        className="canvas-resize-handle-container"
        style={{
          position: "absolute",
          top: (positionCorners.y1 - viewportOffset.y) * zoom - 15,
          left: (positionCorners.x1 - viewportOffset.x) * zoom - 15,
          zIndex: 15,
          pointerEvents: "auto",
          cursor: leftIsPressedMirror ? "grabbing" : "grab",
        }}
      >
        <div className="resize-handle-wrapper">
          <button
            className={`resize-handle resize-handle-nw ${
              leftIsPressedMirror ? "dragging" : ""
            }`}
            style={{
              backgroundColor: leftIsPressedMirror ? "#ff4444" : "#4444ff",
              transform: leftIsPressedMirror ? "scale(1.2)" : "scale(1)",
              transition: "all 0.1s ease",
            }}
          >
            <span className="resize-handle-icon">
              <GrTopCorner />
            </span>
          </button>
          <p className="area-canvas-size-text">
            {Math.abs(mirrorState.bounds.x2 - mirrorState.bounds.x1)}x
            {Math.abs(mirrorState.bounds.y2 - mirrorState.bounds.y1)}
          </p>
        </div>
      </div>

      <div
        ref={rightMirrorCornerRef}
        className="canvas-resize-handle-container"
        style={{
          position: "absolute",
          top: (positionCorners.y2 - viewportOffset.y) * zoom - 15,
          left: (positionCorners.x2 - viewportOffset.x) * zoom - 15,
          zIndex: 15,
          pointerEvents: "auto",
          cursor: rightIsPressedMirror ? "grabbing" : "grab",
        }}
      >
        <div className="resize-handle-wrapper">
          <button
            className={`resize-handle resize-handle-se ${
              rightIsPressedMirror ? "dragging" : ""
            }`}
            style={{
              backgroundColor: rightIsPressedMirror ? "#ff4444" : "#4444ff",
              transform: rightIsPressedMirror ? "scale(1.2)" : "scale(1)",
              transition: "all 0.1s ease",
            }}
          >
            <span className="resize-handle-icon">
              <GrBottomCorner />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
