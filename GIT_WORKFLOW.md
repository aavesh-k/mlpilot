# MLPilot — Git Workflow

---

## 1. Branch Strategy

### 1.1 Branch Hierarchy

```
main
  ├── develop
  │     ├── feat/m2-dataset-upload
  │     ├── feat/m3-eda-engine
  │     ├── feat/m5-training-engine
  │     ├── fix/upload-validation
  │     ├── chore/docker-compose
  │     └── refactor/repository-pattern
  └── release/v1.0.0
```

### 1.2 Branch Types

| Branch | Source | Merges Into | Lifetime | Naming Convention |
|---|---|---|---|---|
| `main` | — | — | Permanent | `main` |
| `develop` | `main` | `main` | Permanent | `develop` |
| `release/*` | `develop` | `develop` + `main` | Temporary | `release/v{major}.{minor}.{patch}` |
| `feat/*` | `develop` | `develop` | Ephemeral | `feat/{milestone}-{description}` |
| `fix/*` | `develop` | `develop` | Ephemeral | `fix/{short-description}` |
| `chore/*` | `develop` | `develop` | Ephemeral | `chore/{short-description}` |
| `refactor/*` | `develop` | `develop` | Ephemeral | `refactor/{short-description}` |
| `docs/*` | `develop` | `develop` | Ephemeral | `docs/{short-description}` |

### 1.3 Rules

| Rule | Detail |
|---|---|
| **Never commit directly to `main`** | All changes to `main` must come through a release branch or hotfix. |
| **Never commit directly to `develop`** | All changes to `develop` must come through a feature/fix branch. |
| **Feature branches branch from `develop`** | Always. If `develop` has moved, rebase. |
| **One branch per atomic change** | A feature branch adds one milestone feature. A fix branch fixes one bug. |
| **Delete after merge** | Feature and fix branches are deleted after successful merge to `develop`. |
| **Rebase before merge** | Rebase feature branch on `develop` to maintain linear history. Squash commits if messy. |
| **No force-push to shared branches** | `main` and `develop` are protected. Force-push only on feature branches. |

### 1.4 Release Flow

```
1. Create release branch:       git checkout -b release/v1.0.0 develop
2. Bump version:                Update version in pyproject.toml, package.json
3. Final testing:               Run full test suite, fix release-critical bugs on release branch
4. Merge to main:               git checkout main && git merge release/v1.0.0
5. Tag release:                 git tag -a v1.0.0 -m "v1.0.0"
6. Merge back to develop:       git checkout develop && git merge release/v1.0.0
7. Delete release branch:       git branch -d release/v1.0.0
```

---

## 2. Commit Convention

### 2.1 Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 2.2 Types

| Type | Usage | Example |
|---|---|---|
| `feat` | New feature | `feat(datasets): add dataset upload endpoint` |
| `fix` | Bug fix | `fix(auth): handle expired JWT gracefully` |
| `chore` | Maintenance | `chore(deps): update fastapi to 0.115.0` |
| `refactor` | Code change without feature/fix | `refactor(repos): extract base repository class` |
| `docs` | Documentation only | `docs: add architecture diagram to README` |
| `style` | Formatting, no logic change | `style: run ruff formatter` |
| `test` | Adding or fixing tests | `test(training): add unit test for job cancellation` |
| `perf` | Performance improvement | `perf(eda): cache correlation matrix results` |
| `ci` | CI pipeline changes | `ci: add frontend lint step` |
| `revert` | Revert a previous commit | `revert: revert feat(datasets) due to regression` |

### 2.3 Scopes

| Scope | Area |
|---|---|
| `auth` | Authentication and authorisation |
| `datasets` | Dataset upload, list, detail, delete |
| `eda` | Exploratory data analysis |
| `pipelines` | Preprocessing pipelines |
| `models` | Model registry |
| `training` | Training jobs |
| `experiments` | Experiment tracking |
| `settings` | User settings |
| `dashboard` | Dashboard page |
| `ui` | Shared UI components |
| `api` | API layer (client) |
| `repos` | Repository implementations |
| `ml` | ML backend implementations |
| `deps` | Dependencies |
| `docker` | Docker configuration |
| `ci` | CI pipeline |

### 2.4 Rules

| Rule | Detail |
|---|---|
| **Imperative mood** | "Add endpoint" not "Added endpoint" or "Adding endpoint" |
| **No period at end of subject** | Subject line is 50 chars max |
| **Body wraps at 72 chars** | Explain what and why, not how |
| **Reference issues** | Footer: `Closes #12` or `Refs #34` |
| **One logical change per commit** | Don't mix formatting with logic changes |

### 2.5 Examples

```
feat(datasets): add multipart upload endpoint

Implements dataset upload with file format and size validation.
Files are stored under data/datasets/{uuid}/ on the local filesystem.

Closes #42
```

```
fix(auth): return 401 instead of 500 on expired token

The JWT middleware was raising an unhandled exception when
decoding an expired token, resulting in a 500 response.
Now catches ExpiredSignatureError and returns 401.

Fixes #87
```

```
refactor(repos): extract pagination into base class

All list methods duplicated pagination logic. Extracted
into PaginatedRepositoryMixin to reduce boilerplate.

No functional changes.
```

---

## 3. Pull Request Template

```markdown
## Description

<!-- Brief description of the changes -->

Closes #<issue_number>

## Type of Change

- [ ] feat: New feature
- [ ] fix: Bug fix
- [ ] refactor: Code restructuring
- [ ] docs: Documentation
- [ ] test: Testing
- [ ] chore: Maintenance
- [ ] perf: Performance

## Milestone

<!-- Which milestone does this PR belong to? -->
M2: Dataset Management

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Test Evidence

<!-- Describe how you tested -->

## Screenshots

<!-- If UI changes, add before/after screenshots -->

## Checklist

- [ ] Code follows project style guide
- [ ] Self-reviewed my code
- [ ] No new warnings
- [ ] Updated documentation if needed
- [ ] Added tests that prove my fix is effective or feature works
```

---

## 4. Issue Templates

### 4.1 Bug Report

```markdown
---
name: Bug Report
about: Report a bug to help us improve
title: "[BUG] "
labels: bug
---

## Description

<!-- Clear and concise description of the bug -->

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll to '...'
4. See error

## Expected Behaviour

<!-- What should have happened -->

## Actual Behaviour

<!-- What actually happened -->

## Environment

- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Backend version: [e.g., 1.0.0]
- Frontend version: [e.g., 1.0.0]

## Logs

```
<!-- Relevant logs -->
```

## Screenshots

<!-- If applicable -->
```

### 4.2 Feature Request

```markdown
---
name: Feature Request
about: Suggest an idea for MLPilot
title: "[FEAT] "
labels: enhancement
---

## Problem

<!-- What problem does this feature solve? -->

## Proposed Solution

<!-- How should this feature work? -->

## Alternatives Considered

<!-- What alternatives have you considered? -->

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Milestone

<!-- Which milestone does this belong to? -->
M5: Model Training Engine
```

---

## 5. Versioning

### 5.1 Scheme

**Semantic Versioning 2.0.0:** `MAJOR.MINOR.PATCH`

| Increment | When | Example |
|---|---|---|
| **MAJOR** | Breaking API or DB changes | `1.0.0` → `2.0.0` |
| **MINOR** | New feature (backward compatible) | `1.0.0` → `1.1.0` |
| **PATCH** | Bug fix (backward compatible) | `1.0.0` → `1.0.1` |

### 5.2 Version Sources

| File | Field |
|---|---|
| `backend/pyproject.toml` | `version = "1.0.0"` |
| `frontend/package.json` | `"version": "1.0.0"` |

Both must be in sync. CI checks they match.

### 5.3 Release Tags

```
v1.0.0
v1.0.1
v1.1.0
v2.0.0
```

**Tag format:** `v{major}.{minor}.{patch}`
**Annotation:** `git tag -a v1.0.0 -m "v1.0.0 — Milestone 3: EDA Engine"`

---

## 6. Releases

### 6.1 Per-Milestone Releases

Each milestone produces a tagged release:

| Tag | Milestone |
|---|---|
| `v0.1.0` | M1: Project Scaffold & Auth |
| `v0.2.0` | M2: Dataset Management |
| `v0.3.0` | M3: EDA Engine |
| `v0.4.0` | M4: Preprocessing Pipeline |
| `v0.5.0` | M5: Model Training Engine |
| `v0.6.0` | M6: Results & Comparison |
| `v0.7.0` | M7: Experiments |
| `v0.8.0` | M8: Settings & Dashboard |
| `v1.0.0` | M9: Polish & DX |

### 6.2 Release Checklist

```
□ All tests pass (pytest + vitest)
□ CI pipeline green
□ Version bumped in pyproject.toml and package.json
□ CHANGELOG.md updated
□ Release branch created (release/v1.0.0)
□ Final manual QA
□ Merge to main
□ Tag release (git tag -a v1.0.0)
□ GitHub Release created with changelog
□ Merge back to develop
```

### 6.3 Changelog Format

```markdown
# Changelog

## [v0.5.0] — 2026-08-15 — Model Training Engine

### Added
- Model entity with lifecycle management (#88)
- Training job entity with async progress tracking (#89)
- SklearnBackend for Random Forest, SVM, Logistic Regression (#90)
- XGBoostBackend for XGBoost training (#91)
- Hyperparameter configuration per algorithm (#92)
- Async training via Celery (#93)
- Job status polling endpoint (#94)
- Job cancellation endpoint (#95)
- Training page with model selector (#96)
- Progress bar with real-time updates (#97)

### Changed
- Extended API error codes for ML backend failures (#98)

### Fixed
- Memory leak in repeated model training (#99)
```

---

## 7. Project Boards

### 7.1 GitHub Project Columns

| Column | Cards |
|---|---|
| **Backlog** | Feature requests, unscheduled ideas |
| **To Do** | Prioritised for current milestone |
| **In Progress** | Actively being worked on (assigned) |
| **In Review** | PR open, awaiting review |
| **Done** | Merged to `develop` |

### 7.2 Issue Labelling

| Label | Colour | Meaning |
|---|---|---|
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature or request |
| `documentation` | `#0075ca` | Documentation improvements |
| `good first issue` | `#7057ff` | Good for newcomers |
| `help wanted` | `#008672` | Extra attention needed |
| `milestone-1` | `#bfdadc` | M1: Scaffold & Auth |
| `milestone-2` | `#bfdadc` | M2: Dataset Management |
| `milestone-3` | `#bfdadc` | M3: EDA Engine |
| `milestone-4` | `#bfdadc` | M4: Preprocessing |
| `milestone-5` | `#bfdadc` | M5: Training Engine |
| `priority: high` | `#b60205` | Must fix/implement now |
| `priority: medium` | `#fbca04` | Should fix/implement soon |
| `priority: low` | `#0e8a16` | Nice to have |

---

## 8. Folder Organisation

```
mlpilot/
│
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── api/
│   │   ├── core/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── unit/
│   │   └── integration/
│   ├── alembic/
│   ├── pyproject.toml
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── core/
│   │   ├── modules/
│   │   └── shared/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── Dockerfile
│
├── data/                          # gitignored
│   ├── datasets/
│   └── models/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── AGENTS.md
├── PRD.md
├── ARCHITECTURE.md
├── UX.md
├── API.md
├── MILESTONES.md
├── GIT_WORKFLOW.md
├── CODING_STANDARDS.md
└── CHANGELOG.md
```

---

## 9. .gitignore Rules

```
# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
*.egg

# Node
node_modules/
dist/
*.tsbuildinfo

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# MLPilot data
data/datasets/*
data/models/*
!data/datasets/.gitkeep
!data/models/.gitkeep

# Logs
*.log

# Coverage
htmlcov/
.coverage
coverage/
```

---

## 10. Git Aliases (Recommended)

```bash
# ~/.gitconfig
[alias]
  co = checkout
  br = branch
  ci = commit
  st = status
  unstage = reset HEAD --
  last = log -1 HEAD
  lg = log --oneline --graph --decorate --all
  amend = commit --amend --no-edit
  undo = reset --soft HEAD~1
  pr = !gh pr create
  prc = !gh pr checkout
```
