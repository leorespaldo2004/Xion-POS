import urllib.request
import uuid
import hashlib
import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlmodel import Session, select
from local_backend.core.models import Category, SystemConfig

URL = "https://www.google.com/basepages/producttype/taxonomy-with-ids.es-ES.txt"
logger = logging.getLogger(__name__)

def _slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text).strip('-')
    return text or "cat"

def seed_google_taxonomy_if_empty(session: Session) -> None:
    """
    Si la tabla de categorías está vacía al instalar por primera vez la app,
    descarga la Taxonomía de Productos de Google (es-ES) y la inserta en la base de datos.
    """
    has_categories = session.exec(select(Category).limit(1)).first()
    if has_categories:
        return

    logger.info("Base de datos nueva detectada. Descargando Taxonomía de Productos de Google...")
    check_and_sync_google_taxonomy(session, force=True)


def check_and_sync_google_taxonomy(session: Session, force: bool = False) -> Dict[str, Any]:
    """
    Verifica si existe una versión más reciente de la Taxonomía de Google
    mediante HTTP ETag / Checksum y actualiza la jerarquía de categorías en la DB.
    """
    config = session.exec(select(SystemConfig).limit(1)).first()
    if not config:
        config = SystemConfig()
        session.add(config)
        session.commit()
        session.refresh(config)

    try:
        req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0 POS-App/1.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            content_bytes = response.read()
            etag_header = response.headers.get('ETag') or response.headers.get('Last-Modified')
    except Exception as e:
        logger.warning(f"No se pudo consultar la taxonomía de Google (offline): {e}")
        return {
            "status": "offline_error",
            "updated": False,
            "detail": f"Error de conexión: {str(e)}"
        }

    # Calcular checksum si no hay ETag en respuesta HTTP
    content_hash = etag_header or hashlib.sha256(content_bytes).hexdigest()

    if not force and config.google_taxonomy_etag == content_hash:
        config.google_taxonomy_last_checked = datetime.now(timezone.utc)
        session.add(config)
        session.commit()
        return {
            "status": "already_up_to_date",
            "updated": False,
            "etag": content_hash,
            "detail": "La taxonomía de Google ya está en su última versión."
        }

    content_str = content_bytes.decode('utf-8')
    lines = content_str.splitlines()

    # Cargar mapa existente por google_taxonomy_id
    existing_cats = session.exec(select(Category)).all()
    existing_by_tax_id = {c.google_taxonomy_id: c for c in existing_cats if c.google_taxonomy_id is not None}
    path_to_id = {c.name: c.id for c in existing_cats if c.google_taxonomy_id is not None}

    created_count = 0
    updated_count = 0
    batch = []

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        parts = line.split(" - ", 1)
        if len(parts) != 2:
            continue

        try:
            tax_id = int(parts[0])
        except ValueError:
            continue

        full_path = parts[1]
        path_parts = [p.strip() for p in full_path.split(">")]

        name = path_parts[-1]
        parent_path = " > ".join(path_parts[:-1])
        parent_id = path_to_id.get(parent_path)

        if tax_id in existing_by_tax_id:
            cat = existing_by_tax_id[tax_id]
            if cat.name != name or cat.parent_id != parent_id:
                cat.name = name
                cat.parent_id = parent_id
                session.add(cat)
                updated_count += 1
            cat_id = cat.id
        else:
            cat_id = str(uuid.uuid4())
            cat_slug = f"{_slugify(name)}-{tax_id}"
            category = Category(
                id=cat_id,
                name=name,
                slug=cat_slug,
                parent_id=parent_id,
                google_taxonomy_id=tax_id,
                is_active=True
            )
            batch.append(category)
            created_count += 1

        path_to_id[full_path] = cat_id

        if len(batch) >= 500:
            session.add_all(batch)
            session.commit()
            batch = []

    if batch:
        session.add_all(batch)
        session.commit()

    config.google_taxonomy_etag = content_hash
    config.google_taxonomy_last_checked = datetime.now(timezone.utc)
    session.add(config)
    session.commit()

    logger.info(f"Taxonomía sincronizada: {created_count} creadas, {updated_count} actualizadas.")
    return {
        "status": "success",
        "updated": True,
        "created_categories": created_count,
        "updated_categories": updated_count,
        "total_categories": len(path_to_id),
        "etag": content_hash
    }
