from fastapi.testclient import TestClient

from app.storage import storage


def test_delete_dataset_without_filepath(client: TestClient) -> None:
    storage.save_dataset(
        {"id": "broken-nopath", "name": "Broken", "session_id": "default_user"}
    )
    resp = client.delete("/api/v1/datasets/broken-nopath")
    assert resp.status_code == 204
    assert storage.get_dataset("broken-nopath") is None
