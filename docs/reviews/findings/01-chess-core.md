## Summary
- P0: 0 | P1: 0 | P2: 1 | P3: 0

## Findings

### [P2] legalMoves computed but not used for drag hints
- **Location:** `src/hooks/useChessSession.ts`
- **Expected:** Board restricts dragging to pieces with legal moves
- **Actual:** `legalMoves` was exported but unused; illegal drags relied on drop rejection only
- **Fix:** done — `draggableSquares` derived from `legalMoves` and passed to `TrainingBoard` via `canDragPiece`

## Tests added

- Covered in `src/services/chess/uci.test.ts`

## Manual verification

- [ ] `npm run dev` → `/` — drag piece with no legal moves (should not start drag)
- [ ] Illegal drop still rejected via `makeMove` returning false
