from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from local_backend.core.database import get_session, get_system_config
from local_backend.core.models import SystemConfig

router = APIRouter(prefix="/system", tags=["System"])


class OfflineSyncError(Exception):
    """Excepción personalizada para fallos críticos de integridad local."""


class ExchangeRateUpdate(BaseModel):
    anchor_currency: str
    current_exchange_rate_bs: float
    lockdown_mode: bool = False


@router.get("/status")
def get_system_status(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Devuelve el estado del motor local y la tasa de cambio ancla."""
    try:
        config = get_system_config(session)
        return {
            "status": "online",
            "database": "connected",
            "anchor_currency": config.anchor_currency,
            "current_exchange_rate_bs": config.current_exchange_rate_bs,
            "lockdown_mode": config.lockdown_mode,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(exc)}")


@router.post("/exchange-rate")
def update_exchange_rate(
    body: ExchangeRateUpdate,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    try:
        config = get_system_config(session)
        config.anchor_currency = body.anchor_currency
        config.current_exchange_rate_bs = body.current_exchange_rate_bs
        config.lockdown_mode = body.lockdown_mode
        session.add(config)
        session.commit()
        session.refresh(config)

        return {
            "status": "updated",
            "anchor_currency": config.anchor_currency,
            "current_exchange_rate_bs": config.current_exchange_rate_bs,
            "lockdown_mode": config.lockdown_mode,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update exchange rate: {str(exc)}")
