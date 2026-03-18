import pytest
from fastapi.testclient import TestClient

from local_backend.main import app, get_frozen_path

client = TestClient(app)

def test_health_check_status():
    """
    Verifica que el endpoint de salud responda correctamente.
    Crucial para la orquestación del ciclo de vida con Electron.
    """
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "online"
    assert data["anchor_currency"] == "USD"
    assert data["mode"] == "offline_first"

    response2 = client.get("/api/v1/health")
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["status"] == "ok"
    assert data2["db_connected"] is True

def test_get_frozen_path():
    """
    Verifica que la función de detección de entorno funcione.
    En el entorno de test, NO estamos congelados por PyInstaller.
    """
    path = get_frozen_path()
    assert isinstance(path, str)
    assert len(path) > 0
