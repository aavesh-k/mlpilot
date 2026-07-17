from pydantic import BaseModel, Field


class EncodingConfigSchema(BaseModel):
    strategy: str = Field(default="auto", pattern=r"^(auto|one_hot|target|frequency)$")
    passthrough_columns: list[str] = Field(default_factory=list)
    scale_columns: list[str] | None = None


class ScalingConfigSchema(BaseModel):
    strategy: str = Field(default="auto", pattern=r"^(auto|standard|minmax|robust)$")


class SplitConfigSchema(BaseModel):
    test_size: float = Field(default=0.2, ge=0, le=1)
    random_seed: int = Field(default=42, ge=0)
    stratify: bool = True


class FeatureSelectionConfigSchema(BaseModel):
    enabled: bool = False
    drop_near_zero_variance: bool = False
    variance_threshold: float = Field(default=0.01, ge=0)
    drop_high_correlation: bool = False
    correlation_threshold: float = Field(default=0.95, ge=0, le=1)


class CreatePipelineSchema(BaseModel):
    dataset_id: str = Field(min_length=1)
    target_column: str = Field(min_length=1)
    problem_type: str | None = Field(default=None, pattern=r"^(classification|regression)$")
    name: str | None = None
    encoding: EncodingConfigSchema = Field(default_factory=EncodingConfigSchema)
    scaling: ScalingConfigSchema = Field(default_factory=ScalingConfigSchema)
    split: SplitConfigSchema = Field(default_factory=SplitConfigSchema)
    feature_selection: FeatureSelectionConfigSchema = Field(default_factory=FeatureSelectionConfigSchema)
    use_smote: bool = False
    use_class_weight: bool = False
