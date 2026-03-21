import pytest
from fastapi.testclient import TestClient
from local_backend.main import app

client = TestClient(app)

def test_create_physical_product():
    payload = {
        "barcode": "001122",
        "name": "Coca Cola 2L",
        "price_usd": 2.50,
        "cost_usd": 1.00,
        "type": "physical",
        "has_vat": True
    }
    response = client.post("/api/v1/inventory/products", json=payload)
    assert response.status_code == 201
    assert response.json()["barcode"] == "001122"
    assert response.json()["tax_type"] == "vat"

def test_create_combo_without_items_fails():
    payload = {
        "barcode": "COMB-01",
        "name": "Combo Hamburguesa",
        "price_usd": 10.00,
        "cost_usd": 5.00,
        "type": "combo",
        "has_vat": True,
        "combo_items": [] # Vacío a propósito
    }
    response = client.post("/api/v1/inventory/products", json=payload)
    assert response.status_code == 400
    assert "Combos require" in response.json()["detail"]
