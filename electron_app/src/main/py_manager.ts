// electron_app/src/main/py_manager.ts

import { app } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

/**
 * ARCHITECT: DEV MASTER POS
 * MODULE: Python Local Backend Manager
 * CONTEXT: Orchestrates the FastAPI subprocess. Ensures it dies when Electron dies.
 */

class PythonBackendManager {
    private backendProcess: ChildProcess | null = null;
    private readonly port: number = 8000;

    /**
     * Inicia el proceso de Python.
     * Diferencia entre entorno de desarrollo (script) y producción (binario PyInstaller).
     */
    public startBackend(): void {
        const isPackaged = app.isPackaged;
        
        let command = '';
        let args: string[] = [];

        if (isPackaged) {
            // Producción: Llama al ejecutable compilado por PyInstaller
            // Asegura que nadie pueda inyectar scripts no empaquetados.
            command = path.join(process.resourcesPath, 'local_backend', 'pos_engine.exe'); 
        } else {
            // Desarrollo: Usa el entorno virtual de Python
            command = path.join(__dirname, '../../..', 'local_backend', 'venv', 'Scripts', 'python.exe');
            const scriptPath = path.join(__dirname, '../../..', 'local_backend', 'app', 'main.py');
            args = [scriptPath];
        }

        console.log(`[PyManager] Starting Local Engine: ${command} ${args.join(' ')}`);

        try {
            this.backendProcess = spawn(command, args, {
                cwd: isPackaged ? process.resourcesPath : path.join(__dirname, '../../..', 'local_backend'),
                detached: false // El hijo DEBE morir si el padre muere
            });

            this.backendProcess.stdout?.on('data', (data: Buffer) => {
                console.log(`[FastAPI stdout]: ${data.toString().trim()}`);
            });

            this.backendProcess.stderr?.on('data', (data: Buffer) => {
                console.error(`[FastAPI stderr]: ${data.toString().trim()}`);
            });

            this.backendProcess.on('close', (code: number | null) => {
                console.warn(`[PyManager] Backend process exited with code ${code}`);
                this.backendProcess = null;
            });

        } catch (error) {
            console.error(`[PyManager] Critical Error starting backend:`, error);
            // Si el backend no levanta, la caja no opera. Lockdown.
            app.quit();
        }
    }

    /**
     * Garantiza la terminación limpia de las transacciones locales antes de cerrar.
     */
    public killBackend(): void {
        if (this.backendProcess) {
            console.log('[PyManager] Terminating Local Backend Gracefully...');
            try {
                this.backendProcess.kill('SIGTERM' as any);
            } catch (e) {
                console.warn('[PyManager] Error sending SIGTERM, forcing kill.', e);
                try {
                    this.backendProcess.kill();
                } catch (_) {
                    // silenciar
                }
            }
            this.backendProcess = null;
        }
    }
}

export const pyManager = new PythonBackendManager();
