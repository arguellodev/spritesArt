// Panel lateral derecho que muestra los logs capturados por el logger.
// Vive como columna fija sobre la UI principal, a la izquierda del panel
// derecho de paneles. Se colapsa a una franja delgada (~40px) para liberar
// espacio del canvas sin perder acceso a "expandir y ver progreso".

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  LuChevronRight, LuChevronLeft, LuTrash2, LuCopy, LuSearch,
  LuArrowDownToLine, LuTerminal, LuFilter,
} from "react-icons/lu";
import { useDevConsole } from "./useDevConsole";
import { clearLogs } from "./logger";
import "./DevConsolePanel.css";

const STORAGE = {
  collapsed: "pixcalli.devConsole.collapsed",
  filter: "pixcalli.devConsole.filter",
  autoScroll: "pixcalli.devConsole.autoScroll",
};

const FILTERS = [
  { id: "all", label: "Todo" },
  { id: "app", label: "Solo app" },
  { id: "errwarn", label: "Errores y warnings" },
  { id: "error", label: "Solo errores" },
];

// Cuántos chars antes de truncar y ofrecer "Mostrar más".
const TRUNCATE_AT = 180;

function readBool(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch { /* sin storage */ }
  return fallback;
}
function writeBool(key, value) {
  try { localStorage.setItem(key, value ? "1" : "0"); } catch { /* */ }
}

function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function matchesFilter(entry, filterId) {
  if (filterId === "all") return true;
  if (filterId === "app") return entry.source === "app";
  if (filterId === "errwarn") return entry.level === "error" || entry.level === "warn";
  if (filterId === "error") return entry.level === "error";
  return true;
}

const DevConsolePanel = () => {
  const { logs } = useDevConsole();

  // ---- UI state (persistente) ----
  const [collapsed, setCollapsed] = useState(() => readBool(STORAGE.collapsed, false));
  const [filter, setFilter] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE.filter);
      if (v && FILTERS.some((f) => f.id === v)) return v;
    } catch { /* */ }
    return "all";
  });
  const [autoScroll, setAutoScroll] = useState(() => readBool(STORAGE.autoScroll, true));

  // ---- UI state (no persistente) ----
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Persistencia
  useEffect(() => { writeBool(STORAGE.collapsed, collapsed); }, [collapsed]);
  useEffect(() => { writeBool(STORAGE.autoScroll, autoScroll); }, [autoScroll]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE.filter, filter); } catch { /* */ }
  }, [filter]);

  // ---- Filtrado derivado ----
  const visibleLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((e) => {
      if (!matchesFilter(e, filter)) return false;
      if (q && !e.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, filter, search]);

  // ---- Auto-scroll ----
  const listRef = useRef(null);
  useEffect(() => {
    if (!autoScroll) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleLogs.length, autoScroll, collapsed]);

  // ---- Copy / clear ----
  const handleCopy = useCallback(() => {
    const text = visibleLogs
      .map((e) => `[${formatTime(e.ts)}] ${e.level.toUpperCase()} ${e.source}: ${e.text}`)
      .join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => { /* permiso denegado */ });
    } else {
      // Fallback para contextos sin Clipboard API.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { /* */ }
    }
  }, [visibleLogs]);

  const handleClear = useCallback(() => {
    clearLogs();
    setExpandedIds(new Set());
  }, []);

  const toggleExpanded = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Cerrar menú de filtro al hacer click fuera.
  useEffect(() => {
    if (!filterMenuOpen) return;
    const onDoc = (e) => {
      if (!e.target.closest?.(".devc-filter-wrap")) setFilterMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [filterMenuOpen]);

  const filterLabel = FILTERS.find((f) => f.id === filter)?.label ?? "Todo";

  // ---- Portal a document.body ----
  // .complete-canvas-tracker (ancestor del mount) tiene animation con
  // translateZ que crea un containing block, atrapando position:fixed.
  // createPortal a body escapa de ese contexto. Mismo patrón que el
  // popover de onion-skin (commit b39b0d8).
  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  // ---- Render: modo colapsado ----
  if (collapsed) {
    const errorCount = logs.filter((e) => e.level === "error").length;
    const warnCount = logs.filter((e) => e.level === "warn").length;
    return createPortal(
      <aside
        className="devc devc-collapsed"
        aria-label="Consola (colapsada)"
      >
        <button
          type="button"
          className="devc-collapsed-btn"
          onClick={() => setCollapsed(false)}
          title="Expandir consola"
          aria-label="Expandir consola"
          aria-expanded="false"
        >
          <LuTerminal size={18} aria-hidden="true" />
          <span className="devc-collapsed-label">Consola</span>
          {(errorCount > 0 || warnCount > 0) && (
            <span className="devc-collapsed-badge" aria-label={`${errorCount} errores, ${warnCount} warnings`}>
              {errorCount > 0 && <span className="devc-badge devc-badge-error">{errorCount}</span>}
              {warnCount > 0 && <span className="devc-badge devc-badge-warn">{warnCount}</span>}
            </span>
          )}
          <LuChevronLeft size={14} className="devc-collapsed-arrow" aria-hidden="true" />
        </button>
      </aside>,
      portalTarget
    );
  }

  // ---- Render: modo expandido ----
  return createPortal(
    <aside className="devc devc-expanded" aria-label="Consola">
      <header className="devc-header">
        <div className="devc-header-row devc-header-title-row">
          <span className="devc-title">
            <LuTerminal size={14} aria-hidden="true" /> Consola
          </span>
          <span className="devc-count" title={`${visibleLogs.length} de ${logs.length} entradas`}>
            {visibleLogs.length}/{logs.length}
          </span>
          <button
            type="button"
            className="devc-icon-btn"
            onClick={() => setCollapsed(true)}
            title="Colapsar consola"
            aria-label="Colapsar consola"
          >
            <LuChevronRight size={16} />
          </button>
        </div>

        <div className="devc-header-row devc-controls-row">
          <div className="devc-filter-wrap">
            <button
              type="button"
              className="devc-filter-btn"
              onClick={() => setFilterMenuOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={filterMenuOpen}
              title="Filtrar por tipo"
            >
              <LuFilter size={13} aria-hidden="true" />
              <span>{filterLabel}</span>
            </button>
            {filterMenuOpen && (
              <ul className="devc-filter-menu" role="listbox">
                {FILTERS.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={filter === f.id}
                      className={`devc-filter-opt ${filter === f.id ? "is-active" : ""}`}
                      onClick={() => { setFilter(f.id); setFilterMenuOpen(false); }}
                    >
                      {f.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="devc-search-wrap">
            <LuSearch size={13} className="devc-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="devc-search-input"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar en logs"
            />
          </div>
        </div>

        <div className="devc-header-row devc-actions-row">
          <button
            type="button"
            className={`devc-icon-btn ${autoScroll ? "is-active" : ""}`}
            onClick={() => setAutoScroll((v) => !v)}
            title={autoScroll ? "Auto-scroll activo (clic para pausar)" : "Auto-scroll pausado"}
            aria-pressed={autoScroll}
            aria-label="Alternar auto-scroll"
          >
            <LuArrowDownToLine size={15} />
          </button>
          <button
            type="button"
            className="devc-icon-btn"
            onClick={handleCopy}
            title="Copiar logs visibles"
            aria-label="Copiar logs visibles"
          >
            <LuCopy size={15} />
          </button>
          <button
            type="button"
            className="devc-icon-btn devc-icon-btn-danger"
            onClick={handleClear}
            title="Limpiar consola"
            aria-label="Limpiar consola"
          >
            <LuTrash2 size={15} />
          </button>
        </div>
      </header>

      <div className="devc-list" ref={listRef} role="log" aria-live="polite" aria-relevant="additions">
        {visibleLogs.length === 0 && (
          <div className="devc-empty">
            {logs.length === 0 ? "Sin entradas todavía." : "Ningún log coincide con el filtro."}
          </div>
        )}
        {visibleLogs.map((entry) => {
          const isLong = entry.text.length > TRUNCATE_AT;
          const expanded = expandedIds.has(entry.id);
          const display = !isLong || expanded
            ? entry.text
            : entry.text.slice(0, TRUNCATE_AT) + "…";
          return (
            <div
              key={entry.id}
              className={`devc-entry devc-level-${entry.level} devc-source-${entry.source}`}
            >
              <span className="devc-entry-time" title={new Date(entry.ts).toLocaleString()}>
                {formatTime(entry.ts)}
              </span>
              <span className={`devc-entry-tag devc-tag-${entry.level}`}>
                {entry.level}
              </span>
              {entry.source !== "console" && (
                <span className={`devc-entry-source devc-source-tag-${entry.source}`}>
                  {entry.source === "app"
                    ? (entry.taskTag ? `app:${entry.taskTag}` : "app")
                    : entry.source}
                </span>
              )}
              <span className="devc-entry-text">
                {display}
                {isLong && (
                  <button
                    type="button"
                    className="devc-entry-more"
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    {expanded ? "Mostrar menos" : "Mostrar más"}
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </aside>,
    portalTarget
  );
};

export default DevConsolePanel;
