from datetime import UTC, datetime, timedelta
from pathlib import Path

from sklearn.linear_model import Ridge

from app.api.v1.endpoints.training import _attach_eta, load_artifact, save_artifact


def test_save_and_load_artifact_compressed(tmp_path: Path):
    model = Ridge(alpha=0.5)
    model.fit([[1, 2], [3, 4]], [10, 20])

    target_file = tmp_path / "model.pkl"
    save_artifact(model, target_file)

    assert target_file.exists()
    assert target_file.stat().st_size > 0

    loaded = load_artifact(target_file)
    assert isinstance(loaded, Ridge)
    assert loaded.alpha == 0.5
    assert loaded.predict([[1, 2]])[0] == model.predict([[1, 2]])[0]


def test_attach_eta_counts_down():
    now = datetime.now(UTC)
    started = (now - timedelta(seconds=60)).isoformat()

    # Job at 50% after 60s -> remaining ~60s
    job = {
        "status": "running",
        "progress": 50.0,
        "run_started_at": started,
        "progress_updated_at": now.isoformat(),
    }
    _attach_eta(job)
    assert job["eta_seconds"] is not None
    assert 55.0 <= job["eta_seconds"] <= 65.0


def test_attach_eta_stalled_job_clears_eta():
    now = datetime.now(UTC)
    started = (now - timedelta(seconds=1200)).isoformat()
    last_update = (now - timedelta(seconds=700)).isoformat()  # > 10 min stall

    job = {
        "status": "running",
        "progress": 35.0,
        "run_started_at": started,
        "progress_updated_at": last_update,
    }
    _attach_eta(job)
    # Stalled job should have eta_seconds = None, preventing runaway inflation
    assert job["eta_seconds"] is None


def test_attach_eta_completed_has_none():
    job = {
        "status": "completed",
        "progress": 100.0,
        "run_started_at": datetime.now(UTC).isoformat(),
    }
    _attach_eta(job)
    assert job["eta_seconds"] is None
