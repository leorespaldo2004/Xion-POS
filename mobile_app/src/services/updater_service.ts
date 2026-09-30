declare const __DEV__: boolean;

export const updaterService = {
  async checkForUpdates(): Promise<{ hasUpdate: boolean; message: string }> {
    return { hasUpdate: false, message: 'Actualizaciones OTA no disponibles en Expo Go' };
  },

  async fetchAndReload(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'No disponible en Expo Go' };
  }
};
