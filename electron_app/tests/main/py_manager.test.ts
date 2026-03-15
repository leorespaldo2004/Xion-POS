// electron_app/tests/main/py_manager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as child_process from 'child_process';
import fs from 'fs';

vi.mock('electron', () => ({ app: { isPackaged: false } }));
vi.mock('electron-log', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('child_process', () => ({ spawn: vi.fn() }));

vi.mock('http', () => ({
  default: {
    get: vi.fn((opts: any, callback: (res: any) => void) => {
      const res = { statusCode: 200 };
      setTimeout(() => callback(res), 0);
      return { on: vi.fn(), destroy: vi.fn() };
    }),
  },
}));

import { PythonBackendManager } from '../../src/main/py_manager';


describe('PythonBackendManager', () => {
  let manager: PythonBackendManager;
  let spawnMock: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    spawnMock = vi.fn(() => ({ stdout: { on: vi.fn() }, stderr: { on: vi.fn() }, on: vi.fn(), kill: vi.fn() }));
    (child_process.spawn as any) = spawnMock;
    manager = new PythonBackendManager();
  });

  it('starts backend and returns URL', async () => {
    const url = await manager.start();
    expect(url).toBe('http://127.0.0.1:8000');
    expect(spawnMock).toHaveBeenCalled();
  });

  it('stops backend process', async () => {
    await manager.start();
    manager.stop();
    expect((manager as any).backendProcess).toBeNull();
  });
});
