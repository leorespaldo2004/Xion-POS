import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configuraciones del entorno local.
    Gestiona la ruta de la base de datos dinámicamente según el entorno.
    """
    APP_NAME: str = "Xion POS Local Backend"
    VERSION: str = "1.1.0"
    
    @property
    def BASE_DIR(self) -> Path:
        # Si estamos congelados (PyInstaller), usamos la ruta del sistema para datos persistentes
        if getattr(sys, 'frozen', False):
            # En Windows: %APPDATA%/XionPOS
            app_data = os.getenv('APPDATA')
            if app_data:
                path = Path(app_data) / "XionPOS"
            else:
                path = Path.home() / ".xionpos"
        else:
            # En desarrollo, usamos la carpeta del proyecto
            path = Path(__file__).resolve().parent.parent / "data"
        
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def DB_PATH(self) -> Path:
        return self.BASE_DIR / "xion_offline.db"

    @property
    def DB_ENCRYPTION_KEY(self) -> str:
        return os.getenv("XION_DB_KEY", "dev_unsecure_key")

    @property
    def database_url(self) -> str:
        # Nota: En producción utilizar sqlite+pysqlcipher si se requiere cifrado.
        return f"sqlite:///{self.DB_PATH}"


settings = Settings()
