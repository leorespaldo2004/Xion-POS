from fastapi.testclient import TestClient

from local_backend.main import app

client = TestClient(app)


def test_get_system_status():
    response = client.get("/api/v1/system/status")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "connected"
    assert data["anchor_currency"] in ["USD", "VES"]
    assert "current_exchange_rate_bs" in data
    assert isinstance(data["current_exchange_rate_bs"], (float, int))


def test_update_exchange_rate():
    payload = {
        "anchor_currency": "VES",
        "current_exchange_rate_bs": 42.75,
        "lockdown_mode": True,
    }

    response = client.post("/api/v1/system/exchange-rate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "updated"
    assert data["anchor_currency"] == "VES"
    assert data["current_exchange_rate_bs"] == 42.75
    assert data["lockdown_mode"] is True

    # Validate the status endpoint reflects the new values
    response2 = client.get("/api/v1/system/status")
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["anchor_currency"] == "VES"
    assert data2["current_exchange_rate_bs"] == 42.75
    assert data2["lockdown_mode"] is True
