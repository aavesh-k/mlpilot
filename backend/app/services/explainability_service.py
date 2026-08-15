from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import pandas as pd


def calculate_waterfall_explanation(
    pipeline: Any,
    sample_df: pd.DataFrame,
    baseline_df: pd.DataFrame,
    problem_type: str = "classification",
    target_class_idx: int = 1
) -> dict:
    """
    Computes local attribution values for a single sample row relative to a baseline row.
    Guarantees that the sum of attributions equals the total prediction difference.
    """
    import numpy as np

    columns = list(sample_df.columns)

    # 1. Evaluate baseline prediction
    if problem_type == "classification":
        try:
            proba = pipeline.predict_proba(baseline_df)
            y_base = float(proba[0][target_class_idx])
        except Exception:
            pred = pipeline.predict(baseline_df)
            y_base = float(pred[0])
    else:
        pred = pipeline.predict(baseline_df)
        y_base = float(pred[0])

    # We will build M sequential steps. At step i, columns[:i] are from target, columns[i:] are from baseline.
    current_df = baseline_df.copy()
    y_steps = [y_base]

    for col in columns:
        current_df[col] = sample_df[col].values[0]

        # Predict at this step
        if problem_type == "classification":
            try:
                proba = pipeline.predict_proba(current_df)
                y_val = float(proba[0][target_class_idx])
            except Exception:
                pred = pipeline.predict(current_df)
                y_val = float(pred[0])
        else:
            pred = pipeline.predict(current_df)
            y_val = float(pred[0])

        y_steps.append(y_val)

    # 2. Compute attributions as difference of consecutive step predictions
    features_contrib = []
    for i, col in enumerate(columns):
        contrib = y_steps[i + 1] - y_steps[i]

        # Get baseline and target display values
        base_val = baseline_df[col].values[0]
        target_val = sample_df[col].values[0]

        # Handle numpy type serialization
        if isinstance(base_val, (np.integer, np.floating)):
            base_val = float(base_val) if isinstance(base_val, np.floating) else int(base_val)
        else:
            base_val = str(base_val)

        if isinstance(target_val, (np.integer, np.floating)):
            target_val = float(target_val) if isinstance(target_val, np.floating) else int(target_val)
        else:
            target_val = str(target_val)

        features_contrib.append({
            "name": col,
            "val_base": base_val,
            "val_target": target_val,
            "contribution": float(round(contrib, 6))
        })

    # Sort attributions by absolute contribution magnitude for clean visualization
    features_contrib.sort(key=lambda x: abs(x["contribution"]), reverse=True)

    return {
        "baseline_value": float(round(y_base, 6)),
        "prediction_value": float(round(y_steps[-1], 6)),
        "difference": float(round(y_steps[-1] - y_base, 6)),
        "attributions": features_contrib
    }
