import threading
import time
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends
from app.api.v1.endpoints.datasets import get_session_id

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.services.eda_service import compute_eda
from app.storage import storage

router = APIRouter()

_processing_locks: dict[str, threading.Lock] = {}
_lock_for_locks = threading.Lock()


def _get_processing_lock(dataset_id: str) -> threading.Lock:
    with _lock_for_locks:
        if dataset_id not in _processing_locks:
            _processing_locks[dataset_id] = threading.Lock()
        return _processing_locks[dataset_id]


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


def _run_eda_background(dataset_id: str):
    try:
        dataset = storage.get_dataset(dataset_id)
        if not dataset:
            return

        df = _read_dataframe(dataset)

        dataset["row_count"] = len(df)
        dataset["column_count"] = len(df.columns)
        storage.save_dataset(dataset)

        def on_progress(step: str, pct: float):
            storage.save_eda_progress(dataset_id, {
                "status": "processing",
                "progress": round(pct, 4),
                "step": step,
            })

        report = compute_eda(dataset_id, df, progress_callback=on_progress)
        storage.save_eda_report(dataset_id, report)
        storage.save_eda_progress(dataset_id, {
            "status": "completed",
            "progress": 1.0,
            "step": "Complete",
        })
    except Exception as e:
        storage.save_eda_progress(dataset_id, {
            "status": "failed",
            "progress": 0.0,
            "step": str(e),
            "error": str(e),
        })
    finally:
        _get_processing_lock(dataset_id).release()


@router.post("/{dataset_id}/eda")
async def start_eda(
    dataset_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    dataset = storage.get_dataset(dataset_id, session_id=session_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)
    if dataset["status"] != "ready":
        raise ConflictError(f"Dataset status is '{dataset['status']}', not 'ready'")

    lock = _get_processing_lock(dataset_id)
    if not lock.acquire(blocking=False):
        return {"status": "already_running", "message": "EDA computation is already in progress."}

    thread = threading.Thread(target=_run_eda_background, args=(dataset_id,), daemon=True)
    thread.start()

    return {"status": "started", "message": "EDA computation started."}


def _extract_column_stats(report: dict) -> list[dict]:
    num_map = {n["column"]: n for n in report.get("numeric_summary", [])}
    missing_map = {m["column"]: m for m in report.get("missingness", [])}
    cat_map = {c["column"]: c for c in report.get("categorical_summary", [])}
    stats = []
    for col in report.get("columns", []):
        dtype = col["dtype"]
        is_numeric = any(dtype.startswith(t) for t in ["int", "float", "complex", "number"])
        nstats = num_map.get(col["name"], {})
        minfo = missing_map.get(col["name"], {})
        cinfo = cat_map.get(col["name"], {})
        stats.append({
            "name": col["name"],
            "ordinal_position": col["ordinal_position"],
            "dtype": dtype,
            "is_numeric": is_numeric,
            "is_categorical": dtype == "object",
            "missing_count": minfo.get("count", 0),
            "missing_ratio": minfo.get("percent", 0),
            "unique_count": cinfo.get("cardinality", 0) if cinfo else (0 if not is_numeric else 0),
            "mean": nstats.get("mean"),
            "std": nstats.get("std"),
            "min": nstats.get("min"),
            "max": nstats.get("max"),
            "p25": nstats.get("q1"),
            "p50": nstats.get("median"),
            "p75": nstats.get("q3"),
            "skewness": nstats.get("skewness"),
            "kurtosis": nstats.get("kurtosis"),
        })
    return stats


@router.get("/{dataset_id}/eda")
async def get_eda_status(
    dataset_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    dataset = storage.get_dataset(dataset_id, session_id=session_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    report = storage.get_eda_report(dataset_id)
    if report:
        return {"status": "completed", "progress": 1.0, "report": report}

    progress = storage.get_eda_progress(dataset_id)
    if progress:
        return {
            "status": progress.get("status", "processing"),
            "progress": progress.get("progress", 0.0),
            "step": progress.get("step", ""),
            "error": progress.get("error"),
        }

    return {"status": "not_started", "progress": 0.0, "step": ""}


@router.get("/{dataset_id}/columns")
async def get_columns(
    dataset_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    dataset = storage.get_dataset(dataset_id, session_id=session_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    report = storage.get_eda_report(dataset_id)
    if not report:
        df = _read_dataframe(dataset)
        dataset["row_count"] = len(df)
        dataset["column_count"] = len(df.columns)
        storage.save_dataset(dataset)
        full = compute_eda(dataset_id, df)
        storage.save_eda_report(dataset_id, full)
        storage.save_eda_progress(dataset_id, {
            "status": "completed",
            "progress": 1.0,
            "step": "Complete",
        })
        report = full

    column_stats = _extract_column_stats(report)
    return {"column_stats": column_stats}
