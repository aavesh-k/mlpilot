import math
import re

import numpy as np
import pandas as pd
from sklearn.impute import KNNImputer


def _snapshot(df: pd.DataFrame) -> dict:
    total = len(df)
    total_missing = int(df.isna().sum().sum())
    dup_count = int(df.duplicated().sum())
    return {
        "row_count": len(df),
        "column_count": len(df.columns),
        "total_missing": total_missing,
        "total_missing_pct": round(total_missing / (total * len(df.columns) or 1), 4),
        "duplicate_count": dup_count,
        "duplicate_pct": round(dup_count / total, 4) if total > 0 else 0,
    }


def _col_missing_pct(df: pd.DataFrame, col: str) -> float:
    return round(float(df[col].isna().sum() / max(len(df), 1)), 4)


def _log(step: str, desc: str, cols: list[str], rows: int, cells: int, details: str) -> dict:
    return {
        "step": step,
        "description": desc,
        "columns_affected": cols,
        "rows_affected": rows,
        "cells_affected": cells,
        "details": details,
    }


def _dtype_map(df: pd.DataFrame) -> dict[str, str]:
    return {col: str(df[col].dtype) for col in df.columns}


def run_cleaning(df: pd.DataFrame, config: dict) -> tuple[pd.DataFrame, list[dict], dict, list[dict]]:
    original_dtypes = _dtype_map(df)
    original_missing_pct = {col: _col_missing_pct(df, col) for col in df.columns}
    original_missing_count = {col: int(df[col].isna().sum()) for col in df.columns}
    logs: list[dict] = []
    column_changes: list[dict] = []
    total_rows = len(df)

    missing_strats = {m["column"]: m["strategy"] for m in config.get("missing_strategies", [])}
    outlier_strats = {o["column"]: o["strategy"] for o in config.get("outlier_strategies", [])}

    before = _snapshot(df)

    if config.get("remove_duplicates", True):
        dup_before = int(df.duplicated().sum())
        if dup_before > 0:
            df = df.drop_duplicates().reset_index(drop=True)
            logs.append(_log(
                "remove_duplicates",
                "Removed exact duplicate rows",
                [],
                dup_before,
                dup_before * len(df.columns),
                f"Found and removed {dup_before:,} duplicate rows ({len(df.columns)} columns each).",
            ))

    if missing_strats:
        logs_missing, df, col_changes_missing = _apply_missing_strategies(df, missing_strats, total_rows)
        logs.extend(logs_missing)
        column_changes.extend(col_changes_missing)

    if outlier_strats:
        logs_outlier, df, col_changes_outlier = _apply_outlier_strategies(df, outlier_strats, total_rows)
        logs.extend(logs_outlier)
        column_changes.extend(col_changes_outlier)

    if config.get("fix_dtype_issues", True):
        logs_dtype, df, col_changes_dtype = _fix_dtype_issues(df)
        logs.extend(logs_dtype)
        column_changes.extend(col_changes_dtype)

    if config.get("standardize_categorical", True):
        logs_cat, df, col_changes_cat = _standardize_categorical(df)
        logs.extend(logs_cat)
        column_changes.extend(col_changes_cat)

    if config.get("drop_constant_columns", True):
        logs_const, df, col_changes_const = _drop_constant_columns(df)
        logs.extend(logs_const)
        column_changes.extend(col_changes_const)

    for col in df.columns:
        after_dtype = str(df[col].dtype)
        before_dtype = original_dtypes.get(col, after_dtype)
        before_miss = original_missing_count.get(col, 0)
        after_miss_count = int(df[col].isna().sum())
        after_miss_pct = _col_missing_pct(df, col)
        before_miss_pct = float(original_missing_pct.get(col, 0))

        col_log = {
            "column": col,
            "before_dtype": before_dtype,
            "after_dtype": after_dtype,
            "before_missing": before_miss,
            "after_missing": after_miss_count,
            "before_missing_pct": before_miss_pct,
            "after_missing_pct": after_miss_pct,
            "changes": [],
        }
        existing = next((c for c in column_changes if c["column"] == col), None)
        if existing:
            col_log["changes"] = existing.get("changes", [])
            column_changes.remove(existing)
        if before_dtype != after_dtype:
            col_log["changes"].append(f"dtype changed from {before_dtype} to {after_dtype}")
        if before_miss > after_miss_count:
            col_log["changes"].append(f"missing values reduced from {before_miss:,} to {after_miss_count:,}")
        column_changes.append(col_log)

    missing_cols = set(original_missing_count.keys()) - set(df.columns)
    for col in missing_cols:
        column_changes.append({
            "column": col,
            "before_dtype": original_dtypes.get(col, "unknown"),
            "after_dtype": "dropped",
            "before_missing": original_missing_count.get(col, 0),
            "after_missing": 0,
            "before_missing_pct": float(original_missing_pct.get(col, 0)),
            "after_missing_pct": 0.0,
            "changes": ["column dropped entirely"],
        })

    return df, logs, before, column_changes


def _apply_missing_strategies(df: pd.DataFrame, strategies: dict[str, str], _total_rows: int) -> tuple[list[dict], pd.DataFrame, list[dict]]:
    logs: list[dict] = []
    column_changes: list[dict] = []
    drop_cols: list[str] = []

    for col, strategy in strategies.items():
        if col not in df.columns:
            continue
        missing_count = int(df[col].isna().sum())
        if missing_count == 0:
            continue

        if strategy == "drop_column":
            drop_cols.append(col)
            logs.append(_log(
                "missing_values", f"Dropped column '{col}' (>50% missing)" if _col_missing_pct(df, col) > 0.5 else f"Dropped column '{col}'",
                [col], 0, 0,
                f"Column '{col}' had {missing_count:,} missing values ({_col_missing_pct(df, col)*100:.1f}%). Dropped entirely.",
            ))
            column_changes.append({"column": col, "changes": ["column dropped due to missing values"]})
            continue

        if strategy == "drop_row":
            before = len(df)
            df = df.dropna(subset=[col]).reset_index(drop=True)
            removed = before - len(df)
            logs.append(_log(
                "missing_values", f"Dropped {removed:,} rows with missing '{col}'",
                [col], removed, removed,
                f"Removed {removed:,} rows where '{col}' was missing ({missing_count:,} total missing).",
            ))

        elif strategy in ("mean", "median", "mode"):
            s = df[col]
            if strategy == "mode" or not pd.api.types.is_numeric_dtype(s):
                fill_val = s.mode().iloc[0] if not s.mode().empty else None
            else:
                fill_val = s.mean() if strategy == "mean" else s.median()
            if fill_val is not None and not (isinstance(fill_val, float) and math.isnan(fill_val)):
                df[col] = df[col].fillna(fill_val)
                desc = f"Filled {missing_count:,} missing cells in '{col}' using {strategy}"
                if isinstance(fill_val, float):
                    desc += f" ({fill_val:.4f})"
                logs.append(_log(
                    "missing_values", f"Imputed {missing_count:,} missing values in '{col}' with {strategy}",
                    [col], missing_count, missing_count,
                    desc,
                ))

        elif strategy in ("ffill", "bfill"):
            direction = "Forward" if strategy == "ffill" else "Back"
            method = "ffill" if strategy == "ffill" else "bfill"
            df[col] = df[col].fillna(method=method)
            still_missing = int(df[col].isna().sum())
            filled = missing_count - still_missing
            if filled > 0:
                logs.append(_log(
                    "missing_values", f"{direction}-filled {filled:,} missing values in '{col}'",
                    [col], filled, filled,
                    f"{direction}-fill imputed {filled:,} cells in '{col}'. {still_missing:,} remain at boundaries.",
                ))

        elif strategy == "knn":
            _apply_knn_impute(df, col, logs, column_changes)

    if drop_cols:
        df = df.drop(columns=drop_cols)

    return logs, df, column_changes


def _apply_knn_impute(df: pd.DataFrame, col: str, logs: list, _column_changes: list) -> None:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if col not in numeric_cols or len(numeric_cols) < 2:
        logs.append(_log(
            "missing_values", f"Skipped KNN impute for '{col}' — not numeric or not enough numeric columns",
            [col], 0, 0,
            f"KNN imputation requires at least 2 numeric columns. '{col}' dtype={df[col].dtype}.",
        ))
        return
    sub = df[numeric_cols].copy()
    before_na = int(sub[col].isna().sum())
    imputer = KNNImputer(n_neighbors=min(5, len(df) - 1))
    imputed = imputer.fit_transform(sub)
    df[numeric_cols] = imputed
    filled = before_na
    if filled > 0:
        logs.append(_log(
            "missing_values", f"KNN-imputed {filled:,} missing values in '{col}'",
            [col], filled, filled,
            f"KNN imputation (k={min(5, len(df)-1)}) filled {filled:,} missing cells in '{col}' using {len(numeric_cols)} numeric features.",
        ))


def _apply_outlier_strategies(df: pd.DataFrame, strategies: dict[str, str], _total_rows: int) -> tuple[list[dict], pd.DataFrame, list[dict]]:
    logs: list[dict] = []
    column_changes: list[dict] = []
    to_remove: set[int] = set()

    for col, strategy in strategies.items():
        if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
            continue
        s = df[col].dropna()
        if len(s) < 4:
            continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outlier_mask = (df[col] < lower) | (df[col] > upper)
        outlier_indices = set(df[outlier_mask].index.tolist())
        outlier_count = len(outlier_indices)
        if outlier_count == 0:
            continue

        if strategy == "winsorize":
            df[col] = df[col].clip(lower, upper)
            logs.append(_log(
                "outliers", f"Winsorized {outlier_count:,} outliers in '{col}'",
                [col], outlier_count, outlier_count,
                f"Capped {outlier_count:,} outliers ({outlier_count/max(len(s),1)*100:.1f}%) in '{col}' at IQR bounds [{lower:.4f}, {upper:.4f}].",
            ))
            column_changes.append({"column": col, "changes": [f"winsorized {outlier_count} outliers"]})

        elif strategy == "remove":
            to_remove |= outlier_indices
            logs.append(_log(
                "outliers", f"Queued {outlier_count:,} outlier rows in '{col}' for removal",
                [col], outlier_count, outlier_count,
                f"Marked {outlier_count:,} rows ({outlier_count/max(len(s),1)*100:.1f}%) with outliers in '{col}' for removal.",
            ))

        else:
            logs.append(_log(
                "outliers", f"Left {outlier_count:,} outliers in '{col}' as-is (user choice)",
                [col], 0, 0,
                f"Outlier column '{col}' has {outlier_count:,} extreme values ({outlier_count/max(len(s),1)*100:.1f}%). No action taken per user config.",
            ))

    if to_remove:
        before = len(df)
        df = df.drop(index=to_remove).reset_index(drop=True)
        removed = before - len(df)
        outlier_log = next((log for log in logs if log["step"] == "outliers" and "Queued" in log["description"]), None)
        if outlier_log:
            outlier_log["rows_affected"] = removed
            outlier_log["cells_affected"] = removed * len(df.columns)
            outlier_log["details"] = f"Removed {removed:,} rows containing outliers across multiple columns."

    return logs, df, column_changes


_DATE_PATTERNS = [
    re.compile(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}"),
    re.compile(r"\d{1,2}[-/]\d{1,2}[-/]\d{4}"),
    re.compile(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}T"),
]

_CURRENCY_RE = re.compile(r"^[\$€£¥₹]")
_COMMA_RE = re.compile(r",(?=\d)")


def _fix_dtype_issues(df: pd.DataFrame) -> tuple[list[dict], pd.DataFrame, list[dict]]:
    logs: list[dict] = []
    column_changes: list[dict] = []
    for col in df.columns:
        s = df[col]
        if s.dtype != "object":
            continue
        sample = s.dropna().head(100)
        if len(sample) < 3:
            continue
        str_sample = sample.astype(str)

        has_currency = str_sample.str.contains(_CURRENCY_RE).any()
        has_commas = str_sample.str.contains(_COMMA_RE).any()
        has_dates = str_sample.apply(lambda x: bool(_DATE_PATTERNS[0].search(x) or _DATE_PATTERNS[1].search(x) or _DATE_PATTERNS[2].search(x))).any()

        changed = 0
        details: list[str] = []

        if has_currency or has_commas:
            cleaned = str_sample.str.replace(_CURRENCY_RE, "", regex=True).str.replace(",", "", regex=False)
            numeric = pd.to_numeric(cleaned, errors="coerce")
            num_ratio = numeric.notna().sum() / max(len(cleaned), 1)
            if num_ratio > 0.7:
                df[col] = numeric
                changed = int(numeric.notna().sum())
                if has_currency:
                    details.append("stripped currency symbols")
                if has_commas:
                    details.append("removed thousand separators")
                details.append(f"converted to numeric ({changed:,} values)")

        if has_dates and df[col].dtype == "object":
            parsed = pd.to_datetime(s, errors="coerce", infer_datetime_format=True)
            dt_ratio = parsed.notna().sum() / max(len(s.dropna()), 1)
            if dt_ratio > 0.7:
                df[col] = parsed
                details.append(f"parsed as datetime ({int(parsed.notna().sum()):,} values)")

        if details:
            logs.append(_log(
                "dtype_fix", f"Fixed data types in '{col}'",
                [col], changed, changed,
                "; ".join(details),
            ))
            column_changes.append({"column": col, "changes": details})

    return logs, df, column_changes


def _standardize_categorical(df: pd.DataFrame) -> tuple[list[dict], pd.DataFrame, list[dict]]:
    logs: list[dict] = []
    column_changes: list[dict] = []

    for col in df.columns:
        s = df[col]
        if s.dtype not in ("object", "string", "category"):
            continue
        str_series = s.astype(str)
        str_no_na = str_series[s.notna()]
        if len(str_no_na) < 3:
            continue
        changes: list[str] = []

        trimmed = str_no_na.str.strip()
        trimmed_diff = int((trimmed != str_no_na).sum())
        if trimmed_diff > 0:
            df[col] = df[col].astype(str).str.strip()
            changes.append(f"trimmed whitespace from {trimmed_diff:,} values")

        lowered = df[col].astype(str).str.lower()
        lower_diff = int((lowered != df[col].astype(str)).sum())
        if lower_diff > 0:
            current_unique = df[col].dropna().nunique()
            df[col] = lowered
            new_unique = df[col].dropna().nunique()
            changes.append(f"standardized case ({lower_diff:,} values, unique went from {current_unique}→{new_unique})")

        near_dupes = _find_near_duplicate_categories(df[col])
        if near_dupes:
            changes.append(f"flagged {len(near_dupes)} potential typo groups: {', '.join(near_dupes)}")

        if changes:
            logs.append(_log(
                "categorical_clean", f"Standardized categorical column '{col}'",
                [col], 0, lower_diff + trimmed_diff,
                "; ".join(changes),
            ))
            column_changes.append({"column": col, "changes": changes})

    return logs, df, column_changes


def _find_near_duplicate_categories(s: pd.Series) -> list[str]:
    uniq = s.dropna().unique()
    if len(uniq) > 100:
        return []
    pairs: list[str] = []
    seen = set()
    for i, a in enumerate(uniq):
        for b in uniq[i + 1:]:
            if not isinstance(a, str) or not isinstance(b, str):
                continue
            if a == b:
                continue
            key = tuple(sorted([a, b]))
            if key in seen:
                continue
            score = _levenshtein_ratio(a, b)
            if score > 0.8:
                pairs.append(f"'{a}'↔'{b}'")
                seen.add(key)
    return pairs


def _levenshtein_ratio(a: str, b: str) -> float:
    if not a and not b:
        return 1.0
    n, m = len(a), len(b)
    dp = list(range(m + 1))
    for i in range(1, n + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, m + 1):
            temp = dp[j]
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[j] = min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
            prev = temp
    return 1 - dp[m] / max(n, m, 1)


def _drop_constant_columns(df: pd.DataFrame) -> tuple[list[dict], pd.DataFrame, list[dict]]:
    logs: list[dict] = []
    column_changes: list[dict] = []
    drop_cols: list[str] = []

    for col in df.columns:
        s = df[col].dropna()
        if len(s) == 0:
            drop_cols.append(col)
            logs.append(_log(
                "drop_constant", f"Dropped fully-empty column '{col}'",
                [col], 0, 0,
                f"Column '{col}' had zero non-null values. Dropped.",
            ))
            continue
        nunique = s.nunique()
        if nunique <= 1:
            drop_cols.append(col)
            val = s.iloc[0] if len(s) > 0 else "N/A"
            logs.append(_log(
                "drop_constant", f"Dropped constant column '{col}'",
                [col], 0, 0,
                f"Column '{col}' had only 1 unique value ({val}). Dropped.",
            ))
        elif nunique == 2:
            vc = s.value_counts(normalize=True)
            top_pct = float(vc.iloc[0])
            if top_pct > 0.99:
                drop_cols.append(col)
                logs.append(_log(
                    "drop_constant", f"Dropped near-constant column '{col}'",
                    [col], 0, 0,
                    f"Column '{col}' had {top_pct*100:.1f}% same value ('{vc.index[0]}'). Dropped.",
                ))

    if drop_cols:
        for c in drop_cols:
            column_changes.append({"column": c, "changes": ["column dropped (constant/empty)"]})
        df = df.drop(columns=drop_cols)

    return logs, df, column_changes
