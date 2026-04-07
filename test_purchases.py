from local_backend.core.database import get_session, init_db
from local_backend.core.models import Purchase, PurchaseItem, Product
from uuid import uuid4

init_db()

try:
    session = next(get_session())
    
    # ensure a product exists
    prod = session.query(Product).first()
    if not prod:
        print("No products exist to purchase")
        exit(0)

    purchase = Purchase(
        id=str(uuid4()),
        supplier_name="Test Supplier",
        total_amount_usd=10.0,
        total_amount_bs=360.0
    )
    session.add(purchase)
    
    item = PurchaseItem(
        id=str(uuid4()),
        purchase_id=purchase.id,
        product_id=prod.id,
        quantity=5,
        unit_cost_usd=2.0,
        total_cost_usd=10.0
    )
    session.add(item)
    
    prod.cached_stock_quantity += 5
    session.add(prod)
    
    session.commit()
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
