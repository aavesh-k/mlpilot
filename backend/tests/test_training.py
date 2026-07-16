import io

from fastapi.testclient import TestClient


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
    assert data["model"]["status"] == "completed"
    assert data["model"]["metrics"]["accuracy"] > 0
