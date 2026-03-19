from typing import List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from local_backend.core.database import get_session
from local_backend.core.models import Product, ProductType, TaxType

router = APIRouter(prefix="/inventory", tags=["Inventory"])

class ProductNotFoundError(HTTPException):
    def __init__(self, product_id: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with id {product_id} not found")


@router.get("/products", response_model=List[Product])
def get_products(session: Session = Depends(get_session)):
    statement = select(Product).where(Product.is_deleted == False)
    results = session.exec(statement).all()
    return results


@router.post("/products", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(product: Product, session: Session = Depends(get_session)):
    if not product.id:
        product.id = str(uuid4())
    try:
        product.is_synced = False
        product.is_deleted = False
        session.add(product)
        session.commit()
        session.refresh(product)
        return product
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail={"error": str(e)})


@router.put("/products/{product_id}", response_model=Product)
def update_product(product_id: str, updated_data: dict, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product or product.is_deleted:
        raise ProductNotFoundError(product_id)

    for key, value in updated_data.items():
        if hasattr(product, key):
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
