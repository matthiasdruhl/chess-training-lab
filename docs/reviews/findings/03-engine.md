## Summary
- P0: 0 | P1: 0 | P2: 0 | P3: 0

## Findings

_No issues. Engine queue uses shared `isLegalUciForFen` from `uci.ts`._

## Tests added

- `src/services/engine/queue.test.ts` — legal/illegal/promotion UCI guard

## Manual verification

- [ ] Dashboard — Analyze FEN + Engine move
- [ ] Middlegame — 5+ plies without UI freeze
