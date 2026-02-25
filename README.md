# 🧪 Comandos de prueba

Para instalar en tu entorno local (PowerShell):

python -m venv .venv
; .venv\\Scripts\\Activate.ps1
; pip install --upgrade pip
; pip install -r requirements.txt

cd electron_app
npm ci
# Ejecutar tests (si tienes vitest instalado en devDeps)
npx vitest run
# Construir y publicar (requiere GH_TOKEN en el entorno)
npx electron-builder --publish always

