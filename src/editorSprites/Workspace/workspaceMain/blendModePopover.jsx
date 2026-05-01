'use no memo';
// BlendModePopover — popover standalone para elegir modo de fusion de una capa.
//
// Diseño:
//  - createPortal a document.body para escapar overflow/transform de cualquier
//    ancestor (mismo motivo que SubmenuPanel).
//  - position:fixed con coordenadas calculadas desde anchorEl.getBoundingClientRect().
//  - Preview-on-hover, commit-on-click, revert-on-cancel (snapshot al montar,
//    restore en cleanup si no hubo commit).
//  - Cierre: click en item, click fuera, Esc.
//  - Reusa CSS de .context-menu-submenu* para consistencia visual con el menu
//    contextual.

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BLEND_MODES, BLEND_GROUP_LABELS } from '../blendModes';

export function BlendModePopover({
  anchorEl,
  currentMode,
  onPick,         // (modeId) → aplica el modo (preview o commit, mismo setter)
  onClose,        // cierra sin restaurar (lo llama click en item o el caller)
  onCancel,       // (originalMode) → revertir; lo llama el cleanup si no hubo commit
}) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, measured: false });

  // Snapshot/commit logic igual que SubmenuPanel.
  const wasCommittedRef = useRef(false);
  const snapshotRef = useRef(currentMode);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    snapshotRef.current = currentMode;
    return () => {
      if (!wasCommittedRef.current && onCancelRef.current) {
        onCancelRef.current(snapshotRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Posicionamiento (mismo algoritmo que SubmenuPanel).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !anchorEl) return;
    const btnRect = anchorEl.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const margin = 6;
    const safe = 4;

    // Default: a la derecha del item.
    let left = btnRect.right + margin;
    if (left + panelRect.width > window.innerWidth - safe) {
      // Fallback: a la izquierda.
      left = Math.max(safe, btnRect.left - panelRect.width - margin);
    }
    let top = btnRect.top;
    if (top + panelRect.height > window.innerHeight - safe) {
      top = Math.max(safe, window.innerHeight - panelRect.height - safe);
    }
    setPos({ left: Math.round(left), top: Math.round(top), measured: true });
  }, [anchorEl]);

  // Click fuera + Escape para cerrar.
  useEffect(() => {
    const onPointer = (e) => {
      const panel = panelRef.current;
      if (!panel) return;
      // Permitir click dentro del panel y dentro del anchor (el botón que abrió).
      if (panel.contains(e.target)) return;
      if (anchorEl && anchorEl.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorEl, onClose]);

  // Construir lista agrupada con divider por grupo.
  const renderItems = () => {
    const out = [];
    let lastGroup = null;
    for (const m of BLEND_MODES) {
      if (m.group !== lastGroup && BLEND_GROUP_LABELS[m.group]) {
        out.push(
          <div key={`d-${m.group}`} className="context-menu-submenu-divider">
            {BLEND_GROUP_LABELS[m.group]}
          </div>
        );
      }
      lastGroup = m.group;
      const checked = m.id === currentMode;
      out.push(
        <button
          key={`m-${m.id}`}
          className={`context-menu-submenu-item ${checked ? 'checked' : ''}`}
          onMouseEnter={() => onPick(m.id)}
          onClick={() => {
            wasCommittedRef.current = true;
            onPick(m.id);
            onClose();
          }}
          role="menuitemradio"
          aria-checked={checked}
        >
          <span className="context-menu-submenu-check" aria-hidden>
            {checked ? '✓' : ''}
          </span>
          <span className="context-menu-submenu-label">{m.label}</span>
        </button>
      );
    }
    return out;
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      className="context-menu-submenu"
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        visibility: pos.measured ? 'visible' : 'hidden',
      }}
    >
      {renderItems()}
    </div>,
    document.body
  );
}
