# Deploying MLPilot (Vercel + Render + Supabase)

This setup deploys the **React frontend to Vercel** (static) and the **FastAPI
backend to Render** (Python), with **Supabase Postgres** as the database. No
application code changes were needed — the app already supports Postgres
(`DATABASE_URL`), env-driven CORS, and an env-driven API base URL.

```
 Browser ──► Vercel (React SPA) ──► Render (FastAPI) ──► Supabase Postgres
```

---

## 1. Database — Supabase (free)

1. Sign up at <https://supabase.com> (no credit card).
2. New project → note the **password** and **region** (pick one near Render/Oregon,
   e.g. `us-east-1`).
3. In **Project Settings → Database**, copy the **URI** connection string.
   It looks like:
   `postgresql://postgres:[YOUR-PASSWORD]@db.<ref>.supabase.co:5432/postgres`
4. Keep this string — you will paste it into Render as `DATABASE_URL`.

> Free-tier caveat: projects pause after ~1 week of inactivity. A weekly
> `curl https://<your-backend>.onrender.com/api/v1/health` (e.g. via Uptime Robot)
> keeps it alive. The DB itself persists; there are no automated backups on free.

---

## 2. Backend — Render (free)

1. Push this repo to GitHub.
2. In Render, **New → Blueprint**, connect the repo. `render.yaml` is detected
   and a `mlpilot-backend` web service is created.
3. In the service **Environment** tab, set the two manual variables:
   - `DATABASE_URL` → the Supabase URI from step 1.4
     (use the `postgresql+psycopg2://...` form).
    - `CORS_ORIGINS` → `["*"]` (the Vercel frontend calls the backend through a
      Vercel rewrite proxy, so the browser request is same-origin and CORS is not
      involved; `*` keeps direct API access open too).
 4. Deploy. Once live, note the backend URL
    (`https://mlpilot-backend.onrender.com`).

The first build installs pandas/scikit-learn/xgboost and can take a few minutes.
`healthCheckPath` is `/api/v1/health`.

---

## 3. Frontend — Vercel (free)

1. In Vercel, **New Project → import the GitHub repo**.
2. Framework preset: **Vite** (auto-detected from `vercel.json`).
   Build command `npm run build`, output `dist`.
 3. **Environment Variables** (Build & Development) — add:
    - `VITE_API_BASE_URL` = `/api/v1`
      (relative). `vercel.json` rewrites `/api/*` to the Render backend, so the
      browser talks to Vercel same-origin and no CORS is needed.
 4. Deploy. Your app is live at `https://<your-app>.vercel.app`.

> The frontend never calls Render directly: all `/api/*` traffic is proxied by
> Vercel (see `vercel.json` `rewrites`). This keeps the dashboard free of CORS
> errors. If you ever switch back to a direct backend URL, also set
> `CORS_ORIGINS` on Render to your Vercel URL.

---

## 4. Showcasing notes

- **First load is slow.** Render's free tier spins down after ~15 min of
  inactivity; the next request takes 30–60s to wake. Open the backend URL once
  (or hit `/api/v1/health`) before sharing.
- **Data is session-scoped and ephemeral on the free tier.** Uploaded datasets
  and trained model files live on Render's local disk and are wiped on cold
  start. **Metadata persists in Supabase.** For a live demo, re-upload your
  dataset after a cold start, or upgrade Render to a paid plan (~$5–7/mo) for an
  always-on instance with a persistent disk.
- The interactive API docs (`/docs`) are disabled in production (`DEBUG=false`).

---

## Local development (unchanged)

Nothing here affects local dev. Locally the app still uses SQLite
(`DATABASE_URL` defaults to a local file) and the Vite `/api` proxy.
