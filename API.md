# MLPilot — REST API Design

---

## 1. Base URL

```
http://localhost:8000/api/v1
```

Production: `https://api.mlpilot.io/v1`

---

## 2. Authentication Strategy

### 2.1 Mechanism

- **Type:** JWT (Bearer token)
- **Access token:** Short-lived (30 minutes), sent in `Authorization: Bearer <token>` header
- **Refresh token:** Long-lived (7 days), stored in `localStorage`, sent to `/auth/refresh`
- **Algorithm:** HS256
- **Claims:** `sub` (user UUID), `exp` (expiry), `iat` (issued at), `type` ("access" | "refresh")

### 2.2 Flow

```
Client                              Server
  │                                    │
  │  POST /auth/login                  │
  │  { email, password }               │
  │───────────────────────────────────►│
  │                                    │  Verify credentials
  │                                    │  Generate access_token (30m)
  │  { access_token,                   │  Generate refresh_token (7d)
  │    refresh_token,                  │
  │    token_type: "bearer",           │
  │    expires_in: 1800 }              │
  │◄───────────────────────────────────│
  │                                    │
  │  GET /auth/me                      │
  │  Authorization: Bearer <token>     │
  │───────────────────────────────────►│
  │                                    │  Decode + validate token
  │  { id, email, username }           │  Fetch user from DB
  │◄───────────────────────────────────│
  │                                    │
  │  POST /auth/refresh                │
  │  { refresh_token }                 │
  │───────────────────────────────────►│
  │                                    │  Validate refresh token
  │  { access_token,                   │  Issue new access token
  │    expires_in: 1800 }              │
  │◄───────────────────────────────────│
```

### 2.3 Security Rules

| Rule | Detail |
|---|---|
| **Token storage** | Access token in memory (Zustand). Refresh token in `localStorage`. Never in URL params. |
| **Token revocation** | No server-side blacklist for MVP. Token expiry is the revocation mechanism. |
| **Password storage** | bcrypt with cost factor 12. Never stored in plaintext. Never logged. |
| **Rate limiting** | `/auth/login`: 5 attempts per minute per IP. `/auth/register`: 3 per hour per IP. |
| **CORS** | `Access-Control-Allow-Origin: http://localhost:5173` (dev). Configurable via `CORS_ORIGINS` env. |

---

## 3. Standard Response Envelope

### Success

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  },
  "error": null
}
```

### Error

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File size exceeds maximum of 5120 MB",
    "field": "file",
    "details": [
      { "field": "file", "message": "File size must be ≤ 5120 MB", "code": "max_size_exceeded" }
    ]
  },
  "meta": null
}
```

### Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `TOKEN_EXPIRED` | Access token expired |
| 403 | `FORBIDDEN` | Authenticated but not authorised |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource |
| 422 | `VALIDATION_ERROR` | Request body failed validation |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `SERVICE_UNAVAILABLE` | ML backend offline |

---

## 4. Pagination, Filtering & Sorting

### 4.1 Pagination

| Parameter | Type | Default | Max |
|---|---|---|---|
| `page` | integer ≥ 1 | 1 | — |
| `per_page` | integer 1–100 | 20 | 100 |

**Request:** `GET /datasets?page=2&per_page=20`
**Response meta:** `{ "page": 2, "per_page": 20, "total": 42, "total_pages": 3 }`
**Headers:** `X-Total-Count: 42`, `X-Page: 2`, `X-Per-Page: 20`

### 4.2 Filtering

**Syntax:** `GET /resource?field=value`

| Endpoint | Filters |
|---|---|
| `GET /datasets` | `?status=ready`, `?format=csv`, `?name__contains=training` |
| `GET /models` | `?algorithm=random_forest`, `?status=completed`, `?dataset_id=<uuid>` |
| `GET /training/jobs` | `?status=running`, `?model_id=<uuid>` |
| `GET /experiments` | `?name__contains=pipeline` |

**Filter operators:**

| Operator | Behaviour | Example |
|---|---|---|
| `=` | Exact match (default) | `?status=ready` |
| `__contains` | Substring match | `?name__contains=v3` |
| `__gt` | Greater than | `?file_size_bytes__gt=1000000` |
| `__lt` | Less than | `?row_count__lt=1000` |
| `__in` | Comma-separated list | `?status__in=ready,processing` |

### 4.3 Sorting

**Syntax:** `GET /resource?sort=<field>&order=asc|desc`

| Parameter | Type | Default |
|---|---|---|
| `sort` | string | `created_at` |
| `order` | `asc` or `desc` | `desc` |

**Examples:**
- `GET /datasets?sort=file_size_bytes&order=desc`
- `GET /models?sort=metrics.accuracy&order=desc` (JSONB nested sort)
- `GET /training/jobs?sort=created_at&order=asc`

---

## 5. Endpoints

---

### 5.1 Authentication

#### `POST /auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@mlpilot.io",
  "username": "engineer42",
  "password": "SecureP@ss123",
  "password_confirm": "SecureP@ss123"
}
```

**Validation:**
| Field | Rule |
|---|---|
| `email` | Valid email format. Max 320 chars. Unique in system. |
| `username` | 3–100 chars. Alphanumeric + underscore + hyphen. Unique in system. |
| `password` | Min 8 chars. Must contain uppercase, lowercase, digit. |
| `password_confirm` | Must match `password`. |

**Response `201 Created`:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@mlpilot.io",
    "username": "engineer42",
    "created_at": "2026-07-16T12:00:00Z"
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 409 | `CONFLICT` | Email or username already exists |
| 422 | `VALIDATION_ERROR` | Invalid field format |

---

#### `POST /auth/login`

Authenticate and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@mlpilot.io",
  "password": "SecureP@ss123"
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@mlpilot.io",
      "username": "engineer42"
    }
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Invalid email or password |
| 429 | `RATE_LIMITED` | Too many login attempts |

---

#### `POST /auth/refresh`

Refresh an expired access token.

**Request Body:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Invalid or expired refresh token |

---

#### `GET /auth/me`

Get current authenticated user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response `200 OK`:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@mlpilot.io",
    "username": "engineer42",
    "created_at": "2026-07-16T12:00:00Z"
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid token |

---

### 5.2 Datasets

#### `POST /datasets/upload`

Upload a dataset file.

**Headers:** `Content-Type: multipart/form-data`
**Body:** `file` (binary), `name` (optional string)

**Validation:**
| Rule | Detail |
|---|---|
| File size | ≤ 5120 MB (5 GB) |
| File format | `.csv`, `.parquet`, `.json`, `.xlsx` |
| File extension | Checked server-side via MIME type + extension |

**Response `201 Created`:**
```json
{
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "training_data_v3.csv",
    "original_filename": "training_data_v3.csv",
    "file_format": "csv",
    "file_size_bytes": 1234567890,
    "row_count": null,
    "column_count": null,
    "status": "uploading",
    "created_at": "2026-07-16T12:00:00Z"
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | No file provided |
| 422 | `VALIDATION_ERROR` | File too large, invalid format |
| 401 | `UNAUTHORIZED` | Not authenticated |

---

#### `GET /datasets`

List user's datasets.

**Query params:** `page`, `per_page`, `sort`, `order`, `status`, `format`, `name__contains`

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "training_data_v3.csv",
      "file_format": "csv",
      "file_size_bytes": 1234567890,
      "row_count": 10240,
      "column_count": 12,
      "status": "ready",
      "created_at": "2026-07-16T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 5, "total_pages": 1 }
}
```

---

#### `GET /datasets/{dataset_id}`

Get dataset detail with summary stats.

**Response `200 OK`:**
```json
{
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "training_data_v3.csv",
    "original_filename": "training_data_v3.csv",
    "file_format": "csv",
    "file_size_bytes": 1234567890,
    "file_size_human": "1.2 GB",
    "row_count": 10240,
    "column_count": 12,
    "status": "ready",
    "columns": [
      { "name": "feature_a", "dtype": "float64", "missing_count": 0, "missing_ratio": 0.0 },
      { "name": "feature_b", "dtype": "object", "missing_count": 235, "missing_ratio": 0.023 }
    ],
    "created_at": "2026-07-16T12:00:00Z"
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Dataset does not exist or belongs to another user |
| 401 | `UNAUTHORIZED` | Not authenticated |

---

#### `DELETE /datasets/{dataset_id}`

Delete dataset and its file.

**Response `204 No Content`**

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Dataset does not exist |
| 409 | `CONFLICT` | Dataset has active pipelines or models |

---

### 5.3 EDA

#### `GET /datasets/{dataset_id}/eda`

Get full EDA report.

**Response `200 OK`:**
```json
{
  "data": {
    "dataset_id": "660e8400-e29b-41d4-a716-446655440001",
    "computed_at": "2026-07-16T12:05:00Z",
    "column_stats": [
      {
        "name": "feature_a",
        "ordinal_position": 1,
        "dtype": "float64",
        "is_numeric": true,
        "is_categorical": false,
        "missing_count": 0,
        "missing_ratio": 0.0,
        "unique_count": 1024,
        "mean": 0.452,
        "std": 0.128,
        "min": -2.1,
        "max": 3.4,
        "p25": 0.321,
        "p50": 0.450,
        "p75": 0.589,
        "skewness": 0.32,
        "kurtosis": 1.8
      }
    ],
    "correlation_matrix": {
      "feature_a": { "feature_a": 1.0, "feature_b": 0.32, "target": 0.89 },
      "feature_b": { "feature_a": 0.32, "feature_b": 1.0, "target": 0.12 },
      "target": { "feature_a": 0.89, "feature_b": 0.12, "target": 1.0 }
    },
    "findings": [
      {
        "severity": "warning",
        "title": "High Correlation Detected",
        "description": "feature_a and target show 0.89 correlation. Consider multicollinearity analysis.",
        "affected_columns": ["feature_a", "target"]
      },
      {
        "severity": "info",
        "title": "Missing Values Present",
        "description": "feature_b has 2.3% missing values. Imputation recommended.",
        "affected_columns": ["feature_b"]
      }
    ]
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Dataset not found |
| 409 | `CONFLICT` | Dataset status is not `ready` |
| 422 | `UNPROCESSABLE` | Dataset has no columns |

---

### 5.4 Preprocessing Pipelines

#### `POST /pipelines`

Create a preprocessing pipeline.

**Request Body:**
```json
{
  "dataset_id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Standard Pipeline v1",
  "test_split_ratio": 0.2,
  "random_seed": 42,
  "steps": [
    {
      "step_type": "imputation",
      "step_order": 1,
      "config": { "strategy": "mean" },
      "columns": null
    },
    {
      "step_type": "encoding",
      "step_order": 2,
      "config": { "strategy": "one_hot" },
      "columns": ["feature_b", "feature_c"]
    },
    {
      "step_type": "scaling",
      "step_order": 3,
      "config": { "strategy": "standard" },
      "columns": null
    },
    {
      "step_type": "train_test_split",
      "step_order": 4,
      "config": { "ratio": 0.2 },
      "columns": null
    }
  ]
}
```

**Validation:**
| Rule | Detail |
|---|---|
| Step sequence | Imputation before encoding when missing values exist |
| Step count | Minimum 1 step, maximum 10 steps |
| Config per type | Valid strategy for the step type |
| Columns | Must reference existing dataset columns |

**Response `201 Created`:**
```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "dataset_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Standard Pipeline v1",
    "status": "draft",
    "test_split_ratio": 0.2,
    "steps": [ ... ],
    "created_at": "2026-07-16T12:10:00Z"
  }
}
```

---

#### `GET /pipelines`

List pipelines for current user.

**Query params:** `page`, `per_page`, `dataset_id`, `status`

---

#### `GET /pipelines/{pipeline_id}`

Get pipeline detail with steps.

---

#### `PUT /pipelines/{pipeline_id}`

Update pipeline steps or config.

---

#### `DELETE /pipelines/{pipeline_id}`

Delete pipeline. Cannot delete if status is `running`.

---

#### `POST /pipelines/{pipeline_id}/execute`

Execute the pipeline.

**Response `202 Accepted`:**
```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "running",
    "started_at": "2026-07-16T12:15:00Z"
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 409 | `CONFLICT` | Pipeline already running or already completed |

---

### 5.5 Models

#### `POST /models`

Register and start training a model.

**Request Body:**
```json
{
  "dataset_id": "660e8400-e29b-41d4-a716-446655440001",
  "pipeline_id": "770e8400-e29b-41d4-a716-446655440002",
  "experiment_id": null,
  "name": "Random Forest v1",
  "algorithm": "random_forest",
  "hyperparameters": {
    "n_estimators": 100,
    "max_depth": 12,
    "min_samples_split": 2,
    "random_state": 42
  }
}
```

**Validation:**
| Field | Rule |
|---|---|
| `algorithm` | Must be one of: `random_forest`, `xgboost`, `svm`, `logistic_regression` |
| `hyperparameters` | Validated per algorithm (different params for RF vs XGB) |
| `dataset_id` | Must exist and belong to user |
| `pipeline_id` | If provided, must be completed and match dataset |

**Response `201 Created`:**
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "Random Forest v1",
    "algorithm": "random_forest",
    "status": "pending",
    "job_id": "990e8400-e29b-41d4-a716-446655440004",
    "created_at": "2026-07-16T12:20:00Z"
  }
}
```

---

#### `GET /models`

List user's models.

**Query params:** `page`, `per_page`, `status`, `algorithm`, `dataset_id`, `experiment_id`, `sort`, `order`

**Sortable fields:** `created_at`, `name`, `algorithm`, `status`, `metrics.accuracy`

---

#### `GET /models/{model_id}`

Get model detail with metrics.

```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "Random Forest v1",
    "algorithm": "random_forest",
    "status": "completed",
    "hyperparameters": { ... },
    "metrics": {
      "accuracy": 0.962,
      "f1_score": 0.958,
      "precision": 0.953,
      "recall": 0.967,
      "roc_auc": 0.981
    },
    "training_duration_ms": 45200,
    "file_path": "data/models/880e...pkl",
    "created_at": "2026-07-16T12:25:00Z"
  }
}
```

---

#### `GET /models/compare`

Compare multiple models.

**Query params:** `?ids=id1,id2,id3`

```json
{
  "data": [
    {
      "id": "880e...",
      "name": "Random Forest v1",
      "algorithm": "random_forest",
      "metrics": { "accuracy": 0.962, "f1_score": 0.958 },
      "training_duration_ms": 45200,
      "is_best": true
    },
    {
      "id": "881e...",
      "name": "XGBoost v1",
      "algorithm": "xgboost",
      "metrics": { "accuracy": 0.947, "f1_score": 0.941 },
      "training_duration_ms": 82300,
      "is_best": false
    }
  ]
}
```

---

#### `GET /models/{model_id}/download`

Download trained model artifact.

**Response:** Binary `.pkl` file with `Content-Type: application/octet-stream`
**Headers:** `Content-Disposition: attachment; filename="random_forest_v1.pkl"`

---

#### `DELETE /models/{model_id}`

Delete model and artifact file.

---

### 5.6 Training Jobs

#### `GET /training/jobs/{job_id}`

Get training job status.

```json
{
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "model_id": "880e8400-e29b-41d4-a716-446655440003",
    "status": "running",
    "progress": 63.5,
    "log": "[2026-07-16 12:23:00] Fold 3/5 complete\n[2026-07-16 12:23:45] Fold 4/5 complete",
    "started_at": "2026-07-16T12:22:00Z",
    "estimated_completion": "2026-07-16T12:26:30Z"
  }
}
```

---

#### `POST /training/jobs/{job_id}/cancel`

Cancel a running training job.

**Response `200 OK`:**
```json
{
  "data": {
    "id": "990e...",
    "status": "cancelled",
    "cancelled_at": "2026-07-16T12:24:00Z"
  }
}
```

**Errors:**
| HTTP | Code | When |
|---|---|---|
| 409 | `CONFLICT` | Job is not in `running` or `queued` state |

---

### 5.7 Experiments

#### `POST /experiments`

```json
{
  "name": "Hyperparameter Tuning Run 1",
  "description": "Testing n_estimators: 50, 100, 200"
}
```

#### `GET /experiments`

List experiments.

#### `GET /experiments/{experiment_id}`

Get experiment with linked model comparison.

```json
{
  "data": {
    "id": "aa0e...",
    "name": "Hyperparameter Tuning Run 1",
    "description": "Testing n_estimators: 50, 100, 200",
    "models": [
      { "id": "...", "name": "RF n=50", "metrics": { "accuracy": 0.942 } },
      { "id": "...", "name": "RF n=100", "metrics": { "accuracy": 0.962 }, "is_best": true },
      { "id": "...", "name": "RF n=200", "metrics": { "accuracy": 0.958 } }
    ],
    "created_at": "2026-07-16T12:30:00Z"
  }
}
```

#### `POST /experiments/{experiment_id}/models`

Link a model to the experiment.

```json
{
  "model_id": "880e8400-e29b-41d4-a716-446655440003"
}
```

#### `DELETE /experiments/{experiment_id}/models/{model_id}`

Unlink a model from the experiment.

---

### 5.8 Settings

#### `GET /settings`

```json
{
  "data": {
    "max_memory_mb": 8192,
    "max_runtime_seconds": 14400,
    "max_concurrent_jobs": 2,
    "theme": "dark"
  }
}
```

#### `PUT /settings`

```json
{
  "max_memory_mb": 16384,
  "max_runtime_seconds": 28800,
  "max_concurrent_jobs": 3,
  "theme": "light"
}
```

**Validation:**
| Field | Min | Max |
|---|---|---|
| `max_memory_mb` | 512 | 65536 |
| `max_runtime_seconds` | 300 | 86400 |
| `max_concurrent_jobs` | 1 | 10 |
| `theme` | — | Must be `light` or `dark` |

---

### 5.9 Dashboard

#### `GET /dashboard`

Aggregated dashboard data.

```json
{
  "data": {
    "welcome": { "username": "engineer42", "dataset_count": 5 },
    "recent_projects": [
      { "id": "...", "name": "Alpha-Neural-X", "accuracy": 0.962, "dataset_size": "1.2GB" }
    ],
    "recent_activity": [
      { "type": "training_complete", "message": "Hyper-parameter Tuning Complete", "timestamp": "14:02 UTC" }
    ],
    "cluster_health": {
      "gpu_utilization": 88,
      "storage_capacity": 42,
      "throughput": "optimal"
    },
    "stats": {
      "total_datasets": 5,
      "total_models": 12,
      "completed_jobs": 10,
      "running_jobs": 2,
      "failed_jobs": 0
    }
  }
}
```

---

## 6. Status Codes Summary

| Method | 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| POST /auth/register | — | ✓ | — | — | — | — | — | — | ✓ | ✓ | ✓ | ✓ |
| POST /auth/login | ✓ | — | — | — | — | — | — | — | — | ✓ | ✓ | ✓ |
| POST /auth/refresh | ✓ | — | — | — | — | — | — | — | — | ✓ | — | ✓ |
| GET /auth/me | ✓ | — | — | — | — | ✓ | — | — | — | — | — | ✓ |
| POST /datasets/upload | — | ✓ | — | — | ✓ | ✓ | — | — | — | ✓ | — | ✓ |
| GET /datasets | ✓ | — | — | — | — | ✓ | — | — | — | — | — | ✓ |
| GET /datasets/{id} | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — | ✓ |
| DELETE /datasets/{id} | — | — | — | ✓ | — | ✓ | — | ✓ | ✓ | — | — | ✓ |
| GET /datasets/{id}/eda | ✓ | — | — | — | — | ✓ | — | ✓ | ✓ | ✓ | — | ✓ |
| POST /pipelines | — | ✓ | — | — | — | ✓ | — | — | — | ✓ | — | ✓ |
| GET /pipelines | ✓ | — | — | — | — | ✓ | — | — | — | — | — | ✓ |
| GET /pipelines/{id} | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — | ✓ |
| PUT /pipelines/{id} | ✓ | — | — | — | — | ✓ | — | ✓ | — | ✓ | — | ✓ |
| DELETE /pipelines/{id} | — | — | — | ✓ | — | ✓ | — | ✓ | ✓ | — | — | ✓ |
| POST /pipelines/{id}/execute | — | — | ✓ | — | — | ✓ | — | ✓ | ✓ | — | — | ✓ |
| POST /models | — | ✓ | — | — | — | ✓ | — | — | — | ✓ | — | ✓ |
| GET /models | ✓ | — | — | — | — | ✓ | — | — | — | — | — | ✓ |
| GET /models/{id} | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — | ✓ |
| GET /models/compare | ✓ | — | — | — | — | ✓ | — | — | — | ✓ | — | ✓ |
| GET /models/{id}/download | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — | ✓ |
| DELETE /models/{id} | — | — | — | ✓ | — | ✓ | — | ✓ | — | — | — | ✓ |
| GET /training/jobs/{id} | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — | ✓ |
| POST /training/jobs/{id}/cancel | ✓ | — | — | — | — | ✓ | — | ✓ | ✓ | — | — | ✓ |
| POST /experiments | — | ✓ | — | — | — | ✓ | — | — | — | ✓ | — | ✓ |
| GET /experiments | ✓ | — | — | — | — | ✓ | — | — | — | — | — | ✓ |
| GET /experiments/{id} | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — | ✓ |
| POST /experiments/{id}/models | — | ✓ | — | — | — | ✓ | — | ✓ | ✓ | ✓ | — | ✓ |
| DELETE /experiments/{id}/models/{mid} | — | — | — | ✓ | — | ✓ | — | ✓ | — | — | — | ✓ |
| GET /settings | ✓ | — | — | — | — | ✓ | — | — | — | — | — | ✓ |
| PUT /settings | ✓ | — | — | — | — | ✓ | — | — | — | ✓ | — | ✓ |
| GET /dashboard | ✓ | — | — | — | — | ✓ | — | — | — | — | — | ✓ |
