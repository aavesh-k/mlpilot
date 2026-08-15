import contextlib
import json
import math
import os
import shutil
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import create_all, session_scope
from app.models import (
    DatasetColumnsRecord,
    DatasetRecord,
    JobRecord,
    ModelRecord,
    PipelineRecord,
    SettingRecord,
)


class SafeEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        import numpy as np
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


class SQLStorage:
    """SQLAlchemy-backed storage with the same public API as the legacy JSON store."""

    def __init__(self, data_dir: str = "data") -> None:
        self._base = Path(data_dir)
        self._base.mkdir(parents=True, exist_ok=True)
        create_all()

    # --- Generic helpers ---

    def _upsert(self, record_cls, record_id: str, body: dict, session: Session, extra: dict | None = None) -> dict:
        model = session.get(record_cls, record_id)
        created_at = body.get("created_at")
        session_id = body.get("session_id")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                created_at = None
        payload = {**body, **(extra or {})}
        if model is None:
            model = record_cls(id=record_id, session_id=session_id, data=payload, created_at=created_at)
            session.add(model)
        else:
            model.data = payload
            if session_id:
                model.session_id = session_id
            if created_at is not None:
                model.created_at = created_at
        session.flush()
        return dict(model.data)

    def _get(self, record_cls, record_id: str) -> dict | None:
        with session_scope() as session:
            model = session.get(record_cls, record_id)
            return dict(model.data) if model else None

    def _list(self, record_cls, session_id: str | None, _batch: int | None = None) -> list[dict]:
        with session_scope() as session:
            stmt = select(record_cls).order_by(record_cls.created_at.desc(), record_cls.id.desc())
            # The implicit local user (no session header -> "default_user") owns all
            # locally stored data, so no filtering is applied and every record is
            # returned. Explicit custom sessions keep isolation (they only see
            # their own data plus shared/default_user/null records).
            if session_id and session_id != "default_user":
                stmt = stmt.where(
                    (record_cls.session_id == session_id)
                    | (record_cls.session_id == "default_user")
                    | (record_cls.session_id.is_(None))
                )
            rows = session.scalars(stmt).all()
            return [dict(r.data) for r in rows]

    def _delete(self, record_cls, record_id: str) -> bool:
        with session_scope() as session:
            model = session.get(record_cls, record_id)
            if model is None:
                return False
            session.delete(model)
            return True

    # --- Datasets ---
    def list_datasets(self, session_id: str = None) -> list[dict]:
        return self._list(DatasetRecord, session_id)

    def get_dataset(self, dataset_id: str, session_id: str = None) -> dict | None:
        dataset = self._get(DatasetRecord, dataset_id)
        if dataset is None:
            return None
        ds_session = dataset.get("session_id")
        if session_id and session_id != "default_user" and ds_session not in (session_id, "default_user", None):
            return None
        return dataset

    def save_dataset(self, dataset: dict) -> dict:
        with session_scope() as session:
            return self._upsert(DatasetRecord, dataset["id"], dataset, session)

    def delete_dataset(self, dataset_id: str) -> bool:
        deleted = self._delete(DatasetRecord, dataset_id)
        if deleted:
            with session_scope() as session:
                columns = session.get(DatasetColumnsRecord, dataset_id)
                if columns is not None:
                    session.delete(columns)
        return deleted

    # --- Columns ---
    def get_columns(self, dataset_id: str) -> list[dict]:
        with session_scope() as session:
            model = session.get(DatasetColumnsRecord, dataset_id)
            return list(model.data) if model else []

    def save_columns(self, dataset_id: str, columns: list[dict]) -> None:
        with session_scope() as session:
            model = session.get(DatasetColumnsRecord, dataset_id)
            if model is None:
                session.add(DatasetColumnsRecord(dataset_id=dataset_id, data=columns))
            else:
                model.data = columns

    # --- Pipelines ---
    def list_pipelines(self, session_id: str = None) -> list[dict]:
        return self._list(PipelineRecord, session_id)

    def get_pipeline(self, pipeline_id: str, session_id: str = None) -> dict | None:
        pipeline = self._get(PipelineRecord, pipeline_id)
        if pipeline is None:
            return None
        pl_session = pipeline.get("session_id")
        if session_id and session_id != "default_user" and pl_session not in (session_id, "default_user", None):
            return None
        return pipeline

    def save_pipeline(self, pipeline: dict) -> dict:
        with session_scope() as session:
            return self._upsert(PipelineRecord, pipeline["id"], pipeline, session)

    def delete_pipeline(self, pipeline_id: str) -> bool:
        return self._delete(PipelineRecord, pipeline_id)

    # --- Models ---
    def list_models(self, session_id: str = None) -> list[dict]:
        return self._list(ModelRecord, session_id)

    def get_model(self, model_id: str, session_id: str = None) -> dict | None:
        model = self._get(ModelRecord, model_id)
        if model is None:
            return None
        m_session = model.get("session_id")
        if session_id and session_id != "default_user" and m_session not in (session_id, "default_user", None):
            return None
        return model

    def save_model(self, model: dict) -> dict:
        with session_scope() as session:
            return self._upsert(ModelRecord, model["id"], model, session)

    def delete_model(self, model_id: str) -> bool:
        return self._delete(ModelRecord, model_id)

    # --- Cascade deletes (keep derived data in sync) ---
    def _remove_model_artifacts(self, model_id: str) -> None:
        model_dir = self._base / "models" / model_id
        if model_dir.exists():
            shutil.rmtree(model_dir, ignore_errors=True)

    def _remove_pipeline_artifacts(self, pipeline_id: str) -> None:
        processed_dir = self._base / "processed" / pipeline_id
        if processed_dir.exists():
            shutil.rmtree(processed_dir, ignore_errors=True)

    def delete_models_by_dataset(self, dataset_id: str, session_id: str | None = None) -> int:
        models = [m for m in self.list_models(session_id) if m.get("dataset_id") == dataset_id]
        for m in models:
            self._delete(ModelRecord, m["id"])
            self._remove_model_artifacts(m["id"])
        return len(models)

    def delete_models_by_pipeline(self, pipeline_id: str, session_id: str | None = None) -> int:
        models = [m for m in self.list_models(session_id) if m.get("pipeline_id") == pipeline_id]
        for m in models:
            self._delete(ModelRecord, m["id"])
            self._remove_model_artifacts(m["id"])
        return len(models)

    def delete_pipelines_by_dataset(self, dataset_id: str, session_id: str | None = None) -> int:
        pipelines = [p for p in self.list_pipelines(session_id) if p.get("dataset_id") == dataset_id]
        for p in pipelines:
            self._delete(PipelineRecord, p["id"])
            self._remove_pipeline_artifacts(p["id"])
        return len(pipelines)

    def delete_pipeline_cascade(self, pipeline_id: str, session_id: str | None = None) -> int:
        self.delete_models_by_pipeline(pipeline_id, session_id)
        self._remove_pipeline_artifacts(pipeline_id)
        self._delete(PipelineRecord, pipeline_id)
        return 1

    # --- Training Jobs ---
    def list_jobs(self, session_id: str = None) -> list[dict]:
        return self._list(JobRecord, session_id)

    def get_job(self, job_id: str, session_id: str = None) -> dict | None:
        job = self._get(JobRecord, job_id)
        if job is None:
            return None
        j_session = job.get("session_id")
        if session_id and session_id != "default_user" and j_session not in (session_id, "default_user", None):
            return None
        return job

    def save_job(self, job: dict) -> dict:
        with session_scope() as session:
            return self._upsert(JobRecord, job["id"], job, session)

    def delete_job(self, job_id: str, session_id: str | None = None) -> bool:
        job = self.get_job(job_id, session_id=session_id)
        if job is None:
            return False
        # Cascade delete the job's models and their on-disk artifacts
        for model in self.list_models(session_id=session_id):
            if model.get("job_id") == job_id:
                self.delete_model(model["id"])
                self._remove_model_artifacts(model["id"])
        self._delete(JobRecord, job_id)
        return True

    # --- Settings ---
    def get_settings(self) -> dict:
        with session_scope() as session:
            model = session.get(SettingRecord, "app")
            if model is None:
                return {
                    "api_endpoint": "/api/v1",
                    "default_project": "MLPilot",
                    "max_memory_gb": 32,
                    "max_runtime_minutes": 240,
                    "parallel_jobs": 3,
                    "email_alerts": True,
                    "webhook_url": "https://hooks.mlpilot.io/events",
                }
            return dict(model.value)

    def save_settings(self, settings: dict) -> dict:
        with session_scope() as session:
            model = session.get(SettingRecord, "app")
            if model is None:
                session.add(SettingRecord(key="app", value=settings))
            else:
                model.value = settings
            return dict(settings)

    # --- EDA Reports (file-backed, unchanged) ---
    def _eda_dir(self, dataset_id: str) -> Path:
        p = self._base / "eda" / dataset_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def _atomic_json_write(self, path: Path, obj: dict) -> None:
        encoded = json.dumps(obj, indent=2, cls=SafeEncoder)
        last_exc: Exception | None = None
        for attempt in range(5):
            tmp_path: str | None = None
            try:
                fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(encoded)
                os.replace(tmp_path, str(path))
                return
            except (PermissionError, OSError) as exc:
                # On Windows, os.replace can fail with WinError 5/32 if the
                # target is momentarily locked by a concurrent reader (e.g. the
                # frontend polling EDA progress). Retry instead of aborting.
                last_exc = exc
                with contextlib.suppress(OSError):
                    if tmp_path:
                        os.unlink(tmp_path)
                time.sleep(0.05 * (attempt + 1))
                continue
            except Exception:
                with contextlib.suppress(OSError):
                    if tmp_path:
                        os.unlink(tmp_path)
                raise
        if last_exc is not None:
            raise last_exc

    def _read_json_file(self, path: Path) -> dict | None:
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            return None

    def save_eda_progress(self, dataset_id: str, progress: dict) -> None:
        path = self._eda_dir(dataset_id) / "progress.json"
        self._atomic_json_write(path, progress)

    def get_eda_progress(self, dataset_id: str) -> dict | None:
        return self._read_json_file(self._eda_dir(dataset_id) / "progress.json")

    def save_eda_report(self, dataset_id: str, report: dict) -> None:
        path = self._eda_dir(dataset_id) / "report.json"
        self._atomic_json_write(path, report)

    def get_eda_report(self, dataset_id: str) -> dict | None:
        return self._read_json_file(self._eda_dir(dataset_id) / "report.json")

    def delete_eda(self, dataset_id: str) -> None:
        path = self._base / "eda" / dataset_id
        if path.exists():
            import shutil
            shutil.rmtree(path)

    # --- Cleaning Runs (file-backed, unchanged) ---
    def _cleaning_dir(self, dataset_id: str, run_id: str | None = None) -> Path:
        p = self._base / "cleaning" / dataset_id
        if run_id:
            p = p / run_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def save_cleaning_config(self, dataset_id: str, run_id: str, config: dict) -> None:
        path = self._cleaning_dir(dataset_id, run_id) / "config.json"
        self._atomic_json_write(path, config)

    def save_cleaning_report(self, dataset_id: str, run_id: str, report: dict) -> None:
        path = self._cleaning_dir(dataset_id, run_id) / "report.json"
        self._atomic_json_write(path, report)

    def get_cleaning_report(self, dataset_id: str, run_id: str) -> dict | None:
        return self._read_json_file(self._cleaning_dir(dataset_id, run_id) / "report.json")

    def list_cleaning_runs(self, dataset_id: str) -> list[dict]:
        base = self._base / "cleaning" / dataset_id
        if not base.exists():
            return []
        runs = []
        for child in sorted(base.iterdir(), reverse=True):
            if child.is_dir():
                report = self._read_json_file(child / "report.json")
                if report:
                    runs.append({
                        "run_id": child.name,
                        "created_at": report.get("created_at", ""),
                        "before": report.get("before", {}),
                        "after": report.get("after", {}),
                        "step_count": len(report.get("steps", [])),
                    })
        return runs

    def get_cleaned_data_path(self, dataset_id: str, run_id: str) -> Path:
        return self._cleaning_dir(dataset_id, run_id) / "cleaned.csv"

    def delete_cleaning_run(self, dataset_id: str, run_id: str) -> None:
        path = self._cleaning_dir(dataset_id, run_id)
        if path.exists():
            import shutil
            shutil.rmtree(path)


storage = SQLStorage()
