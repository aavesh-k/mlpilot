import asyncio
import time
import uuid
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd
import numpy as np
import cloudpickle
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier, XGBRegressor
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score, roc_auc_score,
    mean_squared_error, mean_absolute_error, r2_score, mean_absolute_percentage_error
)
from sklearn.model_selection import train_test_split, cross_validate, StratifiedKFold, KFold, RandomizedSearchCV
from sklearn.pipeline import Pipeline as SklearnPipeline

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.storage import storage
from app.api.v1.schemas.training import TrainModelSchema
from app.services.preprocessing_service import detect_problem_type

logger = logging.getLogger(__name__)
router = APIRouter()

ALGORITHMS = {
    # Classification
    "logistic_regression": lambda hp: LogisticRegression(
        C=hp.get("C", 1.0),
        max_iter=hp.get("max_iter", 1000),
        random_state=hp.get("random_state", 42),
    ),
    "random_forest": lambda hp: RandomForestClassifier(
        n_estimators=hp.get("n_estimators", 100),
        max_depth=hp.get("max_depth"),
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
    "svm": lambda hp: SVC(
        C=hp.get("C", 1.0),
        kernel=hp.get("kernel", "rbf"),
        probability=True,
        random_state=hp.get("random_state", 42),
    ),
    "knn": lambda hp: KNeighborsClassifier(
        n_neighbors=hp.get("n_neighbors", 5),
    ),
    
    # Regression
    "linear_regression": lambda hp: LinearRegression(),
    "ridge": lambda hp: Ridge(
        alpha=hp.get("alpha", 1.0),
        random_state=hp.get("random_state", 42),
    ),
    "lasso": lambda hp: Lasso(
        alpha=hp.get("alpha", 1.0),
        random_state=hp.get("random_state", 42),
    ),
    "random_forest_regressor": lambda hp: RandomForestRegressor(
        n_estimators=hp.get("n_estimators", 100),
        max_depth=hp.get("max_depth"),
        random_state=hp.get("random_state", 42),
    ),
    "xgboost_regressor": lambda hp: XGBRegressor(
        n_estimators=hp.get("n_estimators", 100),
        max_depth=hp.get("max_depth", 6),
        learning_rate=hp.get("learning_rate", 0.3),
        random_state=hp.get("random_state", 42),
    ),
}

PARAM_GRIDS = {
    "logistic_regression": {
        "C": [0.1, 1.0, 10.0],
    },
    "random_forest": {
        "n_estimators": [50, 100],
        "max_depth": [5, 10, None],
    },
    "xgboost": {
        "n_estimators": [50, 100],
        "learning_rate": [0.05, 0.1, 0.2],
        "max_depth": [3, 5, 7],
    },
    "svm": {
        "C": [0.1, 1.0, 10.0],
        "kernel": ["linear", "rbf"],
    },
    "knn": {
        "n_neighbors": [3, 5, 7],
    },
    "linear_regression": {},
    "ridge": {
        "alpha": [0.1, 1.0, 10.0],
    },
    "lasso": {
        "alpha": [0.01, 0.1, 1.0],
    },
    "random_forest_regressor": {
        "n_estimators": [50, 100],
        "max_depth": [5, 10, None],
    },
    "xgboost_regressor": {
        "n_estimators": [50, 100],
        "learning_rate": [0.05, 0.1, 0.2],
        "max_depth": [3, 5, 7],
    },
}


def _prepare_data(body: TrainModelSchema, dataset: dict) -> tuple:
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
        elif ext == ".xlsx":
            df = pd.read_excel(file_path)
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


def _run_cross_validation(clf: Any, X_train: np.ndarray, y_train: np.ndarray, problem_type: str, cv_folds: int) -> dict:
    if problem_type == "classification":
        cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
        scoring = ["accuracy", "f1_weighted"]
    else:
        cv = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
        scoring = ["r2", "neg_root_mean_squared_error"]
        
    scores = cross_validate(clf, X_train, y_train, cv=cv, scoring=scoring, n_jobs=1)
    
    cv_results = {}
    for metric in scoring:
        key = f"test_{metric}"
        if key in scores:
            cv_results[metric] = float(np.mean(scores[key]))
            
    if "neg_root_mean_squared_error" in cv_results:
        cv_results["rmse"] = -cv_results.pop("neg_root_mean_squared_error")
        
    return cv_results


def _evaluate_model(clf: Any, X_test: np.ndarray, y_test: np.ndarray, problem_type: str) -> dict:
    y_pred = clf.predict(X_test)
    
    metrics = {}
    if problem_type == "classification":
        metrics["accuracy"] = float(accuracy_score(y_test, y_pred))
        metrics["precision"] = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
        metrics["recall"] = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
        metrics["f1_score"] = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        
        if hasattr(clf, "predict_proba"):
            try:
                y_prob = clf.predict_proba(X_test)
                classes = np.unique(y_test)
                if len(classes) == 2:
                    metrics["roc_auc"] = float(roc_auc_score(y_test, y_prob[:, 1]))
                else:
                    metrics["roc_auc"] = float(roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted"))
            except Exception:
                pass
    else:
        mse = mean_squared_error(y_test, y_pred)
        metrics["rmse"] = float(np.sqrt(mse))
        metrics["mae"] = float(mean_absolute_error(y_test, y_pred))
        metrics["r2"] = float(r2_score(y_test, y_pred))
        metrics["mape"] = float(mean_absolute_percentage_error(y_test, y_pred))
        
    return {k: round(v, 4) for k, v in metrics.items()}


def _run_multi_training_background(
    job_id: str,
    pipeline_id: str | None,
    dataset_id: str,
    selected_algos: list[str],
    cv_folds: int,
    primary_metric: str | None,
    tuning_enabled: bool,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    model_ids_map: dict[str, str],
    use_class_weight: bool = False,
    random_seed: int = 42,
) -> None:
    job = storage.get_job(job_id)
    if not job:
        return
        
    job["status"] = "running"
    job["progress"] = 5.0
    _append_log(job, f"Starting multi-model training pipeline. Folds: {cv_folds}, Tuning: {tuning_enabled}")
    storage.save_job(job)

    problem_type = "classification"
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id)
        if pipeline:
            problem_type = pipeline.get("problem_type", "classification")
    else:
        problem_type = detect_problem_type(pd.Series(y_train))
        
    _append_log(job, f"Problem type detected: {problem_type}")

    # Set default primary metric if none selected
    if not primary_metric:
        primary_metric = "f1_score" if problem_type == "classification" else "r2"

    completed_models_metrics = {}
    completed_estimators = {}
    completed_durations = {}

    total_algos = len(selected_algos)
    for idx, algo in enumerate(selected_algos):
        model_id = model_ids_map[algo]
        model_entry = storage.get_model(model_id)
        if not model_entry:
            continue
            
        model_entry["status"] = "running"
        storage.save_model(model_entry)
        
        job_progress_base = 5.0 + (idx / total_algos) * 60.0
        job["progress"] = round(job_progress_base, 1)
        _append_log(job, f"[{idx + 1}/{total_algos}] Training baseline {algo}...")
        storage.save_job(job)

        try:
            start_time = time.perf_counter()
            clf = ALGORITHMS[algo]({})
            
            # Apply class weights if configured
            if use_class_weight:
                if algo == "xgboost" or algo == "xgboost_regressor":
                    if problem_type == "classification":
                        classes, counts = np.unique(y_train, return_counts=True)
                        if len(classes) == 2:
                            scale_pos_weight = counts[0] / counts[1]
                            clf.set_params(scale_pos_weight=scale_pos_weight)
                elif hasattr(clf, "class_weight"):
                    clf.set_params(class_weight="balanced")

            # Cross validation
            _append_log(job, f"Running {cv_folds}-fold cross validation for {algo}...")
            cv_results = _run_cross_validation(clf, X_train, y_train, problem_type, cv_folds)
            
            # Log CV results
            cv_log_str = ", ".join(f"{k}={v:.4f}" for k, v in cv_results.items())
            _append_log(job, f"{algo} CV results: {cv_log_str}")

            # Fit model
            _append_log(job, f"Fitting final {algo} on train split...")
            clf.fit(X_train, y_train)

            # Evaluate
            metrics = _evaluate_model(clf, X_test, y_test, problem_type)
            # Add cross validation score to metrics
            metrics["cv_mean_score"] = round(cv_results.get("f1_weighted" if problem_type == "classification" else "r2", 0.0), 4)

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            _append_log(job, f"{algo} baseline training complete in {elapsed_ms}ms. Metrics: {metrics}")

            model_entry["metrics"] = metrics
            model_entry["status"] = "completed"
            model_entry["training_duration_ms"] = elapsed_ms
            model_entry["hyperparameters"] = clf.get_params()

            # Save basic model artifact
            model_artifact_dir = settings.DATA_DIR / "models" / model_id
            model_artifact_dir.mkdir(parents=True, exist_ok=True)
            cloudpickle.dump(clf, open(model_artifact_dir / "model.pkl", "wb"))
            model_entry["file_path"] = str(model_artifact_dir / "model.pkl")
            storage.save_model(model_entry)

            completed_models_metrics[algo] = metrics
            completed_estimators[algo] = clf
            completed_durations[algo] = elapsed_ms

        except Exception as e:
            logger.exception(f"Failed baseline training for {algo}")
            model_entry["status"] = "failed"
            model_entry["error_message"] = str(e)
            storage.save_model(model_entry)
            _append_log(job, f"{algo} training failed: {e}")

    # Check if any model succeeded
    if not completed_models_metrics:
        job["status"] = "failed"
        job["error_message"] = "All models failed to train"
        _append_log(job, "Job completed with failures: no models trained successfully.")
        storage.save_job(job)
        return

    # Hyperparameter Tuning Step
    if tuning_enabled and len(completed_models_metrics) >= 1:
        job["progress"] = 70.0
        _append_log(job, "Ranking models to select top candidates for hyperparameter tuning...")
        storage.save_job(job)

        # Sort completed models by primary metric
        # Handle lower-is-better metrics (rmse, mae, mape)
        lower_better = primary_metric in ("rmse", "mae", "mape")
        sorted_algos = sorted(
            completed_models_metrics.keys(),
            key=lambda a: completed_models_metrics[a].get(primary_metric, 0.0),
            reverse=not lower_better
        )

        # Tune top 2 models (or up to 3 if available)
        top_to_tune = sorted_algos[:min(len(sorted_algos), 3)]
        _append_log(job, f"Selected top models for tuning: {', '.join(top_to_tune)}")
        
        for t_idx, algo in enumerate(top_to_tune):
            model_id = model_ids_map[algo]
            model_entry = storage.get_model(model_id)
            if not model_entry:
                continue

            param_grid = PARAM_GRIDS.get(algo, {})
            if not param_grid:
                _append_log(job, f"No parameter grid specified for {algo}. Skipping tuning.")
                continue

            tuning_progress = 70.0 + (t_idx / len(top_to_tune)) * 20.0
            job["progress"] = round(tuning_progress, 1)
            _append_log(job, f"Running RandomizedSearchCV hyperparameter tuning for {algo}...")
            storage.save_job(job)

            try:
                base_clf = completed_estimators[algo]
                scoring = "f1_weighted" if problem_type == "classification" else "r2"
                cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=random_seed) if problem_type == "classification" else KFold(n_splits=3, shuffle=True, random_state=random_seed)
                
                search = RandomizedSearchCV(
                    estimator=base_clf,
                    param_distributions=param_grid,
                    n_iter=5,
                    cv=cv,
                    scoring=scoring,
                    random_state=random_seed,
                    n_jobs=1
                )
                search.fit(X_train, y_train)
                
                tuned_clf = search.best_estimator_
                tuned_params = search.best_params_

                # Evaluate tuned model
                tuned_metrics = _evaluate_model(tuned_clf, X_test, y_test, problem_type)
                
                # Check if tuned model outperforms or equals the baseline
                baseline_val = completed_models_metrics[algo].get(primary_metric, 0.0)
                tuned_val = tuned_metrics.get(primary_metric, 0.0)
                
                improved = False
                if lower_better:
                    if tuned_val < baseline_val:
                        improved = True
                else:
                    if tuned_val > baseline_val:
                        improved = True

                if improved:
                    _append_log(job, f"Tuned {algo} improved {primary_metric} from {baseline_val:.4f} to {tuned_val:.4f}!")
                    completed_models_metrics[algo] = tuned_metrics
                    completed_estimators[algo] = tuned_clf
                    
                    # Update DB entry
                    model_entry["metrics"] = tuned_metrics
                    model_entry["hyperparameters"] = tuned_clf.get_params()
                    model_entry["name"] = f"{algo.replace('_', ' ').title()} (Tuned)"
                    
                    # Overwrite file
                    model_artifact_dir = settings.DATA_DIR / "models" / model_id
                    cloudpickle.dump(tuned_clf, open(model_artifact_dir / "model.pkl", "wb"))
                    storage.save_model(model_entry)
                else:
                    _append_log(job, f"Tuned {algo} ({tuned_val:.4f}) did not improve baseline ({baseline_val:.4f}). Keeping baseline.")

            except Exception as e:
                logger.exception(f"Tuning failed for {algo}")
                _append_log(job, f"Hyperparameter tuning failed for {algo}: {e}")

    # Build final Leaderboard and serialize win bundles
    _append_log(job, "Finalizing Leaderboard and bundling preprocessing pipelines...")
    
    # Reload model data to get latest metrics (including tuned ones)
    final_models = [storage.get_model(model_ids_map[algo]) for algo in selected_algos]
    completed_final_models = [m for m in final_models if m and m.get("status") == "completed"]
    
    if not completed_final_models:
        job["status"] = "failed"
        job["error_message"] = "No models completed successfully"
        _append_log(job, "Job failed: all models failed validation/training.")
        storage.save_job(job)
        return

    lower_better = primary_metric in ("rmse", "mae", "mape")
    sorted_completed = sorted(
        completed_final_models,
        key=lambda m: m["metrics"].get(primary_metric, 0.0),
        reverse=not lower_better
    )

    # Wrap every completed estimator with the Preprocessor pipeline if pipeline_id exists
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id)
        if pipeline and pipeline.get("artifact_path") and Path(pipeline["artifact_path"]).exists():
            try:
                with open(pipeline["artifact_path"], "rb") as pf:
                    preprocessor = cloudpickle.load(pf)
                
                for m_entry in completed_final_models:
                    m_id = m_entry["id"]
                    m_algo = m_entry["algorithm"]
                    fitted_estimator = completed_estimators[m_algo]
                    
                    # Create combined pipeline
                    inference_bundle = SklearnPipeline([
                        ("preprocessor", preprocessor),
                        ("model", fitted_estimator)
                    ])
                    
                    # Overwrite model.pkl with inference_bundle
                    m_file_path = Path(settings.DATA_DIR) / "models" / m_id / "model.pkl"
                    with open(m_file_path, "wb") as f:
                        cloudpickle.dump(inference_bundle, f)
                    
                    _append_log(job, f"Bundled preprocessor pipeline successfully with {m_algo}")
            except Exception as e:
                logger.exception("Failed to bundle preprocessor pipeline")
                _append_log(job, f"Warning: Failed to bundle preprocessor pipeline: {e}")

    # Identify best model
    best_model_entry = sorted_completed[0]
    best_model_id = best_model_entry["id"]
    
    for m in completed_final_models:
        m["is_best"] = (m["id"] == best_model_id)
        storage.save_model(m)

    job["model_id"] = best_model_id  # For backward compatibility
    job["status"] = "completed"
    job["progress"] = 100.0
    job["completed_at"] = datetime.now(UTC).isoformat()
    _append_log(job, f"Automated training job complete. Leaderboard winner: {best_model_entry['name']}!")
    storage.save_job(job)


@router.post("/", status_code=201)
async def train_model(body: TrainModelSchema, background_tasks: BackgroundTasks) -> dict:
    # Resolve target dataset or pipeline
    pipeline_id = body.pipeline_id
    dataset_id = body.dataset_id

    # Resolve algorithms to run
    # If no algorithms provided, default to all matching algorithms based on problem type
    # If pipeline_id provided, fetch problem_type from it. Else default classification.
    problem_type = "classification"
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id)
        if not pipeline:
            raise NotFoundError("Pipeline", pipeline_id)
        problem_type = pipeline.get("problem_type", "classification")
        dataset_id = pipeline["dataset_id"]
    elif dataset_id:
        dataset = storage.get_dataset(dataset_id)
        if not dataset:
            raise NotFoundError("Dataset", dataset_id)
    else:
        raise ValidationError("Either pipeline_id or dataset_id must be provided")

    dataset = storage.get_dataset(dataset_id)

    # Read train/test splits
    loop = asyncio.get_event_loop()
    X_train, y_train, X_test, y_test, pipeline_id, use_class_weight = await loop.run_in_executor(
        None, _prepare_data, body, dataset
    )

    if not pipeline_id:
        problem_type = detect_problem_type(pd.Series(y_train))

    # Resolve selected algorithms
    selected_algos = body.algorithms or []
    if not selected_algos and body.algorithm:
        selected_algos = [body.algorithm]

    if not selected_algos:
        # Fallback to all models for that problem type
        if problem_type == "classification":
            selected_algos = ["logistic_regression", "random_forest", "xgboost", "svm", "knn"]
        else:
            selected_algos = ["linear_regression", "ridge", "lasso", "random_forest_regressor", "xgboost_regressor"]

    # Validate algorithms list
    valid_algos = set(ALGORITHMS.keys())
    invalid = [a for a in selected_algos if a not in valid_algos]
    if invalid:
        raise ValidationError(f"Invalid algorithm(s): {', '.join(invalid)}")

    job_id = str(uuid.uuid4())
    model_ids_map = {}
    models_list = []

    for algo in selected_algos:
        m_id = str(uuid.uuid4())
        model_ids_map[algo] = m_id
        
        m_entry = {
            "id": m_id,
            "job_id": job_id,
            "pipeline_id": pipeline_id,
            "dataset_id": dataset_id,
            "name": f"{algo.replace('_', ' ').title()}",
            "algorithm": algo,
            "hyperparameters": {},
            "status": "queued",
            "created_at": datetime.now(UTC).isoformat(),
        }
        storage.save_model(m_entry)
        models_list.append(m_entry)

    job = {
        "id": job_id,
        "model_id": models_list[0]["id"] if models_list else None,  # Backward compatibility
        "model_ids": [m["id"] for m in models_list],
        "pipeline_id": pipeline_id,
        "status": "queued",
        "progress": 0.0,
        "log": "",
        "started_at": datetime.now(UTC).isoformat(),
    }
    storage.save_job(job)

    # Queue the background task
    background_tasks.add_task(
        _run_multi_training_background,
        job_id,
        pipeline_id,
        dataset_id,
        selected_algos,
        body.cv_folds,
        body.primary_metric,
        body.tuning_enabled,
        X_train,
        y_train,
        X_test,
        y_test,
        model_ids_map,
        use_class_weight,
        body.random_seed,
    )

    return {
        "model": models_list[0] if models_list else None,  # Backward compatibility
        "models": models_list,
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

    # Cancel all models associated with this job
    all_models = storage.list_models()
    for model in all_models:
        if model.get("job_id") == job_id or model.get("id") == job.get("model_id"):
            model["status"] = "cancelled"
            storage.save_model(model)

    return job


@router.post("/models/{model_id}/set-best")
async def set_best_model(model_id: str) -> dict:
    model = storage.get_model(model_id)
    if not model:
        raise NotFoundError("Model", model_id)

    # Unset all other models in the same job or pipeline
    all_models = storage.list_models()
    for m in all_models:
        if m.get("pipeline_id") == model.get("pipeline_id") or (
            m.get("job_id") and m.get("job_id") == model.get("job_id")
        ):
            m["is_best"] = m["id"] == model_id
            storage.save_model(m)

    return storage.get_model(model_id)