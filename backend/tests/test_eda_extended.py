import io
import uuid

from fastapi.testclient import TestClient


def test_eda_on_nonexistent_dataset_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/v1/datasets/{uuid.uuid4()}/eda")
    assert response.status_code == 404


def test_eda_with_multiple_dtypes(client: TestClient) -> None:
    content = "num,cat,target\n1.5,foo,0\n2.5,bar,1\n3.5,foo,0\n"
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    ds_id = resp.json()["id"]
    response = client.get(f"/api/v1/datasets/{ds_id}/eda")
    assert response.status_code == 200
    data = response.json()
    assert len(data["column_stats"]) == 3
    num_col = next(c for c in data["column_stats"] if c["name"] == "num")
    assert num_col["is_numeric"] is True
    cat_col = next(c for c in data["column_stats"] if c["name"] == "cat")
    assert cat_col["is_numeric"] is False
