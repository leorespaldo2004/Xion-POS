import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configuraciones del entorno local.
    Diseñado para ser inyectado y sobreescrito en testing.
    """
    APP_NAME: str = "Xion POS Local Backend"
    VERSION: str = "1.0.0"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DB_PATH: Path = BASE_DIR / "data" / "xion_offline.db"
    DB_ENCRYPTION_KEY: str = os.getenv("XION_DB_KEY", "dev_unsecure_key")

    @property
    def database_url(self) -> str:
        # Para SQLCipher usar sqlite+pysqlcipher en producción.
        return f"sqlite:///{self.DB_PATH}"


settings = Settings()
