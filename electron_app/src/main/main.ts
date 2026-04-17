import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { pyManager } from './py_manager';
import { AppUpdater } from './updater';

let mainWindow: BrowserWindow | null = null;

process.on('uncaughtException', (error: any) => {
  if (error.code === 'EPIPE') {
    // Ignorar EPIPE proveniente de stdout/stderr cerrados prematuramente.
    return;
  }
  console.error('[Uncaught Exception]', error);
});
let backendUrl = 'http://127.0.0.1:8000';

async function loadURLWithRetry(win: BrowserWindow, url: string, retries = 30, delayMs = 200): Promise<void> {
  let attempt = 0;
  while (attempt < retries) {
    attempt += 1;
    try {
      await win.loadURL(url);
      return;
    } catch (err) {
      if (attempt >= retries) {
        console.error(`[CRITICAL] Failed to load Vite URL after ${attempt} attempts`, err);
        throw err;
      }
      console.warn(`[WARN] Vite not ready (attempt ${attempt}/${retries}), retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[CRITICAL] BrowserWindow failed to load URL ${validatedURL} (${errorCode}): ${errorDescription}`);
  });
  win.webContents.on('crashed', () => {
    console.error('[CRITICAL] BrowserWindow renderer crashed');
  });
  
  const isDev = !app.isPackaged;
  if (isDev) {
    const viteUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    try {
      await loadURLWithRetry(win, viteUrl);
    } catch (err: any) {
      console.error('[CRITICAL] Failed to load Vite URL after retries', err);
      dialog.showErrorBox(
        'Error de Desarrollo',
        `No se pudo conectar con el servidor de desarrollo de Vite.\n\nDetalle: ${err.message}`
      );
      app.exit(1);
      return win;
    }
    win.webContents.openDevTools({ mode: 'right' });
  } else {
    const indexFile = path.join(process.resourcesPath, 'out', 'index.html');
    try {
      await win.loadFile(indexFile);
    } catch (err: any) {
      console.error('[CRITICAL] Failed to load production index.html', err);
      dialog.showErrorBox(
        'Error de Producción',
        `No se encontró el archivo de interfaz (index.html).\n\nDetalle: ${err.message}`
      );
      app.exit(1);
    }
  }

  // Ya no necesitamos ready-to-show porque show: true

  return win;
}

app.whenReady().then(async () => {
  try {
    backendUrl = await pyManager.start();
  } catch (err: any) {
    console.error('[CRITICAL] Backend failed to start', err);
    try { pyManager.stop(); } catch (e) {}
    dialog.showErrorBox(
      'Error de Sistema (Backend)',
      `No se pudo iniciar el servidor local de base de datos.\n\nDetalle: ${err.message || 'Error desconocido'}\n\nPor favor, contacte a soporte técnico.`
    );
    app.quit();
    return;
  }

  ipcMain.handle('get-backend-url', () => backendUrl);

  try {
    mainWindow = await createWindow();

    try {
      const updater = new AppUpdater(mainWindow);
      setTimeout(() => updater.checkForUpdates(), 10000);
    } catch (updaterErr) {
      console.warn('Updater initialization failed:', updaterErr);
    }
  } catch (err: any) {
    try { pyManager.stop(); } catch (e) {}
    dialog.showErrorBox(
      'Error de Aplicación',
      `Ocurrió un error inesperado al iniciar la ventana principal.\n\nDetalle: ${err.message}`
    );
    app.quit();
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  pyManager.stop();
  app.quit();
});

app.on('before-quit', () => {
  pyManager.stop();
});

app.on('will-quit', () => {
  pyManager.stop();
});

app.on('quit', () => {
  if (mainWindow) {
    mainWindow = null;
  }
});
