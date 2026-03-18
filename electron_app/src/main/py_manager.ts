import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
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

  private getEngineCommand(): { cmd: string; args: string[]; cwd?: string } {
    const isDev = !app.isPackaged;
    if (!isDev) {
      const exePath = path.join(process.resourcesPath, 'backend', 'xion_backend.exe');
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
      const msg = `Virtual environment not found. Checked:\n${candidates
        .map((root) => path.join(root, '.venv', 'Scripts', 'python.exe'))
        .join('\n')}`;
      log.error(`[PyManager] ${msg}`);
      throw new Error(msg);
    }

    const projectRoot = path.resolve(pythonPath, '..', '..', '..');
    return { cmd: pythonPath, args: ['-m', 'local_backend.main'], cwd: projectRoot };
  }

  public async start(): Promise<string> {
    if (this.backendProcess) {
      return `http://${this.host}:${this.port}`;
    }

    const command = this.getEngineCommand();
    log.info(`[PyManager] Starting backend: ${command.cmd} ${command.args.join(' ')}`);

    this.backendProcess = spawn(command.cmd, command.args, {
      cwd: command.cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    this.backendProcess.stdout?.on('data', (data: Buffer) => {
      log.info(`[Python] ${data.toString().trim()}`);
    });
    this.backendProcess.stderr?.on('data', (data: Buffer) => {
      log.error(`[Python] ${data.toString().trim()}`);
    });
    this.backendProcess.on('exit', (code) => {
      log.warn(`[PyManager] Python backend exited with code ${code}`);
      this.backendProcess = null;
    });

    await this.waitForHealth(10000);
    return `http://${this.host}:${this.port}`;
  }

  public stop(): void {
    if (this.backendProcess) {
      this.backendProcess.kill();
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
            reject(new Error('Backend health timeout'));
          } else {
            setTimeout(check, 250);
          }
        });

        req.on('error', () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error('Backend health timeout'));
          } else {
            setTimeout(check, 250);
          }
        });

        req.on('timeout', () => {
          req.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error('Backend health timeout'));
          } else {
            setTimeout(check, 250);
          }
        });
      };

      check();
    });
  }
}

export const pyManager = new PythonBackendManager();
