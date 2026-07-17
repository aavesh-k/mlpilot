from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


class ColumnMissingStrategy(BaseModel):
    column: str
    strategy: Literal["drop_row", "drop_column", "mean", "median", "mode", "knn", "ffill", "bfill"]


class ColumnOutlierStrategy(BaseModel):
    column: str
    strategy: Literal["winsorize", "remove", "leave"]


class RunCleaningSchema(BaseModel):
    remove_duplicates: bool = True
    missing_strategies: list[ColumnMissingStrategy] = Field(default_factory=list)
    outlier_strategies: list[ColumnOutlierStrategy] = Field(default_factory=list)
    fix_dtype_issues: bool = True
    standardize_categorical: bool = True
    drop_constant_columns: bool = True
    name: str | None = None


class CleaningLogEntry(BaseModel):
    step: str
    description: str
    columns_affected: list[str]
    rows_affected: int
    cells_affected: int
    details: str


class ColumnChange(BaseModel):
    column: str
    before_dtype: str
    after_dtype: str
    before_missing: int
    after_missing: int
    before_missing_pct: float
    after_missing_pct: float
    changes: list[str]


class SnapshotStats(BaseModel):
    row_count: int
    column_count: int
    total_missing: int
    total_missing_pct: float
    duplicate_count: int
    duplicate_pct: float


class CleaningReport(BaseModel):
    dataset_id: str
    run_id: str
    created_at: str
    config: dict
    steps: list[CleaningLogEntry]
    before: SnapshotStats
    after: SnapshotStats
    column_changes: list[ColumnChange]


class ColumnSuggestion(BaseModel):
    name: str
    dtype: str
    is_numeric: bool
    is_categorical: bool
    missing_count: int
    missing_pct: float
    outlier_count: int | None
    outlier_pct: float | None
    unique_count: int | None
    suggested_missing_strategy: str
    suggested_outlier_strategy: str


class CleaningSuggestions(BaseModel):
    dataset_id: str
    columns: list[ColumnSuggestion]
    suggested_config: RunCleaningSchema
