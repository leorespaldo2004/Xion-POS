# filepath: local_backend/tests/api/test_returns.py
# -----------------------------------------------------------------------------
# TESTS: Módulo de Devoluciones (Returns) y Notas de Crédito
# Verifica la integridad de la lógica de negocio: atómica, reposición de stock,
# validación de cantidades y trazabilidad auditable.
# -----------------------------------------------------------------------------

import json
import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select

from local_backend.main import app
from local_backend.core.models import (
    Product,
    Sale,
    SaleItem,
    SaleReturn,
    SaleReturnItem,
    InventoryTransaction,
    User,
    CashSession,
    SystemConfig,
)
from local_backend.core.database import get_session


@pytest.fixture(name="session")
def session_fixture():
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        config = SystemConfig(current_exchange_rate_bs=36.5)
        session.add(config)

        user = User(id="usr_cashier_1", name="Cajero Test", email="cashier@test.com", role="cashier")
        supervisor = User(id="usr_sup_1", name="Supervisor Test", email="sup@test.com", role="admin")
        session.add(user)
        session.add(supervisor)

        cash_session = CashSession(
            id="cs_1",
            user_id="usr_cashier_1",
            user_name="Cajero Test",
            status="open"
        )
        session.add(cash_session)

        product1 = Product(
            id="prod_1",
            sku="SKU-001",
            name="Harina PAN",
            cost_usd=1.0,
            price_usd=1.5,
            cached_stock_quantity=50.0
        )
        product2 = Product(
            id="prod_2",
            sku="SKU-002",
            name="Aceite Mavesa",
            cost_usd=2.0,
            price_usd=3.0,
            cached_stock_quantity=30.0
        )
        session.add(product1)
        session.add(product2)

        sale = Sale(
            id="sale_100",
            client_name="Cliente General",
            subtotal_usd=12.0,
            tax_amount_usd=0.0,
            total_amount_usd=12.0,
            total_amount_bs=438.0,
            exchange_rate=36.5,
            cash_session_id="cs_1",
            status="completed"
        )
        session.add(sale)

        sale_item1 = SaleItem(
            id="si_101",
            sale_id="sale_100",
            product_id="prod_1",
            product_name="Harina PAN",
            quantity=4.0,
            unit_price_usd=1.5,
            total_price_usd=6.0
        )
        sale_item2 = SaleItem(
            id="si_102",
            sale_id="sale_100",
            product_id="prod_2",
            product_name="Aceite Mavesa",
            quantity=2.0,
            unit_price_usd=3.0,
            total_price_usd=6.0
        )
        session.add(sale_item1)
        session.add(sale_item2)

        session.commit()
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


class TestReturnsModule:

    def test_get_returnable_items(self, client: TestClient):
        """Verifica la consulta de ítems disponibles para devolver en una venta."""
        response = client.get("/api/v1/returns/sales/sale_100/items")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        item1 = next(i for i in data if i["product_id"] == "prod_1")
        assert item1["original_quantity"] == 4.0
        assert item1["already_returned_quantity"] == 0.0
        assert item1["remaining_quantity"] == 4.0

    def test_process_partial_return(self, client: TestClient, session: Session):
        """Devolución parcial: resta del disponible, reingresa stock y registra Kardex."""
        payload = {
            "sale_id": "sale_100",
            "user_id": "usr_cashier_1",
            "supervisor_id": "usr_sup_1",
            "reason": "Empaque dañado",
            "items": [
                {"sale_item_id": "si_101", "product_id": "prod_1", "quantity": 2.0}
            ]
        }

        response = client.post("/api/v1/returns", json=payload)
        assert response.status_code == 201
        ret_data = response.json()
        assert ret_data["total_amount_usd"] == 3.0
        assert ret_data["reason"] == "Empaque dañado"

        # Verificar actualización de la venta
        sale = session.get(Sale, "sale_100")
        assert sale.status == "partially_refunded"

        # Verificar reingreso de stock (50 + 2 = 52)
        prod = session.get(Product, "prod_1")
        assert prod.cached_stock_quantity == 52.0

        # Verificar Kardex
        kardex = session.exec(
            select(InventoryTransaction).where(
                InventoryTransaction.product_id == "prod_1",
                InventoryTransaction.reason == "REFUND"
            )
        ).first()
        assert kardex is not None
        assert kardex.quantity == 2.0
        assert kardex.transaction_type == "IN"

        # Verificar ítems pendientes para devolución
        resp_items = client.get("/api/v1/returns/sales/sale_100/items")
        items_data = resp_items.json()
        item1 = next(i for i in items_data if i["product_id"] == "prod_1")
        assert item1["already_returned_quantity"] == 2.0
        assert item1["remaining_quantity"] == 2.0

    def test_process_total_return(self, client: TestClient, session: Session):
        """Devolución total: cambia el estado de la venta a 'refunded'."""
        payload = {
            "sale_id": "sale_100",
            "user_id": "usr_cashier_1",
            "supervisor_id": "usr_sup_1",
            "reason": "Cliente solicitó anulación total",
            "items": [
                {"sale_item_id": "si_101", "product_id": "prod_1", "quantity": 4.0},
                {"sale_item_id": "si_102", "product_id": "prod_2", "quantity": 2.0}
            ]
        }

        response = client.post("/api/v1/returns", json=payload)
        assert response.status_code == 201

        sale = session.get(Sale, "sale_100")
        assert sale.status == "refunded"

    def test_return_validation_exceed_quantity(self, client: TestClient):
        """Retorna error 400 si se intenta devolver una cantidad mayor a la vendida."""
        payload = {
            "sale_id": "sale_100",
            "user_id": "usr_cashier_1",
            "supervisor_id": "usr_sup_1",
            "reason": "Error de tipeo",
            "items": [
                {"sale_item_id": "si_101", "product_id": "prod_1", "quantity": 10.0}
            ]
        }

        response = client.post("/api/v1/returns", json=payload)
        assert response.status_code == 400
        assert "excede lo disponible" in response.json()["detail"]

    def test_return_nonexistent_sale(self, client: TestClient):
        """Retorna error 404 si la venta no existe."""
        payload = {
            "sale_id": "sale_999",
            "reason": "Test",
            "items": [
                {"sale_item_id": "si_101", "product_id": "prod_1", "quantity": 1.0}
            ]
        }

        response = client.post("/api/v1/returns", json=payload)
        assert response.status_code == 404
