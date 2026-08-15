import io
import time

from fastapi.testclient import TestClient


def _upload_csv(client: TestClient) -> str:
    # 10 rows to support stratified 20% train/test split successfully
    content = (
        "feature_a,feature_b,target\n"
        "1,2,0\n3,4,1\n5,6,0\n7,8,1\n9,10,0\n"
        "11,12,0\n13,14,1\n15,16,0\n17,18,1\n19,20,0\n"
    )
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    return resp.json()["id"]


def test_automated_eda_insights(client: TestClient) -> None:
    ds_id = _upload_csv(client)

    # Trigger EDA computation
    client.post(f"/api/v1/datasets/{ds_id}/eda")

    # Wait for completion using GET /datasets/{dataset_id}/eda endpoint
    deadline = time.time() + 5.0
    while time.time() < deadline:
        progress = client.get(f"/api/v1/datasets/{ds_id}/eda").json()
        if progress["status"] == "completed":
            break
        time.sleep(0.1)

    # Re-fetch report
    report_resp = client.get(f"/api/v1/datasets/{ds_id}/eda")
    assert report_resp.status_code == 200
    report = report_resp.json()["report"]
    assert "findings" in report

    # Verify recommendations are present in findings
    for finding in report["findings"]:
        assert "recommendation" in finding
        assert len(finding["recommendation"]) > 0


def test_predict_and_explain_and_compare(client: TestClient) -> None:
    ds_id = _upload_csv(client)

    # Clean dataset first
    clean_resp = client.post(f"/api/v1/datasets/{ds_id}/cleaning/execute", json={})
    cleaned_ds_id = clean_resp.json()["dataset"]["id"]

    # Create pipeline
    pipe_resp = client.post("/api/v1/pipelines/", json={
        "dataset_id": cleaned_ds_id,
        "target_column": "target",
        "problem_type": "classification"
    })
    pipe_id = pipe_resp.json()["id"]

    # Execute pipeline synchronously under pytest
    exec_resp = client.post(f"/api/v1/pipelines/{pipe_id}/execute")
    assert exec_resp.status_code == 200

    # Train a model
    train_resp = client.post("/api/v1/training/", json={
        "pipeline_id": pipe_id,
        "algorithms": ["logistic_regression"],
        "cv_folds": 2,
        "tuning_enabled": False
    })
    assert train_resp.status_code == 201
    train_data = train_resp.json()
    model_id = train_data["models"][0]["id"]
    job_id = train_data["job"]["id"]

    # Wait for training job to complete
    deadline = time.time() + 5.0
    while time.time() < deadline:
        job = client.get(f"/api/v1/training/jobs/{job_id}").json()
        if job["status"] == "completed":
            break
        time.sleep(0.1)

    # 1. Test explainability endpoint
    explain_resp = client.get(f"/api/v1/training/models/{model_id}/explain", params={"row_idx": 0})
    assert explain_resp.status_code == 200
    expl = explain_resp.json()
    assert "local_explanation" in expl
    assert "global_importance" in expl

    # Check that attributions sum up exactly to total difference
    attributions = expl["local_explanation"]["attributions"]
    total_contrib = sum(attr["contribution"] for attr in attributions)
    diff = expl["local_explanation"]["difference"]
    assert abs(total_contrib - diff) < 1e-5

    # 2. Test predict scoring endpoint
    score_content = "feature_a,feature_b\n11,12\n13,14\n"
    score_resp = client.post(
        f"/api/v1/training/models/{model_id}/predict",
        files={"file": ("score.csv", io.BytesIO(score_content.encode()), "text/csv")},
    )
    assert score_resp.status_code == 200
    score_data = score_resp.json()
    assert "target(predicted)" in score_data["columns"]
    assert len(score_data["data"]) == 2
    assert "target(predicted)" in score_data["data"][0]

    # Test predictions download
    filename = score_data["download_filename"]
    dl_resp = client.get("/api/v1/training/predictions/download", params={"filename": filename})
    assert dl_resp.status_code == 200
    assert "text/csv" in dl_resp.headers["content-type"]

    # 3. Test compare models endpoint
    compare_resp = client.get("/api/v1/training/compare", params={"ids": model_id})
    assert compare_resp.status_code == 200
    compare_data = compare_resp.json()
    assert len(compare_data["models"]) == 1
    assert compare_data["models"][0]["id"] == model_id


def test_predict_on_preprocessed_export(client: TestClient) -> None:
    # Train on the iris demo so a real preprocessing pipeline (scaling) exists.
    ds_id = client.post("/api/v1/datasets/demo", json={"type": "iris"}).json()["id"]
    clean_resp = client.post(f"/api/v1/datasets/{ds_id}/cleaning/execute", json={})
    cleaned_ds_id = clean_resp.json()["dataset"]["id"]
    pipe_resp = client.post("/api/v1/pipelines/", json={
        "dataset_id": cleaned_ds_id,
        "target_column": "species",
        "problem_type": "classification"
    })
    pipe_id = pipe_resp.json()["id"]
    client.post(f"/api/v1/pipelines/{pipe_id}/execute")

    train_resp = client.post("/api/v1/training/", json={
        "pipeline_id": pipe_id,
        "algorithms": ["logistic_regression"],
        "cv_folds": 3,
        "tuning_enabled": False
    })
    model_id = train_resp.json()["models"][0]["id"]

    # Wait for training to complete (poll the job).
    job_id = train_resp.json()["job"]["id"]
    deadline = time.time() + 10.0
    while time.time() < deadline:
        if client.get(f"/api/v1/training/jobs/{job_id}").json()["status"] == "completed":
            break
        time.sleep(0.1)

    # The preprocessed test split is already scaled; scoring it WITHOUT the flag
    # re-applies scaling (double preprocessing) and collapses to one class.
    zf_bytes = client.get(f"/api/v1/training/models/{model_id}/export/preprocessed").content
    import zipfile

    with zipfile.ZipFile(io.BytesIO(zf_bytes)) as zf:
        test_csv = zf.read("test_preprocessed.csv")

    bad_resp = client.post(
        f"/api/v1/training/models/{model_id}/predict",
        files={"file": ("test.csv", io.BytesIO(test_csv), "text/csv")},
    )
    bad = bad_resp.json()
    bad_correct = sum(
        1 for row in bad["data"] if row["species"] == row["species(predicted)"]
    )
    bad_acc = bad_correct / len(bad["data"])
    assert bad_acc < 0.8, "double-preprocessed scoring should be inaccurate"

    # With preprocessed=True the preprocessor is skipped and predictions match.
    good_resp = client.post(
        f"/api/v1/training/models/{model_id}/predict?preprocessed=true",
        files={"file": ("test.csv", io.BytesIO(test_csv), "text/csv")},
    )
    assert good_resp.status_code == 200
    good = good_resp.json()
    good_preds = [row["species(predicted)"] for row in good["data"]]
    assert len(set(good_preds)) > 1, "preprocessed scoring should vary across classes"
    correct = sum(
        1 for row in good["data"] if row["species"] == row["species(predicted)"]
    )
    assert correct / len(good["data"]) > 0.8, "preprocessed scoring should be accurate"
    assert bad_acc < correct / len(good["data"]), "preprocessed flag should improve accuracy"
