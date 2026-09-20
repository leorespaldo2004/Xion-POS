import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from local_backend.main import app
from local_backend.core.database import engine, init_db

@pytest.fixture(name="client")
def client_fixture():
    init_db()
    with TestClient(app) as client:
        yield client

def test_get_dashboard_stats(client: TestClient):
    response = client.get("/api/v1/reports/dashboard?period=month")
    assert response.status_code == 200
    data = response.json()
    assert "stats" in data
    assert "topProducts" in data
    assert "totalSales" in data["stats"]
