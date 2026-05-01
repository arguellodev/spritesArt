import { useEffect, useRef } from "react";
import { usePointer } from "../../../hooks/hooks";
import {
  calculateRotationAngle,
  getRotationHandlerPosition,
} from "../utils/geometry";

// Círculo y handle para rotar una selección arrastrando el punto de control.
// Se extrajo desde `workspaceContainer.jsx` como componente real para que el
// `usePointer` interno no viole las reglas de hooks (la versión original se
// declaraba como función dentro del render del padre).
//
// El componente es totalmente presentacional: recibe el estado y los setters
// necesarios del padre, y publica las actualizaciones de ángulo vía
// `setRotationAngleSelection` / `setIsRotationHandlerActive`.
export default function RotationCircle({
  croppedSelectionBounds,
  selectionActive,
  selectedPixels,
  artboardRef,
  viewportOffset,
  zoom,
  dragOffset,
  rotationHandlerRadius,
  rotationAngleSelection,
  setRotationAngleSelection,
  setIsRotationHandlerActive,
  isRotationHandlerActive,
}) {
  const localRotationHandlerRef = useRef(null);

  const {
    isPressed: isRotationHandlerPressed,
    relativeToTarget: rotationHandlerRelative,
  } = usePointer(localRotationHandlerRef, artboardRef, [], {
    endPressOnLeave: false,
    preventContextMenu: true,
  });

  useEffect(() => {
    if (
      !isRotationHandlerPressed ||
      !rotationHandlerRelative.x ||
      !rotationHandlerRelative.y
    ) {
      return;
    }
    if (!croppedSelectionBounds) return;

    const selectionCenterX =
      (croppedSelectionBounds.x +
        croppedSelectionBounds.width / 2 +
        dragOffset.x -
        viewportOffset.x) *
      zoom;
    const selectionCenterY =
      (croppedSelectionBounds.y +
        croppedSelectionBounds.height / 2 +
        dragOffset.y -
        viewportOffset.y) *
      zoom;

    const newAngle = calculateRotationAngle(
      rotationHandlerRelative.x,
      rotationHandlerRelative.y,
      selectionCenterX,
      selectionCenterY
    );

    setRotationAngleSelection(newAngle);
    setIsRotationHandlerActive(true);
  }, [
    isRotationHandlerPressed,
    rotationHandlerRelative,
    croppedSelectionBounds,
    dragOffset,
    viewportOffset,
    zoom,
    setRotationAngleSelection,
    setIsRotationHandlerActive,
  ]);

  useEffect(() => {
    if (!isRotationHandlerPressed) {
      setIsRotationHandlerActive(false);
    }
  }, [isRotationHandlerPressed, setIsRotationHandlerActive]);

  if (
    !croppedSelectionBounds ||
    !selectionActive ||
    selectedPixels.length < 2
  ) {
    return null;
  }

  const centerX =
    (croppedSelectionBounds.x +
      croppedSelectionBounds.width / 2 +
      dragOffset.x -
      viewportOffset.x) *
    zoom;
  const centerY =
    (croppedSelectionBounds.y +
      croppedSelectionBounds.height / 2 +
      dragOffset.y -
      viewportOffset.y) *
    zoom;

  const handlePos = getRotationHandlerPosition({
    croppedSelectionBounds,
    dragOffset,
    rotationAngleSelection,
    rotationHandlerRadius,
    zoom,
  });
  const handleScreenX = (handlePos.x - viewportOffset.x) * zoom;
  const handleScreenY = (handlePos.y - viewportOffset.y) * zoom;

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: centerY - rotationHandlerRadius,
          left: centerX - rotationHandlerRadius,
          width: rotationHandlerRadius * 2,
          height: rotationHandlerRadius * 2,
          border: `2px dashed ${isRotationHandlerActive ? "#ff6b35" : "#4a90e2"}`,
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 12,
          opacity: 0.7,
        }}
      />

      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 11,
        }}
      >
        <line
          x1={centerX}
          y1={centerY}
          x2={handleScreenX}
          y2={handleScreenY}
          stroke={isRotationHandlerActive ? "#ff6b35" : "#4a90e2"}
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.7"
        />
      </svg>

      <div
        ref={localRotationHandlerRef}
        style={{
          position: "absolute",
          top: handleScreenY - 8,
          left: handleScreenX - 8,
          width: 16,
          height: 16,
          backgroundColor: isRotationHandlerPressed ? "#ff6b35" : "#4a90e2",
          border: "2px solid white",
          borderRadius: "50%",
          cursor: isRotationHandlerPressed ? "grabbing" : "grab",
          zIndex: 13,
          pointerEvents: "auto",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          transform: isRotationHandlerPressed ? "scale(1.2)" : "scale(1)",
          transition: "all 0.1s ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: centerY - 80,
          left: centerX - 30,
          width: 60,
          height: 20,
          backgroundColor: "rgba(0,0,0,0.8)",
          color: "white",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontFamily: "monospace",
          pointerEvents: "none",
          zIndex: 14,
          opacity: isRotationHandlerActive ? 1 : 0.7,
        }}
      >
        {rotationAngleSelection}°
      </div>
    </>
  );
}
