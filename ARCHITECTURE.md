# MLPilot — Architecture

> **Scope note:** This document describes the **current, implemented** architecture.
> Celery/Redis task queues and an experiments module are **not implemented** (see `README.md` → Roadmap and
> `PRD.md`). Authentication is implemented (Milestone 2). Where this doc differs from older design notes, this doc is authoritative.

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

- The app is **per-user isolated** via JWT (`Authorization: Bearer <token>`). Every dataset/pipeline/model/job row carries `user_id` (FK → `users.id`). Unauthenticated requests get 401; `Home` (`/`) and `POST /api/v1/auth/*` + `GET /health` are public. Guest demo without login uses per-browser `X-Session-ID` fallback (isolated, not shared).
- No message broker, scheduler, or background worker process exists. Long-running
  work (EDA, training) executes in the backend process (background threads /
  cooperative cancellation), and progress is polled over HTTP.

---

## 2. Storage

### 2.1 Primary store — SQLAlchemy

All structured records (users, datasets, columns, pipelines, models, training jobs)
are persisted through **SQLAlchemy** (`backend/app/db.py`,
`backend/app/storage.py` → `SQLStorage`).

- **Default engine:** SQLite at absolute `data/mlpilot.db` (via `DATA_DIR`, `backend/app/core/config.py:35`; no server required).
- **PostgreSQL:** set `DATABASE_URL` (e.g. `postgresql+psycopg2://...`; Neon/Supabase in production) in the
  environment; the same models/dialect work unchanged (`backend/app/db.py:14` SQLite vs Postgres + `StaticPool`).
- **Schema:** created automatically on startup via
  `Base.metadata.create_all` (`backend/app/db.py:39` + `backend/app/storage.py:49`). Alembic is configured
  (`alembic.ini`) but **no migration scripts are committed**, so rely on the
  auto-create behaviour.

Tables (defined in `app/models.py`):

| Table             | Purpose |
|-------------------|---------|
| `users`           | Registered user (email unique, bcrypt 12 hash) |
| `datasets`        | Dataset metadata + status + file path (`user_id` FK) |
| `dataset_columns` | Per-column EDA statistics |
| `pipelines`       | Preprocessing pipeline definitions + status (`user_id` FK) |
| `models`          | Trained model metadata, metrics, status, artifact path (`user_id` FK) |
| `training_jobs`   | Training job lifecycle + progress + log (`user_id` FK) |

Each record stores its JSON body in a `data` JSON column; `user_id` provides
per-user isolation (guest fallback uses `session_id` via `X-Session-ID` header). `SQLStorage` exposes CRUD with user isolation and cascade deletes
(deleting a dataset/pipeline/job also removes its derived models and on-disk
artifacts) and `migrate_guest_to_user` (`backend/app/storage.py:436`).

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

Disabled by default (`ENABLE_AUTO_CLEANUP=false` `backend/app/core/config.py:38`). When enabled (`main.py` `lifespan`), a background daemon thread every 12 hours deletes datasets and models older than 7 days (plus on-disk artifacts).

---

## 3. Backend Architecture

The backend is a single `app/` package (not a strict clean-architecture layering
of `domain`/`application`/`infrastructure`). Key modules:

```
backend/app/
├── main.py                  # FastAPI lifespan, CORS, exception handlers, /health + /api/v1/health, cleanup daemon
├── db.py                    # SQLAlchemy engine + session factory
├── models.py                # ORM models (users, datasets, pipelines, models, jobs)
├── storage.py               # SQLStorage (CRUD, per-user + per-session isolation, cascade deletes, guest migration)
├── core/
│   ├── config.py            # pydantic-settings: DATABASE_URL absolute, SECRET_KEY, JWT 60m/7d, CORS, rate-limit, cleanup
│   ├── security.py          # bcrypt 12, JWT create/verify, password policy, refresh 1d vs 7d
│   ├── exceptions.py        # AppError hierarchy
│   └── io.py                # Shared dataframe reading helpers
├── api/
│   ├── deps.py              # get_owner hybrid (JWT user_id or X-Session-ID), get_current_user, require_user
│   ├── errors.py            # Structured error responses + friendly validation mapping
│   └── v1/
│       ├── router.py        # Route registration
│       ├── schemas/         # Pydantic request/response models (auth, datasets, pipelines, training)
│       └── endpoints/
│           ├── auth.py       # register/login/me/refresh/forgot-password (JWT + guest migration)
│           ├── datasets.py   # upload (auth-only), list/get/delete, demo (guest cached)
│           ├── eda.py        # Async EDA + progress polling
│           ├── cleaning.py   # Suggestions, execute, reports
│           ├── pipelines.py  # CRUD, execute, suggest, detect-target, score
│           ├── training.py   # Training, jobs/cancel, compare, plots, exports, SHAP, algorithms/recommendations
│           └── settings.py   # App settings
└── services/
    ├── cleaning_service.py       # 6-step cleaning engine + run reports
    ├── eda_service.py            # EDA computation + auto-findings
    ├── preprocessing_service.py  # Pipeline building, encoding, scaling, split
    └── explainability_service.py # SHAP waterfall explanations
```

### 3.1 Configuration

`app/core/config.py` is a pydantic-settings `Settings` model (`_resolve_data_dir()` → absolute `PROJECT_ROOT/data`). The following
environment variables are read (all optional, with defaults):

| Variable             | Default                        | Purpose |
|----------------------|--------------------------------|---------|
| `DATABASE_URL`       | `sqlite:///<PROJECT_ROOT>/data/mlpilot.db` (absolute) | DB connection (`postgresql+psycopg2://` for Neon/Supabase) |
| `DEBUG`              | `false` (secure)              | Verbose logging + enables `/docs` |
| `CORS_ORIGINS`       | `["http://localhost:5173"]`    | Allowed CORS origins |
| `DATA_DIR`           | `data` (absolute)              | Artifact root directory |
| `MAX_DATASET_SIZE_MB`| `5120`                         | Upload size limit |
| `APP_NAME`           | `MLPilot`                      | OpenAPI title |
| `SECRET_KEY`         | `change-me...` (must override in prod) | JWT signing key (HS256) |
| `JWT_ALGORITHM`      | `HS256`                        | JWT algo |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60`              | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS`  | `7` (or `1` if `remember_me=false`) | Refresh token TTL |
| `RATE_LIMIT_ENABLED` | `true`                         | API rate limiting |
| `ENABLE_AUTO_CLEANUP`| `false`                        | Auto-cleanup daemon |
| `AUTO_CLEANUP_MAX_AGE_DAYS` | `7`                    | Cleanup age |

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
├── App.tsx                    # Routes + QueryClientProvider (incl. /login /register)
├── main.tsx                   # Entry point
├── components/                # App shell (Layout, Sidebar, TopNav, BottomNav)
├── core/
│   ├── api/                   # Axios client (JWT + X-Session-ID) + per-domain modules (auth, datasets, eda, cleaning, pipelines, training) + errors
│   ├── config/index.ts        # API base URL (VITE_API_BASE_URL)
│   ├── hooks/useBackendReady.ts
│   └── types/api.ts           # Shared TypeScript types
├── modules/
│   ├── auth/store/authStore.ts # Zustand persist mixedStorage (localStorage vs sessionStorage) + rememberMe
│   ├── datasets/hooks/        # useDatasets, useEDA
│   ├── cleaning/hooks/        # useCleaning
│   ├── pipelines/hooks/       # usePipelines
│   └── training/hooks/        # useTraining
├── pages/                     # Route pages (Auth split + forgot, Dashboard, Upload, EDA, Cleaning, ...)
├── shared/
│   ├── components/            # EmptyState, ErrorState, LoadingSpinner, PageHeader, Pagination,
│   │                          #   RouteGuard, AuthGuard, error boundaries, ui/ primitives
│   ├── schemas/               # Zod validation schemas (pipeline, training, auth)
│   └── utils/                 # cn(), format()
└── test/setup.ts              # Vitest setup
```

- **Data fetching:** TanStack React Query (`useDatasets`, `useEDA`,
  `usePipelines`, `useTraining`, …).
- **State:** Zustand for UI (`authStore` mixedStorage rememberMe), theme/sidebar; React Hook Form + Zod for forms (login `rememberMe`, register password strength).
- **Dev proxy:** Vite proxies `/api` → `http://localhost:8000`; Vercel rewrites `/api/*` → Render backend, so same-origin no CORS locally.

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
