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
