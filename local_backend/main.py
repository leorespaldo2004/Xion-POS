from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os

# Excepción base para reglas de negocio (Offline-First)
class OfflineSyncError(Exception):
    pass

app = FastAPI(
    title="Dolarizado POS - Local Backend",
    version="1.0.0",
    description="Offline-First Local API for POS System"
)

# Configuración estricta de CORS. 
# En producción, Electron consumirá esto desde localhost.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "app://."], # Vite dev server & Electron prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
async def check_health() -> dict:
    """
    Endpoint de pulso.
    Electron hace polling a este endpoint al iniciar la app.
    Cuando retorna 200, Electron muestra la UI de Login.
    """
    return {
        "status": "online",
        "mode": "offline_first",
        "anchor_currency": "USD"
    }

def get_frozen_path() -> str:
    """
    Determina si estamos corriendo en modo desarrollo o compilado por PyInstaller.
    PyInstaller extrae los archivos en un directorio temporal en sys._MEIPASS.
    """
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

if __name__ == "__main__":
    # Electron asignará un puerto dinámico o usaremos uno fijo seguro.
    # En producción, no debe recargar (reload=False).
    is_dev = not getattr(sys, 'frozen', False)

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=is_dev,
        workers=1 # SQLite requiere concurrencia controlada
    )
