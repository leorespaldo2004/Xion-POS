import pytest
from sqlmodel import Session, select
from fastapi.testclient import TestClient

from local_backend.main import app
from local_backend.core.database import get_session, engine, init_db


@pytest.fixture(name="session")
def session_fixture():
    init_db()
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_database_connection(session: Session):
    result = session.exec(select(1)).first()
    assert result == 1


def test_health_check_endpoint(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["db_connected"] is True
