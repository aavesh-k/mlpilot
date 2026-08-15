import uuid

from app.storage import storage


def _make_chain(ds_id, pl_id, m_id):
    storage.save_dataset({"id": ds_id, "name": "ds", "status": "ready", "is_cleaned": False})
    storage.save_pipeline({"id": pl_id, "dataset_id": ds_id, "name": "pl", "status": "completed"})
    storage.save_model(
        {"id": m_id, "dataset_id": ds_id, "pipeline_id": pl_id, "name": "m", "status": "completed"}
    )
    model_dir = storage._base / "models" / m_id
    proc_dir = storage._base / "processed" / pl_id
    model_dir.mkdir(parents=True, exist_ok=True)
    proc_dir.mkdir(parents=True)
    return model_dir, proc_dir


def test_delete_dataset_cascades_pipelines_and_models():
    ds_id, pl_id, m_id = (f"ds_{uuid.uuid4().hex}", f"pl_{uuid.uuid4().hex}", f"m_{uuid.uuid4().hex}")
    model_dir, proc_dir = _make_chain(ds_id, pl_id, m_id)

    storage.delete_pipelines_by_dataset(ds_id)
    storage.delete_models_by_dataset(ds_id)
    storage.delete_dataset(ds_id)

    assert storage.get_pipeline(pl_id) is None
    assert storage.get_model(m_id) is None
    assert storage.get_dataset(ds_id) is None
    assert not model_dir.exists()
    assert not proc_dir.exists()


def test_delete_pipeline_cascades_models_but_keeps_dataset():
    ds_id, pl_id, m_id = (f"ds_{uuid.uuid4().hex}", f"pl_{uuid.uuid4().hex}", f"m_{uuid.uuid4().hex}")
    model_dir, proc_dir = _make_chain(ds_id, pl_id, m_id)

    storage.delete_pipeline_cascade(pl_id)

    assert storage.get_pipeline(pl_id) is None
    assert storage.get_model(m_id) is None
    assert not model_dir.exists()
    assert not proc_dir.exists()
    # Source dataset must survive a pipeline deletion.
    assert storage.get_dataset(ds_id) is not None
