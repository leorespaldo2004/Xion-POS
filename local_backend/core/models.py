import uuid
from datetime import datetime, UTC
from typing import Optional, Union
from enum import Enum
from pydantic import computed_field
from sqlmodel import SQLModel, Field

def get_now_utc() -> datetime:
    return datetime.now(UTC)

# ============================================================================
# 1. TIPOS ENUMERADOS (ENUMS)
# ============================================================================

class ProductType(str, Enum):
    PHYSICAL = "physical"
    VIRTUAL = "virtual"
    SERVICE = "service"

class TaxType(str, Enum):
    NONE = "none"
    VAT_STANDARD = "vat_standard"
    VAT_REDUCED = "vat_reduced"
    EXEMPT = "exempt"
    VAT = "vat"
    ISLR = "islr"

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    CASHIER = "cashier"
    VIEWER = "viewer"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class PurchasePaymentType(str, Enum):
    CASH = "cash"
    CREDIT = "credit"

class PurchasePaymentStatus(str, Enum):
    PAID = "paid"
    PENDING = "pending"
    PARTIAL = "partial"

class SaleStatus(str, Enum):
    COMPLETED = "completed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    VOIDED = "voided"
    PENDING_SYNC = "pending_sync"

class CashSessionStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"

class InventoryTxType(str, Enum):
    IN = "IN"
    OUT = "OUT"

class InventoryTxReason(str, Enum):
    SALE = "SALE"
    PURCHASE = "PURCHASE"
    SHRINKAGE = "SHRINKAGE"
    REFUND = "REFUND"
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"
    COMBO_PACK = "COMBO_PACK"

class AuditSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class DeliveryDocType(str, Enum):
    PREFACTURA = "PREFACTURA"
    NOTA_ENTREGA = "NOTA_ENTREGA"

class ReceivableTxType(str, Enum):
    CHARGE = "CHARGE"
    PAYMENT = "PAYMENT"
    DISCOUNT = "DISCOUNT"
    ADJUSTMENT = "ADJUSTMENT"

class PayableTxType(str, Enum):
    CHARGE = "CHARGE"
    PAYMENT = "PAYMENT"
    ADJUSTMENT = "ADJUSTMENT"


# ============================================================================
# 2. INFRAESTRUCTURA DE DISPOSITIVOS Y CONFIGURACIÓN
# ============================================================================

class Device(SQLModel, table=True):
    __tablename__: str = "devices"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    device_code: str = Field(default="", nullable=False, unique=True, index=True)
    branch_name: str = Field(default="Principal", nullable=False)
    description: Optional[str] = None
    is_active: bool = Field(default=True, nullable=False)
    last_sync_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)


class SystemConfig(SQLModel, table=True):
    __tablename__: str = "system_config"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=1, primary_key=True)
    anchor_currency: str = Field(default="USD", nullable=False)
    current_exchange_rate_bs: float = Field(default=36.5, nullable=False)
    lockdown_mode: bool = Field(default=False, nullable=False)
    
    # Datos del Negocio
    store_name: str = Field(default="Mi Tienda POS", nullable=False)
    store_rif: str = Field(default="J-12345678-9", nullable=False)
    store_address: str = Field(default="", nullable=False)
    store_phone: str = Field(default="", nullable=False)
    
    # Impuestos y Mayoreo
    default_vat_rate: float = Field(default=16.0, nullable=False)
    igtf_rate: float = Field(default=3.0, nullable=False)
    enable_taxes: bool = Field(default=True, nullable=False)
    wholesale_enabled: bool = Field(default=True, nullable=False)
    wholesale_min_qty: float = Field(default=10.0, nullable=False)
    
    # Impresión e Preferencias
    ticket_size: str = Field(default="80mm", nullable=False)
    ticket_message: str = Field(default="Gracias por su compra.", nullable=False)
    allow_negative_stock: bool = Field(default=False, nullable=False)
    google_taxonomy_etag: Optional[str] = Field(default=None, nullable=True)
    google_taxonomy_last_checked: Optional[datetime] = Field(default=None, nullable=True)
    version: int = Field(default=1, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    # Preferencias y Ajustes Locales (Compatibilidad UI)
    auto_print: bool = Field(default=True, nullable=False)
    print_logo: bool = Field(default=True, nullable=False)
    theme_mode: str = Field(default="light", nullable=False)
    font_size: int = Field(default=16, nullable=False)
    primary_color: str = Field(default="#132DA8", nullable=False)
    compact_mode: bool = Field(default=False, nullable=False)
    animations: bool = Field(default=True, nullable=False)
    high_contrast: bool = Field(default=False, nullable=False)
    interface_density: str = Field(default="normal", nullable=False)
    payment_methods_json: str = Field(default='[]', nullable=False)

    @property
    def tax_rate(self) -> float:
        return self.default_vat_rate

    @tax_rate.setter
    def tax_rate(self, value: float) -> None:
        self.default_vat_rate = value


# ============================================================================
# 3. SEGURIDAD Y CONTROL DE ACCESO
# ============================================================================

class User(SQLModel, table=True):
    __tablename__: str = "users"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    name: str = Field(default="", nullable=False)
    email: str = Field(default="", nullable=False, unique=True, index=True)
    role: UserRole = Field(default=UserRole.VIEWER, nullable=False)
    status: UserStatus = Field(default=UserStatus.ACTIVE, nullable=False)
    last_login: Optional[datetime] = None
    access_pin_hash: Optional[str] = None
    qr_token: Optional[str] = Field(default=None, unique=True, index=True)
    
    perm_sales: bool = Field(default=False, nullable=False)
    perm_inventory: bool = Field(default=False, nullable=False)
    perm_reports: bool = Field(default=False, nullable=False)
    perm_users: bool = Field(default=False, nullable=False)
    
    version: int = Field(default=1, nullable=False)
    deleted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    # Legacy & UI properties
    is_synced: bool = Field(default=False)

    @property
    def access_pin(self) -> Optional[str]:
        return self.access_pin_hash

    @access_pin.setter
    def access_pin(self, value: Optional[str]) -> None:
        self.access_pin_hash = value


class SupervisorAuthCode(SQLModel, table=True):
    __tablename__: str = "supervisor_auth_codes"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(default="", nullable=False, foreign_key="users.id", index=True)
    code_hash: str = Field(default="", nullable=False)
    salt: str = Field(default="", nullable=False)
    code_prefix: str = Field(default="", max_length=8, nullable=False)
    qr_payload_version: Optional[str] = Field(default="v1", max_length=10)
    is_active: bool = Field(default=True, index=True)
    max_uses: Optional[int] = Field(default=1)
    times_used: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


# ============================================================================
# 4. CATÁLOGO DE PRODUCTOS E INVENTARIO
# ============================================================================

class Category(SQLModel, table=True):
    __tablename__: str = "categories"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    name: str = Field(default="", nullable=False, index=True)
    slug: str = Field(default="", nullable=False, unique=True, index=True)
    parent_id: Optional[str] = Field(default=None, foreign_key="categories.id")
    google_taxonomy_id: Optional[int] = None
    is_active: bool = Field(default=True, nullable=False)
    version: int = Field(default=1, nullable=False)
    deleted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)


class Product(SQLModel, table=True):
    __tablename__: str = "products"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    sku: str = Field(default="", nullable=False, unique=True, index=True)
    barcode: Optional[str] = Field(default=None, index=True)
    name: str = Field(default="", nullable=False, index=True)
    description: Optional[str] = None
    category_id: Optional[str] = Field(default=None, foreign_key="categories.id", index=True)
    image_url: Optional[str] = None
    cost_usd: float = Field(default=0.0, nullable=False)
    price_usd: float = Field(default=0.0, nullable=False)
    wholesale_price_usd: float = Field(default=0.0, nullable=False)
    product_type: ProductType = Field(default=ProductType.PHYSICAL, nullable=False)
    tax_type: TaxType = Field(default=TaxType.VAT, nullable=False)
    unit_measure: str = Field(default="UND", nullable=False)
    package_quantity: int = Field(default=1, nullable=False)
    cached_stock_quantity: float = Field(default=0.0, nullable=False)
    min_stock_alert: float = Field(default=0.0, nullable=False)
    version: int = Field(default=1, nullable=False)
    deleted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    # Legacy & Sync Flags
    is_synced: bool = Field(default=False)

    @computed_field
    @property
    def image_id(self) -> Optional[str]:
        return self.image_url

    @image_id.setter
    def image_id(self, value: Optional[str]) -> None:
        self.image_url = value

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @is_deleted.setter
    def is_deleted(self, value: bool) -> None:
        if value and not self.deleted_at:
            self.deleted_at = get_now_utc()
        elif not value:
            self.deleted_at = None


class ProductComposition(SQLModel, table=True):
    __tablename__: str = "product_compositions"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    parent_id: str = Field(default="", nullable=False, foreign_key="products.id")
    child_id: str = Field(default="", nullable=False, foreign_key="products.id")
    quantity_required: float = Field(default=1.0, nullable=False)


# ============================================================================
# 5. CLIENTES, PROVEEDORES Y CRÉDITO (LEDGER)
# ============================================================================

class Client(SQLModel, table=True):
    __tablename__: str = "clients"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    name: str = Field(default="", nullable=False, index=True)
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = None
    address: Optional[str] = None
    identification_type: str = Field(default="CI", nullable=False)
    identification_number: str = Field(default="", nullable=False, index=True)
    credit_limit_usd: float = Field(default=0.0, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    version: int = Field(default=1, nullable=False)
    deleted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    # Legacy fields
    current_debt: float = Field(default=0.0)
    is_synced: bool = Field(default=False)

    @computed_field
    @property
    def credit_limit(self) -> float:
        return self.credit_limit_usd

    @credit_limit.setter
    def credit_limit(self, value: float) -> None:
        self.credit_limit_usd = value


class Supplier(SQLModel, table=True):
    __tablename__: str = "suppliers"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    name: str = Field(default="", nullable=False, index=True)
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = None
    address: Optional[str] = None
    identification_type: str = Field(default="RIF", nullable=False)
    identification_number: str = Field(default="", nullable=False, index=True)
    category: str = Field(default="Varios", nullable=False)
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = Field(default=True, nullable=False)
    version: int = Field(default=1, nullable=False)
    deleted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    is_synced: bool = Field(default=False)


# ============================================================================
# 6. CAJAS Y MÉTODOS DE PAGO
# ============================================================================

class PaymentMethodModel(SQLModel, table=True):
    __tablename__: str = "payment_methods"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    name: str = Field(default="", nullable=False)
    code: str = Field(default="", unique=True, index=True, nullable=False)
    currency: str = Field(default="USD", nullable=False)
    is_digital: bool = Field(default=False, nullable=False)
    applies_igtf: bool = Field(default=False, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    image_url: Optional[str] = Field(default=None, nullable=True)

    # Legacy properties
    allow_decimals: bool = Field(default=True, nullable=False)
    is_system: bool = Field(default=False, nullable=False)


class CashSession(SQLModel, table=True):
    __tablename__: str = "cash_sessions"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.id")
    user_id: str = Field(default="", nullable=False, foreign_key="users.id", index=True)
    opening_time: datetime = Field(default_factory=get_now_utc, nullable=False)
    closing_time: Optional[datetime] = None
    status: CashSessionStatus = Field(default=CashSessionStatus.OPEN, nullable=False)
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    # Session stats/summary for cashier operations
    user_name: Optional[str] = Field(default="")
    opening_balance_usd: float = Field(default=0.0)
    closing_balance_usd: float = Field(default=0.0)
    total_sales_usd: float = Field(default=0.0)
    total_tax_usd: float = Field(default=0.0)
    payments_summary_json: str = Field(default='{}', nullable=False)
    is_synced: bool = Field(default=False)


class CashSessionDenomination(SQLModel, table=True):
    __tablename__: str = "cash_session_denominations"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    cash_session_id: str = Field(default="", nullable=False, foreign_key="cash_sessions.id", index=True)
    currency: str = Field(default="USD", nullable=False)
    payment_method_id: Optional[int] = Field(default=None, foreign_key="payment_methods.id")
    declared_opening: float = Field(default=0.0, nullable=False)
    system_expected: float = Field(default=0.0, nullable=False)
    actual_counted: float = Field(default=0.0, nullable=False)
    difference: float = Field(default=0.0, nullable=False)


# ============================================================================
# 7. VENTAS Y FACTURACIÓN
# ============================================================================

class Sale(SQLModel, table=True):
    __tablename__: str = "sales"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.id")
    cash_session_id: Optional[str] = Field(default=None, foreign_key="cash_sessions.id", index=True)
    client_id: Optional[str] = Field(default=None, foreign_key="clients.id", index=True)
    client_name: str = Field(default="Cliente Final", nullable=False)
    subtotal_usd: float = Field(default=0.0, nullable=False)
    tax_amount_usd: float = Field(default=0.0, nullable=False)
    igtf_amount_usd: float = Field(default=0.0, nullable=False)
    total_amount_usd: float = Field(default=0.0, nullable=False)
    total_amount_bs: float = Field(default=0.0, nullable=False)
    exchange_rate: float = Field(default=36.5, nullable=False)
    status: SaleStatus = Field(default=SaleStatus.COMPLETED, nullable=False)
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    is_synced: bool = Field(default=False)


class SaleItem(SQLModel, table=True):
    __tablename__: str = "sale_items"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    sale_id: str = Field(default="", nullable=False, foreign_key="sales.id", index=True)
    product_id: str = Field(default="", nullable=False, foreign_key="products.id", index=True)
    product_name: str = Field(default="", nullable=False)
    quantity: float = Field(default=1.0, nullable=False)
    unit_price_usd: float = Field(default=0.0, nullable=False)
    tax_rate: float = Field(default=16.0, nullable=False)
    tax_amount_usd: float = Field(default=0.0, nullable=False)
    total_price_usd: float = Field(default=0.0, nullable=False)


class SalePayment(SQLModel, table=True):
    __tablename__: str = "sale_payments"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    sale_id: str = Field(default="", nullable=False, foreign_key="sales.id", index=True)
    payment_method_id: str = Field(default="1", nullable=False, index=True)
    currency: str = Field(default="USD", nullable=False)
    exchange_rate: float = Field(default=1.0, nullable=False)
    amount_tendered: float = Field(default=0.0, nullable=False)
    amount_usd: float = Field(default=0.0, nullable=False)
    reference_code: Optional[str] = None
    payment_method_label: Optional[str] = None
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)


class ClientReceivablesLedger(SQLModel, table=True):
    __tablename__: str = "client_receivables_ledger"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    client_id: str = Field(default="", nullable=False, foreign_key="clients.id", index=True)
    sale_id: Optional[str] = Field(default=None, foreign_key="sales.id")
    tx_type: ReceivableTxType = Field(default=ReceivableTxType.CHARGE, nullable=False)
    amount_usd: float = Field(default=0.0, nullable=False)
    exchange_rate: float = Field(default=36.5, nullable=False)
    reference: Optional[str] = None
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)


# ============================================================================
# 8. COMPRAS Y CUENTAS POR PAGAR (CxP)
# ============================================================================

class Purchase(SQLModel, table=True):
    __tablename__: str = "purchases"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.id")
    supplier_id: Optional[str] = Field(default=None, foreign_key="suppliers.id", index=True)
    supplier_name: str = Field(default="", nullable=False)
    invoice_number: Optional[str] = None
    total_amount_usd: float = Field(default=0.0, nullable=False)
    total_amount_bs: float = Field(default=0.0, nullable=False)
    exchange_rate: float = Field(default=36.5, nullable=False)
    payment_type: PurchasePaymentType = Field(default=PurchasePaymentType.CASH, nullable=False)
    payment_status: PurchasePaymentStatus = Field(default=PurchasePaymentStatus.PAID, nullable=False)
    credit_days: int = Field(default=0, nullable=False)
    notes: Optional[str] = None
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    # Legacy fields
    paid_amount_usd: float = Field(default=0.0)
    pending_amount_usd: float = Field(default=0.0)
    is_synced: bool = Field(default=False)


class PurchaseItem(SQLModel, table=True):
    __tablename__: str = "purchase_items"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    purchase_id: str = Field(default="", nullable=False, foreign_key="purchases.id", index=True)
    product_id: str = Field(default="", nullable=False, foreign_key="products.id")
    quantity: float = Field(default=1.0, nullable=False)
    unit_cost_usd: float = Field(default=0.0, nullable=False)
    total_cost_usd: float = Field(default=0.0, nullable=False)


class SupplierPayablesLedger(SQLModel, table=True):
    __tablename__: str = "supplier_payables_ledger"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    supplier_id: str = Field(default="", nullable=False, foreign_key="suppliers.id", index=True)
    purchase_id: Optional[str] = Field(default=None, foreign_key="purchases.id")
    tx_type: PayableTxType = Field(default=PayableTxType.CHARGE, nullable=False)
    amount_usd: float = Field(default=0.0, nullable=False)
    exchange_rate: float = Field(default=36.5, nullable=False)
    reference: Optional[str] = None
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)


# ============================================================================
# 9. KARDEX Y CONTROL DE MOVIMIENTOS DE INVENTARIO
# ============================================================================

class InventoryTransaction(SQLModel, table=True):
    __tablename__: str = "inventory_transactions"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.id")
    product_id: str = Field(default="", nullable=False, foreign_key="products.id", index=True)
    transaction_type: InventoryTxType = Field(default=InventoryTxType.IN, nullable=False)
    reason: InventoryTxReason = Field(default=InventoryTxReason.MANUAL_ADJUSTMENT, nullable=False)
    quantity: float = Field(default=0.0, nullable=False)
    unit_cost_usd: float = Field(default=0.0, nullable=False)
    reference_id: Optional[str] = Field(default=None, index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)


class InventoryShrinkage(SQLModel, table=True):
    __tablename__: str = "inventory_shrinkage"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    product_id: str = Field(default="", nullable=False, foreign_key="products.id", index=True)
    quantity: float = Field(default=0.0, nullable=False)
    cost_loss_usd: float = Field(default=0.0, nullable=False)
    reason: str = Field(default="No especificado", nullable=False)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    supervisor_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    # Legacy display field
    product_name: Optional[str] = None


# ============================================================================
# 10. DOCUMENTOS DE ENTREGA Y DEVOLUCIONES
# ============================================================================

class DeliveryNote(SQLModel, table=True):
    __tablename__: str = "delivery_notes"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.id")
    document_type: DeliveryDocType = Field(default=DeliveryDocType.NOTA_ENTREGA, nullable=False)
    document_number: Optional[int] = Field(default=None, index=True)
    client_id: Optional[str] = Field(default=None, foreign_key="clients.id")
    client_name: str = Field(default="Cliente Final", nullable=False)
    subtotal_usd: float = Field(default=0.0, nullable=False)
    discount_usd: float = Field(default=0.0, nullable=False)
    total_amount_usd: float = Field(default=0.0, nullable=False)
    total_amount_bs: float = Field(default=0.0, nullable=False)
    exchange_rate: float = Field(default=36.5, nullable=False)
    status: str = Field(default="EMITIDA", nullable=False)
    pdf_path: Optional[str] = None
    cash_session_id: Optional[str] = Field(default=None, foreign_key="cash_sessions.id", index=True)
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=get_now_utc, nullable=False)


class DeliveryNoteItem(SQLModel, table=True):
    __tablename__: str = "delivery_note_items"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    delivery_note_id: str = Field(default="", nullable=False, foreign_key="delivery_notes.id", index=True)
    product_id: str = Field(default="", nullable=False, foreign_key="products.id")
    product_name: str = Field(default="", nullable=False)
    quantity: float = Field(default=1.0, nullable=False)
    unit_price_usd: float = Field(default=0.0, nullable=False)
    total_price_usd: float = Field(default=0.0, nullable=False)


class SaleReturn(SQLModel, table=True):
    __tablename__: str = "sale_returns"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.id")
    sale_id: str = Field(default="", nullable=False, foreign_key="sales.id", index=True)
    user_id: str = Field(default="", nullable=False, foreign_key="users.id", index=True)
    supervisor_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    subtotal_usd: float = Field(default=0.0, nullable=False)
    tax_amount_usd: float = Field(default=0.0, nullable=False)
    total_amount_usd: float = Field(default=0.0, nullable=False)
    total_amount_bs: float = Field(default=0.0, nullable=False)
    exchange_rate: float = Field(default=36.5, nullable=False)
    reason: str = Field(default="", nullable=False)
    cash_session_id: Optional[str] = Field(default=None, foreign_key="cash_sessions.id", index=True)
    version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=get_now_utc, nullable=False)

    is_synced: bool = Field(default=False)


class SaleReturnItem(SQLModel, table=True):
    __tablename__: str = "sale_return_items"
    __table_args__ = {"extend_existing": True}

    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    return_id: str = Field(default="", nullable=False, foreign_key="sale_returns.id", index=True)
    sale_item_id: str = Field(default="", nullable=False, foreign_key="sale_items.id")
    product_id: str = Field(default="", nullable=False, foreign_key="products.id")
    quantity: float = Field(default=1.0, nullable=False)
    unit_price_usd: float = Field(default=0.0, nullable=False)
    tax_amount_usd: float = Field(default=0.0, nullable=False)
    total_price_usd: float = Field(default=0.0, nullable=False)

    # Legacy display field
    product_name: Optional[str] = None


# ============================================================================
# 11. AUDITORÍA CENTRALIZADA
# ============================================================================

class AuditLog(SQLModel, table=True):
    __tablename__: str = "audit_logs"
    __table_args__ = {"extend_existing": True}

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.id")
    timestamp: datetime = Field(default_factory=get_now_utc, nullable=False, index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    username: str = Field(default="SYSTEM", nullable=False)
    user_role: Optional[str] = Field(default=None)
    module: str = Field(default="", nullable=False, index=True)
    action: str = Field(default="", nullable=False, index=True)
    severity: AuditSeverity = Field(default=AuditSeverity.INFO, nullable=False, index=True)
    entity_name: Optional[str] = Field(default=None, index=True)
    entity_id: Optional[str] = Field(default=None, index=True)
    ip_address: Optional[str] = Field(default=None)
    endpoint: Optional[str] = Field(default=None)
    http_method: Optional[str] = Field(default=None)
    description: str = Field(default="", nullable=False)
    old_values: Optional[str] = Field(default=None)
    new_values: Optional[str] = Field(default=None)
    metadata_json: Optional[str] = Field(default=None)


