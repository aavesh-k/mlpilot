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

## Current Milestone

**Milestone 1: Core Pipeline** — Verified complete.

## Next Milestone

**Milestone 3: Polish & DX** — Tests, error handling, loading/error/empty states, pagination, README, CI pipeline.

Auth (Milestone 2) is deferred to after polish, per user preference.

Continue only from the current milestone.

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
