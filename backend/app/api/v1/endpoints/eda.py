from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.storage import storage

router = APIRouter()


@router.get("/{dataset_id}/eda")
async def run_eda(dataset_id: str) -> dict:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)
    if dataset["status"] != "ready":
        raise ConflictError(f"Dataset status is '{dataset['status']}', not 'ready'")

    file_path = Path(dataset["file_path"])
    if not file_path.exists():
        raise NotFoundError("Dataset file", str(file_path))

    ext = f".{dataset['file_format']}"
    if ext == ".csv":
        df = pd.read_csv(file_path)
    elif ext == ".parquet":
        df = pd.read_parquet(file_path)
    elif ext == ".json":
        df = pd.read_json(file_path)
    elif ext == ".xlsx":
        df = pd.read_excel(file_path)
    else:
        raise ValidationError("Unsupported format")

    if df.empty:
        raise ValidationError("Dataset has no columns")

    column_stats = []
    for i, (col_name, series) in enumerate(df.items(), start=1):
        dtype = str(series.dtype)
        is_numeric = np.issubdtype(series.dtype, np.number)
        missing_count = int(series.isna().sum())
        row_count = len(series)
        stats: dict = {
            "name": col_name,
            "ordinal_position": i,
            "dtype": dtype,
            "is_numeric": is_numeric,
            "is_categorical": dtype == "object",
            "missing_count": missing_count,
            "missing_ratio": round(missing_count / row_count, 4) if row_count else 0,
            "unique_count": int(series.nunique()),
        }
        if is_numeric:
            desc = series.describe(percentiles=[0.25, 0.5, 0.75])
            stats.update({
                "mean": round(float(desc.get("mean", 0)), 4),
                "std": round(float(desc.get("std", 0)), 4),
                "min": round(float(desc.get("min", 0)), 2),
                "max": round(float(desc.get("max", 0)), 2),
                "p25": round(float(desc.get("25%", 0)), 4),
                "p50": round(float(desc.get("50%", 0)), 4),
                "p75": round(float(desc.get("75%", 0)), 4),
                "skewness": round(float(series.skew()), 4),
                "kurtosis": round(float(series.kurtosis()), 4),
            })
        column_stats.append(stats)

    storage.save_columns(dataset_id, column_stats)

    num_cols = df.select_dtypes(include=[np.number]).columns
    correlation_matrix: dict = {}
    if len(num_cols) > 1:
        corr = df[num_cols].corr()
        correlation_matrix = corr.round(4).to_dict()

    findings = []
    for col in column_stats:
        if col["missing_ratio"] and col["missing_ratio"] > 0.05:
            findings.append({
                "severity": "warning",
                "title": "Missing Values Detected",
                "description": f"'{col['name']}' has {col['missing_ratio']*100:.1f}% missing values. Imputation recommended.",
                "affected_columns": [col["name"]],
            })

    for col_a in num_cols:
        for col_b in num_cols:
            if col_a < col_b:
                val = correlation_matrix.get(col_a, {}).get(col_b, 0)
                if abs(val) > 0.85:
                    findings.append({
                        "severity": "critical",
                        "title": "High Correlation Detected",
                        "description": f"'{col_a}' and '{col_b}' show {val:.2f} correlation. Consider multicollinearity analysis.",
                        "affected_columns": [col_a, col_b],
                    })

    return {
        "dataset_id": dataset_id,
        "computed_at": pd.Timestamp.now().isoformat(),
        "column_stats": column_stats,
        "correlation_matrix": correlation_matrix,
        "findings": findings,
    }


@router.get("/{dataset_id}/columns")
async def get_columns(dataset_id: str) -> list[dict]:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    cols = storage.get_columns(dataset_id)
    if not cols:
        return await run_eda(dataset_id)
    return cols
