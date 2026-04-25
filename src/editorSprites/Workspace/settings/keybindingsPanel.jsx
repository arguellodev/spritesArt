// keybindingsPanel.jsx — UI para ver/rebindear atajos.
// Recibe el registry del hook `useKeybindingsRegistry`.

import React, { useState } from 'react';
import './keybindingsPanel.css';

const KeybindingsPanel = ({ registry }) => {
  const [captureFor, setCaptureFor] = useState(null); // actionId que está capturando
  const [, forceRender] = useState(0);
  const actions = registry.listActions();

  const handleKeydown = (e) => {
    if (!captureFor) return;
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.metaKey) parts.push('meta');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    const k = e.key?.toLowerCase();
    if (!['control', 'meta', 'alt', 'shift'].includes(k)) parts.push(k);
    if (parts.length === 0) return;
    registry.rebind(captureFor, [parts.join('+')]);
    setCaptureFor(null);
    forceRender((n) => n + 1);
  };

  return (
    <div
      className="keybindings-panel"
      tabIndex={0}
      onKeyDown={handleKeydown}
    >
      <div className="keybindings-panel__header">
        <span className="keybindings-panel__title">Atajos de teclado</span>
        <span className="keybindings-panel__hint">
          Click en un atajo → pulsa la nueva combinación
        </span>
      </div>
      <table className="keybindings-panel__table">
        <thead>
          <tr>
            <th>Acción</th>
            <th>Atajo</th>
            <th>Descripción</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.id}>
              <td className="keybindings-panel__id">{a.id}</td>
              <td>
                <button
                  type="button"
                  className={`keybindings-panel__key-btn${captureFor === a.id ? ' is-capturing' : ''}`}
                  onClick={() => setCaptureFor(a.id)}
                >
                  {captureFor === a.id ? 'Pulsa...' : a.keys.join(' · ') || '(sin atajo)'}
                </button>
              </td>
              <td className="keybindings-panel__desc">{a.description}</td>
              <td>
                <button
                  type="button"
                  className="keybindings-panel__reset"
                  onClick={() => {
                    registry.resetToDefaults(a.id);
                    forceRender((n) => n + 1);
                  }}
                  title="Restaurar default"
                >
                  ↺
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KeybindingsPanel;
