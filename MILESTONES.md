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

**Goal:** Add user authentication. Deferred to end per user preference.

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

## Milestone 3: Polish & DX

**Goal:** Production-ready quality. Testing, error handling, performance, and developer experience.

### Features
- [ ] Comprehensive test suite (pytest + vitest)
- [ ] Structured error responses across all endpoints
- [ ] Loading/error/empty states for all frontend pages
- [ ] Pagination on dataset/model listing
- [ ] Form validation parity (Zod ↔ Pydantic)
- [ ] Responsive design QA
- [ ] README with architecture diagram + setup
- [ ] CI pipeline (lint, typecheck, test)

### Estimated Complexity: 3 / 5

---

## Milestone Dependency Graph

```
M1: Core Pipeline (DONE)
  │
  ├── M2: Auth & Multi-User (deferred)
  │
  └── M3: Polish & DX (next)
```
