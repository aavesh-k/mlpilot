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
