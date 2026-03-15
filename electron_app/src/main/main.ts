import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { pyManager } from './py_manager';
import { AppUpdater } from './updater';

let mainWindow: BrowserWindow | null = null;
let backendUrl = 'http://127.0.0.1:8000';

function createWindow(): BrowserWindow {
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

  const isDev = !app.isPackaged;
  if (isDev) {
    const viteUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(viteUrl).catch((err) => {
      console.error('[CRITICAL] Failed to load Vite URL', err);
    });
    win.webContents.openDevTools({ mode: 'right' });
  } else {
    const indexFile = path.join(process.resourcesPath, 'out', 'index.html');
    win.loadFile(indexFile).catch((err) => {
      console.error('[CRITICAL] Failed to load production index.html', err);
    });
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

  mainWindow = createWindow();

  try {
    const updater = new AppUpdater(mainWindow);
    setTimeout(() => updater.checkForUpdates(), 10000);
  } catch (err) {
    console.warn('Updater initialization failed:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
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
