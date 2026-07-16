# MLPilot — Milestones

Each milestone is independently buildable and testable. They build on each other but each delivers a working, demonstrable increment.

---

## Milestone 1: Project Scaffold & Auth

**Goal:** Working application shell with user authentication. From this point, a developer can register, log in, and see the app layout.

### Features
- FastAPI project with Clean Architecture folder structure
- PostgreSQL database with Alembic migrations (users table)
- User registration + login endpoints (JWT)
- React project with Vite + TypeScript + Tailwind + shadcn
- Auth pages (Login, Register) with form validation
- Shared Layout (Sidebar + TopNav) with responsive behaviour
- Auth context + guarded routes
- Docker Compose (backend + frontend + postgres)

### Files Created

| File | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app factory |
| `backend/app/core/config.py` | pydantic-settings configuration |
| `backend/app/core/security.py` | JWT + password hashing |
| `backend/app/core/exceptions.py` | Domain exception hierarchy |
| `backend/app/domain/entities/user.py` | User entity |
| `backend/app/domain/value_objects/email.py` | Email VO |
| `backend/app/domain/interfaces/repositories/i_user_repo.py` | User repo interface |
| `backend/app/application/use_cases/auth/register_user.py` | Register use case |
| `backend/app/application/use_cases/auth/authenticate_user.py` | Login use case |
| `backend/app/application/use_cases/auth/get_current_user.py` | Profile use case |
| `backend/app/infrastructure/database/session.py` | Async session factory |
| `backend/app/infrastructure/database/models/user.py` | SQLAlchemy User model |
| `backend/app/infrastructure/repositories/postgres_user_repo.py` | User repo impl |
| `backend/app/api/v1/endpoints/auth.py` | Auth routes |
| `backend/app/api/v1/schemas/auth.py` | Auth Pydantic schemas |
| `backend/app/api/deps.py` | DI dependencies |
| `backend/alembic/versions/0001_create_users.py` | Migration |
| `frontend/src/core/config/index.ts` | App config |
| `frontend/src/core/api/client.ts` | Axios instance |
| `frontend/src/core/router/index.tsx` | Route definitions |
| `frontend/src/modules/auth/pages/LoginPage.tsx` | Login page |
| `frontend/src/modules/auth/pages/RegisterPage.tsx` | Register page |
| `frontend/src/modules/auth/contexts/AuthContext.tsx` | Auth state |
| `frontend/src/shared/components/Layout.tsx` | App shell |
| `frontend/src/shared/components/Sidebar.tsx` | Side navigation |
| `frontend/src/shared/components/TopNav.tsx` | Top navigation |
| `frontend/src/shared/components/ui/*.tsx` | shadcn primitives |
| `docker-compose.yml` | Service orchestration |

### Dependencies
- `backend/`: Python 3.12, FastAPI, uvicorn, SQLAlchemy 2.0, asyncpg, alembic, python-jose, passlib[bcrypt], pydantic-settings, python-multipart
- `frontend/`: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack React Query, Zustand, Axios, React Hook Form + Zod

### Testing

| Test Type | What |
|---|---|
| **Unit** | User entity invariants (email format, password hash), Register use case (duplicate email), Login use case (wrong password) |
| **Integration** | PostgresUserRepository CRUD, POST /auth/register returns 201, POST /auth/login returns JWT, GET /auth/me returns user |
| **Frontend** | LoginForm renders and validates, RegisterForm submits, AuthGuard redirects unauthenticated users |

### Definition of Done
- [ ] `docker compose up` starts all services
- [ ] `GET /api/v1/auth/me` returns 200 with user data when valid JWT is sent
- [ ] `POST /api/v1/auth/register` creates a user and returns 201
- [ ] `POST /api/v1/auth/login` returns JWT tokens
- [ ] Login page renders, validates, and authenticates
- [ ] Register page renders, validates, and creates account
- [ ] Authenticated user sees Layout with Sidebar + TopNav
- [ ] Unauthenticated user is redirected to /login
- [ ] `pytest` passes with > 90% coverage on auth module
- [ ] `vitest` passes on auth components

### Estimated Complexity: 3 / 5

---

## Milestone 2: Dataset Management

**Goal:** Users can upload, list, view, and delete datasets. Dataset files are stored locally; metadata is persisted in PostgreSQL.

### Features
- Dataset upload endpoint (multipart, validate format + size)
- Local filesystem storage for datasets
- Dataset list endpoint (paginated)
- Dataset detail endpoint (with row/column count)
- Dataset delete endpoint (removes file + DB record)
- CSV ingestion (pandas read_csv → row/column count)
- Dataset upload page (drop zone, progress, recent uploads)
- Dataset list page (table with status badges)
- Dataset detail page (stats cards + tabs placeholder)

### Files Created

| File | Purpose |
|---|---|
| `backend/app/domain/entities/dataset.py` | Dataset entity with status machine |
| `backend/app/domain/interfaces/repositories/i_dataset_repo.py` | Dataset repo interface |
| `backend/app/domain/interfaces/i_storage_service.py` | Storage abstraction |
| `backend/app/application/use_cases/dataset/upload_dataset.py` | Upload use case |
| `backend/app/application/use_cases/dataset/list_datasets.py` | List use case |
| `backend/app/application/use_cases/dataset/get_dataset.py` | Get detail use case |
| `backend/app/application/use_cases/dataset/delete_dataset.py` | Delete use case |
| `backend/app/infrastructure/database/models/dataset.py` | SQLAlchemy Dataset model |
| `backend/app/infrastructure/repositories/postgres_dataset_repo.py` | Dataset repo impl |
| `backend/app/infrastructure/storage/local_storage_service.py` | File storage impl |
| `backend/app/api/v1/endpoints/datasets.py` | Dataset routes |
| `backend/app/api/v1/schemas/dataset.py` | Dataset Pydantic schemas |
| `backend/alembic/versions/0002_create_datasets.py` | Migration |
| `frontend/src/modules/datasets/pages/DatasetUploadPage.tsx` | Upload page |
| `frontend/src/modules/datasets/pages/DatasetListPage.tsx` | List page |
| `frontend/src/modules/datasets/pages/DatasetDetailPage.tsx` | Detail page |
| `frontend/src/modules/datasets/components/UploadDropzone.tsx` | Drag-and-drop |
| `frontend/src/modules/datasets/components/DatasetTable.tsx` | Data table |
| `frontend/src/modules/datasets/components/StatsGrid.tsx` | Stats cards |
| `frontend/src/modules/datasets/hooks/useDatasets.ts` | React Query hooks |
| `frontend/src/core/api/datasets.api.ts` | API client functions |

### Dependencies
- Milestone 1 (auth + scaffold)
- Python: pandas, python-magic (MIME type detection)

### Testing

| Test Type | What |
|---|---|
| **Unit** | Dataset entity state machine (uploading→ready→deleted), FileSize validation, Storage service path generation |
| **Integration** | Upload endpoint returns 201, list returns paginated results, delete removes file, invalid format returns 422 |
| **Frontend** | Drop zone accepts/rejects files, progress bar renders, table paginates, empty state shows CTA |

### Definition of Done
- [ ] Upload CSV file via API → stored in `data/datasets/{uuid}/` + record in database
- [ ] List returns paginated datasets with status badges
- [ ] Detail returns stats (row count, column count, file size)
- [ ] Delete removes file from disk + record from database
- [ ] Invalid format returns 422 with clear message
- [ ] Excess size (>5GB) returns 422 with clear message
- [ ] Upload page: drag-and-drop works, progress shows, recent uploads table populated
- [ ] List page: pagination works, empty state shows on first visit
- [ ] Detail page: stats cards render correctly

### Estimated Complexity: 3 / 5

---

## Milestone 3: EDA Engine

**Goal:** Automated exploratory data analysis. Users see column statistics, correlation matrix, and auto-generated findings for any uploaded dataset.

### Features
- Column statistics computation (dtype, missing%, unique, mean, std, quartiles, skew, kurtosis)
- Pearson correlation matrix for numerical columns
- Auto-generated findings (high missing rate, high correlation, class imbalance)
- EDA results cached in `dataset_columns` table
- EDA API endpoint
- EDA page with correlation matrix visualisation
- Column statistics table
- Findings cards with severity badges

### Files Created

| File | Purpose |
|---|---|
| `backend/app/domain/entities/dataset_column.py` | Column entity |
| `backend/app/domain/interfaces/i_eda_engine.py` | EDA abstraction |
| `backend/app/application/use_cases/dataset/run_eda.py` | EDA use case |
| `backend/app/infrastructure/database/models/dataset_column.py` | SQLAlchemy Column model |
| `backend/app/infrastructure/ml/eda_engine.py` | EDA computation |
| `backend/app/api/v1/endpoints/eda.py` | EDA routes |
| `backend/app/api/v1/schemas/eda.py` | EDA Pydantic schemas |
| `backend/alembic/versions/0003_create_dataset_columns.py` | Migration |
| `frontend/src/modules/eda/pages/EDAPage.tsx` | EDA page |
| `frontend/src/modules/eda/components/CorrelationMatrix.tsx` | Matrix visualisation |
| `frontend/src/modules/eda/components/DistributionBar.tsx` | Distribution chart |
| `frontend/src/modules/eda/components/FindingsList.tsx` | Findings cards |
| `frontend/src/modules/eda/components/StatCard.tsx` | Per-column stats |
| `frontend/src/core/api/datasets.api.ts` | Add EDA API functions |

### Dependencies
- Milestone 2 (dataset management)
- Python: scipy (correlation p-values), numpy

### Testing

| Test Type | What |
|---|---|
| **Unit** | EDA engine computes correct stats for known dataset (Iris), findings detect high correlation, empty dataset returns empty findings |
| **Integration** | GET /datasets/{id}/eda returns 200 with full report, non-existent dataset returns 404 |
| **Frontend** | Correlation matrix renders cells, findings show severity colours, empty EDA state |

### Definition of Done
- [ ] GET /datasets/{id}/eda returns column stats + correlation + findings
- [ ] EDA results cached in `dataset_columns` table (repeated calls hit cache)
- [ ] Correlation matrix renders as a coloured grid
- [ ] Column statistics table shows all computed values
- [ ] Findings correctly identify: >5% missing, |r|>0.85 pairs, target imbalance
- [ ] Non-numeric datasets return empty correlation matrix with info message

### Estimated Complexity: 3 / 5

---

## Milestone 4: Preprocessing Pipeline

**Goal:** Users can create, configure, execute, and re-run preprocessing pipelines. Pipelines produce train/test splits ready for model training.

### Features
- Pipeline CRUD (create, list, get, update, delete)
- Pipeline step configuration (imputation, encoding, scaling, split)
- Pipeline execution (produces processed parquet files)
- Column mapping auto-population
- Pipeline status tracking (draft → running → completed → failed)
- Pipeline builder page with draggable steps
- Step config panel (strategy, column selection)
- Column mapping table
- Pipeline execution progress

### Files Created

| File | Purpose |
|---|---|
| `backend/app/domain/entities/pipeline.py` | Pipeline entity |
| `backend/app/domain/entities/pipeline_step.py` | Step entity |
| `backend/app/domain/interfaces/repositories/i_pipeline_repo.py` | Pipeline repo interface |
| `backend/app/application/use_cases/pipeline/create_pipeline.py` | Create use case |
| `backend/app/application/use_cases/pipeline/update_pipeline.py` | Update use case |
| `backend/app/application/use_cases/pipeline/execute_pipeline.py` | Execute use case |
| `backend/app/application/use_cases/pipeline/list_pipelines.py` | List use case |
| `backend/app/infrastructure/database/models/pipeline.py` | SQLAlchemy Pipeline model |
| `backend/app/infrastructure/database/models/pipeline_step.py` | SQLAlchemy Step model |
| `backend/app/infrastructure/repositories/postgres_pipeline_repo.py` | Pipeline repo impl |
| `backend/app/infrastructure/ml/pipeline_executor.py` | Pipeline ML execution |
| `backend/app/api/v1/endpoints/pipelines.py` | Pipeline routes |
| `backend/app/api/v1/schemas/pipeline.py` | Pipeline schemas |
| `backend/alembic/versions/0004_create_pipelines.py` | Migration |
| `frontend/src/modules/preprocessing/pages/PreprocessingPage.tsx` | Pipeline page |
| `frontend/src/modules/preprocessing/components/PipelineStepList.tsx` | Draggable steps |
| `frontend/src/modules/preprocessing/components/StepConfigPanel.tsx` | Step configuration |
| `frontend/src/modules/preprocessing/components/ColumnMappingTable.tsx` | Column mapping |
| `frontend/src/modules/preprocessing/components/AddStepDialog.tsx` | Add step dialog |
| `frontend/src/core/api/pipelines.api.ts` | API client |

### Dependencies
- Milestone 2 (datasets)
- Python: scikit-learn (Pipeline, SimpleImputer, OneHotEncoder, StandardScaler)

### Testing

| Test Type | What |
|---|---|
| **Unit** | Pipeline entity step ordering, step config validation imputation→encoding sequencing, empty pipeline cannot execute |
| **Integration** | POST /pipelines creates pipeline, POST /pipelines/{id}/execute returns processed dataset, invalid step config returns 422 |
| **Frontend** | Steps drag-reorder works, config panel updates, column mapping populates, execution shows progress |

### Definition of Done
- [ ] Create pipeline with steps via API → persisted + returns 201
- [ ] Execute pipeline → produces train/test parquet files + status = completed
- [ ] Invalid pipeline (encode before impute when missing data exists) → rejected with message
- [ ] Pipeline builder: add/remove/reorder steps works
- [ ] Column mapping auto-populates from dataset columns
- [ ] Execution progress updates step by step

### Estimated Complexity: 4 / 5

---

## Milestone 5: Model Training Engine

**Goal:** Users can train ML models asynchronously with progress tracking. Multiple algorithms supported via pluggable backends.

### Features
- Model entity with lifecycle (pending → training → completed → failed)
- Training job entity with async progress tracking
- Pluggable ML backends (Random Forest, XGBoost, SVM, Logistic Regression)
- Hyperparameter configuration per algorithm
- Async training via Celery (or in-process background task)
- Job status polling endpoint
- Job cancellation
- Training page with model selector
- Hyperparameter form
- Training card with progress bar
- Real-time status updates

### Files Created

| File | Purpose |
|---|---|
| `backend/app/domain/entities/model.py` | Model entity |
| `backend/app/domain/entities/training_job.py` | Training job entity |
| `backend/app/domain/interfaces/repositories/i_model_repo.py` | Model repo interface |
| `backend/app/domain/interfaces/i_ml_backend.py` | ML backend interface |
| `backend/app/domain/interfaces/i_task_queue.py` | Task queue interface |
| `backend/app/domain/value_objects/hyperparameters.py` | Hyperparams VO |
| `backend/app/domain/value_objects/model_metrics.py` | Metrics VO |
| `backend/app/application/use_cases/training/train_model.py` | Train use case |
| `backend/app/application/use_cases/training/get_job_status.py` | Status use case |
| `backend/app/application/use_cases/training/cancel_job.py` | Cancel use case |
| `backend/app/application/use_cases/model/list_models.py` | List models use case |
| `backend/app/application/use_cases/model/get_model.py` | Get model use case |
| `backend/app/infrastructure/database/models/model.py` | SQLAlchemy Model ORM |
| `backend/app/infrastructure/database/models/training_job.py` | SQLAlchemy Job ORM |
| `backend/app/infrastructure/repositories/postgres_model_repo.py` | Model repo impl |
| `backend/app/infrastructure/ml/backends/sklearn_backend.py` | Sklearn implementations |
| `backend/app/infrastructure/ml/backends/xgboost_backend.py` | XGBoost implementation |
| `backend/app/infrastructure/tasks/celery_app.py` | Celery config |
| `backend/app/infrastructure/tasks/training_worker.py` | Training task definitions |
| `backend/app/api/v1/endpoints/models.py` | Model routes |
| `backend/app/api/v1/endpoints/training.py` | Training routes |
| `backend/app/api/v1/schemas/model.py` | Model schemas |
| `backend/app/api/v1/schemas/training.py` | Training schemas |
| `backend/alembic/versions/0005_create_models_jobs.py` | Migration |
| `frontend/src/modules/training/pages/TrainingPage.tsx` | Training page |
| `frontend/src/modules/training/components/ModelSelector.tsx` | Algorithm picker |
| `frontend/src/modules/training/components/HyperparamForm.tsx` | Hyperparams form |
| `frontend/src/modules/training/components/TrainingCard.tsx` | Training job card |
| `frontend/src/modules/training/components/JobProgressBar.tsx` | Progress bar |
| `frontend/src/modules/training/hooks/useTrainingJob.ts` | Polling hook |
| `frontend/src/core/api/models.api.ts` | Model API client |
| `frontend/src/core/api/training.api.ts` | Training API client |

### Dependencies
- Milestone 4 (preprocessing pipeline for train/test split)
- Python: scikit-learn, xgboost, cloudpickle, celery[redis], redis

### Testing

| Test Type | What |
|---|---|
| **Unit** | Model entity state machine, TrainingJob progress validation, SklearnBackend returns expected metric shapes, Hyperparameters validates ranges |
| **Integration** | POST /models dispatches training + returns 201, GET /training/jobs/{id} returns status+progress, POST /training/jobs/{id}/cancel changes status to cancelled |
| **Frontend** | Model selector lists algorithms, hyperparameter form validates, progress bar updates in real-time, cancel button works |

### Definition of Done
- [ ] Train Random Forest model → job progresses through queued→running→completed
- [ ] Metrics populated in `models.metrics` JSONB after completion
- [ ] Progress bar updates via polling every 2 seconds
- [ ] Cancel job → status changes to `cancelled`
- [ ] Train XGBoost, SVM, Logistic Regression — all return metrics
- [ ] Invalid hyperparameters rejected with validation error
- [ ] Multiple concurrent jobs handled correctly

### Estimated Complexity: 5 / 5

---

## Milestone 6: Results & Comparison

**Goal:** Users can compare trained models side-by-side on a leaderboard, view run history, and download model artifacts.

### Features
- Model comparison endpoint (multiple model IDs → unified metrics)
- Best model detection (highest accuracy within experiment scope)
- Model artifact download (pickle file)
- Training run history with pagination
- Results overview with summary stats
- Leaderboard table with sortable columns
- Best model banner with deploy CTA
- Run history table with status badges
- Empty states for no results

### Files Created

| File | Purpose |
|---|---|
| `backend/app/application/use_cases/model/compare_models.py` | Compare use case |
| `backend/app/application/use_cases/model/download_model.py` | Download use case |
| `backend/app/application/use_cases/model/delete_model.py` | Delete use case |
| `frontend/src/modules/results/pages/ResultsPage.tsx` | Results page |
| `frontend/src/modules/results/pages/ModelComparisonPage.tsx` | Comparison page |
| `frontend/src/modules/results/components/LeaderboardTable.tsx` | Leaderboard |
| `frontend/src/modules/results/components/MetricsRow.tsx` | Per-model metrics |
| `frontend/src/modules/results/components/BestModelBanner.tsx` | Best model highlight |
| `frontend/src/modules/results/components/RunHistoryTable.tsx` | History table |
| `frontend/src/core/api/results.api.ts` | Results API client |

### Dependencies
- Milestone 5 (model training) — must have completed models

### Testing

| Test Type | What |
|---|---|
| **Unit** | Compare use case returns sorted results, best model detection picks max accuracy, empty list returns empty response |
| **Integration** | GET /models/compare?ids=a,b returns unified metrics, GET /models/{id}/download returns file |
| **Frontend** | Leaderboard sorts by column, best model banner appears, download triggers file save, run history paginates |

### Definition of Done
- [ ] Compare endpoint returns sorted metrics for 2+ models
- [ ] Best model highlighted with trophy icon
- [ ] Download returns pickled `.pkl` file
- [ ] Run history lists all jobs with pagination
- [ ] Summary stats (completed, running, failed counts)
- [ ] Empty state when no models exist

### Estimated Complexity: 2 / 5

---

## Milestone 7: Experiments

**Goal:** Users can group related training runs into experiments for organised comparison.

### Features
- Experiment CRUD (create, list, get, delete)
- Link models to experiments (many-to-many)
- Experiment detail shows all linked models + comparison
- Experiment list page
- Create experiment dialog
- Model linking on training page

### Files Created

| File | Purpose |
|---|---|
| `backend/app/domain/entities/experiment.py` | Experiment entity |
| `backend/app/domain/interfaces/repositories/i_experiment_repo.py` | Experiment repo interface |
| `backend/app/application/use_cases/experiment/create_experiment.py` | Create use case |
| `backend/app/application/use_cases/experiment/get_experiment.py` | Get use case |
| `backend/app/infrastructure/database/models/experiment.py` | SQLAlchemy Experiment ORM |
| `backend/app/infrastructure/database/models/experiment_model.py` | Join table ORM |
| `backend/app/infrastructure/repositories/postgres_experiment_repo.py` | Experiment repo impl |
| `backend/app/api/v1/endpoints/experiments.py` | Experiment routes |
| `backend/app/api/v1/schemas/experiment.py` | Experiment schemas |
| `backend/alembic/versions/0006_create_experiments.py` | Migration |
| `frontend/src/modules/experiments/pages/ExperimentListPage.tsx` | Experiment list |
| `frontend/src/modules/experiments/pages/ExperimentDetailPage.tsx` | Experiment detail |
| `frontend/src/modules/experiments/components/ExperimentCard.tsx` | Experiment card |
| `frontend/src/modules/experiments/components/ModelLinkList.tsx` | Linked models |
| `frontend/src/core/api/experiments.api.ts` | API client |

### Dependencies
- Milestone 6 (model comparison) — experiments are a grouping layer over models

### Testing

| Test Type | What |
|---|---|
| **Unit** | Experiment entity invariants, link model adds to experiment, duplicate link prevented |
| **Integration** | POST /experiments returns 201, GET /experiments/{id} includes linked models + comparison |
| **Frontend** | Experiment list renders cards, create dialog works, detail shows model comparison |

### Definition of Done
- [ ] Create experiment with name + description
- [ ] Link models to experiment
- [ ] Experiment detail shows model comparison leaderboard
- [ ] List experiments with pagination

### Estimated Complexity: 2 / 5

---

## Milestone 8: Settings & Dashboard

**Goal:** Users can configure preferences and see a summary dashboard with recent activity and system health.

### Features
- User settings CRUD (API config, resource limits, notifications)
- Settings page with grouped sections
- Dashboard with project cards
- Recent activity log
- Cluster health widget
- Settings API endpoints
- Dashboard API endpoint (aggregated stats)

### Files Created

| File | Purpose |
|---|---|
| `backend/app/domain/entities/user_settings.py` | Settings entity |
| `backend/app/domain/interfaces/repositories/i_settings_repo.py` | Settings repo interface |
| `backend/app/application/use_cases/settings/get_settings.py` | Get settings |
| `backend/app/application/use_cases/settings/update_settings.py` | Update settings |
| `backend/app/infrastructure/database/models/user_settings.py` | Settings ORM model |
| `backend/app/infrastructure/repositories/postgres_settings_repo.py` | Repo impl |
| `backend/app/api/v1/endpoints/settings.py` | Settings routes |
| `backend/app/api/v1/schemas/settings.py` | Settings schemas |
| `backend/alembic/versions/0007_create_settings.py` | Migration |
| `frontend/src/modules/dashboard/pages/DashboardPage.tsx` | Dashboard page |
| `frontend/src/modules/dashboard/components/ProjectCard.tsx` | Project card |
| `frontend/src/modules/dashboard/components/RecentActivity.tsx` | Activity log |
| `frontend/src/modules/dashboard/components/ClusterHealth.tsx` | Health widget |
| `frontend/src/modules/settings/pages/SettingsPage.tsx` | Settings page |
| `frontend/src/modules/settings/components/SettingsSection.tsx` | Settings section |

### Dependencies
- Milestone 6 (results) — dashboard pulls data from datasets + models + jobs
- All prior milestones

### Testing

| Test Type | What |
|---|---|
| **Unit** | Settings entity defaults, validation of ranges (max_memory > 0) |
| **Integration** | GET /settings returns defaults, PUT /settings updates, dashboard endpoint returns aggregate stats |
| **Frontend** | Dashboard cards show correct counts, activity log populates, settings edit/save cycle works |

### Definition of Done
- [ ] Dashboard shows summary: project count, recent jobs, activity log
- [ ] Settings page with edit-in-place for each section
- [ ] Settings persisted per user
- [ ] Dashboard empty state on first visit
- [ ] Settings validation prevents invalid values

### Estimated Complexity: 2 / 5

---

## Milestone 9: Polish & DX

**Goal:** Production-ready quality. Testing, documentation, error handling, performance, and developer experience.

### Features
- Comprehensive test suite (unit + integration)
- README with architecture diagram + setup instructions
- API documentation (auto-generated OpenAPI/Swagger)
- Error handling hardening (all endpoints return structured errors)
- Performance: EDA caching, query optimisation, pagination everywhere
- Form validation parity (frontend Zod schemas mirror backend Pydantic)
- Loading/error/empty states for every page section
- Responsive design QA (mobile, tablet, desktop)
- Accessibility audit (keyboard nav, screen reader, contrast)
- Dark mode toggle + persistence
- Developer AGENTS.md for AI-assisted development
- GitHub CI pipeline (lint, typecheck, test)

### Files Created

| File | Purpose |
|---|---|
| `README.md` | Project documentation |
| `AGENTS.md` | AI-assisted development guide |
| `.github/workflows/ci.yml` | CI pipeline |
| `.github/ISSUE_TEMPLATE/` | Issue templates |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template |
| `backend/tests/*` | Test suite expansion |
| `frontend/src/shared/components/ErrorBoundary.tsx` | Error boundaries |
| `frontend/src/shared/components/EmptyState.tsx` | Empty state component |
| `frontend/src/shared/components/ErrorState.tsx` | Error state component |
| `frontend/src/shared/components/LoadingSpinner.tsx` | Loading skeletons |

### Dependencies
- All prior milestones (polish is applied to existing features)

### Testing

| Test Type | What |
|---|---|
| **Unit** | Every domain entity + value object tested, every use case tested with mocks |
| **Integration** | Every endpoint tested (200, 201, 400, 401, 403, 404, 422, 500) |
| **Frontend** | Every component tested (render, loading, empty, error, data states) |
| **E2E** | Critical path: register → upload → EDA → preprocess → train → compare |

### Definition of Done
- [ ] `pytest` passes with > 85% coverage
- [ ] `vitest` passes with > 70% coverage
- [ ] `tsc --noEmit` = 0 errors
- [ ] `ruff check` — 0 errors
- [ ] All endpoints return structured error responses
- [ ] All pages have loading/error/empty states
- [ ] Lighthouse > 90 (Performance, Accessibility, Best Practices)
- [ ] README complete with architecture diagram
- [ ] CI pipeline green

### Estimated Complexity: 3 / 5

---

## Milestone Dependency Graph

```
M1: Scaffold & Auth
  │
  ▼
M2: Dataset Management
  │
  ├────────────────────┐
  ▼                    ▼
M3: EDA Engine     M4: Preprocessing
                       │
                       ▼
                    M5: Training Engine
                       │
                       ▼
                    M6: Results & Comparison
                       │
                  ┌────┴────┐
                  ▼         ▼
              M7: Exp.    M8: Settings
                  │         │
                  └────┬────┘
                       ▼
                   M9: Polish & DX
```

M1–M2 are prerequisites for everything. M3 and M4 are parallel. M5 depends on M4. M6 depends on M5. M7 and M8 are parallel. M9 is the final pass across all.
