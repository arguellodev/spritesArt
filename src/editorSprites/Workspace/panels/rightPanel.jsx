"use no memo";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuChevronDown } from "react-icons/lu";
import "./rightPanel.css";

const STORAGE_KEY = "pixcalli.rightPanel.v2";

const MODULOS = [
  { id: "viewportNavigator", titulo: "Navegador" },
  { id: "layerColor", titulo: "Color" },
  { id: "playAnimation", titulo: "Animación" },
];

function cargarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function guardarEstado(estado) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {
    // ignorar quota exceeded / privado
  }
}

// RightPanel: barra derecha tradicional con dos niveles de colapsado.
//  - Todo el panel: 300px expandido ↔ 40px colapsado (muestra tira vertical
//    con botones por módulo para re-expandir apuntando a ese módulo).
//  - Cada módulo: sección con header clickable que oculta/muestra su cuerpo.
// El estado persiste en localStorage por key `pixcalli.rightPanel.v2`.
export function RightPanel({ paneles }) {
  const [expandido, setExpandido] = useState(() => {
    const saved = cargarEstado();
    return saved && typeof saved.expandido === "boolean" ? saved.expandido : true;
  });
  const [secciones, setSecciones] = useState(() => {
    const saved = cargarEstado();
    const base = { viewportNavigator: true, layerColor: true, playAnimation: true };
    return saved && saved.secciones ? { ...base, ...saved.secciones } : base;
  });

  const montadoRef = useRef(false);
  useEffect(() => {
    if (!montadoRef.current) {
      montadoRef.current = true;
      return;
    }
    guardarEstado({ expandido, secciones });
  }, [expandido, secciones]);

  const toggleSeccion = useCallback((id) => {
    setSecciones((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const abrirYExpandir = useCallback((id) => {
    setExpandido(true);
    setSecciones((s) => ({ ...s, [id]: true }));
  }, []);

  if (!expandido) {
    return (
      <aside className="pc-right-panel pc-right-panel-collapsed" aria-label="Panel derecho colapsado">
        <button
          type="button"
          className="pc-rp-toggle pc-rp-toggle-expand"
          onClick={() => setExpandido(true)}
          title="Expandir panel"
          aria-label="Expandir panel"
          aria-expanded={false}
        >
          <LuChevronLeft size={16} />
        </button>
        <div className="pc-rp-quick-icons">
          {MODULOS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="pc-rp-quick-btn"
              onClick={() => abrirYExpandir(m.id)}
              title={`Abrir ${m.titulo}`}
              aria-label={`Abrir ${m.titulo}`}
            >
              {m.titulo}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="pc-right-panel" aria-label="Panel derecho">
      <div className="pc-rp-header">
        <span className="pc-rp-header-title">Paneles</span>
        <button
          type="button"
          className="pc-rp-toggle"
          onClick={() => setExpandido(false)}
          title="Colapsar panel"
          aria-label="Colapsar panel"
          aria-expanded={true}
        >
          <LuChevronRight size={16} />
        </button>
      </div>
      <div className="pc-rp-sections">
        {MODULOS.map((m) => {
          const abierto = !!secciones[m.id];
          const contenido = paneles[m.id];
          if (!contenido) return null;
          const bodyId = `pc-rp-body-${m.id}`;
          return (
            <section
              key={m.id}
              className={`pc-rp-section ${abierto ? "is-open" : "is-closed"}`}
            >
              <button
                type="button"
                className="pc-rp-section-header"
                onClick={() => toggleSeccion(m.id)}
                aria-expanded={abierto}
                aria-controls={bodyId}
              >
                <span className="pc-rp-section-title">{m.titulo}</span>
                <LuChevronDown
                  size={14}
                  className={`pc-rp-chevron ${abierto ? "is-open" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {abierto && (
                <div id={bodyId} className="pc-rp-section-body">
                  {contenido}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
