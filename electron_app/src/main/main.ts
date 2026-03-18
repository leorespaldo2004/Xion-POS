import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { pyManager } from './py_manager';
import { AppUpdater } from './updater';

let mainWindow: BrowserWindow | null = null;
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
    show: false,
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
  win.webContents.on('console-message', (_, level, message, line, sourceId) => {
    console.log(`[Renderer][${level}] ${sourceId}:${line} ${message}`);
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    const viteUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    try {
      await loadURLWithRetry(win, viteUrl);
    } catch (err) {
      console.error('[CRITICAL] Failed to load Vite URL after retries', err);
      app.quit();
      return win;
    }
    win.webContents.openDevTools({ mode: 'right' });
  } else {
    const indexFile = path.join(process.resourcesPath, 'out', 'index.html');
    try {
      await win.loadFile(indexFile);
    } catch (err) {
      console.error('[CRITICAL] Failed to load production index.html', err);
    }
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  return win;
}

app.whenReady().then(async () => {
  try {
    backendUrl = await pyManager.start();
  } catch (err) {
    console.error('[CRITICAL] Backend failed to start', err);
    app.quit();
    return;
  }

  ipcMain.handle('get-backend-url', () => backendUrl);

  mainWindow = await createWindow();

  try {
    const updater = new AppUpdater(mainWindow);
    setTimeout(() => updater.checkForUpdates(), 10000);
  } catch (err) {
    console.warn('Updater initialization failed:', err);
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
