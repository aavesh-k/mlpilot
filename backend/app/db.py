"""Database engine + session factory.

The application supports both PostgreSQL (production) and SQLite (local dev/tests)
through the ``DATABASE_URL`` setting. SQLAlchemy handles the dialect differences;
record bodies are stored as JSON documents alongside indexable columns.
"""
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

if settings.DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
    _pool_kwargs = {}
    if ":memory:" in settings.DATABASE_URL:
        from sqlalchemy.pool import StaticPool

        _pool_kwargs = {"poolclass": StaticPool}
else:
    _connect_args = {}
    _pool_kwargs = {}


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    **_pool_kwargs,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def create_all() -> None:
    """Create all tables (used for empty/local databases)."""
    # Ensure metadata is imported before creation
    from app import models  # noqa: F401

    Base.metadata.create_all(engine)


@contextmanager
def session_scope():
    """Context-managed ORM session that commits on success, rolls back on error."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()