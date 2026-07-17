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

    # The columns endpoint runs EDA synchronously
    col_resp = client.get(f"/api/v1/datasets/{ds_id}/columns")
    assert col_resp.status_code == 200
    cols = col_resp.json()["column_stats"]
    assert len(cols) == 3

    num_col = next(c for c in cols if c["name"] == "num")
    assert num_col["is_numeric"] is True
    assert num_col["mean"] is not None

    cat_col = next(c for c in cols if c["name"] == "cat")
    assert cat_col["is_numeric"] is False
