#!/bin/bash
# local_backend/scripts/setup_env.sh

# ARCHITECT: DEV MASTER POS
# CONTEXT: Crea el entorno virtual de forma determinista y segura.

echo "[1/3] Verificando versión de Python..."
PYTHON_CMD="python3.12"

if ! command -v $PYTHON_CMD &> /dev/null; then
    echo "ERROR: No se encontró Python 3.12. Instalación abortada."
    exit 1
fi

echo "[2/3] Creando entorno virtual aislado (venv)..."
$PYTHON_CMD -m venv ../venv

echo "[3/3] Activando entorno e instalando dependencias core..."
source ../venv/bin/activate

# Actualizamos pip y herramientas de empaquetado crítico
pip install --upgrade pip setuptools wheel

# Instalamos las dependencias
pip install -r ../requirements.txt

echo "✅ Entorno virtual listo. Para activar manualmente usa: source local_backend/venv/bin/activate"
