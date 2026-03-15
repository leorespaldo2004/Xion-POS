// electron_app/tests/main/updater.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppUpdater } from '../../src/main/updater';
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

vi.mock('electron-updater', () => ({
    autoUpdater: {
        logger: {},
        autoDownload: false,
        autoInstallOnAppQuit: false,
        checkForUpdatesAndNotify: vi.fn(),
        on: vi.fn(),
    }
}));

vi.mock('electron-log', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}));

describe('AppUpdater Module (Offline Resilience)', () => {
    let mockWindow: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockWindow = {
            webContents: {
                send: vi.fn()
            }
        };
    });

    it('should initialize without crashing and set proper flags', () => {
        const updater = new AppUpdater(mockWindow as unknown as BrowserWindow);
        
        expect((autoUpdater as any).autoDownload).toBe(true);
        expect((autoUpdater as any).autoInstallOnAppQuit).toBe(true);
        expect((autoUpdater as any).on).toHaveBeenCalledWith('checking-for-update', expect.any(Function));
    });

    it('should handle offline network gracefully during update check', () => {
        const networkError = new Error('net::ERR_INTERNET_DISCONNECTED');
        ((autoUpdater as any).checkForUpdatesAndNotify as any).mockRejectedValueOnce(networkError);

        const updater = new AppUpdater(mockWindow as unknown as BrowserWindow);
        
        expect(() => updater.checkForUpdates()).not.toThrow();
        
        expect((autoUpdater as any).checkForUpdatesAndNotify).toHaveBeenCalledTimes(1);
    });

    it('should attach listeners for update events', () => {
        const updater = new AppUpdater(mockWindow as unknown as BrowserWindow);
        const events = ['update-available', 'update-downloaded', 'error'];
        events.forEach(e => {
            expect((autoUpdater as any).on).toHaveBeenCalledWith(e, expect.any(Function));
        });
    });
});
