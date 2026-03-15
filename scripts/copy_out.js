const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../out');
const dest = path.resolve(__dirname, '../electron_app/dist/out');

if (!fs.existsSync(src)) {
  console.error('[copy_out] source directory does not exist:', src);
  process.exit(1);
}

// ensure destination exists
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

// copy recursively
fs.cpSync(src, dest, { recursive: true });

console.log('[copy_out] copied UI build to', dest);
