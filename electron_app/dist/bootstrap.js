// electron_app/dist/bootstrap.js
// -----------------------------------------------------------------------------
// ARCHITECT: DEV MASTER POS
// MODULE: V8 Bytecode Bootstrap
// CONTEXT: Carga de manera segura el Main Process pre-compilado en Electron
// -----------------------------------------------------------------------------

require('bytenode');

// 1. Escudos de Debugging (Atrapan cualquier error que cierre la app)
process.on('uncaughtException', (error) => {
    console.error('\n🚨 [CRASH CRÍTICO] Excepción no capturada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n🚨 [CRASH CRÍTICO] Promesa rechazada (¿Falla al cargar index.html?):', reason);
});

console.log('[bootstrap] Arrancando en modo diagnóstico...');

// 2. Bypass Temporal: Usamos .js en vez de .jsc SOLO PARA LEER EL ERROR CLARAMENTE
require('./main.js');
