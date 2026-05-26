## Summary
- P0: 0 | P1: 1 | P2: 0 | P3: 1

## Findings

### [P1] Invalid FEN in Caro out-of-book deviation
- **Location:** `data/out-of-book/deviations.json` — `oob-caro-2nc3`
- **Expected:** FEN loads in chess.js (8 ranks)
- **Actual:** Extra `/8/` rank caused `Invalid FEN: piece data does not contain 8 rows`
- **Fix:** done — corrected to `rnbqkbnr/pp1ppppp/2p5/8/4P3/2N5/PPPP1PPP/RNBQKBNR b KQkq - 2 2`

### [P3] Tactics content below M5 target
- **Location:** `data/tactics/structure-tactics.json`
- **Expected:** 20 puzzles (IMPLEMENTATION M5)
- **Actual:** 4 puzzles
- **Fix:** pending — content authoring, not a code bug

## Tests added

- `scripts/validate-content.ts` (run via `npm run validate:content`)

## Manual verification

- [x] `npm run validate:content`
