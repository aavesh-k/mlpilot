"""SQLAlchemy ORM models.

Records carry their full body as a JSON document (mirroring the previous JSON-file
schema) plus a few indexable columns (``id``, ``session_id``, ``created_at``) so
queries stay fast on PostgreSQL and SQLite alike.
"""
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class BaseRecord:
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class DatasetRecord(BaseRecord, Base):
    __tablename__ = "datasets"


class DatasetColumnsRecord(Base):
    __tablename__ = "dataset_columns"

    dataset_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    data: Mapped[list] = mapped_column(JSON, default=list)


class PipelineRecord(BaseRecord, Base):
    __tablename__ = "pipelines"


class ModelRecord(BaseRecord, Base):
    __tablename__ = "models"


class JobRecord(BaseRecord, Base):
    __tablename__ = "training_jobs"


class SettingRecord(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
