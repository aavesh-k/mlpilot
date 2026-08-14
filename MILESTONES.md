# MLPilot — Milestones

Each milestone is independently buildable and testable. They build on each other but each delivers a working, demonstrable increment.

---

## Milestone 1: Core Pipeline (Complete)

**Goal:** End-to-end ML workflow — upload a dataset, run EDA, preprocess, train models, compare results. Simplified architecture: no auth, no database, JSON file storage.

### Features
- [x] JSON file storage (`data/db.json`) for all entities
- [x] Dataset upload (CSV, Parquet, JSON, XLSX), list, get, delete
- [x] EDA: column stats, correlation matrix, auto-findings (missing values, high correlation)
- [x] Pipeline CRUD with configurable steps (imputation, encoding, scaling, train/test split)
- [x] Pipeline execution → produces processed parquet files
- [x] Model training (Random Forest, SVM, Logistic Regression) with hyperparameters
- [x] Training jobs with lifecycle tracking (running → completed/failed)
- [x] Model metrics (accuracy, F1, precision, recall, ROC-AUC)
- [x] Model comparison endpoint (sorted by accuracy, best model detection)
- [x] Model artifact serialization (cloudpickle `.pkl`)
- [x] Health check endpoint
- [x] CORS configured for `localhost:5173`
- [x] Frontend builds clean (0 TypeScript errors)

### Backend Files

| File | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app factory |
| `backend/app/core/config.py` | pydantic-settings (DATA_DIR, CORS, size limits) |
| `backend/app/storage.py` | JSON file CRUD for all entities |
| `backend/app/api/v1/router.py` | Route registration |
| `backend/app/api/v1/endpoints/datasets.py` | Upload, list, get, delete datasets |
| `backend/app/api/v1/endpoints/eda.py` | Column statistics, correlation, findings |
| `backend/app/api/v1/endpoints/pipelines.py` | Pipeline CRUD + execution |
| `backend/app/api/v1/endpoints/training.py` | Model training, jobs, comparison |

### Dependencies
- Python 3.12+, FastAPI, uvicorn, pandas, scikit-learn, numpy, cloudpickle, openpyxl
- React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack React Query, Axios

### Verified
- [x] `python -c "from app.main import app"` — 0 import errors
- [x] `GET /health` returns 200
- [x] `POST /api/v1/datasets/upload` — CSV stored + metadata persisted
- [x] `GET /api/v1/datasets/` — list returns uploaded datasets
- [x] `GET /api/v1/datasets/{id}/eda` — column stats + findings returned
- [x] `POST /api/v1/training/` — RF model trains, metrics returned
- [x] `npx tsc -b` — 0 TypeScript errors
- [x] `vite build` — produces dist/

### Estimated Complexity: 5 / 5 (combined M2–M6 scope, simplified)

---

## Milestone 2: Auth & Multi-User (Deferred)

**Goal:** Add user authentication. Deferred to end per user preference — the current focus is on ML workflow depth and polish.

### Features
- [ ] User registration + login (JWT)
- [ ] Auth pages (Login, Register)
- [ ] Auth context + guarded routes
- [ ] Token refresh interceptor on API client
- [ ] Per-user data isolation in JSON storage (`data/users/{user_id}/db.json`)

### Migration from Current
- Auth files already exist at `src/modules/auth/`, `src/core/api/auth.api.ts`, `src/core/router/index.tsx`, `src/core/api/client.ts` (with interceptor) — need uncommenting and wiring
- Backend would add `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

### Estimated Complexity: 2 / 5

---

## Milestone 3: Polish & DX (Complete)

**Goal:** Production-ready quality. Testing, error handling, performance, and developer experience.

### Features
- [x] Comprehensive test suite — 54 backend tests (13 files) + 50 frontend tests (12 files)
- [x] Structured error responses across all endpoints (`{"error": {"code", "message", "field?"}}`)
- [x] Loading/error/empty states (ErrorState, LoadingSpinner with skeletons, Pagination)
- [x] Pagination on dataset/model listing
- [x] Form validation parity (Zod ↔ Pydantic) — auth, pipeline, training schemas
- [x] Responsive design QA — BottomNav, slide-in Sidebar, grid/button/padding fixes
- [x] README with architecture diagram + setup
- [x] CI pipeline (lint, typecheck, test) — `.github/workflows/ci.yml`

### Estimated Complexity: 3 / 5

---

## Milestone 4: Advanced Features (Complete)

**Goal:** Turn the core pipeline into a resume-quality ML platform — depth beyond the baseline M1 scope.

### Features
- [x] Data cleaning module: 6-step pipeline (missing values, outliers, dtype issues, constant columns, date/currency normalization) with auto-suggestions, run reports, cleaned CSV download
- [x] Async EDA: background thread + progress polling, correlation heatmap, enriched auto-findings (missingness, outliers, duplicates, high cardinality)
- [x] Multi-algorithm training: 10 algorithms (5 classification + 5 regression), K-fold CV, RandomizedSearchCV tuning, per-job progress
- [x] Cooperative job cancellation — background worker checks a cancel event between steps/models and finalizes the job record
- [x] Model comparison: unified leaderboard across algorithms, sorted by metric, best-model detection
- [x] Interactive diagnostic plots (Recharts): confusion matrix, ROC/PR curves, feature importance, residuals, learning curve + PNG export
- [x] SHAP waterfall explainability for a single prediction
- [x] Scoring/prediction endpoint: upload new data, get predictions, download predictions CSV
- [x] Export hub: cleaned CSV, preprocessed splits ZIP, inference recipe ZIP (`recipe.json` + `recipe.py`), model artifact download, executive HTML report (matplotlib charts embedded)
- [x] Session isolation (`?session_id=`) + timestamped cleanup of orphaned data
- [x] Settings API (`GET`/`PUT /api/v1/settings/`)
- [x] Backend hardened to `ruff check` clean (line-length 160, contextual lint rules)

### Verified (this session)
- [x] `ruff check backend/app backend/tests` — 0 errors
- [x] `pytest backend/tests/` — 54 passed
- [x] `npm run lint`, `npx tsc -b`, `npm test`, `npm run build` — all clean

### Dependencies
- matplotlib, xgboost, imbalanced-learn, pyarrow, openpyxl, cloudpickle (backend)
- Recharts (frontend)

### Estimated Complexity: 4 / 5

---

## Milestone Dependency Graph

```
M1: Core Pipeline (DONE)
  │
  ├── M2: Auth & Multi-User (deferred — focus on ML depth first)
  │
  ├── M3: Polish & DX (DONE)
  │
  └── M4: Advanced Features (DONE)
```
