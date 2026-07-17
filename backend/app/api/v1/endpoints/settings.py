from fastapi import APIRouter

from app.storage import storage

router = APIRouter()


@router.get("/")
async def get_settings() -> dict:
    return storage.get_settings()


@router.put("/")
async def update_settings(body: dict) -> dict:
    current = storage.get_settings()
    merged = {**current, **body}
    storage.save_settings(merged)
    return merged
