"use no memo";

// paletteManager.jsx — modal grande para explorar paletas predefinidas y custom.
//
// NOTA: este archivo opta por NO ser optimizado por React Compiler.
// Motivo: el compilador inserta `c()` (cache hook) en helpers a nivel módulo
// como `saveCustomToStorage`, `approximateColorName`, etc., y esos helpers se
// invocan desde dentro de useEffect, donde los hooks no pueden ejecutarse →
// "Invalid hook call". El módulo no es performance-critical (sólo monta el
// modal cuando se abre), así que la opt-out no afecta UX.
//
// Uso esperado desde layerColor.jsx:
//   <PaletteManager
//      open={showPaletteManager}
//      onClose={() => setShowPaletteManager(false)}
//      activeColor={toolParameters.foregroundColor}
//      onColorPick={(rgba) => { ... }}
//      onSavedPalettesChange={(arr) => { /* opcional */ }}
//      initialSavedPalettes={projectData?.palette?.customPalettes}
//   />
//
// Cuando `open` es false el componente devuelve null (no monta DOM ni listeners).
//
// Persistencia:
//  - Paletas custom del usuario se guardan en localStorage bajo 'pixcalli.palettes.custom'.
//  - Si recibe `initialSavedPalettes`, esas sobrescriben el inicial leído de storage.
//  - `onSavedPalettesChange` se dispara tras cada cambio para que el proyecto pueda sincronizar.

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LuX, LuSearch, LuPlus, LuTrash2, LuPalette, LuCopy, LuCheck } from 'react-icons/lu';
import {
  PALETTE_PRESETS,
  PALETTE_CATEGORIES,
  groupPresetsByCategory,
  hexToRgba,
  rgbaToHex,
} from './presets';
import './paletteManager.css';

const LS_KEY = 'pixcalli.palettes.custom';
const CUSTOM_CATEGORY = { id: 'custom', name: 'Mis paletas', hint: 'Paletas creadas por ti' };

function loadCustomFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomToStorage(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    // quota o entorno sin localStorage: ignorar
  }
}

// Aproxima el "nombre humano" de un color a partir del hex.
// Heurística rápida HSL → familia tonal. No es CSS Color Names: pretende ser
// suficientemente identificativo para el usuario al escanear la paleta.
function approximateColorName(hex) {
  const h = hex.replace('#', '');
  if (h.length < 6) return hex.toUpperCase();
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const d = max - min;
  if (d < 14) {
    if (l < 0.08) return 'Negro';
    if (l < 0.25) return 'Gris muy oscuro';
    if (l < 0.45) return 'Gris oscuro';
    if (l < 0.6) return 'Gris medio';
    if (l < 0.8) return 'Gris claro';
    return 'Blanco';
  }
  let hue;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  const tone =
    l < 0.25 ? 'oscuro' : l < 0.45 ? 'apagado' : l < 0.65 ? '' : l < 0.85 ? 'claro' : 'pastel';
  let family;
  if (hue < 15 || hue >= 345) family = 'Rojo';
  else if (hue < 40) family = 'Naranja';
  else if (hue < 65) family = 'Amarillo';
  else if (hue < 95) family = 'Lima';
  else if (hue < 150) family = 'Verde';
  else if (hue < 190) family = 'Cian';
  else if (hue < 230) family = 'Azul';
  else if (hue < 275) family = 'Indigo';
  else if (hue < 320) family = 'Violeta';
  else family = 'Magenta';
  return tone ? `${family} ${tone}` : family;
}

// Calcula la luminancia perceptual (sRGB) para decidir el color del texto del swatch.
function isDarkHex(hex) {
  const h = hex.replace('#', '');
  if (h.length < 6) return true;
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L < 0.5;
}

const PaletteManager = ({
  open = true,
  onClose,
  activeColor,
  onColorPick,
  onPaletteApply,
  onSavedPalettesChange,
  initialSavedPalettes,
}) => {
  const [customPalettes, setCustomPalettes] = useState(
    () => initialSavedPalettes ?? loadCustomFromStorage()
  );
  const [activePresetId, setActivePresetId] = useState(PALETTE_PRESETS[0].id);
  const [activeCustomId, setActiveCustomId] = useState(null);
  const [search, setSearch] = useState('');
  const [draftColor, setDraftColor] = useState('#ff66aa');
  const [copiedHex, setCopiedHex] = useState(null);
  const dialogRef = useRef(null);

  // Sincronizar storage / callback al cambiar paletas custom.
  useEffect(() => {
    saveCustomToStorage(customPalettes);
    onSavedPalettesChange?.(customPalettes);
  }, [customPalettes, onSavedPalettesChange]);

  // ESC cierra. Listener solo cuando el modal está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset feedback de copiado tras 1.2s.
  useEffect(() => {
    if (!copiedHex) return undefined;
    const t = setTimeout(() => setCopiedHex(null), 1200);
    return () => clearTimeout(t);
  }, [copiedHex]);

  const groupedPresets = useMemo(() => groupPresetsByCategory(PALETTE_PRESETS), []);

  // Aplicar filtro de búsqueda sobre presets + custom. Mantiene la estructura por
  // categorías para que el sidebar siga teniendo sentido.
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groupedPresets;
    return groupedPresets
      .map((g) => ({
        ...g,
        presets: g.presets.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.author && p.author.toLowerCase().includes(q)) ||
            p.colors.some((c) => c.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.presets.length > 0);
  }, [groupedPresets, search]);

  const filteredCustom = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customPalettes;
    return customPalettes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.colors.some((c) => c.toLowerCase().includes(q))
    );
  }, [customPalettes, search]);

  const allPresets = useMemo(() => {
    const customAsPresets = customPalettes.map((p) => ({
      id: p.id,
      name: p.name,
      author: 'Tú',
      category: 'custom',
      isCustom: true,
      colors: p.colors,
    }));
    return [...PALETTE_PRESETS, ...customAsPresets];
  }, [customPalettes]);

  const activePalette = useMemo(() => {
    if (activeCustomId) {
      const c = customPalettes.find((p) => p.id === activeCustomId);
      if (c) return { ...c, author: 'Tú', isCustom: true, category: 'custom' };
    }
    return allPresets.find((p) => p.id === activePresetId) || allPresets[0];
  }, [allPresets, activePresetId, activeCustomId, customPalettes]);

  const activeHex = useMemo(
    () => (activeColor ? rgbaToHex(activeColor).toLowerCase() : null),
    [activeColor]
  );

  const handleSelectPreset = useCallback((id, isCustom) => {
    if (isCustom) {
      setActiveCustomId(id);
    } else {
      setActiveCustomId(null);
      setActivePresetId(id);
    }
  }, []);

  const handlePickHex = useCallback(
    (hex) => {
      onColorPick?.(hexToRgba(hex));
    },
    [onColorPick]
  );

  const handleCopyHex = useCallback((hex, e) => {
    e.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(hex.toUpperCase()).catch(() => {});
    }
    setCopiedHex(hex.toLowerCase());
  }, []);

  const handleCreateCustom = useCallback(() => {
    const id = `custom-${Date.now()}`;
    const name = `Mi paleta ${customPalettes.length + 1}`;
    setCustomPalettes((prev) => [...prev, { id, name, colors: [] }]);
    setActiveCustomId(id);
  }, [customPalettes.length]);

  const handleRenameCustom = useCallback((id, newName) => {
    setCustomPalettes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  }, []);

  const handleDeleteCustom = useCallback(
    (id) => {
      if (!confirm('¿Borrar esta paleta custom?')) return;
      setCustomPalettes((prev) => prev.filter((p) => p.id !== id));
      if (activeCustomId === id) setActiveCustomId(null);
    },
    [activeCustomId]
  );

  const handleAddToActiveCustom = useCallback(
    (hex) => {
      const lower = hex.toLowerCase();
      let targetId = activeCustomId;
      if (!targetId) {
        targetId = `custom-${Date.now()}`;
        setCustomPalettes((prev) => [
          ...prev,
          { id: targetId, name: `Mi paleta ${prev.length + 1}`, colors: [lower] },
        ]);
        setActiveCustomId(targetId);
        return;
      }
      setCustomPalettes((prev) =>
        prev.map((p) => {
          if (p.id !== targetId) return p;
          if (p.colors.includes(lower)) return p;
          return { ...p, colors: [...p.colors, lower] };
        })
      );
    },
    [activeCustomId]
  );

  const handleRemoveFromCustom = useCallback((id, hex) => {
    setCustomPalettes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, colors: p.colors.filter((c) => c !== hex) } : p))
    );
  }, []);

  if (!open) return null;

  const isCustomSelected = !!activeCustomId && activePalette?.isCustom;

  const modal = (
    <div
      className="pm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Gestor de paletas"
      onMouseDown={(e) => {
        // Cerrar solo si se hace click directo sobre el backdrop.
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="pm-dialog" ref={dialogRef}>
        {/* HEADER */}
        <div className="pm-header">
          <div className="pm-title">
            <LuPalette size={18} />
            <span>Paletas de color</span>
            <span className="pm-title-count">
              {PALETTE_PRESETS.length} predefinidas · {customPalettes.length} mías
            </span>
          </div>
          <div className="pm-search">
            <LuSearch size={14} />
            <input
              type="text"
              className="pm-search-input"
              placeholder="Buscar por nombre, autor o hex..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                type="button"
                className="pm-search-clear"
                onClick={() => setSearch('')}
                title="Limpiar búsqueda"
              >
                <LuX size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="pm-close"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
            title="Cerrar (Esc)"
          >
            <LuX size={18} />
          </button>
        </div>

        {/* BODY: sidebar + main */}
        <div className="pm-body">
          {/* SIDEBAR: categorías y paletas */}
          <aside className="pm-sidebar">
            {filteredGroups.map((group) => (
              <div className="pm-cat" key={group.id}>
                <div className="pm-cat-header">
                  <span className="pm-cat-name">{group.name}</span>
                  <span className="pm-cat-count">{group.presets.length}</span>
                </div>
                {group.hint && <div className="pm-cat-hint">{group.hint}</div>}
                <ul className="pm-cat-list">
                  {group.presets.map((p) => {
                    const selected = !isCustomSelected && activePresetId === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`pm-preset${selected ? ' is-selected' : ''}`}
                          onClick={() => handleSelectPreset(p.id, false)}
                          title={`${p.name} · ${p.colors.length} colores`}
                        >
                          <span className="pm-preset-strip" aria-hidden="true">
                            {p.colors.slice(0, 8).map((hex, i) => (
                              <span
                                key={i}
                                className="pm-preset-strip-cell"
                                style={{ background: hex }}
                              />
                            ))}
                          </span>
                          <span className="pm-preset-meta">
                            <span className="pm-preset-name">{p.name}</span>
                            <span className="pm-preset-sub">
                              {p.author} · {p.colors.length}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Custom palettes group */}
            <div className="pm-cat pm-cat-custom">
              <div className="pm-cat-header">
                <span className="pm-cat-name">{CUSTOM_CATEGORY.name}</span>
                <button
                  type="button"
                  className="pm-cat-add"
                  onClick={handleCreateCustom}
                  title="Crear nueva paleta custom"
                >
                  <LuPlus size={12} /> Nueva
                </button>
              </div>
              <div className="pm-cat-hint">{CUSTOM_CATEGORY.hint}</div>
              {filteredCustom.length === 0 && (
                <div className="pm-cat-empty">
                  {search
                    ? 'Ninguna coincide con la búsqueda'
                    : 'Crea una paleta y añade colores con click derecho'}
                </div>
              )}
              <ul className="pm-cat-list">
                {filteredCustom.map((p) => {
                  const selected = isCustomSelected && activeCustomId === p.id;
                  return (
                    <li key={p.id} className="pm-preset-row">
                      <button
                        type="button"
                        className={`pm-preset${selected ? ' is-selected' : ''}`}
                        onClick={() => handleSelectPreset(p.id, true)}
                      >
                        <span className="pm-preset-strip" aria-hidden="true">
                          {p.colors.length === 0 ? (
                            <span className="pm-preset-strip-empty">vacía</span>
                          ) : (
                            p.colors.slice(0, 8).map((hex, i) => (
                              <span
                                key={i}
                                className="pm-preset-strip-cell"
                                style={{ background: hex }}
                              />
                            ))
                          )}
                        </span>
                        <span className="pm-preset-meta">
                          <span className="pm-preset-name">{p.name}</span>
                          <span className="pm-preset-sub">{p.colors.length} colores</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="pm-preset-del"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustom(p.id);
                        }}
                        title="Borrar paleta"
                      >
                        <LuTrash2 size={12} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* MAIN: grid de la paleta seleccionada */}
          <section className="pm-main">
            {activePalette ? (
              <>
                <header className="pm-main-header">
                  <div className="pm-main-title">
                    <h2>{activePalette.name}</h2>
                    <span className="pm-badge">
                      {activePalette.colors.length} colores
                    </span>
                    {activePalette.author && (
                      <span className="pm-author">por {activePalette.author}</span>
                    )}
                    {activePalette.isCustom && (
                      <span className="pm-badge pm-badge-custom">Custom</span>
                    )}
                  </div>
                  <div className="pm-main-actions">
                    {/* Acción primaria: reemplaza la paleta inline del módulo
                        de color por esta. Sin esto, el modal sólo picaba 1
                        color a la vez y el usuario se preguntaba "¿cómo
                        selecciono toda la paleta?". */}
                    {onPaletteApply && activePalette.colors.length > 0 && (
                      <button
                        type="button"
                        className="pm-btn pm-btn-primary"
                        onClick={() => {
                          onPaletteApply({
                            name: activePalette.name,
                            colors: activePalette.colors,
                          });
                          onClose?.();
                        }}
                        title="Reemplaza la paleta inline del panel de color"
                      >
                        <LuCheck size={12} /> Usar esta paleta
                      </button>
                    )}
                    {!activePalette.isCustom && (
                      <button
                        type="button"
                        className="pm-btn"
                        onClick={() => {
                          // Duplica la paleta como nueva custom.
                          const id = `custom-${Date.now()}`;
                          setCustomPalettes((prev) => [
                            ...prev,
                            {
                              id,
                              name: `${activePalette.name} (copia)`,
                              colors: activePalette.colors.map((c) => c.toLowerCase()),
                            },
                          ]);
                          setActiveCustomId(id);
                        }}
                        title="Duplicar como paleta custom editable"
                      >
                        <LuCopy size={12} /> Duplicar
                      </button>
                    )}
                  </div>
                </header>
                <div className="pm-grid-hint">
                  <strong>"Usar esta paleta"</strong> reemplaza la paleta del
                  módulo de color. <strong>Click</strong> en swatch: pinta con
                  ese color. <strong>Click derecho</strong>:{' '}
                  {isCustomSelected
                    ? 'quitar de esta paleta'
                    : 'añadir a paleta custom activa'}.
                </div>
                {activePalette.colors.length === 0 ? (
                  <div className="pm-empty-grid">
                    Esta paleta está vacía. Añade colores desde otra paleta con click derecho,
                    o usa el selector de abajo.
                  </div>
                ) : (
                  <div className="pm-grid" role="list">
                    {activePalette.colors.map((hex, i) => {
                      const lower = hex.toLowerCase();
                      const isActive = activeHex === lower;
                      const dark = isDarkHex(hex);
                      return (
                        <div
                          key={`${activePalette.id}-${hex}-${i}`}
                          className={`pm-cell${isActive ? ' is-active' : ''}${
                            dark ? ' is-dark' : ' is-light'
                          }`}
                          role="listitem"
                          style={{ background: hex }}
                          title={`${hex.toUpperCase()} · click para usar`}
                          onClick={() => handlePickHex(hex)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (isCustomSelected) {
                              handleRemoveFromCustom(activeCustomId, lower);
                            } else {
                              handleAddToActiveCustom(hex);
                            }
                          }}
                        >
                          <div className="pm-cell-meta">
                            <span className="pm-cell-name">{approximateColorName(hex)}</span>
                            <span className="pm-cell-hex">{hex.toUpperCase()}</span>
                          </div>
                          <button
                            type="button"
                            className="pm-cell-copy"
                            onClick={(e) => handleCopyHex(hex, e)}
                            title={`Copiar ${hex.toUpperCase()}`}
                            aria-label={`Copiar ${hex.toUpperCase()}`}
                          >
                            {copiedHex === lower ? (
                              <LuCheck size={12} />
                            ) : (
                              <LuCopy size={12} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isCustomSelected && (
                  <div className="pm-adder">
                    <label className="pm-adder-label">Añadir color manual</label>
                    <input
                      type="color"
                      value={draftColor}
                      onChange={(e) => setDraftColor(e.target.value)}
                      className="pm-adder-input"
                      aria-label="Selector de color"
                    />
                    <input
                      type="text"
                      value={draftColor.toUpperCase()}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) setDraftColor(v.toLowerCase());
                      }}
                      className="pm-adder-hex"
                      maxLength={7}
                      aria-label="Código hex"
                    />
                    <button
                      type="button"
                      className="pm-btn pm-btn-primary"
                      onClick={() => handleAddToActiveCustom(draftColor)}
                    >
                      <LuPlus size={12} /> Añadir
                    </button>
                    <input
                      className="pm-rename"
                      value={activePalette.name}
                      onChange={(e) => handleRenameCustom(activePalette.id, e.target.value)}
                      aria-label="Renombrar paleta"
                      placeholder="Nombre de la paleta"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="pm-empty-grid">Selecciona una paleta del panel izquierdo</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PaletteManager;
