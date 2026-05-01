import {
  LuEraser,
  LuPaintBucket,
  LuPointerOff,
  LuGroup,
} from "react-icons/lu";
import {
  MdOutlineRotate90DegreesCcw,
  MdOutlineRotate90DegreesCw,
} from "react-icons/md";

// Menú flotante de acciones para una selección activa (rotar, borrar,
// rellenar, deseleccionar, agrupar, desagrupar, duplicar, copiar,
// cortar y aislar). Es puramente presentacional: recibe el estado
// necesario para posicionarse y las callbacks para cada acción.
export default function SelectionActionsMenu({
  croppedSelectionBounds,
  selectionActive,
  isPressed,
  isRotationHandlerContainerPressed,
  selectedPixels,
  selectionActionsRef,
  dragOffset,
  viewportOffset,
  zoom,
  handleRotation,
  deleteSelection,
  fillSelection,
  clearCurrentSelection,
  groupSelection,
  ungroupSelection,
  duplicateSelection,
  copySelection,
  cutSelection,
  isolateSelection,
}) {
  if (
    !croppedSelectionBounds ||
    !selectionActive ||
    isPressed ||
    isRotationHandlerContainerPressed ||
    selectedPixels.length === 0
  ) {
    return null;
  }

  return (
    <div
      ref={selectionActionsRef}
      className="workspace-selection-actions"
      style={{
        position: "absolute",
        top:
          (croppedSelectionBounds.y + dragOffset.y - viewportOffset.y) * zoom,
        left:
          (croppedSelectionBounds.x +
            croppedSelectionBounds.width +
            dragOffset.x -
            viewportOffset.x) *
          zoom,
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      <div className="selection-actions-buttons">
        <button
          className="action-button"
          onClick={() => handleRotation("left")}
        >
          <span className="icon">
            <MdOutlineRotate90DegreesCcw />
          </span>
          <p className="action-text"></p>
        </button>
        <button
          className="action-button"
          onClick={() => handleRotation("right")}
        >
          <span className="icon">
            <MdOutlineRotate90DegreesCw />
          </span>
          <p className="action-text"></p>
        </button>
        <button className="action-button" onClick={deleteSelection}>
          <span className="icon">
            <LuEraser />
          </span>
          <p className="action-text">Borrar</p>
        </button>
        <button className="action-button" onClick={fillSelection}>
          <span className="icon">
            <LuPaintBucket />
          </span>
          <p className="action-text">Rellenar</p>
        </button>
        <button className="action-button" onClick={clearCurrentSelection}>
          <span className="icon">
            <LuPointerOff />
          </span>
          <p className="action-text">Deseleccionar</p>
        </button>
        <button className="action-button" onClick={groupSelection}>
          <span className="icon">
            <LuGroup />
          </span>
          <p className="action-text">Agrupar</p>
        </button>
        <button className="action-button" onClick={ungroupSelection}>
          <span className="icon">
            <LuGroup />
          </span>
          <p className="action-text">Desagrupar</p>
        </button>
        <button className="action-button" onClick={duplicateSelection}>
          <span className="icon">D</span>
          <p className="action-text">Duplicar </p>
        </button>
        <button className="action-button" onClick={copySelection}>
          <span className="icon">c</span>
          <p className="action-text">Copiar </p>
        </button>
        <button className="action-button" onClick={cutSelection}>
          <span className="icon">cu</span>
          <p className="action-text">Cortar </p>
        </button>
        <button className="action-button" onClick={isolateSelection}>
          <span className="icon">I</span>
          <p className="action-text">Aislar pixeles </p>
        </button>
      </div>
    </div>
  );
}
