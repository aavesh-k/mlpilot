# MLPilot — Product Requirements Document

**Version:** 1.0
**Status:** Draft
**Author:** Senior Software Architect
**Date:** 2026-07-16

---

## 1. Vision

MLPilot is an AI-assisted Machine Learning Workflow Automation Platform that enables data scientists, ML engineers, and students to go from raw dataset to trained, evaluated model in minutes — without writing boilerplate code. It democratises the ML pipeline by providing a visual, guided interface for dataset analysis, preprocessing, model training, and comparison, while remaining 100% local-first and open-source.

The platform embodies a Bauhaus/Neo-Brutalist design philosophy: form follows function. Every UI element serves the workflow; nothing is decorative. The result is a portfolio-quality project that demonstrates clean architecture, modern full-stack engineering, and practical ML engineering — all in one cohesive system.

---

## 2. Goals

### Primary Goals

| ID | Goal |
|---|---|
| G-01 | Enable a complete ML workflow — upload → EDA → preprocess → train → evaluate — within a single application |
| G-02 | Provide automated EDA with actionable insights (correlations, missing values, distributions) |
| G-03 | Support multiple ML algorithms with configurable hyperparameters and cross-validation |
| G-04 | Deliver an async training pipeline with real-time progress tracking |
| G-05 | Present a leaderboard-style model comparison interface for data-driven decision making |
| G-06 | Demonstrate Clean Architecture, SOLID principles, and Repository Pattern in production-quality code |

### Secondary Goals

| ID | Goal |
|---|---|
| G-07 | Support local-first storage so users own their data and models |
| G-08 | Enable extension with new models, preprocessing steps, and storage backends without architecture changes |
| G-09 | Serve as a strong portfolio artifact demonstrating full-stack ML engineering competence |
| G-10 | Maintain a consistent Bauhaus aesthetic across all screens |

---

## 3. Target Users

### Primary Persona: The ML Learner / Student

- **Background:** University student or self-taught data science enthusiast
- **Pain points:** Setting up ML pipelines is boilerplate-heavy; Jupyter notebooks become messy; comparing models requires manual bookkeeping
- **Needs:** A guided, visual workflow that lets them focus on understanding model behaviour rather than wiring infrastructure
- **Technical level:** Comfortable installing Python packages; familiar with basic ML concepts

### Secondary Persona: The Data Science Professional

- **Background:** Working data scientist exploring a new dataset
- **Pain points:** Needs quick baseline results without writing a full training script; wants to compare multiple algorithms rapidly
- **Needs:** Fast ingestion, automated EDA, parallel model training, clear metrics comparison
- **Technical level:** Proficient in Python and ML; expects extensibility

### Tertiary Persona: The Hiring Manager / Technical Reviewer

- **Background:** Evaluating the project as a portfolio submission
- **Pain points:** Wants to see clean architecture, testing, documentation, and modern engineering practices
- **Needs:** Evidence of SOLID principles, typed code, modular design, test coverage, and a professional README
- **Technical level:** Senior engineer assessing code quality

---

## 4. User Stories

### Authentication & Onboarding

| ID | Story | Priority |
|---|---|---|
| US-01 | As a new user, I want to register with my email and password so that I can create my account | P0 |
| US-02 | As a returning user, I want to log in using my credentials so that I can access my projects | P0 |
| US-03 | As a user, I want to see my profile information so that I can confirm I'm logged in correctly | P1 |

### Dataset Management

| ID | Story | Priority |
|---|---|---|
| US-04 | As a user, I want to upload a CSV, Parquet, JSON, or Excel file so that I can start working with my data | P0 |
| US-05 | As a user, I want to see all my uploaded datasets in a list so that I can manage them | P0 |
| US-06 | As a user, I want to view dataset details (row count, column count, file size) so that I can understand my data at a glance | P0 |
| US-07 | As a user, I want to see per-column statistics (dtype, missing %, unique count, mean, std) so that I can assess data quality | P1 |
| US-08 | As a user, I want to delete a dataset so that I can remove unwanted data and free storage | P1 |

### Exploratory Data Analysis

| ID | Story | Priority |
|---|---|---|
| US-09 | As a user, I want to view a correlation matrix so that I can identify relationships between features | P1 |
| US-10 | As a user, I want to see distribution summaries (skew, range) for numerical columns so that I can detect anomalies | P1 |
| US-11 | As a user, I want auto-generated findings (missing values, high correlations, class imbalance) so that I can immediately act on data quality issues | P1 |
| US-12 | As a user, I want EDA results to be cached so that I don't wait for recomputation on repeat visits | P2 |

### Preprocessing

| ID | Story | Priority |
|---|---|---|
| US-13 | As a user, I want to configure a preprocessing pipeline with steps (imputation, encoding, scaling, split) so that I can prepare my data for training | P0 |
| US-14 | As a user, I want to see the pipeline execution status for each step so that I can monitor progress | P1 |
| US-15 | As a user, I want to view column mapping (which columns get scaled, encoded, or pass through) so that I can verify correctness | P2 |

### Model Training

| ID | Story | Priority |
|---|---|---|
| US-16 | As a user, I want to select one or more algorithms to train so that I can compare approaches | P0 |
| US-17 | As a user, I want to configure hyperparameters for each selected algorithm so that I can tune performance | P1 |
| US-18 | As a user, I want training to run asynchronously so that I can navigate away while it completes | P0 |
| US-19 | As a user, I want to see training progress (%, status, ETA) so that I know the job is working | P1 |
| US-20 | As a user, I want to cancel a running training job so that I can stop misconfigured runs | P2 |

### Model Comparison & Results

| ID | Story | Priority |
|---|---|---|
| US-21 | As a user, I want to see all trained models in a comparison table so that I can evaluate performance side-by-side | P0 |
| US-22 | As a user, I want to view metrics (accuracy, F1, precision, recall) for each model so that I can make informed decisions | P0 |
| US-23 | As a user, I want a "best model" highlighted so that I know which one to deploy | P1 |
| US-24 | As a user, I want to download a trained model artifact so that I can use it outside MLPilot | P2 |
| US-25 | As a user, I want to see a history of all training runs so that I can track experiments over time | P1 |

### Settings

| ID | Story | Priority |
|---|---|---|
| US-26 | As a user, I want to view and edit my API configuration so that I can connect to external services | P2 |
| US-27 | As a user, I want to set resource limits (max memory, max runtime) so that training doesn't consume my machine | P2 |

---

## 5. Acceptance Criteria

### AC-01: Dataset Upload
- User uploads a CSV file ≤ 5 GB via drag-and-drop or file picker
- System validates file format and size synchronously
- System stores the file in `data/datasets/{uuid}/` on local filesystem
- System inserts a record in the `datasets` table with status `ready`
- If file format is invalid, system rejects with a clear error message
- If file exceeds size limit, system rejects with a clear error message

### AC-02: Automated EDA
- User navigates to dataset detail page and sees EDA tab
- System computes column statistics (dtype, count, missing %, unique count, mean, std, min, max, Q1, Q2, Q3) for all columns
- System computes Pearson correlation matrix for numerical columns
- System identifies and displays: columns with >5% missing rate, pairs with |correlation| > 0.85, target class distribution
- All results are computed server-side and cached in `dataset_columns` table
- Computation runs synchronously for datasets < 100 MB; larger datasets show a progress indicator

### AC-03: Preprocessing Pipeline
- User can add pipeline steps from a predefined list: imputation (mean/median/mode), encoding (one-hot/label), scaling (standard/minmax), train-test split (ratio configurable)
- User can reorder steps via drag-and-drop
- System validates pipeline configuration (e.g., cannot encode before imputation when missing values exist)
- On execution, system creates a processed dataset snapshot and stores it
- Pipeline configuration is persisted in `preprocessing_pipelines.steps_json`

### AC-04: Async Model Training
- User selects algorithm and clicks "Train"
- System immediately returns a `TrainingJob` with status `queued`
- System enqueues the job via Celery (or background task)
- Frontend polls `GET /api/v1/training/jobs/{id}` every 2 seconds
- When status is `running`, frontend displays a progress bar
- When status is `completed`, system updates the model record with computed metrics
- If the job fails, system records `error_message` and frontend displays it

### AC-05: Model Comparison
- User selects two or more completed models
- System returns metrics in a uniform structure: accuracy, F1, precision, recall, ROC-AUC, training duration
- Frontend renders a comparison table sorted by accuracy (descending)
- Best model is visually highlighted with a trophy icon and coloured border
- User can click "Download" to download the pickled model file

---

## 6. Feature List

### Phase 1 — Foundation (MVP)

| # | Feature | Description | Stories |
|---|---|---|---|
| F-01 | User registration & login | Email/password auth with JWT | US-01, US-02, US-03 |
| F-02 | Dataset upload & list | File upload + paginated list | US-04, US-05 |
| F-03 | Dataset detail with basic stats | Row count, columns, file size | US-06 |
| F-04 | Preprocessing pipeline creation & execution | Configurable step pipeline | US-13, US-14 |
| F-05 | Model training with one algorithm | Random Forest training | US-16, US-18 |
| F-06 | Async job tracking | Status polling with progress | US-19 |
| F-07 | Model comparison leaderboard | Metrics comparison table | US-21, US-22 |
| F-08 | Training run history | Log of past runs | US-25 |

### Phase 2 — ML Depth

| # | Feature | Description | Stories |
|---|---|---|---|
| F-09 | Column-level statistics | Per-column dtype, missing %, stats | US-07 |
| F-10 | Automated EDA | Correlation matrix, distributions, findings | US-09, US-10, US-11 |
| F-11 | Multi-algorithm training | XGBoost, SVM, Logistic Regression | US-16 |
| F-12 | Hyperparameter configuration | Per-algorithm parameter inputs | US-17 |
| F-13 | Dataset deletion | Remove dataset + file | US-08 |
| F-14 | Best model highlighting | Trophy + visual emphasis | US-23 |
| F-15 | Pipeline step configuration details | Column mapping display | US-15 |

### Phase 3 — Polish & Power

| # | Feature | Description | Stories |
|---|---|---|---|
| F-16 | EDA result caching | Skip recomputation on revisit | US-12 |
| F-17 | Training job cancellation | Stop running jobs | US-20 |
| F-18 | Model artifact download | Download pickled model | US-24 |
| F-19 | Settings page | API config, resource limits | US-26, US-27 |
| F-20 | Multi-file format support | Parquet, JSON, Excel | US-04 |

---

## 7. Milestones

| Milestone | Timeline | Deliverables |
|---|---|---|
| **M1: Foundation** | Week 1–2 | FastAPI project scaffold, domain entities, SQLAlchemy models + Alembic migrations, Auth use case + JWT, React project scaffold with routing, Auth pages (login/register), shared Layout + Sidebar + TopNav components, Docker Compose (Postgres + backend) |
| **M2: Core Workflow** | Week 3–4 | Dataset upload + storage use case, Dataset list/detail API endpoints, Dataset upload + overview pages in React, Preprocessing pipeline entity + use case, Preprocessing API + frontend page, EDA use case (statistics, correlation, findings), EDA frontend page |
| **M3: ML Engine** | Week 5–6 | Model entity + repository, SklearnBackend + XGBoostBackend implementing IMLBackend, Training use case (dispatch, poll, cancel), Celery/background task integration, Training frontend page with progress, Results + comparison API endpoints, Results + leaderboard frontend pages |
| **M4: Polish** | Week 7–8 | Settings page, Model artifact download, Error handling + validation hardening, Test coverage (unit + integration), README with architecture diagram + setup instructions, Performance testing with 100K / 1M row datasets |
| **M5: Portfolio Release** | Week 9 | Final review, bug fixes, demo video recording, deployment guide, AGENTS.md for AI-assisted development, Project retrospective write-up |

---

## 8. Out of Scope

| Item | Rationale |
|---|---|
| Real-time collaborative editing | Adds auth complexity (WebSockets, CRDTs) beyond portfolio scope |
| Cloud deployment (AWS/GCP) | Contradicts local-first mandate; deployment guide covers Docker only |
| Deep learning (TensorFlow, PyTorch) | Requires GPU infra; scope stays with sklearn-compatible models |
| Automated hyperparameter tuning (Optuna) | Complex state machine; deferred via `IMLBackend` extension point |
| Model serving / REST inference endpoint | Deployed model management is a separate product concern |
| Dataset versioning / diffing | Nice-to-have; `DatasetVersion` entity sketched for future use |
| Webhook notifications | Adds event bus complexity; simulated via frontend polling |
| Role-based access control (RBAC) | Single-user by design; multi-user deferred to extension |
| Native mobile app | Desktop-first; mobile responsive is the limit |
| Data visualisation library (D3.js) | Correlation matrix and distributions use CSS-only or lightweight charting (Recharts) |

---

## 9. Technical Constraints

| Category | Constraint |
|---|---|
| **Backend language** | Python 3.12+ — strict type hints everywhere, no `Any` |
| **Backend framework** | FastAPI — async endpoints, Pydantic v2 validation |
| **Frontend framework** | React 19 + TypeScript — strict mode |
| **Build tool** | Vite 8 |
| **CSS** | Tailwind CSS v3 — no CSS-in-JS; Bauhaus design tokens in `tailwind.config.js` |
| **State management** | Zustand (client state) + TanStack React Query (server state) |
| **Database** | PostgreSQL 16 — Alembic for migrations |
| **ORM** | SQLAlchemy 2.0+ — async session; repositories never expose ORM models to domain |
| **ML stack** | scikit-learn 1.5+, XGBoost 2.x, pandas 2.x, numpy |
| **Task queue** | Celery with Redis broker (or `asyncio.create_task` for simpler local dev) |
| **Storage** | Local filesystem at `data/datasets/` and `data/models/` — swap via `IStorageService` interface |
| **Auth** | JWT (access + refresh tokens) — `python-jose` + `passlib[bcrypt]` |
| **Containerisation** | Docker Compose: `backend`, `frontend`, `postgres`, `redis`, `celery-worker` |
| **Testing** | pytest (backend), Vitest + React Testing Library (frontend) |
| **Linting** | Ruff (backend), ESLint + Prettier (frontend) |
| **Max dataset size** | 5 GB — validated at upload; memory-mapped reading for large files |
| **Max concurrent jobs** | 3 — enforced by Celery concurrency setting; configurable in settings |
| **Supported file formats** | CSV, Parquet, JSON, Excel (.xlsx) |
| **Browser support** | Chrome, Firefox, Edge — latest two major versions |

---

## 10. Success Metrics

### Quantitative Metrics

| Metric | Target | Measurement |
|---|---|---|
| **Time-to-first-model** | < 5 minutes from upload to trained model | Tracked in demo (not production) |
| **Dataset upload success rate** | > 99% of valid files | Backend `datasets` status logs |
| **EDA computation time** | < 3 seconds for 100K rows × 20 columns | `time` decorator on EDA use case |
| **Training job completion rate** | > 95% of initiated jobs reach `completed` | `training_jobs` status distribution |
| **Frontend Lighthouse score** | > 90 on Performance, Accessibility, Best Practices | `lighthouse-ci` run |
| **Backend test coverage** | > 85% line coverage | `pytest --cov` |
| **Frontend test coverage** | > 70% line coverage | `vitest --coverage` |
| **TypeScript strict errors** | 0 | `tsc --noEmit` |
| **Python type errors** | 0 | `pyright` |
| **Build time** | < 5 seconds (frontend), < 2 seconds (backend mypy/pyright) | CI pipeline |

### Qualitative Metrics

| Metric | Target | Measurement |
|---|---|---|
| **Architecture cleanliness** | No circular dependencies; domain layer has zero infrastructure imports | Manual review + `pytest-arch` |
| **SOLID adherence** | Each interface has ≤ 5 methods; each class has single responsibility | Manual code review |
| **Repository swap test** | Can swap PostgresRepo → InMemoryRepo in under 30 minutes | Verified by README instructions |
| **Portfolio value** | Project demonstrates full-stack ML engineering, Clean Architecture, testing, and modern tooling | Reviewer assessment |
| **Onboarding experience** | A developer can go from `git clone` to running model in under 10 minutes | Measured in README + Docker Compose |
