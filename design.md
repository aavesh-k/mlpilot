# TypeWithMe — Frontend Design Spec

> Single source of truth for the frontend visual language, layout system, tokens, components, pages, states, and interaction patterns.
> Stack: Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS v4 + Radix UI + shadcn/new-york + Lucide + Recharts + next-themes.

---

## 1. Design Philosophy — Brutalist Typing Punk

The UI is a deliberate anti-SaaS statement. Punk zine, printed on paper, sharp enough to cut.

1. **Zero rounded corners.** `--radius: 0rem` everywhere. `rounded-none` on all cards, buttons, inputs, modals, tooltips. Overridden shadcn default (`0.625rem`) via `app/globals.css`.
2. **Hard offset shadows, no blur.** Signature: `shadow-[4px_4px_0_0_#000]`, `brutal-shadow`, `shadow-[8px_8px_0_0_#000]` for modals. Press effect collapses shadow to `0`.
3. **Thick black borders.** `border-2` standard, `border-[3px]` for header/footer/modals, `border-y-[3px]` for banners.
4. **Monospace everywhere for data/labels.** Headlines are sans (Space Grotesk), all labels/metrics/meta are mono (JetBrains Mono), uppercase + wide tracking.
5. **Loud, tight palette.** Black, white, acid green `#c8ff00`, safety yellow `#ffd400` / `yellow-300`, alert red `red-600` / `#ff0000`.
6. **Deliberate imperfection.** `-rotate-1`, `-rotate-2`, `rotate-1` badges/cards, asymmetric grids, fake window chrome (`typing.exe`, `code.exe`).
7. **No-bullshit copy.** Lowercase mono microcopy: `wpm > life`, `[no account needed] [free forever] [esc to restart]`, `// the internet's brutalist typing trainer`, `BUILT WITH BLOOD, SWEAT & BRUTALISM`.
8. **Keyboard-first.** Hidden input auto-focused, click-anywhere to refocus, `Esc` to restart, `[ESC] restart • [⚙] customize` hints under test.

---

## 2. Design Tokens

### 2.1 Color

Source: `app/globals.css` (`:root` + `.dark`) mapped via `@theme inline` to Tailwind tokens. `styles/globals.css` is legacy/unused — ignore it.

| Token | Light (`:root`) | Dark (`.dark`) | Usage |
|---|---|---|---|
| `--background` | `oklch(0.97 0.005 95)` warm paper | `oklch(0.145 0 0)` near-black | Page bg, pairs with `bg-brutal-grid` |
| `--foreground` | `oklch(0 0 0)` black | `oklch(0.985 0 0)` white | Body text |
| `--card` / `--popover` | `oklch(1 0 0)` white | `oklch(0.145 0 0)` | Cards, modals, popovers |
| `--primary` | `oklch(0 0 0)` black | `oklch(0.985 0 0)` white | Primary buttons (`bg-black text-white`) |
| `--secondary` | `oklch(0.92 0.14 85)` acid yellow | `oklch(0.269 0 0)` | Secondary accents |
| `--muted` | `oklch(0.94 0 0)` | `oklch(0.269 0 0)` | Muted surfaces |
| `--muted-foreground` | `oklch(0.45 0 0)` | `oklch(0.708 0 0)` | `text-black/60`, `text-black/70` meta |
| `--border` / `--input` / `--ring` | `oklch(0 0 0)` black | grays | All borders/rings are black in light mode |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.396 0.141 25.723)` | Errors, clear-stats, incorrect chars |
| `--radius` | `0rem` (all `--radius-*` = `0`) | same | No rounding, ever |
| `--chart-1..5` | black, `oklch(0.85 0.19 85)` yellow, red, green, blue | blue/green/yellow/purple/red | Recharts bars |

Brand hexes (hardcoded in classes, not tokens):

| Hex | Name | Usage |
|---|---|---|
| `#c8ff00` | Acid green | Header bg (`bg-[#c8ff00]`), multiplayer create-room card, black-on-green badges |
| `#ffd400` | Safety yellow | Cursor, highlights, `bg-yellow-300` title bars, button shadows `shadow-[6px_6px_0_0_#ffd400]` |
| `#e0f7ff` | Ice blue | Multiplayer join-room card |
| `#059a2e` / `green-100` | Correct green | `--typing-correct`, `bg-green-100` correct chars |
| `#ff0000` / `red-600` / `red-500` | Alert red | `--typing-incorrect`, `bg-red-600` wrong chars, `text-red-600` accents, destructive buttons |
| `#000` / `#fff` | Ink / Paper | Borders, shadows, logo block, primary buttons |

Typing-specific vars (`app/globals.css`):

```css
--typing-correct: #059a2e;
--typing-incorrect: #ff0000;
--typing-cursor: #ffd400;
--typing-accent: #ffd400;
::selection { @apply bg-yellow-300 text-black; }
```

### 2.2 Typography

Loaded in `app/layout.tsx` via `next/font/google`:

| Role | Font | Tailwind | Usage |
|---|---|---|---|
| Headlines / UI | `Space Grotesk` (`--font-space-grotesk`) | `font-sans` (default `body`) | `text-5xl md:text-7xl font-bold uppercase tracking-tight`, logo `text-2xl` |
| Data / labels / typing text | `JetBrains Mono` (`--font-jetbrains-mono`) | `font-mono` | All badges, tiles, timers, code, buttons, microcopy |

Type scale in use:

- Hero: `text-5xl md:text-7xl font-bold uppercase tracking-tight leading-none`
- Page titles (auth/multiplayer): `text-4xl sm:text-5xl font-bold uppercase tracking-tight leading-none`
- Section titles: `text-xl font-bold uppercase tracking-tight`, `text-3xl font-bold uppercase`
- Metrics: `font-mono text-3xl` (tiles), `text-7xl` (grade), `text-lg` (correct/incorrect)
- Typing surface: `font-mono text-xl leading-relaxed` (words/quotes), `font-mono text-lg leading-relaxed` (code)
- Labels: `font-mono text-[10px] uppercase tracking-widest` (badges, eyebrows, footers), `font-mono text-xs uppercase tracking-widest` (descriptions, form labels)
- Body/descriptions: `font-mono text-xs uppercase tracking-widest text-black/70 leading-relaxed`

Rules: headlines always `uppercase tracking-tight`; mono labels always `uppercase tracking-widest`; placeholders styled as mono uppercase (`placeholder:font-mono placeholder:text-xs placeholder:uppercase placeholder:tracking-widest placeholder:text-black/30`).

### 2.3 Spacing, Borders, Shadows, Motion

- **Layout widths:** `max-w-7xl` (header/footer/test shell), `max-w-4xl` (landing features/samples), `max-w-3xl` (hero + typing window), `max-w-2xl` (multiplayer card, results chart), `max-w-md` (auth cards, modals), `max-w-lg` (results stat grids).
- **Padding:** page `px-4 py-16`, cards `p-6` / `p-8`, tiles `px-6 py-3/4`, modal header `px-6 py-4`, modal body `p-6`.
- **Borders:** `.brutal-border { border: 2px solid #000 }`; header/footer `border-b-[3px]/border-t-[3px]`; modal shell `border-[3px]`; title bars `border-b-2/border-b-[3px]`.
- **Shadows:** `.brutal-shadow { box-shadow: 4px 4px 0 0 #000 }`; hero CTA `shadow-[6px_6px_0_0_#ffd400]`; grade tile `shadow-[6px_6px_0_0_#000]`; modals `shadow-[8px_8px_0_0_#000]`; logo block `shadow-[3px_3px_0_0_#fff]`; buttons `shadow-[3px_3px_0_0_#000]`.
- **Press interaction:** `.btn-press { transition: transform .05s, box-shadow .05s }` + `:active { translate(3px,3px); shadow 0 }`. Baked into `buttonVariants` base.
- **Background:** `.bg-brutal-grid` — paper bg + 28px grid (`rgba(0,0,0,.06)` 1px lines). Applied to every page root (`min-h-screen bg-brutal-grid flex flex-col`).
- **Keyframes:** `blink` (1s cursor), `pop` (0.3s scale .95→1.05→1 modal/card entrance via `.animate-pop`); `animate-pulse` for skeletons; hover lifts `hover:-translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_0_#000]`, rotation resets `hover:rotate-0`.

---

## 3. Global Chrome (shared across pages)

### 3.1 Header

`components/Header.tsx` (test page) + inline duplicates on landing/login/signup/multiplayer (same markup).

- Container: `border-b-[3px] border-black bg-[#c8ff00] sticky top-0 z-50`, inner `max-w-7xl mx-auto px-4 py-3 flex items-center justify-between`.
- Brand (left, `Link /`): black 36px square (`w-9 h-9 bg-black shadow-[3px_3px_0_0_#fff]`) with yellow `T` (`text-yellow-300 font-bold text-xl`), + stacked wordmark: `TypeWithMe` (`text-2xl font-bold uppercase tracking-tight`) over `KEYBOARD ACCELERATOR` (`font-mono text-[10px] uppercase tracking-widest text-black/70`).
- Actions (right): landing/auth/multiplayer show single `Start Typing` / `Practice Solo` button (`variant="secondary" size="sm" bg-[#c8ff00]`); test page shows `Stats` (`variant="outline" bg-white`, `BarChart3` icon), `Settings` (`variant="secondary"`, `Settings` icon), `Multiplayer` (`variant="secondary"`, `Users` icon).

### 3.2 Footer

Landing/login/signup/multiplayer only (test page has none).

- `border-t-[3px] border-black bg-white`, inner `max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2`.
- Left: `TYPEWITHME © 2026 — BUILT WITH BLOOD, SWEAT & BRUTALISM`; right: `wpm > life`. Both `font-mono text-[10px] uppercase tracking-widest text-black/60`.

### 3.3 Loading / Fallbacks

- `app/loading.tsx` + `app/test/loading.tsx`: centered black `T` block + `loading typewithme...` mono label + brutal progress bar (`w-48 h-3 bg-white border-2 border-black brutal-shadow`, inner `bg-yellow-300 w-2/3 animate-pulse`).
- `components/fallbacks.tsx`: `ResultsFallback` (grade `?` tile + 3 empty tiles + `crunching numbers...`), `ModalFallback` (`h-72` bordered box + `loading...`), `SamplesFallback` (2× `h-48` cards). All `animate-pulse`, used as `Suspense`/`dynamic` loaders.

---

## 4. Pages

### 4.1 Landing — `app/page.tsx` (SSR, `revalidate = 3600`)

Structure: header → hero → multiplayer banner → features → daily samples (`Suspense`) → footer.

- **Hero** (`max-w-3xl text-center animate-pop`): eyebrow pill (`bg-white border-2 brutal-shadow px-4 py-1 font-mono text-xs uppercase -rotate-1`, `// the internet's brutalist typing trainer`); headline `TYPE [FASTER] BEAT THE CLOCK` with `FASTER` as yellow highlight (`bg-yellow-300 border-2 brutal-shadow px-3 mx-2 -rotate-2`) and `CLOCK` in red; sub (`font-mono text-sm md:text-base uppercase text-black/70`); CTA `Start Typing →` (`size="lg" px-10 py-5 text-lg bg-black text-white shadow-[6px_6px_0_0_#ffd400] hover:bg-black/80`); microcopy `[no account needed] [free forever] [esc to restart]`.
- **Multiplayer banner** (`border-y-[3px] bg-[#c8ff00] w-full -rotate-1`): `Up Next` black-on-green chip + `Introducing Multiplayer mode — here, you can compete with your friends.` + `— me` + black `Compete — Now` button → `/login`.
- **Features** (`grid md:grid-cols-3 gap-6 max-w-4xl`): white cards (`bg-white border-2 brutal-shadow p-6` + hover lift) with `Timed 00:60`, `Words 500 WPM?`, `Code </>` — title left, black/yellow tag right, mono uppercase desc.
- **DailySamples** (SSR server component reading `data/texts.json`): 2-col grid; quote card (`-rotate-1`, `daily quote` black chip) + code card (`rotate-1`, `random snippet` yellow chip), both `hover:rotate-0`.

### 4.2 Typing Test — `app/test/page.tsx` (client, heart of app)

Shell: `min-h-screen bg-brutal-grid` with `onClick → inputRef.focus()`, `Header`, `max-w-7xl` main. `mounted` gate renders empty grid div pre-hydration (avoids Zustand persist mismatch).

States:

1. **Pre-start:** mode badge (`TEST MODE: {mode}` in white pill) + `⏱ {N} second test • press esc to restart` (timed only) + `TypingDisplay` with `Start typing to begin` yellow pill + footer hint `[ESC] restart • [⚙] customize` / `CLICK ABOVE TO START`.
2. **Active:** hidden input (`absolute opacity-0 w-0 h-0 autoFocus spellCheck=false`, capped at text length) drives `TypingDisplay`; stats tick live; footer shows `TEST IN PROGRESS...`.
3. **Complete:** swaps to `ResultsScreen` (`Suspense` + `dynamic ssr:false`); `Esc` disabled when modals open.

Modals (`dynamic ssr:false` + `ModalFallback`): `SettingsModal`, `StatsModal` as fixed overlays (see §5.4).

### 4.3 Auth — `app/login/page.tsx`, `app/signup/page.tsx` (client)

Shared shell: header + centered `max-w-md bg-white border-2 brutal-shadow p-8 animate-pop` card + footer.

- Card header row: `// AUTH PORTAL [01|02]` gray mono + right chip (`strict mode` / `free forever`: `bg-black text-yellow-300 border-2 px-2 py-0.5`).
- Title: login `Welcome [back]` / signup `Create [your] account` — `text-4xl font-bold uppercase leading-none` with yellow rotated highlight.
- Form: `space-y-5`; labels `> user / email`, `> password`, `> handle` (`font-mono text-xs uppercase text-black/80`); inputs `h-12 rounded-none border-2 border-black font-mono text-sm tracking-widest` with yellow focus shadow (`focus-visible:ring-[3px] focus-visible:shadow-[4px_4px_0_0_#ffd400]`); password eye toggle (36px bordered square button, `Eye/EyeOff`); login has `lost?` underline link + `Sign in with GitHub` outline button; signup adds hint `[ 8+ chars ] • [ 1 number ] • [ no excuses ]` + terms line.
- Submit: `h-12 w-full bg-black text-[#c8ff00] shadow-[4px_4px_0_0_#ffd400]` (`Login →` / `Sign up →`); divider `or` for login; bottom cross-link (`border-t-2 pt-4`, bold underline link with `hover:bg-yellow-300`).
- Behavior: `fetch /api/login|signup` → success pushes `/test` (login) or `/login` (signup); login failure → `alert("Invalid Credentials...")`.

### 4.4 Multiplayer Lobby — `app/multiplayer/page.tsx` (client)

Card: `max-w-2xl` (wider than auth). Title `Race [your] friends` + `Strap in...` sub. `callsign` input (`maxLength 30`). Two-col (`md:grid-cols-2`) action cards:

- **Create room** (`bg-[#c8ff00]`): `Users` icon + `host the party` eyebrow + copy `Get a room code...` + black button `Create →` (`shadow-[4px_4px_0_0_#fff]`).
- **Join room** (`bg-[#e0f7ff]`): `DoorOpen` icon + `join the party` + uppercase room-code input (`maxLength 6`, auto-uppercase) + `Join →`.
- Errors: red pop box (`bg-red-100 border-2 border-red-500 brutal-shadow`, `AlertCircle`); loading: `Loader2 animate-spin` inside buttons; buttons disabled without callsign (+room code for join).
- **Room-created modal:** `max-w-md border-[3px] shadow-[8px_8px_0_0_#000]`, acid title bar (`// ROOM CREATED [01]` + `Your room` + X), giant code display (`border-[3px] bg-yellow-300 py-7`, `text-5xl tracking-[0.3em]` + `select-all`), `Copy code` / `Enter Room →` split buttons, `[ room lives until the host leaves ]` microcopy. Copy uses `navigator.clipboard` + `Copied!` 1.5s feedback.
- Room pages (`app/multiplayer/[roomCode]/`, `room/`) reuse same shell — style new race UI with identical tokens/chrome.

---

## 5. Components

### 5.1 TypingDisplay — `components/TypingDisplay.tsx`

Vertical stack (`flex flex-col items-center gap-10 py-16 px-4`):

- **Stat tiles** (`flex gap-6`): WPM (`toFixed(2)`), ACC (`toFixed(1)%`), TIME/ELAPSED (`{n}s`) — each `bg-white px-6 py-3 border-2 brutal-shadow`, value `font-mono text-3xl`, label `font-mono text-[10px] uppercase text-black/60`. Timed mode counts down `timeLeft`; others count up `duration - timeLeft`.
- **Typing window** (`max-w-3xl w-full border-2 brutal-shadow bg-white`): title bar (`flex justify-between border-b-2 px-4 py-1.5 font-mono text-[10px] uppercase bg-yellow-300`: `typing.exe|code.exe` left, `esc = restart` right); body `px-6 py-8 min-h-32`.
  - Words/quotes: `flex flex-wrap gap-1 font-mono text-xl`, words kept intact (`inline-flex whitespace-nowrap`), spaces as `\u00A0`.
  - Code: `flex flex-col font-mono text-lg overflow-x-auto`, indent preserved (`\u00A0`), per-line offsets for cursor mapping.
- **Char states:** untyped `text-black/35`; correct `text-black bg-green-100`; wrong `text-white bg-red-600`; cursor `bg-yellow-300 text-black animate-blink` (only when active). `transition-colors` on each char.

### 5.2 ResultsScreen — `components/ResultsScreen.tsx` (`dynamic ssr:false`)

Stack (`gap-10 py-16 px-4`): rotated grade tile (`w-36 h-36 bg-yellow-300 border-[3px] shadow-[6px_6px_0_0_#000] -rotate-2 hover:rotate-0`, `font-mono text-7xl`: S+ ≥100, S ≥90, A+ ≥80, A ≥70, B ≥60, C ≥50, D ≥40, else F) + `Test Complete!` (`!` red).

- Primary stats (`grid-cols-3 max-w-lg`): WPM, Accuracy, Raw WPM tiles.
- Secondary (`grid-cols-2 max-w-lg`): Correct / Incorrect (red) / Total Chars / Mode (capitalized).
- Chart (`max-w-2xl border-2 brutal-shadow p-6`, last 5 tests reversed `T1..Tn`): Recharts `BarChart` — `CartesianGrid strokeDasharray 4 4 #000`, mono 12px axes, tooltip `bg-white border-2 shadow 3px`, `Bar wpm fill #000` + `Bar accuracy fill #ffd400 stroke #000 1.5`.
- Actions: `Try Again` (`bg-yellow-300 hover:bg-yellow-200 px-8`) + `Home` (`variant="outline" bg-white px-8`).

### 5.3 Header — `components/Header.tsx`

See §3.1. Test-page variant adds Stats/Settings/Multiplayer buttons with Lucide `BarChart3/Settings/Users` (`w-4 h-4 mr-1`).

### 5.4 Modals — Settings / Stats

Shared shell: `fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4` → panel `bg-white border-[3px] shadow-[8px_8px_0_0_#000] max-w-md w-full max-h-[90vh] overflow-y-auto animate-pop` → colored title bar (`border-b-[3px]`, X close: `border-2 bg-white hover:bg-red-500 hover:text-white brutal-shadow`, `size="icon-sm"`) → `p-6 space-y-8` body → `border-t-[3px] p-6` footer.

- **SettingsModal** (yellow `bg-yellow-300` bar, `⚙ Settings`): `Test Mode` 2-col toggle grid (timed/words/quotes/code); conditional `Duration` 4-col (15/30/60/120s), `Word Count` 4-col (25/50/75/100), `Text Size` 3-col (small/medium/large); toggle style `px-4 py-2 font-mono text-sm font-bold uppercase border-2 btn-press` — active `bg-black text-white brutal-shadow`, idle `bg-white hover:bg-yellow-200`. Sound row (`border-y-[3px]`): custom 80×36 brutal switch (`border-2 brutal-shadow`, knob slides `left-0 ↔ left-12`, `Volume2/VolumeX`, `on/off` label; on = `bg-yellow-300` + black knob). Footer: full-width black `Close` (`shadow-[4px_4px_0_0_#ffd400]`).
- **StatsModal** (cyan `bg-cyan-300` bar, `// Statistics`): empty state = dashed border box (`border-2 border-dashed`, `No tests completed yet. / Go type something!`); else 2-col tiles (Total Tests, Avg WPM, Best WPM, Avg Accuracy), `By Mode` rows (mode + yellow count chip), `Recent Tests` scroll list (`max-h-40 overflow-y-auto`: mode + date left, WPM + % right). Footer: red `Clear` (`bg-red-500`, `Trash2`, `confirm()` gate) + black `Close`.

### 5.5 DailySamples / Buttons / UI kit

- **DailySamples** (§4.1): server component, two tilted preview cards.
- **Button** (`components/ui/button.tsx`, cva): base = `btn-press ... border-2 border-black font-bold uppercase`; variants — `default: bg-white shadow hover:bg-yellow-300`, `destructive: bg-red-600 text-white`, `outline: transparent shadow hover:bg-yellow-200`, `secondary: bg-yellow-300 hover:bg-yellow-200`, `ghost: border-transparent hover:bg-black hover:text-white`, `link: underline hover:bg-yellow-200`; sizes `sm h-8`, `default h-9`, `lg h-10`, `icon*`. Focus: `focus-visible:ring-2 ring-black offset-2`.
- **UI kit** (`components/ui/`, 50+ Radix/shadcn files): available but only `button`, `input`, `label` are used in current screens — all inherit zero-radius + black borders via tokens. New screens should compose from this kit, not add deps. `theme-provider.tsx` (`next-themes`) is present but not yet wired in `layout.tsx` — dark tokens exist for future use.

---

## 6. Responsive & Adaptive Behavior

- **Breakpoints:** mobile-first; `md:` (768px) upgrades hero (`text-5xl→7xl`), features (1→3 col), samples (1→2 col), multiplayer actions (1→2 col), footer (col→row).
- **Containers:** `max-w-* + mx-auto + px-4` everywhere; grids collapse to single column on small screens; toggle grids stay 2/3/4-col even on mobile (small tap targets, acceptable for settings).
- **Header:** brand + actions stay one row; on narrow screens buttons shrink to `size="sm"` with icons — keep labels (no hamburger).
- **Typing window:** `max-w-3xl w-full`, code mode scrolls horizontally (`overflow-x-auto`); words wrap with `flex-wrap` + no-break words.
- **Modals:** `p-4` viewport padding, `max-w-md` (lobby `max-w-2xl`), `max-h-[90vh] overflow-y-auto`, sticky title bar.
- **Dark mode:** tokens defined, not active (no `ThemeProvider` in tree, no toggle). Do not ship dark-specific classes until provider is wired; when adding, use semantic tokens (`bg-background text-foreground border-border`) not hardcoded `bg-white text-black`.

---

## 7. Interaction, Animation & Feedback

| Trigger | Feedback |
|---|---|
| Keystroke (correct) | Char → `bg-green-100`, 800→1000Hz blip (Web Audio, rate-limited 8/s) |
| Keystroke (wrong) | Char → `bg-red-600 text-white`, 400→200Hz drop |
| Cursor | Yellow block `animate-blink` (1s steps), advances per char |
| Test start | `isActive` flips on first char, countdown `setInterval` 1s, `TEST IN PROGRESS...` |
| Test end | `animate-pop` results, success arpeggio, grade tile `-rotate-2`, chart render |
| Buttons | `btn-press` squash + shadow collapse on `:active`; hover yellows |
| Cards | `hover:-translate-y-1 hover:shadow-[2px...]` (features), `hover:rotate-0` (samples, grade) |
| Modals | `animate-pop` entrance, `bg-black/50` scrim, X turns red on hover |
| Focus | Inputs: yellow offset shadow + 3px black ring; buttons: 2px black ring |
| Loading | `animate-pulse` skeletons + mono status lines (`crunching numbers...`) |
| Copy code | `Copied!` 1.5s swap via clipboard API |
| Disabled | `disabled:opacity-50 pointer-events-none` (room buttons need callsign/code) |

---

## 8. Copy & Iconography

- **Voice:** terse, lowercase-mono, confrontational-playful. CTAs end with `→`. Never add rounded-friendly SaaS copy.
- **Recurring strings:** `KEYBOARD ACCELERATOR`, `[no account needed] [free forever] [esc to restart]`, `[ESC] restart • [⚙] customize`, `CLICK ABOVE TO START`, `wpm > life`, `// ...` eyebrows, `[ keep hands on home row ] • [ caps lock: off ]`.
- **Icons:** Lucide only (`Settings`, `BarChart3`, `Users`, `Eye/EyeOff`, `X`, `Trash2`, `DoorOpen`, `Loader2`, `AlertCircle`). `w-4 h-4` in buttons, `size-5` in cards, `size-9` eye toggle box. No emoji in UI except `⚙` in Settings title (keep as-is).

---

## 9. Page Inventory & Routes

| Route | File | Rendering | Design notes |
|---|---|---|---|
| `/` | `app/page.tsx` | SSR (`revalidate 3600`) | Hero + banner + features + `DailySamples` (Suspense) |
| `/test` | `app/test/page.tsx` | Client (`dynamic` results/modals) | Mode badge + `TypingDisplay` + hints; hidden input |
| `/login` | `app/login/page.tsx` | Client | `max-w-md` auth card, GitHub button, cross-link to signup |
| `/signup` | `app/signup/page.tsx` | Client | Same card + handle field + password rules + terms |
| `/multiplayer` | `app/multiplayer/page.tsx` | Client | `max-w-2xl` lobby, create/join cards, room-code modal |
| `/multiplayer/[roomCode]` | `app/multiplayer/[roomCode]/` | Client (WIP) | Follow lobby tokens/chrome for race UI |
| `/api/login`, `/api/signup`, `/api/rooms/*` | `app/api/` | Route handlers | No UI; error strings surface in red pop boxes |

---

## 10. Do / Don't (for future work)

- **Do:** `border-2 border-black` + `brutal-shadow` on every surface; `font-mono uppercase tracking-widest` for labels; `bg-[#c8ff00]` header, `bg-yellow-300` title bars/highlights; `rounded-none`; `animate-pop` on entrances; `bg-brutal-grid` page roots; Lucide icons; reuse `Button` variants.
- **Don't:** no `rounded-*`, no `shadow-lg/blur/gradients`, no gray borders (`border-gray-*`), no non-mono metrics, no centered-only desktop layouts without mobile collapse, no new color outside palette without updating §2.1, no emoji copy, no mouse-only flows (keep `Esc`/autofocus).
- **When extending:** duplicate header/footer markup verbatim (or extract to shared component); keep modal shell measurements (`border-[3px]`, `shadow-[8px...]`, `p-6`); charts use black + `#ffd400` bars with brutal tooltip; form inputs reuse `inputClassName` from auth/multiplayer pages.
