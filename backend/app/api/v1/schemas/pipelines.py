from pydantic import BaseModel, Field, model_validator


class PipelineStepSchema(BaseModel):
    step_type: str = Field(pattern=r"^(imputation|encoding|scaling|train_test_split)$")
    config: dict = Field(default_factory=dict)
    columns: list[str] | None = None


class CreatePipelineSchema(BaseModel):
    dataset_id: str = Field(min_length=1)
    name: str | None = None
    steps: list[PipelineStepSchema] = Field(min_length=1, max_length=10)
    test_split_ratio: float = Field(default=0.2, ge=0, le=1)
    random_seed: int = Field(default=42, ge=0)


class UpdatePipelineSchema(BaseModel):
    name: str | None = None
    steps: list[PipelineStepSchema] | None = None
    test_split_ratio: float | None = Field(default=None, ge=0, le=1)
    random_seed: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "UpdatePipelineSchema":
        if self.name is None and self.steps is None and self.test_split_ratio is None and self.random_seed is None:
            raise ValueError("At least one field must be provided")
        return self
