from typing import Any

from pydantic import BaseModel


class ClassificationPlotsSchema(BaseModel):
    confusion_matrix: dict[str, Any]
    roc_curve: dict[str, Any]
    pr_curve: dict[str, Any] | None = None
    feature_importance: list[dict[str, Any]]
    classification_report: dict[str, Any]


class RegressionPlotsSchema(BaseModel):
    pred_vs_actual: dict[str, Any]
    residuals: dict[str, Any]
    error_distribution: dict[str, Any]
    feature_importance: list[dict[str, Any]]


class ModelComparisonItemSchema(BaseModel):
    id: str
    name: str
    algorithm: str
    metrics: dict[str, Any]
    is_best: bool


class ModelPlotsResponseSchema(BaseModel):
    problem_type: str
    classification: ClassificationPlotsSchema | None = None
    regression: RegressionPlotsSchema | None = None
    learning_curve: dict[str, Any]
    model_comparison: list[ModelComparisonItemSchema]
