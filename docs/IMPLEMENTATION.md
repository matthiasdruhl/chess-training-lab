# Implementation Roadmap

Phased build plan for Chess Training Lab — **8 training modules**, **9 IndexedDB stores**, all created in Phase 1.

**Definition of done (personal):** Feature works on `localhost`; progress survives hard refresh.

---

## Phase overview

| Phase | Name | Modules | IDB stores written |
|-------|------|---------|-------------------|
| 1 | Foundation | Shell + all routes (stubs OK) | All stores created; `settings` |
| 2 | Engine | — (shared infrastructure) | — |
| 3 | Repertoire | 1 | `repertoire_progress` |
| 4 | Theory gaps | 2 Out-of-book, 3 Bridge | `out_of_book_progress`, `bridge_progress` |
| 5 | Play positions | 4 Middlegame, 8 Endgame | `drill_stats` |
| 6 | Structure tactics | 5 | `tactics_progress` |
| 7 | Chess.com review | 6 Leaks, 7 Conversion | `personal_blunders`, `conversion_missed`, `analysis_cache` |
| 8 | Dashboard & backup | Hub | Export/import all stores |

---

## Phase 1 — Foundation & shell

### Scope

- Vite + React + TypeScript + Tailwind + React Router
- **All routes** (stubs with title + nav): `/`, `/repertoire`, `/out-of-book`, `/bridge`, `/middlegame`, `/tactics`, `/leaks`, `/conversion`, `/endgame`
- `TrainingBoard` + `useChessSession`
- `storage/db.ts` — open `chess-training-lab` v1 and **create every object store** (empty is fine)
- `settingsRepo` — default `AppSettings` on first run
- Dashboard placeholder: nav cards for all 8 modules

### Acceptance criteria

- [ ] `npm run dev` — all routes reachable, nav works
- [ ] Board accepts legal moves; FEN paste works
- [ ] Refresh preserves a settings change (e.g. username)
- [ ] DevTools → Application → IndexedDB shows all 9 stores

### Out of scope

- Stockfish, JSON content, Chess.com

---

## Phase 2 — Engine layer

### Scope

- `stockfish.worker.ts`, `EngineContext`, `useStockfish`, serial job queue
- `EvalBar` on board layouts
- Dashboard: “Analyze FEN” / “Engine move” smoke test

### Acceptance criteria

- [ ] UI responsive during analysis
- [ ] Eval bar updates; best move is legal
- [ ] Worker recovery after restart

### Blocks

Phases 5, 7, 8 (middlegame, endgame, Chess.com scans)

---

## Phase 3 — Repertoire trainer (Module 1)

### Scope

- `data/repertoire/queens-gambit-caro-kann.json`
- Tree UI, strict trainer, `repertoire_progress`
- Dashboard: “lines due for review”

### Acceptance criteria

- [ ] Complete one White + one Black line
- [ ] Wrong move shows intent; progress persists after refresh
- [ ] Opponent moves from JSON only

### Enables

Phase 4 (out-of-book + bridge link to `nodeId`)

---

## Phase 4 — Out-of-book & bridge (Modules 2 & 3)

### Scope

- `data/out-of-book/deviations.json`
- `data/bridge/handoffs.json` — each handoff has valid `linkedPresetId` (preset file may land in Phase 5 but IDs must exist in JSON now)
- **Out-of-book:** plan quiz → acceptable move grading → `out_of_book_progress`
- **Bridge:** recap moves → plan quiz → deep-link to `/middlegame?preset=...` → `bridge_progress`
- Repertoire UI: badges “N deviations” / “Bridge available” on nodes

### Acceptance criteria

- [ ] Finish one deviation: plan + move correct; progress saved
- [ ] Finish one bridge handoff; plan quiz passes; middlegame route opens correct preset query param
- [ ] Wrong plan choice shows feedback without advancing
- [ ] Refresh preserves `out_of_book_progress` and `bridge_progress`

### Dependency

Phase 3 repertoire `nodeId`s must match `parentNodeId` / `repertoireNodeId` in JSON

---

## Phase 5 — Middlegame & endgame (Modules 4 & 8)

### Scope

- `data/presets/structures-and-endgames.json`
- `usePresetSession` — shared hook, different `sessionDefaults`
- Middlegame: free play vs Stockfish
- Endgame: strict reset on mistake (`QUIZ_MOVE_LOSS_CP`)
- `drill_stats` for both
- Bridge deep-link reads `?preset=` and auto-starts session

### Acceptance criteria

- [ ] Karlsbad (or example) — 10 moves vs engine
- [ ] K+R endgame resets on blunder; `resetCount` persists
- [ ] Navigate from Bridge → middlegame preset loads automatically

---

## Phase 6 — Structure tactics (Module 5)

### Scope

- `data/tactics/structure-tactics.json` — packs + puzzles
- Pack picker, puzzle queue, UCI grading (no engine required)
- Optional engine hint button
- `relatedPresetId` link to middlegame route
- `tactics_progress`

### Acceptance criteria

- [ ] Solve one puzzle correctly; fails wrong move with `themeHint`
- [ ] Progress persists per `puzzleId`
- [ ] Optional: “Play related structure” opens correct middlegame preset

### Can run in parallel with Phase 5 if engine not needed for grading (recommended after Phase 1–3)

---

## Phase 7 — Chess.com leaks & conversion (Modules 6 & 7)

### Scope

- Vite Chess.com proxy; `useChessComGames`
- Shared PGN replay + `analysis_cache`
- `blunderDetector.ts` → `personal_blunders`
- `conversionDetector.ts` → `conversion_missed`
- `/leaks` — scan, queue, quiz
- `/conversion` — scan (or shared scan button on dashboard), queue, quiz
- **Single “Scan games”** action runs both detectors in one pass (efficient cache use)

### Acceptance criteria

- [ ] Scan 1–2 months of filtered games
- [ ] At least one blunder and one conversion saved (or seeded test PGN if API blocked)
- [ ] Quiz updates `userState`; survives refresh
- [ ] Conversion record includes `peakEvalCp` and `dropFromPeakCp`

### Settings

`AppSettings.leakDetector` and `AppSettings.conversionReview` (see [DATA.md](./DATA.md))

---

## Phase 8 — Dashboard & backup

### Scope

- **Today’s session** checklist (configurable order):
  1. Repertoire (due node)
  2. Out-of-book (1 deviation for today’s node)
  3. Bridge (1 handoff)
  4. Middlegame preset (from bridge or pick)
  5. Tactics (3 puzzles from one pack)
  6. Leak quiz (3 cards)
  7. Conversion quiz (2 cards)
  8. Endgame drill (1 preset)
- Aggregate stats on dashboard (counts open/new/mastered per store)
- `storage/backup.ts` — export/import full `AppBackup` including all stores
- Tag filters on blunder + conversion queues

### Acceptance criteria

- [ ] Dashboard shows due items from IDB
- [ ] Export → clear site data → import restores all training history
- [ ] “Today’s session” marks steps complete in local state (optional `settings.todaySession` in IDB)

---

## Dependency graph

```
Phase 1 (all IDB stores + routes)
    └── Phase 2 (engine)
            ├── Phase 3 (repertoire)
            │       └── Phase 4 (out-of-book + bridge)
            │               └── Phase 5 (middlegame + endgame) ← bridge deep-link
            ├── Phase 6 (tactics) — needs Phase 1 only; best after 5 for preset links
            └── Phase 7 (leaks + conversion) — needs Phase 2
                    └── Phase 8 (dashboard + backup)
```

**Recommended build order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

---

## Content authoring milestones (parallel to code)

| Milestone | Files | Target |
|-----------|-------|--------|
| M1 | `repertoire.json` | 2 White + 2 Black lines with FEN |
| M2 | `deviations.json` | 2 deviations per main line |
| M3 | `handoffs.json` | 1 handoff per main line → preset id |
| M4 | `presets.json` | 2 middlegame + 3 endgame |
| M5 | `structure-tactics.json` | 20 puzzles across 3 packs |
| M6 | Live scan | Real blunders + conversions from your username |

---

## First implementation commands

See **[SETUP.md](./SETUP.md)** for full scaffold, `vite.config.ts` proxy, worker notes, and troubleshooting.

Copy `docs/schemas/examples/*.json` → `data/**` when each phase starts (table in SETUP.md).

---

## Documentation maintenance

- Module or store changes → [ARCHITECTURE.md](./ARCHITECTURE.md) + [DATA.md](./DATA.md)
- Locked behavior changes → [DECISIONS.md](./DECISIONS.md)
- Phase scope changes → this file
