# MLPilot — Architecture Design

---

## Part 1: PostgreSQL Database Design

---

### 1.1 Entity Relationship Diagram (Textual)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   ┌──────────┐        ┌──────────────┐        ┌──────────────────┐     │
│   │  users   │1────*──│   datasets   │1────*──│ dataset_columns   │     │
│   └──────────┘        └──────────────┘        └──────────────────┘     │
│        │                     │                                          │
│        │                     │                                          │
│        │1                   │1                                          │
│        │                     │                                          │
│        │                     │                                          │
│        │*                   │*                                          │
│   ┌──────────┐        ┌──────────────┐        ┌──────────────────┐     │
│   │  models  │1────*──│  pipelines   │1────*──│  pipeline_steps  │     │
│   └──────────┘        └──────────────┘        └──────────────────┘     │
│        │                     │                                          │
│        │1                   │1                                          │
│        │                     │                                          │
│   ┌──────────┐        ┌──────────────────┐                              │
│   │training_ │        │processed_datasets│                              │
│   │   jobs   │        └──────────────────┘                              │
│   └──────────┘                                                          │
│                                                                          │
│   ┌──────────────┐     ┌──────────────────┐      ┌──────────────┐      │
│   │ experiments  │1──*─│exp_model_links   │*──1──│    models    │      │
│   └──────────────┘     └──────────────────┘      └──────────────┘      │
│                                                                          │
│   ┌──────────┐                                                          │
│   │ settings │1──1── users                                               │
│   └──────────┘                                                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Table Definitions

#### Table: `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Surrogate key; never exposed externally |
| `email` | `VARCHAR(320)` | `UNIQUE`, `NOT NULL` | RFC 5321 max length |
| `username` | `VARCHAR(100)` | `UNIQUE`, `NOT NULL` | Display name |
| `password_hash` | `VARCHAR(128)` | `NOT NULL` | bcrypt output, fixed at 60 chars but we allocate 128 for future |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT TRUE` | Soft disable without deleting data |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Indexes:**
- `UNIQUE INDEX idx_users_email ON users(email)` — fast login lookup
- `UNIQUE INDEX idx_users_username ON users(username)` — unique display names

**Design Rationale:**
- UUID over serial: avoids enumeration attacks, supports future distributed setup, portfolio best practice
- `TIMESTAMPTZ` over `TIMESTAMP`: timezone-aware timestamps prevent subtle bugs across machines
- `password_hash` at 128 chars: bcrypt max is 60, but we leave headroom for argon2 migration
- Separate `email` and `username`: enables future "login with either" UX

---

#### Table: `datasets`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `FK → users.id`, `NOT NULL` | Owner |
| `name` | `VARCHAR(255)` | `NOT NULL` | User-facing display name |
| `original_filename` | `VARCHAR(512)` | `NOT NULL` | Preserved for download UX |
| `file_path` | `VARCHAR(1024)` | `NOT NULL` | Relative path under `data/datasets/` |
| `file_size_bytes` | `BIGINT` | `NOT NULL` | Raw file size; `FileSize` value object |
| `file_format` | `VARCHAR(10)` | `NOT NULL` | Enum: `csv`, `parquet`, `json`, `xlsx` |
| `row_count` | `INTEGER` | `NULL` | Populated after ingestion |
| `column_count` | `INTEGER` | `NULL` | Populated after ingestion |
| `status` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'uploading'` | `uploading → ready → processing → ready` |
| `error_message` | `TEXT` | `NULL` | Populated if ingestion fails |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Indexes:**
- `INDEX idx_datasets_user_id ON datasets(user_id)` — user's dataset list
- `INDEX idx_datasets_status ON datasets(status)` — filter by processing state
- `INDEX idx_datasets_user_status ON datasets(user_id, status)` — compound for dashboard queries

**Design Rationale:**
- `file_path` is relative: enables moving the entire `data/` directory without DB updates
- `BIGINT` for `file_size_bytes`: CSV files can exceed 2^31 bytes (2 GB); the constraint says 5 GB max
- `file_format` stored as string not enum: avoids ALTER TYPE when adding new formats; validated at domain layer
- `row_count` and `column_count` nullable: unknown until ingestion completes; domain invariant enforced by use case
- Status as string with domain enum: string in DB (readable), typed enum in Python (safe)

---

#### Table: `dataset_columns`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `dataset_id` | `UUID` | `FK → datasets.id`, `NOT NULL`, `ON DELETE CASCADE` | |
| `name` | `VARCHAR(255)` | `NOT NULL` | Column name from source file |
| `ordinal_position` | `SMALLINT` | `NOT NULL` | Column index in original file (0-based stored as 1-based) |
| `dtype` | `VARCHAR(50)` | `NOT NULL` | pandas dtype string: `int64`, `float64`, `object`, `datetime64`, `bool` |
| `is_numeric` | `BOOLEAN` | `NOT NULL` | Derived from dtype; used for quick filtering |
| `is_categorical` | `BOOLEAN` | `NOT NULL` | Derived: object type with low unique count |
| `missing_count` | `INTEGER` | `NULL` | |
| `missing_ratio` | `FLOAT` | `NULL` | `missing_count / row_count` — precomputed for quick filtering |
| `unique_count` | `INTEGER` | `NULL` | |
| `mean` | `FLOAT` | `NULL` | NULL for non-numeric |
| `std` | `FLOAT` | `NULL` | |
| `min` | `FLOAT` | `NULL` | |
| `max` | `FLOAT` | `NULL` | |
| `p25` | `FLOAT` | `NULL` | 25th percentile |
| `p50` | `FLOAT` | `NULL` | Median |
| `p75` | `FLOAT` | `NULL` | 75th percentile |
| `skewness` | `FLOAT` | `NULL` | |
| `kurtosis` | `FLOAT` | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Indexes:**
- `UNIQUE INDEX idx_ds_cols_dataset_ordinal ON dataset_columns(dataset_id, ordinal_position)` — prevent duplicates
- `INDEX idx_ds_cols_dataset_id ON dataset_columns(dataset_id)` — fast column fetch

**Design Rationale:**
- EDA results stored as columns, not a separate JSON blob: queryable, indexable, extensible without migration (add a column)
- `missing_ratio` precomputed: avoids division on every frontend request
- Quartiles stored: enables box plot rendering without recomputation
- `is_numeric` and `is_categorical` derived booleans: saves the frontend from re-deriving dtype logic

---

#### Table: `preprocessing_pipelines`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `FK → users.id`, `NOT NULL` | |
| `dataset_id` | `UUID` | `FK → datasets.id`, `NOT NULL` | Source dataset |
| `name` | `VARCHAR(255)` | `NOT NULL` | User-given name |
| `status` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'draft'` | `draft → running → completed → failed` |
| `test_split_ratio` | `FLOAT` | `NOT NULL`, `DEFAULT 0.2` | Train-test split ratio |
| `random_seed` | `INTEGER` | `NOT NULL`, `DEFAULT 42` | Reproducibility |
| `error_message` | `TEXT` | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Indexes:**
- `INDEX idx_pipelines_user_id ON preprocessing_pipelines(user_id)`
- `INDEX idx_pipelines_dataset_id ON preprocessing_pipelines(dataset_id)`

---

#### Table: `pipeline_steps`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `pipeline_id` | `UUID` | `FK → preprocessing_pipelines.id`, `NOT NULL`, `ON DELETE CASCADE` | |
| `step_type` | `VARCHAR(50)` | `NOT NULL` | `imputation`, `encoding`, `scaling`, `train_test_split` |
| `step_order` | `SMALLINT` | `NOT NULL` | Execution order (1-based) |
| `config` | `JSONB` | `NOT NULL`, `DEFAULT '{}'` | Strategy-dependent config |
| `columns` | `TEXT[]` | `NULL` | Target column names; NULL = apply to all |

**Indexes:**
- `UNIQUE INDEX idx_pipeline_steps_order ON pipeline_steps(pipeline_id, step_order)`
- `INDEX idx_pipeline_steps_pipeline ON pipeline_steps(pipeline_id)`

**Config examples (JSONB):**
- Imputation: `{"strategy": "mean"}` or `{"strategy": "median"}`
- Encoding: `{"strategy": "one_hot"}` or `{"strategy": "label"}`
- Scaling: `{"strategy": "standard"}` or `{"strategy": "minmax"}`

**Design Rationale:**
- `JSONB` for `config`: each step type has different parameters; relational normalisation would require a dozen type-specific tables. JSONB is flexible and indexable if needed
- `TEXT[]` for `columns`: PostgreSQL array avoids a join table; column targetting is a simple contains check
- `step_order` as `SMALLINT`: unlikely to have more than 127 steps; smallint is half the storage of integer

---

#### Table: `models`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `FK → users.id`, `NOT NULL` | |
| `dataset_id` | `UUID` | `FK → datasets.id`, `NOT NULL` | Source dataset |
| `pipeline_id` | `UUID` | `FK → preprocessing_pipelines.id`, `NULL` | NULL if no preprocessing |
| `experiment_id` | `UUID` | `FK → experiments.id`, `NULL` | Optional experiment grouping |
| `name` | `VARCHAR(255)` | `NOT NULL` | Auto-generated or user-provided |
| `algorithm` | `VARCHAR(50)` | `NOT NULL` | `random_forest`, `xgboost`, `svm`, `logistic_regression` |
| `hyperparameters` | `JSONB` | `NOT NULL`, `DEFAULT '{}'` | Full hyperparameter snapshot |
| `metrics` | `JSONB` | `NULL` | Populated after training |
| `file_path` | `VARCHAR(1024)` | `NULL` | Pickled model artifact path; NULL until training completes |
| `status` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'pending'` | `pending → training → completed → failed` |
| `is_best` | `BOOLEAN` | `NOT NULL`, `DEFAULT FALSE` | Flagged as best in experiment |
| `training_duration_ms` | `INTEGER` | `NULL` | Wall-clock training time |
| `error_message` | `TEXT` | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Indexes:**
- `INDEX idx_models_user_id ON models(user_id)`
- `INDEX idx_models_dataset_id ON models(dataset_id)`
- `INDEX idx_models_experiment_id ON models(experiment_id)`
- `INDEX idx_models_status ON models(status)`

**Design Rationale:**
- `metrics` as JSONB: each algorithm has different metrics (some have ROC-AUC, some don't). A fixed schema would waste NULLs or require EAV (anti-pattern)
- `file_path` nullable: model artifact doesn't exist until training completes
- `is_best` denormalised boolean: avoids a subquery on every leaderboard render; updated atomically by the training use case
- `experiment_id` nullable: supports both "quick train" (no experiment) and formal experiment tracking

---

#### Table: `training_jobs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `model_id` | `UUID` | `FK → models.id`, `NOT NULL` | 1:1 with model |
| `status` | `VARCHAR(20)` | `NOT NULL`, `DEFAULT 'queued'` | `queued → running → completed → failed → cancelled` |
| `progress` | `FLOAT` | `NOT NULL`, `DEFAULT 0.0` | 0.0–100.0 |
| `celery_task_id` | `VARCHAR(255)` | `NULL` | Celery task UUID for cancellation |
| `error_message` | `TEXT` | `NULL` | |
| `log` | `TEXT` | `NULL` | Accumulated training logs |
| `started_at` | `TIMESTAMPTZ` | `NULL` | |
| `completed_at` | `TIMESTAMPTZ` | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Indexes:**
- `UNIQUE INDEX idx_training_jobs_model ON training_jobs(model_id)` — 1:1 enforcement via application + unique index
- `INDEX idx_training_jobs_status ON training_jobs(status)` — worker polling

**Design Rationale:**
- 1:1 with model: a model has exactly one training job lifecycle; avoids orphaned jobs
- `celery_task_id` stored for cancellation: Celery's `AsyncResult.revoke(task_id)` needs this
- `log` as TEXT: accumulated stdout/stderr from training; truncated at 10K chars in application
- Separate `started_at` and `completed_at` from `created_at`: enables duration calculation without subtracting timestamps

---

#### Table: `experiments`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `UUID` | `FK → users.id`, `NOT NULL` | |
| `name` | `VARCHAR(255)` | `NOT NULL` | |
| `description` | `TEXT` | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Indexes:**
- `INDEX idx_experiments_user_id ON experiments(user_id)`

---

#### Table: `experiment_models`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `experiment_id` | `UUID` | `FK → experiments.id`, `NOT NULL`, `ON DELETE CASCADE` | |
| `model_id` | `UUID` | `FK → models.id`, `NOT NULL`, `ON DELETE CASCADE` | |
| `added_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Indexes:**
- `PRIMARY KEY (experiment_id, model_id)` — composite PK avoids duplicates
- `INDEX idx_exp_models_model ON experiment_models(model_id)` — reverse lookup

**Design Rationale:**
- Join table enables many-to-many: an experiment contains many models; a model can appear in multiple experiments (comparison across experiments)
- Composite PK: naturally enforces uniqueness without a separate surrogate key
- No `id` column: the pair is the identity; a surrogate would be redundant

---

#### Table: `user_settings`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | `UUID` | `PK`, `FK → users.id`, `ON DELETE CASCADE` | 1:1 with user — PK doubles as FK |
| `max_memory_mb` | `INTEGER` | `NOT NULL`, `DEFAULT 8192` | |
| `max_runtime_seconds` | `INTEGER` | `NOT NULL`, `DEFAULT 14400` | 4 hours |
| `max_concurrent_jobs` | `SMALLINT` | `NOT NULL`, `DEFAULT 2` | |
| `theme` | `VARCHAR(10)` | `NOT NULL`, `DEFAULT 'dark'` | `light` or `dark` |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | |

**Design Rationale:**
- 1:1 with users: a user has exactly one settings row; PK = FK avoids a separate `id` column
- Created on user registration via DB trigger or application — application layer is preferred

---

### 1.3 Normalisation Analysis

| Normal Form | Status | Notes |
|---|---|---|
| **1NF** | ✅ | All columns atomic; no repeating groups (arrays in `pipeline_steps.columns` are a PostgreSQL array type, not a denormalised CSV) |
| **2NF** | ✅ | No partial dependencies on composite keys (only `experiment_models` has a composite key, and both columns are fully dependent on the pair) |
| **3NF** | ✅ | No transitive dependencies: `dataset_columns.dataset_id → datasets.user_id` is never stored in `dataset_columns` |
| **BCNF** | ✅ | Every determinant is a candidate key |

**Deliberate Denormalisation:**
1. `dataset_columns.missing_ratio` — computed from `missing_count / datasets.row_count`. Stored to avoid join + division on every page load. Updated atomically when stats are computed.
2. `models.is_best` — "best model" is determined by MAX(accuracy) within an experiment. Denormalised to avoid subquery on every leaderboard request. Updated by the training use case after metrics are computed.
3. `dataset_columns.is_numeric` and `is_categorical` — derived from dtype string. Stored to avoid frontend re-deriving dtype classification logic.

---

### 1.4 Migration Strategy

- **Tool:** Alembic
- **Naming convention:** `{YYYY}_{MM}_{DD}_{HH}_{MM}_{description}.py`
- **Policy:** One migration per schema change; never squash migrations in a portfolio project (shows history)
- **Seed data:** A `seeds.py` script that creates a demo user, uploads the Iris dataset, and runs EDA — used for development and portfolio demonstration

---

## Part 2: FastAPI Backend Architecture

---

### 2.1 Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app factory
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py                      # Shared DI dependencies
│   │   ├── errors.py                    # HTTP error mapping
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py                # Aggregates all v1 routers
│   │       │
│   │       ├── endpoints/
│   │       │   ├── __init__.py
│   │       │   ├── auth.py              # POST /register, /login, GET /me
│   │       │   ├── datasets.py          # CRUD + upload
│   │       │   ├── eda.py               # GET /eda
│   │       │   ├── pipelines.py         # CRUD + execute
│   │       │   ├── models.py            # CRUD + compare
│   │       │   ├── training.py          # POST /train, GET /jobs/{id}, POST /cancel
│   │       │   ├── experiments.py       # CRUD
│   │       │   └── settings.py          # GET/PUT settings
│   │       │
│   │       └── schemas/                 # Pydantic request/response schemas
│   │           ├── __init__.py
│   │           ├── auth.py
│   │           ├── dataset.py
│   │           ├── eda.py
│   │           ├── pipeline.py
│   │           ├── model.py
│   │           ├── training.py
│   │           ├── experiment.py
│   │           └── settings.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                    # pydantic-settings (env → settings)
│   │   ├── security.py                  # JWT, password hashing
│   │   ├── exceptions.py                # Domain exception hierarchy
│   │   └── logging.py                   # Structured logging config
│   │
│   ├── domain/
│   │   ├── __init__.py
│   │   │
│   │   ├── entities/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                  # User entity with password validation
│   │   │   ├── dataset.py               # Dataset entity with status machine
│   │   │   ├── dataset_column.py        # Column entity with stats
│   │   │   ├── pipeline.py              # Pipeline entity
│   │   │   ├── pipeline_step.py         # Step entity with config
│   │   │   ├── model.py                 # Model entity with metrics
│   │   │   ├── training_job.py          # Training job with lifecycle
│   │   │   ├── experiment.py            # Experiment entity
│   │   │   └── user_settings.py         # Settings entity
│   │   │
│   │   ├── value_objects/
│   │   │   ├── __init__.py
│   │   │   ├── email.py                 # Email validation + canonicalisation
│   │   │   ├── file_size.py             # Size with human-readable formatting
│   │   │   ├── hyperparameters.py       # Typed dict with validation
│   │   │   ├── model_metrics.py         # Metrics container
│   │   │   └── pipeline_step_config.py  # Discriminated union per step type
│   │   │
│   │   ├── enums.py                     # All domain enums in one place
│   │   │
│   │   └── interfaces/                  # Ports (contracts)
│   │       ├── __init__.py
│   │       ├── repositories/
│   │       │   ├── __init__.py
│   │       │   ├── i_user_repo.py
│   │       │   ├── i_dataset_repo.py
│   │       │   ├── i_pipeline_repo.py
│   │       │   ├── i_model_repo.py
│   │       │   ├── i_experiment_repo.py
│   │       │   └── i_settings_repo.py
│   │       ├── i_storage_service.py     # File storage abstraction
│   │       ├── i_ml_backend.py          # ML training abstraction
│   │       ├── i_eda_engine.py          # EDA computation abstraction
│   │       └── i_task_queue.py          # Async task dispatcher
│   │
│   ├── application/
│   │   ├── __init__.py
│   │   │
│   │   ├── use_cases/
│   │   │   ├── __init__.py
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── register_user.py     # Register use case
│   │   │   │   ├── authenticate_user.py # Login use case
│   │   │   │   └── get_current_user.py  # Profile use case
│   │   │   ├── dataset/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── upload_dataset.py
│   │   │   │   ├── list_datasets.py
│   │   │   │   ├── get_dataset.py
│   │   │   │   ├── delete_dataset.py
│   │   │   │   └── run_eda.py
│   │   │   ├── pipeline/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── create_pipeline.py
│   │   │   │   ├── update_pipeline.py
│   │   │   │   ├── execute_pipeline.py
│   │   │   │   └── list_pipelines.py
│   │   │   ├── training/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── train_model.py       # Dispatches training job
│   │   │   │   ├── get_job_status.py
│   │   │   │   └── cancel_job.py
│   │   │   ├── model/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── list_models.py
│   │   │   │   ├── get_model.py
│   │   │   │   ├── compare_models.py
│   │   │   │   ├── delete_model.py
│   │   │   │   └── download_model.py
│   │   │   ├── experiment/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── create_experiment.py
│   │   │   │   └── get_experiment.py
│   │   │   └── settings/
│   │   │       ├── __init__.py
│   │   │       ├── get_settings.py
│   │   │       └── update_settings.py
│   │   │
│   │   ├── dto/                         # Data transfer objects
│   │   │   ├── __init__.py
│   │   │   ├── auth_dto.py
│   │   │   ├── dataset_dto.py
│   │   │   ├── pipeline_dto.py
│   │   │   ├── model_dto.py
│   │   │   ├── training_dto.py
│   │   │   └── experiment_dto.py
│   │   │
│   │   └── mappers/                     # Entity ↔ DTO ↔ ORM mappers
│   │       ├── __init__.py
│   │       ├── user_mapper.py
│   │       ├── dataset_mapper.py
│   │       ├── pipeline_mapper.py
│   │       ├── model_mapper.py
│   │       └── experiment_mapper.py
│   │
│   └── infrastructure/
│       ├── __init__.py
│       │
│       ├── database/
│       │   ├── __init__.py
│       │   ├── session.py               # Async session factory
│       │   └── models/                  # SQLAlchemy ORM models
│       │       ├── __init__.py
│       │       ├── user.py
│       │       ├── dataset.py
│       │       ├── dataset_column.py
│       │       ├── pipeline.py
│       │       ├── pipeline_step.py
│       │       ├── model.py
│       │       ├── training_job.py
│       │       ├── experiment.py
│       │       ├── experiment_model.py
│       │       └── user_settings.py
│       │
│       ├── repositories/               # SQLAlchemy implementations
│       │   ├── __init__.py
│       │   ├── postgres_user_repo.py
│       │   ├── postgres_dataset_repo.py
│       │   ├── postgres_pipeline_repo.py
│       │   ├── postgres_model_repo.py
│       │   ├── postgres_experiment_repo.py
│       │   └── postgres_settings_repo.py
│       │
│       ├── storage/
│       │   ├── __init__.py
│       │   └── local_storage_service.py
│       │
│       ├── ml/
│       │   ├── __init__.py
│       │   ├── backends/
│       │   │   ├── __init__.py
│       │   │   ├── sklearn_backend.py    # Random Forest, SVM, Logistic Regression
│       │   │   └── xgboost_backend.py    # XGBoost
│       │   ├── pipeline_executor.py      # Runs preprocessing steps
│       │   └── eda_engine.py             # Computes column stats + correlation
│       │
│       └── tasks/
│           ├── __init__.py
│           ├── celery_app.py             # Celery configuration
│           └── training_worker.py        # Celery task definitions
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py                      # Fixtures: test DB, test client, factories
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── domain/
│   │   │   ├── test_user.py
│   │   │   ├── test_dataset.py
│   │   │   └── test_model.py
│   │   └── application/
│   │       ├── test_register_user.py
│   │       ├── test_upload_dataset.py
│   │       └── test_train_model.py
│   ├── integration/
│   │   ├── test_user_repo.py
│   │   ├── test_dataset_repo.py
│   │   ├── test_api_auth.py
│   │   ├── test_api_datasets.py
│   │   └── test_api_training.py
│   └── helpers/
│       ├── __init__.py
│       ├── factories.py                 # Entity factories for tests
│       └── mocks.py                     # Mock repository implementations
│
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_schema.py
│
├── alembic.ini
├── pyproject.toml
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

### 2.2 Dependency Injection Strategy

**Pattern:** Composition Root via FastAPI `Depends()` with factory functions.

```python
# app/api/deps.py

async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Provides a transactional DB session per request."""
    async with async_session_factory() as session:
        yield session

def get_user_repo(session: AsyncSession = Depends(get_db_session)) -> IUserRepository:
    return PostgresUserRepository(session)

def get_dataset_repo(session: AsyncSession = Depends(get_db_session)) -> IDatasetRepository:
    return PostgresDatasetRepository(session)

def get_storage_service() -> IStorageService:
    return LocalStorageService(settings.DATA_DIR)

def get_task_queue() -> ITaskQueue:
    return CeleryTaskQueue()

def get_ml_backend(algorithm: str) -> IMLBackend:
    """Factory: returns the appropriate backend based on algorithm."""
    backends = {
        "random_forest": SklearnBackend("RandomForestClassifier"),
        "svm": SklearnBackend("SVC"),
        "logistic_regression": SklearnBackend("LogisticRegression"),
        "xgboost": XGBoostBackend(),
    }
    return backends[algorithm]

def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: IUserRepository = Depends(get_user_repo),
) -> User:
    """Validates JWT and returns current user."""
    ...
```

**Injection chain:**
```
Router endpoint
  → depends on UseCase
    → depends on Repository interfaces (injected via deps.py)
      → real PostgresRepo implementations (swappable)
    → depends on Service interfaces (injected)
      → real implementations (swappable)
```

**Key principle:** Use cases never import infrastructure. They receive interfaces. `deps.py` wires the concrete implementations.

---

### 2.3 Repository Pattern

```python
# domain/interfaces/repositories/i_dataset_repo.py

class IDatasetRepository(ABC):
    @abstractmethod
    async def save(self, dataset: Dataset) -> Dataset: ...
    @abstractmethod
    async def get_by_id(self, dataset_id: UUID) -> Dataset | None: ...
    @abstractmethod
    async def list_by_user(self, user_id: UUID, page: int, per_page: int) -> tuple[list[Dataset], int]: ...
    @abstractmethod
    async def delete(self, dataset_id: UUID) -> None: ...
    @abstractmethod
    async def update_status(self, dataset_id: UUID, status: DatasetStatus, error_message: str | None = None) -> None: ...
    @abstractmethod
    async def update_stats(self, dataset_id: UUID, row_count: int, column_count: int) -> None: ...

# infrastructure/repositories/postgres_dataset_repo.py

class PostgresDatasetRepository(IDatasetRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, dataset: Dataset) -> Dataset:
        orm_model = DatasetORM(
            id=dataset.id,
            user_id=dataset.user_id,
            name=dataset.name,
            ...
        )
        self._session.add(orm_model)
        await self._session.flush()
        return self._to_entity(orm_model)
```

**Design decisions:**
- Repository interface methods return domain entities, never ORM models
- ORM models are a private implementation detail of the repository
- Repository methods are async, matching FastAPI's async nature
- Each aggregate root has its own repository interface
- `save()` handles both insert and update (upsert pattern using `session.merge` or check-then-add)
- Repositories do NOT commit — the unit of work (UoW) pattern is managed at the use case level

**Testing:**
- `InMemoryDatasetRepository` implements `IDatasetRepository` using a `dict[UUID, Dataset]`
- Use case tests use in-memory repos — no database required
- Integration tests spin up a test PostgreSQL via `testcontainers`

---

### 2.4 Service Layer

Services are stateless, injectable classes that encapsulate domain logic too complex for a single entity.

```python
# infrastructure/ml/eda_engine.py

class EDAEngine(IEDAEngine):
    """Computes column statistics and correlation matrix."""

    async def compute_stats(self, dataset: Dataset, df: pd.DataFrame) -> list[DatasetColumn]: ...
    async def compute_correlation(self, df: pd.DataFrame) -> dict[str, dict[str, float]]: ...
    async def generate_findings(self, columns: list[DatasetColumn], correlation: dict) -> list[Finding]: ...

# infrastructure/ml/pipeline_executor.py

class PipelineExecutor:
    """Runs a preprocessing pipeline, returns processed DataFrame."""

    async def execute(self, pipeline: Pipeline, df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]: ...
        # Returns train_df, test_df

# infrastructure/ml/backends/sklearn_backend.py

class SklearnBackend(IMLBackend):
    def __init__(self, algorithm_name: str):
        self._algorithm_name = algorithm_name

    async def train(self, X_train, y_train, hyperparams: Hyperparameters) -> bytes:
        """Trains model, returns pickled bytes."""
        ...

    async def evaluate(self, model_bytes: bytes, X_test, y_test) -> ModelMetrics:
        """Loads model, computes metrics, returns ModelMetrics."""
        ...
```

---

### 2.5 Routers

```python
# app/api/v1/router.py

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_v1_router.include_router(datasets_router, prefix="/datasets", tags=["Datasets"])
api_v1_router.include_router(eda_router, prefix="/datasets", tags=["EDA"])
api_v1_router.include_router(pipelines_router, prefix="/pipelines", tags=["Preprocessing"])
api_v1_router.include_router(models_router, prefix="/models", tags=["Models"])
api_v1_router.include_router(training_router, prefix="/training", tags=["Training"])
api_v1_router.include_router(experiments_router, prefix="/experiments", tags=["Experiments"])
api_v1_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
```

**Endpoint pattern:**
```python
# app/api/v1/endpoints/datasets.py

router = APIRouter()

@router.post("/upload", response_model=DatasetResponse, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    use_case: UploadDatasetUseCase = Depends(get_upload_dataset_use_case),
    current_user: User = Depends(get_current_user),
) -> DatasetResponse:
    result = await use_case.execute(current_user.id, file)
    return DatasetResponse.from_dto(result)

@router.get("/", response_model=PaginatedResponse[DatasetSummary])
async def list_datasets(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    use_case: ListDatasetsUseCase = Depends(get_list_datasets_use_case),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[DatasetSummary]:
    datasets, total = await use_case.execute(current_user.id, page, per_page)
    return PaginatedResponse(items=[DatasetSummary.from_entity(d) for d in datasets], total=total, page=page, per_page=per_page)
```

**Design decisions:**
- Routers are thin: parse request, call use case, format response — no business logic
- Use cases are injected via `Depends()` factory functions in `deps.py`
- `response_model` uses Pydantic schemas; `from_dto` / `from_entity` converters live on the schema class
- `PaginatedResponse[T]` is a generic Pydantic model reused across all list endpoints

---

### 2.6 Schemas (Pydantic v2)

```python
# app/api/v1/schemas/dataset.py

class DatasetUploadResponse(BaseModel):
    id: UUID
    name: str
    status: DatasetStatus
    file_size_bytes: int
    row_count: int | None
    column_count: int | None
    created_at: datetime

    @classmethod
    def from_entity(cls, dataset: Dataset) -> "DatasetUploadResponse":
        return cls(
            id=dataset.id,
            name=dataset.name,
            status=dataset.status,
            file_size_bytes=dataset.file_size.bytes,
            row_count=dataset.row_count,
            column_count=dataset.column_count,
            created_at=dataset.created_at,
        )

class ColumnStatResponse(BaseModel):
    name: str
    dtype: str
    missing_count: int | None
    missing_ratio: float | None
    unique_count: int | None
    mean: float | None
    std: float | None
    min: float | None
    max: float | None
    p25: float | None
    p50: float | None
    p75: float | None

class EDAReportResponse(BaseModel):
    dataset_id: UUID
    column_stats: list[ColumnStatResponse]
    correlation_matrix: dict[str, dict[str, float]]
    findings: list[FindingResponse]

class FindingResponse(BaseModel):
    severity: Literal["info", "warning", "critical"]
    title: str
    description: str
    affected_columns: list[str]
```

**Design decisions:**
- Schemas are defined per-endpoint, not shared across layers
- `from_entity` / `from_dto` class methods keep mapping logic on the schema
- `response_model` excludes None fields by default (`response_model_exclude_none=True`)

---

### 2.7 Configuration

```python
# app/core/config.py

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "MLPilot"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: PostgresDsn = "postgresql+asyncpg://mlpilot:mlpilot@localhost:5432/mlpilot"

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage
    DATA_DIR: Path = Path("data")

    # ML
    MAX_DATASET_SIZE_MB: int = 5120  # 5 GB
    MAX_CONCURRENT_JOBS: int = 3
    DEFAULT_RANDOM_SEED: int = 42

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```

**Design decisions:**
- pydantic-settings: validates env vars at startup; fails fast on missing required values
- `DATA_DIR` as `Path`: enables path operations without string concatenation
- Sensible defaults for local development; overridable via `.env`
- `SECRET_KEY` defaults to random (generated once, persisted in `.env`)

---

### 2.8 Error Handling

```python
# app/core/exceptions.py

class AppError(Exception):
    """Base application error."""

class NotFoundError(AppError):
    def __init__(self, entity: str, entity_id: str):
        self.entity = entity
        self.entity_id = entity_id
        super().__init__(f"{entity} with id {entity_id} not found")

class ValidationError(AppError):
    def __init__(self, message: str, field: str | None = None):
        self.field = field
        super().__init__(message)

class AuthenticationError(AppError):
    ...

class AuthorizationError(AppError):
    ...

class StorageError(AppError):
    ...

class MLBackendError(AppError):
    ...

# app/api/errors.py

def map_domain_error_to_http(error: AppError) -> JSONResponse:
    """Maps domain exceptions to structured HTTP responses."""
    mapping = {
        NotFoundError: (status.HTTP_404_NOT_FOUND, "NOT_FOUND"),
        ValidationError: (status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_ERROR"),
        AuthenticationError: (status.HTTP_401_UNAUTHORIZED, "AUTHENTICATION_ERROR"),
        AuthorizationError: (status.HTTP_403_FORBIDDEN, "AUTHORIZATION_ERROR"),
        StorageError: (status.HTTP_500_INTERNAL_SERVER_ERROR, "STORAGE_ERROR"),
        MLBackendError: (status.HTTP_500_INTERNAL_SERVER_ERROR, "ML_BACKEND_ERROR"),
    }
    http_status, code = mapping.get(type(error), (500, "INTERNAL_ERROR"))
    return JSONResponse(
        status_code=http_status,
        content={"error": {"code": code, "message": str(error), "field": getattr(error, "field", None)}},
    )

# Registered in main.py:
# app.add_exception_handler(AppError, map_domain_error_to_http)
```

**Design decisions:**
- Domain exception hierarchy is framework-agnostic (does not import `fastapi.HTTPException`)
- `map_domain_error_to_http` is the only place that pairs domain errors with HTTP status codes
- Consistent JSON envelope: `{"error": {"code": "...", "message": "...", "field": null}}`
- All unhandled exceptions return `500` with a generic message (no stack trace in production)

---

### 2.9 Logging

```python
# app/core/logging.py

import structlog

def configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.dev.ConsoleRenderer() if settings.DEBUG else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

# Usage in use cases:
logger = structlog.get_logger()
logger.info("dataset.uploaded", dataset_id=str(dataset.id), file_size=dataset.file_size.bytes)
```

**Design decisions:**
- structlog: structured JSON logging for production; coloured console for development
- Correlation IDs: injected via FastAPI middleware (`structlog.contextvars.bind_contextvars(correlation_id=...)`)
- Every use case logs entry + exit + error
- No `print()` anywhere in production code

---

### 2.10 Validation Strategy

| Layer | Mechanism | Validates |
|---|---|---|
| **API (HTTP)** | Pydantic v2 request schemas | Types, formats, ranges, required fields |
| **Domain entities** | `__init__` invariants | Business rules (e.g., cannot have negative file size) |
| **Value objects** | `__init__` + `@classmethod` validators | Format validation (e.g., `Email.validate()`) |
| **Use cases** | Precondition checks | Authorisation, state machine transitions (e.g., cannot train on a dataset still `uploading`) |
| **Database** | Constraints + types | Uniqueness, foreign keys, not null, check constraints |
| **ML backends** | Input validation | Feature matrix shape, label encoding consistency |

**Example domain validation:**
```python
# domain/value_objects/file_size.py

@dataclass(frozen=True)
class FileSize:
    bytes: int

    def __post_init__(self):
        if self.bytes < 0:
            raise ValidationError("File size cannot be negative")
        if self.bytes > settings.MAX_DATASET_SIZE_MB * 1024 * 1024:
            raise ValidationError(f"File size exceeds maximum of {settings.MAX_DATASET_SIZE_MB} MB")

    @property
    def megabytes(self) -> float:
        return self.bytes / (1024 * 1024)

    def __str__(self) -> str:
        if self.bytes > 1024 * 1024:
            return f"{self.megabytes:.1f} MB"
        return f"{self.bytes / 1024:.1f} KB"
```

---

## Part 3: React Frontend Architecture

---

### 3.1 Folder Structure

```
frontend/
├── public/
│   ├── favicon.svg
│   └── fonts/                          # Self-hosted fonts (optional)
│
├── src/
│   ├── main.tsx                        # Entry point
│   ├── App.tsx                         # Router provider + auth guard
│   │
│   ├── core/
│   │   ├── config/
│   │   │   └── index.ts                # API_BASE_URL, feature flags
│   │   ├── api/
│   │   │   ├── client.ts               # Axios instance with interceptors
│   │   │   ├── auth.api.ts             # Auth API functions
│   │   │   ├── datasets.api.ts
│   │   │   ├── pipelines.api.ts
│   │   │   ├── models.api.ts
│   │   │   ├── training.api.ts
│   │   │   ├── experiments.api.ts
│   │   │   └── settings.api.ts
│   │   ├── router/
│   │   │   └── index.tsx               # Route definitions
│   │   ├── theme/
│   │   │   └── index.ts                # Theme provider + toggle
│   │   └── types/
│   │       ├── dataset.ts
│   │       ├── pipeline.ts
│   │       ├── model.ts
│   │       ├── training.ts
│   │       ├── experiment.ts
│   │       ├── auth.ts
│   │       └── api.ts                  # PaginatedResponse<T>, ApiError
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   └── contexts/
│   │   │       └── AuthContext.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.tsx
│   │   │   └── components/
│   │   │       ├── ProjectCard.tsx
│   │   │       ├── RecentActivity.tsx
│   │   │       └── ClusterHealth.tsx
│   │   │
│   │   ├── datasets/
│   │   │   ├── pages/
│   │   │   │   ├── DatasetListPage.tsx
│   │   │   │   ├── DatasetUploadPage.tsx
│   │   │   │   └── DatasetDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── UploadDropzone.tsx
│   │   │   │   ├── DatasetTable.tsx
│   │   │   │   ├── ColumnStatsCard.tsx
│   │   │   │   └── StatsGrid.tsx
│   │   │   └── hooks/
│   │   │       ├── useDatasets.ts
│   │   │       └── useDatasetColumns.ts
│   │   │
│   │   ├── eda/
│   │   │   ├── pages/
│   │   │   │   └── EDAPage.tsx
│   │   │   └── components/
│   │   │       ├── CorrelationMatrix.tsx
│   │   │       ├── DistributionBar.tsx
│   │   │       ├── FindingsList.tsx
│   │   │       └── StatCard.tsx
│   │   │
│   │   ├── preprocessing/
│   │   │   ├── pages/
│   │   │   │   └── PreprocessingPage.tsx
│   │   │   └── components/
│   │   │       ├── PipelineStepList.tsx
│   │   │       ├── StepConfigPanel.tsx
│   │   │       ├── AddStepDialog.tsx
│   │   │       └── ColumnMappingTable.tsx
│   │   │
│   │   ├── training/
│   │   │   ├── pages/
│   │   │   │   └── TrainingPage.tsx
│   │   │   └── components/
│   │   │       ├── ModelSelector.tsx
│   │   │       ├── HyperparamForm.tsx
│   │   │       ├── TrainingCard.tsx
│   │   │       └── JobProgressBar.tsx
│   │   │
│   │   ├── results/
│   │   │   ├── pages/
│   │   │   │   ├── ResultsPage.tsx
│   │   │   │   └── ModelComparisonPage.tsx
│   │   │   └── components/
│   │   │       ├── LeaderboardTable.tsx
│   │   │       ├── MetricsRow.tsx
│   │   │       ├── BestModelBanner.tsx
│   │   │       └── RunHistoryTable.tsx
│   │   │
│   │   ├── experiments/
│   │   │   ├── pages/
│   │   │   │   ├── ExperimentListPage.tsx
│   │   │   │   └── ExperimentDetailPage.tsx
│   │   │   └── components/
│   │   │       ├── ExperimentCard.tsx
│   │   │       └── ModelLinkList.tsx
│   │   │
│   │   └── settings/
│   │       ├── pages/
│   │       │   └── SettingsPage.tsx
│   │       └── components/
│   │           ├── SettingsSection.tsx
│   │           ├── ApiConfigForm.tsx
│   │           └── ResourceLimitForm.tsx
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ui/                     # shadcn primitives
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   └── tooltip.tsx
│   │   │   ├── Layout.tsx             # App shell: sidebar + topnav + content
│   │   │   ├── TopNav.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── DataTable.tsx          # Generic table with sorting/pagination
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── Pagination.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   └── usePagination.ts
│   │   │
│   │   └── utils/
│   │       ├── cn.ts                   # clsx + tailwind-merge
│   │       ├── format.ts              # File size, date, percentage formatters
│   │       └── constants.ts           # Status colours, algorithm labels
│   │
│   ├── styles/
│   │   ├── globals.css                 # Tailwind directives + theme vars
│   │   └── bauhaus.css                 # Bauhaus utility classes (neo-shadow, neo-border)
│   │
│   └── lib/
│       └── react-query.ts              # QueryClient configuration
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json                     # shadcn config
├── package.json
└── Dockerfile
```

---

### 3.2 Pages & Routing

```typescript
// src/core/router/index.tsx

const routes = [
  // Public
  { path: "/login", element: <LoginPage />, guard: "guest" },
  { path: "/register", element: <RegisterPage />, guard: "guest" },

  // Protected — wrapped in <AuthGuard>
  { path: "/", element: <Layout />, guard: "auth", children: [
    { index: true, element: <HomePage /> },
    { path: "dashboard", element: <DashboardPage /> },

    // Datasets
    { path: "datasets", element: <DatasetListPage /> },
    { path: "datasets/upload", element: <DatasetUploadPage /> },
    { path: "datasets/:datasetId", element: <DatasetDetailPage /> },
    { path: "datasets/:datasetId/eda", element: <EDAPage /> },
    { path: "datasets/:datasetId/preprocess", element: <PreprocessingPage /> },

    // Training
    { path: "training", element: <TrainingPage /> },
    { path: "training/:jobId", element: <TrainingJobDetailPage /> },

    // Results
    { path: "results", element: <ResultsPage /> },
    { path: "results/compare", element: <ModelComparisonPage /> },

    // Experiments
    { path: "experiments", element: <ExperimentListPage /> },
    { path: "experiments/:experimentId", element: <ExperimentDetailPage /> },

    // Settings
    { path: "settings", element: <SettingsPage /> },
  ]},

  // 404
  { path: "*", element: <NotFoundPage /> },
];
```

**Route guards:**
- `"guest"`: redirect to `/dashboard` if authenticated
- `"auth"`: redirect to `/login` if not authenticated; validate JWT expiry on mount
- `AuthGuard` component wraps protected routes; shows `LoadingSpinner` during token validation

---

### 3.3 Layouts

```
Layout (public — no sidebar, full-width auth pages)
  └── AuthLayout
       ├── LoginPage
       └── RegisterPage

Layout (authenticated — sidebar + topnav + content area)
  ├── AppLayout
  │   ├── Sidebar           (fixed left, 256px)
  │   ├── TopNav            (fixed top, offset by sidebar)
  │   └── <Outlet />        (scrollable content area)
  │
  ├── Pages fill <Outlet />:
  │   ├── PageHeader        (title + subtitle + optional action button)
  │   ├── <content>         (module-specific components)
  │   └── (optional) <Pagination />
  │
  └── BottomNav             (mobile only, replaces sidebar)
```

**AppLayout states:**
- **Loading:** Skeleton placeholders for sidebar + header + content grid
- **Error:** Error banner at top with retry button; sidebar remains functional
- **Empty:** Centered `EmptyState` component with illustration + CTA
- **Data:** Normal content rendering

---

### 3.4 Components

**shadcn primitives used:**
```
button, card, input, badge, table, dialog, progress,
skeleton, toast, tooltip, separator, tabs, select,
checkbox, label, sheet (mobile sidebar)
```

**Component design patterns:**

```typescript
// Every data-fetching component follows this pattern:

function DatasetTable() {
  const { data, isLoading, isError, error, refetch } = useQuery(...)

  if (isLoading) return <SkeletonTable rows={5} cols={4} />
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />
  if (!data?.length) return <EmptyState icon="database" title="No datasets" action={<UploadButton />} />

  return <Table>...</Table>
}
```

**Shared component props:**
```typescript
interface EmptyStateProps {
  icon: string            // Material symbol name
  title: string
  description?: string
  action?: ReactNode      // CTA button
}

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  fullPage?: boolean      // Centered in viewport vs inline
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode      // Primary CTA (e.g., "Upload Dataset" button)
}
```

---

### 3.5 Hooks

```typescript
// src/modules/datasets/hooks/useDatasets.ts

function useDatasets(page: number, perPage: number) {
  return useQuery({
    queryKey: ["datasets", { page, perPage }],
    queryFn: () => datasetsApi.list(page, perPage),
    staleTime: 30_000,    // 30s before refetch
    keepPreviousData: true,// Smooth pagination
  })
}

function useUploadDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => datasetsApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] })
      toast.success("Dataset uploaded successfully")
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

// src/modules/training/hooks/useTrainingJob.ts

function useTrainingJob(jobId: string) {
  return useQuery({
    queryKey: ["training-job", jobId],
    queryFn: () => trainingApi.getJobStatus(jobId),
    refetchInterval: (query) => {
      // Poll every 2s while running/queued, stop when completed/failed
      const status = query.state.data?.status
      return status === "running" || status === "queued" ? 2000 : false
    },
  })
}
```

---

### 3.6 Services (API Layer)

```typescript
// src/core/api/client.ts

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
})

// Request interceptor: inject JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: unwrap envelope, handle 401
apiClient.interceptors.response.use(
  (response) => response.data.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt refresh, or redirect to login
      localStorage.removeItem("access_token")
      window.location.href = "/login"
    }
    // Normalize error: ApiError { code, message, field }
    throw normalizeError(error)
  }
)

// src/core/api/datasets.api.ts

export const datasetsApi = {
  list: (page: number, perPage: number) =>
    apiClient.get<PaginatedResponse<DatasetSummary>>("/datasets", { params: { page, per_page: perPage } }),

  upload: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiClient.post<DatasetResponse>("/datasets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / e.total) * 100)),
    })
  },

  getById: (id: string) =>
    apiClient.get<DatasetDetail>(`/datasets/${id}`),

  delete: (id: string) =>
    apiClient.delete(`/datasets/${id}`),
}
```

---

### 3.7 Contexts

```typescript
// src/modules/auth/contexts/AuthContext.tsx

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => void
}

// AuthProvider wraps the app, exposes AuthContext
// On mount: validates stored JWT via GET /auth/me
// On login: stores JWT, sets user
// On logout: clears JWT, redirects to /login
```

---

### 3.8 State Management

| Concern | Tool | Rationale |
|---|---|---|
| **Server state** (datasets, models, jobs, experiments) | TanStack React Query | Caching, deduplication, background refetch, optimistic updates, pagination |
| **Auth state** (current user, JWT) | React Context | Read-heavy, write-infrequent; no need for Zustand |
| **UI state** (sidebar open, theme, active tab) | Zustand | Lightweight, no boilerplate, persists theme to localStorage |
| **Form state** (hyperparameter inputs, pipeline config) | React Hook Form + Zod | Performant re-renders; Zod validation mirrors backend schemas |
| **Upload progress** | Local component state | Ephemeral, per-upload; doesn't leave the upload page |

**Zustand store example:**
```typescript
// src/shared/store/ui.ts

interface UIState {
  sidebarOpen: boolean
  theme: "light" | "dark"
  toggleSidebar: () => void
  setTheme: (theme: "light" | "dark") => void
}

const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "dark",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "mlpilot-ui", partialize: (state) => ({ theme: state.theme }) }
  )
)
```

---

### 3.9 Loading States

| Pattern | Component | When |
|---|---|---|
| **Full-page loading** | `LoadingSpinner` centered in viewport | Initial auth check, route transition |
| **Section skeleton** | `SkeletonTable`, `SkeletonCard`, `SkeletonChart` | Data fetching within a page |
| **Progressive loading** | Skeleton → content | Showing structure before data arrives |
| **Button loading** | Button with spinner + disabled state | During form submission |
| **Upload progress** | `ProgressBar` with percentage | File upload |
| **Training progress** | `ProgressBar` with status badge + ETA | Async training job |
| **Infinite scroll** | Bottom spinner | Paginated lists (optional, using `useInfiniteQuery`) |

**Skeleton composition:**
```tsx
function DatasetDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />      {/* Title */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-lg" /> {/* Table */}
    </div>
  )
}
```

---

### 3.10 Error States

| Pattern | Component | Recovery |
|---|---|---|
| **Inline error** | `ErrorState` banner inside content area | Retry button refetches query |
| **Full-page error** | `ErrorState` with `fullPage` prop | Retry + "Go to Dashboard" |
| **Toast error** | shadcn `Toast` (top-right) | Dismiss; no blocking |
| **Form error** | Field-level + form-level error messages | User corrects input |
| **Validation error** | Zod schema error mapping to form fields | Inline field highlighting |
| **Network error** | `ErrorState` with "Check connection" | Retry + offline indicator |
| **404** | `NotFoundPage` | "Back to Dashboard" button |

**Error boundary at module level:**
```typescript
// Each module's page is wrapped in an ErrorBoundary
// If a component crashes, the error boundary catches it
// and renders a fallback UI within that section only

class DatasetErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return <ErrorState message="Dataset section crashed" onRetry={() => this.setState({ hasError: false })} />
    }
    return this.props.children
  }
}
```

---

### 3.11 Theme Support

```typescript
// src/core/theme/index.ts

// Theme is persisted in localStorage via Zustand persist middleware
// Applied to <html> element via class toggle

function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])
  return <>{children}</>
}

// tailwind.config.ts
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Bauhaus palette (from Stitch design system)
        background: { DEFAULT: "#f5f0e8", dark: "#0b1326" },
        primary: { DEFAULT: "#1a1a1a", dark: "#c0c1ff" },
        "primary-container": { DEFAULT: "#ffcc00", dark: "#8083ff" },
        secondary: { DEFAULT: "#e63b2e", dark: "#ddb7ff" },
        tertiary: { DEFAULT: "#0055ff", dark: "#ffb783" },
        surface: { DEFAULT: "#f5f0e8", dark: "#0b1326" },
        // ... all tokens from DESIGN.md mapped to light/dark
      },
    },
  },
}
```

**Theme strategy:**
- Light mode: beige background (#f5f0e8), black text (#1a1a1a), yellow accent (#ffcc00), red secondary (#e63b2e), blue tertiary (#0055ff)
- Dark mode: deep navy (#0b1326), light lavender text (#c0c1ff), indigo accent (#8083ff), purple secondary (#ddb7ff), orange tertiary (#ffb783)
- Tailwind `dark:` variant used in every component; no separate CSS files per theme
- `ThemeProvider` reads initial theme from Zustand (persisted) or `prefers-color-scheme`

---

### 3.12 API Integration Pattern

```typescript
// Example: DatasetDetailPage orchestrates multiple queries

function DatasetDetailPage() {
  const { datasetId } = useParams()
  const navigate = useNavigate()

  // Core query
  const dataset = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => datasetsApi.getById(datasetId!),
    enabled: !!datasetId,
  })

  // EDA query (fetched in parallel)
  const eda = useQuery({
    queryKey: ["dataset", datasetId, "eda"],
    queryFn: () => datasetsApi.getEDA(datasetId!),
    enabled: !!datasetId,
  })

  // Preprocessing pipelines (fetched in parallel)
  const pipelines = useQuery({
    queryKey: ["dataset", datasetId, "pipelines"],
    queryFn: () => pipelinesApi.listByDataset(datasetId!),
    enabled: !!datasetId,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => datasetsApi.delete(datasetId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] })
      navigate("/datasets")
      toast.success("Dataset deleted")
    },
  })

  // Loading state: one skeleton for all queries
  if (dataset.isLoading || eda.isLoading) return <DatasetDetailSkeleton />

  // Error state: any query failed
  if (dataset.isError) return <ErrorState message={dataset.error.message} onRetry={dataset.refetch} />

  // Empty state: shouldn't happen with getById, but handle gracefully
  if (!dataset.data) return <EmptyState title="Dataset not found" action={<BackButton />} />

  // Success: render full page
  return (
    <div>
      <PageHeader title={dataset.data.name} subtitle={`${dataset.data.row_count} rows`} action={<DeleteButton onClick={deleteMutation.mutate} />} />
      <Tabs>
        <Tab label="Overview"><StatsGrid columns={dataset.data.columns} /></Tab>
        <Tab label="EDA"><EDAReport eda={eda.data} /></Tab>
        <Tab label="Preprocessing"><PipelineList pipelines={pipelines.data ?? []} /></Tab>
        <Tab label="Models"><ModelList datasetId={datasetId} /></Tab>
      </Tabs>
    </div>
  )
}
```

---

### 3.13 Performance Considerations

| Technique | Where |
|---|---|
| **React.lazy + Suspense** | All page components — code-split by route |
| **React Query staleTime** | 30s for lists, 5min for EDA results (rarely change), 0 for job status (needs freshness) |
| **keepPreviousData** | Paginated lists — avoids layout shift on page change |
| **Debounced search** | Dataset search input (300ms) |
| **Memosied selectors** | Zustand derived state (e.g., filtered model list) |
| **Virtualised table** | `@tanstack/react-virtual` for datasets with 100+ columns |
| **Image lazy loading** | Correlation matrix images (if rendered as images) |
| **Bundle analysis** | `vite-plugin-visualizer` in CI |
| **Memo-heavy components** | DataTable, StatsGrid — wrap in `React.memo` |

---

## Part 4: Cross-Cutting Concerns

### 4.1 Docker Compose

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql+asyncpg://mlpilot:mlpilot@postgres:5432/mlpilot
      - CELERY_BROKER_URL=redis://redis:6379/0
    volumes:
      - ./data:/app/data
    depends_on: [postgres, redis]

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: mlpilot
      POSTGRES_PASSWORD: mlpilot
      POSTGRES_DB: mlpilot
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  celery-worker:
    build: ./backend
    command: celery -A app.infrastructure.tasks.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql+asyncpg://mlpilot:mlpilot@postgres:5432/mlpilot
      - CELERY_BROKER_URL=redis://redis:6379/0
    volumes:
      - ./data:/app/data
    depends_on: [postgres, redis]

volumes:
  pgdata:
```

### 4.2 Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| **Domain entities** | pytest | Unit-test all invariants, state machines, value object validation |
| **Use cases** | pytest + mocks | Test each use case with in-memory repos; assert DTO output |
| **Repositories** | pytest + testcontainers | Postgres integration; verify CRUD, constraints, pagination |
| **API endpoints** | pytest + httpx TestClient | Full integration test; verify status codes, response shape, auth |
| **ML backends** | pytest + small datasets | Verify training produces expected metrics shape; handle edge cases |
| **Celery tasks** | pytest + Celery `task_always_eager` | Test task logic synchronously |
| **Frontend components** | Vitest + React Testing Library | Render tests, interaction tests, loading/error/empty states |
| **Frontend hooks** | Vitest + renderHook | Query hook behaviour, mutation callbacks |
| **API client** | Vitest + MSW (Mock Service Worker) | Mock API responses; test error handling, retry logic |

### 4.3 CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
jobs:
  backend:
    - ruff check
    - pyright
    - pytest --cov --cov-report=term
    - pytest tests/integration (spins up testcontainers)

  frontend:
    - tsc --noEmit
    - eslint
    - vitest --coverage
    - npm run build
```
