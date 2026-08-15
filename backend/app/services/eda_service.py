import math
from collections.abc import Callable
from typing import Any

import numpy as np
import pandas as pd

SAMPLE_SIZE_FOR_PLOTS = 100_000
HISTOGRAM_BINS = 30
KDE_POINTS = 200
OUTLIER_THRESHOLD = 1.5


def compute_eda(dataset_id: str, df: pd.DataFrame, progress_callback: Callable | None = None) -> dict:
    total_rows = len(df)

    def rp(step: str, pct: float):
        if progress_callback:
            progress_callback(step, pct)

    rp("Shape & memory", 0.08)
    shape_info = _compute_shape(df)
    mem_info = _compute_memory(df)

    rp("Column list", 0.12)
    cols_info = _compute_columns(df)

    rp("Head & tail", 0.16)
    head = _safe_convert(df.head(10).to_dict(orient="records"))
    tail = _safe_convert(df.tail(5).to_dict(orient="records"))

    rp("Missingness", 0.22)
    missingness = _compute_missingness(df)

    rp("Missingness matrix", 0.26)
    missingness_matrix = _compute_missingness_matrix(df)

    rp("Numeric summary", 0.34)
    numeric_summary = _compute_numeric_summary(df)

    rp("Outliers", 0.42)
    outliers = _compute_outliers(df)

    rp("Categorical summary", 0.50)
    categorical_summary = _compute_categorical_summary(df)

    rp("Correlation matrix", 0.58)
    corr_data = _compute_correlation(df)

    rp("Distributions", 0.68)
    df_plots = df
    if total_rows > SAMPLE_SIZE_FOR_PLOTS:
        df_plots = df.sample(SAMPLE_SIZE_FOR_PLOTS, random_state=42)
    distribution_plots = _compute_distributions(df_plots)

    rp("Duplicates", 0.74)
    duplicates = _compute_duplicates(df)

    rp("Data type checks", 0.80)
    data_type_issues = _check_data_types(df)

    rp("Constant columns", 0.86)
    constant_columns = _find_constant_columns(df)

    rp("Generating findings", 0.94)
    findings = _generate_findings(
        shape_info, missingness, corr_data["high_pairs"],
        outliers, categorical_summary, duplicates,
        constant_columns, data_type_issues, numeric_summary,
    )

    rp("Potential targets & class balance", 0.96)
    potential_targets = _detect_potential_targets(df)
    for t in potential_targets:
        if t.get("is_imbalanced"):
            findings.append({
                "severity": "warning",
                "title": "Class Imbalance",
                "description": (
                    f"Potential target column '{t['column']}' is imbalanced "
                    f"(majority/minority ratio = {t['imbalance_ratio']:.1f})."
                ),
                "affected_columns": [t["column"]],
                "recommendation": "Consider class weighting or SMOTE in preprocessing to handle imbalance.",
            })

    rp("Complete", 1.0)

    return {
        "dataset_id": dataset_id,
        "computed_at": pd.Timestamp.now().isoformat(),
        "shape": shape_info,
        "memory_usage": mem_info,
        "columns": cols_info,
        "head": head,
        "tail": tail,
        "missingness": missingness,
        "missingness_matrix": missingness_matrix,
        "numeric_summary": numeric_summary,
        "outliers": outliers,
        "categorical_summary": categorical_summary,
        "correlation_matrix": corr_data["matrix"],
        "high_correlations": corr_data["high_pairs"],
        "distribution_plots": distribution_plots,
        "duplicates": duplicates,
        "data_type_issues": data_type_issues,
        "constant_columns": constant_columns,
        "potential_targets": potential_targets,
        "findings": findings,
    }


def _compute_shape(df: pd.DataFrame) -> dict:
    return {"rows": len(df), "columns": len(df.columns)}


def _compute_memory(df: pd.DataFrame) -> dict:
    mem_bytes = int(df.memory_usage(deep=True).sum())
    return {"total_bytes": mem_bytes, "formatted": _format_bytes(mem_bytes)}


def _format_bytes(b: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} TB"


def _compute_columns(df: pd.DataFrame) -> list[dict]:
    return [
        {"name": col, "dtype": str(df[col].dtype), "ordinal_position": i + 1}
        for i, col in enumerate(df.columns)
    ]


def _safe_convert(records: list[dict]) -> list[dict]:
    result = []
    for row in records:
        cleaned = {}
        for k, v in row.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                cleaned[k] = None
            elif isinstance(v, np.integer):
                cleaned[k] = int(v)
            elif isinstance(v, np.floating):
                cleaned[k] = None if (math.isnan(float(v)) or math.isinf(float(v))) else float(v)
            elif isinstance(v, np.bool_):
                cleaned[k] = bool(v)
            else:
                cleaned[k] = v
        result.append(cleaned)
    return result


def _compute_missingness(df: pd.DataFrame) -> list[dict]:
    total = len(df)
    missing = []
    for col in df.columns:
        count = int(df[col].isna().sum())
        if count > 0:
            missing.append({
                "column": col,
                "count": count,
                "percent": round(count / total, 4),
            })
    missing.sort(key=lambda x: x["count"], reverse=True)
    return missing


def _compute_missingness_matrix(df: pd.DataFrame) -> dict:
    n_rows = min(len(df), 1000)
    sample = df.head(n_rows)
    data = {}
    for col in df.columns:
        data[col] = [1 if pd.isna(v) else 0 for v in sample[col]]
    return {"columns": list(df.columns), "rows": n_rows, "data": data}


def _compute_numeric_summary(df: pd.DataFrame) -> list[dict]:
    num_cols = df.select_dtypes(include=[np.number]).columns
    summaries = []
    for col in num_cols:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        q1 = float(s.quantile(0.25))
        q3 = float(s.quantile(0.75))
        summaries.append({
            "column": col,
            "count": int(len(s)),
            "mean": _safe_float(s.mean()),
            "median": _safe_float(s.median()),
            "std": _safe_float(s.std()),
            "min": _safe_float(s.min()),
            "max": _safe_float(s.max()),
            "q1": _safe_float(q1),
            "q3": _safe_float(q3),
            "iqr": _safe_float(q3 - q1),
            "skewness": _safe_float(s.skew()),
            "kurtosis": _safe_float(s.kurtosis()),
        })
    return summaries


def _safe_float(v: Any) -> float | None:
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return round(float(v), 6)


def _compute_outliers(df: pd.DataFrame) -> list[dict]:
    num_cols = df.select_dtypes(include=[np.number]).columns
    total = len(df)
    results = []
    for col in num_cols:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        q1 = s.quantile(0.25)
        q3 = s.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - OUTLIER_THRESHOLD * iqr
        upper = q3 + OUTLIER_THRESHOLD * iqr
        mask = (s < lower) | (s > upper)
        outlier_vals = s[mask]
        count = int(outlier_vals.count())
        results.append({
            "column": col,
            "count": count,
            "percent": round(count / total, 4),
            "lower_bound": _safe_float(lower),
            "upper_bound": _safe_float(upper),
            "stats": {
                "min": _safe_float(s.min()),
                "q1": _safe_float(q1),
                "median": _safe_float(s.median()),
                "q3": _safe_float(q3),
                "max": _safe_float(s.max()),
            },
        })
    return results


def _compute_categorical_summary(df: pd.DataFrame) -> list[dict]:
    cat_cols = df.select_dtypes(include=["object", "category", "string"]).columns
    summaries = []
    for col in cat_cols:
        s = df[col].dropna()
        cardinality = int(s.nunique())
        vc = s.value_counts().head(10)
        top_values = [[str(k), int(v)] for k, v in vc.items()]
        summaries.append({
            "column": col,
            "cardinality": cardinality,
            "high_cardinality": cardinality > 50,
            "top_values": top_values,
        })
    return summaries


def _compute_correlation(df: pd.DataFrame) -> dict:
    num_cols = df.select_dtypes(include=[np.number]).columns
    result: dict = {"matrix": {}, "high_pairs": []}
    if len(num_cols) < 2:
        return result

    corr = df[num_cols].corr()
    matrix = {}
    for col_a in num_cols:
        row = {}
        for col_b in num_cols:
            val = corr.loc[col_a, col_b]
            row[col_b] = float(round(val, 6)) if not (isinstance(val, float) and math.isnan(val)) else 0.0
        matrix[col_a] = row
    result["matrix"] = matrix

    for i, col_a in enumerate(num_cols):
        for col_b in num_cols[i + 1:]:
            val = corr.loc[col_a, col_b]
            if not (isinstance(val, float) and math.isnan(val)) and abs(val) > 0.85:
                result["high_pairs"].append({
                    "col_a": col_a,
                    "col_b": col_b,
                    "value": round(float(val), 4),
                })
    return result


def _compute_distributions(df: pd.DataFrame) -> list[dict]:
    num_cols = df.select_dtypes(include=[np.number]).columns
    distributions = []
    for col in num_cols:
        s = df[col].dropna()
        if len(s) < 3:
            continue
        counts, bin_edges = np.histogram(s, bins=HISTOGRAM_BINS)
        hist = {"bins": bin_edges.tolist(), "counts": counts.tolist()}
        kde = _compute_kde(s.values, KDE_POINTS)
        distributions.append({"column": col, "histogram": hist, "kde": kde})
    return distributions


def _compute_kde(data: np.ndarray, points: int = 200) -> dict:
    n = len(data)
    if n < 2:
        return {"x": [], "y": []}
    std = float(np.std(data))
    if std == 0:
        return {"x": [], "y": []}
    bw = std * (n ** -0.2)
    if bw == 0:
        bw = std * 0.1
    x_min = float(data.min()) - 3 * bw
    x_max = float(data.max()) + 3 * bw
    x_vals = np.linspace(x_min, x_max, points)
    y_vals = np.zeros(points)
    for i in range(points):
        z = (x_vals[i] - data) / bw
        y_vals[i] = float(np.sum(np.exp(-0.5 * z ** 2) / (bw * np.sqrt(2 * np.pi))))
    y_vals /= float(n)
    return {"x": x_vals.tolist(), "y": y_vals.tolist()}


def _compute_duplicates(df: pd.DataFrame) -> dict:
    total = len(df)
    dup_count = int(df.duplicated().sum())
    return {"count": dup_count, "percent": round(dup_count / total, 4) if total > 0 else 0}


def _check_data_types(df: pd.DataFrame) -> list[dict]:
    issues = []
    for col in df.columns:
        s = df[col].dropna()
        if len(s) < 5:
            continue
        if df[col].dtype == "object":
            sample = s.head(100)
            numeric_attempt = pd.to_numeric(sample, errors="coerce")
            nn_ratio = numeric_attempt.notna().sum() / len(sample)
            if nn_ratio > 0.7:
                non_numeric = sample[numeric_attempt.isna()]
                if len(non_numeric) > 0:
                    issues.append({
                        "column": col,
                        "issue": "Numeric-looking column stored as text. Contains non-numeric characters like currency symbols, commas, or spaces.",
                        "sample_values": [str(v) for v in non_numeric.head(5)],
                    })
                else:
                    issues.append({
                        "column": col,
                        "issue": "Column appears numeric but stored as string/object type.",
                        "sample_values": [str(v) for v in sample.head(5)],
                    })
            date_attempt = pd.to_datetime(sample, errors="coerce", infer_datetime_format=True)
            dt_ratio = date_attempt.notna().sum() / len(sample)
            if dt_ratio > 0.7:
                issues.append({
                    "column": col,
                    "issue": "Column appears to contain datetime strings but is stored as text.",
                    "sample_values": [str(v) for v in sample.head(5)],
                })
    return issues


def _find_constant_columns(df: pd.DataFrame) -> list[dict]:
    constants = []
    for col in df.columns:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        nunique = s.nunique()
        if nunique <= 1:
            uv = s.iloc[0] if len(s) > 0 else None
            if isinstance(uv, float) and math.isnan(uv):
                uv = None
            elif isinstance(uv, np.integer):
                uv = int(uv)
            elif isinstance(uv, np.floating):
                uv = float(uv)
            elif isinstance(uv, np.bool_):
                uv = bool(uv)
            constants.append({"column": col, "unique_value": uv, "percent_same": 1.0})
        elif nunique == 2:
            vc = s.value_counts(normalize=True)
            top_pct = float(vc.iloc[0])
            if top_pct > 0.99:
                uv = vc.index[0]
                if isinstance(uv, np.integer):
                    uv = int(uv)
                elif isinstance(uv, np.floating):
                    uv = float(uv)
                elif isinstance(uv, np.bool_):
                    uv = bool(uv)
                else:
                    uv = str(uv)
                constants.append({"column": col, "unique_value": uv, "percent_same": round(top_pct, 4)})
    return constants


def _detect_potential_targets(df: pd.DataFrame) -> list[dict]:
    """Heuristically identify columns that could be ML targets and report class balance (AC-02)."""
    targets: list[dict] = []
    for col in df.columns:
        vc = df[col].value_counts(dropna=True)
        n_unique = len(vc)
        if n_unique < 2 or n_unique > 50:
            continue
        s = df[col].dropna()
        is_numeric_class = (
            pd.api.types.is_numeric_dtype(df[col])
            and s.apply(lambda v: float(v).is_integer() if not pd.isna(v) else True).all()
        )
        if not (is_numeric_class or df[col].dtype in ("object", "category", "string")):
            continue
        total = int(vc.sum())
        distribution = {str(k): int(v) for k, v in vc.items()}
        majority_pct = float(vc.iloc[0] / total) if total > 0 else 0.0
        minority_pct = float(vc.iloc[-1] / total) if total > 0 else 0.0
        imbalance_ratio = (majority_pct / minority_pct) if minority_pct > 0 else 999.0
        targets.append({
            "column": col,
            "type": "numeric_class" if is_numeric_class else "categorical_class",
            "class_count": int(n_unique),
            "distribution": distribution,
            "majority_pct": round(majority_pct, 4),
            "minority_pct": round(minority_pct, 4),
            "imbalance_ratio": round(imbalance_ratio, 4) if imbalance_ratio < 999 else 999.0,
            "is_imbalanced": bool(imbalance_ratio > 2.0),
        })
    return targets


def _generate_findings(
    _shape: dict,
    missingness: list[dict],
    high_corrs: list[dict],
    outliers: list[dict],
    categorical: list[dict],
    duplicates: dict,
    constant_cols: list[dict],
    dtype_issues: list[dict],
    numeric_summary: list[dict],
) -> list[dict]:
    findings = []

    for m in missingness:
        pct = m["percent"] * 100
        sev = "critical" if pct > 20 else ("warning" if pct > 5 else "info")
        findings.append({
            "severity": sev,
            "title": "Missing Values",
            "description": f"'{m['column']}' has {pct:.1f}% missing values ({m['count']:,} rows).",
            "affected_columns": [m["column"]],
            "recommendation": "Select KNN Imputer, FFill/BFill, or Median imputation in data cleaning."
        })

    for hc in high_corrs:
        findings.append({
            "severity": "warning",
            "title": "High Correlation",
            "description": f"'{hc['col_a']}' and '{hc['col_b']}' show {hc['value']:.2f} correlation. Possible multicollinearity.",
            "affected_columns": [hc["col_a"], hc["col_b"]],
            "recommendation": "Enable Feature Selection and Correlation Thresholding in preprocessing to remove redundant columns."
        })

    for o in outliers:
        pct = o["percent"] * 100
        sev = "warning" if pct > 5 else "info"
        findings.append({
            "severity": sev,
            "title": "Outliers Detected",
            "description": f"'{o['column']}' has {o['count']:,} outliers ({pct:.1f}%).",
            "affected_columns": [o["column"]],
            "recommendation": "Enable Winsorization or Outlier Removal in data cleaning to limit extreme values."
        })

    for cat in categorical:
        if cat["high_cardinality"]:
            findings.append({
                "severity": "info",
                "title": "High Cardinality",
                "description": f"'{cat['column']}' has {cat['cardinality']:,} unique values. May be an ID or free-text column.",
                "affected_columns": [cat["column"]],
                "recommendation": (
                    "Consider Target Encoding or Frequency Encoding instead of One-Hot Encoding "
                    "to prevent high-dimensional sparse representations."
                )
            })

    if duplicates["count"] > 0:
        pct = duplicates["percent"] * 100
        sev = "warning" if pct > 10 else "info"
        findings.append({
            "severity": sev,
            "title": "Duplicate Rows",
            "description": f"Found {duplicates['count']:,} duplicate rows ({pct:.1f}% of data).",
            "affected_columns": [],
            "recommendation": "Enable Duplicate Row Removal in the cleaning config step."
        })

    for cc in constant_cols:
        findings.append({
            "severity": "info",
            "title": "Constant/Near-Constant Column",
            "description": f"'{cc['column']}' has {cc['percent_same']*100:.1f}% same value. Candidate for removal.",
            "affected_columns": [cc["column"]],
            "recommendation": "Enable Drop Constant Columns in the cleaning config step."
        })

    for dt in dtype_issues:
        findings.append({
            "severity": "info",
            "title": "Data Type Issue",
            "description": dt["issue"],
            "affected_columns": [dt["column"]],
            "recommendation": "Enable Fix Data Type Issues in the cleaning config step."
        })

    for num in numeric_summary:
        skew = num.get("skewness")
        if skew is not None and abs(skew) > 1.5:
            findings.append({
                "severity": "warning",
                "title": "High Skewness",
                "description": f"'{num['column']}' is highly skewed (skewness = {skew:.2f}).",
                "affected_columns": [num["column"]],
                "recommendation": "Apply a Log or Power Scaling transform in the preprocessing config step."
            })

    return findings
