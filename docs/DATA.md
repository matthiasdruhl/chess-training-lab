# Data Layer Specification

Persistence, JSON content formats, and IndexedDB design for Chess Training Lab.

**Locked:** IndexedDB only for mutable app state ([DECISIONS.md](./DECISIONS.md) D-002).

---

## 1. Data layer overview

```
┌──────────────────┐     import at build      ┌─────────────────────┐
│  data/*.json     │ ───────────────────────► │  React app (memory) │
│  (git-tracked)   │                          │  repertoire, bridge, │
│                  │                          │  tactics, presets  │
└──────────────────┘                          └──────────┬──────────┘
                                                           │
                     read/write                            │
┌──────────────────┐◄─────────────────────────────────────┘
│  IndexedDB       │
│  chess-training- │
│  lab v1          │
└────────┬─────────┘
         │ export / import (Phase 5)
         ▼
┌──────────────────┐
│  backup.json     │  (user's disk, optional)
└──────────────────┘
```

| Layer | Mutable at runtime | Survives refresh | In git |
|-------|-------------------|------------------|--------|
| `data/repertoire/*.json` | No (edit file + reload) | Yes (rebundled) | Yes |
| `data/out-of-book/*.json` | No | Yes | Yes |
| `data/bridge/*.json` | No | Yes | Yes |
| `data/presets/*.json` | No | Yes | Yes |
| `data/tactics/*.json` | No | Yes | Yes |
| IndexedDB stores | Yes | Yes | No |
| Backup JSON | Yes (import) | N/A (file) | No |

---

## 2. IndexedDB specification

### 2.1 Database metadata

```typescript
export const DB_NAME = 'chess-training-lab';
export const DB_VERSION = 1;
```

### 2.2 Object stores

#### `settings` (singleton)

| Field | Value |
|-------|--------|
| **keyPath** | `id` (always `'app'`) |
| **indexes** | none |

**Record shape:** `AppSettings` (see §3.4)

---

#### `repertoire_progress`

| Field | Value |
|-------|--------|
| **keyPath** | `nodeId` |
| **indexes** | `color`, `lastPracticedAt`, `status` |

**Record shape:** `RepertoireProgress` (see §3.2)

---

#### `personal_blunders`

| Field | Value |
|-------|--------|
| **keyPath** | `id` (UUID v4) |
| **indexes** | `userState.status`, `source.playedAt`, `source.userColor`, `tags` (multiEntry) |

**Record shape:** `PersonalBlunder` (see §3.3)

---

#### `out_of_book_progress`

| Field | Value |
|-------|--------|
| **keyPath** | `deviationId` |
| **indexes** | `parentNodeId`, `status`, `lastPracticedAt` |

**Record shape:** `OutOfBookProgress` (see §3.3)

---

#### `bridge_progress`

| Field | Value |
|-------|--------|
| **keyPath** | `handoffId` |
| **indexes** | `repertoireNodeId`, `lastPracticedAt` |

**Record shape:** `BridgeProgress` (see §3.4)

---

#### `drill_stats`

| Field | Value |
|-------|--------|
| **keyPath** | `presetId` |
| **indexes** | `module`, `lastPlayedAt` |

**Record shape:** `DrillStats` (see §3.8)

---

#### `tactics_progress`

| Field | Value |
|-------|--------|
| **keyPath** | `puzzleId` |
| **indexes** | `packId`, `status`, `lastAttemptAt` |

**Record shape:** `TacticsProgress` (see §3.7)

---

#### `conversion_missed`

| Field | Value |
|-------|--------|
| **keyPath** | `id` (UUID v4) |
| **indexes** | `userState.status`, `source.playedAt`, `analysis.peakEvalCp`, `tags` (multiEntry) |

**Record shape:** `ConversionMissed` (see §3.6)

---

#### `analysis_cache`

| Field | Value |
|-------|--------|
| **keyPath** | `cacheKey` |
| **indexes** | `createdAt` |

**Record shape:**

```typescript
interface AnalysisCacheEntry {
  cacheKey: string;       // `${gameUrl}#${ply}`
  fen: string;
  playedMoveUci: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  bestMoveUci: string;
  depth: number;
  createdAt: string;      // ISO 8601
  version: 1;
}
```

Prevents re-analyzing the same ply when re-running leak detector.

---

### 2.3 Upgrade strategy

On `DB_VERSION` increment:

1. `onupgradeneeded`: create missing stores / indexes
2. `migrateV1ToV2(tx)`: transform records in a transaction
3. Never delete `personal_blunders` without explicit user action

v1 ships with all stores created in one `upgrade` callback.

---

### 2.4 Repository API (implementation contract)

Each store gets a thin repo module:

```typescript
// settingsRepo.ts
getSettings(): Promise<AppSettings>
putSettings(settings: AppSettings): Promise<void>

// progressRepo.ts
getProgress(nodeId: string): Promise<RepertoireProgress | undefined>
putProgress(record: RepertoireProgress): Promise<void>
listByColor(color: 'white' | 'black'): Promise<RepertoireProgress[]>

// blundersRepo.ts
getBlunder(id: string): Promise<PersonalBlunder | undefined>
putBlunder(blunder: PersonalBlunder): Promise<void>
listByStatus(status: BlunderStatus): Promise<PersonalBlunder[]>
deleteBlunder(id: string): Promise<void>

// outOfBookRepo.ts
getOutOfBookProgress(deviationId: string): Promise<OutOfBookProgress | undefined>
putOutOfBookProgress(record: OutOfBookProgress): Promise<void>

// bridgeRepo.ts
getBridgeProgress(handoffId: string): Promise<BridgeProgress | undefined>
putBridgeProgress(record: BridgeProgress): Promise<void>

// tacticsRepo.ts
getTacticsProgress(puzzleId: string): Promise<TacticsProgress | undefined>
putTacticsProgress(record: TacticsProgress): Promise<void>

// drillStatsRepo.ts
getDrillStats(presetId: string): Promise<DrillStats | undefined>
putDrillStats(stats: DrillStats): Promise<void>

// conversionRepo.ts
getConversion(id: string): Promise<ConversionMissed | undefined>
putConversion(record: ConversionMissed): Promise<void>
listConversionsByStatus(status: PuzzleStatus): Promise<ConversionMissed[]>
```

---

### 2.5 Debounced writes

UI-facing counters (`attempts`, `streak`) use **300 ms debounce** before `put` to avoid excessive IDB writes during rapid drill resets.

Critical events (new blunder saved, backup import) flush **immediately**.

---

### 2.6 Backup export format

Single JSON file for manual backup:

```typescript
interface AppBackup {
  meta: {
    exportedAt: string;       // ISO 8601
    appVersion: string;       // from package.json
    dbVersion: number;        // DB_VERSION
  };
  settings: AppSettings;
  repertoire_progress: RepertoireProgress[];
  out_of_book_progress: OutOfBookProgress[];
  bridge_progress: BridgeProgress[];
  drill_stats: DrillStats[];
  tactics_progress: TacticsProgress[];
  personal_blunders: PersonalBlunder[];
  conversion_missed: ConversionMissed[];
  analysis_cache?: AnalysisCacheEntry[];
}
```

**Import rules:**

- Replace all records in each store (full restore), or merge blunders by `id` if user selects "merge" (Phase 5 optional toggle; default **replace**)
- Validate `version` fields; reject unknown major versions with clear error

---

## 3. TypeScript record schemas

All persisted records include `version: 1`.

### 3.1 Opening repertoire tree (bundled JSON)

File: `data/repertoire/queens-gambit-caro-kann.json`

See full example: [schemas/examples/repertoire.json](./schemas/examples/repertoire.json)

```typescript
interface RepertoireFile {
  meta: {
    version: string;          // file format, e.g. "1.0.0"
    name: string;
    updatedAt: string;
    targetRatingBand: [number, number];
    description?: string;
  };
  roots: RepertoireRoot[];
}

interface RepertoireRoot {
  id: string;
  color: 'white' | 'black';
  opening: string;
  filter: {
    firstMoveSan?: string | null;
    respondsToSan?: string;
    ecoPrefix?: string[];
  };
  tree: RepertoireNode;
}

interface RepertoireNode {
  id: string;
  name: string;
  fen: string;
  pathSan: string[];
  pathUci: string[];
  intent: string;
  plans?: string[];
  priority: number;
  tags?: string[];
  branchPoint?: number;       // ply index to rewind on mistake
  aliasesUci?: string[][];    // optional accepted move sequences per ply
  trainer: {
    mode: 'strict' | 'relaxed';
    autoReply: boolean;
    hints: {
      showIntentAfterMistake: boolean;
      showArrowOnHint: boolean;
    };
  };
  children: RepertoireNode[];
}
```

**Trainer verification algorithm:**

```
expectedUci = node.pathUci[currentPlyInLine]
if userUci === expectedUci OR userUci in node.aliasesUci[currentPlyInLine]:
  advance; if autoReply and next ply is opponent: play pathUci[ply+1]
else:
  show intent; if strict: reset to fen at branchPoint or line start
```

---

### 3.2 Out-of-book deviations (bundled JSON)

File: `data/out-of-book/deviations.json`

See: [schemas/examples/out-of-book.json](./schemas/examples/out-of-book.json)

```typescript
interface OutOfBookFile {
  meta: { version: string; name: string; updatedAt: string };
  deviations: OutOfBookDeviation[];
}

interface OutOfBookDeviation {
  id: string;
  parentNodeId: string;       // links to RepertoireNode.id
  color: 'white' | 'black';
  name: string;
  fen: string;                // position AFTER opponent deviation, user to move
  opponentMove: { san: string; uci: string };
  principle: string;          // one-sentence rule
  planChoices: {
    id: string;
    label: string;
    correct: boolean;
    feedback: string;
  }[];
  acceptableUci: string[];    // good moves user can play
  optionalContinuation?: {
    userUci: string;
    opponentReplies: string[];
  };
  severity: 'common' | 'occasional';
  tags: string[];
}
```

---

### 3.3 Opening → middlegame handoffs (bundled JSON)

File: `data/bridge/handoffs.json`

See: [schemas/examples/bridge.json](./schemas/examples/bridge.json)

```typescript
interface BridgeFile {
  meta: { version: string; name: string; updatedAt: string };
  handoffs: BridgeHandoff[];
}

interface BridgeHandoff {
  id: string;
  repertoireNodeId: string;
  name: string;
  handoffFen: string;
  color: 'white' | 'black';
  recapSan: string[];         // last N moves of opening line
  recapMoveCount: number;
  planChoices: {
    id: string;
    label: string;
    correctPlanId?: string;   // omit on correct card; all others wrong
  }[];
  correctPlanId: string;
  intentSummary: string;
  linkedPresetId: string;     // middlegame Preset.id
  tags: string[];
}
```

**Note:** `planChoices` uses `id` matching `correctPlanId` for the right answer.

---

### 3.4 Repertoire progress (IndexedDB)

```typescript
interface RepertoireProgress {
  version: 1;
  nodeId: string;
  color: 'white' | 'black';
  status: 'new' | 'learning' | 'review' | 'known';
  streak: number;
  bestStreak: number;
  attempts: number;
  successfulCompletions: number;
  lastPracticedAt: string | null;  // ISO 8601
  nextReviewAt: string | null;     // optional simple SRS
  notes: string;
}
```

---

### 3.5 Out-of-book progress (IndexedDB)

```typescript
interface OutOfBookProgress {
  version: 1;
  deviationId: string;
  parentNodeId: string;
  status: 'new' | 'learning' | 'review' | 'known';
  planQuizCorrect: number;
  planQuizAttempts: number;
  moveCorrect: number;
  moveAttempts: number;
  lastPracticedAt: string | null;
  notes: string;
}
```

---

### 3.6 Bridge progress (IndexedDB)

```typescript
interface BridgeProgress {
  version: 1;
  handoffId: string;
  repertoireNodeId: string;
  planQuizPassed: boolean;
  planQuizAttempts: number;
  continuedToMiddlegame: boolean;
  lastPracticedAt: string | null;
  notes: string;
}
```

---

### 3.7 Personal blunder (IndexedDB)

See example: [schemas/examples/personal-blunder.json](./schemas/examples/personal-blunder.json)

```typescript
type BlunderStatus = 'new' | 'learning' | 'review' | 'mastered';
type Classification = 'blunder' | 'mistake' | 'inaccuracy';

interface PersonalBlunder {
  version: 1;
  id: string;
  source: {
    platform: 'chess.com';
    username: string;
    gameId: string;
    gameUrl: string;
    playedAt: string;
    timeClass: string;
    result: string;
    userColor: 'white' | 'black';
    opening: { eco: string; name: string };
    filterMatched: {
      repertoireSide: string;
      firstMovesSan: string[];
    };
  };
  position: {
    fen: string;
    sideToMove: 'white' | 'black';
    moveNumber: number;
    ply: number;
    playedMove: { san: string; uci: string };
    pvContextSan: string[];
  };
  analysis: {
    evalBeforeCp: number;
    evalAfterCp: number;
    swingCp: number;
    bestMove: { san: string; uci: string };
    secondBestGapCp?: number;
    depth: number;
    movetimeMs: number;
    classification: Classification;
    engine: { name: 'stockfish'; jsVersion: string };
  };
  quiz: {
    prompt: string;
    showPlayedMoveAsWrong: boolean;
    difficulty: 'normal' | 'hard';
  };
  userState: {
    status: BlunderStatus;
    attempts: number;
    correctAttempts: number;
    lastAttemptAt: string | null;
    masteredAt: string | null;
    notes: string;
  };
  tags: string[];
}
```

**Constants:** See [CONSTANTS.md](./CONSTANTS.md) for full list and `AppSettings` defaults.

---

### 3.8 Conversion missed (IndexedDB)

See: [schemas/examples/conversion-missed.json](./schemas/examples/conversion-missed.json)

```typescript
type PuzzleStatus = 'new' | 'learning' | 'review' | 'mastered';

interface ConversionMissed {
  version: 1;
  id: string;
  source: PersonalBlunder['source'];   // same shape as blunders
  position: PersonalBlunder['position'];
  analysis: {
    peakEvalCp: number;              // best eval user had earlier in game
    evalAtMomentCp: number;          // eval when user erred
    dropFromPeakCp: number;          // peak - evalAtMoment
    bestMove: { san: string; uci: string };
    plyOfPeak: number;
    depth: number;
    movetimeMs: number;
    engine: { name: 'stockfish'; jsVersion: string };
  };
  quiz: {
    prompt: string;                  // default: "You were winning. Find the move that keeps control."
    showPlayedMoveAsWrong: boolean;
  };
  userState: PersonalBlunder['userState'];
  tags: string[];
}
```

---

### 3.9 Structure tactics (bundled JSON)

File: `data/tactics/structure-tactics.json`

See: [schemas/examples/structure-tactics.json](./schemas/examples/structure-tactics.json)

```typescript
interface StructureTacticsFile {
  meta: { version: string; name: string; updatedAt: string };
  packs: TacticsPack[];
  puzzles: StructurePuzzle[];
}

interface TacticsPack {
  id: string;
  name: string;
  description: string;
  structureTag: string;
  openingFamily: 'queens-gambit' | 'caro-kann';
  puzzleIds: string[];
}

interface StructurePuzzle {
  id: string;
  packId: string;
  name: string;
  fen: string;
  sideToMove: 'white' | 'black';
  solutionUci: string;
  solutionAliasesUci?: string[];
  solutionSan: string;
  theme: string;                   // e.g. "c-file pin", "back rank"
  structureTag: string;
  difficulty: 1 | 2 | 3;
  themeHint: string;               // shown on wrong attempt
  relatedPresetId?: string;        // optional link to middlegame preset
  tags: string[];
}
```

---

### 3.10 Tactics progress (IndexedDB)

```typescript
interface TacticsProgress {
  version: 1;
  puzzleId: string;
  packId: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
  attempts: number;
  solves: number;
  revealedSolution: boolean;
  lastAttemptAt: string | null;
  masteredAt: string | null;
}
```

---

### 3.11 App settings (IndexedDB singleton)

```typescript
interface AppSettings {
  version: 1;
  id: 'app';
  chesscom: {
    username: string;
    defaultMonthsToFetch: number;   // default 2
  };
  leakDetector: {
    minSwingCp: number;             // default 150
    blunderSwingCp: number;         // default 200
    scanMovetimeMs: number;         // default 400
    quizDepth: number;              // default 18
  };
  conversionReview: {
    minPeakCp: number;              // default 200
    dropToCp: number;               // default 80
    scanMovetimeMs: number;         // default 400
  };
  engine: {
    defaultMovetimeMs: number;      // default 1000
    defaultDepth: number;           // default 16
  };
  ui: {
    boardTheme?: string;
    showEvalBar: boolean;
  };
  updatedAt: string;
}
```

---

### 3.12 Preset database (bundled JSON)

File: `data/presets/structures-and-endgames.json`

See example: [schemas/examples/presets.json](./schemas/examples/presets.json)

```typescript
interface PresetsFile {
  meta: { version: string; name: string; updatedAt: string };
  presets: Preset[];
}

interface Preset {
  id: string;
  module: 'middlegame' | 'endgame';
  name: string;
  fen: string;
  sideToTrain: 'white' | 'black';
  openingFamily: 'queens-gambit' | 'caro-kann' | null;
  structureTag?: string;
  endgameTheme?: string;
  plans: string[];
  objective: string;
  stockfish: {
    role: 'opponent' | 'defender';
    skillLevel: number;       // 0-20, use 20 for max
    movetimeMs: number;
    depth: number | null;
  };
  sessionDefaults: {
    resetOnMistake: boolean;
    resetOnDraw?: boolean;
    maxMoves?: number;
  };
  tags: string[];
}
```

---

### 3.13 Drill stats (IndexedDB)

```typescript
interface DrillStats {
  version: 1;
  presetId: string;
  module: 'middlegame' | 'endgame';
  attempts: number;
  completions: number;
  resetCount: number;
  totalMoves: number;
  lastPlayedAt: string | null;
  bestSessionMoves?: number;
  notes: string;
}
```

---

## 4. Persistence flows by module

### 4.1 Repertoire trainer

| Event | IDB action |
|-------|------------|
| Open node | `getProgress(nodeId)` |
| Complete line | `putProgress` — increment streak, set `lastPracticedAt` |
| Fail strict line | `putProgress` — reset streak, increment `attempts` |
| Mark known (UI button) | `status: 'known'` |

### 4.2 Middlegame / endgame

| Event | IDB action |
|-------|------------|
| Start preset | `getDrillStats(presetId)` |
| End session / unmount | `putDrillStats` — update counts, `lastPlayedAt` |
| Endgame reset | increment `resetCount` |

### 4.3 Out-of-book defender

| Event | IDB action |
|-------|------------|
| Open deviation | `getOutOfBookProgress(deviationId)` |
| Correct plan choice | increment `planQuizCorrect` |
| Correct move | increment `moveCorrect`; update `status` |
| Session end | `putOutOfBookProgress` |

### 4.4 Opening → middlegame bridge

| Event | IDB action |
|-------|------------|
| Pass plan quiz | `planQuizPassed: true` |
| Launch middlegame | `continuedToMiddlegame: true` |
| Session end | `putBridgeProgress` |

### 4.5 Structure tactics

| Event | IDB action |
|-------|------------|
| Wrong move | increment `attempts` |
| Correct move | increment `solves`; maybe `status: mastered` |
| Reveal solution | `revealedSolution: true` |

### 4.6 Leak detector

| Event | IDB action |
|-------|------------|
| Analyze ply | `get` / `put` `analysis_cache` |
| Swing ≥ threshold | `putBlunder` new UUID |
| Quiz attempt | update `userState` on blunder |
| Mastered | `userState.status = 'mastered'`, `masteredAt` now |

### 4.7 Conversion review

| Event | IDB action |
|-------|------------|
| Scan game (shared cache) | reuse `analysis_cache` eval series per ply |
| Peak + drop detected | `putConversion` new UUID |
| Quiz attempt | update `userState` on conversion record |

### 4.8 App startup hydration

```
1. openDB()
2. settings = await getSettings() ?? DEFAULT_SETTINGS
3. EngineContext init worker
4. Router render — each route pulls its own store data lazily
```

---

## 5. Engine worker message contract

Not stored in IDB; documented for analysis service implementation.

**Main → Worker**

```typescript
type WorkerIn =
  | { type: 'init' }
  | { type: 'position'; fen: string; moves?: string[] }
  | { type: 'go'; movetime?: number; depth?: number }
  | { type: 'stop' };
```

**Worker → Main**

```typescript
type WorkerOut =
  | { type: 'ready' }
  | { type: 'info'; depth: number; scoreCp: number; pv: string[] }
  | { type: 'bestmove'; uci: string; ponder?: string }
  | { type: 'error'; message: string };
```

---

## 6. Content authoring workflow

1. Edit repertoire → add matching `parentNodeId` / `repertoireNodeId` in out-of-book and bridge files
2. Ensure each bridge `linkedPresetId` exists in presets JSON
3. Tag tactics with same `structureTag` as middlegame presets for coherent packs
4. Restart dev server (or hot reload if JSON import is dynamic)
5. Progress in IDB is **unchanged** when content JSON changes unless ids (`nodeId`, `deviationId`, `handoffId`, `puzzleId`, `presetId`) are renamed

---

## 7. Capacity expectations

Personal use estimates:

| Store | Rough max | Size concern |
|-------|-----------|--------------|
| `personal_blunders` | 500–2000 | ~2–5 KB each |
| `conversion_missed` | 200–800 | similar to blunders |
| `analysis_cache` | 10k entries | prune > 90 days |
| `tactics_progress` | < 300 puzzles | negligible |
| `out_of_book_progress` | < 100 deviations | negligible |
| `bridge_progress` | < 50 handoffs | negligible |
| `repertoire_progress` | < 200 nodes | negligible |
| `drill_stats` | < 50 presets | negligible |

IndexedDB typical browser quota: tens of MB+ — sufficient without compression.

---

## 8. Example files

- [schemas/examples/repertoire.json](./schemas/examples/repertoire.json)
- [schemas/examples/out-of-book.json](./schemas/examples/out-of-book.json)
- [schemas/examples/bridge.json](./schemas/examples/bridge.json)
- [schemas/examples/presets.json](./schemas/examples/presets.json)
- [schemas/examples/structure-tactics.json](./schemas/examples/structure-tactics.json)
- [schemas/examples/personal-blunder.json](./schemas/examples/personal-blunder.json)
- [schemas/examples/conversion-missed.json](./schemas/examples/conversion-missed.json)
- [schemas/examples/app-backup.json](./schemas/examples/app-backup.json)
