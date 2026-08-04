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


def test_multi_model_classification_training(client: TestClient) -> None:
    ds_id = _upload_csv(client)

    # 1. Create pipeline
    pipe_resp = client.post("/api/v1/pipelines/", json={
        "dataset_id": ds_id,
        "target_column": "target",
        "problem_type": "classification",
        "split": {
            "test_size": 0.2,
            "random_seed": 42,
            "stratify": True
        }
    })
    assert pipe_resp.status_code == 201
    pipe_id = pipe_resp.json()["id"]

    # 2. Execute pipeline
    exec_resp = client.post(f"/api/v1/pipelines/{pipe_id}/execute")
    assert exec_resp.status_code == 200
    exec_data = exec_resp.json()
    assert exec_data["status"] == "completed", f"Pipeline failed: {exec_data.get('error_message')}"

    # 3. Trigger multi-model training
    train_resp = client.post("/api/v1/training/", json={
        "pipeline_id": pipe_id,
        "algorithms": ["logistic_regression", "random_forest"],
        "cv_folds": 3,
        "tuning_enabled": True
    })
    assert train_resp.status_code == 201
    data = train_resp.json()
    assert "models" in data
    assert len(data["models"]) == 2

    # 4. Wait for job to complete
    job = _wait_for_job(client, data["job"]["id"])
    assert job["status"] == "completed"

    # 5. Check completed models
    model1_resp = client.get(f"/api/v1/training/models/{data['models'][0]['id']}")
    assert model1_resp.status_code == 200
    m1 = model1_resp.json()
    assert m1["status"] == "completed"
    assert "accuracy" in m1["metrics"]
    assert "cv_mean_score" in m1["metrics"]


def test_set_best_model(client: TestClient) -> None:
    ds_id = _upload_csv(client)

    pipe_resp = client.post("/api/v1/pipelines/", json={
        "dataset_id": ds_id,
        "target_column": "target",
        "problem_type": "classification"
    })
    pipe_id = pipe_resp.json()["id"]
    client.post(f"/api/v1/pipelines/{pipe_id}/execute")

    train_resp = client.post("/api/v1/training/", json={
        "pipeline_id": pipe_id,
        "algorithms": ["logistic_regression", "random_forest"],
        "cv_folds": 2,
        "tuning_enabled": False
    })
    data = train_resp.json()
    _wait_for_job(client, data["job"]["id"])

    model_ids = [m["id"] for m in data["models"]]

    # Set second model as best
    best_resp = client.post(f"/api/v1/training/models/{model_ids[1]}/set-best")
    assert best_resp.status_code == 200

    # Check that it is best in DB, and the other is not
    m0 = client.get(f"/api/v1/training/models/{model_ids[0]}").json()
    m1 = client.get(f"/api/v1/training/models/{model_ids[1]}").json()
    assert m0["is_best"] is False
    assert m1["is_best"] is True
