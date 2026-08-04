from fastapi import APIRouter

from app.api.v1.schemas.settings import UpdateSettingsSchema
from app.storage import storage

router = APIRouter()


@router.get("/")
async def get_settings() -> dict:
    return storage.get_settings()


@router.put("/")
async def update_settings(body: UpdateSettingsSchema) -> dict:
    current = storage.get_settings()
    merged = {**current, **body.model_dump(exclude_none=True)}
    storage.save_settings(merged)
    return merged
