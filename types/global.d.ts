export {};

declare global {
    interface Window {
        electronAPI: {
            updater: {
                onUpdateAvailable: (callback: (version: string) => void) => () => void;
                onUpdateReady: (callback: (version: string) => void) => () => void;
            };
            backend: {
                getUrl: () => Promise<string>;
            };
        };
    }
}
