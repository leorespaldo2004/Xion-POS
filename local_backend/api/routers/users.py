from typing import List, Dict
from uuid import uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, Field, SQLModel

from local_backend.core.database import get_session
from local_backend.core.models import User

router = APIRouter(prefix="/users", tags=["Users"])

class UserCreate(SQLModel):
    name: str = Field(min_length=2)
    email: str
    role: str = "viewer"
    status: str = "active"
    perm_sales: bool = False
    perm_inventory: bool = False
    perm_reports: bool = False
    perm_users: bool = False

class UserNotFoundError(HTTPException):
    def __init__(self, user_id: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with id {user_id} not found")

@router.get("", response_model=List[User])
def get_users(session: Session = Depends(get_session)):
    statement = select(User)
    results = session.exec(statement).all()
    return results

@router.post("", status_code=status.HTTP_201_CREATED, response_model=User)
def create_user(payload: UserCreate, session: Session = Depends(get_session)):
    existing_email = session.exec(select(User).where(User.email == payload.email)).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already exists")

    new_user = User(
        id=str(uuid4()),
        **payload.model_dump(),
        is_synced=False,
        last_login="Nunca"
    )
    
    session.add(new_user)
    try:
        session.commit()
        session.refresh(new_user)
        return new_user
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Transaction failed")

@router.put("/{user_id}", response_model=User)
def update_user(user_id: str, updated_data: Dict[str, object], session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise UserNotFoundError(user_id)

    if "email" in updated_data and updated_data["email"] != user.email:
        existing = session.exec(select(User).where(User.email == updated_data["email"])).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
            
    for key, value in updated_data.items():
        if hasattr(user, key) and key not in {"id", "created_at", "updated_at", "is_synced"}:
            setattr(user, key, value)

    user.is_synced = False
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise UserNotFoundError(user_id)
    session.delete(user)
    session.commit()
