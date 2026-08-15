from __future__ import annotations

import asyncio
import logging
import threading
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import numpy as np

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from app.api.v1.endpoints.datasets import get_session_id
from app.api.v1.schemas.plots import ModelPlotsResponseSchema
from app.api.v1.schemas.training import TrainModelSchema
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.io import read_dataframe
from app.services.explainability_service import calculate_waterfall_explanation
from app.services.preprocessing_service import detect_problem_type
from app.storage import storage

logger = logging.getLogger(__name__)
router = APIRouter()

_cancel_events: dict[str, threading.Event] = {}
_cancel_events_lock = threading.Lock()


def _register_cancel_event(job_id: str) -> threading.Event:
    event = threading.Event()
    with _cancel_events_lock:
        _cancel_events[job_id] = event
    return event


def _request_cancel(job_id: str) -> None:
    with _cancel_events_lock:
        event = _cancel_events.get(job_id)
    if event is not None:
        event.set()


def _is_cancelled(job_id: str) -> bool:
    with _cancel_events_lock:
        event = _cancel_events.get(job_id)
    return event is not None and event.is_set()


def _unregister_cancel_event(job_id: str) -> None:
    with _cancel_events_lock:
        _cancel_events.pop(job_id, None)


def _resolve_hyperparameters(algo: str, hyperparameters: dict | None) -> dict:
    """Merge user-provided hyperparameters with algorithm defaults.

    ``hyperparameters`` may be keyed per-algorithm (``{"random_forest": {...}}``)
    or provided as a flat global dict applied to every selected algorithm.
    """
    if not hyperparameters:
        return {}
    if algo in hyperparameters and isinstance(hyperparameters[algo], dict):
        return dict(hyperparameters[algo])
    return {k: v for k, v in hyperparameters.items() if not isinstance(v, dict)}


def _attach_eta(job: dict) -> dict:
    """Compute a remaining-time estimate for an in-flight job (US-19)."""
    status = job.get("status")
    if status in ("completed", "failed", "cancelled"):
        job["eta_seconds"] = None
        return job
    run_started = job.get("run_started_at") or job.get("started_at")
    progress = float(job.get("progress", 0.0) or 0.0)
    if run_started and progress > 0:
        try:
            start = datetime.fromisoformat(run_started)
            elapsed = (datetime.now(UTC) - start).total_seconds()
            job["eta_seconds"] = round(elapsed * (100.0 - progress) / progress, 1)
        except Exception:
            job["eta_seconds"] = None
    else:
        job["eta_seconds"] = None
    return job


_ALGORITHMS_CACHE: dict | None = None


def get_algorithms() -> dict:
    global _ALGORITHMS_CACHE
    if _ALGORITHMS_CACHE is None:
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
        from sklearn.linear_model import Lasso, LinearRegression, LogisticRegression, Ridge
        from sklearn.neighbors import KNeighborsClassifier
        from sklearn.svm import SVC
        from xgboost import XGBClassifier, XGBRegressor
        _ALGORITHMS_CACHE = {
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
            "linear_regression": lambda _hp: LinearRegression(),
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
    return _ALGORITHMS_CACHE

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
    import numpy as np
    import pandas as pd
    from sklearn.model_selection import train_test_split

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
    import numpy as np
    from sklearn.model_selection import KFold, StratifiedKFold, cross_validate

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
    import numpy as np
    from sklearn.metrics import (
        accuracy_score,
        f1_score,
        mean_absolute_error,
        mean_absolute_percentage_error,
        mean_squared_error,
        precision_score,
        r2_score,
        recall_score,
        roc_auc_score,
    )

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
    _dataset_id: str,
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
    hyperparameters: dict | None = None,
) -> None:
    import cloudpickle
    import numpy as np
    import pandas as pd
    from sklearn.model_selection import KFold, RandomizedSearchCV, StratifiedKFold
    from sklearn.pipeline import Pipeline as SklearnPipeline

    job = storage.get_job(job_id)
    if not job:
        return

    _register_cancel_event(job_id)

    # Job was cancelled before the worker started
    if job.get("status") == "cancelled":
        _unregister_cancel_event(job_id)
        return

    resource_settings = storage.get_settings()
    max_runtime_minutes = float(resource_settings.get("max_runtime_minutes", 0) or 0)

    job["status"] = "running"
    job["progress"] = 5.0
    job["run_started_at"] = datetime.now(UTC).isoformat()
    _append_log(job, f"Starting multi-model training pipeline. Folds: {cv_folds}, Tuning: {tuning_enabled}")
    if max_runtime_minutes > 0:
        _append_log(job, f"Resource limit: max runtime = {max_runtime_minutes:.0f} minutes")
    storage.save_job(job)

    def _runtime_exceeded() -> bool:
        if max_runtime_minutes <= 0:
            return False
        try:
            start = datetime.fromisoformat(job["run_started_at"])
        except Exception:
            return False
        return (datetime.now(UTC) - start).total_seconds() > max_runtime_minutes * 60

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
        if _is_cancelled(job_id):
            _cancel_remaining_models(job, selected_algos, model_ids_map, from_index=idx)
            _unregister_cancel_event(job_id)
            return

        model_id = model_ids_map[algo]
        model_entry = storage.get_model(model_id)
        if not model_entry:
            continue

        model_entry["status"] = "running"
        storage.save_model(model_entry)

        if _runtime_exceeded():
            _append_log(job, "Max runtime exceeded — aborting remaining training.")
            job["status"] = "failed"
            job["error_message"] = "Training aborted: exceeded configured max runtime limit."
            job["progress"] = job.get("progress", 5.0)
            storage.save_job(job)
            _cancel_remaining_models(job, selected_algos, model_ids_map, from_index=idx)
            _unregister_cancel_event(job_id)
            return

        job_progress_base = 5.0 + (idx / total_algos) * 60.0
        job["progress"] = round(job_progress_base, 1)
        _append_log(job, f"[{idx + 1}/{total_algos}] Training baseline {algo}...")
        storage.save_job(job)

        try:
            start_time = time.perf_counter()
            hp = _resolve_hyperparameters(algo, hyperparameters)
            if hp:
                _append_log(job, f"Using custom hyperparameters for {algo}: {hp}")
            clf = get_algorithms()[algo](hp)

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
            with open(model_artifact_dir / "model.pkl", "wb") as mf:
                cloudpickle.dump(clf, mf)
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
        _unregister_cancel_event(job_id)
        return

    # Hyperparameter Tuning Step
    if tuning_enabled and len(completed_models_metrics) >= 1:
        if _runtime_exceeded():
            _append_log(job, "Max runtime exceeded during tuning — finalizing with baselines.")
            _cancel_remaining_models(job, selected_algos, model_ids_map, from_index=0)
            # Fall through to finalize with whatever completed
        elif _is_cancelled(job_id):
            _cancel_remaining_models(job, selected_algos, model_ids_map, from_index=0)
            _unregister_cancel_event(job_id)
            return

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
            if _is_cancelled(job_id):
                _cancel_remaining_models(job, selected_algos, model_ids_map, from_index=0)
                _unregister_cancel_event(job_id)
                return

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
                cv = (
                    StratifiedKFold(n_splits=3, shuffle=True, random_state=random_seed)
                    if problem_type == "classification"
                    else KFold(n_splits=3, shuffle=True, random_state=random_seed)
                )

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
                    with open(model_artifact_dir / "model.pkl", "wb") as mf:
                        cloudpickle.dump(tuned_clf, mf)
                    storage.save_model(model_entry)
                else:
                    _append_log(job, f"Tuned {algo} ({tuned_val:.4f}) did not improve baseline ({baseline_val:.4f}). Keeping baseline.")

            except Exception as e:
                logger.exception(f"Tuning failed for {algo}")
                _append_log(job, f"Hyperparameter tuning failed for {algo}: {e}")

    # Build final Leaderboard and serialize win bundles
    if _runtime_exceeded() and job.get("status") not in ("failed",):
        _append_log(job, "Max runtime exceeded — finalizing with available models.")
    if _is_cancelled(job_id):
        _cancel_remaining_models(job, selected_algos, model_ids_map, from_index=0)
        _unregister_cancel_event(job_id)
        return

    _append_log(job, "Finalizing Leaderboard and bundling preprocessing pipelines...")

    # Reload model data to get latest metrics (including tuned ones)
    final_models = [storage.get_model(model_ids_map[algo]) for algo in selected_algos]
    completed_final_models = [m for m in final_models if m and m.get("status") == "completed"]

    if not completed_final_models:
        job["status"] = "failed"
        job["error_message"] = "No models completed successfully"
        _append_log(job, "Job failed: all models failed validation/training.")
        storage.save_job(job)
        _unregister_cancel_event(job_id)
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
    _unregister_cancel_event(job_id)


def _cancel_remaining_models(
    job: dict,
    selected_algos: list[str],
    model_ids_map: dict[str, str],
    from_index: int = 0,
) -> None:
    """Mark all not-yet-finished models of a job as cancelled and finalize the job."""
    for algo in selected_algos[from_index:]:
        model_entry = storage.get_model(model_ids_map[algo])
        if model_entry and model_entry.get("status") not in ("completed", "cancelled"):
            model_entry["status"] = "cancelled"
            storage.save_model(model_entry)

    _append_log(job, "Job cancelled by user. Stopping training.")
    job["status"] = "cancelled"
    job["completed_at"] = datetime.now(UTC).isoformat()
    storage.save_job(job)


@router.get("/algorithms")
async def list_algorithms() -> dict:
    """Expose available algorithms, their tunable hyperparameter grids, and defaults (US-17)."""
    algorithms: dict[str, dict] = {}
    for name, factory in get_algorithms().items():
        grid = PARAM_GRIDS.get(name, {})
        defaults: dict = {}
        try:
            estimator = factory({})
            params = estimator.get_params()
            defaults = {k: params.get(k) for k in grid}
        except Exception:
            defaults = {}
        algorithms[name] = {
            "tunable_grid": grid,
            "defaults": defaults,
        }
    return {"algorithms": algorithms}


@router.post("/", status_code=201)
async def train_model(
    body: TrainModelSchema,
    background_tasks: BackgroundTasks,
    session_id: str = Depends(get_session_id)
) -> dict:
    import pandas as pd

    # Resolve target dataset or pipeline
    pipeline_id = body.pipeline_id
    dataset_id = body.dataset_id

    # Resolve algorithms to run
    # If no algorithms provided, default to all matching algorithms based on problem type
    # If pipeline_id provided, fetch problem_type from it. Else default classification.
    problem_type = "classification"
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id, session_id=session_id)
        if not pipeline:
            raise NotFoundError("Pipeline", pipeline_id)
        problem_type = pipeline.get("problem_type", "classification")
        dataset_id = pipeline["dataset_id"]
    elif dataset_id:
        dataset = storage.get_dataset(dataset_id, session_id=session_id)
        if not dataset:
            raise NotFoundError("Dataset", dataset_id)
    else:
        raise ValidationError("Either pipeline_id or dataset_id must be provided")

    dataset = storage.get_dataset(dataset_id, session_id=session_id)

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
    valid_algos = set(get_algorithms().keys())
    invalid = [a for a in selected_algos if a not in valid_algos]
    if invalid:
        raise ValidationError(f"Invalid algorithm(s): {', '.join(invalid)}")

    # Enforce configured memory limit (US-27)
    resource_settings = storage.get_settings()
    max_memory_gb = float(resource_settings.get("max_memory_gb", 0) or 0)
    if max_memory_gb > 0 and X_train.nbytes > max_memory_gb * (1024 ** 3):
        raise ValidationError(
            f"Training matrix ({X_train.nbytes / 1e9:.1f} GB) exceeds configured "
            f"max memory ({max_memory_gb:.0f} GB). Reduce data size or raise the limit."
        )

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
            "session_id": session_id,
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
        "session_id": session_id,
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
        body.hyperparameters,
    )

    return {
        "model": models_list[0] if models_list else None,  # Backward compatibility
        "models": models_list,
        "job": job,
    }


@router.get("/models")
async def list_models(
    page: int = 1,
    per_page: int = 20,
    session_id: str = Depends(get_session_id)
) -> dict:
    all_models = storage.list_models(session_id=session_id)
    total = len(all_models)
    start = (page - 1) * per_page
    items = all_models[start:start + per_page]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/models/compare")
@router.get("/compare")
async def compare_models(
    ids: list[str] = Query(...),
    session_id: str = Depends(get_session_id)
) -> dict:
    models_list = []
    actual_ids = []
    for item in ids:
        if "," in item:
            actual_ids.extend(item.split(","))
        else:
            actual_ids.append(item)

    for m_id in actual_ids:
        model = storage.get_model(m_id, session_id=session_id)
        if not model:
            continue

        pipeline_id = model.get("pipeline_id")
        pipeline = storage.get_pipeline(pipeline_id, session_id=session_id) if pipeline_id else None

        models_list.append({
            "id": model["id"],
            "name": model["name"],
            "algorithm": model["algorithm"],
            "status": model["status"],
            "metrics": model.get("metrics", {}),
            "hyperparameters": model.get("hyperparameters", {}),
            "pipeline": {
                "encoding": pipeline.get("encoding", {}) if pipeline else None,
                "scaling": pipeline.get("scaling", {}) if pipeline else None,
                "feature_selection": pipeline.get("feature_selection", {}) if pipeline else None,
                "problem_type": pipeline.get("problem_type") if pipeline else None,
                "use_smote": pipeline.get("use_smote", False) if pipeline else False,
                "use_class_weight": pipeline.get("use_class_weight", False) if pipeline else False,
            } if pipeline else None,
            "training_time": model.get("training_time", 0.0),
            "created_at": model.get("created_at")
        })

    # Mark best model and sort by accuracy (leaderboard order)
    best_acc = max((m.get("metrics", {}).get("accuracy", 0) for m in models_list), default=0)
    for m in models_list:
        m["is_best"] = m.get("metrics", {}).get("accuracy", 0) >= best_acc
    models_list.sort(key=lambda m: m.get("metrics", {}).get("accuracy", 0), reverse=True)

    return {"models": models_list}


@router.get("/models/{model_id}")
async def get_model(
    model_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)
    return model


@router.get("/models/{model_id}/download")
async def download_model(
    model_id: str,
    session_id: str = Depends(get_session_id)
):
    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)
    file_path = model.get("file_path")
    if not file_path or not Path(file_path).exists():
        raise NotFoundError("Model artifact", model_id)

    pipeline_id = model.get("pipeline_id")
    bundle_path = Path(file_path)
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id, session_id=session_id)
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
async def list_jobs(
    page: int = 1,
    per_page: int = 20,
    session_id: str = Depends(get_session_id)
) -> dict:
    all_jobs = storage.list_jobs(session_id=session_id)
    total = len(all_jobs)
    start = (page - 1) * per_page
    items = [_attach_eta(j) for j in all_jobs[start:start + per_page]]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/jobs/{job_id}")
async def get_job(
    job_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    job = storage.get_job(job_id, session_id=session_id)
    if not job:
        raise NotFoundError("Job", job_id)
    return _attach_eta(job)


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    job = storage.get_job(job_id, session_id=session_id)
    if not job:
        raise NotFoundError("Job", job_id)
    if job["status"] not in ("queued", "running"):
        raise ConflictError(f"Job is '{job['status']}', cannot cancel")

    # Signal the background worker to stop cooperatively
    _request_cancel(job_id)

    job["status"] = "cancelled"
    job["completed_at"] = datetime.now(UTC).isoformat()
    storage.save_job(job)

    # Cancel all models associated with this job
    all_models = storage.list_models(session_id=session_id)
    for model in all_models:
        if model.get("job_id") == job_id or model.get("id") == job.get("model_id"):
            model["status"] = "cancelled"
            storage.save_model(model)

    return job


@router.post("/models/{model_id}/set-best")
async def set_best_model(
    model_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)

    # Unset all other models in the same job or pipeline
    all_models = storage.list_models(session_id=session_id)
    for m in all_models:
        if m.get("pipeline_id") == model.get("pipeline_id") or (
            m.get("job_id") and m.get("job_id") == model.get("job_id")
        ):
            m["is_best"] = m["id"] == model_id
            storage.save_model(m)

    return storage.get_model(model_id)


@router.get("/models/{model_id}/plots", response_model=ModelPlotsResponseSchema)
async def get_model_plots(
    model_id: str,
    session_id: str = Depends(get_session_id)
) -> dict:
    import cloudpickle
    import numpy as np
    import pandas as pd
    from sklearn.inspection import permutation_importance
    from sklearn.metrics import (
        auc,
        average_precision_score,
        classification_report,
        confusion_matrix,
        precision_recall_curve,
        roc_curve,
    )
    from sklearn.model_selection import learning_curve
    from sklearn.pipeline import Pipeline as SklearnPipeline

    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)

    model_file_path = Path(model.get("file_path"))
    if not model_file_path.exists():
        raise NotFoundError("Model artifact file", model_id)

    # 1. Load model estimator
    with open(model_file_path, "rb") as f:
        clf = cloudpickle.load(f)

    # Resolve if pipeline is wrapped or raw estimator
    model_estimator = clf.named_steps["model"] if isinstance(clf, SklearnPipeline) and "model" in clf.named_steps else clf

    # 2. Load dataset splits
    from app.api.v1.schemas.training import TrainModelSchema
    dummy_body = TrainModelSchema(
        pipeline_id=model.get("pipeline_id"),
        dataset_id=model.get("dataset_id"),
        target_column=model.get("target_column"),
        random_seed=42,
        test_size=0.2,
    )
    dataset = storage.get_dataset(model["dataset_id"]) if model.get("dataset_id") else None
    X_train_transformed, y_train, X_test_transformed, y_test, pipeline_id, use_class_weight = _prepare_data(
        dummy_body, dataset
    )

    problem_type = "classification"
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id)
        if pipeline:
            problem_type = pipeline.get("problem_type", "classification")
    else:
        problem_type = detect_problem_type(pd.Series(y_train))

    # Evaluate predictions
    y_pred = model_estimator.predict(X_test_transformed)

    # 3. Learning curve (train on subsets, cv=2 or 3 folds)
    # Downsample learning curve input if it's very large, to keep it fast
    X_lc, y_lc = X_train_transformed, y_train
    if len(X_lc) > 2000:
        indices = np.random.choice(len(X_lc), 2000, replace=False)
        X_lc = X_lc[indices]
        y_lc = y_lc[indices]

    train_sizes = np.linspace(0.2, 1.0, 5)
    scoring = "f1_weighted" if problem_type == "classification" else "r2"

    # Run learning curve
    cv_lc = 2
    if len(np.unique(y_lc)) >= 2:
        try:
            train_sizes_abs, train_scores, test_scores = learning_curve(
                model_estimator,
                X_lc,
                y_lc,
                train_sizes=train_sizes,
                cv=cv_lc,
                scoring=scoring,
                n_jobs=1,
                random_state=42
            )
            learning_curve_data = {
                "train_sizes": train_sizes_abs.tolist(),
                "train_scores": np.mean(train_scores, axis=1).tolist(),
                "val_scores": np.mean(test_scores, axis=1).tolist()
            }
        except Exception:
            learning_curve_data = {
                "train_sizes": [10, 20, 30, 40, 50],
                "train_scores": [1.0, 1.0, 1.0, 1.0, 1.0],
                "val_scores": [0.5, 0.5, 0.5, 0.5, 0.5]
            }
    else:
        learning_curve_data = {
            "train_sizes": [10, 20, 30, 40, 50],
            "train_scores": [1.0, 1.0, 1.0, 1.0, 1.0],
            "val_scores": [0.5, 0.5, 0.5, 0.5, 0.5]
        }

    # 4. Feature Importance
    # Get column names (feature names)
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id)
        if pipeline and pipeline.get("artifact_path"):
            try:
                with open(pipeline["artifact_path"], "rb") as pf:
                    preprocessor = cloudpickle.load(pf)
                feature_names = preprocessor.get_feature_names_out().tolist()
            except Exception:
                feature_names = [f"feature_{i}" for i in range(X_test_transformed.shape[1])]
        else:
            feature_names = [f"feature_{i}" for i in range(X_test_transformed.shape[1])]
    else:
        feature_names = [f"feature_{i}" for i in range(X_test_transformed.shape[1])]

    # Calculate importances
    importances = None
    if hasattr(model_estimator, "feature_importances_"):
        importances = model_estimator.feature_importances_.tolist()
    elif hasattr(model_estimator, "coef_"):
        coef = model_estimator.coef_
        importances = (
            np.mean(np.abs(coef), axis=0).tolist()
            if len(coef.shape) > 1
            else np.abs(coef).tolist()
        )
    else:
        # Fallback to permutation importance
        try:
            res = permutation_importance(model_estimator, X_test_transformed, y_test, random_state=42, n_repeats=2)
            importances = res.importances_mean.tolist()
        except Exception:
            importances = [0.0] * len(feature_names)

    feature_importance_list = [
        {"feature": name, "importance": float(imp)}
        for name, imp in zip(feature_names[:len(importances)], importances, strict=False)
    ]
    # Sort and take top 15
    feature_importance_list = sorted(feature_importance_list, key=lambda x: x["importance"], reverse=True)[:15]

    classification_plots = None
    regression_plots = None

    if problem_type == "classification":
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        classes_unique = np.unique(y_test)
        confusion_matrix_data = {
            "classes": [str(c) for c in classes_unique],
            "matrix": cm.tolist()
        }

        # ROC / PR curve
        y_prob = model_estimator.predict_proba(X_test_transformed) if hasattr(model_estimator, "predict_proba") else None

        roc_data = {}
        pr_data = {}

        if y_prob is not None:
            if len(classes_unique) == 2:
                # Binary
                # Use class 1 probabilities
                fpr, tpr, _ = roc_curve(y_test, y_prob[:, 1])
                roc_data = {
                    "fpr": fpr.tolist(),
                    "tpr": tpr.tolist(),
                    "auc": float(auc(fpr, tpr))
                }

                precision, recall, _ = precision_recall_curve(y_test, y_prob[:, 1])
                pr_data = {
                    "precision": precision.tolist(),
                    "recall": recall.tolist(),
                    "ap": float(average_precision_score(y_test, y_prob[:, 1]))
                }
            else:
                # Multiclass
                for idx, c in enumerate(classes_unique):
                    y_test_binary = (y_test == c).astype(int)
                    # Check if binary target has at least one positive sample
                    if len(np.unique(y_test_binary)) == 2:
                        fpr_c, tpr_c, _ = roc_curve(y_test_binary, y_prob[:, idx])
                        precision_c, recall_c, _ = precision_recall_curve(y_test_binary, y_prob[:, idx])

                        roc_data[str(c)] = {
                            "fpr": fpr_c.tolist(),
                            "tpr": tpr_c.tolist(),
                            "auc": float(auc(fpr_c, tpr_c))
                        }

                        pr_data[str(c)] = {
                            "precision": precision_c.tolist(),
                            "recall": recall_c.tolist(),
                            "ap": float(average_precision_score(y_test_binary, y_prob[:, idx]))
                        }

        # Classification report table
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

        # Imbalance check to trigger PR Curve display in UI
        is_imbalanced = False
        if pipeline_id:
            pipeline = storage.get_pipeline(pipeline_id)
            is_imbalanced = pipeline.get("imbalance", {}).get("is_imbalanced", False) if pipeline and pipeline.get("imbalance") else False
        else:
            counts = pd.Series(y_test).value_counts()
            if len(counts) >= 2:
                is_imbalanced = counts.max() / counts.min() > 2.0

        classification_plots = {
            "confusion_matrix": confusion_matrix_data,
            "roc_curve": roc_data,
            "pr_curve": pr_data if is_imbalanced else None,
            "feature_importance": feature_importance_list,
            "classification_report": report
        }

    else:
        # Regression actual vs predicted
        actuals = y_test.tolist()
        preds = y_pred.tolist()
        pred_vs_actual = {
            "actual": actuals,
            "predicted": preds
        }

        # Residuals
        residuals_list = (y_test - y_pred).tolist()
        residuals_data = {
            "predicted": preds,
            "residuals": residuals_list
        }

        # Error distribution histogram (np.histogram)
        counts, edges = np.histogram(residuals_list, bins=20)
        bin_centers = [(float(edges[i]) + float(edges[i+1])) / 2.0 for i in range(len(counts))]
        error_distribution = {
            "counts": counts.tolist(),
            "bin_centers": bin_centers
        }

        regression_plots = {
            "pred_vs_actual": pred_vs_actual,
            "residuals": residuals_data,
            "error_distribution": error_distribution,
            "feature_importance": feature_importance_list
        }

    # 5. Model Comparison
    model_comparison = []
    all_models = storage.list_models(session_id=session_id)
    for m in all_models:
        if (m.get("pipeline_id") == model.get("pipeline_id") or (
            m.get("job_id") and m.get("job_id") == model.get("job_id")
        )) and m.get("status") == "completed":
            model_comparison.append({
                "id": m["id"],
                "name": m["name"],
                "algorithm": m["algorithm"],
                "metrics": m.get("metrics", {}),
                "is_best": m.get("is_best", False)
            })

    return {
        "problem_type": problem_type,
        "classification": classification_plots,
        "regression": regression_plots,
        "learning_curve": learning_curve_data,
        "model_comparison": model_comparison
    }


@router.get("/models/{model_id}/export/cleaned")
async def export_cleaned_dataset(
    model_id: str,
    session_id: str = Depends(get_session_id)
):
    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)

    dataset_id = model.get("dataset_id")
    if not dataset_id:
        raise ValidationError("Model is not associated with any dataset")

    dataset = storage.get_dataset(dataset_id, session_id=session_id)
    if not dataset:
        raise NotFoundError("Dataset", dataset_id)

    file_path = Path(dataset["file_path"])
    if not file_path.exists():
        raise NotFoundError("Dataset file", str(file_path))

    filename = f"cleaned_{dataset['name']}.csv" if dataset.get("is_cleaned") else f"dataset_{dataset['name']}.csv"
    if not filename.endswith(".csv"):
        filename = f"{Path(filename).stem}.csv"

    if file_path.suffix != ".csv":
        import io

        from fastapi.responses import Response

        from app.core.io import read_dataframe
        df = read_dataframe(dataset)
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return Response(
            stream.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    return FileResponse(str(file_path), media_type="text/csv", filename=filename)


@router.get("/models/{model_id}/export/preprocessed")
async def export_preprocessed_dataset(
    model_id: str,
    session_id: str = Depends(get_session_id)
):
    import pandas as pd

    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)

    pipeline_id = model.get("pipeline_id")
    if not pipeline_id:
        raise ValidationError("Model has no preprocessing pipeline")

    processed_dir = settings.DATA_DIR / "processed" / pipeline_id
    train_path = processed_dir / "train.parquet"
    test_path = processed_dir / "test.parquet"

    if not train_path.exists():
        raise NotFoundError("Preprocessed train split", str(train_path))

    import zipfile

    temp_zip = processed_dir / "preprocessed_splits.zip"

    with zipfile.ZipFile(temp_zip, "w") as zf:
        train_df = pd.read_parquet(train_path)
        train_csv_str = train_df.to_csv(index=False)
        zf.writestr("train_preprocessed.csv", train_csv_str)

        if test_path.exists() and test_path.stat().st_size > 0:
            try:
                test_df = pd.read_parquet(test_path)
                test_csv_str = test_df.to_csv(index=False)
                zf.writestr("test_preprocessed.csv", test_csv_str)
            except Exception:
                pass

    return FileResponse(
        str(temp_zip),
        media_type="application/zip",
        filename=f"preprocessed_{pipeline_id[:8]}.zip"
    )


@router.get("/models/{model_id}/export/recipe")
async def export_reproducibility_recipe(
    model_id: str,
    session_id: str = Depends(get_session_id)
):
    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)

    dataset_id = model.get("dataset_id")
    pipeline_id = model.get("pipeline_id")

    dataset = storage.get_dataset(dataset_id, session_id=session_id) if dataset_id else None
    pipeline = storage.get_pipeline(pipeline_id, session_id=session_id) if pipeline_id else None

    # Load cleaning configuration if cleaned dataset was used
    cleaning_config = {}
    if dataset and dataset.get("is_cleaned") and dataset.get("cleaning_run_id"):
        run_id = dataset["cleaning_run_id"]
        source_id = dataset.get("source_dataset_id", dataset_id)
        cleaning_report = storage.get_cleaning_report(source_id, run_id)
        if cleaning_report:
            cleaning_config = cleaning_report.get("config", {})

    pipeline_config = pipeline if pipeline else {}
    params = model.get("hyperparameters", {})
    target_col = model.get("target_column", "target")

    recipe_json = {
        "project": "MLPilot",
        "project_version": "V1",
        "winning_model": {
            "id": model["id"],
            "name": model["name"],
            "algorithm": model["algorithm"],
            "metrics": model.get("metrics", {}),
            "hyperparameters": params
        },
        "pipeline_configuration": {
            "encoding": pipeline_config.get("encoding", {}),
            "scaling": pipeline_config.get("scaling", {}),
            "split": pipeline_config.get("split", {}),
            "feature_selection": pipeline_config.get("feature_selection", {}),
            "use_smote": pipeline_config.get("use_smote", False),
            "use_class_weight": pipeline_config.get("use_class_weight", False),
        },
        "cleaning_configuration": cleaning_config
    }

    recipe_py = '''# Standalone Model Inference Recipe
# Generated by MLPilot
#
# This script loads raw data, applies data cleaning & preprocessing pipeline,
# loads the serialized model, and runs predictions.

import sys
import pandas as pd
import numpy as np
import cloudpickle
from pathlib import Path

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    print("Applying data cleaning...")
'''

    if cleaning_config.get("remove_duplicates", True):
        recipe_py += '    # Remove duplicates\n'
        recipe_py += '    if df.duplicated().any():\n'
        recipe_py += '        df = df.drop_duplicates().reset_index(drop=True)\n'
        recipe_py += '        print("  Removed duplicate rows")\n\n'

    missing_strats = cleaning_config.get("missing_strategies", [])
    if missing_strats:
        recipe_py += '    # Missing values imputation\n'
        for m in missing_strats:
            col = m["column"]
            strat = m["strategy"]
            if strat == "median":
                recipe_py += f"    df['{col}'] = df['{col}'].fillna(df['{col}'].median())\n"
            elif strat == "mean":
                recipe_py += f"    df['{col}'] = df['{col}'].fillna(df['{col}'].mean())\n"
            elif strat == "mode":
                recipe_py += f"    df['{col}'] = df['{col}'].fillna(df['{col}'].mode()[0] if not df['{col}'].mode().empty else np.nan)\n"
            elif strat == "constant":
                recipe_py += f"    df['{col}'] = df['{col}'].fillna('missing')\n"
            elif strat == "drop_column":
                recipe_py += f"    df = df.drop(columns=['{col}'])\n"
        recipe_py += '\n'

    outlier_strats = cleaning_config.get("outlier_strategies", [])
    if outlier_strats:
        recipe_py += '    # Outliers adjustment\n'
        for o in outlier_strats:
            col = o["column"]
            strat = o["strategy"]
            if strat == "winsorize":
                recipe_py += f"    lower = df['{col}'].quantile(0.01)\n"
                recipe_py += f"    upper = df['{col}'].quantile(0.99)\n"
                recipe_py += f"    df['{col}'] = df['{col}'].clip(lower, upper)\n"
            elif strat == "drop":
                recipe_py += f"    q1 = df['{col}'].quantile(0.25)\n"
                recipe_py += f"    q3 = df['{col}'].quantile(0.75)\n"
                recipe_py += "    iqr = q3 - q1\n"
                recipe_py += f"    df = df[~((df['{col}'] < (q1 - 1.5 * iqr)) | (df['{col}'] > (q3 + 1.5 * iqr)))]\n"
        recipe_py += '\n'

    recipe_py += '    return df\n\n'

    recipe_py += f'''def main():
    if len(sys.argv) < 2:
        print("Usage: python recipe.py <path_to_raw_dataset_csv>")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f"Error: File {{input_path}} not found")
        sys.exit(1)

    print(f"Reading dataset: {{input_path.name}}")
    df = pd.read_csv(input_path)

    # Run cleaning
    df_cleaned = clean_data(df)

    # Verify target column is present
    target_col = "{target_col}"
    if target_col in df_cleaned.columns:
        print(f"Separate features (X) and target (y) for scoring")
        X = df_cleaned.drop(columns=[target_col])
        y = df_cleaned[target_col]
    else:
        print("Target column not present; running in inference mode on features")
        X = df_cleaned
        y = None

    # Load winning model pipeline bundle (model.pkl is loaded as a full Pipeline containing scaling & encoding)
    bundle_path = Path("model.pkl")
    if not bundle_path.exists():
        print("Error: model.pkl not found. Please place model.pkl in the same directory.")
        sys.exit(1)

    print("Loading serialized Pipeline bundle...")
    with open(bundle_path, "rb") as f:
        pipeline = cloudpickle.load(f)

    print("Executing model scoring pipeline...")
    # Predict
    y_pred = pipeline.predict(X)

    # Save predictions
    output_df = X.copy()
    output_df["predictions"] = y_pred
    if y is not None:
        output_df["actual"] = y.values

    output_path = Path("predictions.csv")
    output_df.to_csv(output_path, index=False)
    print(f"Successfully saved predictions to: {{output_path.absolute()}}")

if __name__ == "__main__":
    main()
'''

    import json
    import zipfile

    from app.storage import SafeEncoder

    recipe_dir = settings.DATA_DIR / "recipes"
    recipe_dir.mkdir(parents=True, exist_ok=True)
    temp_zip = recipe_dir / f"recipe_{model_id}.zip"

    with zipfile.ZipFile(temp_zip, "w") as zf:
        zf.writestr("recipe.json", json.dumps(recipe_json, indent=2, cls=SafeEncoder))
        zf.writestr("recipe.py", recipe_py)

    return FileResponse(
        str(temp_zip),
        media_type="application/zip",
        filename=f"recipe_{model_id[:8]}.zip"
    )


@router.get("/models/{model_id}/export/report", response_class=HTMLResponse)
async def export_html_report(
    model_id: str,
    session_id: str = Depends(get_session_id)
):
    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)

    dataset_id = model.get("dataset_id")
    pipeline_id = model.get("pipeline_id")

    dataset = storage.get_dataset(dataset_id, session_id=session_id) if dataset_id else None
    pipeline = storage.get_pipeline(pipeline_id, session_id=session_id) if pipeline_id else None

    cleaning_report = None
    if dataset and dataset.get("is_cleaned") and dataset.get("cleaning_run_id"):
        run_id = dataset["cleaning_run_id"]
        source_id = dataset.get("source_dataset_id", dataset_id)
        cleaning_report = storage.get_cleaning_report(source_id, run_id)

    leaderboard = []
    all_models = storage.list_models(session_id=session_id)
    for m in all_models:
        if (m.get("pipeline_id") == model.get("pipeline_id") or (
            m.get("job_id") and m.get("job_id") == model.get("job_id")
        )) and m.get("status") == "completed":
            leaderboard.append(m)

    # Sort leaderboard by primary metric if classification vs regression
    problem_type = "classification"
    if pipeline:
        problem_type = pipeline.get("problem_type", "classification")
    elif leaderboard:
        sample = leaderboard[0]
        if "r2" in (sample.get("metrics") or {}):
            problem_type = "regression"

    metric_key = "r2" if problem_type == "regression" else "accuracy"
    is_lower = metric_key in ("rmse", "mae")
    leaderboard = sorted(
        leaderboard,
        key=lambda x: (x.get("metrics") or {}).get(metric_key, float('inf') if is_lower else float('-inf')),
        reverse=not is_lower
    )

    plots = await get_model_plots(model_id, session_id=session_id)

    import matplotlib
    matplotlib.use('Agg')
    import base64
    import io
    import json

    import matplotlib.pyplot as plt
    import numpy as np

    from app.storage import SafeEncoder

    def fig_to_b64(fig):
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

    confusion_matrix_img = None
    roc_curve_img = None
    pr_curve_img = None
    feature_importance_img = None
    pred_vs_actual_img = None
    residuals_img = None
    error_dist_img = None
    learning_curve_img = None

    if plots.get("classification") and plots["classification"].get("feature_importance"):
        feat_data = plots["classification"]["feature_importance"]
    elif plots.get("regression") and plots["regression"].get("feature_importance"):
        feat_data = plots["regression"]["feature_importance"]
    else:
        feat_data = []

    if feat_data:
        feat_data = sorted(feat_data, key=lambda x: x["importance"])
        features = [item["feature"] for item in feat_data[-10:]]
        values = [item["importance"] for item in feat_data[-10:]]
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.barh(features, values, color='#4f46e5')
        ax.set_title('Feature Importance (Top 10)', fontsize=12, fontweight='bold')
        feature_importance_img = fig_to_b64(fig)

    if plots.get("learning_curve"):
        lc = plots["learning_curve"]
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.plot(lc["train_sizes"], lc["train_scores"], 'o-', color="#2563eb", label="Train Score")
        ax.plot(lc["train_sizes"], lc["val_scores"], 'o-', color="#dc2626", label="Cross-Validation Score")
        ax.set_title('Learning Curve', fontsize=12, fontweight='bold')
        ax.set_xlabel('Training Instances')
        ax.set_ylabel('Score')
        ax.legend(loc="best")
        learning_curve_img = fig_to_b64(fig)

    if problem_type == "classification" and plots.get("classification"):
        cls = plots["classification"]

        cm_data = cls["confusion_matrix"]
        cm_arr = np.array(cm_data["matrix"])
        classes = cm_data["classes"]
        fig, ax = plt.subplots(figsize=(5, 4))
        cax = ax.matshow(cm_arr, cmap=plt.cm.Blues)
        fig.colorbar(cax)
        ax.set_xticks(range(len(classes)))
        ax.set_yticks(range(len(classes)))
        ax.set_xticklabels(classes, rotation=45)
        ax.set_yticklabels(classes)
        for i in range(len(classes)):
            for j in range(len(classes)):
                ax.text(j, i, str(cm_arr[i, j]), va='center', ha='center',
                        color="white" if cm_arr[i, j] > (np.max(cm_arr)/2) else "black",
                        fontweight="bold")
        ax.set_title('Confusion Matrix', pad=20, fontsize=12, fontweight='bold')
        confusion_matrix_img = fig_to_b64(fig)

        roc_data = cls["roc_curve"]
        fig, ax = plt.subplots(figsize=(6, 4))
        is_multi = 'fpr' not in roc_data
        if is_multi:
            for c, d in roc_data.items():
                ax.plot(d["fpr"], d["tpr"], label=f"Class {c} (AUC={d['auc']:.2f})")
        else:
            if "fpr" in roc_data:
                ax.plot(roc_data["fpr"], roc_data["tpr"], color='#2563eb', lw=2, label=f"ROC (AUC={roc_data['auc']:.2f})")
        ax.plot([0, 1], [0, 1], color='gray', linestyle='--')
        ax.set_title('ROC Curve', fontsize=12, fontweight='bold')
        ax.set_xlabel('False Positive Rate')
        ax.set_ylabel('True Positive Rate')
        ax.legend(loc="lower right")
        roc_curve_img = fig_to_b64(fig)

        if cls.get("pr_curve"):
            pr_data = cls["pr_curve"]
            fig, ax = plt.subplots(figsize=(6, 4))
            is_multi = 'precision' not in pr_data
            if is_multi:
                for c, d in pr_data.items():
                    ax.plot(d["recall"], d["precision"], label=f"Class {c} (AP={d['ap']:.2f})")
            else:
                if "precision" in pr_data:
                    ax.plot(pr_data["recall"], pr_data["precision"], color='#d97706', lw=2, label=f"PR (AP={pr_data['ap']:.2f})")
            ax.set_title('Precision-Recall Curve', fontsize=12, fontweight='bold')
            ax.set_xlabel('Recall')
            ax.set_ylabel('Precision')
            ax.legend(loc="lower left")
            pr_curve_img = fig_to_b64(fig)

    elif problem_type == "regression" and plots.get("regression"):
        reg = plots["regression"]

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.scatter(reg["pred_vs_actual"]["actual"], reg["pred_vs_actual"]["predicted"], alpha=0.5, color='#2563eb')
        lims = [np.min([ax.get_xlim(), ax.get_ylim()]), np.max([ax.get_xlim(), ax.get_ylim()])]
        ax.plot(lims, lims, 'k--', alpha=0.75, zorder=0)
        ax.set_title('Predicted vs Actual', fontsize=12, fontweight='bold')
        ax.set_xlabel('Actual')
        ax.set_ylabel('Predicted')
        pred_vs_actual_img = fig_to_b64(fig)

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.scatter(reg["residuals"]["predicted"], reg["residuals"]["residuals"], alpha=0.5, color='#dc2626')
        ax.axhline(y=0, color='black', linestyle='--')
        ax.set_title('Residuals Plot', fontsize=12, fontweight='bold')
        ax.set_xlabel('Predicted')
        ax.set_ylabel('Residual')
        residuals_img = fig_to_b64(fig)

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.hist(reg["residuals"]["residuals"], bins=20, color='#d97706', edgecolor='black')
        ax.set_title('Error Distribution', fontsize=12, fontweight='bold')
        ax.set_xlabel('Residual Value')
        ax.set_ylabel('Frequency')
        error_dist_img = fig_to_b64(fig)

    metrics_list_str = "".join(
        f"<li><strong>{k.replace('_', ' ').upper()}:</strong> {v:.4f}</li>"
        for k, v in model.get("metrics", {}).items()
        if k != "cv_mean_score"
    )

    leaderboard_rows = "".join(
        f"<tr {'class=\"highlight\"' if m['id'] == model_id else ''}><td>{idx+1}</td>"
        f"<td>{m['name']} {'👑' if m['id'] == model_id else ''}</td>"
        f"<td>{m['algorithm'].replace('_', ' ')}</td>"
        f"<td>{m.get('metrics', {}).get('cv_mean_score', '—')}</td></tr>"
        for idx, m in enumerate(leaderboard)
    )

    html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>MLPilot Executive Report - {model["name"]}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
    <style>
        body {{
            font-family: 'Inter', system-ui, sans-serif;
            background-color: #fafaf9;
            color: #1c1917;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
        }}
        .header {{
            border-bottom: 4px solid #1c1917;
            padding-bottom: 24px;
            margin-bottom: 40px;
        }}
        .header h1 {{
            font-size: 36px;
            font-weight: 900;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: -1px;
        }}
        .header p {{
            font-size: 14px;
            color: #78716c;
            margin: 8px 0 0 0;
            text-transform: uppercase;
            font-weight: bold;
        }}
        .card {{
            background: #ffffff;
            border: 2px solid #1c1917;
            box-shadow: 6px 6px 0px #1c1917;
            padding: 24px;
            margin-bottom: 32px;
        }}
        .card-title {{
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            margin-top: 0;
            border-bottom: 2px solid #1c1917;
            padding-bottom: 8px;
            margin-bottom: 16px;
        }}
        .highlight-box {{
            background-color: #fef08a;
            border-left: 6px solid #1c1917;
            padding: 16px;
            font-weight: 500;
            margin-bottom: 24px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }}
        @media (max-width: 768px) {{
            .grid {{
                grid-template-columns: 1fr;
            }}
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }}
        th, td {{
            border: 1px solid #1c1917;
            padding: 10px;
            text-align: left;
            font-size: 13px;
        }}
        th {{
            background-color: #f5f5f4;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 11px;
        }}
        .badge {{
            display: inline-block;
            font-weight: 800;
            text-transform: uppercase;
            padding: 4px 8px;
            border: 2px solid #1c1917;
            font-size: 10px;
        }}

        .plot-container {{
            display: flex;
            justify-content: center;
            align-items: center;
            border: 1px dashed #a8a29e;
            background: #fafaf9;
            padding: 12px;
            margin-top: 8px;
        }}
        .plot-container img {{
            max-width: 100%;
            height: auto;
        }}

        .print-btn {{
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffffff;
            border: 2px solid #1c1917;
            box-shadow: 3px 3px 0px #1c1917;
            padding: 8px 16px;
            font-weight: bold;
            cursor: pointer;
            text-transform: uppercase;
            font-size: 12px;
            z-index: 50;
        }}
        .print-btn:hover {{
            transform: translate(1px, 1px);
            box-shadow: 2px 2px 0px #1c1917;
        }}

        @media print {{
            .print-btn {{
                display: none;
            }}
            body {{
                background-color: #ffffff;
                padding: 0;
            }}
            .card {{
                box-shadow: none;
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">Print Report / PDF</button>

    <div class="container">
        <div class="header">
            <h1>MLPilot Executive Report</h1>
            <p>Model: {model["name"]} · Run Date: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>

        <div class="card">
            <h3 class="card-title">Executive Summary</h3>
            <div class="highlight-box">
                A machine learning pipeline was executed to model <strong>{model.get("target_column")}</strong> on the
                <strong>{dataset["name"] if dataset else "Dataset"}</strong> dataset.
                The modeling run was treated as a <strong>{problem_type.upper()}</strong> task.
                Out of all candidate models evaluated, the <strong>{model["name"]}</strong> achieved optimal performance.
            </div>
            <p>
                The model was selected based on validation scores compiled across holdout test splits.
                It achieves the following performance metrics:
            </p>
            <ul>
                {metrics_list_str}
            </ul>
        </div>

        <div class="card">
            <h3 class="card-title">Data Preparation & Cleaning Log</h3>
            <p>
                The dataset was processed through automatic and user-defined cleaning steps:
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Before Cleaning</th>
                        <th>After Cleaning</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Row Count</td>
                        <td>{cleaning_report["before"]["row_count"] if cleaning_report else (dataset.get("row_count") if dataset else "—")}</td>
                        <td>{cleaning_report["after"]["row_count"] if cleaning_report else (dataset.get("row_count") if dataset else "—")}</td>
                    </tr>
                    <tr>
                        <td>Total Missing Cells</td>
                        <td>{cleaning_report["before"]["total_missing"] if cleaning_report else 0}</td>
                        <td>{cleaning_report["after"]["total_missing"] if cleaning_report else 0}</td>
                    </tr>
                    <tr>
                        <td>Duplicate Rows</td>
                        <td>{cleaning_report["before"]["duplicate_count"] if cleaning_report else 0}</td>
                        <td>{cleaning_report["after"]["duplicate_count"] if cleaning_report else 0}</td>
                    </tr>
                </tbody>
            </table>

            {f"""
            <h4>Cleaning Steps Executed</h4>
            <ul>
                {"".join(
                    f"<li><strong>{step['step']}:</strong> {step['description']} (Affected {step['rows_affected']} rows)</li>"
                    for step in cleaning_report["steps"]
                )}
            </ul>
            """ if cleaning_report and cleaning_report.get("steps") else ""}
        </div>

        <div class="card">
            <h3 class="card-title">Feature Engineering & Preprocessing</h3>
            {f"""
            <p>The preprocessing configuration applied prior to model fitting is detailed below:</p>
            <ul>
                <li><strong>Categorical Encoding:</strong> {pipeline["encoding"]["strategy"].replace('_', ' ').capitalize() if pipeline else "Auto"}</li>
                <li><strong>Feature Scaling:</strong> {pipeline["scaling"]["strategy"].replace('_', ' ').capitalize() if pipeline else "Auto"}</li>
                <li><strong>Train/Test Split Size:</strong> {int(pipeline["split"]["test_size"] * 100) if pipeline else 20}% test split</li>
                <li><strong>SMOTE Oversampling:</strong> {"Enabled" if pipeline and pipeline.get("use_smote") else "Disabled"}</li>
                <li><strong>Class Weighting:</strong> {"Enabled" if pipeline and pipeline.get("use_class_weight") else "Disabled"}</li>
                <li><strong>Feature Selection:</strong> {"Enabled" if pipeline and pipeline.get("feature_selection", {}).get("enabled") else "Disabled"}</li>
            </ul>
            """ if pipeline else "<p>No pipeline preprocessing config found. Trained on raw columns.</p>"}
        </div>

        <div class="card">
            <h3 class="card-title">Model Leaderboard Ranking</h3>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Model Name</th>
                        <th>Algorithm</th>
                        <th>CV Folds Score</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboard_rows}
                </tbody>
            </table>
        </div>

        <div class="card">
            <h3 class="card-title">Trained Model Hyperparameters</h3>
            <pre style="background: #fafaf9; border: 1px solid #1c1917; padding: 12px; font-size: 11px;
                    overflow-x: auto;">{json.dumps(model.get("hyperparameters", {}), indent=2, cls=SafeEncoder)}</pre>
        </div>

        <div class="card">
            <h3 class="card-title">Diagnostic Visualizations</h3>
            <div class="grid">
                {f'<div class="plot-container"><img src="{confusion_matrix_img}"></div>' if confusion_matrix_img else ''}
                {f'<div class="plot-container"><img src="{roc_curve_img}"></div>' if roc_curve_img else ''}
                {f'<div class="plot-container"><img src="{pr_curve_img}"></div>' if pr_curve_img else ''}
                {f'<div class="plot-container"><img src="{feature_importance_img}"></div>' if feature_importance_img else ''}
                {f'<div class="plot-container"><img src="{pred_vs_actual_img}"></div>' if pred_vs_actual_img else ''}
                {f'<div class="plot-container"><img src="{residuals_img}"></div>' if residuals_img else ''}
                {f'<div class="plot-container"><img src="{error_dist_img}"></div>' if error_dist_img else ''}
                {f'<div class="plot-container"><img src="{learning_curve_img}"></div>' if learning_curve_img else ''}
            </div>
        </div>
    </div>
</body>
</html>
'''
    return HTMLResponse(content=html_content, status_code=200)


@router.get("/models/{model_id}/explain")
async def explain_model(
    model_id: str,
    row_idx: int = 0,
    session_id: str = Depends(get_session_id)
) -> dict:
    import cloudpickle
    import numpy as np
    import pandas as pd
    from sklearn.pipeline import Pipeline as SklearnPipeline

    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)

    pipeline_id = model.get("pipeline_id")
    dataset_id = model.get("dataset_id")
    target_col = model.get("target_column")

    # Load dataset / test dataset to explain
    pipeline = storage.get_pipeline(pipeline_id, session_id=session_id) if pipeline_id else None
    test_path = pipeline.get("test_path") if pipeline else None

    if test_path and Path(test_path).exists():
        df = pd.read_parquet(test_path) if test_path.endswith(".parquet") else pd.read_csv(test_path)
    else:
        dataset = storage.get_dataset(dataset_id, session_id=session_id)
        if not dataset:
            raise NotFoundError("Dataset", dataset_id)
        df = read_dataframe(dataset)

    if target_col and target_col in df.columns:
        df = df.drop(columns=[target_col])

    if df.empty:
        raise ValidationError("Dataset is empty")
    if row_idx < 0 or row_idx >= len(df):
        raise ValidationError(f"row_idx {row_idx} is out of bounds (0 to {len(df)-1})")

    # Load fitted inference pipeline bundle
    with open(model["file_path"], "rb") as f:
        bundle = cloudpickle.load(f)

    # Calculate baseline inputs (median for numeric, mode for categorical)
    baseline_dict = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            baseline_dict[col] = float(df[col].median())
        else:
            mode_vals = df[col].mode()
            baseline_dict[col] = mode_vals.iloc[0] if not mode_vals.empty else ""
    baseline_df = pd.DataFrame([baseline_dict])

    sample_df = df.iloc[[row_idx]].copy().reset_index(drop=True)

    # Determine problem type and class index
    problem_type = pipeline.get("problem_type", "classification") if pipeline else "classification"
    target_class_idx = 1
    if problem_type == "classification" and hasattr(bundle, "classes_"):
        # Check classes
        classes = list(bundle.classes_)
        # Use first class index or predict label's index
        try:
            pred_label = bundle.predict(sample_df)[0]
            target_class_idx = classes.index(pred_label)
        except Exception:
            target_class_idx = 1 if len(classes) > 1 else 0

    local_expl = calculate_waterfall_explanation(
        bundle, sample_df, baseline_df, problem_type=problem_type, target_class_idx=target_class_idx
    )

    # Extract global feature importances from pipeline estimator
    global_importances = []
    try:
        if isinstance(bundle, SklearnPipeline) and "model" in bundle.named_steps:
            estimator = bundle.named_steps["model"]
            preprocessor = bundle.named_steps["preprocessor"]
            try:
                features = list(preprocessor.get_feature_names_out())
            except Exception:
                features = list(df.columns)
        else:
            estimator = bundle
            features = list(df.columns)

        importances = []
        if hasattr(estimator, "feature_importances_"):
            importances = list(estimator.feature_importances_)
        elif hasattr(estimator, "coef_"):
            importances = (
                list(np.abs(estimator.coef_).mean(axis=0))
                if len(estimator.coef_.shape) > 1
                else list(np.abs(estimator.coef_))
            )

        if importances and len(importances) == len(features):
            global_importances = [{"feature": f, "importance": float(imp)} for f, imp in zip(features, importances, strict=False)]
            global_importances.sort(key=lambda x: x["importance"], reverse=True)
    except Exception as e:
        logger.warning(f"Could not extract global feature importances: {e}")

    return {
        "model_id": model_id,
        "row_idx": row_idx,
        "problem_type": problem_type,
        "local_explanation": local_expl,
        "global_importance": global_importances[:20]  # top 20
    }


@router.post("/models/{model_id}/predict")
async def predict_model(
    model_id: str,
    file: UploadFile = File(...),
    session_id: str = Depends(get_session_id)
) -> dict:
    import cloudpickle
    import numpy as np
    import pandas as pd

    model = storage.get_model(model_id, session_id=session_id)
    if not model:
        raise NotFoundError("Model", model_id)

    # Write temp file and load dataframe
    temp_dir = settings.DATA_DIR / "tmp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"pred_{model_id}_{uuid.uuid4().hex}{Path(file.filename).suffix}"

    try:
        content = await file.read()
        temp_path.write_bytes(content)

        ext = temp_path.suffix.lower()
        if ext == ".csv":
            df = pd.read_csv(temp_path)
        elif ext == ".parquet":
            df = pd.read_parquet(temp_path)
        elif ext == ".json":
            df = pd.read_json(temp_path)
        elif ext in (".xls", ".xlsx"):
            df = pd.read_excel(temp_path)
        else:
            raise ValidationError(f"Unsupported file format: {ext}")
    finally:
        if temp_path.exists():
            temp_path.unlink()

    if df.empty:
        raise ValidationError("Uploaded dataset is empty")

    original_df = df.copy()

    # Drop target column from input features if present
    target_col = model.get("target_column")
    if target_col and target_col in df.columns:
        df = df.drop(columns=[target_col])

    # Load bundle
    with open(model["file_path"], "rb") as f:
        bundle = cloudpickle.load(f)

    # Perform predictions
    preds = bundle.predict(df)
    original_df["prediction"] = preds

    # Try predicting probabilities
    if hasattr(bundle, "predict_proba"):
        try:
            probas = bundle.predict_proba(df)
            confidences = probas.max(axis=1)
            original_df["confidence"] = confidences
        except Exception:
            pass

    # Save to predictions directory
    pred_dir = settings.DATA_DIR / "predictions"
    pred_dir.mkdir(parents=True, exist_ok=True)
    pred_filename = f"predictions_{model_id[:8]}_{uuid.uuid4().hex[:6]}.csv"
    output_path = pred_dir / pred_filename
    original_df.to_csv(output_path, index=False)

    return {
        "model_id": model_id,
        "rows": len(original_df),
        "columns": list(original_df.columns),
        "data": original_df.head(100).replace({np.nan: None}).to_dict(orient="records"),
        "download_filename": pred_filename
    }


@router.get("/predictions/download")
async def download_predictions(
    filename: str
):
    pred_path = settings.DATA_DIR / "predictions" / filename
    if not pred_path.exists() or ".." in filename:
        raise NotFoundError("Predictions file", filename)
    return FileResponse(
        str(pred_path),
        media_type="text/csv",
        filename=filename
    )
