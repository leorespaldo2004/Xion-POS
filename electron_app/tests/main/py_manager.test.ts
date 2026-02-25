// electron_app/tests/main/py_manager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as child_process from 'child_process';
import fs from 'fs';

// Mockear electron antes de importar la clase que usa `app.isPackaged`
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn().mockReturnValue('/mock/app/path')
  }
}));

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn()
  },
  existsSync: vi.fn()
}));

import { PythonBackendManager } from '../../src/main/py_manager';

describe('PythonBackendManager', () => {
  let pyManager: PythonBackendManager;
  let mockKill: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Le decimos al manager que python.exe SÍ existe
    (fs.existsSync as any).mockReturnValue(true);

    mockKill = vi.fn();

    (child_process.spawn as any).mockReturnValue({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: mockKill
    });

    pyManager = new PythonBackendManager();
  });

  it('should spawn the python process in development mode', () => {
    pyManager.startBackend();

    expect((child_process.spawn as any)).toHaveBeenCalled();

    const callArgs = (child_process.spawn as any).mock.calls[0];
    expect(callArgs[0]).toMatch(/python\.exe$/i);
  });

  it('should kill the process with SIGTERM when requested', () => {
    pyManager.startBackend();
    pyManager.killBackend();

    expect(mockKill).toHaveBeenCalledWith('SIGTERM');
  });
});
// electron_app/tests/main/py_manager.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pyManager } from '../../src/main/py_manager';
import child_process from 'child_process';
import { app } from 'electron';

// Mocks para evitar ejecutar binarios reales en el CI
vi.mock('child_process');
vi.mock('electron', () => ({
    app: {
        isPackaged: false,
        quit: vi.fn(),
    }
}));

describe('PythonBackendManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should spawn the python process in development mode', () => {
        const spawnMock = vi.mocked(child_process.spawn).mockReturnValue({
            stdout: { on: vi.fn() },
            stderr: { on: vi.fn() },
            on: vi.fn(),
            kill: vi.fn()
        } as any);

        pyManager.startBackend();
        
        expect(spawnMock).toHaveBeenCalled();
        const callArgs = spawnMock.mock.calls[0];
        // Verifica que usa el python.exe en desarrollo
        expect(callArgs[0]).toMatch(/python\.exe$/);
    });

    it('should kill the process with SIGTERM when requested', () => {
        const mockKill = vi.fn();
        vi.mocked(child_process.spawn).mockReturnValue({
            stdout: { on: vi.fn() },
            stderr: { on: vi.fn() },
            on: vi.fn(),
            kill: mockKill
        } as any);

        pyManager.startBackend();
        pyManager.killBackend();

        expect(mockKill).toHaveBeenCalledWith('SIGTERM');
    });
});
