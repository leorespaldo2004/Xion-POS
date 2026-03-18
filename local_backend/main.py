import sys
import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from local_backend.core.database import init_db, get_session
from local_backend.api.routers import system

app = FastAPI(
    title="Xion POS Local Backend",
    version="1.0.0",
    description="Offline-First Local API for POS System"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "app://.", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(system.router, prefix="/api/v1")


@app.get("/api/v1/health")
def health_check(session: Session = Depends(get_session)):
    try:
        session.exec(select(1)).first()
        return {"status": "ok", "db_connected": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


@app.get("/health")
def check_health() -> dict:
    return {
        "status": "online",
        "mode": "offline_first",
        "anchor_currency": "USD",
    }


def get_frozen_path() -> str:
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


if __name__ == "__main__":
    import uvicorn

    is_dev = not getattr(sys, 'frozen', False)
    uvicorn.run(
        "local_backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=is_dev,
        workers=1 if not is_dev else 1,
    )
