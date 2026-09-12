# Screenshots — generated via Playwright

Captured at 1280×800, Chrome, `npm run screenshots` (`e2e/screenshots.spec.ts` via `playwright.config.ts`).

Current set (all <300KB, 1280px brutal theme) — 5 in README:

- `01-home.png` — Home hero + brutal grid + 4-stage diagram (292KB)
- `02-login.png` — Split auth, Sign In form + AbstractPanel (64KB)
- `03-register.png` — Create account + strength meter (68KB)
- `04-dashboard.png` — Dashboard (empty + guest) (71KB)
- `05-datasets.png` — Dataset upload + demo buttons (67KB)

Reference in `README.md` as `![Home](docs/screenshots/01-home.png)` — relative from repo root, renders on GitHub.

To re-capture: `npm run backend` + `npm run dev` (or let Playwright webServer auto-start), then `npm run screenshots`.
