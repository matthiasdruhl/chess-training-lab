# Constants & Default Configuration

Single reference for magic numbers and defaults. Implementation should import from `src/constants/` mirroring these values. User overrides live in `AppSettings` (IndexedDB).

**Source of truth for shapes:** [DATA.md](./DATA.md) (`AppSettings`).

---

## IndexedDB

| Constant | Value | Notes |
|----------|-------|-------|
| `DB_NAME` | `'chess-training-lab'` | |
| `DB_VERSION` | `1` | Bump when adding stores or migrations |
| `SETTINGS_KEY` | `'app'` | Singleton id |

---

## Persistence behavior

| Constant | Value | Notes |
|----------|-------|-------|
| `DEBOUNCE_WRITE_MS` | `300` | Progress counters before IDB put |
| `IMMEDIATE_WRITE_EVENTS` | — | New blunder, conversion, backup import |

---

## Engine (Stockfish worker)

| Constant | Value | Notes |
|----------|-------|-------|
| `ENGINE_SKILL_MAX` | `20` | Opponent/defender strength |
| `DEFAULT_MOVETIME_MS` | `1000` | `settings.engine.defaultMovetimeMs` |
| `DEFAULT_DEPTH` | `16` | `settings.engine.defaultDepth` |
| `SCAN_MOVETIME_MS` | `400` | Chess.com batch scan |
| `QUIZ_DEPTH` | `18` | Deeper check in leak/conversion quiz |
| `QUIZ_MOVETIME_MS` | `1500` | Alternative to depth in quiz |
| `HINT_DEPTH` | `10` | Optional tactics hint |
| `OPPONENT_REPLY_DELAY_MS` | `300` | UI animation after repertoire auto-reply |

---

## Move grading (non-Chess.com modules)

| Constant | Value | Module |
|----------|-------|--------|
| `QUIZ_MOVE_LOSS_CP` | `30` | Endgame reset, optional quiz verify |
| `ENDGAME_RESET_ON_DRAW` | `true` | Per preset `resetOnDraw` |

---

## Leak detector (blunders)

| Constant | Default | `AppSettings` key |
|----------|---------|-------------------|
| `LEAK_MIN_SWING_CP` | `150` | `leakDetector.minSwingCp` |
| `BLUNDER_SWING_CP` | `200` | `leakDetector.blunderSwingCp` |
| `INACCURACY_SWING_CP` | `50` | (not stored; classification only) |
| `MISTAKE_SWING_CP` | `100` | (classification only) |

**Classification from swing (user move):**

| swingCp | Label |
|---------|--------|
| ≥ 200 | `blunder` |
| 100–199 | `mistake` |
| 50–99 | `inaccuracy` |
| < 50 | Do not save as leak |

**Mate scores:** Treat `M1` as `±10000` cp for comparisons.

---

## Conversion review

| Constant | Default | `AppSettings` key |
|----------|---------|-------------------|
| `CONVERSION_MIN_PEAK_CP` | `200` | `conversionReview.minPeakCp` |
| `CONVERSION_DROP_TO_CP` | `80` | `conversionReview.dropToCp` |
| `CONVERSION_SCAN_MOVETIME_MS` | `400` | `conversionReview.scanMovetimeMs` |

**Logic summary:** Peak advantage ≥ 200 cp, then later ≤ 80 cp (or fail to win) → save conversion miss.

---

## Chess.com fetch

| Constant | Default | `AppSettings` key |
|----------|---------|-------------------|
| `CHESSCOM_ARCHIVE_DELAY_MS` | `300` | (code constant) |
| `CHESSCOM_DEFAULT_MONTHS` | `2` | `chesscom.defaultMonthsToFetch` |
| `CHESSCOM_MAX_RETRIES` | `3` | On 429 |
| `CHESSCOM_BACKOFF_BASE_MS` | `1000` | 1s, 2s, 4s |
| `CHESSCOM_TIME_CLASS_FILTER` | `['rapid']` | Optional; implement in filter |

---

## Repertoire trainer

| Constant | Value | Notes |
|----------|-------|-------|
| `REPERTOIRE_DUE_DAYS` | `7` | Dashboard “due for review” |
| `DEFAULT_TRAINER_MODE` | `'strict'` | Per-node override in JSON |

---

## Tactics

| Constant | Value | Notes |
|----------|-------|-------|
| `TACTICS_SESSION_SIZE` | `3` | Dashboard daily checklist |
| `ALLOW_SOLUTION_REVEAL` | `true` | Sets `revealedSolution` on progress |

---

## Dashboard “today’s session” (Phase 8)

| Item | Default count |
|------|----------------|
| Repertoire lines | `1` due node |
| Out-of-book | `1` deviation (linked to today’s line) |
| Bridge | `1` handoff |
| Middlegame | `1` preset |
| Tactics | `3` puzzles from one pack |
| Leak quiz | `3` cards (`status !== mastered`) |
| Conversion quiz | `2` cards |
| Endgame | `1` preset |

---

## Analysis cache

| Constant | Value | Notes |
|----------|-------|-------|
| `CACHE_KEY_FORMAT` | `` `${gameUrl}#${ply}` `` | |
| `CACHE_PRUNE_AGE_DAYS` | `90` | Optional maintenance |

---

## UI timing

| Constant | Value | Notes |
|----------|-------|-------|
| `TOAST_DURATION_MS` | `4000` | |
| `SCAN_PROGRESS_UPDATE_MS` | `100` | Throttle UI updates during scan |

---

## Default `AppSettings` (factory)

Used on first launch when no IDB record exists:

```typescript
const DEFAULT_SETTINGS = {
  version: 1 as const,
  id: 'app' as const,
  chesscom: {
    username: '',
    defaultMonthsToFetch: 2,
  },
  leakDetector: {
    minSwingCp: 150,
    blunderSwingCp: 200,
    scanMovetimeMs: 400,
    quizDepth: 18,
  },
  conversionReview: {
    minPeakCp: 200,
    dropToCp: 80,
    scanMovetimeMs: 400,
  },
  engine: {
    defaultMovetimeMs: 1000,
    defaultDepth: 16,
  },
  ui: {
    showEvalBar: true,
  },
  updatedAt: new Date().toISOString(),
};
```

---

## Implementation file layout (planned baseline)

```
src/constants/
  db.ts
  engine.ts
  analysis.ts      # leak + conversion thresholds
  chesscom.ts
  training.ts      # repertoire due days, session sizes
  defaults.ts      # DEFAULT_SETTINGS factory
  modules.ts       # dashboard module metadata (including preview labels)
```

---

## Related documents

- [DATA.md](./DATA.md) — full `AppSettings` interface
- [CHESSCOM.md](./CHESSCOM.md) — how thresholds apply in scan
- [SETUP.md](./SETUP.md) — environment
