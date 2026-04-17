// filepath: electron_app/scripts/publish.js
// Script auxiliar que carga el .env explícitamente antes de invocar electron-builder,
// resolviendo el problema de que el token no era detectado por el auto-loader de dotenv.
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Busca el .env en esta carpeta (electron_app) o en el directorio padre (raíz del proyecto)
function loadEnvFile() {
  const candidates = [
    path.resolve(__dirname, '..', '.env'),       // electron_app/.env
    path.resolve(__dirname, '..', '..', '.env'), // raíz del proyecto/.env
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;

    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.substring(0, eqIndex).trim();
      // Elimina comillas simples o dobles del valor si las tuviera
      let value = trimmed.substring(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
        console.log(`[publish] Env var loaded: ${key}=***`);
      }
    }
    console.log(`[publish] Loaded env from: ${envPath}`);
    break;
  }
}

loadEnvFile();

if (!process.env.GH_TOKEN) {
  console.error('[publish] ERROR: GH_TOKEN not found in .env file or environment. Cannot publish.');
  process.exit(1);
}

console.log('[publish] GH_TOKEN is set. Running electron-builder...');

try {
  execSync('npx electron-builder --publish always', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
} catch (err) {
  console.error('[publish] electron-builder failed:', err.message);
  process.exit(err.status || 1);
}
