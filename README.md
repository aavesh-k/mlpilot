# MLPilot

Resume-focused full-stack web application that automates the machine learning
workflow for tabular datasets. Upload a CSV (or Parquet/JSON/XLSX), run
data cleaning and EDA, build a preprocessing pipeline, train and compare ML
models, generate SHAP explanations, score new data, and export reports — all
through a responsive React UI.

> **Status:** Milestones 1 (Core Pipeline), 3 (Polish & DX), and 4 (Advanced
> Features) are complete. Authentication / multi-user support is **deferred**
> (see Roadmap).

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite, TanStack React Query, React Router, Recharts, Zustand, Radix UI, React Hook Form + Zod |
| Backend  | Python 3.12+, FastAPI, Uvicorn, Pydantic / pydantic-settings, SQLAlchemy 2.0 |
| ML       | scikit-learn, XGBoost, pandas, numpy, imbalanced-learn, pyarrow, matplotlib, cloudpickle |
| Storage  | SQLAlchemy database — **SQLite by default** (`data/mlpilot.db`); PostgreSQL supported via `DATABASE_URL`. EDA reports and cleaning runs are stored as JSON files under `data/`; uploaded datasets and model artifacts live on the filesystem under `data/`. |
| Tooling  | Ruff (Python lint), oxlint + tsc (frontend), pytest, Vitest, GitHub Actions CI |

## Architecture

```
┌────────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│  React SPA (Vite)  │─────▶│   FastAPI Backend    │─────▶│  SQL Database    │
│  localhost:5173    │      │   localhost:8000     │      │ SQLite / Postgres│
└────────────────────┘      └─────────────────────┘      └──────────────────┘
        │                          │
        │   /api  (Vite proxy / nginx)   REST API (JSON)
        └──────────────────────────┘
```

In development, Vite proxies `/api` to the backend on port 8000, so no CORS
configuration is required locally. In the Docker setup, nginx proxies `/api` to
the backend container.

### Workflow

```
Upload ─▶ Clean ─▶ EDA ─▶ Pipeline ─▶ Train ─▶ Compare ─▶ Predict / Export
 (CSV,      (6-step   (stats,  (impute,  (10 algos, (leaderboard, (score new
  Parquet,   cleaning) findings, encode,  CV,        best model,  data, SHAP,
  JSON,      async)   plots)    scale,    tuning)    plots,       recipes,
  XLSX)                        split)               reports)    downloads)
```

### Backend Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, exception handlers, /health, auto-cleanup daemon
│   ├── db.py                   # SQLAlchemy engine + session factory
│   ├── models.py               # ORM models (datasets, pipelines, models, training_jobs, settings, columns)
│   ├── storage.py              # SQLStorage — CRUD over SQLAlchemy (session isolation, cascade deletes)
│   ├── core/
│   │   ├── config.py           # Settings (pydantic-settings): DATABASE_URL, DEBUG, CORS_ORIGINS, DATA_DIR, ...
│   │   ├── exceptions.py       # Domain exception hierarchy
│   │   └── io.py               # Shared dataframe reading helpers
│   ├── api/
│   │   ├── errors.py           # Structured error responses
│   │   └── v1/
│   │       ├── router.py       # Route registration
│   │       ├── schemas/        # Pydantic request/response models
│   │       └── endpoints/
│   │           ├── datasets.py     # Upload, list, get, delete
│   │           ├── eda.py          # Async EDA with progress polling
│   │           ├── cleaning.py     # Cleaning suggestions, execute, reports
│   │           ├── pipelines.py    # CRUD, execution, suggest, detect-target, score
│   │           ├── training.py     # Training, jobs/cancel, compare, plots, exports, SHAP
│   │           └── settings.py     # App settings
│   └── services/
│       ├── cleaning_service.py      # 6-step cleaning engine + run reports
│       ├── eda_service.py           # EDA computation + auto-findings
│       ├── preprocessing_service.py # Pipeline building, encoding, scaling, split
│       └── explainability_service.py# SHAP waterfall explanations
├── tests/                      # pytest suite (unit + integration)
│   ├── conftest.py
│   ├── test_health.py, test_datasets*.py, test_eda*.py, test_pipelines.py
│   ├── test_training*.py, test_multi_training.py, test_exports.py, test_plots.py
│   ├── test_hardening.py, test_cascade_delete.py, test_storage_atomic_write.py
│   ├── test_advanced.py, test_datasets_broken_delete.py
│   ├── helpers/, unit/, integration/
├── requirements.txt            # runtime dependencies
├── requirements-dev.txt        # dev dependencies (pytest, ruff, httpx)
├── pyproject.toml             # project metadata + ruff/pytest config
├── alembic.ini                # Alembic configured (migrations not yet committed)
└── Dockerfile
```

> The database schema is created automatically on startup via
> `Base.metadata.create_all`. Alembic is configured (`alembic.ini`) but no
> migration scripts are committed yet.

### Frontend Structure

```
src/
├── App.tsx                    # Routes + QueryClientProvider
├── main.tsx                   # Entry point
├── components/                # App shell (Layout, Sidebar, TopNav, BottomNav)
├── core/
│   ├── api/                   # Axios client + per-domain API modules (datasets, eda, cleaning, pipelines, training) + errors
│   ├── config/index.ts        # API base URL (VITE_API_BASE_URL)
│   ├── hooks/useBackendReady.ts
│   └── types/api.ts           # Shared TypeScript types
├── modules/                   # Feature modules
│   ├── datasets/hooks/        # useDatasets, useEDA
│   ├── cleaning/hooks/        # useCleaning
│   ├── pipelines/hooks/       # usePipelines
│   └── training/hooks/        # useTraining
├── pages/                     # Page components
│   ├── Home.tsx, Dashboard.tsx, DatasetUpload.tsx, DatasetOverview.tsx
│   ├── Cleaning.tsx, EDA.tsx, Preprocessing.tsx
│   ├── ModelTraining.tsx, ModelComparison.tsx, Visualizations.tsx
│   ├── Results.tsx, Settings.tsx
├── shared/
│   ├── components/            # EmptyState, ErrorState, LoadingSpinner, PageHeader, Pagination, RouteGuard, error boundaries
│   ├── components/ui/         # Button, Card, Badge, Input, ConfirmDialog (+ index barrel)
│   ├── schemas/               # Zod validation schemas (pipeline, training)
│   └── utils/                 # cn(), format()
└── test/setup.ts              # Vitest setup
```

> The production frontend is built from `src/` into `dist/` and served by
> nginx (see `frontend/Dockerfile` and `frontend/nginx.conf`). `frontend/`
> contains only Docker/serve configuration — the source lives in `src/`.

## Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # Unix

pip install -r requirements.txt
pip install -r requirements-dev.txt   # for running tests / linting

uvicorn app.main:app --reload --port 8000
```

By default the backend uses a local SQLite database (`data/mlpilot.db`); no
database server is required. Set `DATABASE_URL` (see `.env.example`) to use
PostgreSQL instead.

### Frontend

```bash
# From the repository root
npm install
npm run dev          # starts Vite at http://localhost:5173 (proxies /api -> :8000)
```

### All-in-one (from repo root)

```bash
npm run backend      # starts the FastAPI backend via uvicorn
npm run dev          # starts the Vite frontend
```

### Docker

```bash
docker compose up --build
# Frontend:  http://localhost
# Backend:   http://localhost:8000
```

> **Caveat:** `docker-compose.yml` runs `alembic upgrade head` on startup, but
> no migration scripts are committed yet (the app auto-creates its schema).
> For local Docker use, remove that step or rely on the app's `create_all`.
> Also note the compose `DATABASE_URL` uses the `asyncpg` driver, which is not
> in `requirements.txt` — use `postgresql+psycopg2://...` for Postgres.

### Production Build

```bash
npm run build        # produces dist/
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Health check |
| `POST` | `/api/v1/datasets/upload` | Upload dataset (CSV/Parquet/JSON/XLSX) |
| `GET`  | `/api/v1/datasets/` | List datasets (paginated) |
| `GET`  | `/api/v1/datasets/{id}` | Get dataset |
| `DELETE` | `/api/v1/datasets/{id}` | Delete dataset |
| `POST` | `/api/v1/datasets/{id}/eda` | Start async EDA |
| `GET`  | `/api/v1/datasets/{id}/eda` | Get EDA report/status (polling) |
| `GET`  | `/api/v1/datasets/{id}/columns` | Column stats |
| `GET`  | `/api/v1/datasets/{id}/cleaning/suggestions` | Suggested cleaning config |
| `POST` | `/api/v1/datasets/{id}/cleaning/execute` | Run cleaning pipeline |
| `GET`  | `/api/v1/datasets/{id}/cleaning/runs` | Cleaning run history |
| `GET`  | `/api/v1/datasets/{id}/cleaning/report/{run_id}` | Cleaning run report |
| `GET`  | `/api/v1/datasets/{id}/cleaning/download/{run_id}` | Download cleaned CSV |
| `POST` | `/api/v1/pipelines/suggest` | Suggest pipeline config |
| `POST` | `/api/v1/pipelines/detect-target` | Auto-detect target column |
| `POST` | `/api/v1/pipelines/` | Create pipeline |
| `GET`  | `/api/v1/pipelines/` | List pipelines (paginated) |
| `GET`  | `/api/v1/pipelines/{id}` | Get pipeline |
| `PUT`  | `/api/v1/pipelines/{id}` | Update pipeline |
| `DELETE` | `/api/v1/pipelines/{id}` | Delete pipeline |
| `POST` | `/api/v1/pipelines/{id}/execute` | Execute pipeline (background) |
| `POST` | `/api/v1/pipelines/{id}/score` | Score new data against a model |
| `POST` | `/api/v1/training/` | Train model(s) — single or multi-algorithm batch |
| `GET`  | `/api/v1/training/models` | List models (paginated) |
| `GET`  | `/api/v1/training/models/compare` | Compare models (leaderboard) |
| `GET`  | `/api/v1/training/models/{id}` | Get model |
| `GET`  | `/api/v1/training/models/{id}/download` | Download model artifact (pkl/zip) |
| `POST` | `/api/v1/training/models/{id}/set-best` | Mark model as best |
| `GET`  | `/api/v1/training/models/{id}/plots` | Diagnostic plots (confusion, ROC/PR, importance, residuals) |
| `GET`  | `/api/v1/training/models/{id}/explain` | SHAP waterfall explanation |
| `POST` | `/api/v1/training/models/{id}/predict` | Predict on uploaded file |
| `GET`  | `/api/v1/training/models/{id}/export/cleaned` | Export cleaned CSV |
| `GET`  | `/api/v1/training/models/{id}/export/preprocessed` | Export preprocessed splits (ZIP) |
| `GET`  | `/api/v1/training/models/{id}/export/recipe` | Export inference recipe (ZIP) |
| `GET`  | `/api/v1/training/models/{id}/export/report` | Executive HTML report |
| `GET`  | `/api/v1/training/predictions/download` | Download latest predictions CSV |
| `GET`  | `/api/v1/training/jobs` | List jobs (paginated) |
| `GET`  | `/api/v1/training/jobs/{id}` | Get job |
| `POST` | `/api/v1/training/jobs/{id}/cancel` | Cancel job (cooperative) |
| `GET`  | `/api/v1/settings/` | Get app settings |
| `PUT`  | `/api/v1/settings/` | Update app settings |

All list endpoints accept `?page=1&per_page=20`. Error responses follow a
consistent format:

```json
{"error": {"code": "VALIDATION_ERROR", "message": "...", "field": null}}
```

## Testing

### Backend

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

### Frontend

```bash
npm test           # Vitest
npm run lint       # oxlint
npm run typecheck  # tsc -b
```

### CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:

| Step | Command (working dir) |
|------|----------------------|
| Backend lint | `ruff check .` (backend/) |
| Backend test | `python -m pytest tests/ -v` (backend/) |
| Frontend typecheck | `npx tsc -b` |
| Frontend lint | `npm run lint` |
| Frontend test | `npm test` |
| Frontend build | `npm run build` |

## Features

- [x] Dataset upload (CSV, Parquet, JSON, XLSX) with format + size validation
- [x] 6-step data cleaning: missing values, outliers, dtype issues, constant columns, currency/date normalization, with suggestions + run reports + cleaned CSV download
- [x] Automated EDA (async): column stats, correlation heatmap, auto-findings, outliers, duplicates
- [x] Preprocessing pipelines: imputation (incl. KNN), encoding (OHE, label, target), scaling, train/test split, feature selection, imbalance handling (SMOTE / class weights)
- [x] Multi-algorithm training: 10 algorithms, cross-validation, RandomizedSearchCV tuning
- [x] Multi-model jobs with progress and lifecycle tracking (queued → running → completed/failed/cancelled) + cooperative cancellation
- [x] Model comparison leaderboard with best-model detection + set-best
- [x] Diagnostic plots: confusion matrix, ROC/PR curves, feature importance, residuals, learning curve
- [x] SHAP waterfall explainability
- [x] Predictions: score new data, download predictions CSV
- [x] Export hub: cleaned CSV, preprocessed splits ZIP, inference recipe ZIP, model artifact download, executive HTML report
- [x] Session isolation (`?session_id=`) + automatic cleanup of expired data (7-day daemon)
- [x] Settings API
- [x] Paginated list endpoints
- [x] Structured error responses
- [x] Loading / error / empty states on all pages
- [x] Backend (pytest) and frontend (Vitest) test suites
- [x] CI pipeline (GitHub Actions)

## Roadmap

Deferred / not-yet-implemented (per `PRD.md` and `MILESTONES.md`):

- **Authentication & multi-user (JWT)** — deferred (Milestone 2); currently a
  single local user with session isolation.
- **Optuna hyperparameter tuning** — deferred via an extension point.
- **Role-based access control (RBAC)** — deferred (single-user by design).
- **Real-time collaborative editing** — out of scope for the portfolio.
- **Dataset versioning / diffing** — nice-to-have, not implemented.
- **Tech-debt cleanups noted in `AGENTS.md`**: FastAPI `on_event` → lifespan
  migration; `SVC probability` → `CalibratedClassifierCV`; Vite code-splitting
  to reduce the single ~950 kB chunk.

## Screenshots

<!-- TODO: add screenshots / GIFs of the dashboard, EDA, training, and comparison views -->

## License

<!-- TODO: add LICENSE (none present yet) -->
