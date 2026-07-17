import io
import time
import zipfile
from fastapi.testclient import TestClient


def _upload_csv(client: TestClient) -> str:
    content = (
        "feature_a,feature_b,target\n"
        + "\n".join(f"{i},{i * 2},{1 if i > 25 else 0}" for i in range(1, 51))
    )
    resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("train.csv", io.BytesIO(content.encode()), "text/csv")},
    )
    return resp.json()["id"]


def _wait_for_job(client: TestClient, job_id: str, timeout: float = 15.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = client.get(f"/api/v1/training/jobs/{job_id}")
        job = resp.json()
        if job["status"] in ("completed", "failed", "cancelled"):
            return job
        time.sleep(0.2)
    raise TimeoutError(f"Job {job_id} did not complete within {timeout}s")


def test_model_export_endpoints(client: TestClient) -> None:
    ds_id = _upload_csv(client)

    # 1. Create pipeline
    pipe_resp = client.post("/api/v1/pipelines/", json={
        "dataset_id": ds_id,
        "target_column": "target",
        "problem_type": "classification"
    })
    assert pipe_resp.status_code == 201
    pipe_id = pipe_resp.json()["id"]

    # 2. Execute pipeline
    exec_resp = client.post(f"/api/v1/pipelines/{pipe_id}/execute")
    assert exec_resp.status_code == 200
    assert exec_resp.json()["status"] == "completed"

    # 3. Train models
    train_resp = client.post("/api/v1/training/", json={
        "pipeline_id": pipe_id,
        "algorithms": ["logistic_regression"],
        "cv_folds": 2,
        "tuning_enabled": False
    })
    assert train_resp.status_code == 201
    data = train_resp.json()
    model_id = data["models"][0]["id"]

    # Wait for completion
    _wait_for_job(client, data["job"]["id"])

    # 4. Test Cleaned Export
    cleaned_resp = client.get(f"/api/v1/training/models/{model_id}/export/cleaned")
    assert cleaned_resp.status_code == 200
    assert "text/csv" in cleaned_resp.headers["content-type"]
    assert "feature_a,feature_b" in cleaned_resp.text

    # 5. Test Preprocessed Export
    prep_resp = client.get(f"/api/v1/training/models/{model_id}/export/preprocessed")
    assert prep_resp.status_code == 200
    assert "application/zip" in prep_resp.headers["content-type"]
    
    # Read Zip
    zip_bytes = io.BytesIO(prep_resp.content)
    with zipfile.ZipFile(zip_bytes) as zf:
        namelist = zf.namelist()
        assert "train_preprocessed.csv" in namelist

    # 6. Test Recipe Export
    recipe_resp = client.get(f"/api/v1/training/models/{model_id}/export/recipe")
    assert recipe_resp.status_code == 200
    assert "application/zip" in recipe_resp.headers["content-type"]
    
    zip_bytes_recipe = io.BytesIO(recipe_resp.content)
    with zipfile.ZipFile(zip_bytes_recipe) as zf:
        namelist = zf.namelist()
        assert "recipe.json" in namelist
        assert "recipe.py" in namelist
        recipe_py_content = zf.read("recipe.py").decode()
        assert "def clean_data" in recipe_py_content
        assert "model.pkl" in recipe_py_content

    # 7. Test HTML Report Export
    report_resp = client.get(f"/api/v1/training/models/{model_id}/export/report")
    assert report_resp.status_code == 200
    assert "text/html" in report_resp.headers["content-type"]
    assert "<!DOCTYPE html>" in report_resp.text
    assert "MLPilot Executive AutoML Report" in report_resp.text
    assert "data:image/png;base64," in report_resp.text
