import uuid
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from fastapi import APIRouter

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.storage import storage

router = APIRouter()

ALLOWED_STEPS = {"imputation", "encoding", "scaling", "train_test_split"}


@router.post("/", status_code=201)
async def create_pipeline(body: dict) -> dict:
    dataset_id = body.get("dataset_id")
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    steps = body.get("steps", [])
    if not steps:
        raise ValidationError("Pipeline must have at least one step")
    if len(steps) > 10:
        raise ValidationError("Pipeline cannot have more than 10 steps")

    for step in steps:
        if step.get("step_type") not in ALLOWED_STEPS:
            raise ValidationError(f"Invalid step type: {step.get('step_type')}")

    pipeline = {
        "id": str(uuid.uuid4()),
        "dataset_id": dataset_id,
        "name": body.get("name", "Untitled Pipeline"),
        "status": "draft",
        "test_split_ratio": body.get("test_split_ratio", 0.2),
        "random_seed": body.get("random_seed", 42),
        "steps": steps,
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
async def update_pipeline(pipeline_id: str, body: dict) -> dict:
    pipeline = storage.get_pipeline(pipeline_id)
    if not pipeline:
        raise NotFoundError("Pipeline", pipeline_id)
    if pipeline["status"] == "running":
        raise ConflictError("Cannot update a running pipeline")

    steps = body.get("steps", pipeline["steps"])
    for step in steps:
        if step.get("step_type") not in ALLOWED_STEPS:
            raise ValidationError(f"Invalid step type: {step.get('step_type')}")

    pipeline["name"] = body.get("name", pipeline["name"])
    pipeline["steps"] = steps
    pipeline["test_split_ratio"] = body.get("test_split_ratio", pipeline["test_split_ratio"])
    pipeline["random_seed"] = body.get("random_seed", pipeline["random_seed"])
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

    file_path = Path(dataset["file_path"])
    ext = f".{dataset['file_format']}"
    if ext == ".csv":
        df = pd.read_csv(file_path)
    elif ext == ".parquet":
        df = pd.read_parquet(file_path)
    else:
        raise ValidationError("Unsupported dataset format for pipeline")

    pipeline["status"] = "running"
    pipeline["updated_at"] = datetime.now(UTC).isoformat()
    storage.save_pipeline(pipeline)

    try:
        for step in pipeline["steps"]:
            step_type = step["step_type"]
            config = step.get("config", {})
            cols = step.get("columns")

            if step_type == "imputation":
                strategy = config.get("strategy", "mean")
                target = cols or df.select_dtypes(include=["number"]).columns.tolist()
                for c in target:
                    if strategy == "mean":
                        df[c] = df[c].fillna(df[c].mean())
                    elif strategy == "median":
                        df[c] = df[c].fillna(df[c].median())
                    elif strategy == "mode":
                        df[c] = df[c].fillna(df[c].mode()[0] if not df[c].mode().empty else 0)

            elif step_type == "encoding":
                strategy = config.get("strategy", "one_hot")
                target = cols or df.select_dtypes(include=["object"]).columns.tolist()
                for c in target:
                    if strategy == "one_hot":
                        dummies = pd.get_dummies(df[c], prefix=c)
                        df = pd.concat([df.drop(columns=[c]), dummies], axis=1)
                    elif strategy == "label":
                        df[c] = df[c].astype("category").cat.codes

            elif step_type == "scaling":
                strategy = config.get("strategy", "standard")
                target = cols or df.select_dtypes(include=["number"]).columns.tolist()
                for c in target:
                    if strategy == "standard":
                        mean, std = df[c].mean(), df[c].std()
                        df[c] = (df[c] - mean) / (std + 1e-8)
                    elif strategy == "minmax":
                        mn, mx = df[c].min(), df[c].max()
                        df[c] = (df[c] - mn) / (mx - mn + 1e-8)

            elif step_type == "train_test_split":
                pass

        if any(s["step_type"] == "train_test_split" for s in pipeline["steps"]):
            ratio = pipeline["test_split_ratio"]
            train_df = df.sample(frac=1 - ratio, random_state=pipeline["random_seed"])
            test_df = df.drop(train_df.index)
            processed_dir = settings.DATA_DIR / "processed" / pipeline["id"]
            processed_dir.mkdir(parents=True, exist_ok=True)
            train_df.to_parquet(processed_dir / "train.parquet")
            test_df.to_parquet(processed_dir / "test.parquet")
        else:
            processed_dir = settings.DATA_DIR / "processed" / pipeline["id"]
            processed_dir.mkdir(parents=True, exist_ok=True)
            df.to_parquet(processed_dir / "full.parquet")

        pipeline["status"] = "completed"
    except Exception as e:
        pipeline["status"] = "failed"
        pipeline["error_message"] = str(e)

    pipeline["updated_at"] = datetime.now(UTC).isoformat()
    storage.save_pipeline(pipeline)
    return pipeline
