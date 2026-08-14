# Changelog

## [v0.1.0] — 2026-07-16 — Project Scaffold

### Added
- FastAPI project with modular folder structure
- React project with TypeScript, Vite, and Tailwind CSS
- Auth pages (Login, Register) with form validation
- Core UI components (Button, Card, Input, Badge, Layout)
- Tailwind CSS with neo-brutalist design tokens and dark mode

## [v0.2.0] — 2026-07-17 — Core ML Pipeline (Milestone 1)

### Added
- Dataset upload (CSV, JSON, Parquet) with format validation and column profiling
- EDA endpoint: column stats, correlation matrix, auto-generated findings
- Preprocessing pipeline: imputation, encoding, scaling, train/test split
- Model training: Random Forest, SVM, Logistic Regression with hyperparameters
- Model comparison: sorted by accuracy with best-model marking
- Training job tracking: status, progress, cancel support
- JSON file storage (`data/db.json`) — no database dependency
- Paginated list endpoints for datasets, pipelines, models, jobs

### Changed
- Replaced PostgreSQL + Alembic with simplified JSON storage
- Removed JWT auth and Docker Compose (deferred to future milestone)
- Simplified project to single `docker-compose.yml` (backend + frontend only)

## [v0.3.0] — 2026-07-17 — Polish & DX (Milestone 3)

### Added
- **Frontend tests**: 12 test files / 50 tests (components, error boundaries, forms)
- **Backend tests**: 8 test files / 44 tests (all API endpoints, validation, edge cases)
- Responsive navigation: BottomNav for mobile, slide-in Sidebar, hamburger toggle
- React Error Boundaries: GlobalErrorBoundary (app-level) + ModuleErrorBoundary (per-route)
- Zod schemas for form validation (auth, pipeline, training) with Zod ↔ Pydantic parity
- Consistent error envelope (`{"error": {"code", "message", "field?"}}`) across all endpoints
- Loading/Error/Empty state components (LoadingSpinner with skeletons, ErrorState, Pagination)

### Changed
- Responsive layout fixes: grids, button rows, padding across all pages
- Mobile-first sidebar: overlay with backdrop + body scroll lock
- Typography and spacing QA across Home, Dashboard, Settings, DatasetUpload pages

## [v0.4.0] — 2026-07-18 — Advanced ML Features (Milestone 4)

### Added
- **Data cleaning module**: 6-step pipeline (missing values, outliers, dtype issues, constant columns, currency/date normalization) with auto-suggestions, run history/reports, cleaned CSV download
- **Async EDA**: background thread + progress polling, correlation heatmap, enriched auto-findings (missingness, outliers, duplicates, high cardinality)
- **Multi-algorithm training**: 10 algorithms (5 classification + 5 regression), K-fold cross-validation, RandomizedSearchCV tuning, multi-model background jobs with per-model progress
- **Model comparison**: unified leaderboard across algorithms sorted by metric, best-model detection + `set-best`
- **Interactive diagnostic plots** (Recharts): confusion matrix, ROC/PR curves, feature importance, residuals, learning curve, PNG export
- **SHAP waterfall explainability** for single-prediction explanations
- **Predictions**: score new data (`POST /pipelines/{id}/score`, `POST /models/{id}/predict`) + predictions CSV download
- **Export hub**: cleaned CSV, preprocessed splits ZIP, inference recipe ZIP (`recipe.json` + `recipe.py`), model artifact download, executive HTML report with embedded matplotlib charts
- **Session isolation** (`?session_id=`) + auto-cleanup of orphaned data
- **Settings API** (`GET`/`PUT /api/v1/settings/`)
- Backend extended to 54 tests (13 files)

## [v0.4.1] — 2026-08-04 — Bug Fixes & Lint Hardening

### Fixed
- **Job cancel now stops the worker**: training jobs register a `threading.Event`; the background worker checks it between algorithms, tuning steps, and before finalizing, marking unfinished models as cancelled (`_request_cancel` + cooperative checks in `_run_multi_training_background`)
- **EDA polling stops on completion**: `useEDA` clears the interval when status is `completed`/`failed` and starts polling immediately (no first-poll race)
- **Duplicated compare route resolved**: removed the shadowing handler; `/training/models/compare` (and alias `/training/compare`) now returns `{"models": [...]}` sorted with `is_best` and is registered before `/{model_id}` to avoid path shadowing — fixes a real bug where Results.tsx received the wrong shape
- **Removed dead `useColumns` hook** that called `getEDAStatus()` instead of `GET /datasets/{id}/columns`
- **Deleted empty `frontend/src/` scaffold** folder
- **Pruned stale dependencies**: removed sqlalchemy, asyncpg, alembic, python-jose, passlib, structlog from `pyproject.toml`; added the real ones (cloudpickle, openpyxl, xgboost, imbalanced-learn, pyarrow, matplotlib); `requirements-dev.txt` now pins ruff

### Changed
- Backend fully ruff-clean: `line-length = 160`, ignored `N803/N806` (sklearn `X_train` idiom) and `B008` (FastAPI `Depends`/`Query` defaults); fixed real bugs surfaced by the sweep — missing `read_dataframe`/`detect_problem_type` imports, `SIM115` unclosed handles, dead variables, `B904` exception chains, `ARG001`/`ARG002`/`E741`/`E501`/`SIM10x` cleanups
