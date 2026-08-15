import os
from pathlib import Path

from pydantic_settings import BaseSettings

# Project root is three levels up from this file:
# backend/app/core/config.py -> core -> app -> backend -> <project root>
PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _resolve_data_dir() -> Path:
    """Resolve the data directory to an absolute path.

    Honors an optional ``DATA_DIR`` env var (relative paths are resolved
    against the current working directory); otherwise defaults to
    ``<project root>/data``. This keeps all artifacts on the local machine
    regardless of where the server process is launched from.
    """
    env = os.environ.get("DATA_DIR")
    path = Path(env) if env else PROJECT_ROOT / "data"
    return path.resolve()


class Settings(BaseSettings):
    APP_NAME: str = "MLPilot"
    # Secure by default: when False, the interactive API docs (/docs, /redoc,
    # /openapi.json) are disabled. Set DEBUG=true only in development.
    DEBUG: bool = False
    # Master switch for the in-memory API rate limiting. Enabled by default for
    # production; the test suite disables it via env to avoid throttling tests.
    RATE_LIMIT_ENABLED: bool = True
    DATA_DIR: Path = _resolve_data_dir()
    MAX_DATASET_SIZE_MB: int = 5120
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DATABASE_URL: str = f"sqlite:///{(_resolve_data_dir() / 'mlpilot.db')}"
    # Auto-cleanup of datasets/models older than AUTO_CLEANUP_MAX_AGE_DAYS.
    # Disabled by default so local users keep their data indefinitely.
    ENABLE_AUTO_CLEANUP: bool = False
    AUTO_CLEANUP_MAX_AGE_DAYS: int = 7


settings = Settings()
