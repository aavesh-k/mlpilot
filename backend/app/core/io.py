from pathlib import Path

import pandas as pd

from app.core.exceptions import NotFoundError, ValidationError


def read_dataframe(dataset: dict) -> pd.DataFrame:
    file_path = Path(dataset["file_path"])
    if not file_path.exists():
        raise NotFoundError("Dataset file", str(file_path))

    ext = f".{dataset['file_format']}"
    try:
        if ext == ".csv":
            return pd.read_csv(file_path, low_memory=False)
        elif ext == ".parquet":
            return pd.read_parquet(file_path)
        elif ext == ".json":
            return pd.read_json(file_path)
        elif ext == ".xlsx":
            return pd.read_excel(file_path)
        else:
            raise ValidationError("Unsupported format")
    except Exception as e:
        raise ValidationError(f"Failed to read dataset: {e}") from None
