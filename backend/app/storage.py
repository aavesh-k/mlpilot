import json
import uuid
from pathlib import Path
from datetime import UTC, datetime
from typing import Any


class JSONStorage:
    def __init__(self, data_dir: str = "data") -> None:
        self._base = Path(data_dir)
        self._base.mkdir(parents=True, exist_ok=True)
        self._file = self._base / "db.json"
        if not self._file.exists():
            self._file.write_text(json.dumps({
                "datasets": [],
                "dataset_columns": {},
                "pipelines": [],
                "models": [],
                "training_jobs": [],
                "experiments": [],
            }))

    def _read(self) -> dict:
        return json.loads(self._file.read_text())

    def _write(self, data: dict) -> None:
        self._file.write_text(json.dumps(data, indent=2, default=str))

    # --- Datasets ---
    def list_datasets(self) -> list[dict]:
        return self._read().get("datasets", [])

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
        return self._read().get("pipelines", [])

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
        return self._read().get("models", [])

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
        return self._read().get("training_jobs", [])

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


storage = JSONStorage()
