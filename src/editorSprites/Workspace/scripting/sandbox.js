// sandbox.js — ejecuta código de usuario en un Web Worker aislado.
//
// Flujo:
//  1. Host llama runScriptInSandbox(code, snapshot) → Promise<{patch, logs, error}>.
//  2. Se crea un Worker inline con el código runtime inyectado.
//  3. El worker instala `self.app` con la API (mutaciones locales).
//  4. Evalúa el código del usuario con `new Function('app', code)` (no eval
//     directo, para que las mutaciones a `self` no afecten al worker host).
//  5. Al terminar, el worker envía el patch (arr de ImageData modificados) de vuelta.

export function runScriptInSandbox(code, snapshot, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const workerCode = `
      // Runtime del sandbox — se ejecuta dentro del worker.
      let _snapshot;
      let _patch = [];
      let _committed = false;
      let _logs = [];

      function _log(...args) {
        _logs.push(args.map(String).join(' '));
      }

      function _hslFromRgb(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
          else if (max === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h /= 6;
        }
        return [h, s, l];
      }
      function _rgbFromHsl(h, s, l) {
        if (s === 0) return [l * 255, l * 255, l * 255];
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2rgb = (t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        return [hue2rgb(h + 1/3) * 255, hue2rgb(h) * 255, hue2rgb(h - 1/3) * 255];
      }

      function _findCelImage(frameN, layerId) {
        const frame = _snapshot.frames.find(f => f.frameN === frameN);
        if (!frame) return null;
        return frame.cels.find(c => c.layerId === layerId);
      }

      self.onmessage = function(e) {
        _snapshot = e.data.snapshot;

        const app = {
          get width() { return _snapshot.width; },
          get height() { return _snapshot.height; },
          get palette() { return _snapshot.palette; },
          get layers() { return _snapshot.layers; },
          get frames() { return _snapshot.frames; },
          get activeFrame() { return _snapshot.activeFrame; },
          get activeLayer() {
            return _snapshot.layers.find(l => l.id === _snapshot.activeLayerId);
          },

          log: _log,

          // pixel(layerId, x, y) → {r,g,b,a} | undefined
          // pixel(layerId, x, y, {r,g,b,a?}) → mutate
          pixel: function(layerId, x, y, color) {
            const cel = _findCelImage(_snapshot.activeFrame, layerId);
            if (!cel) return undefined;
            const i = (y * cel.width + x) * 4;
            if (i < 0 || i >= cel.imageData.data.length) return undefined;
            const d = cel.imageData.data;
            if (color === undefined) {
              return { r: d[i], g: d[i+1], b: d[i+2], a: d[i+3] };
            }
            d[i] = color.r; d[i+1] = color.g; d[i+2] = color.b;
            d[i+3] = color.a !== undefined ? color.a : 255;
          },

          fill: function(layerId, color, frameN) {
            const f = frameN !== undefined ? frameN : _snapshot.activeFrame;
            const cel = _findCelImage(f, layerId);
            if (!cel) return;
            const d = cel.imageData.data;
            const a = color.a !== undefined ? color.a : 255;
            for (let i = 0; i < d.length; i += 4) {
              d[i] = color.r; d[i+1] = color.g; d[i+2] = color.b; d[i+3] = a;
            }
          },

          hueShift: function(layerId, degrees, frameN) {
            const f = frameN !== undefined ? frameN : _snapshot.activeFrame;
            const cel = _findCelImage(f, layerId);
            if (!cel) return;
            const d = cel.imageData.data;
            const shift = degrees / 360;
            for (let i = 0; i < d.length; i += 4) {
              if (d[i+3] === 0) continue;
              const [h, s, l] = _hslFromRgb(d[i], d[i+1], d[i+2]);
              const [nr, ng, nb] = _rgbFromHsl((h + shift + 1) % 1, s, l);
              d[i] = nr; d[i+1] = ng; d[i+2] = nb;
            }
          },

          replaceColor: function(layerId, from, to, tolerance, frameN) {
            const f = frameN !== undefined ? frameN : _snapshot.activeFrame;
            const cel = _findCelImage(f, layerId);
            if (!cel) return;
            const d = cel.imageData.data;
            const tol = tolerance || 0;
            const tolSq = tol * tol * 3;
            for (let i = 0; i < d.length; i += 4) {
              if (d[i+3] === 0) continue;
              const dr = d[i] - from.r, dg = d[i+1] - from.g, db = d[i+2] - from.b;
              if ((tol === 0 && dr === 0 && dg === 0 && db === 0) ||
                  (tol > 0 && dr*dr + dg*dg + db*db <= tolSq)) {
                d[i] = to.r; d[i+1] = to.g; d[i+2] = to.b;
              }
            }
          },

          commit: function() {
            _committed = true;
            for (const frame of _snapshot.frames) {
              for (const cel of frame.cels) {
                _patch.push({
                  frameN: frame.frameN,
                  layerId: cel.layerId,
                  imageData: cel.imageData,
                });
              }
            }
          },
        };

        try {
          const fn = new Function('app', e.data.code);
          fn(app);
          if (!_committed) {
            _log('Script terminó sin app.commit(). No se aplicarán cambios.');
          }
          // Transferir ImageData buffers para performance.
          const transfers = _patch.map(p => p.imageData.data.buffer);
          self.postMessage({ ok: true, patch: _patch, logs: _logs }, transfers);
        } catch (err) {
          self.postMessage({ ok: false, error: err.message, logs: _logs });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Script timeout (${timeoutMs}ms)`));
    }, timeoutMs);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      if (e.data.ok) resolve(e.data);
      else resolve({ ok: false, error: e.data.error, logs: e.data.logs });
    };
    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ code, snapshot });
  });
}
