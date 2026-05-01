import { useEffect } from 'react';
import { LuX } from 'react-icons/lu';
import './panelFloatingClose.css';

// Botón "X Cerrar" flotante para módulos legacy que no tienen su propio
// mecanismo de cierre (ej. AIgenerator, Enhanced3DFlattener — toggleados
// desde el menú con `display: none` o `<Activity>`).
//
// Cuando `active` es true:
//   - Renderiza el botón fijo en el top-right del viewport (z-index alto).
//   - Engancha Escape al window para cerrar.
// Cuando `active` es false: no renderiza nada y no engancha listeners.
export default function PanelFloatingClose({ active, onClose, label = 'Cerrar' }) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      // Ignora si el usuario está escribiendo en un input/textarea —
      // el módulo wrapped puede tener formularios que también usan Esc.
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);

  if (!active) return null;
  return (
    <button
      type="button"
      className="panel-floating-close"
      onClick={onClose}
      aria-label={label}
      title={`${label} (Esc)`}
    >
      <LuX className="panel-floating-close__icon" aria-hidden="true" />
      <span className="panel-floating-close__label">{label}</span>
      <kbd className="panel-floating-close__kbd">Esc</kbd>
    </button>
  );
}
