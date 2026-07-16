# MLPilot — UX Design

---

## 1. Navigation Architecture

### 1.1 Global Navigation Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TOP NAV (persistent)                        │
│  [Logo]  [Home]  [Dashboard]  [Datasets]  [Results]  [Settings]    │
│                                              [Avatar ▼]            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────── SIDEBAR ────────┐  ┌────────── CONTENT AREA ──────────┐ │
│  │                         │  │                                    │ │
│  │  SECTIONS               │  │  ┌── PageHeader ──────────────┐   │ │
│  │  ML Workflow            │  │  │  Title | Subtitle | [CTA] │   │ │
│  │                         │  │  └────────────────────────────┘   │ │
│  │  [●] Overview           │  │                                    │ │
│  │  [ ] Dataset            │  │  ┌── Content ──────────────────┐   │ │
│  │  [ ] Training           │  │  │                              │   │ │
│  │  [ ] Cleaning           │  │  │  (cards / tables / forms /   │   │ │
│  │  [ ] Preprocessing      │  │  │   charts / wizards)           │   │ │
│  │  [ ] Leaderboard        │  │  │                              │   │ │
│  │  [ ] Visualizations     │  │  └──────────────────────────────┘   │ │
│  │  [ ] Reports            │  │                                    │ │
│  │                         │  │  ┌── Pagination (if needed) ───┐  │ │
│  │  ─────────────────────  │  │  └──────────────────────────────┘  │ │
│  │  Downloads              │  │                                    │ │
│  │                         │  │                                    │ │
│  └─────────────────────────┘  └────────────────────────────────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     BOTTOM NAV (mobile only)                        │
│  [Home]  [Datasets]  [Train]  [Results]  [Settings]                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Navigation Rules

| Rule | Detail |
|---|---|
| **Sidebar highlights active section** | Active nav item gets yellow background (`bg-primary-container`) + black borders. Inactive items are grey text that turns black on hover. Hover moves item 4px right. |
| **TopNav shows page hierarchy** | Breadcrumb-free. TopNav highlights the current section group. Sidebar shows the specific subsection. |
| **Sidebar collapses on < 1024px** | Becomes hamburger-triggered overlay; body scrolls underneath. |
| **BottomNav appears on < 768px** | Fixed bottom bar with 5 core icons. Replaces sidebar entirely. |
| **No back button in sidebar** | Use browser back or breadcrumb in PageHeader for deep pages. |
| **Keyboard shortcut** | `Ctrl+K` opens a command palette for instant navigation to any page. |

### 1.3 Page Transitions

- Route changes fade in content (200ms ease-in-out)
- Sidebar navigation feels instant (no page reload; React Router client-side)
- Tab switches within a page (e.g., Dataset Detail tabs) are instant
- Modal/dialog overlays slide up from bottom (300ms ease-out)

---

## 2. Dashboard

### 2.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome, Engineer                                              │
│  Your latest models are converging.                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Alpha-Neural │  │ Project:     │  │ [+ Initiate          │  │
│  │ -X           │  │ Gamma        │  │  Sequence ]          │  │
│  │ Active Run   │  │              │  │  Create New Project  │  │
│  │ 98.4% Acc    │  │ 84.1% Acc    │  └──────────────────────┘  │
│  │ 1.2GB        │  │ 450MB        │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
│  ┌──────────────────────────────┐  ┌────────────────────────┐  │
│  │ Recent Activity              │  │ Cluster Health         │  │
│  │ ● Hyper-parameter Tuning     │  │ GPU ████████░░ 88%    │  │
│  │ ● Model Exported             │  │ Storage ████░░░░ 42%  │  │
│  │ ● Convergence Alert          │  │ Throughput ▆▆▆░░░░    │  │
│  └──────────────────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 States

| State | Behaviour |
|---|---|
| **Loading** | 3 skeleton cards in the project grid. Activity log shows 3 skeleton rows. Cluster health shows skeleton bars. |
| **Empty** (first visit) | Welcome message changes to "Welcome to MLPilot. Upload your first dataset to begin." Big CTA button: "Upload Dataset". No project cards shown. |
| **Empty** (no recent activity) | Activity log shows "No recent activity. Start a training run to see logs here." disabled grey text. |
| **Error** (cluster health) | Cluster health section shows red badge "Connection lost" with retry button. Other sections remain functional. |
| **Data** (normal) | As designed above. |

### 2.3 Interactions

- **Project card hover:** Card title turns blue. Shadow deepens. Cursor pointer.
- **Project card click:** Navigates to dataset detail for that project.
- **Initiate Sequence card hover:** Yellow plus icon rotates 90 degrees. Shadow moves (active state effect).
- **Activity log dots:** Scale up 125% on hover. Colour indicates severity (blue = info, red = alert, yellow = warning).
- **Cluster health bars:** Animate width on mount (css transition 1s ease-out).

---

## 3. Upload Flow

### 3.1 Step-by-Step Flow

```
  Step 1: Navigate to /datasets → Click "Upload Dataset"
      │
  Step 2: Drop zone appears (full-width card)
      │  ┌─────────────────────────────────────────────────┐
      │  │     ☁ cloud_upload                              │
      │  │     DROP FILES HERE                             │
      │  │     or click to browse — Max 5GB                │
      │  │                                                 │
      │  │     Supported: CSV, Parquet, JSON, Excel (.xlsx)│
      │  └─────────────────────────────────────────────────┘
      │
  Step 3: User drops file or clicks browser
      │
  Step 4: File validation (client-side)
      │  ├── Valid → Show progress bar, upload begins
      │  └── Invalid → Inline error below drop zone
      │
  Step 5: Upload progress
      │  ┌─────────────────────────────────────────────────┐
      │  │  training_data_v3.csv                           │
      │  │  ████████████████████████░░░░░░░░░  68%         │
      │  │  1.2 GB / 1.8 GB  •  12 seconds remaining      │
      │  └─────────────────────────────────────────────────┘
      │
  Step 6: Server ingestion → Redirect to /datasets/{id}
      │  ┌─────────────────────────────────────────────────┐
      │  │  ✅ Dataset uploaded successfully               │
      │  │  Analyzing 10,240 rows × 12 columns...          │
      │  └─────────────────────────────────────────────────┘
      │
  Step 7: Dataset detail page with tabs:
      ├─ Overview (stats)
      ├─ EDA (analysis)
      ├─ Preprocessing (pipeline builder)
      └─ Models (trained models)
```

### 3.2 States

| State | Behaviour |
|---|---|
| **Idle** | Dashed border, centred icon + text. Arrow cursor changes to pointer when hovering over the drop zone. |
| **Drag hover** | Border becomes solid primary colour (#1a1a1a). Background fills with 5% black. "Drop now" text appears. |
| **Uploading** | Dashed border replaced with solid. Progress bar fills. File name + size shown. Cancel button (X) visible. |
| **Upload complete** | Progress bar turns green (or primary-container yellow). Checkmark icon appears. Auto-redirects after 1.5s. |
| **Error** (size) | "File exceeds maximum size of 5 GB" below drop zone. Red left border. Drop zone remains active. |
| **Error** (format) | "Unsupported file format. Supported: CSV, Parquet, JSON, Excel" below drop zone. |
| **Error** (server) | Red error banner: "Upload failed: [server message]" with retry button. |

### 3.3 Interactions

- **Drag-and-drop:** Entire card is a drop target. Clicking anywhere opens file browser.
- **Progress cancel:** Click X to abort. File is deleted from server. Toast: "Upload cancelled".
- **Multiple uploads:** Queue files. Show each with its own progress bar. Upload sequentially.
- **Recent uploads table:** Shows last 5 uploads with status badge. Click to navigate to detail.

---

## 4. Pipeline Flow

### 4.1 Step-by-Step Flow

```
  Entry: Dataset Detail → "Preprocessing" tab
      │
  Step 1: See existing pipelines OR "Create Pipeline"
      │  ┌─────────────────────────────────────────────────┐
      │  │  No preprocessing pipelines yet.                │
      │  │  [ + Create Pipeline ]                          │
      │  └─────────────────────────────────────────────────┘
      │
  Step 2: Pipeline builder
      │  ┌──────────── LEFT ────────────┐  ┌── RIGHT ──────┐
      │  │  PIPELINE STEPS              │  │ Column Mapping │
      │  │                              │  │                │
      │  │  01  Missing Value Imputation│  │ feature_a →   │
      │  │      ┌─ strategy: mean ──┐   │  │   Scale       │
      │  │      └───────────────────┘   │  │ feature_b →   │
      │  │  02  One-Hot Encoding        │  │   One-Hot     │
      │  │  03  Standard Scaling        │  │ target →      │
      │  │  04  Train-Test Split  ─ 80/20│ │   Passthrough │
      │  │                              │  │                │
      │  │  [ + Add Step ]              │  │                │
      │  │  [ ▶ Execute Pipeline ]      │  │                │
      │  └──────────────────────────────┘  └────────────────┘
      │
  Step 3: Execute → Progress
      │  ┌─────────────────────────────────────────────────┐
      │  │  Pipeline Running                               │
      │  │                                                 │
      │  │  ✅  01  Missing Value Imputation               │
      │  │  ✅  02  One-Hot Encoding                       │
      │  │  ⏳  03  Standard Scaling                       │
      │  │  ⬜  04  Train-Test Split                       │
      │  └─────────────────────────────────────────────────┘
      │
  Step 4: Complete
      │  Pipeline completed. Processed data ready for training.
      │  [ Train Models ▸ ]
```

### 4.2 States

| State | Behaviour |
|---|---|
| **Empty** | "No pipelines yet" illustration. Large CTA button. |
| **Draft** (adding steps) | Steps listed vertically. Each step has config dropdown. Reorder via drag handle (≡). |
| **Validating** | Check marks appear as steps pass validation. Red X on invalid config with message. |
| **Running** | Steps animate through. Current step pulses yellow. Completed steps show green check. |
| **Completed** | All steps green. Success banner. "Train Models" CTA appears. |
| **Failed** | Failed step shows red X. Error message displayed inline. Retry button. |

### 4.3 Interactions

- **Drag to reorder:** Grab the ≡ handle. Other steps shift to make space. Drop to place.
- **Step config click:** Click a step row to expand/collapse its config panel.
- **Add step:** Opens a dialog with available step types. Each type has a short description.
- **Column mapping** auto-populates from dataset columns. User can override per-step.
- **Train-Test Split** shows a slider (0.1–0.5) with percentage label.

---

## 5. Results & Reports

### 5.1 Model Comparison Leaderboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  Model Comparison                                                    │
│  Cross-validated performance across all trained models.              │
│                                                                     │
│  ┌──────┬──────────┬──────────┬─────────┬────────┬────────────────┐│
│  │ Model│ F1-Score │ Precision│ Recall  │ Accuracy│                ││
│  ├──────┼──────────┼──────────┼─────────┼────────┼────────────────┤│
│  │ 🏆 RF │   0.962  │  0.958   │  0.967  │ 96.2%  │ [Deploy]       ││
│  │ XGB  │   0.947  │  0.941   │  0.953  │ 94.7%  │ [Deploy]       ││
│  │ SVM  │   0.912  │  0.908   │  0.916  │ 91.2%  │ [Deploy]       ││
│  │ LR   │   0.884  │  0.879   │  0.889  │ 88.4%  │ [Deploy]       ││
│  └──────┴──────────┴──────────┴─────────┴────────┴────────────────┘│
│                                                                     │
│  Best Model: Random Forest — 96.2% accuracy                         │
│  [ Deploy to Registry ]                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Results History

```
┌─────────────────────────────────────────────────────────────────────┐
│  Training Results                                                    │
│  12 completed · 3 in progress · 1 failed                            │
│                                                                     │
│  ┌────────┬────────────┬─────────┬────────┬──────────┬───────────┐ │
│  │ Run ID │ Model       │ Dataset │ Acc    │ Status   │ Date      │ │
│  ├────────┼────────────┼─────────┼────────┼──────────┼───────────┤ │
│  │ #042   │ RandomForest│ train_v3│ 96.2%  │ ● Done   │ 2026-07-15│ │
│  │ #041   │ XGBoost    │ train_v3│ 94.7%  │ ● Done   │ 2026-07-15│ │
│  │ #040   │ SVM        │ train_v3│ 91.2%  │ ● Done   │ 2026-07-14│ │
│  │ #039   │ LogReg     │ train_v2│ 88.4%  │ ● Done   │ 2026-07-14│ │
│  └────────┴────────────┴─────────┴────────┴──────────┴───────────┘ │
│                                                                     │
│  [< Prev]  Page 1 of 3  [Next >]                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 States

| State | Behaviour |
|---|---|
| **Loading** | Skeleton table with 5 rows. Skeleton stat cards (3 across). |
| **Empty** | "No trained models yet. Upload a dataset and start training." Illustration. CTA: "Go to Datasets". |
| **One model** | Leaderboard shows single row. Best model banner still appears. |
| **Multiple models** | Full leaderboard. Best model has trophy icon + highlighted row background. |
| **Error** | Error banner: "Failed to load results." Retry + "Go to Dashboard". |

---

## 6. Settings

### 6.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings & Config                                              │
│  System configuration and preferences.                         │
│                                                                 │
│  ┌──────────────── API Configuration ─────────────────────────┐ │
│  │  API Endpoint                    https://api.mlpilot.io/v2 │ │
│  │  Default Project                 Alpha-Neural-X            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────── Resource Limits ───────────────────────────┐ │
│  │  Max Memory                     32 GB                     │ │
│  │  Max Runtime                     4 hours                  │ │
│  │  Parallel Jobs                     3                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────── Notifications ─────────────────────────────┐ │
│  │  Email Alerts                     Enabled                  │ │
│  │  Webhook URL              https://hooks.mlpilot.io/events │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [ Save Configuration ]  [ Reset Defaults ]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 States

| State | Behaviour |
|---|---|
| **Loading** | Skeleton rows within each section card. 3 skeleton cards total. |
| **Empty** (defaults) | Settings pre-filled with sensible defaults. Each value is editable inline. |
| **Editing** | Click "Edit" button on a row → value becomes an input field. Save per-section or bulk. |
| **Saved** | Toast: "Settings saved successfully". Inline checkmark on saved fields (1.5s then fades). |
| **Validation error** | Red border on invalid field. Error message below. Cannot save until valid. |
| **Error** (save failed) | Toast error: "Failed to save settings. [server message]". Fields retain unsaved values. |

---

## 7. Dark Theme

### 7.1 Token Mapping

| Token | Light | Dark | Usage |
|---|---|---|---|
| `background` | `#f5f0e8` | `#0b1326` | Page background |
| `primary` | `#1a1a1a` | `#c0c1ff` | Text, icons, borders |
| `primary-container` | `#ffcc00` | `#8083ff` | Active nav, badges, highlights |
| `secondary` | `#e63b2e` | `#ddb7ff` | Alert, error accents |
| `tertiary` | `#0055ff` | `#ffb783` | Links, info accents |
| `surface` | `#ffffff` | `#171f33` | Cards, panels |
| `surface-variant` | `#e8e3da` | `#2d3449` | Subtle backgrounds |
| `on-surface-variant` | `#4a4a4a` | `#c7c4d7` | Secondary text |
| `outline` | `#1a1a1a` | `#464554` | Borders |

### 7.2 Transition

- Theme toggle is instant — no jarring flash
- CSS `transition: background-color 0.3s, color 0.3s, border-color 0.3s;` on all themed elements
- Theme preference stored in `localStorage` / Zustand persist
- Respects `prefers-color-scheme` on first visit (but user toggle overrides)

---

## 8. Responsive Design

| Breakpoint | Layout | Sidebar | Content |
|---|---|---|---|
| `≥ 1280px` (xl) | 3-column project grid | Fixed, always visible | Max-width 1440px centered |
| `≥ 1024px` (lg) | 2-column bento grid | Fixed, always visible | Full-width with padding |
| `≥ 768px` (md) | 2-column cards | Collapsed, hamburger | Full-width with 24px padding |
| `< 768px` (sm) | Single column | Hidden, overlay menu | Full-width with 16px padding |

### 8.1 Mobile Adaptations

- Sidebar becomes a sliding overlay triggered by hamburger icon
- Bottom nav bar replaces sidebar for primary navigation
- Tables horizontally scrollable with sticky first column
- Drop zone full-width
- Cards stack vertically instead of grid
- PageHeader title smaller (text-3xl vs text-5xl)
- CTA buttons full-width
- Pipeline steps use full width, column mapping below steps

---

## 9. Accessibility

### 9.1 Standards

- WCAG 2.1 AA compliance target
- All interactive elements focusable and operable via keyboard
- Colour contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text

### 9.2 Implementation

| Requirement | Implementation |
|---|---|
| **Focus indicators** | 2px solid black outline (light) or 2px solid white outline (dark). Never `outline: none` without replacement. |
| **Skip to content** | Hidden skip link visible on first Tab press: "Skip to main content". |
| **ARIA labels** | All icon buttons get `aria-label`. Dynamic content regions get `aria-live="polite"`. |
| **Form labels** | Every input has a visible `<label>`. Placeholder is never a replacement for label. |
| **Status announcements** | Toast messages use `role="alert"`. Progress updates use `aria-live="polite"`. |
| **Colour reliance** | Status indicators use icon + text + colour, never colour alone. |
| **Reduced motion** | `prefers-reduced-motion: reduce` disables all CSS transitions and animations. |
| **Keyboard navigation** | Tab order follows visual order. No tabindex > 0. Escape closes modals. Enter submits forms. |
| **Screen readers** | Data tables use `<th>` with `scope`. Icons use `aria-hidden="true"` when decorative. |
| **Touch targets** | Minimum 44×44px for all interactive elements (WCAG 2.2). |

---

## 10. Loading Experience

### 10.1 Skeleton Patterns

| Component | Skeleton |
|---|---|
| **Stat card** | Grey rectangle with two smaller rectangles inside (title, value). |
| **Table** | 5 rows × 4 columns of grey bars. Header row slightly thicker. |
| **Project card** | Grey rectangle with three inner bars (title, subtitle, metric row). |
| **Chart area** | Grey rectangle with a wavy grey line inside. |
| **Page** | Title skeleton (h1 width) + subtitle skeleton + content skeleton grid. |
| **Leaderboard** | Table skeleton with 4 rows + trophy area skeleton. |

### 10.2 Optimistic UI

- **Upload:** Card appears immediately in "processing" state before server confirms
- **Training start:** Job card appears immediately with "queued" badge
- **Pipeline execute:** Steps show pending state immediately, then update as they complete

### 10.3 Navigation Loading

- Page transitions are instant (client-side routing)
- Only the content area shows skeletons — sidebar and topnav remain fully rendered
- Skeleton appears within 200ms; if data arrives faster, no skeleton shown (avoid flash)

---

## 11. Empty States

### 11.1 Copy Patterns

| Screen | Empty State Copy | CTA |
|---|---|---|
| **Dashboard** | "Welcome to MLPilot. Upload your first dataset to begin." | "Upload Dataset" |
| **Datasets** | "No datasets yet. Start by uploading a CSV, Parquet, or JSON file." | "Upload Dataset" |
| **Dataset Detail — EDA** | "Run EDA to discover insights about your data." | "Run EDA" |
| **Dataset Detail — Preprocessing** | "No preprocessing pipelines yet. Create one to prepare your data." | "Create Pipeline" |
| **Dataset Detail — Models** | "No trained models yet. Train a model to see results." | "Train Model" |
| **Training** | "Configure and dispatch your first model training." | "New Training Run" |
| **Results** | "No results yet. Complete a training run to see results here." | "Go to Training" |
| **Experiments** | "No experiments. Group related training runs into experiments." | "Create Experiment" |
| **Activity Log** | "No recent activity. Actions will appear here as you work." | (no CTA) |

### 11.2 Visual Design

- Centred in the content area (not full page)
- Large icon (64px) from Material Symbols (outlined, 40% opacity)
- Bold title (font-headline, font-black)
- Body text (font-body, on-surface-variant colour)
- CTA button (primary style with neo-shadow)
- Icon animates subtly on hover (scale 1.05, 200ms)

---

## 12. Error States

### 12.1 Error Hierarchy

| Type | Presentation | Recovery |
|---|---|---|
| **Inline form error** | Red border + message below field | User corrects input |
| **Toast error** | Top-right toast, auto-dismiss 5s | Dismiss; action may be offered |
| **Section error** | Inline banner within the section | Retry button |
| **Full-page error** | Centred error card | Retry + "Go to Dashboard" |
| **Modal error** | Dialog overlay | Close + retry |
| **Global error boundary** | Error boundary catches render crash | "Reload page" |

### 12.2 Error Messages

| Scenario | Message | Recovery |
|---|---|---|
| **Network offline** | "No internet connection. Check your network." | Auto-retry on reconnect |
| **API timeout** | "Request timed out. The server may be busy." | Retry |
| **Upload failed** | "Upload failed. [server message]" | Retry or cancel |
| **Training failed** | "Training job failed. [error reason]" | View logs / Retry |
| **EDA computation failed** | "Could not compute EDA. Dataset may be invalid." | Retry / Upload different file |
| **Not found (404)** | "The requested resource was not found." | Go to Dashboard |
| **Server error (500)** | "Something went wrong on our end. Please try again." | Retry / Contact |
| **Unauthorized (401)** | "Session expired. Please log in again." | Redirect to login |
| **Validation error** | Display field-level message from server | Correct input |
| **Rate limited (429)** | "Too many requests. Please wait a moment." | Auto-retry with backoff |

### 12.3 Error Boundary Strategy

```
App
├── GlobalErrorBoundary (catches unhandled render crashes)
│   └── AuthProvider
│       └── QueryClientProvider
│           └── Router
│               ├── AppLayout
│               │   ├── Sidebar (isolated — sidebar crash doesn't kill content)
│               │   ├── TopNav (isolated)
│               │   └── ModuleErrorBoundary (per-route)
│               │       └── [Page Content]
│               └── ModuleErrorBoundary (per-route)
│                   └── [Page Content]
```

- Each route has its own `ModuleErrorBoundary`
- A crash in the datasets page doesn't affect the training page
- Sidebar and TopNav are outside route error boundaries
- Error boundary shows "Something went wrong" with retry + issue reporting

---

## 13. UX Principles

| Principle | Application |
|---|---|
| **Progressive disclosure** | Show basic info first (stats cards), reveal details on demand (expandable rows, tabs) |
| **Consistent positioning** | All CTAs are either top-right (secondary) or bottom-centre (primary) |
| **Feedback on every action** | Every button click produces a visual response (colour change, shadow shift, toast) |
| **Forgiving input** | Autosave drafts. Confirm destructive actions. Undo where possible. |
| **State visibility** | Every page section independently shows its state (loading/empty/error/data). Never a global spinner. |
| **Direct manipulation** | Drag-and-drop for files and pipeline steps. Sliders for ratios. |
| **Recognition over recall** | All actions visible. No obscure gestures. Icons always labelled. |
| **User control** | Cancel uploads. Cancel training. Delete datasets. Clear history. |
