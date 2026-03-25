from datetime import datetime
from typing import Optional

from enum import Enum
from sqlmodel import SQLModel, Field


class ProductType(str, Enum):
    PHYSICAL = "physical"
    VIRTUAL = "virtual"
    SERVICE = "service"


class TaxType(str, Enum):
    NONE = "none"
    VAT = "vat"
    ISLR = "islr"


class Product(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True, index=True)
    sku: str = Field(nullable=False, index=True)
    barcode: Optional[str] = None
    name: str = Field(nullable=False)
    description: Optional[str] = None
    category_id: Optional[str] = None
    cost_usd: float = Field(default=0.0, nullable=False)
    price_usd: float = Field(default=0.0, nullable=False)
    product_type: ProductType = Field(default=ProductType.PHYSICAL)
    tax_type: TaxType = Field(default=TaxType.NONE)
    unit_measure: str = Field(default="UND")
    cached_stock_quantity: float = Field(default=0.0)
    min_stock_alert: float = Field(default=0.0)
    tags: Optional[str] = Field(default=None, index=True)
    is_synced: bool = Field(default=False)
    is_deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProductComposition(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: str = Field(nullable=False, foreign_key="product.id")
    child_id: str = Field(nullable=False, foreign_key="product.id")
    quantity_required: float = Field(default=1.0, nullable=False)

class SystemConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    anchor_currency: str = Field(default="USD", nullable=False)
    current_exchange_rate_bs: float = Field(default=36.5, nullable=False)
    lockdown_mode: bool = Field(default=False, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class Client(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True, index=True)
    name: str = Field(nullable=False, index=True)
    email: str = Field(nullable=False, index=True)
    phone: Optional[str] = None
    address: Optional[str] = None
    identification_type: str = Field(default="CI", nullable=False)
    identification_number: str = Field(nullable=False, index=True)
    credit_limit: float = Field(default=0.0)
    current_debt: float = Field(default=0.0)
    is_active: bool = Field(default=True)
    is_synced: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class User(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True, index=True)
    name: str = Field(nullable=False)
    email: str = Field(nullable=False, index=True)
    role: str = Field(default="viewer", nullable=False) # admin, manager, cashier, viewer
    status: str = Field(default="active", nullable=False) # active, inactive
    last_login: Optional[str] = None
    
    # Permissions
    perm_sales: bool = Field(default=False)
    perm_inventory: bool = Field(default=False)
    perm_reports: bool = Field(default=False)
    perm_users: bool = Field(default=False)
    
    is_synced: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Supplier(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True, index=True)
    name: str = Field(nullable=False, index=True)
    email: str = Field(nullable=False, index=True)
    phone: Optional[str] = None
    address: Optional[str] = None
    identification_type: str = Field(default="RIF", nullable=False)
    identification_number: str = Field(nullable=False, index=True)
    category: str = Field(default="Varios", nullable=False)
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = Field(default=True)
    is_synced: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
