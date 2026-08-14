import logging
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from fastapi.responses import JSONResponse
from sklearn.datasets import load_breast_cancer, load_diabetes, load_digits, load_iris

from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.storage import storage

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".csv", ".parquet", ".json", ".xlsx"}


def get_session_id(x_session_id: str = Header("default_user")) -> str:
    return x_session_id


@router.post("/upload", status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(None),
    session_id: str = Depends(get_session_id)
) -> JSONResponse:
    logger.info("Dataset upload requested [filename=%s, session_id=%s]", file.filename, session_id)

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
        "session_id": session_id,
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }
    storage.save_dataset(dataset)

    try:
        # Gracefully dry-run load to reject malformed CSV/Excel/JSON
        if ext == ".csv":
            try:
                df = pd.read_csv(file_path, nrows=5)
            except Exception as e:
                raise ValidationError(f"Invalid or malformed CSV file: {str(e)}") from None
            if df.empty or len(df.columns) == 0:
                raise ValidationError("CSV file is empty or contains no columns")

            # Count lines safely
            with open(file_path, errors="ignore") as f:
                line_count = sum(1 for _ in f) - 1
            row_count = max(line_count, 0)

        elif ext == ".parquet":
            try:
                df = pd.read_parquet(file_path)
            except Exception as e:
                raise ValidationError(f"Invalid or malformed Parquet file: {str(e)}") from None
            row_count = len(df)

        elif ext == ".json":
            try:
                df = pd.read_json(file_path)
            except Exception as e:
                raise ValidationError(f"Invalid or malformed JSON file: {str(e)}") from None
            row_count = len(df)

        elif ext == ".xlsx":
            try:
                df = pd.read_excel(file_path, nrows=5)
            except Exception as e:
                raise ValidationError(f"Invalid or malformed Excel file: {str(e)}") from None
            if df.empty or len(df.columns) == 0:
                raise ValidationError("Excel sheet is empty or contains no columns")
            # Get full row count
            full_df = pd.read_excel(file_path)
            row_count = len(full_df)
        else:
            raise ValidationError(f"Unsupported format {ext}")

        dataset["row_count"] = row_count
        dataset["column_count"] = len(df.columns)
        dataset["status"] = "ready"
        storage.save_dataset(dataset)
        logger.info("Dataset successfully uploaded and validated [dataset_id=%s, rows=%d]", dataset_id, row_count)
    except Exception as e:
        logger.error("Dataset validation failed [dataset_id=%s, error=%s]", dataset_id, str(e))
        if file_path.exists():
            file_path.unlink()
        if dest_dir.exists():
            shutil.rmtree(dest_dir, ignore_errors=True)
        storage.delete_dataset(dataset_id)
        if isinstance(e, ValidationError):
            raise e from None
        raise ValidationError(f"Malformed or invalid data file: {str(e)}") from None

    return JSONResponse(dataset, status_code=201)


@router.get("/")
async def list_datasets(
    page: int = 1,
    per_page: int = 20,
    session_id: str = Depends(get_session_id)
) -> dict:
    all_datasets = storage.list_datasets(session_id=session_id)
    total = len(all_datasets)
    start = (page - 1) * per_page
    items = all_datasets[start:start + per_page]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{dataset_id}")
async def get_dataset(
    dataset_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    dataset = storage.get_dataset(dataset_id, session_id=session_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)
    return dataset


@router.delete("/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: str,
    session_id: str = Depends(get_session_id)
):
    dataset = storage.get_dataset(dataset_id, session_id=session_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    dest_dir = Path(dataset["file_path"]).parent
    if dest_dir.exists():
        shutil.rmtree(dest_dir, ignore_errors=True)

    storage.delete_dataset(dataset_id)
    return None


def _get_demo_dataframe(target: str) -> tuple[str, pd.DataFrame]:
    if target == "iris":
        data = load_iris(as_frame=True)
        df = data.frame.copy()
        df.columns = [
            c.replace(" (cm)", "").replace(" ", "_") for c in df.columns
        ]
        df = df.rename(columns={"target": "species"})
        return "Iris Flower Classification", df

    elif target == "breast_cancer":
        data = load_breast_cancer(as_frame=True)
        df = data.frame.copy()
        df.columns = [c.replace(" ", "_") for c in df.columns]
        df = df.rename(columns={"target": "diagnosis"})
        return "Wisconsin Breast Cancer", df

    elif target == "housing" or target == "california":
        try:
            from sklearn.datasets import fetch_california_housing
            data = fetch_california_housing(as_frame=True)
            df = data.frame.copy().head(1000)
            df.columns = [
                "median_income", "house_age", "avg_rooms", "avg_bedrooms",
                "population", "avg_occupancy", "latitude", "longitude", "median_house_value"
            ]
            return "California Housing Prices", df
        except Exception:
            data = load_diabetes(as_frame=True)
            df = data.frame.copy()
            df.columns = [c.replace(" ", "_") for c in df.columns]
            df = df.rename(columns={"target": "disease_progression"})
            return "Diabetes Progression", df

    elif target == "digits":
        data = load_digits(as_frame=True)
        df = data.frame.copy()
        df.columns = [c.replace(" ", "_") for c in df.columns]
        return "Optical Digits Recognition", df

    else:
        raise ValidationError(f"Unknown demo type '{target}'. Choose from: iris, breast_cancer, housing, digits")


@router.post("/demo", status_code=201)
async def upload_demo_dataset(
    body: dict | None = None,
    demo_type: str | None = None,
    session_id: str = Depends(get_session_id),
) -> JSONResponse:
    """Upload an authentic benchmark dataset (iris, breast_cancer, housing, digits)."""
    target = (body.get("demo") or body.get("demo_type") if body else None) or demo_type or "iris"

    name, df = _get_demo_dataframe(target)

    dataset_id = str(uuid.uuid4())
    dest_dir = settings.DATA_DIR / "datasets" / dataset_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_path = dest_dir / "data.csv"
    df.to_csv(file_path, index=False)

    dataset = {
        "id": dataset_id,
        "name": name,
        "original_filename": f"{name.lower().replace(' ', '_')}.csv",
        "file_path": str(file_path),
        "file_format": "csv",
        "file_size_bytes": file_path.stat().st_size,
        "row_count": len(df),
        "column_count": len(df.columns),
        "status": "ready",
        "session_id": session_id,
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }
    storage.save_dataset(dataset)
    logger.info("Demo dataset uploaded [dataset_id=%s, name=%s, rows=%d]", dataset_id, name, len(df))

    return JSONResponse(dataset, status_code=201)
