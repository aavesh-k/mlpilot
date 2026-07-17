import json
import math
import os
import tempfile
import threading
import uuid
from pathlib import Path
from datetime import UTC, datetime
from typing import Any


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


class JSONStorage:
    def __init__(self, data_dir: str = "data") -> None:
        self._base = Path(data_dir)
        self._base.mkdir(parents=True, exist_ok=True)
        self._file = self._base / "db.json"
        self._lock = threading.Lock()
        if not self._file.exists():
            self._atomic_write({
                "datasets": [],
                "dataset_columns": {},
                "pipelines": [],
                "models": [],
                "training_jobs": [],
                "experiments": [],
                "settings": {},
            })

    def _atomic_write(self, data: dict) -> None:
        encoded = json.dumps(data, indent=2, cls=SafeEncoder)
        fd, tmp_path = tempfile.mkstemp(dir=str(self._base), suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(encoded)
            os.replace(tmp_path, str(self._file))
        except Exception:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise

    def _read(self) -> dict:
        return json.loads(self._file.read_text())

    def _write(self, data: dict) -> None:
        with self._lock:
            self._atomic_write(data)

    # --- Datasets ---
    def list_datasets(self) -> list[dict]:
        return list(reversed(self._read().get("datasets", [])))

    def get_dataset(self, dataset_id: str) -> dict | None:
        for d in self._read()["datasets"]:
            if d["id"] == dataset_id:
                return d
        return None

    def save_dataset(self, dataset: dict) -> dict:
        data = self._read()
        for i, d in enumerate(data["datasets"]):
            if d["id"] == dataset["id"]:
                data["datasets"][i] = dataset
                self._write(data)
                return dataset
        data["datasets"].append(dataset)
        self._write(data)
        return dataset

    def delete_dataset(self, dataset_id: str) -> bool:
        data = self._read()
        before = len(data["datasets"])
        data["datasets"] = [d for d in data["datasets"] if d["id"] != dataset_id]
        if len(data["datasets"]) < before:
            data["dataset_columns"].pop(dataset_id, None)
            self._write(data)
            return True
        return False

    # --- Columns ---
    def get_columns(self, dataset_id: str) -> list[dict]:
        return self._read().get("dataset_columns", {}).get(dataset_id, [])

    def save_columns(self, dataset_id: str, columns: list[dict]) -> None:
        data = self._read()
        data["dataset_columns"][dataset_id] = columns
        self._write(data)

    # --- Pipelines ---
    def list_pipelines(self) -> list[dict]:
        return list(reversed(self._read().get("pipelines", [])))

    def get_pipeline(self, pipeline_id: str) -> dict | None:
        for p in self._read()["pipelines"]:
            if p["id"] == pipeline_id:
                return p
        return None

    def save_pipeline(self, pipeline: dict) -> dict:
        data = self._read()
        for i, p in enumerate(data["pipelines"]):
            if p["id"] == pipeline["id"]:
                data["pipelines"][i] = pipeline
                self._write(data)
                return pipeline
        data["pipelines"].append(pipeline)
        self._write(data)
        return pipeline

    def delete_pipeline(self, pipeline_id: str) -> bool:
        data = self._read()
        before = len(data["pipelines"])
        data["pipelines"] = [p for p in data["pipelines"] if p["id"] != pipeline_id]
        if len(data["pipelines"]) < before:
            self._write(data)
            return True
        return False

    # --- Models ---
    def list_models(self) -> list[dict]:
        return list(reversed(self._read().get("models", [])))

    def get_model(self, model_id: str) -> dict | None:
        for m in self._read()["models"]:
            if m["id"] == model_id:
                return m
        return None

    def save_model(self, model: dict) -> dict:
        data = self._read()
        for i, m in enumerate(data["models"]):
            if m["id"] == model["id"]:
                data["models"][i] = model
                self._write(data)
                return model
        data["models"].append(model)
        self._write(data)
        return model

    def delete_model(self, model_id: str) -> bool:
        data = self._read()
        before = len(data["models"])
        data["models"] = [m for m in data["models"] if m["id"] != model_id]
        if len(data["models"]) < before:
            self._write(data)
            return True
        return False

    # --- Training Jobs ---
    def list_jobs(self) -> list[dict]:
        return list(reversed(self._read().get("training_jobs", [])))

    def get_job(self, job_id: str) -> dict | None:
        for j in self._read()["training_jobs"]:
            if j["id"] == job_id:
                return j
        return None

    def save_job(self, job: dict) -> dict:
        data = self._read()
        for i, j in enumerate(data["training_jobs"]):
            if j["id"] == job["id"]:
                data["training_jobs"][i] = job
                self._write(data)
                return job
        data["training_jobs"].append(job)
        self._write(data)
        return job


    # --- Settings ---
    def get_settings(self) -> dict:
        data = self._read()
        return data.get("settings", {
            "api_endpoint": "/api/v1",
            "default_project": "MLPilot",
            "max_memory_gb": 32,
            "max_runtime_minutes": 240,
            "parallel_jobs": 3,
            "email_alerts": True,
            "webhook_url": "https://hooks.mlpilot.io/events",
        })

    def save_settings(self, settings: dict) -> dict:
        data = self._read()
        data["settings"] = settings
        self._write(data)
        return settings

    # --- EDA Reports ---
    def _eda_dir(self, dataset_id: str) -> Path:
        p = self._base / "eda" / dataset_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def _atomic_json_write(self, path: Path, obj: dict) -> None:
        encoded = json.dumps(obj, indent=2, cls=SafeEncoder)
        fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(encoded)
            os.replace(tmp_path, str(path))
        except Exception:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise

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


    # --- Cleaning Runs ---
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


storage = JSONStorage()
