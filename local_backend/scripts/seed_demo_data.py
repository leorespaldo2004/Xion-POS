import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from sqlmodel import Session, select, SQLModel
from local_backend.core.database import engine, init_db
from local_backend.core.models import (
    SystemConfig, PaymentMethodModel, Product, Client, Supplier, User
)

def seed_database():
    print("[SEED] Reiniciando y sembrando la base de datos...")
    SQLModel.metadata.drop_all(engine)
    init_db()

    with Session(engine) as session:
        # Configuración del sistema
        config = session.exec(select(SystemConfig).limit(1)).first()
        if not config:
            config = SystemConfig()
        
        config.current_exchange_rate_bs = 800.0
        config.store_name = "MI TIENDA POS"
        config.store_rif = "J-12345678-9"
        config.store_address = "Av. Principal 123, Caracas"
        config.store_phone = "0414-1234567"
        config.ticket_message = "Gracias por su compra. ¡Vuelva pronto! Dios lo bendiga."
        session.add(config)

        # Usuarios de prueba
        users = [
            User(id="usr_admin", name="Administrador Sistema", email="admin@xionpos.com", role="admin", access_pin="1234", perm_sales=True, perm_inventory=True, perm_reports=True, perm_users=True),
            User(id="usr_cashier", name="Cajero Principal", email="cajero@xionpos.com", role="cashier", access_pin="0000", perm_sales=True),
        ]
        for u in users:
            if not session.get(User, u.id):
                session.add(u)

        # Clientes de prueba
        clients = [
            Client(id="cli_1", name="Leonard Fernandez", identification_type="CI", identification_number="31342608", email="leonard@example.com", phone="0412-1234567"),
            Client(id="cli_2", name="María Pérez", identification_type="CI", identification_number="18987654", email="maria@example.com", phone="0424-9876543"),
            Client(id="cli_3", name="Empresa Demo C.A.", identification_type="RIF", identification_number="J-99887766-5", email="contacto@democa.com", phone="0212-5551234"),
        ]
        for c in clients:
            if not session.get(Client, c.id):
                session.add(c)

        # Proveedores de prueba
        suppliers = [
            Supplier(id="sup_1", name="Distribuidora Polar C.A.", identification_type="RIF", identification_number="J-00004444-1", email="ventas@polar.com", phone="0212-9998877"),
            Supplier(id="sup_2", name="Alimentos Mary S.A.", identification_type="RIF", identification_number="J-00005555-2", email="contacto@mary.com", phone="0212-4443322"),
        ]
        for s in suppliers:
            if not session.get(Supplier, s.id):
                session.add(s)

        # Productos de prueba
        products = [
            Product(id="prod_1", name="Coca Cola 2L", sku="CC-2L", barcode="759100100101", price_usd=2.0, wholesale_price_usd=1.8, cost_usd=1.2, cached_stock_quantity=50.0, unit_of_measure="UNID"),
            Product(id="prod_2", name="Arroz Mary 1 Kg", sku="AR-1KG", barcode="759100100102", price_usd=1.0, wholesale_price_usd=0.85, cost_usd=0.65, cached_stock_quantity=100.0, unit_of_measure="KG"),
            Product(id="prod_3", name="Pan de Hamburguesas 6 unid", sku="PAN-HB6", barcode="759100100103", price_usd=1.2, wholesale_price_usd=1.0, cost_usd=0.7, cached_stock_quantity=30.0, unit_of_measure="PAQ"),
            Product(id="prod_4", name="Carne de Hamburguesa 500g", sku="CAR-HB500", barcode="759100100104", price_usd=3.0, wholesale_price_usd=2.6, cost_usd=2.0, cached_stock_quantity=40.0, unit_of_measure="PAQ"),
            Product(id="prod_5", name="Mayonesa Mavesa 400g", sku="MAY-400G", barcode="759100100105", price_usd=2.5, wholesale_price_usd=2.2, cost_usd=1.6, cached_stock_quantity=60.0, unit_of_measure="FRASCO"),
        ]
        for p in products:
            if not session.get(Product, p.id):
                session.add(p)

        session.commit()
        print("[SEED] Base de datos poblada con éxito con la seed de prueba completa.")

if __name__ == "__main__":
    seed_database()
