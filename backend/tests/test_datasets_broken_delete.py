from fastapi.testclient import TestClient

from app.storage import storage


def test_delete_dataset_without_filepath(client: TestClient) -> None:
    # Save as test user so per-user isolation finds it
    test_user = storage.get_user_by_email("test_user@example.com")
    if not test_user:
        from app.core.security import hash_password

        test_user = storage.create_user(email="test_user@example.com", hashed_password=hash_password("Test1234"))
    storage.save_dataset(
        {"id": "broken-nopath", "name": "Broken", "user_id": test_user["id"]}
    )
    resp = client.delete("/api/v1/datasets/broken-nopath")
    assert resp.status_code == 204
    assert storage.get_dataset("broken-nopath") is None
