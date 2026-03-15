// electron_app/vitest.config.ts
// Configuration for Electron Main Process unit tests.
// Isolates the Node/CJS test environment from the Frontend ESM configuration.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Definimos el entorno como Node.js estricto (no jsdom ni DOM)
    environment: 'node',
    
    // Inyecta describe, it, expect globalmente para no importarlos en cada archivo
    globals: true,
    
    // Rutas de inclusión de nuestras pruebas
    include: ['tests/**/*.test.ts'],
    
    // Exclusiones de seguridad
    exclude: ['node_modules', 'dist', 'scripts'],
    
    // Configuración opcional de cobertura de código
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/main/**/*.ts'],
    },
  },
});
