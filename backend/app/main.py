import logging
import threading
import time
import shutil
from datetime import datetime, UTC
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import app_error_handler, generic_error_handler, validation_error_handler
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, generic_error_handler)

app.include_router(api_v1_router)


def run_auto_cleanup(max_age_days: int = 7):
    """
    Indefinite background worker purging expired dataset and model files.
    Runs once on startup and then sleeps for 12 hours.
    """
    while True:
        try:
            logger.info("Starting scheduled auto-cleanup of files older than %d days...", max_age_days)
            from app.storage import storage
            now = datetime.now(UTC)

            # 1. Clean expired Datasets
            all_datasets = storage._read().get("datasets", [])
            for ds in all_datasets:
                created = datetime.fromisoformat(ds["created_at"].replace("Z", "+00:00"))
                if (now - created).days >= max_age_days:
                    logger.info("Purging expired dataset: %s (%s)", ds["id"], ds["name"])
                    file_path = Path(ds["file_path"])
                    if file_path.exists():
                        if file_path.is_file():
                            file_path.unlink()
                        else:
                            shutil.rmtree(file_path, ignore_errors=True)
                    # Also delete metadata dir if any
                    parent_dir = file_path.parent
                    if parent_dir.exists() and parent_dir.name == ds["id"]:
                        shutil.rmtree(parent_dir, ignore_errors=True)
                    
                    storage.delete_dataset(ds["id"])

            # 2. Clean expired Models
            all_models = storage._read().get("models", [])
            for m in all_models:
                created = datetime.fromisoformat(m["created_at"].replace("Z", "+00:00"))
                if (now - created).days >= max_age_days:
                    logger.info("Purging expired model: %s (%s)", m["id"], m["name"])
                    file_path = Path(m["file_path"])
                    if file_path.exists():
                        if file_path.is_file():
                            file_path.unlink()
                        else:
                            shutil.rmtree(file_path, ignore_errors=True)
                    parent_dir = file_path.parent
                    if parent_dir.exists() and parent_dir.name == m["id"]:
                        shutil.rmtree(parent_dir, ignore_errors=True)
                    
                    storage.delete_model(m["id"])

            logger.info("Auto-cleanup run complete.")
        except Exception as e:
            logger.error("Auto-cleanup background task encountered an error: %s", str(e))

        # Sleep for 12 hours
        time.sleep(12 * 3600)


@app.on_event("startup")
async def startup_event():
    logger.info("Spawning auto-cleanup daemon thread...")
    thread = threading.Thread(target=run_auto_cleanup, args=(7,), daemon=True)
    thread.start()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
