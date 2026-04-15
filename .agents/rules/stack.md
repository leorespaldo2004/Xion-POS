---
trigger: manual
---

# Frontend

### Stack de Desarrollo Híbrido (Electron + Python)

**1. Frontend (La Interfaz)**

- **Core:** **Electron + React + Vite**. La cáscara visual de alto rendimiento.
- **Comunicación:** **Axios + TanStack Query**. Gestionan la caché y el estado de carga al consumir tu API local.
- **Sistema de Actualización:** **electron-updater**. Librería que revisa automáticamente en GitHub si hay una nueva versión al abrir la App y la descarga en segundo plano.

**2. Backend Local (El Motor Offline)**

- **Lenguaje:** **Python 3.12 + PyInstaller**. PyInstaller es vital aquí: congela tu código Python y sus librerías en un solo archivo ejecutable (`.exe` o binario) para que el usuario no necesite instalar Python.
- **Framework:** **FastAPI**.
- **Base de Datos Local:** **SQLite**. Archivo `.db` local protegido (opcionalmente cifrado con SQLCipher).
- **ORM y Migraciones:** **SQLModel + Alembic**. Alembic es el encargado de gestionar los cambios en la base de datos (ej. agregar una columna nueva) sin borrar los datos del usuario cuando lanzas una actualización.
- **Gestor de Procesos:** **electron-python-shell**. Orquesta el ciclo de vida (inicio/cierre) del servidor Python desde Node.js.

**3. Backend Nube (La Central)**

- **Framework:** **FastAPI**. Reutiliza el 90% de los modelos Pydantic y lógica de negocio del local.
- **Base de Datos:** **PostgreSQL** (NeonTech o Supabase). Motor robusto para consolidar datos de múltiples sucursales.
- **Gestión de Cambios:** **Alembic**. Para sincronizar los cambios de esquema en la nube igual que en local.

**4. Sincronización (El Puente)**

- **Lógica:** **Background Task en Python**. Un hilo secundario en FastAPI local revisa cambios (Delta) en SQLite y los empuja a la Nube.
- **Cliente HTTP:** **Httpx**. Cliente asíncrono moderno para subir ventas/bajar precios sin bloquear la interfaz visual ni el proceso de caja.

**5. Infraestructura de Actualización (El Ciclo de Vida)**

- **Automatización (CI/CD):** **GitHub Actions**. Cada vez que subes código ("Push"), GitHub ejecuta un script que:
    1. Compila el Backend (PyInstaller).
    2. Construye el Frontend (Vite).
    3. Empaqueta todo (Electron Builder).
    4. Publica la nueva versión (Release) para que `electron-updater` la detecte.

**6. Capa de Seguridad y Protección (Security Shield)**

- **Gestión de Licencias (DRM & Fingerprinting):**
    - **Herramienta:** `node-machine-id` (Electron) + Tabla de Licencias (Postgres).
    - **Función:** Genera un ID único basado en el Hardware (CPU + Disco) para vincular la licencia a una sola PC. Bloquea el uso si el software se copia a otra máquina no autorizada.
- **Control de Sesión Offline (Regla de 72 Horas):**
    - **Herramienta:** **PyJWT** (Tokens con Expiración) + **Keytar**.
    - **Lógica:** El sistema exige conexión al primer inicio. Genera un token con validez de 72 horas guardado en el llavero seguro del OS (`Keytar`). Si el token expira y no hay internet para renovarlo, el Backend Local bloquea el acceso a la UI.
- **Protección de Código Fuente (Anti-Ingeniería Inversa):**
    - **Backend (Python):** **Cython**. Compilación de los módulos críticos de negocio a C (`.pyd` en Windows / `.so` en Linux) antes de empaquetar con PyInstaller, haciendo el código ilegible.
    - **Frontend (JS):** **Bytenode** + **javascript-obfuscator**. Compila el código JavaScript a bytecode nativo V8 y ofusca las variables, impidiendo la lectura directa del código fuente dentro del paquete Electron.
- **Encriptación de Datos Sensibles:**
    - **Herramienta:** **SQLCipher** (Extensión de SQLite).
    - **Función:** Cifrado transparente AES-256 de todo el archivo de base de datos local `.db`. Protege la lista de clientes y precios si el disco duro es extraído o robado.