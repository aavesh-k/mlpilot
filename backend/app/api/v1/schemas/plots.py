from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class ClassificationPlotsSchema(BaseModel):
    confusion_matrix: Dict[str, Any]
    roc_curve: Dict[str, Any]
    pr_curve: Optional[Dict[str, Any]] = None
    feature_importance: List[Dict[str, Any]]
    classification_report: Dict[str, Any]


class RegressionPlotsSchema(BaseModel):
    pred_vs_actual: Dict[str, Any]
    residuals: Dict[str, Any]
    error_distribution: Dict[str, Any]
    feature_importance: List[Dict[str, Any]]


class ModelComparisonItemSchema(BaseModel):
    id: str
    name: str
    algorithm: str
    metrics: Dict[str, Any]
    is_best: bool


class ModelPlotsResponseSchema(BaseModel):
    problem_type: str
    classification: Optional[ClassificationPlotsSchema] = None
    regression: Optional[RegressionPlotsSchema] = None
    learning_curve: Dict[str, Any]
    model_comparison: List[ModelComparisonItemSchema]
