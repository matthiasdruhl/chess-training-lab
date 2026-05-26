# UI & Screen Specification

Screen-level specification for Chess Training Lab. No visual mockups—layout, states, and navigation only. Implementation uses Tailwind; components listed are logical names.

**Global layout:** `AppShell` = left nav (or top on narrow) + main content + optional right panel for plans/intent.

---

## Shared components

| Component | Used on | Behavior |
|-----------|---------|----------|
| `TrainingBoard` | All modules with a board | Drag-and-drop; orientation from `sideToTrain` / user color; legal moves only |
| `EvalBar` | Middlegame, endgame, leak/conversion quiz (optional), engine debug | Shows centipawn eval; mate as ±10000 |
| `MoveList` | Repertoire, bridge recap, game review | SAN list; click ply to jump (where replay exists) |
| `EngineStatusBadge` | Global header | `idle` / `thinking` / `ready`; blocks double-submit while thinking |
| `ModuleHeader` | Every route | Title, 1-line description, back-to-dashboard link |
| `Toast` | Global | Success / error / info (API fail, engine restart) |

**Board orientation**

| Module | Orientation |
|--------|-------------|
| Repertoire, out-of-book, bridge, tactics | Your training color at bottom |
| Middlegame / endgame | `sideToTrain` from preset |
| Leak / conversion quiz | Side to move in puzzle FEN |

---

## `/` — Dashboard

### Purpose

Home + “today’s session” orchestration (Phase 8).

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Chess Training Lab                    [Engine: idle] │
├─────────────────────────────────────────────────────────┤
│  Today's session (checklist)          │  Quick stats    │
│  □ Repertoire line                  │  Blunders: 12   │
│  □ Out-of-book                      │  Conversions: 4 │
│  □ Bridge                           │  Tactics due: 8 │
│  □ Middlegame                       │  Lines due: 3   │
│  □ Tactics (3 puzzles)              │                 │
│  □ Leak quiz (3)                    │  [Scan games]   │
│  □ Conversion quiz (2)              │  (shared)       │
│  □ Endgame drill                    │                 │
├─────────────────────────────────────────────────────────┤
│  Module cards (8) — icon, title, due count, [Open]    │
└─────────────────────────────────────────────────────────┘
```

### States

| State | Display |
|-------|---------|
| First visit | Checklist unchecked; prompt to set Chess.com username in settings |
| Username missing | “Scan games” disabled with tooltip |
| Scan in progress | Global progress bar; checklist disabled |
| Item complete | Checkbox ticked (session-only until refresh—optional persist in `settings.todaySession`) |

### Actions

- **Open** on card → navigate to module route
- **Scan games** → runs leak + conversion detectors (Phase 7); shows last scan time
- **Settings** (inline or modal): username, thresholds (link to advanced constants in app or read-only from defaults)

---

## `/repertoire` — Repertoire Trainer (Module 1)

### Layout

```
┌──────────────┬────────────────────────────┬──────────────┐
│ Side: W / B  │         Board              │ Intent panel │
│ Tree list    │                            │ plans[]      │
│ (nodes)      │                            │ streak       │
│              ├────────────────────────────┤              │
│ status badges│  Move list + controls     │ [Mark known] │
│ deviations N │  [Reset line] [Hint]      │              │
│ bridge avail │  Strict / Relaxed         │              │
└──────────────┴────────────────────────────┴──────────────┘
```

### Flow states

| State | UI |
|-------|-----|
| No node selected | Empty board; tree expanded to last practiced |
| Training | Highlight legal squares; on wrong move → intent text + shake/flash |
| Line complete | Success toast; streak +1; suggest “Bridge” or “Out-of-book” links if exist |
| Opponent auto-reply | Brief delay (300ms); move animated on board |

### Controls

- **Reset line** — rewind to `branchPoint` or node start FEN
- **Hint** — show `intent` only (no arrow unless `showArrowOnHint`)
- **Mark known** — `repertoire_progress.status = known`

### Links to other modules

- Badge on node: “2 deviations” → `/out-of-book?parent=qg-qgd-exchange`
- Badge: “Bridge” → `/bridge?handoff=bridge-qgd-exchange-karlsbad`

---

## `/out-of-book` — Out-of-Book Defender (Module 2)

### Layout

```
┌──────────────┬────────────────────────────┬──────────────┐
│ Deviations   │         Board              │ Principle    │
│ (filter by   │  (position after dev.)   │ panel        │
│  parent node)│                            │              │
│              ├────────────────────────────┤ Step indicator│
│ severity tag │  Step 1: Plan choices    │ 1. Plan      │
│              │  (buttons, not board)     │ 2. Move      │
│              │  Step 2: Your move        │              │
└──────────────┴────────────────────────────┴──────────────┘
```

### Flow states

| Step | UI |
|------|-----|
| 1 — Plan | 2–4 choice buttons; wrong → show `feedback`, stay on step |
| 2 — Move | Board active; accept if UCI ∈ `acceptableUci` |
| 2b — Optional continuation | Auto-play opponent reply; optional one more user move |
| Complete | Summary + link back to repertoire node; next deviation suggestion |

### Empty state

“No deviations for this line”—link to CONTENT.md workflow to add one in JSON.

---

## `/bridge` — Opening → Middlegame Bridge (Module 3)

### Layout

```
┌──────────────┬────────────────────────────┬──────────────┐
│ Handoff list │         Board              │ Recap panel  │
│ (by repertoire│  at handoffFen           │ last N moves │
│  node)       │                            │ from recapSan│
│              ├────────────────────────────┤              │
│              │  Plan quiz (card buttons)  │ intentSummary│
│              │  after pass:               │ after pass   │
│              │  [Continue to middlegame]  │              │
└──────────────┴────────────────────────────┴──────────────┘
```

### Flow states

| State | UI |
|-------|-----|
| Recap | Move list shows `recapSan`; board at final recap position or handoff FEN |
| Plan quiz | Cards; must pick `correctPlanId` |
| Passed | Show `intentSummary` + primary CTA **Continue to middlegame** |
| Continue | Navigate to `/middlegame?preset={linkedPresetId}` |

### Failed plan

Inline feedback on card (“Not the main plan here”); no board change.

---

## `/middlegame` — Middlegame Simulator (Module 4)

### Layout

```
┌──────────────┬────────────────────────────┬──────────────┐
│ Preset list  │         Board              │ Plans panel  │
│ filter: QG / │         + EvalBar          │ objective    │
│ Caro / all   │                            │ plans[]      │
│              ├────────────────────────────┤              │
│              │  vs Stockfish              │ Session stats│
│              │  [Resign session]          │ (drill_stats)│
└──────────────┴────────────────────────────┴──────────────┘
```

### Query params

| Param | Effect |
|-------|--------|
| `?preset=mg-karlsbad-qgd` | Auto-select and load preset (from Bridge) |

### States

| State | UI |
|-------|-----|
| Your turn | Board active |
| Engine thinking | Board disabled; badge `thinking` |
| Session end | Optional summary: moves played, link to related tactics pack |

**No reset on mistake** (default)—free play.

---

## `/tactics` — Structure Tactics (Module 5)

### Layout

```
┌──────────────┬────────────────────────────┬──────────────┐
│ Pack list    │         Board              │ Puzzle info  │
│              │                            │ theme, diff  │
│ puzzle 3/12  ├────────────────────────────┤              │
│              │  [Hint: themeHint]         │ [Reveal sol] │
│              │  [Next puzzle]             │ Related MG → │
└──────────────┴────────────────────────────┴──────────────┘
```

### Flow states

| State | UI |
|-------|-----|
| Attempt | User moves; wrong → `themeHint`, attempts++ |
| Correct | Green flash; Next puzzle; update progress |
| Reveal | Show `solutionSan`; mark `revealedSolution` |

**No eval bar** by default (keeps focus; optional engine hint button uses short analysis).

---

## `/leaks` — Leak Detector & Quiz (Module 6)

### Tabs

**Scan** | **Queue** | **Quiz**

### Tab: Scan

```
┌─────────────────────────────────────────┐
│ Username: [from settings]  Months: [2▼] │
│ [Scan games]  Last scan: May 24, 2:30pm │
│ Progress: ████████░░ 45/120 games       │
│ Found: 8 blunders · (conversions on /conversion) │
└─────────────────────────────────────────┘
```

Note: Phase 7 may use one dashboard **Scan games** that fills both stores; this tab can show blunder-only stats or link to conversion tab.

### Tab: Queue

| Column | Content |
|--------|---------|
| List | FEN thumbnail text, opening, date, swing cp, status badge |
| Filters | status, color, tag, opening family |
| Actions | Open in quiz, Delete, Mark mastered |

### Tab: Quiz

```
┌──────────────┬────────────────────────────┬──────────────┐
│ Queue (mini) │         Board              │ Context      │
│              │  + EvalBar (after submit)  │ game link    │
│              │                            │ pvContextSan │
│              │  [Submit move]             │ peak/swing   │
│              │  Wrong: show best + played │ [Mastered]   │
└──────────────┴────────────────────────────┴──────────────┘
```

### Empty states

| State | Message |
|-------|---------|
| No scan yet | “Run a scan from Dashboard or Scan tab” |
| No blunders | “No leaks found above threshold—try more months or lower threshold in settings” |

---

## `/conversion` — Conversion Review (Module 7)

Same tab pattern as `/leaks`: **Queue** | **Quiz** (scan lives on dashboard or shared modal).

### Quiz differences from leaks

| Element | Leak quiz | Conversion quiz |
|---------|-----------|-----------------|
| Prompt | “Find the best move you missed” | “You were winning (+X). Keep control.” |
| Context panel | `swingCp` | `peakEvalCp`, `dropFromPeakCp` |
| Result badge | blunder / mistake | conversion miss |

### Queue list columns

Date, opening, peak eval, drop, result (draw/loss from winning), status.

---

## `/endgame` — Endgame Drill-Master (Module 8)

Same layout pattern as middlegame with different defaults:

| Element | Endgame |
|---------|---------|
| Reset toast | Visible on mistake: “Reset — find the precise move” |
| `ResetToast` | Shows `resetCount` for session |
| Plans panel | Shorter; emphasis on technique steps |

### Flow states

| State | UI |
|-------|-----|
| Mistake (≥30 cp vs best) | Board snaps to preset FEN; reset count++ |
| Draw when winning | Optional reset per `resetOnDraw` |
| Complete | `completions++` on unmount or explicit “Done” |

---

## Global navigation

```
Dashboard (/)
├── Repertoire
├── Out-of-book
├── Bridge
├── Middlegame
├── Tactics
├── Leaks
├── Conversion
└── Endgame
```

**Settings access:** gear on dashboard (not separate route in v1)—modal with username, link to export/import backup (Phase 8).

---

## Responsive behavior (personal tool)

| Breakpoint | Nav |
|------------|-----|
| Wide | Vertical sidebar, always visible |
| Narrow | Hamburger; board full width; plans panel below board |

Minimum supported width: **768px** (tablet landscape). Phone layout not required.

---

## Error & loading patterns

| Situation | UI |
|-----------|------|
| Engine not ready | Disable “Engine move” and opponent turns; spinner on badge |
| IDB write fail | Toast + suggest export backup |
| Chess.com 429 | Toast “Slow down”; auto-retry with backoff message |
| Chess.com CORS (no proxy) | Banner on leaks/conversion: “Start dev server with proxy” → link SETUP.md |
| Invalid JSON at build | Dev-only console error; screen shows which file failed import |

---

## Related documents

- [CONTENT.md](./CONTENT.md) — what appears in plans/intent panels
- [CONSTANTS.md](./CONSTANTS.md) — thresholds shown in settings
- [SETUP.md](./SETUP.md) — dev server and proxy
- [ARCHITECTURE.md](./ARCHITECTURE.md) — module logic
