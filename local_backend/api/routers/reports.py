from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from datetime import datetime, timedelta
from local_backend.core.database import get_session
from local_backend.core.models import (
    Sale, SaleItem, Purchase, Product, Client, Supplier, User, CashSession
)

router = APIRouter(prefix="/reports", tags=["Reports"])

def get_date_range(period: str):
    now = datetime.utcnow()
    # Para simplificar consideramos todo UTC, en prod habría que usar el timezone local
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        current_quarter = (now.month - 1) // 3 + 1
        start_month = 3 * current_quarter - 2
        start_date = now.replace(month=start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        # fallback a 30 días si es 'custom' o no reconocido
        start_date = now - timedelta(days=30)
        
    return start_date, now

@router.get("/dashboard")
def get_dashboard_stats(
    period: str = Query("month", description="today, week, month, quarter, year"),
    session: Session = Depends(get_session)
):
    start_date, end_date = get_date_range(period)
    
    # 1. Ventas
    sales_query = select(Sale).where(Sale.created_at >= start_date)
    sales = session.exec(sales_query).all()
    total_sales_usd = sum(s.total_amount_usd for s in sales)
    total_sales_bs = sum(s.total_amount_bs for s in sales)
    
    # 2. Compras
    purchases_query = select(Purchase).where(Purchase.created_at >= start_date)
    purchases = session.exec(purchases_query).all()
    total_purchases_usd = sum(p.total_amount_usd for p in purchases)
    total_purchases_bs = sum(p.total_amount_bs for p in purchases)
    
    # 3. Inventario
    products = session.exec(select(Product)).all()
    inventory_value_usd = sum((p.cached_stock_quantity * p.price_usd) for p in products)
    low_stock_items = sum(1 for p in products if p.cached_stock_quantity <= p.min_stock_alert)
    exchange_rate = sales[0].exchange_rate if sales else 36.5
    inventory_value_bs = inventory_value_usd * exchange_rate
    
    # 4. Clientes
    clients = session.exec(select(Client)).all()
    active_clients = len(clients)
    new_clients = sum(1 for c in clients if c.created_at >= start_date)
    total_debt = sum(c.current_debt for c in clients)
    
    # 5. Proveedores
    suppliers = session.exec(select(Supplier)).all()
    total_suppliers = len(suppliers)
    active_suppliers = sum(1 for s in suppliers if s.is_active)
    
    # 6. Top Productos
    stmt_top = (
        select(SaleItem.product_name, func.sum(SaleItem.quantity).label("total_qty"), func.sum(SaleItem.total_price_usd).label("total_rev"))
        .join(Sale)
        .where(Sale.created_at >= start_date)
        .group_by(SaleItem.product_name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
    )
    top_results = session.exec(stmt_top).all()
    top_products = [
        {"name": row[0], "sales": float(row[1] or 0), "revenue": float(row[2] or 0)}
        for row in top_results
    ]
    
    return {
        "stats": {
            "totalSales": total_sales_usd,
            "totalSalesBs": total_sales_bs,
            "salesGrowth": 0.0, # Dummy for now
            "totalPurchases": total_purchases_usd,
            "totalPurchasesBs": total_purchases_bs,
            "purchasesChange": 0.0, # Dummy for now
            "inventoryValue": inventory_value_usd,
            "inventoryValueBs": inventory_value_bs,
            "lowStockItems": low_stock_items,
            "activeClients": active_clients,
            "newClients": new_clients,
            "totalDebt": total_debt,
            "totalSuppliers": total_suppliers,
            "activeSuppliers": active_suppliers
        },
        "topProducts": top_products
    }

@router.get("/download/{report_id}")
def download_report_data(
    report_id: str,
    period: str = Query("month"),
    session: Session = Depends(get_session)
):
    """
    Retorna los datos crudos en JSON para que el frontend los convierta a Excel/CSV.
    """
    start_date, end_date = get_date_range(period)
    
    if report_id == "sales_daily":
        sales = session.exec(select(Sale).where(Sale.created_at >= start_date)).all()
        return [{"id": s.id, "cliente": s.client_name, "total_usd": s.total_amount_usd, "total_bs": s.total_amount_bs, "fecha": s.created_at.isoformat()} for s in sales]
        
    elif report_id == "sales_by_product":
        stmt = (
            select(SaleItem.product_name, func.sum(SaleItem.quantity), func.sum(SaleItem.total_price_usd))
            .join(Sale).where(Sale.created_at >= start_date)
            .group_by(SaleItem.product_name)
        )
        res = session.exec(stmt).all()
        return [{"producto": row[0], "cantidad_vendida": row[1], "ingreso_usd": row[2]} for row in res]
        
    elif report_id == "inventory_current":
        prods = session.exec(select(Product)).all()
        return [{"sku": p.sku, "nombre": p.name, "stock": p.cached_stock_quantity, "precio_usd": p.price_usd, "costo_usd": p.cost_usd} for p in prods]
        
    elif report_id == "clients_list":
        clients = session.exec(select(Client)).all()
        return [{"documento": c.identification_number, "nombre": c.name, "telefono": c.phone, "deuda_usd": c.current_debt} for c in clients]
        
    elif report_id == "users_sales":
        # Usuarios (simplificado ya que Sale no tiene usario directo, sino CashSession)
        stmt = (
            select(CashSession.user_name, func.sum(Sale.total_amount_usd))
            .join(Sale, Sale.cash_session_id == CashSession.id)
            .where(Sale.created_at >= start_date)
            .group_by(CashSession.user_name)
        )
        res = session.exec(stmt).all()
        return [{"cajero": row[0], "total_recaudado_usd": row[1]} for row in res]
        
    else:
        # Default o no soportado
        return [{"mensaje": f"Reporte {report_id} en desarrollo..."}]

