import { app, BrowserWindow, Menu, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');

// Registro de ventanas popped abiertas por panelId
const panelWindows = new Map();

// Configurar flags de hardware acceleration y otras optimizaciones
app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('--enable-accelerated-video-decode');
app.commandLine.appendSwitch('--force-gpu-mem-available-mb', '2048');

// Para aplicaciones con mucho contenido gráfico
app.commandLine.appendSwitch('--max-old-space-size', '8192');

let mainWindow; // Variable global para acceder a la ventana

function createWindow() {
  const win = new BrowserWindow({
    title: "PixCalli Studio",
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      // Optimizaciones críticas para canvas
      enableRemoteModule: false,
      backgroundThrottling: false, // Evita throttling cuando la ventana no está en foco
      experimentalFeatures: true,
      offscreen: false,
      // Habilitar aceleración de hardware
      webgl: true,
      // Optimizar memoria
      spellcheck: false,
      // Para mejor rendimiento con canvas
      enableBlinkFeatures: 'OffscreenCanvas,WebGL2',
    },
    // Optimizaciones de ventana
    skipTaskbar: false,
    resizable: true,
    fullscreenable: true,
  });

  // Asignar a variable global
  mainWindow = win;

  // Optimizar la carga inicial
  win.once('ready-to-show', () => {
    win.show();
    win.maximize();
    
    // Forzar focus para mejor rendimiento
    win.focus();
    
    // Optimización adicional: prewarm el renderer
    win.webContents.executeJavaScript(`
      // Prewarm WebGL context si está disponible
      if (window.WebGLRenderingContext) {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          console.log('WebGL context prewarmed');
        }
      }
      
      // Configurar requestIdleCallback para mejor scheduling
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          console.log('Renderer ready for heavy operations');
        });
      }
    `);
  });

  // Manejar eventos de rendimiento
  win.webContents.on('did-finish-load', () => {
    // Desactivar throttling para mejor rendimiento con canvas
    win.webContents.setBackgroundThrottling(false);
  });

  // Manejar memoria
  win.webContents.on('render-process-gone', (event, details) => {
    console.log('Render process gone:', details);
    // Aquí podrías recargar la ventana o mostrar un error
  });

  Menu.setApplicationMenu(null);

  const devServer = process.env.VITE_DEV_SERVER;

  if (devServer) {
    win.loadURL(devServer);
    // Solo abrir DevTools en desarrollo si es necesario
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}

// Función para alternar pantalla completa
function toggleFullScreen() {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
  }
}

function createPanelWindow(panelId, opciones) {
  const existente = panelWindows.get(panelId);
  if (existente && !existente.isDestroyed()) {
    existente.focus();
    return existente.id;
  }

  const win = new BrowserWindow({
    title: `PixCalli — ${panelId}`,
    width: opciones.width || 340,
    height: opciones.height || 520,
    x: opciones.x,
    y: opciones.y,
    minWidth: 260,
    minHeight: 200,
    parent: mainWindow || undefined,
    backgroundColor: '#1e1e1e',
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      backgroundThrottling: false,
      webgl: true,
      spellcheck: false,
    },
  });

  panelWindows.set(panelId, win);

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    if (panelWindows.get(panelId) === win) {
      panelWindows.delete(panelId);
    }
    // Notificar a las demás ventanas que esta popped se cerró
    const payload = { type: 'panel/cerrado', panelId };
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) w.webContents.send('panel:evento', payload);
    }
  });

  const devServer = process.env.VITE_DEV_SERVER;
  const qs = `?panel=${encodeURIComponent(panelId)}`;
  if (devServer) {
    win.loadURL(`${devServer}${qs}`);
    // En dev abrimos DevTools en popped para que se puedan ver los logs del
    // bridge y diagnosticar problemas de sincronización.
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), { search: qs.slice(1) });
  }

  return win.id;
}

// Crea/re-enfoca una ventana de panel popped
ipcMain.handle('panel:abrir', (_event, panelId, opciones) => {
  return createPanelWindow(panelId, opciones || {});
});

// Cierra la ventana popped asociada
ipcMain.handle('panel:cerrar', (_event, panelId) => {
  const win = panelWindows.get(panelId);
  if (win && !win.isDestroyed()) {
    win.close();
    return true;
  }
  return false;
});

// Broadcast de eventos entre todas las ventanas (main + popped)
ipcMain.on('panel:evento', (event, msg) => {
  const origenId = event.sender.id;
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed()) continue;
    if (w.webContents.id === origenId) continue;
    w.webContents.send('panel:evento', msg);
  }
});

// Configurar el manejo de memoria de la app
app.whenReady().then(() => {
  // Configuraciones adicionales cuando la app está lista
  app.setAppUserModelId('com.pixcalli.studio');
  
  createWindow();
  
  // Registrar el shortcut global para F11
  globalShortcut.register('F11', () => {
    toggleFullScreen();
  });
  
  console.log('F11 shortcut registrado para pantalla completa');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Desregistrar todos los shortcuts globales antes de salir
    globalShortcut.unregisterAll();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Limpiar shortcuts cuando la app se va a cerrar
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Manejar advertencias de memoria
app.on('render-process-gone', (event, webContents, details) => {
  console.log('Render process gone:', details);
});

// Optimizar uso de GPU
app.on('gpu-process-crashed', (event, killed) => {
  console.log('GPU process crashed, killed:', killed);
});

// Configurar límites de memoria si es necesario
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Para debugging de rendimiento
if (process.env.NODE_ENV === 'development') {
  app.on('ready', () => {
    console.log('GPU Feature Status:', app.getGPUFeatureStatus());
  });
}