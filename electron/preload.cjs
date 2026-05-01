// Preload script — se ejecuta en cada ventana antes de que cargue el JS del
// renderer. Expone un bridge mínimo por contextBridge para soportar paneles
// popped (ventanas OS independientes) sin habilitar nodeIntegration.
const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Set();

// Recibe eventos broadcast desde main.js y los despacha a los listeners
// locales de esta ventana.
ipcRenderer.on('panel:evento', (_event, msg) => {
  for (const cb of listeners) {
    try {
      cb(msg);
    } catch (err) {
      console.error('panel bridge listener error:', err);
    }
  }
});

contextBridge.exposeInMainWorld('pixcalliBridge', {
  esElectron: true,

  // Crea una nueva BrowserWindow que carga la misma app con ?panel=<id>.
  // Devuelve el id numérico de la ventana creada (útil para cerrarla).
  abrirPanel(panelId, opciones) {
    return ipcRenderer.invoke('panel:abrir', panelId, opciones || {});
  },

  // Cierra la ventana popped asociada a un panelId.
  cerrarPanel(panelId) {
    return ipcRenderer.invoke('panel:cerrar', panelId);
  },

  // Envía un evento a todas las ventanas (incluyendo la principal).
  sendEvento(msg) {
    ipcRenderer.send('panel:evento', msg);
  },

  // Se suscribe a eventos. Retorna función para desuscribirse.
  onEvento(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  // Lee ?panel=<id> de la URL (si esta ventana es una popped).
  panelIdDeUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('panel');
    } catch {
      return null;
    }
  },
});
