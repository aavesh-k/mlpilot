import uuid
import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import VarianceThreshold
from sklearn.model_selection import train_test_split as sk_train_test_split
from sklearn.preprocessing import (
    StandardScaler,
    MinMaxScaler,
    RobustScaler,
    OneHotEncoder,
    LabelEncoder,
    FunctionTransformer,
)
from sklearn.pipeline import Pipeline
from imblearn.over_sampling import SMOTE
import cloudpickle

from app.core.config import settings
from app.storage import storage


def detect_problem_type(y: pd.Series) -> str:
    unique_count = y.nunique()
    if unique_count < 2:
        return "invalid"
    if y.dtype == "object" or y.dtype.name == "category" or unique_count <= 20:
        if pd.api.types.is_numeric_dtype(y):
            if unique_count <= 20 and y.dropna().apply(lambda val: float(val).is_integer()).all():
                return "classification"
        else:
            return "classification"
    return "regression"


def check_class_balance(y: pd.Series) -> dict:
    vc = y.value_counts()
    total = len(y)
    distribution = {}
    for k, v in vc.items():
        label = str(k)
        distribution[label] = {"count": int(v), "percent": round(v / total, 4)}
    majority_pct = vc.iloc[0] / total if total > 0 else 0
    minority_pct = vc.iloc[-1] / total if total > 0 else 0
    imbalance_ratio = majority_pct / minority_pct if minority_pct > 0 else float("inf")
    is_imbalanced = imbalance_ratio > 2.0
    return {
        "distribution": distribution,
        "majority_class": str(vc.index[0]) if len(vc) > 0 else None,
        "minority_class": str(vc.index[-1]) if len(vc) > 0 else None,
        "majority_pct": round(majority_pct, 4),
        "minority_pct": round(minority_pct, 4),
        "imbalance_ratio": round(imbalance_ratio, 4),
        "is_imbalanced": is_imbalanced,
        "class_count": int(y.nunique()),
    }


def suggest_encoding_strategy(col: pd.Series, cardinality: int, problem_type: str, y: pd.Series) -> str:
    if cardinality <= 10:
        return "one_hot"
    if cardinality <= 50:
        if problem_type == "classification" and y.nunique() == 2:
            return "target"
        return "one_hot"
    if problem_type == "classification":
        return "target"
    return "frequency"


def suggest_scaling_strategy(col: pd.Series, eda_report: dict | None) -> str:
    if eda_report is None:
        return "standard"
    outliers_list = eda_report.get("outliers", [])
    for o in outliers_list:
        if o["column"] == col.name and o.get("count", 0) > 0:
            outlier_pct = o.get("percent", 0)
            if outlier_pct > 0.05:
                return "robust"
    return "standard"


def _encode_target(y: pd.Series) -> tuple[np.ndarray, LabelEncoder]:
    le = LabelEncoder()
    encoded = le.fit_transform(y)
    return encoded, le


def _build_preprocessing_pipeline(
    df: pd.DataFrame,
    target_col: str,
    config: dict,
    eda_report: dict | None,
    problem_type: str,
    y_encoded: np.ndarray | None,
) -> tuple[Pipeline, list[str], dict]:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category", "string"]).columns.tolist()
    if target_col in numeric_cols:
        numeric_cols.remove(target_col)
    if target_col in categorical_cols:
        categorical_cols.remove(target_col)

    encoding_config = config.get("encoding", {})
    scaling_config = config.get("scaling", {})
    feature_selection_config = config.get("feature_selection", {})

    encoding_strategy = encoding_config.get("strategy", "auto")
    scaling_strategy = scaling_config.get("strategy", "auto")

    passthrough_cols = encoding_config.get("passthrough_columns", [])
    encode_cols = [c for c in categorical_cols if c not in passthrough_cols]
    scale_cols = encoding_config.get("scale_columns", None)
    if scale_cols is None:
        scale_cols = numeric_cols
    scale_cols = [c for c in scale_cols if c not in passthrough_cols and c != target_col]

    transformers: list[tuple[str, Any, list[str]]] = []
    dropped_columns: list[str] = []
    column_notes: dict[str, str] = {}

    if encode_cols:
        if encoding_strategy == "auto":
            per_col_strategies = {}
            for col in encode_cols:
                cardinality = df[col].nunique()
                strat = suggest_encoding_strategy(df[col], cardinality, problem_type, df[target_col])
                per_col_strategies[col] = strat
        else:
            per_col_strategies = {col: encoding_strategy for col in encode_cols}

        for col in encode_cols:
            strat = per_col_strategies.get(col, "one_hot")
            cardinality = df[col].nunique()
            column_notes[col] = f"{strat} (cardinality={cardinality})"

        oh_cols = [c for c in encode_cols if per_col_strategies.get(c, "one_hot") == "one_hot"]
        high_card_cols = [c for c in encode_cols if per_col_strategies.get(c, "one_hot") != "one_hot"]

        if oh_cols:
            transformers.append(
                ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False), oh_cols)
            )

        if high_card_cols:
            for col in high_card_cols:
                strat = per_col_strategies[col]
                if strat == "target" and y_encoded is not None:
                    transformers.append(
                        (f"target_{col}", _TargetEncoder(col, y_encoded), [col])
                    )
                else:
                    col_means = df.groupby(col)[target_col].mean()
                    if strat == "frequency":
                        freq_map = df[col].value_counts().to_dict()
                        df["__freq_enc_" + col] = df[col].map(freq_map)
                        numeric_cols.append("__freq_enc_" + col)
                        column_notes[col] = f"frequency-encoded into __freq_enc_{col}"
                    else:
                        df["__target_enc_" + col] = df[col].map(col_means)
                        numeric_cols.append("__target_enc_" + col)
                        column_notes[col] = f"target-encoded into __target_enc_{col}"

    if scale_cols:
        if scaling_strategy == "auto":
            has_outliers = False
            if eda_report:
                outliers_list = eda_report.get("outliers", [])
                for o in outliers_list:
                    if any(c == o["column"] for c in scale_cols):
                        if o.get("count", 0) > 0 and o.get("percent", 0) > 0.05:
                            has_outliers = True
                            break
            scaler = RobustScaler() if has_outliers else StandardScaler()
        elif scaling_strategy == "standard":
            scaler = StandardScaler()
        elif scaling_strategy == "minmax":
            scaler = MinMaxScaler()
        elif scaling_strategy == "robust":
            scaler = RobustScaler()
        else:
            scaler = StandardScaler()

        column_notes.update({c: f"scaled ({scaling_strategy or 'auto'})" for c in scale_cols})
        transformers.append(("scaler", scaler, scale_cols))

    if passthrough_cols:
        transformers.append(
            ("passthrough", FunctionTransformer(feature_names_out="one-to-one"), passthrough_cols)
        )

    column_transformer = ColumnTransformer(
        transformers=transformers,
        remainder="drop",
        verbose_feature_names_out=False,
    )

    pipeline_steps: list[tuple[str, Any]] = [("preprocessor", column_transformer)]

    fs_config = feature_selection_config
    if fs_config.get("enabled", False):
        fs_steps = []
        if fs_config.get("drop_near_zero_variance", False):
            fs_steps.append(("variance", VarianceThreshold(threshold=fs_config.get("variance_threshold", 0.01))))
        if fs_steps:
            pipeline_steps.append(("feature_selection", Pipeline(fs_steps)))

    pipeline = Pipeline(steps=pipeline_steps)
    return pipeline, dropped_columns, column_notes


class _TargetEncoder:
    def __init__(self, column: str, y_encoded: np.ndarray):
        self.column = column
        self.y_encoded = y_encoded
        self.mapping_: dict = {}

    def fit(self, X: pd.DataFrame, y: pd.Series | None = None) -> "_TargetEncoder":
        self.mapping_ = X.groupby(self.column)[self.column].apply(
            lambda x: np.mean(self.y_encoded[x.index]) if len(x) > 0 else 0
        ).to_dict()
        global_mean = float(np.mean(self.y_encoded))
        self.mapping_ = {k: v if not (isinstance(v, float) and math.isnan(v)) else global_mean for k, v in self.mapping_.items()}
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        return X[self.column].map(self.mapping_).fillna(float(np.mean(self.y_encoded))).values.reshape(-1, 1)


def _check_near_zero_variance(df: pd.DataFrame, threshold: float = 0.01) -> list[dict]:
    dropped = []
    for col in df.select_dtypes(include=[np.number]).columns:
        s = df[col].dropna()
        if len(s) < 2:
            continue
        var = s.var()
        if var < threshold or (s.max() - s.min()) < 1e-8:
            dropped.append({"column": col, "reason": f"variance={var:.6f} below threshold={threshold}"})
    return dropped


def _check_high_correlation(df: pd.DataFrame, threshold: float = 0.95) -> list[dict]:
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(num_cols) < 2:
        return []
    corr = df[num_cols].corr()
    dropped = []
    keep = set(num_cols)
    for i, col_a in enumerate(num_cols):
        for col_b in num_cols[i + 1:]:
            val = corr.loc[col_a, col_b]
            if not (isinstance(val, float) and math.isnan(val)) and abs(val) > threshold:
                var_a = df[col_a].var()
                var_b = df[col_b].var()
                keep.discard(
                    col_a if var_a <= var_b else col_b,
                )
    dropped_cols = set(num_cols) - keep
    for col in dropped_cols:
        dropped.append({"column": col, "reason": f"high correlation (|r|>{threshold}) with another feature"})
    return dropped


def run_preprocessing(
    dataset_id: str,
    target_col: str,
    config: dict,
    eda_report: dict | None = None,
    pipeline_id: str | None = None,
) -> dict:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise ValueError(f"Dataset {dataset_id} not found")

    from app.core.io import read_dataframe
    df = read_dataframe(dataset)

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset")

    y = df[target_col].copy()
    problem_type = config.get("problem_type") or detect_problem_type(y)
    if problem_type == "invalid":
        raise ValueError(f"Target column '{target_col}' has fewer than 2 unique values")

    X = df.drop(columns=[target_col])

    split_config = config.get("split", {})
    test_size = split_config.get("test_size", 0.2)
    random_seed = split_config.get("random_seed", 42)
    stratify = None
    if problem_type == "classification" and split_config.get("stratify", True):
        stratify = y

    y_encoded = None
    if problem_type == "classification":
        y_encoded, label_encoder = _encode_target(y)
        le_path = None

    imbalance_info = None
    if problem_type == "classification":
        imbalance_info = check_class_balance(y)

    feature_selection_config = config.get("feature_selection", {})
    fs_report = {"near_zero_variance": [], "high_correlation": []}
    dropped_by_fs: list[str] = []
    if feature_selection_config.get("enabled", False):
        if feature_selection_config.get("drop_near_zero_variance", False):
            fs_report["near_zero_variance"] = _check_near_zero_variance(X, feature_selection_config.get("variance_threshold", 0.01))
        if feature_selection_config.get("drop_high_correlation", False):
            fs_report["high_correlation"] = _check_high_correlation(X, feature_selection_config.get("correlation_threshold", 0.95))
        drop_cols_fs = set()
        for entry in fs_report["near_zero_variance"] + fs_report["high_correlation"]:
            drop_cols_fs.add(entry["column"])
        if drop_cols_fs:
            X = X.drop(columns=list(drop_cols_fs))
            dropped_by_fs = list(drop_cols_fs)
            config["_dropped_by_feature_selection"] = dropped_by_fs

    pipeline, dropped_columns, column_notes = _build_preprocessing_pipeline(
        pd.concat([X, y], axis=1),
        target_col,
        config,
        eda_report,
        problem_type,
        y_encoded,
    )

    if test_size > 0:
        stratify_arg = stratify
        X_train, X_test, y_train, y_test = sk_train_test_split(
            X, y,
            test_size=test_size,
            random_state=random_seed,
            stratify=stratify_arg,
        )
    else:
        X_train, X_test, y_train, y_test = X, X.iloc[:0], y, y.iloc[:0]

    X_train_transformed = pipeline.fit_transform(X_train)
    X_test_transformed = pipeline.transform(X_test) if len(X_test) > 0 else np.empty((0, X_train_transformed.shape[1]))

    use_smote = config.get("use_smote", False)
    if use_smote and problem_type == "classification" and len(X_train_transformed) > 0:
        smote = SMOTE(random_state=random_seed)
        X_train_transformed, y_train = smote.fit_resample(X_train_transformed, y_train)

    if isinstance(X_train_transformed, np.ndarray):
        try:
            feature_names_out = pipeline.named_steps["preprocessor"].get_feature_names_out()
        except Exception:
            feature_names_out = [f"feature_{i}" for i in range(X_train_transformed.shape[1])]
    else:
        feature_names_out = list(X_train_transformed.columns)

    pipeline_id = pipeline_id or str(uuid.uuid4())
    processed_dir = settings.DATA_DIR / "processed" / pipeline_id
    processed_dir.mkdir(parents=True, exist_ok=True)

    train_out = pd.DataFrame(X_train_transformed, columns=feature_names_out)
    train_out[target_col] = y_train.values if isinstance(y_train, pd.Series) else y_train
    test_out = pd.DataFrame(X_test_transformed, columns=feature_names_out) if len(X_test) > 0 else pd.DataFrame()
    if len(test_out) > 0:
        test_out[target_col] = y_test.values if isinstance(y_test, pd.Series) else y_test

    train_out.to_parquet(processed_dir / "train.parquet")
    if len(test_out) > 0:
        test_out.to_parquet(processed_dir / "test.parquet")
    else:
        (processed_dir / "test.parquet").touch()

    artifact_path = processed_dir / "pipeline.pkl"
    with open(artifact_path, "wb") as f:
        cloudpickle.dump(pipeline, f)

    label_encoder_path = None
    if problem_type == "classification":
        label_encoder_path = processed_dir / "label_encoder.pkl"
        with open(label_encoder_path, "wb") as f:
            cloudpickle.dump(label_encoder, f)

    result = {
        "id": pipeline_id,
        "dataset_id": dataset_id,
        "target_column": target_col,
        "problem_type": problem_type,
        "train_rows": len(train_out),
        "test_rows": len(test_out),
        "feature_count": X_train_transformed.shape[1],
        "column_notes": column_notes,
        "dropped_columns": dropped_columns,
        "fs_result": fs_report,
        "imbalance": imbalance_info,
        "pipeline_config": config,
        "train_path": str(processed_dir / "train.parquet"),
        "test_path": str(processed_dir / "test.parquet"),
        "artifact_path": str(artifact_path),
        "label_encoder_path": str(label_encoder_path) if label_encoder_path else None,
    }

    return result


def suggest_pipeline_config(dataset_id: str, eda_report: dict | None = None) -> dict:
    dataset = storage.get_dataset(dataset_id)
    if not dataset:
        raise ValueError(f"Dataset {dataset_id} not found")

    from app.core.io import read_dataframe
    df = read_dataframe(dataset)

    columns = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        is_numeric = pd.api.types.is_numeric_dtype(df[col])
        cardinality = int(df[col].nunique())
        missing_pct = round(float(df[col].isna().sum() / max(len(df), 1)), 4)

        suggested_role = "feature"
        if is_numeric and cardinality <= 20 and df[col].dropna().apply(lambda x: float(x).is_integer() if not pd.isna(x) else True).all():
            suggested_role = "target" if cardinality >= 2 else "drop"

        encoding_suggestion = None
        scaling_suggestion = None
        if not is_numeric:
            encoding_suggestion = suggest_encoding_strategy(df[col], cardinality, "classification", df[df.columns[0]])
        elif is_numeric:
            scaling_suggestion = suggest_scaling_strategy(df[col], eda_report)

        columns.append({
            "name": col,
            "dtype": dtype,
            "is_numeric": is_numeric,
            "cardinality": cardinality,
            "missing_pct": missing_pct,
            "suggested_role": suggested_role,
            "suggested_encoding": encoding_suggestion,
            "suggested_scaling": scaling_suggestion,
        })

    return {"columns": columns}
