import io
import time

from fastapi.testclient import TestClient


def _wait_for_job(client: TestClient, job_id: str, timeout: float = 10.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = client.get(f"/api/v1/training/jobs/{job_id}")
        job = resp.json()
        if job["status"] in ("completed", "failed", "cancelled"):
            return job
        time.sleep(0.1)
    raise TimeoutError(f"Job {job_id} did not complete within {timeout}s")


def test_train_model_returns_201(client: TestClient) -> None:
    content = (
        "feature_a,feature_b,target\n"
        + "\n".join(f"{i},{i * 2},{1 if i > 25 else 0}" for i in range(1, 51))
    )
    upload_resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("train.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    ds_id = upload_resp.json()["id"]

    response = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "random_forest"})
    assert response.status_code == 201
    data = response.json()
    assert "model" in data
    assert "job" in data
    assert data["model"]["status"] == "queued"

    job = _wait_for_job(client, data["job"]["id"])
    assert job["status"] == "completed"

    model_resp = client.get(f"/api/v1/training/models/{data['model']['id']}")
    assert model_resp.json()["metrics"]["accuracy"] > 0
