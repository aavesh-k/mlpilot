# MLPilot

Resume-focused full-stack web application that automates the machine learning workflow for tabular datasets. Upload a CSV, run cleaning + EDA, preprocess with pipelines, train and compare AutoML models, visualize diagnostics, score new data, and export reports — all through a neo-brutalist UI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite, TanStack React Query, React Router, Recharts |
| Backend | Python 3.12+, FastAPI, scikit-learn, pandas, numpy, matplotlib |
| Storage | JSON file (`data/db.json`) |
| ML | 10 algorithms — Logistic Regression, Random Forest, SVM, KNN, XGBoost (classification); Linear/Ridge/Lasso Regression, Random Forest, XGBoost (regression) |

## Architecture

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  React SPA   │────▶│   FastAPI Backend   │────▶│  JSON Store  │
│  localhost:5173│    │   localhost:8000    │     │data/db.json  │
└──────────────┘     └─────────────────────┘     └──────────────┘
       │                      │
       │   REST API (JSON)    │
       └──────────────────────┘
```

### Workflow

```
Upload ─▶ Clean ─▶ EDA ─▶ Pipeline ─▶ Train ─▶ Compare ─▶ Predict/Export
 (dataset) (6-step   (stats,  (impute,  (AutoML,  (leaderboard, (score new
            cleaning) findings, encode,  10 algos,  best model,  data, SHAP,
            async)   plots)    scale,    CV, tuning) plots,       recipes,
                              split)                reports)
```

### Backend Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app + CORS + exception handlers
│   ├── storage.py                 # JSON file CRUD (atomic writes, session isolation)
│   ├── core/
│   │   ├── config.py              # Settings (pydantic-settings)
│   │   ├── exceptions.py          # Domain exception hierarchy
│   │   ├── io.py                  # Shared dataframe reading helpers
│   │   └── security.py            # JWT + password hashing (unused, auth deferred)
│   ├── services/
│   │   ├── cleaning_service.py    # 6-step cleaning engine + run reports
│   │   ├── preprocessing_service.py  # Pipeline building, encoding, scaling, split
│   │   └── eda_service.py         # EDA computation + auto-findings
│   └── api/v1/
│       ├── router.py              # Route registration
│       ├── errors.py              # Structured error responses
│       ├── schemas/               # Pydantic request/response models
│       └── endpoints/
│           ├── datasets.py        # Upload, list, get, delete
│           ├── eda.py             # Async EDA with progress polling
│           ├── cleaning.py        # Cleaning suggestions, execute, reports
│           ├── pipelines.py       # CRUD, execution, suggest, detect-target, score
│           ├── training.py        # AutoML, jobs/cancel, compare, plots, exports, SHAP
│           └── settings.py        # App settings
└── tests/
    ├── test_health.py
    ├── test_datasets.py
    ├── test_datasets_extended.py
    ├── test_eda.py
    ├── test_eda_extended.py
    ├── test_pipelines.py
    ├── test_training.py
    ├── test_training_extended.py
    ├── test_multi_training.py
    ├── test_exports.py
    ├── test_plots.py
    ├── test_hardening.py
    ├── test_advanced.py
    └── conftest.py
```

### Frontend Structure

```
src/
├── App.tsx                        # Routes + QueryClientProvider
├── main.tsx                       # Entry point
├── core/api/                      # Axios API modules
│   ├── client.ts                  # Axios instance + interceptors
│   ├── datasets.api.ts
│   ├── eda.api.ts
│   ├── cleaning.api.ts
│   ├── pipelines.api.ts
│   └── training.api.ts
├── core/types/                    # TypeScript interfaces
├── modules/                       # Feature modules
│   ├── datasets/hooks/            # useDatasets, useEDA
│   ├── pipelines/hooks/           # usePipelines
│   └── training/hooks/            # useModels, useJobs
├── pages/                         # Page components
│   ├── Dashboard.tsx              # Overview with dataset + model summary
│   ├── DatasetUpload.tsx          # Upload + dataset list
│   ├── DatasetOverview.tsx        # Column stats table
│   ├── Cleaning.tsx               # 6-step cleaning pipeline + report view
│   ├── EDA.tsx                    # Async EDA, correlation heatmap + findings
│   ├── Preprocessing.tsx          # Pipeline CRUD
│   ├── ModelTraining.tsx          # AutoML algorithm selection + training
│   ├── ModelComparison.tsx        # Leaderboard with metrics + job monitoring
│   ├── Visualizations.tsx         # Confusion matrix, ROC/PR, importance, residuals
│   ├── Results.tsx                # Model history + downloads + predictions
│   ├── Home.tsx                   # Landing page
│   └── Settings.tsx               # System config
└── shared/components/             # Reusable UI
    ├── EmptyState.tsx
    ├── ErrorState.tsx
    ├── LoadingSpinner.tsx
    ├── PageHeader.tsx
    ├── Pagination.tsx
    └── ui/ (Button, Card, Badge, Input)
src/shared/schemas/            # Zod validation schemas
    ├── auth.ts
    ├── pipeline.ts
    └── training.ts
```

## Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows
# source .venv/bin/activate  # Unix
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
# From project root
npm install
npm run dev     # starts at localhost:5173
```

### Docker

```bash
docker compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

### Production Build

```bash
npm run build   # produces dist/
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/datasets/upload` | Upload dataset (CSV/Parquet/JSON/XLSX) |
| `GET` | `/api/v1/datasets/` | List datasets (paginated) |
| `GET` | `/api/v1/datasets/{id}` | Get dataset |
| `DELETE` | `/api/v1/datasets/{id}` | Delete dataset |
| `POST` | `/api/v1/datasets/{id}/eda` | Start async EDA |
| `GET` | `/api/v1/datasets/{id}/eda` | Get EDA report/status (polling) |
| `GET` | `/api/v1/datasets/{id}/columns` | Column stats |
| `GET` | `/api/v1/datasets/{id}/cleaning/suggestions` | Suggested cleaning config |
| `POST` | `/api/v1/datasets/{id}/cleaning/execute` | Run cleaning pipeline |
| `GET` | `/api/v1/datasets/{id}/cleaning/runs` | Cleaning run history |
| `GET` | `/api/v1/datasets/{id}/cleaning/report/{run_id}` | Cleaning run report |
| `GET` | `/api/v1/datasets/{id}/cleaning/download/{run_id}` | Download cleaned CSV |
| `POST` | `/api/v1/pipelines/suggest` | Suggest pipeline config |
| `POST` | `/api/v1/pipelines/detect-target` | Auto-detect target column |
| `POST` | `/api/v1/pipelines/` | Create pipeline |
| `GET` | `/api/v1/pipelines/` | List pipelines (paginated) |
| `GET` | `/api/v1/pipelines/{id}` | Get pipeline |
| `PUT` | `/api/v1/pipelines/{id}` | Update pipeline |
| `DELETE` | `/api/v1/pipelines/{id}` | Delete pipeline |
| `POST` | `/api/v1/pipelines/{id}/execute` | Execute pipeline (background) |
| `POST` | `/api/v1/pipelines/{id}/score` | Score new data against a model |
| `POST` | `/api/v1/training/` | Train model(s) — single or AutoML batch |
| `GET` | `/api/v1/training/models` | List models (paginated) |
| `GET` | `/api/v1/training/models/compare` | Compare models (leaderboard) |
| `GET` | `/api/v1/training/models/{id}` | Get model |
| `GET` | `/api/v1/training/models/{id}/download` | Download model artifact (pkl/zip) |
| `POST` | `/api/v1/training/models/{id}/set-best` | Mark model as best |
| `GET` | `/api/v1/training/models/{id}/plots` | Diagnostic plots (confusion, ROC/PR, importance, residuals) |
| `GET` | `/api/v1/training/models/{id}/explain` | SHAP waterfall explanation |
| `POST` | `/api/v1/training/models/{id}/predict` | Predict on uploaded file |
| `GET` | `/api/v1/training/models/{id}/export/cleaned` | Export cleaned CSV |
| `GET` | `/api/v1/training/models/{id}/export/preprocessed` | Export preprocessed splits (ZIP) |
| `GET` | `/api/v1/training/models/{id}/export/recipe` | Export inference recipe (ZIP) |
| `GET` | `/api/v1/training/models/{id}/export/report` | Executive HTML report |
| `GET` | `/api/v1/training/predictions/download` | Download latest predictions CSV |
| `GET` | `/api/v1/training/jobs` | List jobs (paginated) |
| `GET` | `/api/v1/training/jobs/{id}` | Get job |
| `POST` | `/api/v1/training/jobs/{id}/cancel` | Cancel job (cooperative) |
| `GET` | `/api/v1/settings/` | Get app settings |
| `PUT` | `/api/v1/settings/` | Update app settings |

All list endpoints accept `?page=1&per_page=20` query parameters.

Error responses follow a consistent format:
```json
{"error": {"code": "VALIDATION_ERROR", "message": "...", "field": null}}
```

## Testing

### Backend (54 tests)

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

### Frontend (50 tests)

```bash
npm test          # vitest run
npm run lint      # oxlint
npm run typecheck # tsc -b
```

### CI Pipeline

The project includes GitHub Actions CI (`.github/workflows/ci.yml`) that runs on every push:

| Step | Command |
|------|---------|
| Backend lint | `ruff check backend/` |
| Backend test | `pytest backend/tests/` |
| Frontend typecheck | `tsc -b` |
| Frontend lint | `oxlint src/` |
| Frontend test | `vitest run` |
| Frontend build | `vite build` |

## Features

- [x] Dataset upload (CSV, Parquet, JSON, XLSX) with format validation
- [x] 6-step data cleaning: missing values, outliers, dtype issues, constant columns, currency/date normalization, with suggestions + run reports + cleaned CSV download
- [x] Automated EDA (async): column stats, correlation heatmap, auto-findings, outliers, duplicates
- [x] Preprocessing pipelines: imputation (incl. KNN), encoding (OHE, label, target), scaling, train/test split, feature selection, SMOTE/class-weight handling
- [x] AutoML training: 10 algorithms, cross-validation, RandomizedSearchCV tuning
- [x] Multi-model jobs with progress, lifecycle tracking (queued → running → completed/failed/cancelled) and cooperative cancellation
- [x] Model comparison leaderboard with best-model detection + set-best
- [x] Diagnostic plots: confusion matrix, ROC/PR curves, feature importance, residuals, learning curve (Recharts + PNG export)
- [x] SHAP waterfall explainability
- [x] Predictions: score new data, download predictions CSV
- [x] Export hub: cleaned CSV, preprocessed splits ZIP, inference recipe ZIP, model artifact download, executive HTML report
- [x] Session isolation (`?session_id=`) + auto-cleanup of orphaned data
- [x] Settings API
- [x] Paginated list endpoints
- [x] Structured error responses
- [x] Loading/error/empty states on all pages
- [x] Test suite — 54 backend tests + 50 frontend tests
- [x] CI pipeline (GitHub Actions)
