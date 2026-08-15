# MLPilot — REST API

> **Scope note:** This documents the **current, implemented** API. There is
> **no authentication** in the current build — the app runs as a single local
> user. Multi-user/session isolation is provided by an optional `?session_id=`
> query parameter on most endpoints (omitted ⇒ the `default_user` owns the data).
> Auth (`/auth/*`), experiments, and a dashboard aggregate endpoint are **not
> implemented**; do not rely on them.

---

## 1. Base URL

```
Local:    http://localhost:8000/api/v1
```

In development the frontend (Vite, port 5173) and the Docker nginx (port 80)
proxy `/api` to the backend, so the SPA can call relative paths.

---

## 2. Response Shape

### Success

Endpoints return the resource object (or a list/dict) **directly** — there is no
`{ "data": ..., "meta": ... }` wrapper. For example:

```json
{ "id": "660e8400-...", "name": "training_data_v3.csv", "status": "ready", "...": "..." }
```

### List endpoints

List endpoints return a paginated envelope:

```json
{
  "items": [ ... ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

### Error

All errors use a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File size exceeds maximum of 5120 MB",
    "field": "file"
  }
}
```

| HTTP | Code | Meaning |
|------|------|---------|
| 400  | `BAD_REQUEST` | Malformed request |
| 404  | `NOT_FOUND` | Resource does not exist |
| 409  | `CONFLICT` | Conflict (e.g. pipeline already running) |
| 422  | `VALIDATION_ERROR` | Request body/param failed validation |
| 500  | `INTERNAL_ERROR` | Unexpected server error |

---

## 3. Pagination

All list endpoints accept:

| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `page`    | integer ≥ 1 | 1 | — |
| `per_page`| integer 1–100 | 20 | 100 |

Example: `GET /api/v1/datasets/?page=2&per_page=20`.

---

## 4. Endpoints

### 4.1 Health

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Health check (`{"status":"ok","version":"0.1.0"}`) |
| `GET`  | `/api/v1/health` | Same, versioned |

### 4.2 Datasets

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/datasets/upload` | Upload dataset (CSV/Parquet/JSON/XLSX); returns the dataset record (status `uploading`/`ready`) |
| `GET`  | `/api/v1/datasets/` | List datasets (paginated) |
| `GET`  | `/api/v1/datasets/{id}` | Get dataset + summary |
| `DELETE` | `/api/v1/datasets/{id}` | Delete dataset (cascades to pipelines/models/EDA/cleaning) |
| `GET`  | `/api/v1/datasets/{id}/columns` | Column statistics |

Upload validation: size ≤ `MAX_DATASET_SIZE_MB` (default 5120 MB); format and
extension checked server-side.

### 4.3 EDA

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/datasets/{id}/eda` | Start async EDA computation |
| `GET`  | `/api/v1/datasets/{id}/eda` | Get EDA report / status (poll this endpoint) |

The EDA report includes column stats, a correlation matrix, and auto-generated
findings (warnings/info about missing values, correlations, outliers, duplicates).

### 4.4 Cleaning

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/v1/datasets/{id}/cleaning/suggestions` | Suggested 6-step cleaning config |
| `POST` | `/api/v1/datasets/{id}/cleaning/execute` | Run the cleaning pipeline |
| `GET`  | `/api/v1/datasets/{id}/cleaning/runs` | Cleaning run history |
| `GET`  | `/api/v1/datasets/{id}/cleaning/report/{run_id}` | Cleaning run report |
| `GET`  | `/api/v1/datasets/{id}/cleaning/download/{run_id}` | Download cleaned CSV |

### 4.5 Preprocessing Pipelines

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/pipelines/suggest` | Suggest a pipeline config for a dataset |
| `POST` | `/api/v1/pipelines/detect-target` | Auto-detect the target column |
| `POST` | `/api/v1/pipelines/` | Create pipeline |
| `GET`  | `/api/v1/pipelines/` | List pipelines (paginated) |
| `GET`  | `/api/v1/pipelines/{id}` | Get pipeline + steps |
| `PUT`  | `/api/v1/pipelines/{id}` | Update pipeline |
| `DELETE` | `/api/v1/pipelines/{id}` | Delete pipeline |
| `POST` | `/api/v1/pipelines/{id}/execute` | Execute pipeline (background) |
| `POST` | `/api/v1/pipelines/{id}/score` | Score new data with the resulting model |

Steps support imputation (incl. KNN), encoding (OHE / label / target), scaling,
train/test split, feature selection, and imbalance handling (SMOTE / class
weights).

### 4.6 Training

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/training/` | Train model(s) — single or multi-algorithm batch |
| `GET`  | `/api/v1/training/models` | List models (paginated) |
| `GET`  | `/api/v1/training/models/compare` | Compare models (leaderboard) |
| `GET`  | `/api/v1/training/models/{id}` | Get model + metrics |
| `GET`  | `/api/v1/training/models/{id}/download` | Download model artifact (`.pkl`/ZIP) |
| `POST` | `/api/v1/training/models/{id}/set-best` | Mark model as best |
| `GET`  | `/api/v1/training/models/{id}/plots` | Diagnostic plots (confusion, ROC/PR, importance, residuals) |
| `GET`  | `/api/v1/training/models/{id}/explain` | SHAP waterfall explanation |
| `POST` | `/api/v1/training/models/{id}/predict` | Predict on an uploaded file |
| `GET`  | `/api/v1/training/models/{id}/export/cleaned` | Export cleaned CSV |
| `GET`  | `/api/v1/training/models/{id}/export/preprocessed` | Export preprocessed splits (ZIP) |
| `GET`  | `/api/v1/training/models/{id}/export/recipe` | Export inference recipe (ZIP) |
| `GET`  | `/api/v1/training/models/{id}/export/report` | Executive HTML report |
| `GET`  | `/api/v1/training/predictions/download` | Download latest predictions CSV |
| `GET`  | `/api/v1/training/jobs` | List jobs (paginated) |
| `GET`  | `/api/v1/training/jobs/{id}` | Get job status/progress/log |
| `POST` | `/api/v1/training/jobs/{id}/cancel` | Cancel job (cooperative) |

Training supports 10 algorithms with cross-validation and
`RandomizedSearchCV` tuning. Jobs expose a lifecycle
(`queued → running → completed/failed/cancelled`) and are cancelled cooperatively.

### 4.7 Settings

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/v1/settings/` | Get app settings |
| `PUT`  | `/api/v1/settings/` | Update app settings |

---

## 5. Cross-Origin (CORS)

Allowed origins are controlled by the `CORS_ORIGINS` environment variable
(default `["http://localhost:5173"]`). The dev frontend reaches the API through
the Vite/nginx `/api` proxy, so CORS is typically not needed locally.
