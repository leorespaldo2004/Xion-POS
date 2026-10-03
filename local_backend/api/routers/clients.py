from typing import List, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, Field, SQLModel

from local_backend.core.database import get_session
from local_backend.core.models import Client

router = APIRouter(prefix="/clients", tags=["Clients"])

class ClientCreate(SQLModel):
    name: str = Field(min_length=2)
    email: str
    phone: str | None = None
    address: str | None = None
    identification_type: str = "CI"
    identification_number: str
    credit_limit: float = 0.0
    current_debt: float = 0.0
    is_active: bool = True

class ClientResponse(Client):
    pass

def _format_client(client: Client) -> ClientResponse:
    c_dict = client.model_dump()
    c_dict["credit_limit"] = client.credit_limit_usd
    return ClientResponse(**c_dict)

class ClientNotFoundError(HTTPException):
    def __init__(self, client_id: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"Client with id {client_id} not found")

@router.get("", response_model=List[ClientResponse])
def get_clients(session: Session = Depends(get_session)):
    statement = select(Client).where(Client.deleted_at == None)
    results = session.exec(statement).all()
    return [_format_client(c) for c in results]

@router.get("/{client_id}/ledger")
def get_client_ledger(client_id: str, session: Session = Depends(get_session)):
    from local_backend.core.models import ClientReceivablesLedger
    client = session.get(Client, client_id)
    if not client or client.deleted_at is not None:
        raise ClientNotFoundError(client_id)
    statement = select(ClientReceivablesLedger).where(ClientReceivablesLedger.client_id == client_id).order_by(ClientReceivablesLedger.created_at.desc())
    return session.exec(statement).all()

@router.post("", status_code=status.HTTP_201_CREATED, response_model=ClientResponse)
def create_client(payload: ClientCreate, session: Session = Depends(get_session)):
    existing_email = session.exec(select(Client).where(Client.email == payload.email, Client.deleted_at == None)).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already exists")

    existing_id = session.exec(select(Client).where(Client.identification_number == payload.identification_number, Client.deleted_at == None)).first()
    if existing_id:
        raise HTTPException(status_code=409, detail="Identification number already exists")

    new_client = Client(
        id=str(uuid4()),
        **payload.model_dump(),
        is_synced=False
    )
    
    session.add(new_client)
    try:
        session.commit()
        session.refresh(new_client)
        return _format_client(new_client)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Transaction failed")

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: str, updated_data: Dict[str, object], session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client or client.deleted_at is not None:
        raise ClientNotFoundError(client_id)

    # Validate duplicate if fields changed
    if "email" in updated_data and updated_data["email"] != client.email:
        existing = session.exec(select(Client).where(Client.email == updated_data["email"], Client.deleted_at == None)).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
            
    if "identification_number" in updated_data and updated_data["identification_number"] != client.identification_number:
        existing = session.exec(select(Client).where(Client.identification_number == updated_data["identification_number"], Client.deleted_at == None)).first()
        if existing:
            raise HTTPException(status_code=409, detail="Identification already in use")

    for key, value in updated_data.items():
        if hasattr(client, key) and key not in {"id", "created_at", "updated_at", "is_synced"}:
            setattr(client, key, value)

    client.is_synced = False
    client.updated_at = datetime.utcnow()
    session.add(client)
    session.commit()
    session.refresh(client)
    return _format_client(client)

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: str, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client or client.deleted_at is not None:
        raise ClientNotFoundError(client_id)
    client.deleted_at = datetime.utcnow()
    client.is_synced = False
    session.add(client)
    session.commit()
