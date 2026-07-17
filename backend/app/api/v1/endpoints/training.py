import asyncio
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


def _prepare_data(body: dict, dataset: dict) -> tuple:
    pipeline_id = body.get("pipeline_id")
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id)
        if not pipeline or pipeline["status"] != "completed":
            raise ValidationError("Pipeline must be completed before training")
        processed_dir = settings.DATA_DIR / "processed" / pipeline_id
        train_path = processed_dir / "train.parquet"
        test_path = processed_dir / "test.parquet"
        if not train_path.exists() or not test_path.exists():
            raise ValidationError("Processed data not found. Execute the pipeline first.")
        train_df = pd.read_parquet(train_path)
        test_df = pd.read_parquet(test_path)
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

        if "target" in body.get("target_column", "target"):
            target_col = body.get("target_column", "target")
            if target_col not in df.columns:
                target_col = df.columns[-1]
        else:
            target_col = body.get("target_column", df.columns[-1])

        if target_col not in df.columns:
            raise ValidationError(f"Target column '{target_col}' not found")

        df = df.dropna()
        X = df.drop(columns=[target_col]).select_dtypes(include=[np.number])
        y = df[target_col]

        if y.dtype == "object":
            y = y.astype("category").cat.codes

        train_df, test_df = train_test_split(
            pd.concat([X, y.rename(target_col)], axis=1),
            test_size=body.get("test_size", 0.2),
            random_state=body.get("random_seed", 42),
        )

    target_col = [c for c in train_df.columns if c not in test_df.columns or True][-1]
    feature_cols = [c for c in train_df.columns if c != target_col]

    X_train = train_df[feature_cols].select_dtypes(include=[np.number]).values
    y_train = train_df[target_col].values
    X_test = test_df[feature_cols].select_dtypes(include=[np.number]).values
    y_test = test_df[target_col].values

    if len(np.unique(y_train)) < 2:
        raise ValidationError("Target column must have at least 2 classes")

    return X_train, y_train, X_test, y_test, pipeline_id


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
) -> None:
    job = storage.get_job(job_id)
    if not job:
        return
    job["status"] = "running"
    job["progress"] = 10.0
    storage.save_job(job)

    model_entry = storage.get_model(model_id)
    if not model_entry:
        return

    try:
        clf = ALGORITHMS[algorithm](hyperparameters)
        clf.fit(X_train, y_train)

        job["progress"] = 60.0
        storage.save_job(job)

        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test) if hasattr(clf, "predict_proba") else None

        metrics = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "f1_score": round(float(f1_score(y_test, y_pred, average="weighted")), 4),
            "precision": round(float(precision_score(y_test, y_pred, average="weighted")), 4),
            "recall": round(float(recall_score(y_test, y_pred, average="weighted")), 4),
        }

        if y_prob is not None and len(np.unique(y_train)) == 2:
            metrics["roc_auc"] = round(float(roc_auc_score(y_test, y_prob[:, 1])), 4)

        model_entry["metrics"] = metrics
        model_entry["status"] = "completed"
        model_entry["training_duration_ms"] = 0

        model_artifact_dir = settings.DATA_DIR / "models" / model_id
        model_artifact_dir.mkdir(parents=True, exist_ok=True)
        cloudpickle.dump(clf, open(model_artifact_dir / "model.pkl", "wb"))
        model_entry["file_path"] = str(model_artifact_dir / "model.pkl")

        job["status"] = "completed"
        job["progress"] = 100.0
        job["completed_at"] = datetime.now(UTC).isoformat()

        all_models = storage.list_models()
        if all(m.get("metrics") for m in all_models if m["id"] != model_id):
            best_acc = max((m["metrics"]["accuracy"] for m in all_models if m.get("metrics") and m["id"] != model_id), default=0)
            if metrics["accuracy"] >= best_acc:
                model_entry["is_best"] = True
    except Exception as e:
        model_entry["status"] = "failed"
        model_entry["error_message"] = str(e)
        job["status"] = "failed"
        job["error_message"] = str(e)

    storage.save_model(model_entry)
    storage.save_job(job)

    storage.save_model(model_entry)
    storage.save_job(job)


@router.post("/", status_code=201)
async def train_model(body: dict, background_tasks: BackgroundTasks) -> dict:
    dataset_id = body.get("dataset_id")
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    algorithm = body.get("algorithm")
    if algorithm not in ALGORITHMS:
        raise ValidationError(f"Unsupported algorithm. Choose from: {', '.join(ALGORITHMS.keys())}")

    X_train, y_train, X_test, y_test, pipeline_id = _prepare_data(body, dataset)

    model_id = str(uuid.uuid4())
    model_entry = {
        "id": model_id,
        "dataset_id": dataset_id,
        "pipeline_id": pipeline_id,
        "name": body.get("name", f"{algorithm} v1"),
        "algorithm": algorithm,
        "hyperparameters": body.get("hyperparameters", {}),
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
        algorithm,
        body.get("hyperparameters", {}),
        X_train,
        y_train,
        X_test,
        y_test,
        dataset_id,
        pipeline_id,
        body.get("name", f"{algorithm} v1"),
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
    filename = f"{model['algorithm']}_{model_id[:8]}.pkl"
    return FileResponse(file_path, media_type="application/octet-stream", filename=filename)


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