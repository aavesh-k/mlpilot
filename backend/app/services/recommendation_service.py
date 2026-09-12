from __future__ import annotations

import contextlib
from typing import Any

from app.core.io import read_dataframe
from app.services.preprocessing_service import detect_problem_type
from app.storage import storage

# Algorithm metadata used for display + scoring
ALGO_META: dict[str, dict[str, str]] = {
    # classification
    "logistic_regression": {"label": "Logistic Regression", "family": "linear"},
    "random_forest": {"label": "Random Forest", "family": "ensemble"},
    "xgboost": {"label": "XGBoost", "family": "ensemble"},
    "svm": {"label": "SVM", "family": "kernel"},
    "knn": {"label": "KNN", "family": "instance"},
    # regression
    "linear_regression": {"label": "Linear Regression", "family": "linear"},
    "ridge": {"label": "Ridge", "family": "linear"},
    "lasso": {"label": "Lasso", "family": "linear"},
    "random_forest_regressor": {"label": "Random Forest Regressor", "family": "ensemble"},
    "xgboost_regressor": {"label": "XGBoost Regressor", "family": "ensemble"},
}

CLASSIFICATION_ALGOS = ["logistic_regression", "random_forest", "xgboost", "svm", "knn"]
REGRESSION_ALGOS = ["linear_regression", "ridge", "lasso", "random_forest_regressor", "xgboost_regressor"]


def _estimate_time(algo: str, rows: int) -> str:
    if algo in ("logistic_regression", "linear_regression", "ridge", "lasso"):
        if rows < 5_000:
            return "5-15s"
        if rows < 20_000:
            return "10-30s"
        return "20-60s"
    if algo in ("random_forest", "random_forest_regressor"):
        if rows < 5_000:
            return "15-40s"
        if rows < 20_000:
            return "30-90s"
        return "1-3m"
    if algo in ("xgboost", "xgboost_regressor"):
        if rows < 5_000:
            return "15-45s"
        if rows < 20_000:
            return "30-90s"
        return "1-4m"
    if algo == "svm":
        if rows < 1_000:
            return "5-15s"
        if rows < 5_000:
            return "20-60s"
        if rows < 10_000:
            return "1-3m"
        return "3-10m+"
    if algo == "knn":
        if rows < 1_000:
            return "5-10s"
        if rows < 5_000:
            return "15-40s"
        if rows < 10_000:
            return "30-90s"
        return "2-8m+"
    return "10-30s"


def _suitability_label(score: int) -> str:
    if score >= 75:
        return "recommended"
    if score >= 55:
        return "consider"
    return "not_recommended"


def _build_profile_from_report(
    dataset: dict,
    report: dict | None,
    problem_type: str | None = None,
    pipeline: dict | None = None,
) -> dict[str, Any]:
    # Row/col counts
    rows = int(dataset.get("row_count") or 0)
    columns = int(dataset.get("column_count") or 0)
    if report and report.get("shape"):
        rows = int(report["shape"].get("rows", rows) or rows)
        columns = int(report["shape"].get("columns", columns) or columns)

    # Try dataframe for numeric/categorical breakdown when report missing columns counts
    n_numeric = 0
    n_categorical = 0
    has_text = False
    has_datetime = False
    if report and report.get("columns"):
        for col in report["columns"]:
            dtype = str(col.get("dtype", ""))
            if dtype.startswith(("int", "float", "complex", "number")):
                n_numeric += 1
            elif dtype in ("object", "category", "string"):
                n_categorical += 1
            if "datetime" in dtype.lower():
                has_datetime = True

    # EDA-derived flags
    missing_list = report.get("missingness", []) if report else []
    has_missing = len(missing_list) > 0
    missing_pct = 0.0
    if missing_list:
        missing_pct = max(float(m.get("percent", 0)) for m in missing_list)

    cat_summary = report.get("categorical_summary", []) if report else []
    has_high_cardinality = any(bool(c.get("high_cardinality")) for c in cat_summary)
    high_card_cols = [c["column"] for c in cat_summary if c.get("high_cardinality")]

    outliers = report.get("outliers", []) if report else []
    has_outliers = any(o.get("count", 0) > 0 for o in outliers)
    outlier_max_pct = max((float(o.get("percent", 0)) for o in outliers), default=0.0)

    high_corr = report.get("high_correlations", []) if report else []
    has_high_corr = len(high_corr) > 0

    potential_targets = report.get("potential_targets", []) if report else []

    # Class balance / n_classes from pipeline or potential_targets
    n_classes: int | None = None
    imbalance_ratio: float | None = None
    imbalanced = False
    detected_problem = problem_type

    if pipeline:
        # Use pipeline imbalance if present
        imb = pipeline.get("imbalance")
        if imb:
            n_classes = int(imb.get("class_count", 0) or 0) or None
            imbalance_ratio = float(imb.get("imbalance_ratio", 0) or 0) or None
            imbalanced = bool(imb.get("is_imbalanced", False))
            if imbalance_ratio is None and imb.get("imbalance_ratio") is not None:
                with contextlib.suppress(Exception):
                    imbalance_ratio = float(imb["imbalance_ratio"])
        # fallback to pipeline problem_type
        if not detected_problem:
            detected_problem = pipeline.get("problem_type")

    # If still unknown, try potential_targets (first imbalanced or first)
    if n_classes is None and potential_targets:
        # Prefer the target that matches pipeline target_column if pipeline present
        target_col = pipeline.get("target_column") if pipeline else None
        chosen = None
        if target_col:
            for t in potential_targets:
                if t.get("column") == target_col:
                    chosen = t
                    break
        if chosen is None:
            chosen = potential_targets[0]
        n_classes = int(chosen.get("class_count", 0) or 0) or None
        imbalance_ratio = float(chosen.get("imbalance_ratio", 0) or 0) or None
        imbalanced = bool(chosen.get("is_imbalanced", False))
        if not detected_problem:
            detected_problem = "classification"

    # Enrich from dataframe when EDA report is unavailable (common for new pipelines)
    _df_cached: Any | None = None
    if (n_numeric == 0 and n_categorical == 0) or (not has_missing and report is None):
        try:
            _df_cached = read_dataframe(dataset)
            df = _df_cached
            if n_numeric == 0 and n_categorical == 0:
                import pandas as pd

                n_numeric = int(len(df.select_dtypes(include=["number"]).columns))
                n_categorical = int(len(df.select_dtypes(include=["object", "category", "string"]).columns))
                for col in df.columns:
                    if pd.api.types.is_datetime64_any_dtype(df[col]):
                        has_datetime = True
                    elif df[col].dtype == "object":
                        sample = df[col].dropna().head(20).astype(str)
                        if len(sample) > 0 and sample.str.len().mean() > 40:
                            has_text = True
                        try:
                            parsed = pd.to_datetime(sample, errors="coerce")
                            if parsed.notna().mean() > 0.7:
                                has_datetime = True
                        except Exception:
                            pass
                if rows == 0:
                    rows = len(df)
                if columns == 0:
                    columns = len(df.columns)
                if not has_missing:
                    has_missing = bool(df.isna().any().any())
                    if has_missing:
                        missing_pct = float(df.isna().mean().max())
            elif not has_missing:
                # Report existed but had no missing; double-check dataframe if report was None
                df = _df_cached if _df_cached is not None else read_dataframe(dataset)
                has_missing = bool(df.isna().any().any())
                if has_missing:
                    missing_pct = float(df.isna().mean().max())
        except Exception:
            pass

    # If still unknown and we have dataset file, try to infer via dataframe (cheap)
    if not detected_problem or n_classes is None:
        try:
            df = _df_cached if _df_cached is not None else read_dataframe(dataset)
            # refine numeric/categorical counts from df if report was empty
            if n_numeric == 0 and n_categorical == 0:
                import pandas as pd

                n_numeric = int(len(df.select_dtypes(include=["number"]).columns))
                n_categorical = int(len(df.select_dtypes(include=["object", "category", "string"]).columns))
                # text: long strings, datetime detection
                for col in df.columns:
                    if pd.api.types.is_datetime64_any_dtype(df[col]):
                        has_datetime = True
                    elif df[col].dtype == "object":
                        sample = df[col].dropna().head(20).astype(str)
                        if len(sample) > 0 and sample.str.len().mean() > 40:
                            has_text = True
                        # also try datetime parse
                        try:
                            parsed = pd.to_datetime(sample, errors="coerce")
                            if parsed.notna().mean() > 0.7:
                                has_datetime = True
                        except Exception:
                            pass
                if rows == 0:
                    rows = len(df)
                if columns == 0:
                    columns = len(df.columns)
                # has_missing fallback
                if not has_missing:
                    has_missing = bool(df.isna().any().any())
                    if has_missing:
                        missing_pct = float(df.isna().mean().max())

            # infer problem_type from last column if not set
            if not detected_problem:
                # If pipeline target known, use that column else last column
                target_col_guess = pipeline.get("target_column") if pipeline and pipeline.get("target_column") else df.columns[-1]
                if target_col_guess in df.columns:
                    detected_problem = detect_problem_type(df[target_col_guess])
                    if detected_problem == "invalid":
                        detected_problem = "classification"
                    if detected_problem == "classification" and n_classes is None:
                        n_classes = int(df[target_col_guess].nunique())
                        # compute imbalance
                        vc = df[target_col_guess].value_counts(dropna=True)
                        if len(vc) >= 2 and len(vc) <= 50:
                            majority = float(vc.iloc[0])
                            minority = float(vc.iloc[-1])
                            imbalance_ratio = float(majority / minority) if minority else 999.0
                            imbalanced = bool(imbalance_ratio > 2.0)
                    if detected_problem == "regression":
                        n_classes = None
                else:
                    detected_problem = "classification"
        except Exception:
            # fallback
            if not detected_problem:
                detected_problem = "classification"

    if detected_problem not in ("classification", "regression"):
        detected_problem = "classification"

    # Profile notes for UI
    notes: list[str] = []
    if imbalanced and imbalance_ratio is not None:
        notes.append(f"Imbalanced target (ratio {imbalance_ratio:.1f}) — ranking by f1")
    if has_missing:
        notes.append(f"Missing values {missing_pct*100:.1f}% — prefer imputation-robust models")
    if has_high_cardinality:
        notes.append("High-cardinality categoricals — prefer tree ensembles")
    if has_high_corr:
        notes.append("High feature correlations — consider regularization/selection")
    if has_outliers and outlier_max_pct > 0.05:
        notes.append("Outliers present — robust scaling recommended")
    if rows > 10000:
        notes.append(f"Large dataset ({rows:,} rows) — SVM/KNN may be slow")
    if rows < 1000:
        notes.append("Small dataset — simpler baselines recommended")

    profile_type = "tabular"
    if has_text and has_datetime:
        profile_type = "mixed_text_time"
    elif has_text:
        profile_type = "text_heavy"
    elif has_datetime:
        profile_type = "time_aware"

    return {
        "rows": rows,
        "columns": columns,
        "n_numeric": n_numeric,
        "n_categorical": n_categorical,
        "n_classes": n_classes,
        "has_missing": has_missing,
        "missing_pct": round(float(missing_pct), 4),
        "has_high_cardinality": has_high_cardinality,
        "high_cardinality_cols": high_card_cols,
        "has_outliers": has_outliers,
        "outlier_max_pct": round(float(outlier_max_pct), 4),
        "has_high_corr": has_high_corr,
        "has_text": has_text,
        "has_datetime": has_datetime,
        "profile_type": profile_type,
        "imbalanced": imbalanced,
        "imbalance_ratio": round(float(imbalance_ratio), 2) if imbalance_ratio is not None else None,
        "notes": notes,
    }


def _score_algorithm(algo: str, profile: dict[str, Any], problem_type: str) -> tuple[int, list[str]]:
    rows: int = int(profile.get("rows", 0) or 0)
    columns: int = int(profile.get("columns", 0) or 0)
    has_missing: bool = bool(profile.get("has_missing", False))
    missing_pct: float = float(profile.get("missing_pct", 0) or 0)
    has_high_cardinality: bool = bool(profile.get("has_high_cardinality", False))
    has_outliers: bool = bool(profile.get("has_outliers", False))
    outlier_max_pct: float = float(profile.get("outlier_max_pct", 0) or 0)
    has_high_corr: bool = bool(profile.get("has_high_corr", False))
    imbalanced: bool = bool(profile.get("imbalanced", False))
    n_classes: int | None = profile.get("n_classes")

    # Base score — slight prior for reliably strong models
    base = 68
    if algo in ("random_forest", "xgboost", "random_forest_regressor", "xgboost_regressor"):
        base = 72
    elif algo in ("logistic_regression", "ridge", "lasso", "linear_regression"):
        base = 66
    # SVM/KNN start a bit lower due to scaling sensitivity
    elif algo in ("svm", "knn"):
        base = 60

    score = base
    reasons: list[str] = []

    # Dataset size penalties / bonuses
    if rows < 800:
        if algo in ("logistic_regression", "linear_regression", "ridge", "lasso"):
            score += 10
            reasons.append("Small dataset — linear/regularized baselines generalize well")
        elif algo in ("xgboost", "xgboost_regressor"):
            score -= 8
            reasons.append("Small dataset — XGB may overfit; simpler models often win")
        elif algo in ("random_forest", "random_forest_regressor"):
            score += 2
            reasons.append("Handles nonlinear interactions even on small data")
    elif rows < 10_000:
        if algo in ("random_forest", "xgboost", "random_forest_regressor", "xgboost_regressor"):
            score += 8
            reasons.append("Mid-size tabular — ensembles excel")
        elif algo in ("logistic_regression", "ridge"):
            score += 4
            reasons.append("Fast baseline, good calibration")
    else:  # large
        if algo in ("svm", "knn"):
            penalty = 28 if rows > 50_000 else 22
            score -= penalty
            reasons.append(f"Large dataset ({rows:,} rows) — SVM/KNN scales poorly (3-10m+)")
        elif algo in ("random_forest", "xgboost", "random_forest_regressor", "xgboost_regressor"):
            score += 6
            reasons.append("Scales well to large tabular data")
        elif algo in ("logistic_regression", "ridge", "lasso", "linear_regression"):
            score += 4
            reasons.append("Linear models train fast at scale")

    # Missing values
    if has_missing:
        if algo in ("random_forest", "xgboost", "random_forest_regressor", "xgboost_regressor"):
            score += 10
            reasons.append("Handles missing/non-linear interactions (imputation in pipeline)")
        elif algo in ("logistic_regression", "svm", "knn", "linear_regression", "ridge", "lasso"):
            deduction = 14 if missing_pct > 0.05 else 8
            score -= deduction
            reasons.append(f"Sensitive to missing values ({missing_pct*100:.1f}% missing) — requires imputation")

    # High cardinality
    if has_high_cardinality:
        if algo in ("random_forest", "xgboost", "random_forest_regressor", "xgboost_regressor"):
            score += 6
            reasons.append("High-cardinality categoricals — tree ensembles handle via target/frequency encoding")
        elif algo in ("svm", "knn", "logistic_regression"):
            score -= 10
            reasons.append("High-cardinality categoricals blow up OHE dimensions — slow + overfit risk")

    # High dimensionality (columns > rows or >50 cols)
    high_dim = (columns > 60) or (rows > 0 and columns > rows * 0.5 and columns > 20)
    if high_dim:
        if algo in ("lasso", "ridge", "logistic_regression"):
            score += 8
            reasons.append("High-dimensional — regularization helps")
        elif algo in ("svm", "knn"):
            score -= 12
            reasons.append("High-dimensional — distance/kernel methods degrade")

    # Correlation
    if has_high_corr and algo in ("lasso", "ridge", "logistic_regression", "linear_regression"):
        score += 4
        # only add if not already verbose
        if len(reasons) < 3:
            reasons.append("High feature correlations — L1/L2 regularization helps")

    # Outliers
    if has_outliers and outlier_max_pct > 0.05:
        if algo in ("random_forest", "xgboost", "random_forest_regressor", "xgboost_regressor", "ridge"):
            # RF/XGB robust, Ridge slightly less but okay
            if len(reasons) < 3:
                reasons.append("Robust to outliers (tree-based / robust scaling)")
        elif algo in ("linear_regression", "lasso", "svm", "knn"):
            score -= 6
            if len(reasons) < 3:
                reasons.append("Sensitive to outliers — consider robust scaling/winsorization")

    # Imbalance (classification only)
    if problem_type == "classification" and imbalanced:
        if algo in ("random_forest", "xgboost"):
            score += 8
            if len(reasons) < 3:
                reasons.append("Imbalanced target — ensembles with class_weight/SMOTE excel")
        elif algo in ("logistic_regression",):
            score += 3
            if len(reasons) < 3:
                reasons.append("Imbalanced — class weighting available")
        elif algo in ("svm", "knn"):
            score -= 6
            if len(reasons) < 3:
                reasons.append("Imbalanced — distance methods struggle without resampling")

    # Many classes
    if n_classes is not None and n_classes > 6:
        if algo == "svm":
            score -= 10
            reasons.append("Many classes (>6) — SVM one-vs-one overhead")
        elif algo == "knn":
            score -= 6
            if len(reasons) < 3:
                reasons.append("Many classes — KNN decision boundaries noisy")

    # Clamp and deduplicate reasons
    score = max(10, min(98, int(round(score))))
    # Keep 1-3 most relevant reasons, ensure at least one
    if not reasons:
        if algo in ("random_forest", "random_forest_regressor"):
            reasons = ["Balanced ensemble — strong default for tabular"]
        elif algo in ("xgboost", "xgboost_regressor"):
            reasons = ["State-of-the-art gradient boosting for tabular"]
        elif algo in ("logistic_regression", "linear_regression"):
            reasons = ["Fast linear baseline"]
        elif algo in ("ridge", "lasso"):
            reasons = ["Regularized linear — stable on noisy/high-dim data"]
        elif algo == "svm":
            reasons = ["Strong on small, clean, low-dim data"]
        elif algo == "knn":
            reasons = ["Instance-based — good for small, low-dim datasets"]
    # Cap to 3
    reasons = reasons[:3]
    return score, reasons


def get_recommendations(
    dataset_id: str | None = None,
    pipeline_id: str | None = None,
    session_id: str | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    if (dataset_id is None) == (pipeline_id is None):
        raise ValueError("Exactly one of dataset_id / pipeline_id is required")

    pipeline = None
    resolved_dataset_id = dataset_id
    if pipeline_id:
        pipeline = storage.get_pipeline(pipeline_id, session_id=session_id, user_id=user_id)
        if not pipeline:
            # try without session isolation for better error msg? storage already handles
            raise LookupError(f"Pipeline {pipeline_id} not found")
        resolved_dataset_id = pipeline.get("dataset_id")
        if not resolved_dataset_id:
            raise LookupError(f"Pipeline {pipeline_id} has no dataset")

    if not resolved_dataset_id:
        raise LookupError("No dataset resolved")

    dataset = storage.get_dataset(resolved_dataset_id, session_id=session_id, user_id=user_id)
    if not dataset:
        raise LookupError(f"Dataset {resolved_dataset_id} not found")

    report = storage.get_eda_report(resolved_dataset_id)

    # Determine problem_type upfront for candidate filtering
    problem_type = None
    if pipeline and pipeline.get("problem_type"):
        problem_type = pipeline.get("problem_type")

    profile = _build_profile_from_report(dataset, report, problem_type=problem_type, pipeline=pipeline)
    problem_type = pipeline.get("problem_type") if pipeline and pipeline.get("problem_type") else None
    # profile may have updated problem_type detection; prefer profile's inferred if pipeline missing
    # Re-derive from profile detection if not set
    if not problem_type:
        # _build_profile_from_report already inferred via df; we can use its note? We'll infer from n_classes existence
        # Fallback: if n_classes is not None => classification else check dataset file
        if profile.get("n_classes") is not None:
            problem_type = "classification"
        else:
            # try to detect again strictly for regression vs classification
            try:
                df = read_dataframe(dataset)
                target_col = pipeline.get("target_column") if pipeline and pipeline.get("target_column") else df.columns[-1]
                if target_col in df.columns:
                    problem_type = detect_problem_type(df[target_col])
                    if problem_type == "invalid":
                        problem_type = "classification"
                else:
                    problem_type = "classification"
            except Exception:
                problem_type = "classification"

    if problem_type not in ("classification", "regression"):
        problem_type = "classification"

    # Choose candidates
    candidates = CLASSIFICATION_ALGOS if problem_type == "classification" else REGRESSION_ALGOS

    recommendations: list[dict[str, Any]] = []
    for algo in candidates:
        score, reasons = _score_algorithm(algo, profile, problem_type)
        rec = {
            "algorithm": algo,
            "label": ALGO_META[algo]["label"],
            "suitability": _suitability_label(score),
            "score": score,
            "reasons": reasons,
            "estimated_time": _estimate_time(algo, int(profile.get("rows", 0) or 0)),
        }
        recommendations.append(rec)

    # Sort descending score
    recommendations.sort(key=lambda r: r["score"], reverse=True)

    # recommended_metric: f1 if imbalanced else accuracy for classification, r2 for regression
    recommended_metric = ("f1" if profile.get("imbalanced") else "accuracy") if problem_type == "classification" else "r2"

    # recommended_algorithms: all recommended, padded to >=2 and capped at 4
    recommended = [r["algorithm"] for r in recommendations if r["suitability"] == "recommended"]
    if len(recommended) < 2:
        # pad with top consider
        for r in recommendations:
            if r["algorithm"] not in recommended:
                recommended.append(r["algorithm"])
            if len(recommended) >= 2:
                break
    if len(recommended) > 4:
        recommended = recommended[:4]

    # Build final profile to return (lightweight)
    public_profile = {
        "rows": profile["rows"],
        "columns": profile["columns"],
        "n_numeric": profile["n_numeric"],
        "n_categorical": profile["n_categorical"],
        "n_classes": profile.get("n_classes"),
        "has_missing": profile["has_missing"],
        "missing_pct": profile.get("missing_pct"),
        "has_high_cardinality": profile["has_high_cardinality"],
        "imbalanced": profile["imbalanced"],
        "imbalance_ratio": profile.get("imbalance_ratio"),
        "has_text": profile["has_text"],
        "has_datetime": profile["has_datetime"],
        "profile_type": profile["profile_type"],
        "notes": profile["notes"],
    }

    return {
        "problem_type": problem_type,
        "recommended_metric": recommended_metric,
        "profile": public_profile,
        "recommendations": recommendations,
        "recommended_algorithms": recommended,
    }
