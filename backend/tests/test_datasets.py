import io

from fastapi.testclient import TestClient


def test_upload_csv_returns_201(client: TestClient) -> None:
    content = "col_a,col_b,target\n1,2,0\n3,4,1\n5,6,0\n"
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "test.csv"
    assert data["file_format"] == "csv"
    assert data["row_count"] == 3
    assert data["column_count"] == 3
    assert data["status"] == "ready"


def test_upload_invalid_format_returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_list_datasets_returns_paginated(client: TestClient) -> None:
    response = client.get("/api/v1/datasets/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "per_page" in data


def test_get_nonexistent_dataset_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/datasets/nonexistent-id")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
