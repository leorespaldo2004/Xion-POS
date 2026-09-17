import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess, execSync } from 'child_process';
import log from 'electron-log';
import http from 'http';

const BACKEND_DEFAULT_PORT = 8000;

export class PythonBackendManager {
  private backendProcess: ChildProcess | null = null;
  private readonly port: number;
  private readonly host: string = '127.0.0.1';

  constructor(port: number = BACKEND_DEFAULT_PORT) {
    this.port = port;
  }

  private killExistingProcesses(): void {
    if (process.platform !== 'win32') return;
    
    try {
      log.info('[PyManager] Cleaning up existing backend processes...');
      execSync('taskkill /F /IM xion_backend.exe /T', { stdio: 'ignore' });
    } catch (e) {
      // Ignore
    }
  }

  private getEngineCommand(): { cmd: string; args: string[]; cwd?: string } {
    const isDev = !app.isPackaged;
    if (!isDev) {
      const exePath = path.join(process.resourcesPath, 'backend', 'xion_backend.exe');
      if (!fs.existsSync(exePath)) {
        log.error(`[PyManager] Backend executable NOT FOUND at: ${exePath}`);
        throw new Error(`Backend no encontrado en: ${exePath}`);
      }
      return { cmd: exePath, args: [] };
    }

    const candidates = [
      path.resolve(__dirname, '..', '..'),
      path.resolve(__dirname, '..'),
      process.cwd(),
      path.resolve(process.cwd(), '..'),
    ];

    let pythonPath: string | null = null;
    for (const root of candidates) {
      const candidate = path.join(root, '.venv', 'Scripts', 'python.exe');
      if (fs.existsSync(candidate)) {
        pythonPath = candidate;
        log.info(`[PyManager] Dev Python found at: ${pythonPath}`);
        break;
      }
    }

    if (!pythonPath) {
      throw new Error('Virtual environment python.exe not found for dev environment');
    }

    const projectRoot = path.resolve(pythonPath, '..', '..', '..');
    return { cmd: pythonPath, args: ['-m', 'local_backend.main'], cwd: projectRoot };
  }

  public async start(): Promise<string> {
    if (this.backendProcess) {
      return `http://${this.host}:${this.port}`;
    }

    this.killExistingProcesses();

    const command = this.getEngineCommand();
    log.info(`[PyManager] Starting backend: ${command.cmd} ${command.args.join(' ')}`);

    this.backendProcess = spawn(command.cmd, command.args, {
      cwd: command.cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    });

    this.backendProcess.stdout?.on('data', (data: Buffer) => {
      log.debug(`[Python] ${data.toString().trim()}`);
    });
    this.backendProcess.stderr?.on('data', (data: Buffer) => {
      log.error(`[Python] ${data.toString().trim()}`);
    });

    const exitPromise = new Promise<void>((_, reject) => {
      if (this.backendProcess) {
        this.backendProcess.once('exit', (code) => {
          log.warn(`[PyManager] Python backend exited prematurely with code ${code}`);
          this.backendProcess = null;
          reject(new Error(`Backend exited code ${code}`));
        });
      }
    });

    try {
      await Promise.race([
        this.waitForHealth(60000),
        exitPromise
      ]);
    } catch (error) {
      log.error('[PyManager] Health check failed or backend crashed:', error);
      this.stop();
      throw error;
    }

    return `http://${this.host}:${this.port}`;
  }

  public stop(): void {
    if (this.backendProcess) {
      log.info('[PyManager] Stopping backend process tree...');
      if (process.platform === 'win32' && this.backendProcess.pid) {
        try {
          execSync(`taskkill /PID ${this.backendProcess.pid} /F /T`, { stdio: 'ignore' });
        } catch (e) {
          try { this.backendProcess.kill(); } catch (err) {}
        }
      } else {
        try { this.backendProcess.kill(); } catch (err) {}
      }
      this.backendProcess = null;
    }
  }

  private waitForHealth(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const check = () => {
        const req = http.get({ host: this.host, port: this.port, path: '/health', timeout: 1000 }, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else if (Date.now() - start > timeoutMs) {
            reject(new Error('Backend health check timed out'));
          } else {
            setTimeout(check, 500);
          }
        });

        req.on('error', () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error('Backend health check timed out (conn error)'));
          } else {
            setTimeout(check, 500);
          }
        });

        req.on('timeout', () => {
          req.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error('Backend health check timed out (req timeout)'));
          } else {
            setTimeout(check, 500);
          }
        });
      };

      setTimeout(check, 1000);
    });
  }
}

export const pyManager = new PythonBackendManager();

