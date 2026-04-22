Param(
    [switch]$Publish,
    [string]$Mode
)

if ($args -contains "--publish" -or $Mode -eq "--publish") {
    $Publish = $true
}

$ErrorActionPreference = "Stop"

if (Test-Path ".env") {
    Write-Host "Cargando variables de entorno desde .env..."
    Get-Content .env | Where-Object { $_ -match "^\s*([\w]+)\s*=\s*(.*)\s*$" } | ForEach-Object {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

Write-Host "--- BUILD: Iniciando proceso de empaquetado completo ---"

# 1. Limpieza de procesos residuales
Write-Host "[1/5] Limpiando procesos para evitar bloqueos..."
$procesos = @("Xion POS", "electron", "xion_backend", "XionPOS")
foreach ($p in $procesos) {
    Get-Process -Name $p -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 4

# 2. Reconstruccion del Backend Python
Write-Host "[2/5] Compilando Backend Python..."
if (Test-Path ".venv/Scripts/python.exe") {
    Push-Location local_backend
    & "..\.venv\Scripts\python.exe" -m PyInstaller xion_backend.spec --noconfirm
    Pop-Location
}
if (-not (Test-Path ".venv/Scripts/python.exe")) {
    Write-Error "Error: .venv/Scripts/python.exe no encontrado."
}

# 3. Compilacion de la UI (Vite)
Write-Host "[3/5] Compilando Interfaz de Usuario..."
npm run build

# 4. Generacion de Bytecode (Main Process)
Write-Host "[4/5] Asegurando Proceso Principal..."
npm run build:main

# 5. Generacion del instalador .exe
Write-Host "[5/5] Creando instalador..."
Push-Location electron_app
if ($Publish) {
    Write-Host "Modo: Publicar en GitHub..."
    npx electron-builder --publish always
}
if (-not $Publish) {
    Write-Host "Modo: Construccion Local (Generando Instalador .exe)..."
    npx electron-builder
}
Pop-Location

Write-Host "--- BUILD: Proceso completado con exito ---"
