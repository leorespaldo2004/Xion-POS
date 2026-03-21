from typing import Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, SQLModel, select, Field

from local_backend.core.database import get_session
from local_backend.core.models import Product, ProductType, TaxType, ProductComposition

router = APIRouter(prefix="/inventory", tags=["Inventory"])

class ComboItemCreate(SQLModel):
    product_id: str
    quantity: float = Field(gt=0)

class ProductCreate(SQLModel):
    barcode: str
    name: str
    category_id: Optional[str] = None
    price_usd: float = Field(gt=0)
    cost_usd: float = Field(ge=0)
    current_stock: float = 0
    min_stock: float = 0
    type: str  # physical, combo, service
    has_vat: bool = False
    combo_items: List[ComboItemCreate] = []

class ProductNotFoundError(HTTPException):
    def __init__(self, product_id: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with id {product_id} not found")


@router.get("/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    statement = select(Product).where(Product.is_deleted == False)
    results = session.exec(statement).all()
    return results


@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, session: Session = Depends(get_session)):
    """
    Crea un producto. Si es combo, verifica atómicamente sus dependencias.
    """
    if payload.type == "combo" and not payload.combo_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Combos require at least one child product"
        )

    # Verifica duplicados de barcode
    existing = session.exec(select(Product).where(Product.barcode == payload.barcode)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Barcode already exists")

    product_type_map = {
        "physical": ProductType.PHYSICAL,
        "combo": ProductType.VIRTUAL,
        "service": ProductType.SERVICE
    }
    ptype = product_type_map.get(payload.type, ProductType.PHYSICAL)

    tax_type = TaxType.VAT if payload.has_vat else TaxType.NONE

    new_product = Product(
        id=str(uuid4()),
        sku=payload.barcode,
        barcode=payload.barcode,
        name=payload.name,
        category_id=payload.category_id,
        price_usd=payload.price_usd,
        cost_usd=payload.cost_usd,
        product_type=ptype,
        tax_type=tax_type,
        cached_stock_quantity=payload.current_stock,
        min_stock_alert=payload.min_stock,
        is_synced=False,
        is_deleted=False,
    )
    
    session.add(new_product)

    # Lógica atómica para Combos
    if payload.type == "combo":
        for item in payload.combo_items:
            # Validar que el hijo exista
            child = session.get(Product, item.product_id)
            if not child:
                session.rollback()
                raise HTTPException(status_code=404, detail=f"Child product {item.product_id} not found")
            
            combo_link = ProductComposition(
                parent_id=new_product.id,
                child_id=item.product_id,
                quantity_required=item.quantity
            )
            session.add(combo_link)

    try:
        session.commit()
        session.refresh(new_product)
        return new_product
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Transaction failed in local storage")


@router.put("/products/{product_id}", response_model=Product)
def update_product(product_id: str, updated_data: Dict[str, object], session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product or product.is_deleted:
        raise ProductNotFoundError(product_id)

    # Block manual stock manipulation from updates
    if "cached_stock_quantity" in updated_data:
        updated_data.pop("cached_stock_quantity")

    # Validate required fields where applicable
    if "product_type" in updated_data and updated_data["product_type"] == ProductType.SERVICE:
        updated_data["min_stock_alert"] = 0

    for key, value in updated_data.items():
        if hasattr(product, key) and key not in {"id", "created_at", "updated_at", "is_deleted", "is_synced"}:
            setattr(product, key, value)

    from datetime import datetime
    product.is_synced = False
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: str, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product or product.is_deleted:
        raise ProductNotFoundError(product_id)

    product.is_deleted = True
    product.is_synced = False
    session.add(product)
    session.commit()


class ProductComboComponent(SQLModel):
    child_id: str
    quantity_required: float = 1.0


@router.get("/products/{combo_id}/components")
def get_combo_components(combo_id: str, session: Session = Depends(get_session)):
    combo = session.get(Product, combo_id)
    if not combo or combo.is_deleted:
        raise ProductNotFoundError(combo_id)

    if combo.product_type != ProductType.VIRTUAL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only combo products can have components")

    statement = select(ProductComposition).where(ProductComposition.parent_id == combo_id)
    results = session.exec(statement).all()
    return results


@router.put("/products/{combo_id}/components")
def set_combo_components(combo_id: str, components: List[ProductComboComponent], session: Session = Depends(get_session)):
    combo = session.get(Product, combo_id)
    if not combo or combo.is_deleted:
        raise ProductNotFoundError(combo_id)

    if combo.product_type != ProductType.VIRTUAL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only combo products can have components")

    # Clear existing
    existing = session.exec(select(ProductComposition).where(ProductComposition.parent_id == combo_id)).all()
    for row in existing:
        session.delete(row)

    # Add new components
    for component in components:
        child = session.get(Product, component.child_id)
        if not child or child.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Child product {component.child_id} not found")
        comp = ProductComposition(parent_id=combo_id, child_id=component.child_id, quantity_required=component.quantity_required)
        session.add(comp)

    session.commit()
    updated = session.exec(select(ProductComposition).where(ProductComposition.parent_id == combo_id)).all()
    return updated
