"use no memo";

import { usePanelesLayout } from "./panelContext";

// Renderiza dentro del .right-panel solo los paneles cuyo modo === "docked" y
// que estén visibles. Recibe un diccionario { [panelId]: reactNode } con el
// JSX de cada panel (ya envuelto en PanelFrame) y el orden del dock.
// Si no hay paneles docked, muestra una tira angosta con accesos rápidos para
// re-anclarlos o reactivarlos.
export function RightPanelDock({ paneles }) {
  const { paneles: estado, ordenDock, setModo, toggleVisible } = usePanelesLayout();

  const visiblesDocked = ordenDock.filter((id) => {
    const p = estado[id];
    return p && p.modo === "docked" && p.visible;
  });

  const fueraDeDock = ordenDock.filter((id) => {
    const p = estado[id];
    if (!p) return false;
    return p.modo !== "docked" || !p.visible;
  });

  if (visiblesDocked.length === 0) {
    return (
      <div className="right-panel right-panel-colapsado">
        <div className="pc-dock-colapsado">
          {fueraDeDock.map((id) => (
            <button
              key={id}
              type="button"
              className="pc-dock-colapsado-btn"
              title={`Re-anclar ${estado[id].titulo}`}
              onClick={() => {
                setModo(id, "docked");
                if (!estado[id].visible) toggleVisible(id);
              }}
            >
              {estado[id].titulo}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="right-panel" style={{ padding: 10 }}>
      {visiblesDocked.map((id) => (
        <div key={id} className="pc-dock-slot">
          {paneles[id]}
        </div>
      ))}
    </div>
  );
}
