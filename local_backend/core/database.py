import sys
from pathlib import Path
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session, select, text
from local_backend.core.config import settings
from local_backend.core.models import SystemConfig, PaymentMethodModel

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
    Crea las tablas en la base de datos local y asegura un registro de configuración
    así como los métodos de pago nativos.
    """
    settings.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)

    # Migraciones automáticas de columnas para SQLite
    with engine.connect() as conn:
        for table_name, table in SQLModel.metadata.tables.items():
            res = conn.execute(text(f"PRAGMA table_info('{table_name}')")).fetchall()
            if res:
                existing_cols = [row[1] for row in res]
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(engine.dialect)
                        conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type}'))
                        conn.commit()

        # Crear vista de balances de cliente (CxC)
        conn.execute(text("""
            CREATE VIEW IF NOT EXISTS view_client_balances AS
            SELECT 
                c.id AS client_id,
                c.name,
                c.identification_type,
                c.identification_number,
                c.credit_limit_usd,
                COALESCE(SUM(
                    CASE 
                        WHEN l.tx_type = 'CHARGE' THEN l.amount_usd
                        WHEN l.tx_type IN ('PAYMENT', 'DISCOUNT') THEN -l.amount_usd
                        ELSE 0 
                    END
                ), 0.0) AS current_debt_usd
            FROM clients c
            LEFT JOIN client_receivables_ledger l ON c.id = l.client_id
            WHERE c.deleted_at IS NULL
            GROUP BY c.id, c.name, c.identification_type, c.identification_number, c.credit_limit_usd;
        """))

        # Trigger para actualizar stock físico a partir del Kardex en SQLite
        conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS trg_apply_inventory_tx
            AFTER INSERT ON inventory_transactions
            FOR EACH ROW
            BEGIN
                UPDATE products 
                SET cached_stock_quantity = cached_stock_quantity + (
                    CASE WHEN NEW.transaction_type = 'IN' THEN NEW.quantity ELSE -NEW.quantity END
                )
                WHERE id = NEW.product_id;
            END;
        """))

        # Sanitizar valores NULL en columnas recién agregadas para compatibilidad SQLite
        conn.execute(text("UPDATE categories SET is_active = 1 WHERE is_active IS NULL;"))
        conn.execute(text("UPDATE clients SET is_active = 1 WHERE is_active IS NULL;"))
        conn.execute(text("UPDATE suppliers SET is_active = 1 WHERE is_active IS NULL;"))
        conn.commit()

    with Session(engine) as session:
        config = session.exec(select(SystemConfig).limit(1)).first()
        if not config:
            config = SystemConfig()
            session.add(config)
            
        # Default system payment methods with permanent base images
        default_methods = [
            {"code": "pago_movil", "name": "Pago Móvil", "currency": "VES", "allow_decimals": True, "is_system": True, "image_url": "65cc43a8116c"},
            {"code": "transferencia_nacional", "name": "Transferencia", "currency": "VES", "allow_decimals": True, "is_system": True, "image_url": "c95398b571ef"},
            {"code": "tarjeta_debito", "name": "Débito", "currency": "VES", "allow_decimals": True, "is_system": True, "image_url": "61149c1c2ed4"},
            {"code": "biopago", "name": "Biopago", "currency": "VES", "allow_decimals": True, "is_system": True, "image_url": "d52c08dd0253"},
            {"code": "efectivo_bs", "name": "Efectivo BS", "currency": "VES", "allow_decimals": False, "is_system": True, "image_url": "4129e9c224a2"},
            {"code": "efectivo_usd", "name": "Efectivo USD", "currency": "USD", "allow_decimals": False, "is_system": True, "image_url": "d51e15debbbe"},
            {"code": "zelle", "name": "Zelle", "currency": "USD", "allow_decimals": True, "is_system": True, "image_url": "3ff1409737f8"},
            {"code": "binance", "name": "Binance Pay", "currency": "USD", "allow_decimals": True, "is_system": True, "image_url": "5c4937a497c5"},
        ]
        
        for dm in default_methods:
            pm = session.exec(select(PaymentMethodModel).where(PaymentMethodModel.code == dm["code"])).first()
            if not pm:
                new_pm = PaymentMethodModel(**dm)
                session.add(new_pm)
            else:
                if pm.is_system and not pm.image_url:
                    pm.image_url = dm["image_url"]
                    session.add(pm)

        session.commit()
        session.refresh(config)

        # Sembrar Taxonomía de Productos de Google en primera instalación si las categorías están vacías
        from local_backend.core.taxonomy_seeder import seed_google_taxonomy_if_empty
        try:
            seed_google_taxonomy_if_empty(session)
        except Exception as err:
            print(f"Error al verificar/sembrar la taxonomía de Google: {err}")


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def get_system_config(session: Session) -> SystemConfig:
    config = session.exec(select(SystemConfig).limit(1)).first()
    if not config:
        config = SystemConfig()
        session.add(config)
        session.commit()
        session.refresh(config)
    return config

init_db()

