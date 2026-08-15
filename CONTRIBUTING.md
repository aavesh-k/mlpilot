# Contributing to MLPilot

Thanks for your interest in contributing! MLPilot is a resume-focused full-stack
ML-workflow app (React + FastAPI). This guide covers how to get a working local
environment and the conventions the project follows.

> **Note:** Authentication / multi-user support is **deferred** (see
> `MILESTONES.md`). The app currently runs as a single local user with session
> isolation via `?session_id=`. Keep that scope in mind when proposing changes.

---

## 1. Prerequisites

- Python **3.12+**
- Node.js **20+** and npm
- (Optional, for Postgres instead of the default SQLite) a Postgres server

---

## 2. Local setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Unix:     source .venv/bin/activate

pip install -r requirements.txt        # runtime deps
pip install -r requirements-dev.txt     # pytest, ruff, httpx

# Default config uses a local SQLite DB (data/mlpilot.db) — no DB server needed.
uvicorn app.main:app --reload --port 8000
```

The schema is created automatically on startup (`Base.metadata.create_all`),
so there is no migration step required for local development.

### Frontend

```bash
# From the repository root
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so no extra
CORS configuration is needed locally.

### All-in-one (from repo root)

```bash
npm run backend    # starts the FastAPI backend via uvicorn
npm run dev        # starts the Vite frontend
```

---

## 3. Running checks

| Layer   | Command                | Purpose                          |
|---------|------------------------|----------------------------------|
| Backend | `ruff check .`         | Lint (run inside `backend/`)     |
| Backend | `python -m pytest tests/ -v` | Run the pytest suite       |
| Frontend| `npm run typecheck`    | `tsc -b` type checking           |
| Frontend| `npm run lint`         | `oxlint`                         |
| Frontend| `npm test`             | Vitest unit tests               |
| Frontend| `npm run build`        | Production build into `dist/`    |

Keep the backend `ruff`-clean and ensure both test suites pass before opening a
PR.

---

## 4. Branch & commit conventions

The project follows a Git Flow–style strategy documented in
[`GIT_WORKFLOW.md`](./GIT_WORKFLOW.md). Highlights:

- Branch from `develop`; never commit directly to `main` or `develop`.
- Use prefix branches: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`.
- Rebase and squash before merging.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

  ```
  <type>(<scope>): <description>

  [optional body]
  ```

  Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`,
  `ci`, `revert`. Example: `feat(datasets): add multipart upload endpoint`.

---

## 5. Pull requests

- Open PRs against `develop`.
- Fill out the PR template (description, type of change, testing checklist).
- Reference any related issue with `Closes #<n>`.
- Add or update tests for behavioral changes.
- Update documentation (README / API / ARCHITECTURE) when the change affects
  setup, behavior, or the public API.

---

## 6. Code style

See [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) for the full style guide.

- Backend: Python 3.12+, Ruff (line length 160), type hints everywhere,
  domain exceptions (no bare `except`, no `print` for logging).
- Frontend: TypeScript strict, Tailwind utility classes, one component per file,
  React Query for data fetching, Zustand for UI state.
- Reuse existing components and services; do not duplicate logic.
- Do not introduce breaking changes to the public API without discussion.

---

## 7. Reporting issues

Use the GitHub issue templates (Bug Report / Feature Request) described in
[`GIT_WORKFLOW.md`](./GIT_WORKFLOW.md). For security-sensitive reports, please
do not open a public issue — contact the maintainer directly.
