import io

from fastapi.testclient import TestClient


def test_run_eda_on_uploaded_dataset(client: TestClient) -> None:
    content = "col_a,col_b,target\n1,2,0\n3,4,1\n5,6,0\n"
    upload_resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    ds_id = upload_resp.json()["id"]

    response = client.get(f"/api/v1/datasets/{ds_id}/eda")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_id"] == ds_id
    assert len(data["column_stats"]) == 3
    assert len(data["findings"]) >= 0
    assert "correlation_matrix" in data
