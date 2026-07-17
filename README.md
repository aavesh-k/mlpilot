# MLPilot

Resume-focused full-stack web application that automates the machine learning workflow for tabular datasets. Upload a CSV, run EDA, preprocess with pipelines, train models, and compare results — all through a neo-brutalist UI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite, TanStack React Query, React Router |
| Backend | Python 3.12+, FastAPI, scikit-learn, pandas, numpy |
| Storage | JSON file (`data/db.json`) |
| ML | Random Forest, SVM, Logistic Regression |

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
Upload CSV ──▶ EDA ──▶ Pipeline ──▶ Train ──▶ Compare
 (dataset)     (stats,    (impute,     (RF, SVM,   (leaderboard,
               findings)   encode,      LogReg)     best model)
                          scale, split)
```

### Backend Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app + CORS + exception handlers
│   ├── storage.py                 # JSON file CRUD
│   ├── core/
│   │   ├── config.py              # Settings (pydantic-settings)
│   │   ├── exceptions.py          # Domain exception hierarchy
│   │   └── security.py            # JWT + password hashing (unused)
│   └── api/v1/
│       ├── router.py              # Route registration
│       ├── errors.py              # Structured error responses
│       └── endpoints/
│           ├── datasets.py        # Upload, list, get, delete
│           ├── eda.py             # Column stats, correlation, findings
│           ├── pipelines.py       # CRUD + execution
│           └── training.py        # Train, compare, job management
└── tests/
    ├── test_health.py
    ├── test_datasets.py
    ├── test_datasets_extended.py
    ├── test_eda.py
    ├── test_eda_extended.py
    ├── test_pipelines.py
    ├── test_training.py
    ├── test_training_extended.py
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
│   ├── EDA.tsx                    # Correlation matrix + findings
│   ├── Preprocessing.tsx          # Pipeline CRUD
│   ├── ModelTraining.tsx          # Algorithm selection + training
│   ├── ModelComparison.tsx        # Leaderboard with metrics
│   ├── Results.tsx                # Model history table
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
| `GET` | `/api/v1/datasets/{id}/eda` | Full EDA report |
| `GET` | `/api/v1/datasets/{id}/columns` | Column stats |
| `POST` | `/api/v1/pipelines/` | Create pipeline |
| `GET` | `/api/v1/pipelines/` | List pipelines (paginated) |
| `GET` | `/api/v1/pipelines/{id}` | Get pipeline |
| `PUT` | `/api/v1/pipelines/{id}` | Update pipeline |
| `DELETE` | `/api/v1/pipelines/{id}` | Delete pipeline |
| `POST` | `/api/v1/pipelines/{id}/execute` | Execute pipeline |
| `POST` | `/api/v1/training/` | Train model |
| `GET` | `/api/v1/training/models` | List models (paginated) |
| `GET` | `/api/v1/training/models/{id}` | Get model |
| `GET` | `/api/v1/training/models/compare` | Compare models |
| `GET` | `/api/v1/training/jobs` | List jobs (paginated) |
| `GET` | `/api/v1/training/jobs/{id}` | Get job |
| `POST` | `/api/v1/training/jobs/{id}/cancel` | Cancel job |

All list endpoints accept `?page=1&per_page=20` query parameters.

Error responses follow a consistent format:
```json
{"error": {"code": "VALIDATION_ERROR", "message": "...", "field": null}}
```

## Testing

### Backend (44 tests)

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
- [x] Automated EDA: column stats, correlation matrix, auto-findings
- [x] Preprocessing pipelines: imputation, encoding, scaling, split
- [x] Model training: Random Forest, SVM, Logistic Regression
- [x] Model comparison leaderboard with best-model detection
- [x] Job lifecycle tracking (queued → running → completed/failed)
- [x] Paginated list endpoints
- [x] Structured error responses
- [x] Loading/error/empty states on all pages
- [x] Test suite — 44 backend tests + 50 frontend tests
- [x] CI pipeline (GitHub Actions)
