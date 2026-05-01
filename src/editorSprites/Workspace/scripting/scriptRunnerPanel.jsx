// scriptRunnerPanel.jsx — panel para escribir y ejecutar scripts JS.
// Editor simple (textarea). Cuando el usuario dale "Ejecutar", construye el
// snapshot, lo envía al sandbox y aplica el patch resultante.
//
// Props:
//   snapshotBuilder: () => snapshot  (el host provee esta callback)
//   onApplyPatch:    (patch) => void (el host aplica dentro de una transacción)

import React, { useState } from 'react';
import { runScriptInSandbox } from './sandbox';
import './scriptRunnerPanel.css';

const EXAMPLE_SCRIPTS = [
  {
    label: 'Animación day/night (hue shift por frame)',
    code: `// Cambia el tono de cada capa un poco por frame → animación de ciclo día/noche.
for (let i = 0; i < app.frames.length; i++) {
  const frame = app.frames[i];
  for (const cel of frame.cels) {
    app.hueShift(cel.layerId, i * 15, frame.frameN);
  }
}
app.commit();
app.log('Ciclo aplicado a', app.frames.length, 'frames.');`,
  },
  {
    label: 'Damage flash (pintar rojo todos los pixels opacos)',
    code: `// Reemplaza cualquier pixel opaco por rojo saturado.
const red = { r: 255, g: 30, b: 40, a: 255 };
for (const frame of app.frames) {
  for (const cel of frame.cels) {
    // Recorremos cada pixel del cel.
    const d = cel.imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] === 0) continue;
      d[i] = red.r; d[i+1] = red.g; d[i+2] = red.b;
    }
  }
}
app.commit();`,
  },
];

const ScriptRunnerPanel = ({ snapshotBuilder, onApplyPatch, onClose }) => {
  const [code, setCode] = useState(EXAMPLE_SCRIPTS[0].code);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setRunning(true);
    setLogs([]);
    setError(null);
    try {
      const snapshot = snapshotBuilder?.();
      if (!snapshot) throw new Error('snapshotBuilder no devolvió datos');
      const result = await runScriptInSandbox(code, snapshot);
      setLogs(result.logs || []);
      if (!result.ok) {
        setError(result.error || 'Error desconocido');
        return;
      }
      onApplyPatch?.(result.patch);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="script-runner">
      <div className="script-runner__header">
        <h3>Script runner</h3>
        {onClose && (
          <button onClick={onClose} className="script-runner__close">×</button>
        )}
      </div>

      <div className="script-runner__examples">
        <span className="script-runner__examples-label">Ejemplos:</span>
        {EXAMPLE_SCRIPTS.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => setCode(ex.code)}
            className="script-runner__example-btn"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <textarea
        className="script-runner__editor"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
      />

      <div className="script-runner__footer">
        <button
          className="script-runner__run"
          onClick={run}
          disabled={running}
        >
          {running ? 'Ejecutando…' : 'Ejecutar'}
        </button>
        <span className="script-runner__hint">
          Termina tu script con <code>app.commit()</code> para aplicar cambios.
        </span>
      </div>

      {error && (
        <pre className="script-runner__error">⚠ {error}</pre>
      )}

      {logs.length > 0 && (
        <pre className="script-runner__logs">
{logs.join('\n')}
        </pre>
      )}
    </div>
  );
};

export default ScriptRunnerPanel;
