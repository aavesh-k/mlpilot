import os

from app.storage import storage


def test_atomic_json_write_retries_on_permission_error(tmp_path) -> None:
    target = tmp_path / "progress.json"
    state = {"calls": 0}
    real_replace = os.replace

    def flaky_replace(src, dst):
        state["calls"] += 1
        if state["calls"] <= 2:
            raise PermissionError("[WinError 5] Access is denied")
        return real_replace(src, dst)

    original = os.replace
    os.replace = flaky_replace
    try:
        storage._atomic_json_write(target, {"step": "done"})
    finally:
        os.replace = original

    assert target.exists()
    assert state["calls"] == 3
