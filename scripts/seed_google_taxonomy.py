import sys
from pathlib import Path
from sqlmodel import Session, select

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from local_backend.core.database import engine
from local_backend.core.models import Category
from local_backend.core.taxonomy_seeder import seed_google_taxonomy_if_empty

def seed_taxonomy(force: bool = False):
    with Session(engine) as session:
        if force:
            print("Eliminando categorías existentes...")
            existing = session.exec(select(Category)).all()
            for cat in existing:
                session.delete(cat)
            session.commit()

        seed_google_taxonomy_if_empty(session)

if __name__ == "__main__":
    seed_taxonomy(force=True)
