# Architecture Decision Record

Locked decisions for the Chess Training Lab. Treat this document as the source of truth when implementation begins. If a decision changes, update this file and note the date.

---

## D-001: Personal local tool (not production)

**Status:** Locked  
**Date:** 2026-05-24

**Context:** Single user (~1600 Rapid), runs on own machine only.

**Decision:**

- No deployment pipeline, auth, analytics, or multi-tenant design
- Target environment: `vite dev` / `vite preview` on localhost
- No requirement for COOP/COEP, CDN, or static hosting configuration
- Chess.com integration is best-effort with Vite dev proxy if browser CORS blocks direct calls

**Consequences:**

- Simpler error handling and UX (console + inline toasts are enough)
- Data durability is the user's responsibility (browser profile + optional JSON backup export)

---

## D-002: IndexedDB for all session progress

**Status:** Locked  
**Date:** 2026-05-24

**Context:** Progress (repertoire, blunders, drill stats, settings) must survive browser restarts.

**Decision:**

- Use **IndexedDB** as the only mutable runtime store
- Database name: `chess-training-lab`
- Schema version: `1` (bump `DB_VERSION` and add migration when shape changes)
- Thin access layer in `src/storage/db.ts` (native IDB or `idb` package—see D-003)

**Consequences:**

- `localStorage` is not used for app data (may use only for ephemeral UI prefs if ever needed)
- Content catalogs (repertoire lines, preset FENs) remain **versioned JSON files** in `data/`; IDB stores user state and generated artifacts only

---

## D-003: IndexedDB access via `idb` helper

**Status:** Locked  
**Date:** 2026-05-24

**Decision:** Use the [`idb`](https://github.com/jakearchibald/idb) wrapper (~1 dependency) for Promise-based IDB with less boilerplate than raw `indexedDB.open`.

**Alternatives rejected:**

- Raw IndexedDB API — more error-prone for upgrades
- Dexie — heavier than needed for nine object stores
- localStorage — size limits and no structured indexes

---

## D-004: Client-only stack

**Status:** Locked  
**Date:** 2026-05-24

| Layer | Choice |
|-------|--------|
| Build | Vite |
| UI | React 18+ |
| Styling | Tailwind CSS |
| Rules | chess.js |
| Board | react-chessboard |
| Engine | stockfish.js in a **Web Worker** |
| Language | TypeScript |

**Consequences:** All analysis and play-vs-engine runs in the browser. CPU-heavy work never blocks the React render thread except via explicit loading states.

---

## D-005: Single Stockfish worker with serial job queue

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- One long-lived worker process
- Jobs (analyze position, opponent move, scan game) enqueue FIFO; UI shows global `engineStatus`
- v1 uses **single-thread** stockfish.js build (no SharedArrayBuffer / COOP headers)

**Consequences:** Leak-detector batch analysis is slower but predictable; no parallel worker pool in v1.

---

## D-006: Content vs state separation

**Status:** Locked  
**Date:** 2026-05-24

| Data type | Location | Edited by |
|-----------|----------|-----------|
| Repertoire, out-of-book, bridge, presets, tactics | `data/**/*.json` in repo | You (editor) |
| Progress, puzzles, stats, settings | IndexedDB | App at runtime |
| Optional backup | JSON file on disk | Export/import buttons |

**Consequences:** Git tracks opening lines; browser tracks training history. Reinstalling deps does not wipe IDB; clearing site data does (backup export mitigates).

---

## D-007: Repertoire opponent moves from tree, not engine

**Status:** Locked  
**Date:** 2026-05-24

**Decision:** In the Repertoire Trainer, opponent replies come **only** from the JSON tree (`children` / scripted UCI). Stockfish is not used for opponent play in this module.

**Rationale:** Keeps training aligned with memorized intentions; avoids engine sidelines you did not choose to learn.

---

## D-008: Middlegame & endgame opponent from Stockfish

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- Middlegame simulator: Stockfish as opponent (`skillLevel: 20`, configurable `movetimeMs`)
- Endgame drills: Stockfish at max difficulty; **strict reset** on mistake when `sessionDefaults.resetOnMistake` is true

---

## D-009: Chess.com leak detector scope

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- Public Chess.com API only (username in settings)
- Filter games: **White** games starting **1. d4**; **Black** games with **1... c6** vs **1. e4**
- Default fetch: **last 1–2 monthly archives** (not full lifetime history)
- Scan: fast movetime per ply; deeper analysis when opening a blunder in quiz UI
- Classify swings ≥ **150 cp** as leak candidates; store ≥ **200 cp** as `blunder` by default

**Consequences:** Polite delay between archive requests (~300 ms); no enterprise rate-limit layer.

---

## D-010: State management without Redux/Zustand

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- `AppContext` + `EngineContext` for cross-cutting concerns
- Module hooks (`useRepertoireTrainer`, `usePresetSession`, etc.) own screen state
- `usePersistentStore` pattern: hydrate from IDB on mount, debounced write on change

---

## D-011: JSON shape versioning

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- Every persisted record includes `version: 1` (integer)
- Bundled JSON includes `meta.version`
- On `DB_VERSION` bump, run a single `migrate(from, to)` in `db.ts`

**Consequences:** No JSON Schema / Ajv CI in v1; TypeScript interfaces in `src/types/` are the contract.

---

## D-012: Optional full backup export

**Status:** Locked  
**Date:** 2026-05-24

**Decision:** Phase 8 delivers **Export all data** / **Import backup** as JSON download/upload covering **all nine IDB stores**. Not required for daily use; insurance against clearing browser data.

---

## D-013: Out-of-book — principles, not new theory trees

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- Deviations are curated JSON linked to `parentNodeId` (repertoire node)
- Training is **plan choice + acceptable moves**, not memorizing long alternative lines
- Grading uses authored `acceptableUci` / `planChoices` — Stockfish not required

**Consequences:** Content authoring is manual but bounded (typically 2–5 deviations per main line).

---

## D-014: Opening → middlegame bridge is a first-class module

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- Every priority repertoire leaf should have a `BridgeHandoff` with `linkedPresetId`
- Flow: recap last N moves → plan quiz → deep-link to middlegame preset
- Bridge progress stored separately from repertoire progress

**Consequences:** Repertoire training alone is incomplete without bridge + middlegame follow-through.

---

## D-015: Structure tactics — JSON-graded, themed packs

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- Puzzles live in `data/tactics/structure-tactics.json` grouped by `packId` / `structureTag`
- Correctness = UCI match to `solutionUci` (aliases optional)
- Engine hints optional; not used for primary grading

**Rejected:** Generic puzzle rush integration; structure flashcard/quiz (name-the-structure) module.

---

## D-016: Conversion review shares Chess.com infra with leak detector

**Status:** Locked  
**Date:** 2026-05-24

**Decision:**

- Same game filters (1.d4 White, Caro Black)
- One scan pass populates `analysis_cache`; both detectors read eval timeline
- Conversion heuristic: peak eval ≥ +200 cp (user), later drop ≤ +80 or failure to win
- Separate IDB store `conversion_missed` and route `/conversion`

**Consequences:** Phase 7 implements both modules together.

---

## D-017: Eight modules, eight routes

**Status:** Locked  
**Date:** 2026-05-24

| Route | Module |
|-------|--------|
| `/repertoire` | Repertoire Trainer |
| `/out-of-book` | Out-of-Book Defender |
| `/bridge` | Opening → Middlegame Bridge |
| `/middlegame` | Middlegame Simulator |
| `/tactics` | Structure Tactics |
| `/leaks` | Leak Detector & Quiz |
| `/conversion` | Conversion Review |
| `/endgame` | Endgame Drill-Master |

Dashboard `/` orchestrates “today’s session” across modules (Phase 8).

---

## Open questions (not locked)

| ID | Question | Default if unanswered |
|----|----------|------------------------|
| Q-001 | React Router vs single-page tab state? | **Resolved:** React Router per D-017 |
| Q-002 | Strict repertoire: rewind to branch point vs restart line? | Rewind to branch point |
| Q-003 | Spaced repetition for repertoire nodes in v1? | Simple `lastPracticedAt` + manual "due" list; no SM-2 until later |
