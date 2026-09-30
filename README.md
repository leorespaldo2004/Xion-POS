# 📦 Xion POS - Sistema de Punto de Venta Offline-First

Sistema híbrido (Escritorio + Nube) diseñado para alta disponibilidad, inmutabilidad de datos y gestión dual de divisas (USD/Local).

---

## ⚡ Guía de Inicio Rápido (Desarrollo)

1. **Backend:** Configurar entorno Python:
   ```powershell
   py -3.12 -m venv .venv
   . .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
2. **Frontend:** Instalar dependencias e iniciar:
   ```powershell
   npm install
   npm run dev
   ```
3. **Electron:** En una segunda terminal, arrancar el contenedor:
   ```powershell
   npm run dev:electron
   ```

---

## 🛠️ Compilación y Empaquetado (.exe)

Hemos unificado todo el proceso en un solo comando para evitar errores manuales y bloqueos de archivos.

### Opción A: Compilación Local (Sin subir a GitHub)
```powershell
.\scripts\build_all.ps1
```
*Genera el ejecutable en `electron_app/dist/win-unpacked`.*

### Opción B: Publicar Release (Requiere GH_TOKEN)
```powershell
.\scripts\build_all.ps1 --publish
```
*Genera el instalador, firma el release y lo sube automáticamente a GitHub.*

---

## 📱 Aplicación Móvil (Xion POS Mobile - `/mobile_app`)

### ⚡ Modo de Desarrollo (Expo Go & Dev Client)
1. **Acceder al directorio móvil e instalar dependencias:**
   ```powershell
   cd mobile_app
   npm install
   ```
2. **Iniciar servidor de desarrollo (Expo Go):**
   ```powershell
   npx expo start
   ```
   * **Para probar en tu teléfono/tablet físico:** Descarga **Expo Go** desde Google Play Store o App Store y escanea el código QR generado (no requiere Android Studio ni ADB).*
   * **Para probar en un emulador Android (Opción `a`):** Requiere tener **Android Studio** instalado y la variable de entorno `ANDROID_HOME` configurada hacia `C:\Users\Usuario\AppData\Local\Android\Sdk` con `%ANDROID_HOME%\platform-tools` en el PATH.

3. **Iniciar en emulador o cliente de desarrollo nativo (Dev Build):**

### 🛠️ Compilación y Despliegue (EAS Build & OTA Updates)

1. **Generar APK de prueba (Development Build para probar SQLite y Periféricos):**
   ```powershell
   npx eas build --profile development --platform android
   ```

2. **Generar APK / AAB de Producción:**
   ```powershell
   npx eas build --profile production --platform android
   ```

3. **Publicar Actualización Silenciosa Over-The-Air (OTA):**
   ```powershell
   npx eas update --branch production --message "Actualización de catálogo y parches"
   ```

---

## 🛡️ Reglas de Oro para Producción

1. **Permisos:** La base de datos local se guarda en `%APPDATA%/XionPOS` para evitar errores de escritura en `Program Files`.
2. **Seguridad:** El proceso principal se compila a **Bytecode V8** (`main.jsc`). No intentes editar `dist/bootstrap.js` manualmente.
3. **Hardware:** Asegúrate de que el puerto `8000` esté libre para el backend Python.

---

## 🧹 Resolución de Problemas (Zombies)

Si el instalador falla con el error `Acceso denegado` o `EPERM`, ejecuta esto en PowerShell como Administrador:
```powershell
taskkill /F /IM XionPOS.exe /T; taskkill /F /IM electron.exe /T; taskkill /F /IM xion_backend.exe /T
```

## 📜 Licencia
Propiedad de **XionPOS DevMaster**. Todos los derechos reservados.
