# MLPilot — API Reference

> Source: `backend/app/api/v1/router.py` + `backend/app/main.py` (lifespan, not `on_event`).

Base: `/api/v1` (Vite proxies `/api` → `http://localhost:8000`; Vercel rewrites `/api/*` → Render). Error envelope always `{"error":{"code","message","field"}}` (`backend/app/api/errors.py:21`).

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | public | `body {email, password, guest_session_id?}` → `201 {access_token, refresh_token}`. Migrates `X-Session-ID` guest rows to `user_id` (`storage.py:436`). |
| POST | `/api/v1/auth/login` | public | `form username=email, password` + `?remember_me=bool` → `200 {access_token (60m), refresh_token (1d else 7d)}`. Validated `username→email` (`errors.py:57`). |
| GET | `/api/v1/auth/me` | JWT | Returns `UserResponse {id,email,created_at}`. |
| POST | `/api/v1/auth/refresh` | public | `?refresh_token=` → new pair; `401` with `Your session has expired…` |
| POST | `/api/v1/auth/forgot-password` | public | `body {email}` → always `200` generic `If an account exists...` (anti-enumeration). |

## Health

| GET | `/health` / `/api/v1/health` | public | `{"status":"ok","version":"0.1.0"}` |

## Datasets

| POST | `/api/v1/datasets/upload` | JWT (require_user) | multipart `file` + `name?` → `201` dataset (streamed 5GB limit) |
| POST | `/api/v1/datasets/demo` | guest/JWT | `body {demo: iris/breast_cancer/housing/digits}` or `?demo_type=` — cached copy (<20ms) |
| GET | `/api/v1/datasets/` | `get_owner` | `?page&per_page` per-user or per-session (`X-Session-ID`) |
| GET | `/api/v1/datasets/{id}` | `get_owner` | 404 if not owned |
| DELETE | `/api/v1/datasets/{id}` | `get_owner` | cascade `eda + pipelines + models` + disk |

## EDA

| POST | `/api/v1/datasets/{id}/eda` | `get_owner` | async start (thread + `eda_limiter`) |
| GET | `/api/v1/datasets/{id}/eda` | `get_owner` | `not_started/processing/completed` + report |
| GET | `/api/v1/datasets/{id}/columns` | `get_owner` | column stats (fallback compute) |

## Cleaning

| GET | `/api/v1/datasets/{id}/cleaning/suggestions` | `get_owner` | 6-step config |
| POST | `/api/v1/datasets/{id}/cleaning/execute` | `get_owner` | `201` new dataset |
| GET | `/api/v1/datasets/{id}/cleaning/runs` | `get_owner` | list |
| GET | `/api/v1/datasets/{id}/cleaning/report/{run_id}` | `get_owner` | report |
| GET | `/api/v1/datasets/{id}/cleaning/download/{run_id}` | `get_owner` | cleaned CSV |

## Pipelines

| POST | `/api/v1/pipelines/suggest` | `get_owner` | suggest config |
| POST | `/api/v1/pipelines/detect-target` | `get_owner` | `?dataset_id & target_column` → datetime cols |
| POST | `/api/v1/pipelines/` | `get_owner` | create (requires cleaned dataset) |
| GET | `/api/v1/pipelines/` | `get_owner` | list |
| GET | `/api/v1/pipelines/{id}` | `get_owner` | get |
| PUT | `/api/v1/pipelines/{id}` | `get_owner` | update |
| DELETE | `/api/v1/pipelines/{id}` | `get_owner` | cascade models |
| POST | `/api/v1/pipelines/{id}/execute` | `get_owner` | background |
| POST | `/api/v1/pipelines/{id}/score` | `get_owner` | score new data |

## Training

| POST | `/api/v1/training/` | `get_owner` | batch 10 algos, CV, tuning |
| GET | `/api/v1/training/models` | `get_owner` | list |
| GET | `/api/v1/training/models/compare` | `get_owner` | leaderboard |
| GET | `/api/v1/training/models/{id}` | `get_owner` | get |
| GET | `/api/v1/training/models/{id}/download` | `get_owner` | pkl/zip |
| POST | `/api/v1/training/models/{id}/set-best` | `get_owner` | mark best |
| GET | `/api/v1/training/models/{id}/plots` | `get_owner` | diagnostic |
| GET | `/api/v1/training/models/{id}/explain` | `get_owner` | SHAP |
| POST | `/api/v1/training/models/{id}/predict` | `get_owner` | upload file |
| GET | `/api/v1/training/models/{id}/export/cleaned` | `get_owner` | CSV |
| GET | `/api/v1/training/models/{id}/export/preprocessed` | `get_owner` | ZIP |
| GET | `/api/v1/training/models/{id}/export/recipe` | `get_owner` | ZIP |
| GET | `/api/v1/training/models/{id}/export/report` | `get_owner` | HTML |
| GET | `/api/v1/training/predictions/download` | `get_owner` | latest CSV |
| GET | `/api/v1/training/jobs` | `get_owner` | list |
| GET | `/api/v1/training/jobs/{id}` | `get_owner` | get |
| POST | `/api/v1/training/jobs/{id}/cancel` | `get_owner` | cooperative |
| GET | `/api/v1/training/algorithms` | `get_owner` | list algos |
| GET | `/api/v1/training/recommendations` | `get_owner` | recommend |

## Settings

| GET | `/api/v1/settings/` | `get_owner` | get |
| PUT | `/api/v1/settings/` | `get_owner` | update |
