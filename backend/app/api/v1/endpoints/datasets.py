import uuid
import shutil
from pathlib import Path
from datetime import UTC, datetime

import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.storage import storage

router = APIRouter()

ALLOWED_EXTENSIONS = {".csv", ".parquet", ".json", ".xlsx"}


@router.post("/upload", status_code=201)
async def upload_dataset(file: UploadFile = File(...), name: str = Form(None)) -> JSONResponse:
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"Unsupported format {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    dataset_id = str(uuid.uuid4())
    dest_dir = settings.DATA_DIR / "datasets" / dataset_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_path = dest_dir / file.filename

    content = await file.read()
    if len(content) > settings.MAX_DATASET_SIZE_MB * 1024 * 1024:
        raise ValidationError(f"File exceeds maximum size of {settings.MAX_DATASET_SIZE_MB} MB")

    file_path.write_bytes(content)

    dataset = {
        "id": dataset_id,
        "name": name or file.filename,
        "original_filename": file.filename,
        "file_path": str(file_path),
        "file_format": ext.lstrip("."),
        "file_size_bytes": len(content),
        "row_count": None,
        "column_count": None,
        "status": "uploading",
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }
    storage.save_dataset(dataset)

    try:
        if ext == ".csv":
            df = pd.read_csv(file_path, nrows=10000)
        elif ext == ".parquet":
            df = pd.read_parquet(file_path)
        elif ext == ".json":
            df = pd.read_json(file_path)
        elif ext == ".xlsx":
            df = pd.read_excel(file_path)
        else:
            df = pd.DataFrame()

        dataset["row_count"] = len(df) if not df.empty else 0
        dataset["column_count"] = len(df.columns) if not df.empty else 0
        dataset["status"] = "ready"
        storage.save_dataset(dataset)
    except Exception as e:
        dataset["status"] = "failed"
        dataset["error_message"] = str(e)
        storage.save_dataset(dataset)

    return JSONResponse(dataset, status_code=201)


@router.get("/")
async def list_datasets(page: int = 1, per_page: int = 20) -> dict:
    all_datasets = storage.list_datasets()
    total = len(all_datasets)
    start = (page - 1) * per_page
    items = all_datasets[start:start + per_page]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{dataset_id}")
async def get_dataset(dataset_id: str) -> dict:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)
    return dataset


@router.delete("/{dataset_id}", status_code=204)
async def delete_dataset(dataset_id: str):
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    dest_dir = Path(dataset["file_path"]).parent
    if dest_dir.exists():
        shutil.rmtree(dest_dir)

    storage.delete_dataset(dataset_id)
    return None
