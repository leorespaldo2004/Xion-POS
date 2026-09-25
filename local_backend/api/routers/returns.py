# filepath: local_backend/api/routers/returns.py
# -----------------------------------------------------------------------------
# MÓDULO: Router de Devoluciones (Returns) y Notas de Crédito
# CONTEXT: Offline-First POS, Integridad Transaccional, Auditoría & Stock
# -----------------------------------------------------------------------------

from typing import List, Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from local_backend.core.database import get_session
from local_backend.core.models import (
    Sale,
    SaleItem,
    SaleReturn,
    SaleReturnItem,
    Product,
    CashSession,
    InventoryTransaction,
    User,
)
from local_backend.api.utils.audit_service import fire_audit_log

router = APIRouter(prefix="/returns", tags=["Returns"])


# =============================================================================
# DTOs
# =============================================================================

class ReturnItemInputDTO(BaseModel):
    sale_item_id: str = Field(..., description="ID del ítem en la venta original")
    product_id: str = Field(..., description="ID del producto a devolver")
    quantity: float = Field(..., gt=0, description="Cantidad a devolver (debe ser mayor a 0)")


class CreateReturnDTO(BaseModel):
    sale_id: str = Field(..., description="ID de la venta original")
    reason: str = Field(..., min_length=3, description="Motivo de la devolución")
    user_id: Optional[str] = Field(None, description="ID del cajero que procesa")
    supervisor_id: Optional[str] = Field(None, description="ID del supervisor que autorizó")
    items: List[ReturnItemInputDTO] = Field(..., min_length=1, description="Lista de productos a devolver")


class ReturnableItemResponse(BaseModel):
    sale_item_id: str
    product_id: str
    product_name: str
    original_quantity: float
    already_returned_quantity: float
    remaining_quantity: float
    unit_price_usd: float
    tax_amount_usd: float
    total_price_usd: float


class ReturnItemResponse(BaseModel):
    id: str
    sale_item_id: str
    product_id: str
    product_name: str
    quantity: float
    unit_price_usd: float
    tax_amount_usd: float
    total_price_usd: float


class ReturnResponse(BaseModel):
    id: str
    sale_id: str
    user_id: str
    supervisor_id: Optional[str] = None
    subtotal_usd: float
    tax_amount_usd: float
    total_amount_usd: float
    total_amount_bs: float
    exchange_rate: float
    reason: str
    created_at: datetime
    items: List[ReturnItemResponse] = []


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/sales/{sale_id}/items", response_model=List[ReturnableItemResponse])
def get_sale_returnable_items(
    sale_id: str,
    session: Session = Depends(get_session)
):
    """
    Obtiene los ítems de una venta indicando la cantidad devuelta previamente
    y la cantidad disponible para devolver.
    """
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta con ID '{sale_id}' no encontrada"
        )

    sale_items = session.exec(
        select(SaleItem).where(SaleItem.sale_id == sale_id)
    ).all()

    existing_returns = session.exec(
        select(SaleReturn).where(SaleReturn.sale_id == sale_id)
    ).all()
    existing_return_ids = [r.id for r in existing_returns if r.id]

    returned_quantities = {}
    if existing_return_ids:
        existing_return_items = session.exec(
            select(SaleReturnItem).where(SaleReturnItem.return_id.in_(existing_return_ids))
        ).all()
        for ri in existing_return_items:
            returned_quantities[ri.sale_item_id] = returned_quantities.get(ri.sale_item_id, 0.0) + ri.quantity

    response = []
    for item in sale_items:
        already_returned = returned_quantities.get(item.id, 0.0)
        remaining = max(0.0, item.quantity - already_returned)
        response.append(
            ReturnableItemResponse(
                sale_item_id=item.id,
                product_id=item.product_id,
                product_name=item.product_name,
                original_quantity=item.quantity,
                already_returned_quantity=already_returned,
                remaining_quantity=remaining,
                unit_price_usd=item.unit_price_usd,
                tax_amount_usd=item.tax_amount_usd,
                total_price_usd=item.total_price_usd,
            )
        )

    return response


@router.post("", response_model=ReturnResponse, status_code=status.HTTP_201_CREATED)
@router.post("/sales/returns", response_model=ReturnResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_return(
    payload: CreateReturnDTO,
    session: Session = Depends(get_session),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """
    Procesa una devolución total o parcial de una venta previamente realizada.
    En envuelto en una transacción de base de datos atómica.
    """
    operator_id = payload.user_id or x_user_id or "SYSTEM"

    # 1. Obtener la venta original
    sale = session.get(Sale, payload.sale_id)
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta con ID '{payload.sale_id}' no encontrada"
        )

    if sale.status == "refunded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La venta ya ha sido devuelta completamente."
        )

    # 2. Devoluciones previas para calcular disponibles por ítem
    existing_returns = session.exec(
        select(SaleReturn).where(SaleReturn.sale_id == sale.id)
    ).all()
    existing_return_ids = [r.id for r in existing_returns if r.id]

    returned_quantities = {}
    if existing_return_ids:
        existing_return_items = session.exec(
            select(SaleReturnItem).where(SaleReturnItem.return_id.in_(existing_return_ids))
        ).all()
        for ri in existing_return_items:
            returned_quantities[ri.sale_item_id] = returned_quantities.get(ri.sale_item_id, 0.0) + ri.quantity

    # 3. Ítems de la venta original
    sale_items_db = session.exec(
        select(SaleItem).where(SaleItem.sale_id == sale.id)
    ).all()
    sale_items_by_id = {item.id: item for item in sale_items_db}

    # 4. Sesión de caja activa
    active_cash_session = session.exec(
        select(CashSession).where(
            CashSession.user_id == operator_id,
            CashSession.status == "open"
        )
    ).first()
    if not active_cash_session:
        active_cash_session = session.exec(
            select(CashSession).where(CashSession.status == "open")
        ).first()

    cash_session_id = active_cash_session.id if active_cash_session else None

    # 5. Procesamiento atómico
    return_id = f"ret_{uuid4().hex[:12]}"
    total_subtotal_usd = 0.0
    total_tax_usd = 0.0
    total_amount_usd = 0.0

    return_items_to_save: List[SaleReturnItem] = []
    inventory_transactions_to_save: List[InventoryTransaction] = []
    products_to_update: List[Product] = []

    try:
        for item_dto in payload.items:
            if item_dto.quantity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La cantidad a devolver debe ser mayor a 0"
                )

            sale_item = sale_items_by_id.get(item_dto.sale_item_id)
            if not sale_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"El ítem '{item_dto.sale_item_id}' no pertenece a la venta '{sale.id}'"
                )

            already_returned = returned_quantities.get(sale_item.id, 0.0)
            remaining = sale_item.quantity - already_returned
            if item_dto.quantity > (remaining + 1e-6):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Cantidad a devolver ({item_dto.quantity}) excede lo disponible "
                        f"({remaining:.2f}) para '{sale_item.product_name}'"
                    )
                )

            unit_price = sale_item.unit_price_usd
            tax_per_unit = (sale_item.tax_amount_usd / sale_item.quantity) if sale_item.quantity > 0 else 0.0
            item_tax = round(tax_per_unit * item_dto.quantity, 4)
            item_subtotal = round(unit_price * item_dto.quantity, 4)
            item_total = item_subtotal + item_tax

            total_subtotal_usd += item_subtotal
            total_tax_usd += item_tax
            total_amount_usd += item_total

            ret_item = SaleReturnItem(
                id=f"ri_{uuid4().hex[:12]}",
                return_id=return_id,
                sale_item_id=sale_item.id,
                product_id=sale_item.product_id,
                product_name=sale_item.product_name,
                quantity=item_dto.quantity,
                unit_price_usd=unit_price,
                tax_amount_usd=item_tax,
                total_price_usd=round(item_total, 4)
            )
            return_items_to_save.append(ret_item)

            # Reingreso a inventario
            product = session.get(Product, sale_item.product_id)
            if product:
                product.cached_stock_quantity += item_dto.quantity
                products_to_update.append(product)

            # Transacción de Kardex
            inv_tx = InventoryTransaction(
                id=str(uuid4()),
                product_id=sale_item.product_id,
                transaction_type="IN",
                reason="REFUND",
                quantity=item_dto.quantity,
                reference_id=return_id,
                user_id=operator_id
            )
            inventory_transactions_to_save.append(inv_tx)

            returned_quantities[sale_item.id] = already_returned + item_dto.quantity

        exchange_rate = sale.exchange_rate if sale.exchange_rate > 0 else 36.5
        total_amount_bs = round(total_amount_usd * exchange_rate, 2)

        # Actualizar estado de la venta
        all_fully_returned = True
        for si in sale_items_db:
            if returned_quantities.get(si.id, 0.0) < (si.quantity - 1e-6):
                all_fully_returned = False
                break

        sale.status = "refunded" if all_fully_returned else "partially_refunded"

        sale_return = SaleReturn(
            id=return_id,
            sale_id=sale.id,
            user_id=operator_id,
            supervisor_id=payload.supervisor_id,
            subtotal_usd=round(total_subtotal_usd, 2),
            tax_amount_usd=round(total_tax_usd, 2),
            total_amount_usd=round(total_amount_usd, 2),
            total_amount_bs=total_amount_bs,
            exchange_rate=exchange_rate,
            reason=payload.reason,
            cash_session_id=cash_session_id
        )

        session.add(sale_return)
        for ri in return_items_to_save:
            session.add(ri)
        for p in products_to_update:
            session.add(p)
        for it in inventory_transactions_to_save:
            session.add(it)
        session.add(sale)

        session.commit()
        session.refresh(sale_return)

        fire_audit_log(
            module="sales",
            action="CREATE",
            severity="INFO",
            description=f"Devolución {return_id} procesada para la venta {sale.id}. Monto devuelto: ${total_amount_usd:.2f} USD. Motivo: {payload.reason}",
            entity_name="sale_return",
            entity_id=return_id,
            metadata={
                "sale_id": sale.id,
                "user_id": operator_id,
                "supervisor_id": payload.supervisor_id,
                "total_amount_usd": total_amount_usd,
                "reason": payload.reason
            }
        )

        return ReturnResponse(
            id=sale_return.id,
            sale_id=sale_return.sale_id,
            user_id=sale_return.user_id,
            supervisor_id=sale_return.supervisor_id,
            subtotal_usd=sale_return.subtotal_usd,
            tax_amount_usd=sale_return.tax_amount_usd,
            total_amount_usd=sale_return.total_amount_usd,
            total_amount_bs=sale_return.total_amount_bs,
            exchange_rate=sale_return.exchange_rate,
            reason=sale_return.reason,
            created_at=sale_return.created_at,
            items=[
                ReturnItemResponse(
                    id=item.id,
                    sale_item_id=item.sale_item_id,
                    product_id=item.product_id,
                    product_name=item.product_name,
                    quantity=item.quantity,
                    unit_price_usd=item.unit_price_usd,
                    tax_amount_usd=item.tax_amount_usd,
                    total_price_usd=item.total_price_usd,
                )
                for item in return_items_to_save
            ]
        )
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al procesar la devolución: {str(e)}"
        )


@router.get("", response_model=List[ReturnResponse])
def list_returns(
    sale_id: Optional[str] = Query(None, description="Filtrar por Venta"),
    user_id: Optional[str] = Query(None, description="Filtrar por Cajero"),
    session: Session = Depends(get_session)
):
    """
    Lista las devoluciones realizadas con filtros opcionales.
    """
    stmt = select(SaleReturn)
    if sale_id:
        stmt = stmt.where(SaleReturn.sale_id == sale_id)
    if user_id:
        stmt = stmt.where(SaleReturn.user_id == user_id)

    stmt = stmt.order_by(SaleReturn.created_at.desc())
    returns_db = session.exec(stmt).all()

    result = []
    for ret in returns_db:
        items_db = session.exec(
            select(SaleReturnItem).where(SaleReturnItem.return_id == ret.id)
        ).all()
        result.append(
            ReturnResponse(
                id=ret.id,
                sale_id=ret.sale_id,
                user_id=ret.user_id,
                supervisor_id=ret.supervisor_id,
                subtotal_usd=ret.subtotal_usd,
                tax_amount_usd=ret.tax_amount_usd,
                total_amount_usd=ret.total_amount_usd,
                total_amount_bs=ret.total_amount_bs,
                exchange_rate=ret.exchange_rate,
                reason=ret.reason,
                created_at=ret.created_at,
                items=[
                    ReturnItemResponse(
                        id=it.id,
                        sale_item_id=it.sale_item_id,
                        product_id=it.product_id,
                        product_name=it.product_name,
                        quantity=it.quantity,
                        unit_price_usd=it.unit_price_usd,
                        tax_amount_usd=it.tax_amount_usd,
                        total_price_usd=it.total_price_usd,
                    )
                    for it in items_db
                ]
            )
        )

    return result
