import io
import time
import zipfile

import pandas as pd


def _make_categorical_csv(n: int = 60) -> bytes:
    rng = __import__("numpy").random.default_rng(0)
    cat = rng.choice(["x", "y", "z"], size=n)
    df = pd.DataFrame(
        {
            "num_a": rng.normal(0, 1, n).round(3),
            "num_b": rng.normal(5, 2, n).round(3),
            "cat": cat,
            "target": (rng.normal(0, 1, n) + (cat == "x").astype(float)).round(3),
        }
    )
    return df.to_csv(index=False).encode()


def test_predict_autodetects_preprocessed_categorical(client: "TestClient") -> None:  # noqa: F821
    # Upload a dataset with a categorical column so the fitted preprocessing
    # pipeline one-hot encodes it (raw feature != processed feature sets).
    csv = _make_categorical_csv()
    up = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("cat.csv", io.BytesIO(csv), "text/csv")},
        data={"name": "catdata"},
    )
    assert up.status_code == 201, up.text
    ds_id = up.json()["id"]

    client.post(f"/api/v1/datasets/{ds_id}/cleaning/execute", json={})

    pipe = client.post(
        "/api/v1/pipelines/",
        json={"dataset_id": ds_id, "target_column": "target", "problem_type": "regression"},
    )
    assert pipe.status_code == 201, pipe.text
    pipe_id = pipe.json()["id"]
    client.post(f"/api/v1/pipelines/{pipe_id}/execute")

    train = client.post(
        "/api/v1/training/",
        json={
            "pipeline_id": pipe_id,
            "algorithms": ["linear_regression"],
            "cv_folds": 2,
            "tuning_enabled": False,
        },
    )
    assert train.status_code == 201, train.text
    model_id = train.json()["models"][0]["id"]
    job_id = train.json()["job"]["id"]
    deadline = time.time() + 20.0
    while time.time() < deadline:
        if client.get(f"/api/v1/training/jobs/{job_id}").json()["status"] == "completed":
            break
        time.sleep(0.1)

    # The preprocessed test split has cat one-hot encoded (cat_x/cat_y/cat_z) and
    # no longer contains the raw `cat` column -> its columns differ from the raw
    # training features.
    zf_bytes = client.get(f"/api/v1/training/models/{model_id}/export/preprocessed").content
    with zipfile.ZipFile(io.BytesIO(zf_bytes)) as zf:
        test_csv = zf.read("test_preprocessed.csv")

    # Re-scoring the exported split WITHOUT the preprocessed flag must now be
    # auto-detected as preprocessed (instead of failing with a feature mismatch).
    resp = client.post(
        f"/api/v1/training/models/{model_id}/predict",
        files={"file": ("test.csv", io.BytesIO(test_csv), "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    assert "cat" not in resp.json()["columns"]
    assert "cat_x" in resp.json()["columns"] or any(
        c.startswith("cat_") for c in resp.json()["columns"]
    )

    # And with the explicit flag it still works.
    flag_resp = client.post(
        f"/api/v1/training/models/{model_id}/predict?preprocessed=true",
        files={"file": ("test.csv", io.BytesIO(test_csv), "text/csv")},
    )
    assert flag_resp.status_code == 200, flag_resp.text
