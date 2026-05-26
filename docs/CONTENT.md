# Content Authoring Guide

How to create and maintain training content in JSON files. All content lives under `data/` and is edited in VS Code (or any editor). Restart dev server or rely on HMR after saves.

**Rule:** IDs are stable handles. Renaming an `id` orphans IndexedDB progress for that item.

---

## Content dependency graph

```
repertoire (nodeId)
    ├── out-of-book (parentNodeId → nodeId)
    ├── bridge (repertoireNodeId → nodeId)
    │       └── linkedPresetId → presets.id
    └── tactics (structureTag / relatedPresetId → presets.id)
```

```
Chess.com scan → personal_blunders / conversion_missed (runtime, not hand-authored)
```

---

## 1. Repertoire lines

**File:** `data/repertoire/queens-gambit-caro-kann.json`  
**Example:** [schemas/examples/repertoire.json](./schemas/examples/repertoire.json)

### Adding a new line

1. Open the correct `roots[]` entry (`white-queens-gambit` or `black-caro-kann`).
2. Add a child under `tree` or nested `children[]`.
3. Assign unique `id` (kebab-case, e.g. `qg-tartakower`).
4. Fill `pathSan` and `pathUci` in sync—every ply including opponent moves in order.
5. Set `fen` at the **end of the line** (or branch point you train from). Verify on Lichess board paste.
6. Write `intent` (1–2 sentences) and `plans[]` (2–4 bullet ideas).
7. Set `branchPoint` (ply index to rewind on mistake in strict mode).
8. Set `priority`: 1 = study first.

### Getting FEN and moves

1. Play through the line on Lichess analysis with your target moves.
2. Copy **FEN** at training position.
3. Copy move list; convert to UCI with a tool or chess.js in browser console.
4. Cross-check: reloading FEN + applying `pathUci` reaches the same position.

### Checklist per node

- [ ] `id` unique globally across repertoire file
- [ ] `pathUci` length matches number of plies trained
- [ ] `fen` matches position after `pathUci`
- [ ] `intent` readable without chess engine jargon

---

## 2. Out-of-book deviations

**File:** `data/out-of-book/deviations.json`  
**Example:** [schemas/examples/out-of-book.json](./schemas/examples/out-of-book.json)

### When to add one

Add a deviation when opponents **commonly** play something other than your main line and you need a **plan**, not a 15-move sub-variation.

### Steps

1. Pick `parentNodeId` from an existing repertoire node (the line they deviated from).
2. Set `fen` **after** the opponent’s surprising move—it’s **your** turn.
3. Record `opponentMove` (san + uci) for display.
4. Write `principle` (one sentence rule).
5. Add 2–4 `planChoices`; exactly one with `correct: true`; others need helpful `feedback`.
6. List `acceptableUci`—all good moves you’d accept (usually 1–3).
7. Optional `optionalContinuation` for one short follow-up sequence.
8. Tag `severity`: `common` (study soon) vs `occasional`.

### Checklist

- [ ] `parentNodeId` exists in repertoire JSON
- [ ] `color` matches the side you train
- [ ] Test FEN on board: only legal moves are acceptable ones you listed

---

## 3. Opening → middlegame bridge

**File:** `data/bridge/handoffs.json`  
**Example:** [schemas/examples/bridge.json](./schemas/examples/bridge.json)

### When to add one

Every **priority-1** repertoire leaf should have at least one handoff.

### Steps

1. `repertoireNodeId` = leaf node `id`.
2. `handoffFen` = first middlegame position (after theory ends).
3. `recapSan` = last 4–8 moves of the opening line (for display).
4. `recapMoveCount` = how many moves to highlight (usually 4).
5. `planChoices` = 2–3 cards; one must have `id` equal to `correctPlanId`.
6. `intentSummary` = what you do in the middlegame (feeds UI after quiz pass).
7. `linkedPresetId` = must match a `presets.json` entry with `module: "middlegame"`.

### Checklist

- [ ] `linkedPresetId` exists in presets file
- [ ] `handoffFen` matches the structure that preset describes
- [ ] Wrong plan choices are plausible mistakes, not jokes

---

## 4. Middlegame & endgame presets

**File:** `data/presets/structures-and-endgames.json`  
**Example:** [schemas/examples/presets.json](./schemas/examples/presets.json)

### Middlegame preset

1. Unique `id` prefix `mg-`.
2. `module`: `"middlegame"`.
3. `fen` at characteristic structure.
4. `sideToTrain`: your color in that structure.
5. `structureTag` aligns with tactics (`karlsbad`, `caro-advance`, etc.).
6. `plans` + `objective` for the right panel in UI.
7. `sessionDefaults.resetOnMistake`: **false**.

### Endgame preset

1. Unique `id` prefix `eg-`.
2. `module`: `"endgame"`.
3. `sessionDefaults.resetOnMistake`: **true** for technique drills.
4. `stockfish.role`: usually `"defender"`.

### Checklist

- [ ] FEN is legal and side to move matches training goal
- [ ] Referenced from bridge `linkedPresetId` if used in handoff

---

## 5. Structure tactics

**File:** `data/tactics/structure-tactics.json`  
**Example:** [schemas/examples/structure-tactics.json](./schemas/examples/structure-tactics.json)

### Workflow

1. Create or pick a `pack` (`packId`, `structureTag`, `openingFamily`).
2. Add puzzles with unique `id` prefix `tac-`.
3. `fen` = puzzle start; `sideToMove` must match FEN.
4. `solutionUci` + `solutionSan`—verify on board.
5. `themeHint` on wrong attempt—nudge, don’t give move.
6. Optional `relatedPresetId` → middlegame practice link.

### Sourcing puzzles

- Your own blunder positions (export FEN from leak queue).
- Lichess tactics filtered manually (same structure).
- Positions from model games in your lines.

### Checklist

- [ ] `pack.puzzleIds` lists every puzzle in that pack
- [ ] `packId` on puzzle matches pack
- [ ] `difficulty` 1–3 consistent within pack progression

---

## 6. Chess.com-derived content (not hand-edited)

Blunders and conversion misses are **generated** by scan. You only configure:

- Username in app settings
- Thresholds in [CONSTANTS.md](./CONSTANTS.md)

To **curate** after scan: mark mastered, add `notes` in quiz UI, delete false positives from queue.

---

## ID naming conventions

| Type | Pattern | Example |
|------|---------|---------|
| Repertoire node | `{sys}-{line}` | `qg-qgd-exchange` |
| Deviation | `oob-{sys}-{tag}` | `oob-qgd-bb4` |
| Bridge handoff | `bridge-{sys}-{target}` | `bridge-qgd-exchange-karlsbad` |
| Middlegame preset | `mg-{tag}` | `mg-karlsbad-qgd` |
| Endgame preset | `eg-{theme}` | `eg-krk-basic` |
| Tactics pack | `pack-{tag}` | `pack-qg-c-file` |
| Tactic puzzle | `tac-{sys}-{nnn}` | `tac-qg-001` |

---

## Recommended content milestones

Align with [IMPLEMENTATION.md](./IMPLEMENTATION.md) authoring table:

| Milestone | Minimum content |
|-----------|-----------------|
| First repertoire session | 1 White line + 1 Black line, 6–10 moves each |
| Out-of-book | 2 deviations per main line |
| Bridge | 1 handoff per main line → existing preset |
| Middlegame | 2 structures (1 QG, 1 Caro) |
| Tactics | 20 puzzles in 3 packs |
| Endgame | 3 presets (K+R, opposition, 1 Caro-themed) |

---

## Validation before commit (manual)

1. JSON valid (no trailing commas).
2. All cross-references (`parentNodeId`, `linkedPresetId`, `relatedPresetId`) resolve.
3. Spot-check 3 FENs on Lichess board.
4. Play one repertoire line in app after Phase 3 ships.

Optional later: `npm run validate-content` script (not required for v1).

---

## Related documents

- [DATA.md](./DATA.md) — full field schemas
- [UI.md](./UI.md) — where content appears in screens
- [schemas/examples/](./schemas/examples/) — copy-paste starters
