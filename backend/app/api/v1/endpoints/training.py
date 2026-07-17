import asyncio
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
import numpy as np
import cloudpickle
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.storage import storage
from app.api.v1.schemas.training import TrainModelSchema

router = APIRouter()

ALGORITHMS = {
    "random_forest": lambda hp: RandomForestClassifier(
        n_estimators=hp.get("n_estimators", 100),
        max_depth=hp.get("max_depth"),
        random_state=hp.get("random_state", 42),
    ),
    "svm": lambda hp: SVC(
        C=hp.get("C", 1.0),
        kernel=hp.get("kernel", "rbf"),
        probability=True,
        random_state=hp.get("random_state", 42),
    ),
    "logistic_regression": lambda hp: LogisticRegression(
        C=hp.get("C", 1.0),
        max_iter=hp.get("max_iter", 1000),
        random_state=hp.get("random_state", 42),
    ),
    "xgboost": lambda hp: XGBClassifier(
        n_estimators=hp.get("n_estimators", 100),
        max_depth=hp.get("max_depth", 6),
        learning_rate=hp.get("learning_rate", 0.3),
        random_state=hp.get("random_state", 42),
        use_label_encoder=False,
        eval_metric="logloss",
    ),
}


def _prepare_data(body: TrainModelSchema, dataset: dict) -> tuple:
    pipeline = None
    pipeline_id = body.pipeline_id
    use_class_weight = False
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id)
        if not pipeline or pipeline.get("status") != "completed":
            raise ValidationError("Pipeline must be completed before training")
        use_class_weight = pipeline.get("use_class_weight", False)
        processed_dir = settings.DATA_DIR / "processed" / pipeline_id
        train_path = processed_dir / "train.parquet"
        test_path = processed_dir / "test.parquet"
        if not train_path.exists() or not test_path.exists():
            raise ValidationError("Processed data not found. Execute the pipeline first.")
        train_df = pd.read_parquet(train_path)
        test_df = pd.read_parquet(test_path)
        target_col = pipeline.get("target_column")
        if not target_col or target_col not in train_df.columns:
            raise ValidationError(f"Target column '{target_col}' not found in processed data")
    else:
        file_path = Path(dataset["file_path"])
        ext = f".{dataset['file_format']}"
        if ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext == ".parquet":
            df = pd.read_parquet(file_path)
        elif ext == ".json":
            df = pd.read_json(file_path)
        else:
            raise ValidationError("Unsupported format")

        target_col = body.target_column
        if not target_col or target_col not in df.columns:
            target_col = df.columns[-1]

        if target_col not in df.columns:
            raise ValidationError(f"Target column '{target_col}' not found")

        X = df.drop(columns=[target_col]).select_dtypes(include=[np.number])
        y = df[target_col]

        if y.dtype == "object":
            y = y.astype("category").cat.codes

        train_df, test_df = train_test_split(
            pd.concat([X, y.rename(target_col)], axis=1),
            test_size=body.test_size,
            random_state=body.random_seed,
        )

    feature_cols = [c for c in train_df.columns if c != target_col]

    X_train = train_df[feature_cols].select_dtypes(include=[np.number]).values
    y_train = train_df[target_col].values
    X_test = test_df[feature_cols].select_dtypes(include=[np.number]).values
    y_test = test_df[target_col].values

    if len(np.unique(y_train)) < 2:
        raise ValidationError("Target column must have at least 2 classes")

    return X_train, y_train, X_test, y_test, pipeline_id, use_class_weight


def _append_log(job: dict, message: str) -> None:
    timestamp = datetime.now(UTC).strftime("%H:%M:%S")
    entry = f"[{timestamp}] {message}"
    job["log"] = (job.get("log", "") + "\n" + entry).strip()
    storage.save_job(job)


def _run_training_background(
    model_id: str,
    job_id: str,
    algorithm: str,
    hyperparameters: dict,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    dataset_id: str,
    pipeline_id: str | None,
    name: str,
    use_class_weight: bool = False,
) -> None:
    job = storage.get_job(job_id)
    if not job:
        return
    job["status"] = "running"
    job["progress"] = 5.0
    _append_log(job, f"Starting training for {algorithm}")

    model_entry = storage.get_model(model_id)
    if not model_entry:
        return

    try:
        start_time = time.perf_counter()

        clf = ALGORITHMS[algorithm](hyperparameters)

        if use_class_weight:
            if algorithm == "xgboost":
                classes, counts = np.unique(y_train, return_counts=True)
                if len(classes) == 2:
                    scale_pos_weight = counts[0] / counts[1]
                    clf.set_params(scale_pos_weight=scale_pos_weight)
            else:
                clf.set_params(class_weight="balanced")

        _append_log(job, f"Initialized {algorithm} classifier")
        job["progress"] = 15.0
        storage.save_job(job)

        clf.fit(X_train, y_train)
        _append_log(job, "Model fitting complete")

        job["progress"] = 50.0
        storage.save_job(job)

        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test) if hasattr(clf, "predict_proba") else None
        _append_log(job, "Predictions generated")

        metrics = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "f1_score": round(float(f1_score(y_test, y_pred, average="weighted")), 4),
            "precision": round(float(precision_score(y_test, y_pred, average="weighted")), 4),
            "recall": round(float(recall_score(y_test, y_pred, average="weighted")), 4),
        }

        if y_prob is not None and len(np.unique(y_train)) == 2:
            metrics["roc_auc"] = round(float(roc_auc_score(y_test, y_prob[:, 1])), 4)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        _append_log(job, f"Metrics computed in {elapsed_ms}ms")

        model_entry["metrics"] = metrics
        model_entry["status"] = "completed"
        model_entry["training_duration_ms"] = elapsed_ms

        model_artifact_dir = settings.DATA_DIR / "models" / model_id
        model_artifact_dir.mkdir(parents=True, exist_ok=True)
        cloudpickle.dump(clf, open(model_artifact_dir / "model.pkl", "wb"))
        model_entry["file_path"] = str(model_artifact_dir / "model.pkl")

        job["status"] = "completed"
        job["progress"] = 100.0
        job["completed_at"] = datetime.now(UTC).isoformat()
        _append_log(job, "Training completed successfully")

        all_models = storage.list_models()
        completed_models = [m for m in all_models if m.get("metrics") and m["id"] != model_id]
        if completed_models:
            best_acc = max(m["metrics"]["accuracy"] for m in completed_models)
            model_entry["is_best"] = metrics["accuracy"] > best_acc
        else:
            model_entry["is_best"] = True
    except Exception as e:
        model_entry["status"] = "failed"
        model_entry["error_message"] = str(e)
        job["status"] = "failed"
        job["error_message"] = str(e)
        _append_log(job, f"Training failed: {e}")

    storage.save_model(model_entry)
    storage.save_job(job)


@router.post("/", status_code=201)
async def train_model(body: TrainModelSchema, background_tasks: BackgroundTasks) -> dict:
    dataset = storage.get_dataset(body.dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", body.dataset_id)

    loop = asyncio.get_event_loop()
    X_train, y_train, X_test, y_test, pipeline_id, use_class_weight = await loop.run_in_executor(
        None, _prepare_data, body, dataset
    )

    model_id = str(uuid.uuid4())
    model_entry = {
        "id": model_id,
        "dataset_id": body.dataset_id,
        "pipeline_id": pipeline_id,
        "name": body.name or f"{body.algorithm} v1",
        "algorithm": body.algorithm,
        "hyperparameters": body.hyperparameters,
        "status": "queued",
        "created_at": datetime.now(UTC).isoformat(),
    }
    storage.save_model(model_entry)

    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "model_id": model_id,
        "status": "queued",
        "progress": 0.0,
        "log": "",
        "started_at": datetime.now(UTC).isoformat(),
    }
    storage.save_job(job)

    background_tasks.add_task(
        asyncio.to_thread,
        _run_training_background,
        model_id,
        job_id,
        body.algorithm,
        body.hyperparameters,
        X_train,
        y_train,
        X_test,
        y_test,
        body.dataset_id,
        pipeline_id,
        body.name or f"{body.algorithm} v1",
        use_class_weight,
    )

    return {
        "model": model_entry,
        "job": job,
    }


@router.get("/models")
async def list_models(page: int = 1, per_page: int = 20) -> dict:
    all_models = storage.list_models()
    total = len(all_models)
    start = (page - 1) * per_page
    items = all_models[start:start + per_page]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/models/compare")
async def compare_models(ids: str = "") -> list[dict]:
    if not ids:
        raise ValidationError("Provide model ids: ?ids=id1,id2,id3")

    model_ids = [m_id.strip() for m_id in ids.split(",")]
    all_models = storage.list_models()
    selected = [m for m in all_models if m["id"] in model_ids]

    if not selected:
        raise NotFoundError("Model", ids)

    best_acc = max((m.get("metrics", {}).get("accuracy", 0) for m in selected), default=0)
    for m in selected:
        m["is_best"] = m.get("metrics", {}).get("accuracy", 0) >= best_acc

    return sorted(selected, key=lambda m: m.get("metrics", {}).get("accuracy", 0), reverse=True)


@router.get("/models/{model_id}")
async def get_model(model_id: str) -> dict:
    model = storage.get_model(model_id)
    if not model:
        raise NotFoundError("Model", model_id)
    return model


@router.get("/models/{model_id}/download")
async def download_model(model_id: str):
    model = storage.get_model(model_id)
    if not model:
        raise NotFoundError("Model", model_id)
    file_path = model.get("file_path")
    if not file_path or not Path(file_path).exists():
        raise NotFoundError("Model artifact", model_id)

    pipeline_id = model.get("pipeline_id")
    bundle_path = Path(file_path)
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id)
        if pipeline and pipeline.get("artifact_path"):
            pipeline_artifact = Path(pipeline["artifact_path"])
            if pipeline_artifact.exists():
                from zipfile import ZipFile
                bundle_dir = settings.DATA_DIR / "models" / model_id
                bundle_zip = bundle_dir / "bundle.zip"
                with ZipFile(bundle_zip, "w") as zf:
                    zf.write(file_path, "model.pkl")
                    zf.write(str(pipeline_artifact), "pipeline.pkl")
                    le_path = pipeline.get("label_encoder_path")
                    if le_path and Path(le_path).exists():
                        zf.write(le_path, "label_encoder.pkl")
                bundle_path = bundle_zip

    filename = f"{model['algorithm']}_{model_id[:8]}.zip" if bundle_path.suffix == ".zip" else f"{model['algorithm']}_{model_id[:8]}.pkl"
    return FileResponse(str(bundle_path), media_type="application/octet-stream", filename=filename)


@router.get("/jobs")
async def list_jobs(page: int = 1, per_page: int = 20) -> dict:
    all_jobs = storage.list_jobs()
    total = len(all_jobs)
    start = (page - 1) * per_page
    items = all_jobs[start:start + per_page]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str) -> dict:
    job = storage.get_job(job_id)
    if not job:
        raise NotFoundError("Job", job_id)
    return job


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str) -> dict:
    job = storage.get_job(job_id)
    if not job:
        raise NotFoundError("Job", job_id)
    if job["status"] not in ("queued", "running"):
        raise ConflictError(f"Job is '{job['status']}', cannot cancel")

    job["status"] = "cancelled"
    job["completed_at"] = datetime.now(UTC).isoformat()
    storage.save_job(job)

    model = storage.get_model(job["model_id"])
    if model:
        model["status"] = "cancelled"
        storage.save_model(model)

    return job