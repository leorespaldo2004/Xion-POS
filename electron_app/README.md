# Xion POS - Electron App (mini README)

Resumen rápido: este README contiene los pasos mínimos para desarrollar, testear y producir releases del cliente de escritorio (`electron_app`).

Requisitos previos
- Node.js v20 (LTS) y npm v10
- Python 3.12 (para generar el binario con PyInstaller en CI)
- `pyinstaller` disponible en el entorno de CI/Build
- `GH_TOKEN` en Secrets de GitHub para publicar Releases

Pasos para desarrollo local

1. Entrar al subdirectorio:

```bash
cd "C:\Users\Leo\Desktop\PA2 - copia\Xion POS\electron_app"
```

2. Instalar dependencias (genera `package-lock.json`):

```bash
npm install
```

3. Compilar TypeScript (si aplica):

```bash
npm run build:ts
```

4. Ejecutar la app en modo desarrollo (usa el código en `out/` o `http://localhost:3000`):

```bash
npm run start
```

Ejecutar tests unitarios

```bash
npx vitest run
```

Pipeline de release (CI)

1. El workflow `.github/workflows/release.yml` compila el backend con `pyinstaller`, genera el binario en `local_backend/dist` y después ejecuta `electron-builder` para empaquetar y publicar en GitHub Releases.
2. Asegúrate de establecer `GH_TOKEN` en los Secrets del repositorio y de ajustar `owner`/`repo` en `electron_app/package.json`.
3. Para producción, configura firma de código en `electron-builder` para Windows/macOS (recomendado).

Comandos de empaquetado local

```bash
# Generar binario Python (ejecutar desde raiz del repo)
# (Requiere pyinstaller instalado en tu Python env)
cd local_backend
pyinstaller --name xion_backend --onefile main.py

# Empaquetar Electron (desde electron_app)
cd ../electron_app
npm run dist
```

Notas importantes
- `py_manager` busca el binario en `resources/backend/xion_backend.exe` cuando la app está empaquetada.
- En desarrollo, `py_manager` intenta usar `.<project>/.venv/Scripts/python.exe` (revisa que exista). Si no existe, el backend no iniciará y se registrará un error en el log.
- Configura certificados de firma de código para evitar advertencias de Windows/macOS al actualizar via OTA.

Contacto
- Equipo: XionPOS DevMaster <admin@xionpos.com>