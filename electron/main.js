import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Configurar el manejo de memoria de la app
app.whenReady().then(() => {
  // Configuraciones adicionales cuando la app está lista
  app.setAppUserModelId('com.pixcalli.studio');
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
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