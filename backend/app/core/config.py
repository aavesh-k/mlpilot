from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "MLPilot"
    DEBUG: bool = True
    DATA_DIR: Path = Path("data")
    MAX_DATASET_SIZE_MB: int = 5120
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DATABASE_URL: str = "postgresql+psycopg2://mlpilot:mlpilot@localhost:5432/mlpilot"


settings = Settings()
