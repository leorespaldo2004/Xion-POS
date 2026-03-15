# -----------------------------------------------------------------------------
# ARCHITECT: DEV MASTER POS
# MODULE: Database Schema Definition (SQLModel)
# CONTEXT: Offline-First, Dollarized Backend, Atomic Transactions
# VERSION: 2.1 (Production Ready - Fiscal & Ledger Support)
# -----------------------------------------------------------------------------

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship
from enum import Enum

# =============================================================================
# 1. ENUMS (REGLAS DE DOMINIO INMUTABLES)
# =============================================================================

class Role(str, Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    CASHIER = "cashier"
    INVENTORY = "inventory_manager"

class SaleStatus(str, Enum):
    PENDING = "pending"     # En carrito / Hold
    COMPLETED = "completed" # Pagado y cerrado
    CANCELED = "canceled"   # Anulado antes de pago
    REFUNDED = "refunded"   # Devolución post-pago

class PaymentMethod(str, Enum):
    CASH_USD = "cash_usd"
    CASH_BS = "cash_bs"
    PAGO_MOVIL = "pago_movil"
    DEBIT_CARD = "debit_card"
    CREDIT_CARD = "credit_card"
    ZELLE = "zelle"
    BIOPAGO = "biopago"
    CREDIT_CUSTOMER = "credit_internal" 

class ProductType(str, Enum):
    [cite_start]PHYSICAL = "physical" # Controla Stock Unitario/Granel [cite: 44, 45]
    [cite_start]SERVICE = "service"   # Intangible (No controla stock) [cite: 47]
    [cite_start]COMBO = "combo"       # Compuesto (Stock depende de hijos) [cite: 46]

class TaxType(str, Enum):
    """Tipos de impuesto según normativa SENIAT"""
    EXEMPT = "exempt"         # Exento (E)
    GENERAL = "general"       # 16% (G)
    REDUCED = "reduced"       # 8% (R)
    LUXURY = "luxury"         # 31% (L)
    [cite_start]IGTF = "igtf"             # 3% (Impuesto divisa) [cite: 73]

class StockMovementType(str, Enum):
    """Razones para mover el inventario en el Ledger"""
    SALE = "sale"             # Venta regular
    PURCHASE = "purchase"     # Recepción de mercancía
    ADJUSTMENT = "adjustment" # Merma / Robo / Ajuste Manual
    RETURN = "return"         # Devolución de cliente
    COMBO_ASSEMBLY = "combo_assembly" # Consumo interno para armar combo

# =============================================================================
# 2. BASE MODEL (SYNC & AUDIT KERNEL)
# =============================================================================

class BaseModel(SQLModel):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # --- SYNC & CONCURRENCY ---
    # [cite_start]Si is_synced es False, el hilo de fondo (Background Task) lo subirá a la nube [cite: 16, 20]
    is_synced: bool = Field(default=False, index=True) 
    is_deleted: bool = Field(default=False) # Soft Delete para integridad histórica

# =============================================================================
# 3. CONTROL DE SISTEMA Y SEGURIDAD (SYSTEM CORE)
# =============================================================================

class SystemMetadata(BaseModel, table=True):
    __tablename__ = "system_metadata"
    app_version: str 
    schema_version: str 
    last_update_check: datetime = Field(default_factory=datetime.utcnow)

class LocalDeviceSecurity(BaseModel, table=True):
    """
    [cite_start]DRM & Kill Switch[cite: 153, 156].
    Gestiona la regla de las 72 horas y el bloqueo por hardware.
    """
    __tablename__ = "device_security"
    
    machine_id_hash: str = Field(description="Hash del Hardware ID")
    license_key: str = Field(index=True)
    jwt_token: str = Field(description="Token firmado por la Nube")
    
    # REGLA DE 72 HORAS
    last_online_check: datetime = Field(default_factory=datetime.utcnow)
    next_check_due: datetime = Field(description="Fecha límite antes del bloqueo")
    is_locked: bool = Field(default=False)
    lock_reason: Optional[str] = None

class TenantConfig(BaseModel, table=True):
    [cite_start]"""Datos Fiscales y Moneda Ancla (The Anchor) [cite: 6, 92]"""
    __tablename__ = "system_config"
    
    company_name: str
    rif: str = Field(unique=True)
    address: str
    phone: str
    
    # FINANCIERO
    current_exchange_rate: Decimal = Field(default=0, max_digits=12, decimal_places=4) # Tasa del día
    currency_symbol: str = Field(default="$")
    
    # UX
    logo_path: Optional[str] = None
    [cite_start]allow_negative_stock: bool = Field(default=False) [cite: 36]

# =============================================================================
# 4. USUARIOS
# =============================================================================

class User(BaseModel, table=True):
    __tablename__ = "users"
    username: str = Field(index=True, unique=True)
    email: Optional[str] = Field(unique=True)
    password_hash: str
    role: Role = Field(default=Role.CASHIER)
    full_name: str
    pin_code: Optional[str] = Field(description="Acceso rápido táctil")
    active: bool = Field(default=True)

    # Relaciones
    shifts: List["WorkShift"] = Relationship(back_populates="user")
    sales: List["Order"] = Relationship(back_populates="user")

# =============================================================================
# 5. INVENTARIO (HYBRID BRAIN)
# =============================================================================

class Category(BaseModel, table=True):
    __tablename__ = "categories"
    name: str
    printer_ip: Optional[str] = None # Cocina/Barra
    products: List["Product"] = Relationship(back_populates="category")

class Product(BaseModel, table=True):
    """
    El núcleo del inventario. Precios en USD.
    El stock real se calcula via InventoryTransaction (Ledger), pero mantenemos
    cached_stock_quantity para lectura rápida en UI.
    """
    __tablename__ = "products"
    sku: str = Field(unique=True, index=True)
    barcode: Optional[str] = Field(index=True)
    name: str
    description: Optional[str] = None
    category_id: Optional[UUID] = Field(default=None, foreign_key="categories.id")
    
    # [cite_start]ANCHOR CURRENCY [cite: 7]
    cost_usd: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    price_usd: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    
    # REGLAS
    product_type: ProductType = Field(default=ProductType.PHYSICAL)
    tax_type: TaxType = Field(default=TaxType.GENERAL) 
    [cite_start]unit_measure: str = Field(default="UND") [cite: 28]
    
    # STOCK CACHE (Read Model)
    cached_stock_quantity: Decimal = Field(default=0, max_digits=12, decimal_places=3)
    min_stock_alert: Decimal = Field(default=5)

    category: Optional[Category] = Relationship(back_populates="products")
    # Relación inversa para combos (definida abajo via ProductComposition)

class ProductComposition(SQLModel, table=True):
    """
    [cite_start]Tabla Intermedia para Combos/Recetas[cite: 46].
    Define qué hijos (ingredientes) componen un padre (combo).
    """
    __tablename__ = "product_compositions"
    
    parent_id: UUID = Field(foreign_key="products.id", primary_key=True)
    child_id: UUID = Field(foreign_key="products.id", primary_key=True)
    
    quantity_required: Decimal = Field(default=1, max_digits=10, decimal_places=3)
    is_synced: bool = Field(default=False)

class InventoryTransaction(BaseModel, table=True):
    """
    [cite_start]THE LEDGER: Historial Inmutable de Inventario[cite: 5, 28].
    Garantiza atomicidad y trazabilidad.
    """
    __tablename__ = "inventory_transactions"
    
    product_id: UUID = Field(foreign_key="products.id", index=True)
    
    # Origen del movimiento
    order_id: Optional[UUID] = Field(foreign_key="orders.id", nullable=True)
    
    movement_type: StockMovementType
    quantity: Decimal = Field(description="Positivo entrada, Negativo salida") # Ej: -12 cervezas
    
    cost_snapshot_usd: Decimal = Field(description="Costo al momento del movimiento")
    reason: str = Field(default="System Action")

# =============================================================================
# 6. OPERACIONES DE VENTA (REVENUE ENGINE)
# =============================================================================

class Customer(BaseModel, table=True):
    __tablename__ = "customers"
    national_id: str = Field(unique=True, index=True) # CI/RIF
    first_name: str
    last_name: str
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    credit_limit_usd: Decimal = Field(default=0)
    
    orders: List["Order"] = Relationship(back_populates="customer")

class WorkShift(BaseModel, table=True):
    """Turno de Caja / Cuadre"""
    __tablename__ = "work_shifts"
    user_id: UUID = Field(foreign_key="users.id")
    
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    
    initial_cash_usd: Decimal = Field(default=0)
    initial_cash_bs: Decimal = Field(default=0)
    
    # Arqueo (Ciego)
    declared_cash_usd: Optional[Decimal] = None
    declared_cash_bs: Optional[Decimal] = None
    
    status: str = Field(default="open") 
    user: Optional[User] = Relationship(back_populates="shifts")
    orders: List["Order"] = Relationship(back_populates="shift")

class Order(BaseModel, table=True):
    """Encabezado de Factura"""
    __tablename__ = "orders"
    shift_id: UUID = Field(foreign_key="work_shifts.id")
    user_id: UUID = Field(foreign_key="users.id")
    customer_id: Optional[UUID] = Field(foreign_key="customers.id", nullable=True)
    
    order_number: str = Field(index=True, unique=True)
    status: SaleStatus = Field(default=SaleStatus.PENDING)
    
    # [cite_start]FISCALIDAD VENEZUELA [cite: 69]
    fiscal_printer_serial: Optional[str] = None
    fiscal_receipt_number: Optional[str] = None # Número de Factura Fiscal
    z_report_number: Optional[str] = None
    
    # [cite_start]SNAPSHOTS FINANCIEROS (INMUTABLES) [cite: 14]
    subtotal_usd: Decimal = Field(max_digits=12, decimal_places=2)
    tax_usd: Decimal = Field(max_digits=12, decimal_places=2)
    total_usd: Decimal = Field(max_digits=12, decimal_places=2)
    
    exchange_rate_snapshot: Decimal = Field(description="Tasa usada para reportar en Bs")
    total_bs_snapshot: Decimal = Field(description="Monto reportado fiscalmente en Bs")
    
    # Datos de Cliente Snapshot (si customer_id es null o genérico)
    client_name_snapshot: str = Field(default="Consumidor Final")
    client_id_doc_snapshot: str = Field(default="00000000")

    shift: Optional[WorkShift] = Relationship(back_populates="orders")
    user: Optional[User] = Relationship(back_populates="sales")
    customer: Optional[Customer] = Relationship(back_populates="orders")
    items: List["OrderItem"] = Relationship(back_populates="order")
    payments: List["Payment"] = Relationship(back_populates="order")

class OrderItem(BaseModel, table=True):
    __tablename__ = "order_items"
    order_id: UUID = Field(foreign_key="orders.id")
    product_id: UUID = Field(foreign_key="products.id")
    
    product_name_snapshot: str
    quantity: Decimal = Field(max_digits=12, decimal_places=3)
    
    # Financials at time of sale
    unit_price_usd: Decimal 
    discount_usd: Decimal = Field(default=0) 
    tax_rate_snapshot: Decimal = Field(description="Porcentaje aplicado (ej: 0.16)")
    tax_amount_usd: Decimal
    total_usd: Decimal 

    order: Optional[Order] = Relationship(back_populates="items")

class Payment(BaseModel, table=True):
    """
    Registro de pagos y vueltos.
    [cite_start]Soporta Split Tender (Multi-moneda) [cite: 71]
    """
    __tablename__ = "payments"
    order_id: UUID = Field(foreign_key="orders.id")
    
    method: PaymentMethod
    
    # [cite_start]Si is_change=True, amount_paid debe interpretarse como salida de caja (Vuelto) [cite: 72]
    is_change: bool = Field(default=False)
    
    amount_paid: Decimal     # Monto en moneda original (ej: 100 Bs)
    currency_code: str       # "VES" o "USD"
    exchange_rate_used: Decimal 
    amount_converted_usd: Decimal # Contravalor en sistema

    reference_code: Optional[str] = None # Lote/Ref bancaria
    order: Optional[Order] = Relationship(back_populates="payments")

class UnitOfMeasure(BaseModel, table=True):
    """
    Gestiona la conversión atómica de unidades[cite: 28, 41].
    Ejemplo: Base 'gramo', Referencia 'Saco 50kg', Factor 50000.
    """
    __tablename__ = "units_of_measure"
    name: str = Field(unique=True) # UND, KG, L, CAJA-12
    abbreviation: str
    is_base_unit: bool = Field(default=False)
    # Factor para convertir esta unidad a la unidad base
    conversion_factor: Decimal = Field(default=1.0, max_digits=12, decimal_places=5)

class ExchangeRateLog(BaseModel, table=True):
    """Auditoría de cambios de tasa (Manual Override) """
    __tablename__ = "exchange_rate_log"
    rate: Decimal = Field(max_digits=12, decimal_places=4)
    user_id: UUID = Field(foreign_key="users.id")
    is_manual_override: bool = Field(default=False)