from pydantic import BaseModel, Field


class TrainModelSchema(BaseModel):
    dataset_id: str = Field(min_length=1)
    algorithm: str = Field(pattern=r"^(random_forest|svm|logistic_regression|xgboost)$")
    pipeline_id: str | None = None
    target_column: str | None = None
    test_size: float = Field(default=0.2, ge=0, le=1)
    random_seed: int = Field(default=42, ge=0)
    hyperparameters: dict = Field(default_factory=dict)
    name: str | None = None
