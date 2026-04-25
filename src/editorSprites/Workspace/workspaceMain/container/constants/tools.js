"use no memo";

// Definición de las herramientas disponibles en el editor.
// Esta es la tabla de referencia completa usada por `workspaceContainer.jsx`
// para despachar el comportamiento del puntero según la herramienta activa.
//
// Coexiste con `src/editorSprites/Workspace/customTool/toolsMap.jsx`, que es
// un mapa legacy mínimo (solo pencil + eraser). Ver `tools.md` para el detalle.

export const TOOLS = {
  paint: "pencil",
  paint2: "pencil2",
  pencilPerfect: "pencilPerfect",
  eyeDropper: "eyeDropper",
  erase: "eraser",
  select: "select",
  lassoSelect: "lassoSelect",
  move: "move",
  fill: "fill",
  line: "line",
  curve: "curve",
  square: "square",
  triangle: "triangle",
  circle: "circle",
  ellipse: "ellipse",
  polygon: "polygon",
  polygonPencil: "polygonPencil",
  light: "light",
  dark: "dark",
  selectByColor: "selectByColor",
  blurFinger: "blurFinger",
  smudge: "smudge",
  deblur: "deblur",
  // Herramientas añadidas por el plan ambicioso (Sprint 2+).
  // La integración al pointer pipeline se implementa consultando:
  //   - maskFromMagicWand  (selection/selectionMask.js)
  //   - combineMasks       (selection/selectionOps.js) para Shift/Alt/Shift+Alt
  //   - tileTool branch    (tilemap/tilemapLayer.js::paintTile) cuando haya layer tilemap activa
  magicWand: "magicWand",
  tile: "tile",
  text: "text",
};

export default TOOLS;
