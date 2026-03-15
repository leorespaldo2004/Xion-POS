import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Solo exponemos los canales de comunicación específicos para el updater.
// Prevenimos inyección de canales maliciosos o prototipos no deseados.
const api = {
    updater: {
        onUpdateAvailable: (callback: (version: string) => void) => {
            const subscription = (_event: IpcRendererEvent, version: string) => callback(version);
            ipcRenderer.on('update-available', subscription);
            return () => {
                ipcRenderer.removeListener('update-available', subscription);
            };
        },
        onUpdateReady: (callback: (version: string) => void) => {
            const subscription = (_event: IpcRendererEvent, version: string) => callback(version);
            ipcRenderer.on('update-ready', subscription);
            return () => {
                ipcRenderer.removeListener('update-ready', subscription);
            };
        }
    },
    backend: {
      getUrl: () => ipcRenderer.invoke('get-backend-url'),
    }
};

contextBridge.exposeInMainWorld('electronAPI', api);
