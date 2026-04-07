from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from local_backend.core.database import get_session
from local_backend.core.models import Sale, SaleItem, Product, ProductComposition, PaymentMethod, Client

router = APIRouter(prefix="/sales", tags=["Sales"])

class SaleItemDTO(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    unit_price_usd: float
    tax_amount_usd: float
    total_price_usd: float

class SaleCreateDTO(BaseModel):
    client_id: Optional[str] = None
    client_name: str
    subtotal_usd: float
    tax_amount_usd: float
    total_amount_usd: float
    total_amount_bs: float
    exchange_rate: float
    payment_method: PaymentMethod
    reference_number: Optional[str] = None
    items: List[SaleItemDTO]

@router.post("", status_code=status.HTTP_201_CREATED)
def register_sale(payload: SaleCreateDTO, session: Session = Depends(get_session)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="La venta debe contener al menos un producto")

    try:
        # Create Sale
        new_sale = Sale(
            id=str(uuid4()),
            client_id=payload.client_id,
            client_name=payload.client_name,
            subtotal_usd=payload.subtotal_usd,
            tax_amount_usd=payload.tax_amount_usd,
            total_amount_usd=payload.total_amount_usd,
            total_amount_bs=payload.total_amount_bs,
            exchange_rate=payload.exchange_rate,
            payment_method=payload.payment_method,
            reference_number=payload.reference_number,
            is_synced=False
        )
        session.add(new_sale)

        # Process Items & Inventory
        for item in payload.items:
            product = session.get(Product, item.product_id)
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto con id {item.product_id} no existe")
            
            # Create SaleItem
            sale_item = SaleItem(
                id=str(uuid4()),
                sale_id=new_sale.id,
                product_id=product.id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price_usd=item.unit_price_usd,
                tax_amount_usd=item.tax_amount_usd,
                total_price_usd=item.total_price_usd
            )
            session.add(sale_item)

            # Update Inventory (Discount stock)
            if product.product_type == "physical":
                current_stock = product.cached_stock_quantity if product.cached_stock_quantity is not None else 0.0
                if current_stock < item.quantity:
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente para el producto {product.name} (Stock: {current_stock})")
                product.cached_stock_quantity = current_stock - item.quantity
                product.is_synced = False
                session.add(product)
                
            elif product.product_type == "virtual":
                # For combos, decrease stock of child products
                components = session.exec(select(ProductComposition).where(ProductComposition.parent_id == product.id)).all()
                for comp in components:
                    child_product = session.get(Product, comp.child_id)
                    if not child_product or child_product.product_type != "physical":
                        continue
                    
                    required_qty = comp.quantity_required * item.quantity
                    current_stock = child_product.cached_stock_quantity if child_product.cached_stock_quantity is not None else 0.0
                    
                    if current_stock < required_qty:
                        raise HTTPException(status_code=400, detail=f"Stock insuficiente del componente {child_product.name} (Stock: {current_stock}) para vender el combo {product.name}")
                    
                    child_product.cached_stock_quantity = current_stock - required_qty
                    child_product.is_synced = False
                    session.add(child_product)
                    
            # Services do not track stock
        
        # Optionally, update client debt if paying later (not fully implemented here yet, but prepared for future credit logics)
        
        session.commit()
        return {"detail": "Venta procesada exitosamente", "sale_id": new_sale.id}

    except HTTPException as http_exc:
        session.rollback()
        raise http_exc
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando la venta: {str(e)}")

@router.get("", response_model=List[Sale])
def get_sales(session: Session = Depends(get_session)):
    sales = session.exec(select(Sale).order_by(Sale.created_at.desc())).all()
    return sales
