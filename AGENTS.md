# AGENTS.md

# MLPilot

## Project Overview

MLPilot is a resume-focused full-stack web application that automates the machine learning workflow for tabular datasets.

The goal is to help users upload a dataset and automatically perform:

- Data validation
- Exploratory Data Analysis (EDA)
- Data preprocessing
- Feature engineering
- Model training
- Model comparison
- Evaluation
- Predictions
- Report generation

Version: V1

---

# Documentation

Read these files before making any changes.

1. README.md
2. PRD.md
3. ARCHITECTURE.md
4. API.md
5. UX.md
6. CODING_STANDARDS.md
7. GIT_WORKFLOW.md
8. MILESTONES.md

If documentation conflicts, follow this priority:

PRD > Architecture > API > Coding Standards > README

---

# Tech Stack

Frontend
- React
- TypeScript
- Tailwind CSS
- Vite

Backend
- FastAPI
- Python

ML
- pandas
- scikit-learn
- numpy

---

# Development Rules

- Understand the code before changing it.
- Reuse existing components.
- Never duplicate logic.
- Keep code modular.
- Write clean, readable code.
- Do not introduce breaking changes.
- Follow Coding Standards exactly.

---

# UI Rules

- Follow UX.md.
- Maintain consistent spacing and typography.
- Keep components reusable.
- Mobile responsive.
- Accessibility matters.

---

# Backend Rules

- Keep APIs RESTful.
- Validate every input.
- Handle errors properly.
- Return consistent JSON responses.
- Keep business logic separate from routes.

---

# Current Development

Read MILESTONES.md.

## Completed Milestones

**Milestone 1: Core Pipeline** — Full end-to-end ML workflow (dataset upload → EDA → preprocessing → training → comparison). Simplified architecture: JSON file storage, no auth, no database. All endpoints verified working, frontend builds clean.

**Milestone 3: Polish & DX** — Tests, error handling, loading/error/empty states, pagination, README, CI pipeline.

**Milestone 4: Advanced Features** — Cleaning module, async EDA, AutoML (10 algorithms, CV, tuning), diagnostic plots, SHAP explainability, prediction/scoring, export hub, session isolation, settings API. Backend fully `ruff check` clean; 54 backend tests + 50 frontend tests all green.

Auth (Milestone 2) is deferred and should NOT be implemented yet — the current focus is ML workflow depth and polish.

## Next Milestone

None planned. Milestones 1, 3, and 4 are complete. Follow-up candidates if new work is requested:

- Milestone 2: Auth & Multi-User (still deferred)
- Asset bundling: Vite code-splitting (single 951 kB chunk warning)
- Remaining cosmetic lint warnings (3 oxlint warnings), FastAPI `on_event` → lifespan migration, SVC `probability` → `CalibratedClassifierCV` migration

Continue current work; keep the backend ruff-clean and all tests passing.

---

# Before Coding

Always:

- Understand the request.
- Inspect related files.
- Explain the implementation plan.
- Mention affected files.

Do not code until the plan is clear.

---

# After Coding

Verify:

- Project builds successfully.
- No lint errors.
- No type errors.
- Existing functionality still works.
- Update documentation if required.

---

# General Principles

Prefer simple solutions.

Avoid unnecessary dependencies.

Keep the project resume-quality.

Maintain production-level code quality.
