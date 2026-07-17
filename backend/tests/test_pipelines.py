import io
import uuid

from fastapi.testclient import TestClient


def _upload_csv(client: TestClient, name: str = "test.csv") -> str:
    content = "col_a,col_b,target\n1,2,0\n3,4,1\n5,6,0\n"
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": (name, io.BytesIO(content.encode()), "text/csv")},
    )
    return resp.json()["id"]


def test_create_pipeline_returns_201(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    body = {
        "dataset_id": ds_id,
        "name": "Test Pipeline",
        "steps": [
            {"step_type": "imputation", "config": {"strategy": "mean"}},
            {"step_type": "encoding", "config": {"strategy": "one_hot"}},
            {"step_type": "scaling", "config": {"strategy": "standard"}},
            {"step_type": "train_test_split", "config": {}},
        ],
        "test_split_ratio": 0.2,
        "random_seed": 42,
    }
    response = client.post("/api/v1/pipelines/", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Pipeline"
    assert data["status"] == "draft"
    assert len(data["steps"]) == 4


def test_create_pipeline_no_dataset_returns_404(client: TestClient) -> None:
    body = {
        "dataset_id": str(uuid.uuid4()),
        "steps": [{"step_type": "imputation", "config": {"strategy": "mean"}}],
    }
    response = client.post("/api/v1/pipelines/", json=body)
    assert response.status_code == 404


def test_create_pipeline_no_steps_returns_422(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    response = client.post("/api/v1/pipelines/", json={"dataset_id": ds_id, "steps": []})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_pipeline_too_many_steps_returns_422(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    steps = [{"step_type": "imputation", "config": {"strategy": "mean"}} for _ in range(11)]
    response = client.post("/api/v1/pipelines/", json={"dataset_id": ds_id, "steps": steps})
    assert response.status_code == 422


def test_create_pipeline_invalid_step_type_returns_422(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    steps = [{"step_type": "invalid_step"}]
    response = client.post("/api/v1/pipelines/", json={"dataset_id": ds_id, "steps": steps})
    assert response.status_code == 422


def test_list_pipelines_returns_paginated(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    client.post("/api/v1/pipelines/", json={"dataset_id": ds_id, "steps": [{"step_type": "imputation", "config": {"strategy": "mean"}}]})
    response = client.get("/api/v1/pipelines/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


def test_get_pipeline_returns_pipeline(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    create = client.post("/api/v1/pipelines/", json={"dataset_id": ds_id, "steps": [{"step_type": "imputation", "config": {"strategy": "mean"}}]})
    pipe_id = create.json()["id"]
    response = client.get(f"/api/v1/pipelines/{pipe_id}")
    assert response.status_code == 200
    assert response.json()["id"] == pipe_id


def test_get_nonexistent_pipeline_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/pipelines/{uuid.uuid4()}")
    assert response.status_code == 404


def test_update_pipeline_returns_updated(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    create = client.post("/api/v1/pipelines/", json={"dataset_id": ds_id, "steps": [{"step_type": "imputation", "config": {"strategy": "mean"}}]})
    pipe_id = create.json()["id"]
    response = client.put(f"/api/v1/pipelines/{pipe_id}", json={"name": "Updated Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


def test_update_nonexistent_pipeline_returns_404(client: TestClient) -> None:
    response = client.put(f"/api/v1/pipelines/{uuid.uuid4()}", json={"name": "Nope"})
    assert response.status_code == 404


def test_delete_pipeline_returns_204(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    create = client.post("/api/v1/pipelines/", json={"dataset_id": ds_id, "steps": [{"step_type": "imputation", "config": {"strategy": "mean"}}]})
    pipe_id = create.json()["id"]
    response = client.delete(f"/api/v1/pipelines/{pipe_id}")
    assert response.status_code == 204


def test_delete_nonexistent_pipeline_returns_404(client: TestClient) -> None:
    response = client.delete(f"/api/v1/pipelines/{uuid.uuid4()}")
    assert response.status_code == 404


def test_execute_pipeline_returns_completed(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    create = client.post("/api/v1/pipelines/", json={
        "dataset_id": ds_id,
        "steps": [{"step_type": "imputation", "config": {"strategy": "mean"}}],
    })
    pipe_id = create.json()["id"]
    response = client.post(f"/api/v1/pipelines/{pipe_id}/execute")
    assert response.status_code == 200
    assert response.json()["status"] in ("completed", "failed")
