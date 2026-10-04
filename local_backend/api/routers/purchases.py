from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from local_backend.core.database import get_session
from local_backend.core.models import Purchase, PurchaseItem, Product

router = APIRouter(prefix="/purchases", tags=["Purchases"])

class PurchaseItemDTO(BaseModel):
    product_id: str
    quantity: float
    unit_cost_usd: float
    total_cost_usd: float

class PurchaseCreateDTO(BaseModel):
    supplier_id: Optional[str] = None
    supplier_name: str
    invoice_number: Optional[str] = None
    exchange_rate: Optional[float] = 1.0
    total_amount_usd: float
    total_amount_bs: float
    payment_type: Optional[str] = "cash"
    paid_amount_usd: Optional[float] = None
    credit_days: Optional[int] = 0
    notes: Optional[str] = None
    items: List[PurchaseItemDTO]

@router.post("", status_code=status.HTTP_201_CREATED)
def register_purchase(payload: PurchaseCreateDTO, session: Session = Depends(get_session)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Purchase must contain at least one item")

    try:
        pay_type = payload.payment_type or "cash"
        if pay_type == "cash":
            paid_usd = payload.total_amount_usd
            pending_usd = 0.0
            pay_status = "paid"
        else:
            paid_usd = payload.paid_amount_usd if payload.paid_amount_usd is not None else 0.0
            pending_usd = max(0.0, payload.total_amount_usd - paid_usd)
            if pending_usd <= 0.001:
                pay_status = "paid"
            elif paid_usd > 0.0:
                pay_status = "partial"
            else:
                pay_status = "pending"

        # Create Purchase
        new_purchase = Purchase(
            id=str(uuid4()),
            supplier_id=payload.supplier_id,
            supplier_name=payload.supplier_name,
            invoice_number=payload.invoice_number,
            exchange_rate=payload.exchange_rate or 1.0,
            total_amount_usd=payload.total_amount_usd,
            total_amount_bs=payload.total_amount_bs,
            payment_type=pay_type,
            payment_status=pay_status,
            paid_amount_usd=paid_usd,
            pending_amount_usd=pending_usd,
            credit_days=payload.credit_days or 0,
            notes=payload.notes,
            is_synced=False
        )
        session.add(new_purchase)

        # Record payable ledger if supplier credit balance created
        if payload.supplier_id and pending_usd > 0:
            from local_backend.core.models import Supplier, SupplierPayablesLedger, PayableTxType
            supplier = session.get(Supplier, payload.supplier_id)
            if supplier:
                supplier.current_balance_usd = (supplier.current_balance_usd or 0.0) + pending_usd
                supplier.is_synced = False
                session.add(supplier)

                payable_entry = SupplierPayablesLedger(
                    id=str(uuid4()),
                    supplier_id=supplier.id,
                    transaction_type=PayableTxType.CHARGE,
                    amount_usd=pending_usd,
                    exchange_rate=payload.exchange_rate or 1.0,
                    amount_bs=pending_usd * (payload.exchange_rate or 1.0),
                    reference_purchase_id=new_purchase.id,
                    notes=f"Compra a crédito {payload.invoice_number or new_purchase.id[:8]}"
                )
                session.add(payable_entry)

        # Create Items and Update Inventory
        for item in payload.items:
            product = session.get(Product, item.product_id)
            if not product:
                raise HTTPException(status_code=404, detail=f"Product with id {item.product_id} not found")
            
            # Create Item
            purchase_item = PurchaseItem(
                id=str(uuid4()),
                purchase_id=new_purchase.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_cost_usd=item.unit_cost_usd,
                total_cost_usd=item.total_cost_usd
            )
            session.add(purchase_item)

            # Update Inventory
            current_stock = product.cached_stock_quantity if product.cached_stock_quantity is not None else 0.0
            product.cached_stock_quantity = current_stock + item.quantity
            product.cost_usd = item.unit_cost_usd # Update to latest cost
            product.is_synced = False
            
            from local_backend.core.models import InventoryTransaction
            kardex = InventoryTransaction(
                id=str(uuid4()),
                product_id=product.id,
                transaction_type="IN",
                reason="PURCHASE",
                quantity=item.quantity,
                reference_id=new_purchase.id,
            )
            session.add(kardex)
            session.add(product)

        session.commit()
        return {"detail": "Purchase registered successfully", "purchase_id": new_purchase.id}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class PurchasePayDTO(BaseModel):
    amount_usd: float
    notes: Optional[str] = None
    exchange_rate: Optional[float] = None

@router.get("")
def get_purchases(session: Session = Depends(get_session)):
    statement = select(Purchase).order_by(Purchase.created_at.desc())
    purchases = session.exec(statement).all()
    result = []
    for p in purchases:
        items_count = len(session.exec(select(PurchaseItem).where(PurchaseItem.purchase_id == p.id)).all())
        p_dict = p.model_dump()
        p_dict["items_count"] = items_count
        result.append(p_dict)
    return result

@router.get("/{purchase_id}")
def get_purchase_detail(purchase_id: str, session: Session = Depends(get_session)):
    purchase = session.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    items = session.exec(select(PurchaseItem).where(PurchaseItem.purchase_id == purchase_id)).all()
    detailed_items = []
    for item in items:
        prod = session.get(Product, item.product_id)
        i_dict = item.model_dump()
        i_dict["product_name"] = prod.name if prod else "Producto Desconocido"
        i_dict["product_sku"] = prod.sku if prod else ""
        detailed_items.append(i_dict)
        
    res = purchase.model_dump()
    res["items"] = detailed_items
    return res

@router.post("/{purchase_id}/pay")
def pay_purchase_credit(purchase_id: str, payload: PurchasePayDTO, session: Session = Depends(get_session)):
    purchase = session.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    if (purchase.pending_amount_usd or 0.0) <= 0.001:
        raise HTTPException(status_code=400, detail="Esta compra ya se encuentra totalmente pagada.")
    
    if payload.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del abono debe ser mayor a 0.")
    
    pay_amount = min(payload.amount_usd, purchase.pending_amount_usd)
    ex_rate = payload.exchange_rate or purchase.exchange_rate or 36.5
    
    try:
        new_paid = (purchase.paid_amount_usd or 0.0) + pay_amount
        new_pending = max(0.0, (purchase.total_amount_usd or 0.0) - new_paid)
        
        purchase.paid_amount_usd = new_paid
        purchase.pending_amount_usd = new_pending
        
        if new_pending <= 0.001:
            purchase.payment_status = "paid"
        else:
            purchase.payment_status = "partial"
            
        purchase.is_synced = False
        session.add(purchase)
        
        # Registrar movimiento en ledger de cuentas por pagar si aplica proveedor
        if purchase.supplier_id:
            from local_backend.core.models import Supplier, SupplierPayablesLedger, PayableTxType
            supplier = session.get(Supplier, purchase.supplier_id)
            if supplier:
                supplier.current_balance_usd = max(0.0, (supplier.current_balance_usd or 0.0) - pay_amount)
                supplier.is_synced = False
                session.add(supplier)
                
                payable_entry = SupplierPayablesLedger(
                    id=str(uuid4()),
                    supplier_id=supplier.id,
                    purchase_id=purchase.id,
                    tx_type=PayableTxType.PAYMENT,
                    amount_usd=pay_amount,
                    exchange_rate=ex_rate,
                    reference=payload.notes or f"Abono a compra {purchase.invoice_number or purchase.id[:8]}"
                )
                session.add(payable_entry)
                
        session.commit()
        return {
            "detail": "Abono registrado con éxito",
            "purchase_id": purchase.id,
            "paid_amount_usd": purchase.paid_amount_usd,
            "pending_amount_usd": purchase.pending_amount_usd,
            "payment_status": purchase.payment_status
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

