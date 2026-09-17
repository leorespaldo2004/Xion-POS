const fs = require('fs');
const path = require('path');

const rootPackagePath = path.resolve(__dirname, '../package.json');
const electronPackagePath = path.resolve(__dirname, '../electron_app/package.json');
const pythonMainPath = path.resolve(__dirname, '../local_backend/main.py');

try {
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  const version = rootPackage.version;

  console.log(`[Version Sync] Target version: ${version}`);

  // Sync electron_app/package.json
  if (fs.existsSync(electronPackagePath)) {
    const electronPackage = JSON.parse(fs.readFileSync(electronPackagePath, 'utf8'));
    electronPackage.version = version;
    fs.writeFileSync(electronPackagePath, JSON.stringify(electronPackage, null, 2) + '\n', 'utf8');
    console.log(`[Version Sync] Updated electron_app/package.json to v${version}`);
  }

  // Sync local_backend/main.py
  if (fs.existsSync(pythonMainPath)) {
    let pythonMain = fs.readFileSync(pythonMainPath, 'utf8');
    pythonMain = pythonMain.replace(/version\s*=\s*"[^"]+"/, `version="${version}"`);
    fs.writeFileSync(pythonMainPath, pythonMain, 'utf8');
    console.log(`[Version Sync] Updated local_backend/main.py to v${version}`);
  }

  console.log('[Version Sync] Success.');
} catch (e) {
  console.error('[Version Sync] Failed:', e);
  process.exit(1);
}
