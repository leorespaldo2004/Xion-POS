// electron_app/src/main/updater.ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

// Se configura el logger para tener trazabilidad en producción sin depender de la consola.
autoUpdater.logger = log as any;
(autoUpdater.logger as any).transports = (autoUpdater.logger as any).transports || {};
(autoUpdater.logger as any).transports.file = (autoUpdater.logger as any).transports.file || {};
(autoUpdater.logger as any).transports.file.level = 'info';

export class AppUpdater {
    private window: BrowserWindow;

    constructor(window: BrowserWindow) {
        this.window = window;
        
        // Evitamos que la descarga bloquee la red del POS de forma agresiva.
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;

        this.registerEvents();
    }

    public checkForUpdates(): void {
        log.info('Checking for updates...');
        try {
            autoUpdater.checkForUpdatesAndNotify().catch((error: any) => {
                log.warn('Update check failed (likely offline):', error?.message || error);
            });
        } catch (error) {
            log.error('Critical error initializing update check:', error);
        }
    }

    private registerEvents(): void {
        autoUpdater.on('checking-for-update', () => {
            log.info('Update check started.');
        });

        autoUpdater.on('update-available', (info: any) => {
            log.info('Update available:', info.version);
            this.window.webContents.send('update-available', info.version);
        });

        autoUpdater.on('update-not-available', () => {
            log.info('App is up to date.');
        });

        autoUpdater.on('error', (err: any) => {
            log.warn('Error in auto-updater. System will continue operating offline.', err);
        });

        autoUpdater.on('update-downloaded', (info: any) => {
            log.info('Update downloaded. Ready to install on quit.');
            this.window.webContents.send('update-ready', info.version);
        });
    }
}
