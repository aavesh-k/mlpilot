import io
import time
from fastapi.testclient import TestClient


def test_corrupt_file_upload_rejected_gracefully(client: TestClient) -> None:
    # Upload a corrupt binary payload as a CSV
    binary_content = b"\x00\x01\x02\x03\xff\xfe\xfd"
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("corrupt.csv", io.BytesIO(binary_content), "text/csv")},
    )
    # Assert it returns a validation error instead of throwing a raw traceback
    assert resp.status_code == 422
    assert "error" in resp.json()
    assert "invalid" in resp.text.lower() or "malformed" in resp.text.lower()


def test_multi_user_session_data_isolation(client: TestClient) -> None:
    # 1. User A uploads a dataset
    csv_a = "col_a,col_b\n1,2\n3,4\n"
    resp_a = client.post(
        "/api/v1/datasets/upload",
        headers={"X-Session-ID": "user_a"},
        files={"file": ("data_a.csv", io.BytesIO(csv_a.encode()), "text/csv")},
    )
    assert resp_a.status_code == 201
    dataset_a_id = resp_a.json()["id"]

    # 2. User B lists datasets - must be empty
    resp_list_b = client.get("/api/v1/datasets/", headers={"X-Session-ID": "user_b"})
    assert resp_list_b.status_code == 200
    assert len(resp_list_b.json()["items"]) == 0

    # 3. User B tries to fetch User A's dataset - must be 404
    resp_get_b = client.get(f"/api/v1/datasets/{dataset_a_id}", headers={"X-Session-ID": "user_b"})
    assert resp_get_b.status_code == 404


def test_chronological_split_strategy(client: TestClient) -> None:
    # Create time series dataset (reversed order of dates)
    csv_content = (
        "date,feature,target\n"
        "2026-07-03,30,1\n"
        "2026-07-01,10,0\n"
        "2026-07-02,20,0\n"
    )
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("ts.csv", io.BytesIO(csv_content.encode()), "text/csv")},
    )
    assert resp.status_code == 201
    ds_id = resp.json()["id"]

    # Execute cleaning first
    clean_resp = client.post(f"/api/v1/datasets/{ds_id}/cleaning/execute", json={})
    assert clean_resp.status_code == 201
    cleaned_ds_id = clean_resp.json()["dataset"]["id"]

    # Check that target detection detects "date" as a datetime column
    det_resp = client.post(
        "/api/v1/pipelines/detect-target",
        params={"dataset_id": cleaned_ds_id, "target_column": "target"}
    )
    assert det_resp.status_code == 200
    assert "date" in det_resp.json()["datetime_columns"]

    # Create pipeline with chronological split strategy on date
    pipe_resp = client.post("/api/v1/pipelines/", json={
        "dataset_id": cleaned_ds_id,
        "target_column": "target",
        "problem_type": "classification",
        "split": {
            "test_size": 0.33,
            "strategy": "chronological",
            "datetime_column": "date"
        }
    })
    assert pipe_resp.status_code == 201
    pipe_id = pipe_resp.json()["id"]

    # Execute pipeline
    exec_resp = client.post(f"/api/v1/pipelines/{pipe_id}/execute")
    assert exec_resp.status_code == 200
    
    # Wait for non-blocking execute to finish
    deadline = time.time() + 5.0
    while time.time() < deadline:
        status_resp = client.get(f"/api/v1/pipelines/{pipe_id}")
        if status_resp.json()["status"] == "completed":
            break
        time.sleep(0.1)
    
    pipeline = client.get(f"/api/v1/pipelines/{pipe_id}").json()
    assert pipeline["status"] == "completed"

    # Verify chronological split sizes:
    # total rows = 3. test_size = 0.33 -> train split = 2 rows (earliest dates), test split = 1 row (latest date)
    assert pipeline["train_rows"] == 2
    assert pipeline["test_rows"] == 1


def test_pipeline_execution_is_non_blocking(client: TestClient) -> None:
    # 10 rows to prevent stratified split complaining about small class sizes
    csv_content = (
        "feature,target\n"
        "1,0\n2,1\n3,0\n4,1\n5,0\n6,1\n7,0\n8,1\n9,0\n10,1\n"
    )
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("dummy.csv", io.BytesIO(csv_content.encode()), "text/csv")},
    )
    ds_id = resp.json()["id"]

    # Execute cleaning first
    clean_resp = client.post(f"/api/v1/datasets/{ds_id}/cleaning/execute", json={})
    assert clean_resp.status_code == 201
    cleaned_ds_id = clean_resp.json()["dataset"]["id"]

    pipe_resp = client.post("/api/v1/pipelines/", json={
        "dataset_id": cleaned_ds_id,
        "target_column": "target",
        "problem_type": "classification"
    })
    assert pipe_resp.status_code == 201
    pipe_id = pipe_resp.json()["id"]

    # Temporarily remove pytest env var to verify non-blocking async execution
    import os
    pytest_var = os.environ.pop("PYTEST_CURRENT_TEST", None)
    try:
        exec_resp = client.post(f"/api/v1/pipelines/{pipe_id}/execute")
        assert exec_resp.status_code == 200
        assert exec_resp.json()["status"] == "running"
    finally:
        if pytest_var:
            os.environ["PYTEST_CURRENT_TEST"] = pytest_var


def test_preprocessing_requires_cleaning_boundary(client: TestClient) -> None:
    # 1. Upload raw dataset
    csv_content = "feature,target\n1,0\n2,1\n"
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("dummy.csv", io.BytesIO(csv_content.encode()), "text/csv")},
    )
    assert resp.status_code == 201
    ds_id = resp.json()["id"]

    # 2. Temporarily remove pytest env var to test boundary validation
    import os
    pytest_var = os.environ.pop("PYTEST_CURRENT_TEST", None)
    try:
        pipe_resp = client.post("/api/v1/pipelines/", json={
            "dataset_id": ds_id,
            "target_column": "target"
        })
        assert pipe_resp.status_code == 422
        assert "cleaned" in pipe_resp.json()["error"]["message"].lower()
    finally:
        if pytest_var:
            os.environ["PYTEST_CURRENT_TEST"] = pytest_var
