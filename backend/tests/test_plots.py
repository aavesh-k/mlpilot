import io
import time

from fastapi.testclient import TestClient


def _upload_csv(client: TestClient) -> str:
    content = (
        "feature_a,feature_b,target\n"
        + "\n".join(f"{i},{i * 2},{1 if i > 25 else 0}" for i in range(1, 51))
    )
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("train.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    return resp.json()["id"]


def _wait_for_job(client: TestClient, job_id: str, timeout: float = 15.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = client.get(f"/api/v1/training/jobs/{job_id}")
        job = resp.json()
        if job["status"] in ("completed", "failed", "cancelled"):
            return job
        time.sleep(0.2)
    raise TimeoutError(f"Job {job_id} did not complete within {timeout}s")


def test_get_classification_plots(client: TestClient) -> None:
    ds_id = _upload_csv(client)

    # 1. Create pipeline
    pipe_resp = client.post("/api/v1/pipelines/", json={
        "dataset_id": ds_id,
        "target_column": "target",
        "problem_type": "classification"
    })
    assert pipe_resp.status_code == 201
    pipe_id = pipe_resp.json()["id"]

    # 2. Execute pipeline
    exec_resp = client.post(f"/api/v1/pipelines/{pipe_id}/execute")
    assert exec_resp.status_code == 200
    assert exec_resp.json()["status"] == "completed"

    # 3. Train models
    train_resp = client.post("/api/v1/training/", json={
        "pipeline_id": pipe_id,
        "algorithms": ["logistic_regression"],
        "cv_folds": 2,
        "tuning_enabled": False
    })
    assert train_resp.status_code == 201
    data = train_resp.json()
    model_id = data["models"][0]["id"]

    # Wait for completion
    _wait_for_job(client, data["job"]["id"])

    # 4. Get plots
    plots_resp = client.get(f"/api/v1/training/models/{model_id}/plots")
    assert plots_resp.status_code == 200
    plots = plots_resp.json()

    assert plots["problem_type"] == "classification"
    assert "classification" in plots
    assert plots["classification"] is not None
    assert "regression" in plots
    assert plots["regression"] is None

    cls_plots = plots["classification"]
    assert "confusion_matrix" in cls_plots
    assert "classes" in cls_plots["confusion_matrix"]
    assert "matrix" in cls_plots["confusion_matrix"]

    assert "roc_curve" in cls_plots
    assert "feature_importance" in cls_plots
    assert len(cls_plots["feature_importance"]) > 0
    assert "feature" in cls_plots["feature_importance"][0]
    assert "importance" in cls_plots["feature_importance"][0]

    assert "learning_curve" in plots
    assert "train_sizes" in plots["learning_curve"]
    assert "train_scores" in plots["learning_curve"]

    assert "model_comparison" in plots
    assert len(plots["model_comparison"]) >= 1
