import uuid
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.api.v1.schemas.cleaning import ColumnSuggestion, CleaningSuggestions, RunCleaningSchema
from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.services.cleaning_service import run_cleaning
from app.storage import storage

router = APIRouter()

OUTLIER_THRESHOLD = 1.5


def _read_dataframe(dataset: dict) -> pd.DataFrame:
    file_path = Path(dataset["file_path"])
    if not file_path.exists():
        raise NotFoundError("Dataset file", str(file_path))
    ext = f".{dataset['file_format']}"
    try:
        if ext == ".csv":
            return pd.read_csv(file_path, low_memory=False)
        elif ext == ".parquet":
            return pd.read_parquet(file_path)
        elif ext == ".json":
            return pd.read_json(file_path)
        elif ext == ".xlsx":
            return pd.read_excel(file_path)
        else:
            raise ValidationError("Unsupported format")
    except Exception as e:
        raise ValidationError(f"Failed to read dataset: {e}")


def _smart_missing_default(df: pd.DataFrame, col: str, missing_pct: float) -> str:
    if missing_pct > 0.5:
        return "drop_column"
    if missing_pct < 0.01:
        return "mode" if df[col].dtype == "object" else "median"
    if pd.api.types.is_numeric_dtype(df[col]):
        return "median" if missing_pct < 0.3 else "knn"
    return "mode"


def _smart_outlier_default(df: pd.DataFrame, col: str, outlier_pct: float) -> str:
    if outlier_pct > 0.2:
        return "leave"
    if outlier_pct > 0.05:
        return "winsorize"
    return "winsorize"


@router.get("/{dataset_id}/cleaning/suggestions")
async def get_cleaning_suggestions(dataset_id: str) -> CleaningSuggestions:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    df = _read_dataframe(dataset)
    total = len(df)
    suggestions: list[ColumnSuggestion] = []

    for col in df.columns:
        s = df[col].dropna()
        is_num = pd.api.types.is_numeric_dtype(df[col])
        missing_count = int(df[col].isna().sum())
        missing_pct = round(missing_count / max(total, 1), 4)

        outlier_count = None
        outlier_pct = None
        if is_num and len(s) >= 4:
            q1, q3 = s.quantile(0.25), s.quantile(0.75)
            iqr = q3 - q1
            lower, upper = q1 - OUTLIER_THRESHOLD * iqr, q3 + OUTLIER_THRESHOLD * iqr
            outlier_mask = (s < lower) | (s > upper)
            outlier_count = int(outlier_mask.sum())
            outlier_pct = round(outlier_count / max(total, 1), 4)

        unique_count = int(s.nunique()) if len(s) > 0 else 0

        suggestions.append(ColumnSuggestion(
            name=col,
            dtype=str(df[col].dtype),
            is_numeric=is_num,
            is_categorical=df[col].dtype == "object",
            missing_count=missing_count,
            missing_pct=missing_pct,
            outlier_count=outlier_count,
            outlier_pct=outlier_pct,
            unique_count=unique_count,
            suggested_missing_strategy=_smart_missing_default(df, col, missing_pct),
            suggested_outlier_strategy=_smart_outlier_default(df, col, outlier_pct or 0),
        ))

    return CleaningSuggestions(
        dataset_id=dataset_id,
        columns=suggestions,
        suggested_config=RunCleaningSchema(),
    )


@router.post("/{dataset_id}/cleaning/execute", status_code=201)
async def execute_cleaning(dataset_id: str, body: RunCleaningSchema) -> dict:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    df = _read_dataframe(dataset)
    if df.empty:
        raise ValidationError("Dataset is empty — nothing to clean")

    df_cleaned, logs, before, column_changes = run_cleaning(df, body.model_dump())

    run_id = str(uuid.uuid4())

    cleaned_dir = settings.DATA_DIR / "cleaning" / dataset_id / run_id
    cleaned_dir.mkdir(parents=True, exist_ok=True)
    cleaned_path = cleaned_dir / "cleaned.csv"
    df_cleaned.to_csv(cleaned_path, index=False)

    after = {
        "row_count": len(df_cleaned),
        "column_count": len(df_cleaned.columns),
        "total_missing": int(df_cleaned.isna().sum().sum()),
        "total_missing_pct": round(
            int(df_cleaned.isna().sum().sum())
            / (len(df_cleaned) * len(df_cleaned.columns) or 1), 4
        ),
        "duplicate_count": int(df_cleaned.duplicated().sum()),
        "duplicate_pct": round(
            int(df_cleaned.duplicated().sum()) / max(len(df_cleaned), 1), 4
        ),
    }

    report = {
        "dataset_id": dataset_id,
        "run_id": run_id,
        "created_at": datetime.now(UTC).isoformat(),
        "config": body.model_dump(),
        "steps": logs,
        "before": before,
        "after": after,
        "column_changes": column_changes,
    }

    storage.save_cleaning_config(dataset_id, run_id, body.model_dump())
    storage.save_cleaning_report(dataset_id, run_id, report)

    dataset_id_new = str(uuid.uuid4())
    cleaned_entry = {
        "id": dataset_id_new,
        "name": body.name or f"{dataset['name']} (cleaned)",
        "original_filename": f"{dataset['name']}_cleaned.csv",
        "file_path": str(cleaned_path),
        "file_format": "csv",
        "file_size_bytes": cleaned_path.stat().st_size,
        "row_count": len(df_cleaned),
        "column_count": len(df_cleaned.columns),
        "source_dataset_id": dataset_id,
        "cleaning_run_id": run_id,
        "is_cleaned": True,
        "status": "ready",
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }
    storage.save_dataset(cleaned_entry)

    return {
        "dataset": cleaned_entry,
        "report": report,
    }


@router.get("/{dataset_id}/cleaning/report/{run_id}")
async def get_cleaning_report(dataset_id: str, run_id: str) -> dict:
    report = storage.get_cleaning_report(dataset_id, run_id)
    if not report:
        raise NotFoundError("Cleaning report", run_id)
    return report


@router.get("/{dataset_id}/cleaning/runs")
async def list_cleaning_runs(dataset_id: str) -> list[dict]:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)
    return storage.list_cleaning_runs(dataset_id)


@router.get("/{dataset_id}/cleaning/download/{run_id}")
async def download_cleaned_data(dataset_id: str, run_id: str):
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)
    path = storage.get_cleaned_data_path(dataset_id, run_id)
    if not path.exists():
        raise NotFoundError("Cleaned data", run_id)
    safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in dataset["name"])
    safe_name = safe_name.strip().replace(" ", "_") or "dataset"
    return FileResponse(
        path,
        media_type="text/csv",
        filename=f"cleaned_{safe_name}.csv",
    )
