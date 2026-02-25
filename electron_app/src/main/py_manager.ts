// electron_app/src/main/py_manager.ts

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import log from 'electron-log';

/**
 * ARCHITECT: DEV MASTER POS
 * MODULE: Python Local Backend Manager
 * CONTEXT: Orchestrates the FastAPI subprocess. Ensures it dies when Electron dies.
 */

export class PythonBackendManager {
    private backendProcess: ChildProcess | null = null;
    private readonly port: number = 8000;

    private getEngineCommand(): { cmd: string; args: string[] } {
        if (app.isPackaged) {
            // MODO PRODUCCIÓN: Apuntamos al binario congelado (Offline-First)
            const exePath = path.join(process.resourcesPath, 'backend', 'xion_backend.exe');
            return { cmd: exePath, args: [] };
        } else {
            // MODO DESARROLLO: Apuntamos dinámicamente al .venv dentro de "Xion POS"
            // Asumiendo que __dirname es electron_app/dist/main
            const projectRoot = path.resolve(__dirname, '..', '..', '..');
            const pythonPath = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
            const mainPyPath = path.join(projectRoot, 'local_backend', 'app', 'main.py');

            if (!fs.existsSync(pythonPath)) {
                log.error(`[CRÍTICO] Motor Python no encontrado en: ${pythonPath}`);
                throw new Error(`Virtual Environment no detectado. Revisa la ruta: ${pythonPath}`);
            }

            if (!fs.existsSync(mainPyPath)) {
                log.error(`[CRÍTICO] Archivo main.py no encontrado en: ${mainPyPath}`);
                throw new Error(`Archivo main.py no encontrado. Revisa la ruta: ${mainPyPath}`);
            }

            return { cmd: pythonPath, args: [mainPyPath] };
        }
    }

    public startBackend(): void {
        let cmd: string;
        let args: string[];

        try {
            const engine = this.getEngineCommand();
            cmd = engine.cmd;
            args = engine.args;
        } catch (err) {
            log.error('[PyManager] startBackend aborted:', err);
            // No queremos que un ENOENT rompa todo el proceso de Electron en desarrollo.
            return;
        }

        log.info(`[PyManager] Starting Local Engine: ${cmd} ${args.join(' ')}`);

        try {
            this.backendProcess = spawn(cmd, args, { stdio: 'pipe' });

            this.backendProcess.stdout?.on('data', (data: Buffer) => {
                log.info(`[FastAPI stdout]: ${data.toString().trim()}`);
            });

            this.backendProcess.stderr?.on('data', (data: Buffer) => {
                log.error(`[FastAPI stderr]: ${data.toString().trim()}`);
            });

            this.backendProcess.on('exit', (code: number | null) => {
                log.warn(`[PyManager] Backend process exited with code ${code}`);
                this.backendProcess = null;
            });

        } catch (error) {
            log.error(`[PyManager] Critical Error starting backend: ${error}`);
        }
    }

    public killBackend(): void {
        if (this.backendProcess) {
            log.info('[PyManager] Terminating Local Backend Gracefully...');
            try {
                this.backendProcess.kill('SIGTERM' as any);
            } catch (e) {
                log.warn('[PyManager] Error sending SIGTERM, forcing kill.', e);
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
