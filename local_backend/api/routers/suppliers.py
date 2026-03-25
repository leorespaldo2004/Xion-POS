from typing import List, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, Field, SQLModel

from local_backend.core.database import get_session
from local_backend.core.models import Supplier

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

class SupplierCreate(SQLModel):
    name: str = Field(min_length=2)
    email: str
    phone: str | None = None
    address: str | None = None
    identification_type: str = "RIF"
    identification_number: str
    category: str = "Varios"
    payment_terms: str | None = None
    notes: str | None = None
    is_active: bool = True

class SupplierNotFoundError(HTTPException):
    def __init__(self, supplier_id: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supplier with id {supplier_id} not found")

@router.get("", response_model=List[Supplier])
def get_suppliers(session: Session = Depends(get_session)):
    statement = select(Supplier)
    results = session.exec(statement).all()
    return results

@router.post("", status_code=status.HTTP_201_CREATED, response_model=Supplier)
def create_supplier(payload: SupplierCreate, session: Session = Depends(get_session)):
    existing_id = session.exec(select(Supplier).where(Supplier.identification_number == payload.identification_number)).first()
    if existing_id:
        raise HTTPException(status_code=409, detail="Identification number already registered")

    new_supplier = Supplier(
        id=str(uuid4()),
        **payload.model_dump(),
        is_synced=False
    )
    
    session.add(new_supplier)
    try:
        session.commit()
        session.refresh(new_supplier)
        return new_supplier
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Transaction failed")

@router.put("/{supplier_id}", response_model=Supplier)
def update_supplier(supplier_id: str, updated_data: Dict[str, object], session: Session = Depends(get_session)):
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise SupplierNotFoundError(supplier_id)
            
    if "identification_number" in updated_data and updated_data["identification_number"] != supplier.identification_number:
        existing = session.exec(select(Supplier).where(Supplier.identification_number == updated_data["identification_number"])).first()
        if existing:
            raise HTTPException(status_code=409, detail="Identification number already registered")

    for key, value in updated_data.items():
        if hasattr(supplier, key) and key not in {"id", "created_at", "updated_at", "is_synced"}:
            setattr(supplier, key, value)

    supplier.is_synced = False
    supplier.updated_at = datetime.utcnow()
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier

@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: str, session: Session = Depends(get_session)):
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise SupplierNotFoundError(supplier_id)
    session.delete(supplier)
    session.commit()
