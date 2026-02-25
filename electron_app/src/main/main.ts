import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { pyManager } from './py_manager';
import { AppUpdater } from './updater';

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isPackaged = app.isPackaged;

  // Prioriza la versión exportada en `out/` (usada en producción y builds estáticos)
  const packagedIndex = isPackaged
    ? path.join(process.resourcesPath, 'out', 'index.html')
    : path.join(__dirname, '../../out/index.html');

  if (fs.existsSync(packagedIndex)) {
    win.loadFile(packagedIndex).catch((e) => console.error('Failed to load file:', e));
  } else {
    // En desarrollo, si no existe `out/index.html`, cargar el servidor de Next.js
    win.loadURL('http://localhost:3000').catch((e) => console.error('Failed to load URL:', e));
  }

  return win;
}

app.whenReady().then(() => {
  // Levantamos el backend local (dev o binario según `app.isPackaged`)
  pyManager.startBackend();

  const mainWindow = createWindow();

  // Instanciamos el actualizador inyectando la ventana para comunicación IPC
  try {
    const updater = new AppUpdater(mainWindow);
    // Retrasamos la búsqueda de actualizaciones 10 segundos para no penalizar el arranque
    setTimeout(() => {
      updater.checkForUpdates();
    }, 10000);
  } catch (err) {
    console.warn('Updater initialization failed, continuing without OTA:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  pyManager.killBackend();
});
