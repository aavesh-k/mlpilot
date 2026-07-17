import io
import uuid

import pytest
from fastapi.testclient import TestClient


def _upload_csv(client: TestClient) -> str:
    content = "a,b\n1,2\n3,4\n"
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    return resp.json()["id"]


def test_upload_parquet_returns_201(client: TestClient) -> None:
    pytest.importorskip("pyarrow")
    import pandas as pd
    df = pd.DataFrame({"x": [1, 2], "y": [3, 4]})
    buf = io.BytesIO()
    df.to_parquet(buf)
    buf.seek(0)
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("data.parquet", buf, "application/octet-stream")},
    )
    assert response.status_code == 201
    assert response.json()["file_format"] == "parquet"


def test_upload_json_returns_201(client: TestClient) -> None:
    content = b'[{"a": 1, "b": 2}, {"a": 3, "b": 4}]'
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("data.json", io.BytesIO(content), "application/json")},
    )
    assert response.status_code == 201
    assert response.json()["file_format"] == "json"


def test_get_dataset_by_id_returns_dataset(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    response = client.get(f"/api/v1/datasets/{ds_id}")
    assert response.status_code == 200
    assert response.json()["id"] == ds_id


def test_get_nonexistent_dataset_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/datasets/{uuid.uuid4()}")
    assert response.status_code == 404


def test_delete_dataset_returns_204(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    response = client.delete(f"/api/v1/datasets/{ds_id}")
    assert response.status_code == 204


def test_delete_nonexistent_dataset_returns_404(client: TestClient) -> None:
    response = client.delete(f"/api/v1/datasets/{uuid.uuid4()}")
    assert response.status_code == 404


def test_get_columns_returns_column_stats(client: TestClient) -> None:
    ds_id = _upload_csv(client)
    response = client.get(f"/api/v1/datasets/{ds_id}/columns")
    assert response.status_code == 200
    data = response.json()
    assert "column_stats" in data
    assert len(data["column_stats"]) >= 1
    assert data["column_stats"][0]["name"] == "a"


def test_get_columns_nonexistent_dataset_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/datasets/{uuid.uuid4()}/columns")
    assert response.status_code == 404


def test_upload_csv_duplicate_name_allowed(client: TestClient) -> None:
    content = "x,y\n1,2\n"
    r1 = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("dup.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    r2 = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("dup.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]
