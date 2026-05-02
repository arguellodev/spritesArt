"use no memo";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuChevronDown, LuLayoutPanelLeft, LuX } from "react-icons/lu";
import { useViewport } from "../hooks/useViewport";
import "./rightPanel.css";

const STORAGE_KEY = "pixcalli.rightPanel.v2";
// La anchura del panel se persiste aparte porque la modifica el módulo de
// color (LayerColor) mediante drag, y debe leerse incluso si el módulo no se
// monta (caso panel colapsado o sección de color cerrada).
const WIDTH_STORAGE_KEY = "pixcalli.rightPanel.width";

function cargarAncho() {
  try {
    const v = parseInt(localStorage.getItem(WIDTH_STORAGE_KEY), 10);
    if (!Number.isFinite(v)) return null;
    if (v < 280 || v > 720) return null;
    return v;
  } catch {
    return null;
  }
}

// Títulos humanos por id. Si un panel no tiene título aquí, se usa el id mismo.
const TITLES = {
  viewportNavigator: "Navegador",
  layerColor: "Color",
  playAnimation: "Animación",
  history: "Historia",
  tags: "Tags de animación",
  keybindings: "Atajos",
  tileset: "Tileset",
  slices: "Slices",
  references: "Referencias",
  magicWand: "Varita Mágica",
  stabilizer: "Estabilizador de trazo",
  palette: "Paletas",
};

// Orden fijo para los módulos conocidos; paneles nuevos se añaden al final.
const KNOWN_ORDER = [
  "viewportNavigator",
  "layerColor",
  "playAnimation",
  "stabilizer",
  "magicWand",
  "history",
  "tags",
  "keybindings",
  "tileset",
  "slices",
  "references",
  "palette",
];

function buildModulos(paneles) {
  const ids = Object.keys(paneles || {});
  // Conservar el orden KNOWN_ORDER + agregar desconocidos al final.
  const sorted = [
    ...KNOWN_ORDER.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !KNOWN_ORDER.includes(id)),
  ];
  return sorted.map((id) => ({ id, titulo: TITLES[id] ?? id }));
}

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
  const MODULOS = buildModulos(paneles);
  const vp = useViewport();
  const isMobile = vp.isMobileL;

  const [expandido, setExpandido] = useState(() => {
    const saved = cargarEstado();
    // En mobile el default es CERRADO (no queremos que el drawer tape el
    // editor al cargar). En desktop preserva la preferencia guardada.
    if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches) {
      return false;
    }
    return saved && typeof saved.expandido === "boolean" ? saved.expandido : true;
  });
  const [secciones, setSecciones] = useState(() => {
    const saved = cargarEstado();
    // Default: paneles "core" abiertos; nuevos cerrados por defecto para no saturar la UI.
    const defaultsOpen = {
      viewportNavigator: true,
      layerColor: true,
      playAnimation: true,
      history: false,
      tags: false,
      keybindings: false,
      tileset: false,
      palette: false,
    };
    return saved && saved.secciones ? { ...defaultsOpen, ...saved.secciones } : defaultsOpen;
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

  // Anchura persistida (modificada por LayerColor mediante drag). Aplicada como
  // inline style para que sobreescriba el `width: 300px` del CSS sin romper
  // el comportamiento por defecto cuando no hay valor guardado.
  const anchoPersistido = cargarAncho();
  const styleAncho =
    anchoPersistido && expandido ? { width: `${anchoPersistido}px` } : undefined;

  // En mobile el panel es un bottom-sheet flotante. Cuando esta cerrado, en
  // vez de mostrar la tira lateral del desktop, mostramos un FAB en la
  // esquina inferior derecha para abrirlo. Esto deja la viewport entera
  // libre para el editor mientras no se necesite el panel.
  if (!expandido) {
    if (isMobile) {
      return (
        <button
          type="button"
          className="pc-rp-fab"
          onClick={() => setExpandido(true)}
          title="Abrir paneles"
          aria-label="Abrir paneles"
          aria-expanded={false}
        >
          <LuLayoutPanelLeft size={20} />
        </button>
      );
    }
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
    <>
      {/* Backdrop solo en mobile cuando el drawer esta abierto: cubre el
          editor para que el tap fuera del panel lo cierre. CSS lo oculta
          en desktop (display: none arriba de 768px). */}
      {isMobile && (
        <div
          className="pc-rp-backdrop"
          onClick={() => setExpandido(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`pc-right-panel ${isMobile ? "pc-right-panel-mobile" : ""}`}
        aria-label="Panel derecho"
        style={isMobile ? undefined : styleAncho}
        role={isMobile ? "dialog" : undefined}
        aria-modal={isMobile ? "true" : undefined}
      >
        {/* Drag handle visual en mobile (no funcional, solo affordance):
            indica al usuario que el panel se puede arrastrar para cerrar. */}
        {isMobile && <div className="pc-rp-drag-handle" aria-hidden="true" />}
        <div className="pc-rp-header">
          <span className="pc-rp-header-title">Paneles</span>
          <button
            type="button"
            className="pc-rp-toggle"
            onClick={() => setExpandido(false)}
            title={isMobile ? "Cerrar" : "Colapsar panel"}
            aria-label={isMobile ? "Cerrar" : "Colapsar panel"}
            aria-expanded={true}
          >
            {isMobile ? <LuX size={18} /> : <LuChevronRight size={16} />}
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
    </>
  );
}
