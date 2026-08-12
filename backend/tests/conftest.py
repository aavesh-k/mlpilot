import os

# Isolated in-memory SQLite for tests (StaticPool shared across threads)
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.db import create_all, engine, SessionLocal
from app.main import app
from app.models import (
    SettingRecord,
    JobRecord,
    ModelRecord,
    PipelineRecord,
    DatasetRecord,
    DatasetColumnsRecord,
)


@pytest.fixture(autouse=True, scope="function")
def truncate_tables():
    """Truncate all DB tables before each test function to isolate tests."""
    with SessionLocal() as session:
        for model in [
            SettingRecord,
            JobRecord,
            ModelRecord,
            PipelineRecord,
            DatasetRecord,
            DatasetColumnsRecord,
        ]:
            session.execute(delete(model.__table__))
        session.commit()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)