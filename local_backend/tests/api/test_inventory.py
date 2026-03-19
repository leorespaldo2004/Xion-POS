from fastapi.testclient import TestClient

from local_backend.main import app
from local_backend.core.models import Product

client = TestClient(app)


def test_create_product():
    payload = {
        "sku": "TEST-123",
        "name": "Coca Cola 2L",
        "cost_usd": 1.20,
        "price_usd": 2.00,
        "product_type": "physical",
        "tax_type": "none",
        "unit_measure": "UND",
        "cached_stock_quantity": 50,
        "min_stock_alert": 10,
    }

    response = client.post("/api/v1/inventory/products", json=payload)
    print('CREATE RESPONSE', response.status_code, response.text)
    assert response.status_code == 201
    data = response.json()
    assert data["sku"] == "TEST-123"
    assert data["is_synced"] is False
    assert data["is_deleted"] is False


def test_soft_delete_product():
    payload = {
        "sku": "TEST-DEL",
        "name": "Delete Me",
        "cost_usd": 1.0,
        "price_usd": 1.5,
        "product_type": "physical",
        "tax_type": "none",
        "unit_measure": "UND",
        "cached_stock_quantity": 10,
    }
    create_response = client.post("/api/v1/inventory/products", json=payload)
    assert create_response.status_code == 201
    product_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/inventory/products/{product_id}")
    assert delete_response.status_code == 204

    list_response = client.get("/api/v1/inventory/products")
    assert list_response.status_code == 200
    data = list_response.json()
    assert all(p["id"] != product_id for p in data)
