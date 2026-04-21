"use no memo";

import LayerColor from "../../../../customTool/layerColor";

// Builder — la memoización vive en el padre (workspaceContainer.jsx via
// useMemo). Este archivo solo construye el JSX de LayerColor con las props
// recibidas; el panel derecho (RightPanel) envuelve el resultado en una
// sección colapsable.
export function renderLayerColor(props) {
  return <LayerColor {...props} />;
}
