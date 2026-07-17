import time
import io

from fastapi.testclient import TestClient


def test_run_eda_on_uploaded_dataset(client: TestClient) -> None:
    content = "col_a,col_b,target\n1,2,0\n3,4,1\n5,6,0\n"
    upload_resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    ds_id = upload_resp.json()["id"]

    for _ in range(20):
        resp = client.get(f"/api/v1/datasets/{ds_id}/eda")
        assert resp.status_code == 200
        data = resp.json()
        if data["status"] == "completed":
            report = data["report"]
            assert report["dataset_id"] == ds_id
            assert len(report["columns"]) == 3
            assert len(report["findings"]) >= 0
            assert "correlation_matrix" in report
            return
        if data["status"] == "not_started":
            client.post(f"/api/v1/datasets/{ds_id}/eda")
        time.sleep(0.5)
    assert False, "EDA did not complete in time"
