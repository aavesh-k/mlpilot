import io
import uuid

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


def test_train_invalid_algorithm_returns_422(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    response = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "nonexistent"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_train_nonexistent_dataset_returns_404(client: TestClient) -> None:
    response = client.post("/api/v1/training/", json={"dataset_id": str(uuid.uuid4()), "algorithm": "random_forest"})
    assert response.status_code == 404


def test_train_svm_returns_completed(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    response = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "svm"})
    assert response.status_code == 201
    data = response.json()
    assert data["model"]["status"] == "completed"
    assert data["model"]["algorithm"] == "svm"


def test_train_logistic_regression_returns_completed(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    response = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "logistic_regression"})
    assert response.status_code == 201
    data = response.json()
    assert data["model"]["status"] == "completed"


def test_list_models_returns_paginated(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "random_forest"})
    response = client.get("/api/v1/training/models")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


def test_get_model_returns_model(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    train_resp = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "random_forest"})
    model_id = train_resp.json()["model"]["id"]
    response = client.get(f"/api/v1/training/models/{model_id}")
    assert response.status_code == 200
    assert response.json()["id"] == model_id


def test_get_nonexistent_model_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/training/models/{uuid.uuid4()}")
    assert response.status_code == 404


def test_compare_models_returns_sorted(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    m1 = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "random_forest"}).json()["model"]
    m2 = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "svm"}).json()["model"]
    response = client.get(f"/api/v1/training/models/compare", params={"ids": f"{m1['id']},{m2['id']}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["metrics"]["accuracy"] >= data[1]["metrics"]["accuracy"]


def test_compare_models_no_ids_returns_422(client: TestClient) -> None:
    response = client.get("/api/v1/training/models/compare")
    assert response.status_code == 422


def test_list_jobs_returns_paginated(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "random_forest"})
    response = client.get("/api/v1/training/jobs")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


def test_get_job_returns_job(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    train_resp = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "random_forest"})
    job_id = train_resp.json()["job"]["id"]
    response = client.get(f"/api/v1/training/jobs/{job_id}")
    assert response.status_code == 200
    assert response.json()["id"] == job_id


def test_get_nonexistent_job_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/training/jobs/{uuid.uuid4()}")
    assert response.status_code == 404


def test_cancel_completed_job_returns_409(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    train_resp = client.post("/api/v1/training/", json={"dataset_id": ds_id, "algorithm": "random_forest"})
    job_id = train_resp.json()["job"]["id"]
    assert train_resp.json()["job"]["status"] == "completed"
    response = client.post(f"/api/v1/training/jobs/{job_id}/cancel")
    assert response.status_code == 409


def test_cancel_nonexistent_job_returns_404(client: TestClient) -> None:
    response = client.post(f"/api/v1/training/jobs/{uuid.uuid4()}/cancel")
    assert response.status_code == 404
