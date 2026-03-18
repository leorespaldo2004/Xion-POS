# 🧪 Comandos de prueba y despliegue (Windows)

Este proyecto se compone de dos piezas:

1. **Interfaz de usuario React** desarrollada con Vite en `src/`.
2. **Aplicación Electron** con el backend Python y actualizador integrado.

A continuación tienes el flujo completo para compilar, empaquetar y generar un instalador `.exe` que puede subirse como *release* de GitHub (`auto-update` preparado).

---

## 1. Preparar entorno Python

> 🛠 **Modo desarrollador (rápido)**
>
> Durante el desarrollo conviene tener dos terminales separados:
>
> 1. **Servidor de UI**: ejecuta el siguiente comando en la raíz del repositorio
>    (ya existe como `npm run dev`, también alias `npm run dev:vite`):
>
>    ```bash
>    npm run dev          # o npm run dev:vite
>    ```
>
>    Esto lanza Vite en modo de desarrollo. Por defecto Vite sirve en
    `http://localhost:5173` (no 3000), y el proceso de Electron está
    configurado para conectar con ese puerto.

    Para desarrollo completo:
    ```bash
    npm run dev:vite
    npm run dev:electron
    ```

    Si cambias el puerto en `vite.config.ts`, exporta `VITE_DEV_SERVER_URL`
    antes de ejecutar `npm run dev:electron`.
>
> 2. **Proceso Electron**: en otra consola ejecuta el proceso de escritorio,
>    que consumirá la URL anterior. Hay un script nuevo para ello:
>
>    ```bash
>    npm run dev:electron
>    ```
>
>    Este comando hace `cd electron_app && npm run start`, cargando
>    directamente desde el código fuente sin empaquetar. Si necesitas que el
>    main se recompile al vuelo puedes también ejecutar `npm run build:ts -w`
>    dentro de `electron_app` o usar un watcher.
>
>  
> Con ambos servicios levantados, abre la aplicación y usa DevTools para
> diagnosticar cualquier error (ver sección de depuración más abajo).
>

## 1. Preparar entorno Python

```powershell
py -3.12 -m venv .venv
. .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

Este paso configura el backend local que se invoca desde Electron en modo desarrollo.

## 2. Compilar la interfaz (UI)

```bash
# desde la raíz del repositorio
npm install          # instala dependencias de Node (incluye electron-updater requerido)
# si prefieres, también puedes ejecutar:
# npm install electron-updater
npm run build        # construye con Vite y copia a electron_app/dist/out
```

`npm run build` ejecuta internamente `npm run build:ui` que compila el frontend y
lanza `scripts/copy_out.js` para mover los archivos estáticos hacia
`electron_app/dist/out`.

## 3. Compilar el proceso principal de Electron

```bash
npm run build:main   # transpila y empaqueta el código main.ts a bytecode
```

> ⚠️ **Nota importante:** Internamente este comando ahora ejecuta `electron`
> para arrancar `electron_app/scripts/compile_main.js`. Esto garantiza que
> el bytecode se genere utilizando el motor V8 **exacto** de la versión de
> Electron que luego ejecutará el `.exe`. Si ves un error `cachedDataRejected`
> en tiempo de ejecución significa que estás compilando con un Node diferente.
> La preinstalación en `package.json` también fuerza Node v20 en el entorno de
> empaquetado.

El fichero resultante `electron_app/dist/main.jsc` será incluido en el
instalador.

## 4. Generar el instalador Windows (.exe)

Entra en la carpeta de Electron y usa `electron-builder` o los scripts
preconfigurados:

```bash
cd electron_app
npm ci                 # instalación limpia para el empaquetado
# opcional: ejecutar tests unitarios
npx vitest run

# opción A: usar los scripts expuestos (incluyen compilación TS + seguridad)
# ahora también ejecutan `npm run clean` para evitar artefactos colgados
npm run pack           # crea instalación en dist/win-unpacked sin publicar
npm run dist           # empaqueta y, si GH_TOKEN está presente, publica

# opción B (manual):
# construir y publicar el instalador en GitHub (GH_TOKEN debe estar set)
# el flag --publish always hará que se suba automáticamente como release
npx electron-builder --publish always
```

## Crear un tag para disparar el release (GitHub Actions)

El workflow de release se dispara cuando empujas un tag que comience con `v`.
Por ejemplo:

```powershell
# desde la rama principal
git checkout main
git pull

git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

También puedes crear el tag y empujarlo en un solo paso:

```powershell
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin --tags
```

> Asegúrate de usar el prefijo `v` (ej. `v1.2.3`) para que coincida con
> `on: push: tags: - 'v*'` en `.github/workflows/release.yml`.

> ⚠️ **Nota adicional (AV y rcedit):** si el proceso falla con
> `Fatal error: Unable to commit changes` durante la fase de icono/metadata,
> sigue la sección **Bloqueos de Windows/"zombies"** abajo: el Antivirus suele
> interceptar a `rcedit-x64.exe` o dejar el ejecutable bloqueado. Añade una
> exclusión en Windows Security para `electron_app` o desactiva temporalmente
> la protección en tiempo real antes de empaquetar.

#
> ⚠️ **Bloqueos de Windows/"zombies"**
> 
> Si al ejecutar `npm run pack` o `npm run dist` recibes un error tipo *`Acceso denegado`* o
> *`EPERM: operation not permitted`* mientras se limpia `dist/win-unpacked`, significa que un
> proceso de Electron quedó ejecutándose o el sistema está manteniendo archivos abiertos. Antes
> de volver a empaquetar:
> 
> 1. Cierra cualquier instancia de la aplicación.
> 2. Termina los procesos residuales con:
>    ```powershell
>    taskkill /F /IM XionPOS.exe /T
>    taskkill /F /IM electron.exe /T
>    taskkill /F /IM xion_backend.exe /T   # también cierra el servicio Python si sigue vivo
> antiguos automáticamente.
> ```
> 
> 3. **(Nuevo)** elimina manualmente la carpeta `dist` si sigue bloqueada y considera añadirla
>    como exclusión en el Antivirus.
> 4. Asegúrate de que tengas un ícono válido configurado (ver campo `build.win.icon`),
>    porque `rcedit` también puede fallar si el archivo de ícono no existe.

El comando anterior generará un `.exe` en `electron_app/dist/win-unpacked` y
subirá el artefacto como **release** en GitHub. El instalador contiene el
mecanismo de auto‑actualización (AppUpdater) que apuntará al repositorio donde
publicaste el exe.

Si no quieres publicar automáticamente, ejecuta `npx electron-builder` sin el
argumento `--publish` y sube el archivo manualmente.

#
> ⚠️ **Bloqueos de Windows/"zombies"**
>
> Si al ejecutar `npm run pack` o `npm run dist` recibes un error tipo *`Acceso denegado`* o
> *`EPERM: operation not permitted`* mientras se limpia `dist/win-unpacked`, significa que un
> proceso de Electron quedó ejecutándose o el sistema está manteniendo archivos abiertos. Antes
> de volver a empaquetar:
>
> 1. Cierra cualquier instancia de la aplicación.
> 2. Termina los procesos residuales con:
>    ```powershell
>    taskkill /F /IM XionPOS.exe /T
>    taskkill /F /IM electron.exe /T
>    taskkill /F /IM xion_backend.exe /T   # también cierra el servicio Python si sigue vivo
> antiguos automáticamente.

# 5. Probar el actualizador

> ⚠️ **Corrección de dependencias y zombi killers**
>
> * `bytenode` **debe** instalarse como dependencia de producción dentro de
>   `electron_app` (no sólo como devDependency en la raíz). El bootstrap.js lo
>   carga en runtime y `electron-builder` elimina automaticamente devDependencies
>   del paquete. Tras la actualización anterior, ejecuta:
>   ```powershell
>   cd electron_app
>   npm uninstall bytenode       # si existe en devDeps
>   npm install bytenode --save  # fuerza su inclusión en dependencies
>   ```
>
> * La lógica de cierre ahora aplica un "Nuclear Kill Switch" para el backend
>   Python. Si ves procesos `xion_backend.exe` o `XionPOS.exe` quedándose en el
>   administrador de tareas tras cerrar la ventana, reconstruye el instalador y
>   prueba de nuevo: el gestor encontrará el binario por nombre antes de matar
>   cualquier PID erróneo.

# 5. Probar el actualizador

1. Instala la versión `.exe` generada en un equipo Windows.
2. Sube una nueva versión (bump `package.json` version) y vuelve a ejecutar el
   builder; GitHub creará un release con un nuevo archivo.
3. La aplicación en ejecución comprobará periódicamente actualizaciones y
   mostrará la notificación + descargará el nuevo instalador en segundo plano.
4. Puedes simular eventos de `updater` en tests unitarios (`vx_hooks/...`).

---

### Notas adicionales

* No uses `--force` ni `--legacy-peer-deps` en `npm install`.
* El esquema de auto‑update utiliza [electron-updater](https://github.com/electron-userland/electron-builder/wiki/Auto-Update) y requiere que la release sea accesible (public).
* Para desarrollo rápido puedes iniciar solo la UI con `npm run dev` (alias ``),
  arrancar el backend Python local y, en otra terminal, lanzar el escritorio con
  `npm run dev:electron`.

¡Con esto podrás compilar, empaquetar y generar automáticamente los ejecutables
para verificar el auto‑updater! Si necesitas más ayuda con `electron-builder`
o la configuración del release, avísame.
