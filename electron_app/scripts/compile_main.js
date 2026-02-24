// electron_app/scripts/compile_main.js
// Transpila `src/main/main.ts` a `dist/main.js` y lo compila a bytecode V8 (.jsc) con bytenode

const esbuild = require('esbuild');
const bytenode = require('bytenode');
const path = require('path');
const fs = require('fs');

const entry = path.join(__dirname, '../src/main/main.ts');
const outDir = path.join(__dirname, '../dist');
const outFile = path.join(outDir, 'main.js');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('[build] Transpiling main.ts -> dist/main.js');

esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: outFile,
  target: ['node20'],
  sourcemap: false,
  external: ['electron', 'sqlite3', 'pysqlcipher3', 'bytenode']
}).then(() => {
  console.log('[build] Transpiled successfully');

  try {
    const jscOut = path.join(outDir, 'main.jsc');
    console.log(`[build] Compiling ${outFile} -> ${jscOut}`);
    bytenode.compileFile({ filename: outFile, output: jscOut });
    console.log('[build] Bytecode compiled successfully at', jscOut);
    // Forzamos la salida para evitar procesos huérfanos cuando Electron ejecuta esto
    process.exit(0);
  } catch (err) {
    console.error('[build] bytenode compilation failed:', err);
    process.exit(1);
  }

}).catch((err) => {
  console.error('[build] esbuild failed:', err);
  process.exit(1);
});
