import sys
from pathlib import Path
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from local_backend.core.config import settings

ROOT_DIR = Path(__file__).resolve().parents[1].parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False},
)


def init_db() -> None:
    """
    Crea las tablas en la base de datos local.
    """
    settings.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
