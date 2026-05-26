## Summary
- P0: 0 | P1: 0 | P2: 0 | P3: 0

## Findings

`gradeQuizMove` handles exact UCI, engine best, and cp tolerance. Scan pipeline uses chess.js for PGN replay.

## Tests added

- `quizGrading.test.ts` — exact, engine match, tolerance, illegal UCI

## Manual verification

- [ ] Dashboard scan (dev server) or fixture seed when API blocked
- [ ] `/leaks` quiz updates `userState` after refresh
