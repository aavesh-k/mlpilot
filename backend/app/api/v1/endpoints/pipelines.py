import asyncio
import uuid
from datetime import UTC, datetime
from pathlib import Path

import cloudpickle
import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.storage import storage
from app.api.v1.schemas.pipelines import CreatePipelineSchema, UpdatePipelineSchema
from app.services.preprocessing_service import (
    run_preprocessing,
    suggest_pipeline_config,
    detect_problem_type,
    check_class_balance,
)
from app.core.io import read_dataframe

router = APIRouter()


@router.post("/suggest", status_code=200)
async def get_pipeline_suggestions(dataset_id: str) -> dict:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    eda_report = storage.get_eda_report(dataset_id)
    suggestions = suggest_pipeline_config(dataset_id, eda_report)
    return suggestions


@router.post("/detect-target", status_code=200)
async def detect_target_problem_type(dataset_id: str, target_column: str) -> dict:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    df = read_dataframe(dataset)
    if target_column not in df.columns:
        raise ValidationError(f"Target column '{target_column}' not found")

    y = df[target_column]
    problem_type = detect_problem_type(y)
    if problem_type == "invalid":
        raise ValidationError(f"Target column '{target_column}' has fewer than 2 unique values")

    imbalance = check_class_balance(y) if problem_type == "classification" else None

    return {
        "target_column": target_column,
        "problem_type": problem_type,
        "unique_values": int(y.nunique()),
        "dtype": str(y.dtype),
        "imbalance": imbalance,
    }


@router.post("/", status_code=201)
async def create_pipeline(body: CreatePipelineSchema) -> dict:
    dataset = storage.get_dataset(body.dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", body.dataset_id)

    df = read_dataframe(dataset)
    if body.target_column not in df.columns:
        raise ValidationError(f"Target column '{body.target_column}' not found in dataset")

    y = df[body.target_column]
    problem_type = body.problem_type or detect_problem_type(y)
    if problem_type == "invalid":
        raise ValidationError(f"Target column '{body.target_column}' has fewer than 2 unique values")

    pipeline = {
        "id": str(uuid.uuid4()),
        "dataset_id": body.dataset_id,
        "target_column": body.target_column,
        "problem_type": problem_type,
        "name": body.name or f"Pipeline ({body.target_column})",
        "status": "draft",
        "encoding": body.encoding.model_dump(),
        "scaling": body.scaling.model_dump(),
        "split": body.split.model_dump(),
        "feature_selection": body.feature_selection.model_dump(),
        "use_smote": body.use_smote,
        "use_class_weight": body.use_class_weight,
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }
    return storage.save_pipeline(pipeline)


@router.get("/")
async def list_pipelines(page: int = 1, per_page: int = 20) -> dict:
    all_pipelines = storage.list_pipelines()
    total = len(all_pipelines)
    start = (page - 1) * per_page
    items = all_pipelines[start:start + per_page]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{pipeline_id}")
async def get_pipeline(pipeline_id: str) -> dict:
    pipeline = storage.get_pipeline(pipeline_id)
    if not pipeline:
        raise NotFoundError("Pipeline", pipeline_id)
    return pipeline


@router.put("/{pipeline_id}")
async def update_pipeline(pipeline_id: str, body: UpdatePipelineSchema) -> dict:
    pipeline = storage.get_pipeline(pipeline_id)
    if not pipeline:
        raise NotFoundError("Pipeline", pipeline_id)
    if pipeline["status"] == "running":
        raise ConflictError("Cannot update a running pipeline")

    if body.target_column is not None:
        pipeline["target_column"] = body.target_column
    if body.problem_type is not None:
        pipeline["problem_type"] = body.problem_type
    if body.name is not None:
        pipeline["name"] = body.name
    if body.encoding is not None:
        pipeline["encoding"] = body.encoding.model_dump()
    if body.scaling is not None:
        pipeline["scaling"] = body.scaling.model_dump()
    if body.split is not None:
        pipeline["split"] = body.split.model_dump()
    if body.feature_selection is not None:
        pipeline["feature_selection"] = body.feature_selection.model_dump()
    if body.use_smote is not None:
        pipeline["use_smote"] = body.use_smote
    if body.use_class_weight is not None:
        pipeline["use_class_weight"] = body.use_class_weight
    pipeline["updated_at"] = datetime.now(UTC).isoformat()
    return storage.save_pipeline(pipeline)


@router.delete("/{pipeline_id}", status_code=204)
async def delete_pipeline(pipeline_id: str):
    pipeline = storage.get_pipeline(pipeline_id)
    if not pipeline:
        raise NotFoundError("Pipeline", pipeline_id)
    if pipeline["status"] == "running":
        raise ConflictError("Cannot delete a running pipeline")
    storage.delete_pipeline(pipeline_id)
    return None


def _run_execution_background(pipeline: dict, eda_report: dict | None) -> None:
    try:
        config = {
            "problem_type": pipeline.get("problem_type") or "classification",
            "encoding": pipeline.get("encoding", {}),
            "scaling": pipeline.get("scaling", {}),
            "split": pipeline.get("split", {}),
            "feature_selection": pipeline.get("feature_selection", {}),
            "use_smote": pipeline.get("use_smote", False),
            "use_class_weight": pipeline.get("use_class_weight", False),
        }
        result = run_preprocessing(
            dataset_id=pipeline["dataset_id"],
            target_col=pipeline["target_column"],
            config=config,
            eda_report=eda_report,
            pipeline_id=pipeline["id"],
        )
        pipeline.update(result)
        pipeline["status"] = "completed"
        pipeline["updated_at"] = datetime.now(UTC).isoformat()
        storage.save_pipeline(pipeline)
    except Exception as e:
        pipeline["status"] = "failed"
        pipeline["error_message"] = str(e)
        pipeline["updated_at"] = datetime.now(UTC).isoformat()
        storage.save_pipeline(pipeline)


@router.post("/{pipeline_id}/execute")
async def execute_pipeline(pipeline_id: str) -> dict:
    pipeline = storage.get_pipeline(pipeline_id)
    if not pipeline:
        raise NotFoundError("Pipeline", pipeline_id)
    if pipeline["status"] == "running":
        raise ConflictError("Pipeline already running")

    dataset = storage.get_dataset(pipeline["dataset_id"])
    if not dataset:
        raise NotFoundError("Source dataset", pipeline["dataset_id"])

    eda_report = storage.get_eda_report(pipeline["dataset_id"])

    pipeline["status"] = "running"
    pipeline["updated_at"] = datetime.now(UTC).isoformat()
    storage.save_pipeline(pipeline)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_execution_background, pipeline, eda_report)

    return storage.get_pipeline(pipeline_id)


@router.post("/{pipeline_id}/score", status_code=200)
async def score_pipeline(pipeline_id: str, file: UploadFile = File(...)) -> dict:
    pipeline = storage.get_pipeline(pipeline_id)
    if not pipeline:
        raise NotFoundError("Pipeline", pipeline_id)
    if pipeline.get("status") != "completed":
        raise ValidationError("Pipeline must be completed before scoring")

    artifact_path = pipeline.get("artifact_path")
    if not artifact_path or not Path(artifact_path).exists():
        raise NotFoundError("Pipeline artifact", pipeline_id)

    try:
        temp = Path(settings.DATA_DIR) / "tmp" / f"score_{pipeline_id}_{uuid.uuid4().hex}{Path(file.filename).suffix}"
        temp.parent.mkdir(parents=True, exist_ok=True)
        content = await file.read()
        temp.write_bytes(content)

        ext = temp.suffix.lower()
        if ext == ".csv":
            df = pd.read_csv(temp)
        elif ext == ".parquet":
            df = pd.read_parquet(temp)
        elif ext == ".json":
            df = pd.read_json(temp)
        else:
            raise ValidationError(f"Unsupported file format: {ext}")
    finally:
        if temp.exists():
            temp.unlink()

    target_col = pipeline.get("target_column")
    if target_col and target_col in df.columns:
        df = df.drop(columns=[target_col])

    with open(artifact_path, "rb") as f:
        fitted_pipeline = cloudpickle.load(f)

    transformed = fitted_pipeline.transform(df)
    if isinstance(transformed, np.ndarray):
        try:
            feature_names = fitted_pipeline.named_steps["preprocessor"].get_feature_names_out()
        except Exception:
            feature_names = [f"feature_{i}" for i in range(transformed.shape[1])]
        result_df = pd.DataFrame(transformed, columns=feature_names)
    else:
        result_df = transformed

    return {
        "pipeline_id": pipeline_id,
        "rows": len(result_df),
        "features": len(result_df.columns),
        "feature_names": list(result_df.columns),
        "data": result_df.head(100).to_dict(orient="records"),
        "download_url": None,
    }
