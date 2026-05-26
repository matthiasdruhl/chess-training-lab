# Chess.com Public API Integration

How the app fetches games, filters repertoire-relevant lines, and populates **Leak Detector** and **Conversion Review**.

**Scope:** Read-only public API. No OAuth. Username stored in IndexedDB `settings`.

---

## Base URL

| Environment | Base |
|-------------|------|
| Production API | `https://api.chess.com/pub` |
| Local dev (proxied) | `/api/chesscom` → rewrites to `/pub` on api.chess.com |

See [SETUP.md](./SETUP.md) for Vite proxy configuration.

---

## Endpoints used

### 1. Player profile (optional sanity check)

```
GET /player/{username}
```

Use to verify username exists before scan. Response includes `name`, `title`, etc.

### 2. Monthly game archives (list)

```
GET /player/{username}/games/archives
```

**Response shape (relevant fields):**

```json
{
  "archives": [
    "https://api.chess.com/pub/player/{username}/games/2025/05",
    "https://api.chess.com/pub/player/{username}/games/2025/04"
  ]
}
```

**App behavior:**

- Sort archives **newest first**
- Take first `N` months from `settings.chesscom.defaultMonthsToFetch` (default **2**)
- Do not fetch entire lifetime by default

### 3. Monthly games (PGN bundle)

```
GET /player/{username}/games/{YYYY}/{MM}
```

Example: `/player/hikaru/games/2025/05`

**Response:** JSON object with `games[]`. Each game includes:

| Field | Use |
|-------|-----|
| `url` | `gameUrl` / `gameId` in stored records |
| `pgn` | Replay with chess.js |
| `time_control` | Filter rapid if desired |
| `time_class` | `rapid`, `blitz`, etc. |
| `end_time` | `playedAt` (Unix → ISO) |
| `white.username` / `black.username` | Determine user color |
| `white.result` / `black.result` | Win/loss/draw |

**App:** Prefer `time_class === "rapid"` when user cares about Rapid rating (configurable later; default include rapid only).

---

## Request throttling

| Rule | Value |
|------|-------|
| Minimum delay between archive GETs | **300 ms** |
| On HTTP **429** | Exponential backoff: 1s → 2s → 4s (max 3 retries) |
| Concurrent requests | **1** at a time (serial) |
| User-visible progress | `current / total` games processed |

Chess.com asks for courteous use; no API key required.

---

## CORS and localhost

Browsers may block direct `fetch` to `api.chess.com` from `localhost`.

**Mitigation (required for dev):**

```ts
// vite.config.ts — see SETUP.md
proxy: {
  '/api/chesscom': {
    target: 'https://api.chess.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/chesscom/, '/pub'),
  },
}
```

Client code uses:

```ts
const base = import.meta.env.DEV
  ? '/api/chesscom'
  : 'https://api.chess.com/pub';
```

For personal local-only use, **always run via `npm run dev`** with proxy. `vite preview` needs the same proxy block.

---

## Game filters (repertoire bucket)

Applied **after** downloading monthly JSON, **before** engine analysis.

### White — Queen's Gambit bucket

User played **White** AND opening moves match:

- PGN token for ply 1: `1. d4` (normalize spaces)
- Optional stricter: ply 2 includes `c4` within first 4 half-moves
- User color = white in game object

### Black — Caro-Kann bucket

User played **Black** AND:

- `1. e4` and `1... c6` (accept `1...c6` without space)
- User color = black

### Implementation notes

- Parse PGN with chess.js `loadPgn()`; read `history()` for first 4 full moves.
- Store `filterMatched.repertoireSide` and `firstMovesSan[]` on each saved puzzle.
- Games failing filter: **skip** (do not analyze).

### Optional ECO filter (secondary)

If PGN header has `ECO` or opening name, tag for dashboard filters—not required for inclusion in v1.

---

## Scan pipeline (single pass)

```
1. Load settings.username
2. Fetch archives → last N months
3. For each month URL (throttled):
     GET games JSON
     Filter games → candidate list
4. For each candidate game:
     Replay PGN ply by ply
     For each USER move:
       cacheKey = gameUrl + ply
       If analysis_cache hit → reuse evals
       Else engine: eval before user move, user plays, eval after
       Put analysis_cache
       Run detectBlunder() → maybe personal_blunders
       Track peak eval for user → run detectConversionMiss() at end / on drop
5. UI: show counts (new blunders, new conversions)
```

**Efficiency:** One eval series per user ply; conversion detector reads running `peakEvalCp` timeline.

---

## Blunder detection

See [CONSTANTS.md](./CONSTANTS.md).

**Per user ply:**

1. `evalBeforeCp` — side to move = user, before their move
2. User plays actual move from game
3. `evalAfterCp` — still user POV after their move (invert if engine returns STM)
4. `swingCp = |evalBefore - evalAfter|` (large swing = user blundered)
5. If `swingCp >= minSwingCp` → create `PersonalBlunder`
6. `bestMove` from engine at position before move

**Dedup:** Do not insert second blunder with same `fen` + `playedMove.uci` in same game.

---

## Conversion miss detection

**Track during game replay:**

- `peakEvalCp` = max eval (user perspective) when user had advantage
- `plyOfPeak` = ply index at peak

**Flag conversion miss when:**

- `peakEvalCp >= conversionReview.minPeakCp` (default **200**), AND
- Later user move: `evalAtMomentCp <= conversionReview.dropToCp` (default **80**), OR
- Game result is draw/loss and peak was ≥ 200 at some point

**Save:** Position at the **first serious drop** after peak (not every subsequent mistake).

**Dedup:** One conversion record per game per “episode” (first drop after peak).

---

## Quiz mode (both modules)

| Step | Behavior |
|------|----------|
| Load record | Set board to `position.fen` |
| User moves | Compare UCI to `analysis.bestMove.uci` within **30 cp** optional engine verify |
| Wrong | Show best move + short eval text; increment attempts |
| Right | Offer **Mark mastered** |
| Mastered | `userState.status = mastered`, `masteredAt` timestamp |

Conversion quiz copy uses `quiz.prompt` emphasizing winning advantage.

---

## Failure handling (UI)

| Error | User message | Recovery |
|-------|--------------|----------|
| 404 on username | “Username not found on Chess.com” | Fix settings |
| Network offline | “Check connection” | Retry button |
| 429 rate limit | “Chess.com asked to slow down—retrying…” | Auto backoff |
| CORS / failed fetch (no proxy) | “Enable dev proxy—see SETUP.md” | Link to doc |
| Empty filtered set | “No d4 / Caro games in this period” | Increase months |
| Engine crash mid-scan | “Scan paused—resume?” | Resume from last game index (optional v1: restart) |

---

## Privacy

- Only **your** username’s public games are fetched
- PGN snippets stored locally in IndexedDB and optional backup export
- No data sent to any server except Chess.com API

---

## Testing without live API

1. Save one monthly archive JSON response to `fixtures/chesscom-2025-05.json`
2. Dev toggle `useFixtures: true` in settings (implementation optional) OR mock `client.ts` in Vitest
3. Seed one `personal-blunder` and one `conversion-missed` from [schemas/examples/](./schemas/examples/)

---

## Related documents

- [CONSTANTS.md](./CONSTANTS.md) — thresholds
- [DATA.md](./DATA.md) — `PersonalBlunder`, `ConversionMissed` shapes
- [UI.md](./UI.md) — Scan / Queue / Quiz tabs
- [SETUP.md](./SETUP.md) — proxy config
