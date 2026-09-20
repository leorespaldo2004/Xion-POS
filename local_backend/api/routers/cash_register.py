# filepath: local_backend/api/routers/cash_register.py
import json
import os
import asyncio
from datetime import datetime, UTC
from typing import List, Optional, Dict
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select, func

from local_backend.core.database import get_session
from local_backend.core.models import CashSession, User, Sale, SalePayment
from local_backend.api.utils.pdf_generator import generate_closing_report_pdf
from local_backend.api.utils.audit_service import log_event, fire_audit_log

router = APIRouter(prefix="/cash-register", tags=["Cash Register"])

class DrawerOpenDTO(BaseModel):
    reason: str


class SessionOpenDTO(BaseModel):
    user_id: str
    opening_balance_usd: float = 0.0

class SessionCloseDTO(BaseModel):
    closing_balance_usd: float

@router.get("/active", response_model=Optional[CashSession])
def get_active_session(session: Session = Depends(get_session)):
    """Retorna la sesión de caja activa si existe."""
    return session.exec(
        select(CashSession).where(CashSession.status == "open")
    ).first()

@router.get("/summary")
def get_current_summary(session: Session = Depends(get_session)):
    """Calcula el resumen de ventas de la sesión activa."""
    active = session.exec(
        select(CashSession).where(CashSession.status == "open")
    ).first()
    
    if not active:
        return {
            "status": "closed",
            "total_sales_usd": 0.0,
            "total_tax_usd": 0.0,
            "payments": {}
        }
    
    sales = session.exec(
        select(Sale).where(Sale.cash_session_id == active.id)
    ).all()
    
    total_sales = sum(s.total_amount_usd for s in sales)
    total_tax = sum(s.tax_amount_usd for s in sales)
    
    # Desglose por método de pago
    stmt = (
        select(SalePayment.payment_method_label, func.sum(SalePayment.amount_usd))
        .join(Sale)
        .where(Sale.cash_session_id == active.id)
        .group_by(SalePayment.payment_method_label)
    )
    payment_results = session.exec(stmt).all()
    payments_summary = {label: float(amount) for label, amount in payment_results}
    
    return {
        "status": "open",
        "session_id": active.id,
        "opening_balance_usd": active.opening_balance_usd,
        "total_sales_usd": total_sales,
        "total_tax_usd": total_tax,
        "payments": payments_summary
    }

@router.post("/open", status_code=status.HTTP_201_CREATED)
def open_session(payload: SessionOpenDTO, session: Session = Depends(get_session)):
    """Abre una nueva sesión de caja."""
    # Verificar si ya hay una abierta
    active = session.exec(
        select(CashSession).where(CashSession.status == "open")
    ).first()
    
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una sesión de caja abierta."
        )
    
    user = session.get(User, payload.user_id)
    if not user:
        # En modo offline/dev, si no hay usuarios, podríamos fallar o usar un default.
        # Pero según las reglas, debemos ser estrictos.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {payload.user_id} no encontrado"
        )
    
    new_session = CashSession(
        id=str(uuid4()),
        user_id=user.id,
        user_name=user.name,
        opening_balance_usd=payload.opening_balance_usd,
        status="open",
        is_synced=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    
    # Auditamos la apertura de caja
    fire_audit_log(
        module="cash_register",
        action="OPEN",
        description=f"Apertura de caja por {new_session.user_name} con balance inicial de ${new_session.opening_balance_usd:.2f}",
        severity="INFO",
        entity_name="cash_session",
        entity_id=new_session.id,
        new_values={"opening_balance_usd": new_session.opening_balance_usd, "status": "open"}
    )
    
    return new_session


@router.post("/close", status_code=status.HTTP_200_OK)
def close_session(payload: SessionCloseDTO, session: Session = Depends(get_session)):
    """Cierra la sesión activa, calcula totales y genera PDF."""
    active = session.exec(
        select(CashSession).where(CashSession.status == "open")
    ).first()
    
    if not active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay ninguna sesión abierta para cerrar."
        )
    
    # 1. Calcular totales de ventas en esta sesión
    sales_stmt = select(Sale).where(Sale.cash_session_id == active.id)
    sales = session.exec(sales_stmt).all()
    
    total_sales = sum(s.total_amount_usd for s in sales)
    total_tax = sum(s.tax_amount_usd for s in sales)
    
    # 2. Desglose de pagos
    stmt = (
        select(SalePayment.payment_method_label, func.sum(SalePayment.amount_usd))
        .join(Sale)
        .where(Sale.cash_session_id == active.id)
        .group_by(SalePayment.payment_method_label)
    )
    payment_results = session.exec(stmt).all()
    payments_summary = {label: float(amount) for label, amount in payment_results}
    
    # 3. Actualizar sesión
    active.status = "closed"
    active.closing_time = datetime.now(UTC)
    active.closing_balance_usd = payload.closing_balance_usd
    active.total_sales_usd = total_sales
    active.total_tax_usd = total_tax
    active.payments_summary_json = json.dumps(payments_summary)
    active.updated_at = datetime.now(UTC)
    
    session.add(active)
    
    # 4. Generar Reporte PDF
    # Determinar ruta del reporte (carpeta reports en el root del proyecto)
    base_path = os.getcwd()
    reports_dir = os.path.join(base_path, "reports")
    report_name = f"cierre_{active.id[:8]}_{active.closing_time.strftime('%Y%m%d_%H%M%S')}.pdf"
    report_path = os.path.join(reports_dir, report_name)
    
    session_data = {
        "user_name": active.user_name,
        "status": active.status,
        "opening_time": active.opening_time.strftime("%d/%m/%Y %H:%M"),
        "closing_time": active.closing_time.strftime("%d/%m/%Y %H:%M"),
        "opening_balance_usd": active.opening_balance_usd,
        "closing_balance_usd": active.closing_balance_usd,
        "total_sales_usd": active.total_sales_usd,
        "total_tax_usd": active.total_tax_usd,
        "payments_summary": payments_summary
    }
    
    try:
        generate_closing_report_pdf(session_data, report_path)
    except Exception as e:
        # No bloqueamos el commit de la DB si falla el PDF, pero avisamos.
        print(f"Error generando PDF: {e}")
        report_path = f"Error: {str(e)}"

    session.commit()
    session.refresh(active)
    
    # Auditamos el cierre de caja
    fire_audit_log(
        module="cash_register",
        action="CLOSE",
        description=f"Cierre de caja por {active.user_name} con saldo final contado de ${active.closing_balance_usd:.2f}",
        severity="INFO",
        entity_name="cash_session",
        entity_id=active.id,
        old_values={"status": "open", "opening_balance_usd": active.opening_balance_usd},
        new_values={
            "status": "closed",
            "closing_balance_usd": active.closing_balance_usd,
            "total_sales_usd": active.total_sales_usd,
            "total_tax_usd": active.total_tax_usd,
            "payments_summary": payments_summary
        }
    )
    
    return {
        "detail": "Caja cerrada exitosamente",
        "session": active,
        "report_path": report_path
    }

@router.get("/session/{session_id}/report")
def get_session_report(session_id: str, session: Session = Depends(get_session)):
    cash_session = session.get(CashSession, session_id)
    if not cash_session:
        raise HTTPException(status_code=404, detail="Sesión de caja no encontrada")
    
    reports_dir = os.path.join(os.getcwd(), "reports")
    filename = f"cierre_{cash_session.id[:8]}.pdf"
    
    if os.path.exists(reports_dir):
        for f in os.listdir(reports_dir):
            if f.startswith(f"cierre_{cash_session.id[:8]}") and f.endswith(".pdf"):
                filepath = os.path.join(reports_dir, f)
                return FileResponse(
                    filepath,
                    media_type="application/pdf",
                    filename=f,
                    headers={"Content-Disposition": f"inline; filename={f}"}
                )
    
    # Regenerar si no existe el archivo físico
    payments_summary = json.loads(cash_session.payments_summary_json) if cash_session.payments_summary_json else {}
    os.makedirs(reports_dir, exist_ok=True)
    report_name = f"cierre_{cash_session.id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    report_path = os.path.join(reports_dir, report_name)
    
    session_data = {
        "user_name": cash_session.user_name,
        "status": cash_session.status,
        "opening_time": cash_session.opening_time.strftime("%d/%m/%Y %H:%M") if cash_session.opening_time else "",
        "closing_time": cash_session.closing_time.strftime("%d/%m/%Y %H:%M") if cash_session.closing_time else "",
        "opening_balance_usd": cash_session.opening_balance_usd,
        "closing_balance_usd": cash_session.closing_balance_usd,
        "total_sales_usd": cash_session.total_sales_usd,
        "total_tax_usd": cash_session.total_tax_usd,
        "payments_summary": payments_summary
    }
    generate_closing_report_pdf(session_data, report_path)
    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=report_name,
        headers={"Content-Disposition": f"inline; filename={report_name}"}
    )

