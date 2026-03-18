from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class SystemConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    anchor_currency: str = Field(default="USD", nullable=False)
    current_exchange_rate_bs: float = Field(default=36.5, nullable=False)
    lockdown_mode: bool = Field(default=False, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
