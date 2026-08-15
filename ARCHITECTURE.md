# MLPilot — Architecture

> **Scope note:** This document describes the **current, implemented** architecture.
> Authentication, multi-user support, Celery/Redis task queues, and an experiments
> module are **not implemented** (they are deferred — see `README.md` → Roadmap and
> `PRD.md`). Where this doc differs from older design notes, this doc is authoritative.

---

## 1. High-Level Overview

```
┌────────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│  React SPA (Vite)  │─────▶│   FastAPI Backend    │─────▶│  SQL Database    │
│  localhost:5173    │      │   localhost:8000     │      │ SQLite / Postgres│
└────────────────────┘      └─────────────────────┘      └──────────────────┘
        │                          │
        │   /api  (Vite proxy / nginx)   REST JSON
        └──────────────────────────┘
```

- The app is a **single local user** system. Multi-tenancy is approximated by an
  optional `?session_id=` query parameter that isolates data per session
  (`default_user` owns locally created data).
- No message broker, scheduler, or background worker process exists. Long-running
  work (EDA, training) executes in the backend process (background threads /
  cooperative cancellation), and progress is polled over HTTP.

---

## 2. Storage

### 2.1 Primary store — SQLAlchemy

All structured records (datasets, columns, pipelines, models, training jobs,
settings) are persisted through **SQLAlchemy** (`backend/app/db.py`,
`backend/app/storage.py` → `SQLStorage`).

- **Default engine:** SQLite at `data/mlpilot.db` (no server required).
- **PostgreSQL:** set `DATABASE_URL` (e.g. `postgresql+psycopg2://...`) in the
  environment; the same models/dialect work unchanged.
- **Schema:** created automatically on startup via
  `Base.metadata.create_all` (see `app/storage.py`). Alembic is configured
  (`alembic.ini`) but **no migration scripts are committed**, so rely on the
  auto-create behaviour.

Tables (defined in `app/models.py`):

| Table             | Purpose |
|-------------------|---------|
| `datasets`        | Dataset metadata + status + file path |
| `dataset_columns` | Per-column EDA statistics |
| `pipelines`       | Preprocessing pipeline definitions + status |
| `models`          | Trained model metadata, metrics, status, artifact path |
| `training_jobs`   | Training job lifecycle + progress + log |
| `settings`        | Application settings (single `app` row) |

Each record stores its JSON body in a `data` JSON column; `session_id` provides
isolation. `SQLStorage` exposes CRUD with session isolation and cascade deletes
(deleting a dataset/pipeline/job also removes its derived models and on-disk
artifacts).

### 2.2 File-backed storage

Not everything is relational:

- **EDA reports & progress** — JSON files under `data/eda/{dataset_id}/`.
- **Cleaning runs** — JSON config/report + `cleaned.csv` under
  `data/cleaning/{dataset_id}/{run_id}/`.
- **Uploaded datasets, model artifacts (`.pkl`/bundles), preprocessed splits
  (`.parquet`/ZIP), inference recipes (ZIP), and prediction CSVs** — under
  `data/datasets/`, `data/models/`, `data/processed/`, `data/recipes/`,
  `data/predictions/` respectively (paths rooted at `settings.DATA_DIR`).

### 2.3 Auto-cleanup

`main.py` spawns a background daemon thread that, every 12 hours, deletes
datasets and models older than 7 days (plus their on-disk artifacts).

---

## 3. Backend Architecture

The backend is a single `app/` package (not a strict clean-architecture layering
of `domain`/`application`/`infrastructure`). Key modules:

```
backend/app/
├── main.py                  # FastAPI app, CORS, exception handlers, /health, cleanup daemon
├── db.py                    # SQLAlchemy engine + session factory
├── models.py                # ORM models
├── storage.py               # SQLStorage (CRUD, session isolation, cascade deletes)
├── core/
│   ├── config.py            # pydantic-settings: DATABASE_URL, DEBUG, CORS_ORIGINS, DATA_DIR, ...
│   ├── exceptions.py        # AppError hierarchy
│   └── io.py                # Shared dataframe reading helpers
├── api/
│   ├── errors.py            # Structured error responses -> {"error": {...}}
│   └── v1/
│       ├── router.py        # Route registration
│       ├── schemas/         # Pydantic request/response models
│       └── endpoints/
│           ├── datasets.py   # Upload, list, get, delete
│           ├── eda.py        # Async EDA + progress polling
│           ├── cleaning.py   # Suggestions, execute, reports
│           ├── pipelines.py  # CRUD, execute, suggest, detect-target, score
│           ├── training.py   # Training, jobs/cancel, compare, plots, exports, SHAP
│           └── settings.py   # App settings
└── services/
    ├── cleaning_service.py       # 6-step cleaning engine + run reports
    ├── eda_service.py            # EDA computation + auto-findings
    ├── preprocessing_service.py  # Pipeline building, encoding, scaling, split
    └── explainability_service.py # SHAP waterfall explanations
```

### 3.1 Configuration

`app/core/config.py` is a pydantic-settings `Settings` model. The following
environment variables are read (all optional, with defaults):

| Variable             | Default                        | Purpose |
|----------------------|--------------------------------|---------|
| `DATABASE_URL`       | `sqlite:///./data/mlpilot.db`  | DB connection |
| `DEBUG`              | `true`                         | Verbose logging / error detail |
| `CORS_ORIGINS`       | `["http://localhost:5173"]`    | Allowed CORS origins |
| `DATA_DIR`           | `data`                         | Artifact root directory |
| `MAX_DATASET_SIZE_MB`| `5120`                         | Upload size limit |
| `APP_NAME`           | `MLPilot`                      | OpenAPI title |

### 3.2 Training jobs

`POST /api/v1/training/` starts one or many training runs. Each run is tracked as
a `training_jobs` record with a lifecycle
(`queued → running → completed/failed/cancelled`) and a progress value. Jobs run
inside the backend process; cancellation is cooperative. There is **no Celery or
Redis** in the current implementation.

### 3.3 Error handling

All errors return a consistent JSON envelope (see `API.md`):

```json
{"error": {"code": "VALIDATION_ERROR", "message": "...", "field": null}}
```

---

## 4. Frontend Architecture

The frontend source lives in **`src/`** (not `frontend/src/`). `frontend/` holds
only Docker/serve config (`Dockerfile`, `nginx.conf`).

```
src/
├── App.tsx                    # Routes + QueryClientProvider
├── main.tsx                   # Entry point
├── components/                # App shell (Layout, Sidebar, TopNav, BottomNav)
├── core/
│   ├── api/                   # Axios client + per-domain API modules + errors
│   ├── config/index.ts        # API base URL (VITE_API_BASE_URL)
│   ├── hooks/useBackendReady.ts
│   └── types/api.ts           # Shared TypeScript types
├── modules/                   # Feature modules (datasets, cleaning, pipelines, training) with hooks
├── pages/                     # Route pages (Dashboard, Upload, EDA, Cleaning, ...)
├── shared/
│   ├── components/            # EmptyState, ErrorState, LoadingSpinner, PageHeader, Pagination,
│   │                          #   RouteGuard, error boundaries, ui/ primitives
│   ├── schemas/               # Zod validation schemas (pipeline, training)
│   └── utils/                 # cn(), format()
└── test/setup.ts              # Vitest setup
```

- **Data fetching:** TanStack React Query (`useDatasets`, `useEDA`,
  `usePipelines`, `useTraining`, …).
- **State:** Zustand for UI state (theme, sidebar); React Hook Form + Zod for forms.
- **Dev proxy:** Vite proxies `/api` → `http://localhost:8000`, so the frontend
  talks to the backend without CORS during local development.

---

## 5. Request Flow (example: train a model)

1. User configures a pipeline + algorithm in the UI.
2. Frontend calls `POST /api/v1/training/` (via the Axios client, through the
   Vite/nginx `/api` proxy).
3. Backend validates, creates `models` + `training_jobs` records, and starts the
   training in a background task.
4. Frontend polls `GET /api/v1/training/jobs/{id}` for status/progress.
5. On completion, the model artifact is written under `data/models/{id}/` and
   metrics are stored; the UI shows the comparison leaderboard and diagnostic
   plots.
