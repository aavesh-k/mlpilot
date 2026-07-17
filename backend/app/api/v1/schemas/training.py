from pydantic import BaseModel, Field


class TrainModelSchema(BaseModel):
    pipeline_id: str | None = None
    dataset_id: str | None = None
    algorithm: str | None = None
    algorithms: list[str] = Field(default_factory=list)
    cv_folds: int = Field(default=5, ge=2, le=10)
    primary_metric: str | None = None
    tuning_enabled: bool = Field(default=True)
    test_size: float = Field(default=0.2, ge=0, le=1)
    random_seed: int = Field(default=42, ge=0)
    hyperparameters: dict = Field(default_factory=dict)
    target_column: str | None = None
    name: str | None = None


