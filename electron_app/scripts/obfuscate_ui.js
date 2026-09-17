// electron_app/scripts/obfuscate_ui.js
// -----------------------------------------------------------------------------
// ARCHITECT: DEV MASTER POS
// MODULE: Frontend Obfuscation Script
// CONTEXT: Anti-Tamper Security (Javascript Obfuscator)
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const OUT_DIR = path.join(__dirname, '../../out'); // Carpeta donde Next.js exporta
const JS_DIR = path.join(OUT_DIR, '_next'); // Directorio base donde Next deja assets

function obfuscateDirectory(directory) {
    if (!fs.existsSync(directory)) {
        console.error(`[Error] Directorio no encontrado: ${directory}. Ejecuta 'npm run compile:frontend' primero.`);
        return;
    }

    const entries = fs.readdirSync(directory);

    for (const entry of entries) {
        const fullPath = path.join(directory, entry);

        if (fs.statSync(fullPath).isDirectory()) {
            obfuscateDirectory(fullPath);
        } else if (fullPath.endsWith('.js')) {
            try {
                console.log(`[Shield] Ofuscando: ${path.relative(OUT_DIR, fullPath)}`);
                const sourceCode = fs.readFileSync(fullPath, 'utf8');

                const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
                    compact: true,
                    controlFlowFlattening: true,
                    controlFlowFlatteningThreshold: 0.5,
                    numbersToExpressions: true,
                    simplify: true,
                    stringArray: true,
                    stringArrayEncoding: ['base64'],
                    stringArrayThreshold: 0.8,
                    unicodeEscapeSequence: false
                });

                fs.writeFileSync(fullPath, obfuscationResult.getObfuscatedCode(), 'utf8');
            } catch (err) {
                console.error('[Shield] Error ofuscando', fullPath, err);
            }
        }
    }
}

console.log('--- Iniciando Blindaje de Componentes UI ---');
obfuscateDirectory(JS_DIR);
console.log('--- UI Blindada con Éxito ---');
