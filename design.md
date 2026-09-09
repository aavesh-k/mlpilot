# MLPilot — Frontend Design Spec

> Single source of truth for the frontend visual language, layout system, tokens, components, pages, states, and interaction patterns.
> Stack: React 19 + TypeScript + Vite 8 + Tailwind CSS v3 + React Router 7 + Zustand + TanStack Query + Recharts + Material Symbols.
> Branch: `feat/brutalist-punk-ui` — Brutalist Punk visual system ported from TypeWithMe **UI only** (no typing/multiplayer/auth copy or logic).

---

## 1. Design Philosophy — Brutalist Data Punk

MLPilot is a local-first ML workbench: raw CSV → cleaned data → pipeline → trained model → leaderboard → report. The UI is a deliberate anti-SaaS statement — punk zine, printed on paper, sharp enough to cut. Bauhaus/Neo-Brutalist was removed entirely.

1. **Zero rounded corners.** `--radius: 0rem` everywhere. `rounded-none` on all cards, buttons, inputs, modals, tooltips. Enforced globally via `src/index.css:118` (`* { border-radius:0 !important }`) and `tailwind.config.js:66` (`borderRadius: none`). No `rounded-*` ever.
2. **Hard offset shadows, no blur.** Signature: `shadow-[4px_4px_0_0_#000]` / `brutal-shadow`, `brutal-shadow-lg` (`6px`), `brutal-shadow-xl` / `shadow-[8px_8px_0_0_#000]` for modals/dialogs, `shadow-[6px_6px_0_0_#ffd400]` hero-to-feature lift, `shadow-[3px_3px_0_0_#fff]` logo block, `shadow-[3px_3px_0_0_#000]` buttons. Press collapses shadow to `0`. Legacy `neo-shadow` aliases map to brutal in `src/index.css:158`.
3. **Thick black borders.** `border-2` standard, `border-[3px]` for header/footer/modals/dialogs, `border-y-[3px]` for loud banners. Every surface is `bg-white border-2 border-black brutal-shadow`.
4. **Monospace for data/labels.** Headlines are sans (Space Grotesk), all labels/metrics/meta/badges/buttons are mono (JetBrains Mono), `uppercase tracking-widest`. Headlines always `uppercase tracking-tight`.
5. **Loud, tight palette.** Ink black `#000`, paper white `#fff`, acid green `#c8ff00` (header / pipeline-ready cards), safety yellow `#ffd400` (highlights, active nav, title bars, button shadows), ice blue `#e0f7ff` (info), alert red `#ff0000` / `red-600`. See §2.1.
6. **Deliberate imperfection.** `-rotate-1`, `-rotate-2`, `rotate-1` on hero pills/cards/section badges, asymmetric grids, fake window chrome title bars (`mlpilot.run`, `model.pkl`, `leaderboard.data`). Hover resets to `rotate-0`.
7. **MLPilot voice, not typing voice.** Deterministic, local-first, no hype. Mono brackets for metadata (`DATA → MODEL`, `[csv • parquet • json • xlsx]`, `// local-first ml pipeline`), CTA always ends with `→`. No TypeWithMe copy (`wpm > life`, `Start Typing`, `typing.exe/code.exe`, `esc = restart`, `keep hands on home row`) — all stripped in `src/pages/Home.tsx` / `Sidebar.tsx` / `TopNav.tsx`.
8. **Guided workflow.** 6-step linear flow (`Dataset → Cleaning → Preprocessing → Training → Compare → Visualizations → Reports`) via `PageHeader` + `RouteGuard` + `Sidebar` + `BottomNav`. No dead ends.

---

## 2. Design Tokens

### 2.1 Color

Source: `src/index.css:13` (`:root` triplets) mapped via `tailwind.config.js:6` (`rgb(var(--c-x)/<alpha>)`). `src/index.css` is single source; `tailwind.config.js` only aliases.

| Token | Value | Usage |
|---|---|---|
| `--c-background` | `247 247 242` `oklch(0.97 0.005 95)` warm paper | Page bg, pairs with `bg-brutal-grid` |
| `--c-on-background` / `--c-foreground` / `--c-on-surface` | `0 0 0` black | Body text `text-on-surface` |
| `--c-surface` / `--c-card` | `255 255 255` white | Cards, modals, popovers `bg-white` |
| `--c-primary` | `0 0 0` black | Primary buttons `bg-black text-white`, borders `border-black` |
| `--c-primary-container` | `255 212 0` `#ffd400` safety yellow | Active nav, highlights, title bars, yellow `brutal-shadow` |
| `--c-secondary` | `200 255 0` `#c8ff00` acid green | Header `bg-[#c8ff00]`, pipeline-ready cards |
| `--c-secondary-container` | `224 247 255` `#e0f7ff` ice | Info surfaces |
| `--c-tertiary` | `0 85 255` `#0055ff` blue | Chart series, tertiary accents (kept for Recharts) |
| `--c-error` | `255 0 0` `#ff0000` | Destructive `bg-error`, `text-error`, `border-error` |
| `--c-success` | `5 154 46` `#059a2e` | Success badges, `↓` diff |
| `--c-warning` / `--c-info` | `202 138 4` / `2 132 199` | Warning/info badges/containers |
| `--c-outline` / `--c-outline-variant` | `0 0 0` black | All borders/rings black in light |
| `--c-surface-strong` | `0 0 0` | Black blocks (workflow logic section) |
| `--radius` | `0rem` | No rounding, ever |

Brand hexes (hardcoded where Tailwind token is too generic):

| Hex | Name | Usage in MLPilot |
|---|---|---|
| `#c8ff00` | Acid green | `TopNav` + `Home` `Cleaning` header `bg-[#c8ff00]`, banner `border-y-[3px] bg-[#c8ff00]`, Sidebar pipeline-ready highlight |
| `#ffd400` | Safety yellow | Active `Sidebar` item, `PageHeader` accent `bg-[#ffd400] border-2 brutal-shadow -rotate-1`, `Home` hero `Shipped` highlight, `Button` `secondary` bg, focus `shadow-[4px_4px_0_0_#ffd400]`, `::selection` |
| `#e0f7ff` | Ice blue | `Badge` `info` `bg-[#e0f7ff]`, secondary-container |
| `#059a2e` | Correct green | `Badge` `success` alt, Cleaning `↑` |
| `#ff0000` / `red-600` | Alert red | `Button` `danger`, `Badge` `danger`, error banners `bg-red-50 border-[#ff0000]` |
| `#000` / `#fff` | Ink / Paper | Borders, shadows, logo block, primary buttons |

No dark mode shipped. Tokens for `.dark` are deferred (no `ThemeProvider` wired — same as source). When adding, use semantic tokens (`bg-background text-on-surface border-black`) not hardcoded `bg-white`.

### 2.2 Typography

Loaded in `index.html:10` via Google Fonts: `Space Grotesk 300-700`, `JetBrains Mono 400/500/700/800`, `Inter 400-700`, `Material Symbols Outlined`.

| Role | Font | Tailwind | Usage |
|---|---|---|---|
| Headlines / display | `Space Grotesk` | `font-headline` / `font-display` / `font-sans` | `text-5xl md:text-7xl font-black uppercase tracking-tight leading-none` (Home hero), `text-4xl sm:text-5xl` page titles, `text-xl font-black uppercase tracking-tight` card titles |
| Body fallback | `Inter` | `font-body` | Long prose only (Home sub `border-l-[3px]` block). Most UI prefers mono. |
| Data / labels / metrics / badges / buttons | `JetBrains Mono` | `font-mono` | Badges, tiles, timers, inputs, buttons, microcopy `font-mono text-[10px] uppercase tracking-widest` |

Type scale in use:

- Hero: `text-5xl md:text-7xl font-black uppercase tracking-tight leading-none` + yellow `bg-[#ffd400] border-2 brutal-shadow px-3 -rotate-2`
- Page titles (Dashboard/Datasets/Cleaning): `text-4xl sm:text-5xl font-black uppercase tracking-tight` with `PageHeader` accent pill `bg-[#ffd400] border-2 -rotate-1`
- Section titles: `text-xl font-black uppercase tracking-tight`, `text-3xl font-black uppercase`
- Metrics (Dashboard/Cleaning/EDA): `font-mono text-2xl font-black` (Rows/Cols tiles), `text-3xl` (KPI)
- Labels: `font-mono text-[10px] font-black uppercase tracking-widest` (badges, eyebrows `// workflow`, footer), `font-mono text-xs font-black uppercase tracking-widest` (step chips, form labels)
- Body/mono desc: `font-mono text-xs uppercase tracking-widest text-black/60 leading-relaxed` (Dashboard subtitle, EDA meta, Cleaning helper)

Rules: headlines `uppercase tracking-tight`; mono labels `uppercase tracking-widest`; placeholders `placeholder:font-mono placeholder:text-xs placeholder:uppercase placeholder:tracking-widest placeholder:text-black/30` (`src/shared/components/ui/input.tsx:24`).

### 2.3 Spacing, Borders, Shadows, Motion

- **Layout widths:** `max-w-7xl` (TopNav/Home header/footer/Layout), `max-w-4xl` (Home features/docs), `max-w-2xl` (Upload drop-zone card), `max-w-md` (modals, EmptyState), `max-w-7xl mx-auto px-4` everywhere.
- **Padding:** page `p-8 lg:p-12` (inner via `Layout` `flex-1 overflow-y-auto`), cards `p-6` / `p-8` (`Card` default `p-6`), tiles `p-3` / `p-4` / `px-6 py-3`, modal header `px-6 py-4`, modal body `p-6`.
- **Borders:** `.brutal-border { border:2px solid #000 }`; TopNav `border-b-[3px]`, Sidebar `border-r-[3px]`, BottomNav `border-t-[3px]`, banner `border-y-[3px]`, modal shell `border-[3px]`, title bars `border-b-2`.
- **Shadows:** `.brutal-shadow {4px 4px 0 0 #000}`, `-sm {3px}`, `-lg {6px}`, `-xl {8px}`; logo `shadow-[3px_3px_0_0_#fff]`; `Button` `brutal-shadow`; `Card` `brutal-shadow`; modal `shadow-[8px_8px_0_0_#000]`.
- **Press:** `.btn-press {transition: transform .05s, box-shadow .05s}` + `:active {translate(3px,3px); shadow 0}` — baked into `Button` base (`src/shared/components/ui/button.tsx:15`).
- **Background:** `.bg-brutal-grid` — warm paper + 28px grid `rgba(0,0,0,.06)` 1px lines (`src/index.css:193`). Applied at `Layout` root (`min-h-screen bg-brutal-grid`) and `Home` root.
- **Keyframes:** `blink` (1s steps), `pop` (0.3s .95→1.05→1 `animate-pop` for Home hero, EmptyState, ConfirmDialog), `mlp-indeterminate` (1.4s shimmer `animate-indeterminate` for `ProgressBar`), `animate-pulse` skeletons. Hover: `hover:-translate-y-1 hover:shadow-[2px_2px_0_0_#000]` / `hover:rotate-0`, `group-hover:rotate-12` on add icons.

---

## 3. Global Chrome (shared across all workflow pages)

### 3.1 TopNav — `src/components/TopNav.tsx`

Sticky acid header, single source of truth (no inline duplicates).

- Container: `sticky top-0 z-50 border-b-[3px] border-black bg-[#c8ff00]`, inner `max-w-7xl mx-auto px-4 py-3 flex items-center justify-between`.
- Brand (left, `NavLink /`): black 36px square (`w-9 h-9 bg-black shadow-[3px_3px_0_0_#fff] border-2 border-black`) with yellow `M` (`text-[#ffd400] font-black text-xl`), stacked wordmark `MLPilot` (`font-headline text-xl font-black uppercase tracking-tight text-black`) + mono subtitle `DATA → MODEL` (`font-mono text-[10px] uppercase tracking-widest text-black/70`).
- Center nav (desktop `hidden lg:flex gap-1`): `Home` / `Dashboard` / `Reports` — `font-mono text-xs uppercase tracking-widest font-bold px-3 py-1.5 border-2 btn-press`; active `bg-black text-white brutal-shadow-sm`, idle `bg-white hover:bg-[#ffd400] brutal-shadow-sm`.
- Right: `New run →` (`bg-black text-white font-mono text-xs font-black uppercase tracking-widest px-6 py-2.5 border-2 border-black shadow-[4px_4px_0_0_#000] btn-press`). Hidden hamburger `lg:hidden` (`border-2 bg-white brutal-shadow-sm`) toggles `Sidebar` overlay.
- **MLPilot change vs source:** brand letter `M` not `T`; subtitle `DATA → MODEL` not `KEYBOARD ACCELERATOR`; CTA `New run →` not `Start Typing`; no `Stats/Settings/Multiplayer` actions — kept brutal chrome, replaced copy.

### 3.2 Sidebar + BottomNav — `src/components/Sidebar.tsx` / `BottomNav.tsx`

Workflow nav, not generic SaaS nav.

- Sidebar (desktop `hidden lg:flex`, mobile overlay `fixed inset-0 z-40` + `bg-black/50` scrim): `w-64 bg-white border-r-[3px] border-black`, `py-6 px-4`, `flex flex-col`.
  - Header: `// WORKFLOW` pill (`bg-white border-2 brutal-shadow-sm -rotate-1 font-mono text-[10px] font-black`), title `ML Workflow` (`font-headline text-xl font-black uppercase tracking-tight`), `6 STEPS • GUIDED` mono.
  - Items (8): Dashboard, Dataset, Cleaning, Preprocessing, Training, Leaderboard, Visualization, Reports — each `NavLink` `flex items-center gap-3 py-3 px-4 border-2 font-mono text-xs font-black uppercase tracking-widest btn-press`; active `bg-[#ffd400] brutal-shadow-sm`, idle `bg-white hover:bg-[#c8ff00] brutal-shadow-sm hover:translate-x-1`.
  - Foot: `DATA → MODEL` / `local-first • open pipeline` (`border-2 bg-white -rotate-1`) — MLPilot copy, not `wpm > life`.
- BottomNav (mobile `lg:hidden fixed bottom-0`): `bg-white border-t-[3px] border-black flex justify-around py-2`, items `Diagnosis`? actually `Home/Data/Clean/Pipeline/Train/Reports` — `font-mono text-[10px] font-black uppercase border-2`; active `bg-black text-white`, idle `bg-white hover:bg-[#ffd400]`.

### 3.3 Footer — `src/pages/Home.tsx:377` (Home only; workflow pages have no footer)

`bg-black text-white border-t-[3px] border-black`, `max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4` + `border-t border-white/10` bar `© 2026 MLPILOT LABORATORY. ALL RIGHTS RESERVED.` / `DATA → MODEL • LOCAL-FIRST` (`font-mono text-[10px] uppercase tracking-widest`). Previous Bauhaus `bg-surface-strong` removed.

### 3.4 Loading / Empty / Error

- `src/shared/components/LoadingSpinner.tsx`: brutal loader — black `M` block + `w-48 h-3 bg-white border-2 border-black brutal-shadow` + `bg-[#ffd400] w-2/3 animate-pulse` + `loading mlpilot...` mono. `Skeleton` / `SkeletonTable` / `SkeletonCard` all `bg-white border-2 border-black brutal-shadow animate-pulse`.
- `src/shared/components/EmptyState.tsx`: `bg-white border-2 border-black brutal-shadow -rotate-1 max-w-lg mx-auto` + `material-symbols-outlined text-6xl`, title `font-headline uppercase`, desc `font-mono text-xs uppercase tracking-widest text-black/70`.
- `src/shared/components/ErrorState.tsx`: `bg-red-50 border-2 border-red-500 brutal-shadow` + `text-red-600` icon, mono desc.
- `src/shared/components/GlobalErrorBoundary.tsx`: `text-error` not `text-secondary`, `bg-surface-variant` preview `rounded-none`.
- `ConfirmDialog` (`src/shared/components/ui/confirm-dialog.tsx`): `fixed inset-0 bg-black/50` → `bg-white border-[3px] shadow-[8px_8px_0_0_#000] max-w-md animate-pop` → yellow title bar `bg-[#ffd400] border-b-[3px] px-6 py-4` with `// Title` mono + white `X` (`border-2 brutal-shadow-sm hover:bg-red-500`) → `p-6` mono body → `border-t-[3px] p-6` footer `Cancel` ghost + `Delete` danger.

---

## 4. Pages

### 4.1 Home — `src/pages/Home.tsx` (no Layout chrome — own brutal header)

Structure: acid `TopNav`-like header → hero (`md:grid-cols-12`) → highlight banner (`border-y-[3px] bg-[#c8ff00] -rotate-1`) → pipeline docs (`#docs`) → black workflow logic (`bg-black border-[3px] brutal-shadow-xl`) → tech grid → yellow CTA (`bg-[#ffd400] border-2 -rotate-1`) → black footer.

- **Hero** (`py-12 md:py-20`): eyebrow pill `bg-white border-2 brutal-shadow px-4 py-1 font-mono text-xs uppercase -rotate-1` `// local-first ml pipeline`; headline `MLPilot From Dataset to Shipped Model.` with `MLPilot` white pill ` -rotate-1` + `Shipped` yellow `bg-[#ffd400] border-2 px-3 -rotate-2` + `Model.` red `text-[#ff0000]`; sub mono `text-xs md:text-sm uppercase text-black/70 border-l-[3px] pl-4`; CTAs `Get Started →` black + `How It Works` white (both `font-mono font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] btn-press`).
- **4-stage diagram** (`aspect-square border-2 bg-white brutal-shadow -rotate-1 hover:rotate-0`): SVG nodes `DATASET` (blue icon), `CLEAN & ENCODE` (red check), `TRAIN & TUNE` (yellow sliders), `BENCHMARKED MODEL` (yellow bg) — all `strokeWidth 3` brutal rects + black arrows; foot `4-Stage Flow` black badge, top `mlpilot.run` yellow chip (MLPilot text, not `typing.exe`).
- **Highlight banner** (`-rotate-1`): `Highlight` black-on-green chip + `Automated EDA — correlations, missing values & distribution shifts in one click.` mono black + `Upload Now →` black button `shadow-[3px_3px_0_0_#fff]`.
- **Pipeline docs** (`grid md:grid-cols-4`): `Auto-EDA` double card (`bg-white border-2 p-6 brutal-shadow hover:-translate-y-1`) with `Section 01` black-on-yellow chip + `w-full h-40 border-2 bg-[#f5f5f0] p-3` `EdaChart` (mono bars `bg-black` / active `bg-[#ffd400]`); `Rapid Prototyping` red `bg-[#ff0000] -rotate-1` + `Benchmarking` blue `bg-[#0055ff] rotate-1`; inference geometry (`bg-white border-2 p-4`) with `model.pkl` yellow / `v1.0 • local` white chips.
- **Workflow logic** (black): yellow `deterministic engine` pill, `Automated Workflow Logic` with yellow `Workflow` highlight, mono `text-white/70`, steps `bg-white border-2 p-3 brutal-shadow-sm` with black `01` yellow-text badge + mono uppercase label; right `leaderboard.data` window (`bg-white border-[3px] p-6 rotate-1`, yellow bar `leaderboard.data`) with SVG bars (yellow/green/red as per `src/index.css` chart vars).

### 4.2 Dashboard — `src/pages/Dashboard.tsx`

`p-8 lg:p-12` on `bg-brutal-grid`. Uses `PageHeader`-less custom hero but brutalized.

- **Empty** (`datasets.length===0`): `// welcome` pill, `Welcome to MLPilot` with yellow `MLPilot` highlight, mono `Upload your first dataset…`; CTA `bg-[#c8ff00] border-2 p-8 -rotate-1 hover:rotate-0 brutal-shadow` with black `add` block.
- **Loaded:** `// dashboard` pill, `Welcome, Engineer` with yellow `Engineer` highlight (`font-headline 5xl/7xl font-black uppercase`), mono `Best model …`; grid `md:grid-cols-2 xl:grid-cols-3 gap-6`: dataset cards `bg-white border-2 border-black p-6 brutal-shadow hover:-translate-y-1` — title `font-headline text-2xl font-black uppercase` with hover `bg-[#ffd400]`, status `bg-black text-white font-mono text-[10px]`, format mono, stat tiles `bg-white border-2 p-3 brutal-shadow-sm` with `font-mono text-[10px] uppercase` label + `font-mono text-2xl font-black` value; `New Dataset` card `bg-white hover:bg-[#ffd400] btn-press` with black add block `group-hover:rotate-12`.
- **States:** loading `animate-pulse bg-white border-2 brutal-shadow-sm` skeletons; error `ErrorState` red; `useBackendReady` warming gate `bg-white border-2 brutal-shadow p-8` with `sync` pulse.

### 4.3 Dataset Upload — `src/pages/DatasetUpload.tsx` (`/datasets`)

`PageHeader` (`Dataset Upload`, mono subtitle). Two cards `bg-surface` now white via vars; we brutalize explicitly where needed.

- **Drop zone** (`bg-surface border-2 border-black p-4 md:p-8 brutal-shadow mb-8`): inner dashed `border-2 border-dashed border-black p-6 md:p-12 text-center group cursor-pointer` — icon `cloud_upload text-6xl text-black`, title `font-mono text-lg uppercase tracking-widest font-black` `Drop Files Here` / `Drop now` (drag `bg-black/5`), mono `or click to browse — Max 5GB` + `CSV, Parquet, JSON, Excel`.
- **Demo datasets** (`p-4 md:p-8`): title `font-headline text-xl font-black uppercase`; error mono `text-error`; grid `lg:grid-cols-3`: brutal buttons `bg-white border-2 border-black brutal-shadow-sm px-4 py-3 hover:bg-[#ffd400] btn-press font-mono text-xs font-black uppercase` with `grade/favorite/house` icons + `font-mono text-[10px] text-black/60` meta.
- **Dataset list** (`p-4 md:p-8`): title mono, list rows `flex items-center justify-between py-4 border-b-2 border-black hover:bg-surface-variant/30` with `description` icon, `font-headline font-bold` name, `font-mono text-xs` meta, `Badge` (`success/danger/warning` → `bg-[#c8ff00]/#ff0000/#ffd400`), `Delete` danger button; `Pagination` brutal mono.

### 4.4 Dataset Overview — `src/pages/DatasetOverview.tsx` (`/datasets/:id`)

`PageHeader` with `row_count × column_count` mono subtitle + `is_cleaned` / `status` badges + `Clean Dataset First` / `Re-Clean` (`bg-black text-white brutal-shadow`) and `Build Pipeline` (`bg-tertiary` replaced with brutal `bg-[#ffd400] text-black` where needed; kept `border-2 border-black`).

- **Workflow steps** (`flex gap-2 mb-8`): chips `px-4 py-2 border-2 font-headline text-xs font-bold uppercase`; `done` `bg-primary-container`, `active` `bg-black text-white`, `next` `bg-white hover:bg-[#ffd400]`.
- **Stats grid** (`grid-cols-2 md:grid-cols-4 gap-6`): tiles `bg-white border-2 border-black p-4 brutal-shadow` — label `font-mono text-[10px] font-black uppercase text-black/60`, value `font-mono text-3xl font-black`.
- **EDA sections** (each `bg-white border-2 border-black p-6 brutal-shadow`): `Columns & Data Types` table, `Head/Tail`, `Missing Values` (bar `h-3 border border-black bg-white` + `bg-black` fill), `Numeric Summary` (12-col table), `Outlier` cards `border-2 p-4` with `BoxPlotSVG` (`stroke 2`, `fill rgba(var(--chart-blue),0.3)`), `Categorical` (`bg-tertiary` bars replaced with `bg-black` where needed), `Correlation` SVG heatmap (`cell 48`, `fill rgba(var(--chart-blue)/red)`), `Distribution` histograms (`fill rgba(var(--chart-blue),0.3) stroke 0.5`), `Findings` (`danger/warning/info` badges).

### 4.5 Data Cleaning — `src/pages/Cleaning.tsx` (`/cleaning`)

`PageHeader` `Data Cleaning`. Dataset picker ghosts `variant ghost` now `bg-white brutal-shadow`.

- **Already Cleaned** card (`bg-white border-2 p-6 brutal-shadow`): `Already Cleaned` mono, `Open Cleaned Dataset` primary black, `View Latest Report` ghost white, `Re-clean` secondary yellow.
- **Config panel** (`bg-white border-2 p-6 brutal-shadow`): `Cleaning Steps` title mono uppercase, toggles `border-2`, selects `border-2 bg-white`, missing/outlier lists `flex gap-3 text-sm` with `font-mono` cols; Run `Button primary lg w-full sm:w-auto`.
- **Running** (`p-8 brutal-shadow`): square loader `w-6 h-6 border-[3px] border-black border-t-transparent rounded-none animate-spin` + `Running cleaning...` mono (no `rounded-full`).
- **Report** (`bg-white border-2 p-6 brutal-shadow`): header `Cleaning Report` + `New Cleaning` primary; grid `SnapshotCard` (`bg-surface-variant border-2 p-4 brutal-shadow` with mono label/value + `↓/↑` diff `text-success/text-error`); `Step Log` (`border border-black p-4 bg-surface-variant/20` + numbered black badge); `Column Changes` table with `Badge info` chips.

### 4.6 Preprocessing — `src/pages/Preprocessing.tsx` (`/preprocessing`, guarded `cleaned_dataset`)

3-step wizard (`Target & Columns` → `Config` → `Review & Execute`) `border-b-2 border-black` tabs `font-headline text-xs uppercase`.

- **Select Target** (`bg-white border-2 p-6 brutal-shadow`): `Pipeline Name` `border-2 bg-white`, dataset `select` `border-2`, column grid `border-2 border-black p-3` with cards `p-3 border-2 text-xs` active `bg-black text-white` idle `bg-surface-variant/20`.
- **Config** (`bg-white border-2 p-6 brutal-shadow`): `Section` (`border-2 p-4`) — encoding `select` + passthrough buttons `px-2 py-1 border border-black`, scaling cols toggle, `Split` range + seed `border`, `Feature Selection` checkboxes `w-4 h-4 border-black`, warning `bg-warning-container border-l-4`.
- **Review** (`bg-white border-2 p-6 brutal-shadow`): `ReviewCard` (`border-2 p-4 bg-surface-variant/10` mono label/value), imbalance `bg-red-50 border-2 border-[#ff0000]` (not `border-secondary`), `Execute Pipeline` black primary.

### 4.7 Model Training — `src/pages/ModelTraining.tsx` (`/training`, guarded `preprocessing`)

Split `lg:grid-cols-12`: left `lg:col-span-7 bg-white border-2 p-6 md:p-8 brutal-shadow` (algorithm checklist, hyperparams), right `lg:col-span-5 bg-white border-2 p-6 brutal-shadow` (job list).

- **Job list** cards `border-2 p-4 brutal-shadow-sm` idle `bg-white`, running `border-[#ff0000] bg-red-50` not acid; `selected` badge now `bg-[#ffd400] text-black border-2 border-black` (not `bg-secondary` green).
- **Log** mono `bg-black text-[#ffd400] border-2 border-black p-4 font-mono text-xs overflow-y-auto h-64 max-h-72 rounded-none`.
- Validation error `text-error font-mono`.

### 4.8 Model Comparison — `src/pages/ModelComparison.tsx` (`/compare`, guarded `model`)

Leaderboard table `bg-white border-2 border-black brutal-shadow overflow-x-auto`: header `font-mono text-[10px] uppercase`, rows `hover:bg-surface-variant/30`, best row `bg-[#ffd400]/10 border-2 border-black brutal-shadow mb-8` with `Trophy` + `Deploy` black button.

### 4.9 Visualizations — `src/pages/Visualizations.tsx` (`/visualizations`, guarded `model`)

SHAP / diagnostics. Empty: `w-20 h-20 bg-primary/10 border-2 border-black rounded-none` (was `rounded-full` — now square per zero-radius), icon. Controls `bg-black text-white brutal-shadow` + `bg-white brutal-shadow`.

### 4.10 Results & Reports — `src/pages/Results.tsx` (`/results`, guarded `training_completed`)

Reports list `bg-white border-2 border-black p-6 brutal-shadow`; modal preview `bg-white border-[3px] shadow-[8px_8px_0_0_#000] max-h-[85vh]` with `bg-black/50` scrim (no `backdrop-blur`). The `25` opacity scrim is legacy removed.

### 4.11 EDA — `src/pages/EDA.tsx` (embedded in overview, also standalone)

Shares tokens with `DatasetOverview` EDA sections: `bg-white border-2 p-6 brutal-shadow`, bars `bg-black` (not `bg-secondary` green), outlier `BoxPlotSVG` as above.

---

## 5. Components

### 5.1 PageHeader — `src/shared/components/PageHeader.tsx`

`mb-10 flex flex-col md:flex-row gap-4`.

- Eyebrow pill `inline-flex bg-white border-2 brutal-shadow-sm px-3 py-1 -rotate-1` `// PIPELINE` (`font-mono text-[10px] font-black uppercase`).
- Title `font-headline text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight text-black` — with `accent` (`bg-[#ffd400] border-2 brutal-shadow px-2 -rotate-1 inline-block`).
- Subtitle `font-mono text-xs uppercase tracking-widest text-black/70 mt-3 leading-relaxed`.
- Action slot `shrink-0` (Button).

### 5.2 Card — `src/shared/components/ui/card.tsx`

`bg-white border-2 border-black p-6 brutal-shadow rounded-none`. `CardTitle` `font-headline text-xl font-black uppercase tracking-tight text-black`. No `neo-shadow` remains in src (batch replaced via `fix.py`).

### 5.3 Button — `src/shared/components/ui/button.tsx`

Base `inline-flex font-mono font-black uppercase tracking-widest border-2 border-black rounded-none btn-press focus-visible:ring-2 ring-black offset-2 disabled:opacity-50`.

- `primary`: `bg-black text-white brutal-shadow hover:bg-black/90`
- `secondary`: `bg-[#ffd400] text-black brutal-shadow hover:bg-[#ffe066]`
- `ghost`: `bg-white text-black brutal-shadow hover:bg-[#ffd400]`
- `danger`: `bg-[#ff0000] text-white border-black brutal-shadow hover:bg-red-700`
- Sizes `sm h-8 px-3 py-1.5`, `md h-9 px-6 py-3`, `lg h-12 px-8 py-4`.

### 5.4 Badge — `src/shared/components/ui/badge.tsx`

`font-mono text-[10px] font-black uppercase tracking-widest px-2 py-1 border-2 border-black inline-flex rounded-none` — `default bg-white text-black`, `success bg-[#c8ff00]`, `warning bg-[#ffd400]`, `danger bg-[#ff0000] text-white`, `info bg-[#e0f7ff] text-black` (replaces `bg-surface-variant` etc.).

### 5.5 Input — `src/shared/components/ui/input.tsx`

`h-12 w-full rounded-none border-2 border-black bg-white px-3 font-mono text-sm tracking-widest placeholder:font-mono placeholder:text-xs placeholder:uppercase placeholder:tracking-widest placeholder:text-black/30 focus-visible:ring-[3px] focus-visible:shadow-[4px_4px_0_0_#ffd400]`. Label `font-mono text-xs uppercase tracking-widest font-black text-black mb-2`.

### 5.6 ProgressBar — `src/shared/components/ui/progress-bar.tsx`

`relative overflow-hidden border-2 border-black bg-white h-4` + fill `h-full bg-[#ffd400] border-r-2 border-black transition-all duration-700` + `active` shimmer `animate-indeterminate absolute w-1/3 bg-black/10`. For EDA `Missing` bars, height `h-3` variant.

### 5.7 EmptyState / ErrorState

As §3.4. `EmptyState` rotated `-rotate-1`, inner `rotate-1` action. `ErrorState` always red `bg-red-50 border-red-500 text-red-600` with `Button secondary`.

### 5.8 Pagination — `src/shared/components/Pagination.tsx`

`flex items-center justify-between pt-6` mono `text-sm text-black/60`, buttons `variant ghost vs primary` (`min-w-[36px]` active black).

### 5.9 ConfirmDialog — see §3.4

### 5.10 Layout Helpers

- `LoadingSpinner` / `Skeleton*` (`src/shared/components/LoadingSpinner.tsx`): brutal pulse, no `animate-spin` circle (tests now expect `animate-pulse`).
- `RouteGuard` (`src/shared/components/RouteGuard.tsx`): `bg-white border-2 p-8 brutal-shadow max-w-lg` (no `neo-shadow`).
- `GlobalErrorBoundary` (`src/shared/components/GlobalErrorBoundary.tsx`): `text-error` red icon, `bg-surface-variant rounded-none` preview.

### 5.11 ML-Specific Patterns

- **Stat tiles** (Dashboard `Rows/Cols`, Cleaning `SnapshotCard`, EDA `StatCard`): `bg-white border-2 border-black p-3 brutal-shadow-sm` + `font-mono text-[10px] uppercase text-black/60` + `font-mono text-2xl font-black`.
- **Feature importance bars** (`Home EdaChart`): `flex-1 h-2.5 bg-white border-2 border-black overflow-hidden` + fill `bg-black` / active `bg-[#ffd400]`.
- **Cleaning toggles**: `w-12 h-6 border-2 border-black relative` — `bg-black` when on, `bg-surface-variant` when off, knob `w-4 h-4 bg-white border border-black`.
- **Correlation heatmap** (`EDA CorrelationSection`): `cell 48`, `fill rgba(var(--chart-blue)/red, intensity)`, yellow `stroke` for `|r|>0.85`.
- **Histograms** (`MiniHistogram`): `fill rgba(var(--chart-blue),0.3) stroke 0.6`, KDE `stroke rgb(var(--chart-red))`.

---

## 6. Responsive & Adaptive Behavior

- **Breakpoints** mobile-first: `md 768px` (hero `text-5xl→7xl`, Home features `1→4` col, pipeline `1→2` col, banner `col→row`, Cleaning/Form `1→2` col, footer `col→row`), `lg 1024px` (Sidebar fixed, BottomNav hidden; `lg:grid-cols-12` training split), `xl 1280px` (Dashboard `2→3` col).
- **Containers:** `max-w-7xl mx-auto px-4` (chrome), `max-w-4xl` (Home docs), `max-w-2xl` (DatasetUpload demo card), `max-w-lg` (EmptyState/ConfirmDialog). Grids collapse to single column on `sm`.
- **Header:** `max-w-7xl` stays one row; buttons shrink to `text-xs` mono — no hamburger text hide; Sidebar overlay `slideIn 0.2s` on `<1024px`.
- **Tables/hists:** `overflow-x-auto` + `min-w` SVG, sticky first col not needed — horizontal scroll only.
- **Modals:** `p-4` viewport, `max-w-md` (Results preview `max-w-4xl`), `max-h-[90vh] overflow-y-auto`, yellow title bar sticky.
- **Dark mode:** not shipped — `ThemeProvider` not wired, tokens deferred. Do not use `dark:` classes.

---

## 7. Interaction, Animation & Feedback

| Trigger | Feedback |
|---|---|
| Button click | `btn-press` squash `translate(3px,3px)` + shadow `0` on `:active`; hover `bg-[#ffd400]` (ghost/secondary) or `bg-black/90` (primary) |
| Card hover | `hover:-translate-y-1 hover:rotate-0` (Home) or `hover:bg-[#ffd400]` (Sidebar/BottomNav); `Dashboard` dataset card `hover:-translate-y-1` |
| Nav active | `bg-[#ffd400] border-2 brutal-shadow-sm` (Sidebar) / `bg-black text-white` (TopNav) |
| Input focus | `ring-[3px] ring-black shadow-[4px_4px_0_0_#ffd400]` yellow offset (`src/shared/components/ui/input.tsx:24`) |
| Cleaning toggle | `bg-black` (on) ↔ `bg-surface-variant` (off), knob `left-0.5 → left-6` |
| Progress | `ProgressBar` yellow fill `transition-all 700ms`, indeterminate shimmer `animate-indeterminate`; `EDA` bars `transition-all 200ms` on hover `bg-[#ffd400]` |
| Upload drag | `border-dashed` → `border-solid bg-black/5`, title `Drop now` mono, `cloud_upload` black |
| Report generate | `animate-pop` entrance (Home hero, EmptyState `-rotate-1`, ConfirmDialog, Cleaning `SnapshotCard`), `bg-black/50` scrim |
| Copy / Download | `Download CSV` white `hover:bg-[#ffd400]`; no clipboard in MLPilot (was TypeWithMe `Copied!` — removed) |
| Disabled | `disabled:opacity-50 pointer-events-none` (demo buttons, pipeline tabs, delete) |
| Loading | `animate-pulse` skeletons `bg-white border-2 brutal-shadow` + mono `loading mlpilot...` |

---

## 8. Copy & Iconography

- **Voice:** deterministic, local-first, no hype. Lowercase mono for meta only: `// local-first ml pipeline`, `data → model`, `csv • parquet • json • xlsx`. Headlines always `UPPERCASE font-black`. CTAs always end with `→` (`New run →`, `Get Started →`, `Upload Now →`, `Start Free Run →`).
- **MLPilot strings (examples):** `MLPilot` + `DATA → MODEL`; `From Dataset to Shipped Model.` (hero, `Shipped` yellow highlight); `local-first • open pipeline`; `Highlight` banner chip; `mlpilot.run` / `model.pkl` / `leaderboard.data` window chrome (not `typing.exe`); `PIPELINE READY` / `DETERMINISTIC ENGINE`; `Ready to Pilot?` yellow CTA.
- **Forbidden (TypeWithMe leftovers — purged):** `wpm > life`, `Start Typing`, `typing.exe/code.exe`, `KEYBOARD ACCELERATOR`, `BUILT WITH BLOOD…`, `[no account needed] [free forever] [esc to restart]`, `[keep hands on home row] • [caps lock: off]`, `esc = restart`. Verified `rg` 0 matches in `src` (only `design.md` mentions).
- **Icons:** `Material Symbols Outlined` only (`dashboard`, `database`, `cleaning_services`, `process_chart`, `model_training`, `leaderboard`, `monitoring`, `description`, `analytics`, `rocket_launch`, `cloud_upload`, `grade`, `favorite`, `house`, `add`, `sync`, `check_circle`, `query_stats`, `error`). `w-4 h-4` in buttons, `text-4xl` in cards, `text-[18px]` in Sidebar. No Lucide (source used Lucide — MLPilot uses Material Symbols per `UX.md`), no emoji.

---

## 9. Page Inventory & Routes

| Route | File | Rendering | Design notes |
|---|---|---|---|
| `/` | `src/pages/Home.tsx` | Client | Own acid header (not `Layout`), hero + `Highlight` banner `border-y-[3px] bg-[#c8ff00] -rotate-1` + pipeline docs + black workflow logic + tech grid + yellow CTA + black footer |
| `/dashboard` | `src/pages/Dashboard.tsx` | Client (RQ) | `// dashboard` pill, `Welcome, Engineer` yellow highlight, dataset cards `bg-white border-2 brutal-shadow hover:-translate-y-1`, `New Dataset` white `hover:bg-[#ffd400]` |
| `/datasets` | `src/pages/DatasetUpload.tsx` | Client | `PageHeader` `Dataset Upload`, drop zone dashed `border-2 border-black`, demo brutal buttons `bg-white hover:bg-[#ffd400]`, list `border-b-2` rows + `Badge` + `Delete` danger |
| `/datasets/:id` | `src/pages/DatasetOverview.tsx` | Client | `PageHeader` with `Badge` + `Clean/Build Pipeline` buttons, `WorkflowSteps` chips, stats `grid-cols-4` tiles, EDA embed (`RawEDA`) |
| `/cleaning` | `src/pages/Cleaning.tsx` | Client | Picker ghosts, `Already Cleaned` card, `CleaningConfigPanel` toggles + `select border-2`, running square spinner, `CleaningReportView` `SnapshotCard` + step log + `Column Changes` table |
| `/preprocessing` | `src/pages/Preprocessing.tsx` | Client `RouteGuard cleaned_dataset` | 3-step tabs `border-b-2`, `Select Target` grid `2-5` cols active `bg-black text-white`, `Config` `Section border-2 p-4`, `Review` `ReviewCard` + `border-[#ff0000] bg-red-50` imbalance |
| `/training` | `src/pages/ModelTraining.tsx` | Client `RouteGuard preprocessing` | `lg:grid-cols-12`: left config `p-6 md:p-8 brutal-shadow`, right jobs list + live log `bg-black text-[#ffd400] font-mono text-xs rounded-none border-2` |
| `/compare` | `src/pages/ModelComparison.tsx` | Client `RouteGuard model` | Leaderboard `bg-white border-2 brutal-shadow overflow-x-auto`, best row `bg-[#ffd400]/10`, `Deploy` black buttons |
| `/visualizations` | `src/pages/Visualizations.tsx` | Client `RouteGuard model` | SHAP/diagnostics, empty `w-20 h-20 border-2 rounded-none` square (not circle), brutal controls |
| `/results` | `src/pages/Results.tsx` | Client `RouteGuard training_completed` | Reports `p-6 brutal-shadow`, preview modal `border-[3px] shadow-[8px_8px_0_0_#000]` `bg-black/50` scrim (no blur) |
| `*` | `src/App.tsx:87` | — | `Navigate` to `/dashboard` |

`src/pages/EDA.tsx` is legacy/embedded — primary EDA is `DatasetOverview` `RawEDA` (tables/heatmaps/histograms). `Cleaning`/`Preprocessing`/`Training` share `src/shared/components` primitives (no Radix `components/ui` beyond MLPilot's own).

---

## 10. Do / Don't (for MLPilot)

- **Do:** `bg-white border-2 border-black brutal-shadow` on every card/modal/drop-zone; `font-mono text-[10px] uppercase tracking-widest` for badges/labels/eyebrows; `bg-[#c8ff00]` header, `bg-[#ffd400]` highlights/active nav/accent; `rounded-none`; `animate-pop` on `Home` hero/`EmptyState`/`ConfirmDialog`; `bg-brutal-grid` on `Layout` + `Home` root; `Material Symbols` only; reuse `Button` (`primary/secondaty/ghost/danger`) + `Badge` + `Card` + `Input`.
- **Don't:** no `rounded-*` (even `rounded-full` → `rounded-none` via `fix.py`), no `shadow-lg/blur/gradients/backdrop-blur` (removed from `Results` modal), no `border-gray-*`, no `bg-tertiary` CTA (replaced with white/yellow/black), no non-mono stat values (use `font-mono`), no TypeWithMe copy, no emoji, no mouse-only flows (keep keyboard focus `ring-[3px] shadow-[4px_4px_0_0_#ffd400]`).
- **When extending:** duplicate `TopNav` markup (`border-b-[3px] bg-[#c8ff00]` + `w-9 h-9 bg-black shadow-[3px_3px_0_0_#fff]` + `font-mono 10px subtitle`) or import it; keep `Sidebar` measurements (`border-r-[3px]`, `px-4 py-3`, `p-6`, `brutal-shadow-sm`); modal shell `border-[3px] shadow-[8px_8px_0_0_#000] p-6` + yellow `border-b-[3px]` bar; charts use `black + #ffd400/#0055ff` bars with `border-2` tooltip `bg-white border-2 brutal-shadow-sm`; inputs use `h-12 border-2 font-mono text-sm tracking-widest focus:shadow-[4px_4px_0_0_#ffd400]`.
