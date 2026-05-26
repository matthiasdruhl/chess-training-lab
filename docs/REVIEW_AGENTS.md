# AI Code Review Agents

IDE-triggered review program for Chess Training Lab. Run each agent in a **new Cursor Agent chat** (not Plan mode). After each run, review the diff and commit when satisfied.

**Standard closing line for every prompt:**

> Write findings to `docs/reviews/findings/NN-<name>.md` using the template below, and append a one-line summary to `docs/reviews/REVIEW_LOG.md`.

## Finding template

```markdown
## Summary
- P0: N | P1: N | P2: N | P3: N

## Findings
### [P0] Title
- **Location:** path:line
- **Expected:** ...
- **Actual:** ...
- **Fix:** done | pending

## Tests added
- path — what it covers

## Manual verification
- [ ] step
```

**Severity:** P0 = wrong chess / data loss; P1 = broken module; P2 = grading or UX; P3 = docs or content debt.

---

## Wave 0 — Foundation

**Prompt:**

```
Implement Wave 0 for the Chess Training Lab review program:
- Add Vitest (npm test / npm run test:run)
- Extract src/services/chess/uci.ts and refactor callers
- Add src/test/fixtures.ts
- Scaffold tests under src/services/**/**.test.ts
- Add scripts/validate-content.ts and npm run validate:content
- Create docs/reviews/ structure and this REVIEW_AGENTS.md

Exit: npm run test:run passes.
```

---

## 1. Chess Core Agent

**Read:** `src/hooks/useChessSession.ts`, `src/components/board/TrainingBoard.tsx`, `src/services/chess/uci.ts`, `src/routes/index.tsx`

**Rubric:** Legal/illegal moves; FEN load; promotion defaults; `draggableSquares` wired to board; game-over vs reset.

**Manual:** `npm run dev` → `/` → FEN paste, legal/illegal drags.

---

## 2. Training Grading Agent

**Read:** `verifyMove.ts`, `useRepertoireTrainer.ts`, `useOutOfBookDrill.ts`, `useStructureTactics.ts`, `usePresetSession.ts`, `useBridgeHandoff.ts`

**Rubric:** Phases 3–6 in `docs/IMPLEMENTATION.md` — wrong-move feedback, JSON opponent plies, endgame reset, bridge deep-link.

**Tests:** `verifyMove.test.ts`, `treeUtils.test.ts`

---

## 3. Engine Agent

**Read:** `stockfish.worker.ts`, `queue.ts`, `EngineContext.tsx`, `useStockfish.ts`, `EvalBar.tsx`

**Rubric:** Illegal engine UCI rejected; serial queue; worker recovery.

**Tests:** `queue.test.ts`

**Manual:** Dashboard analyze + engine move; middlegame 5+ plies.

---

## 4. Content Integrity Agent

**Read:** `data/**/*.json`, `docs/CONTENT.md`, `scripts/validate-content.ts`

**Rubric:** `pathUci` replay; cross-refs (`parentNodeId`, `linkedPresetId`, etc.); M5 tactics count.

**Command:** `npm run validate:content`

---

## 5. Feature Module Agent

**Read:** `src/routes/*.tsx`, hooks, `docs/UI.md`, `docs/IMPLEMENTATION.md`

Walk routes: `/repertoire`, `/out-of-book`, `/bridge`, `/middlegame`, `/endgame`, `/tactics`, `/leaks`, `/conversion`, `/`.

---

## 6. Persistence & Backup Agent

**Read:** `src/storage/db.ts`, `backup.ts`, repos, `BackupPanel.tsx`

**Manual:** Export → clear site data → import restores history.

---

## 7. Chess.com Scan Agent

**Read:** `scanPipeline.ts`, `blunderDetector.ts`, `conversionDetector.ts`, `quizGrading.ts`, fixtures, `useGameScan.ts`

**Tests:** `quizGrading.test.ts`

**Manual:** Dashboard scan or fixture seed path (`npm run dev` required for live API).

---

## 8. Docs & Completeness Agent

**Read:** `README.md`, `docs/README.md`, `docs/IMPLEMENTATION.md`, `src/constants/modules.ts`, dashboard copy in `src/routes/index.tsx`

Update stale phase/preview language; mark verified IMPLEMENTATION checkboxes `[x]`.

---

## 9. Integrator Agent

```
Read all docs/reviews/findings/*.md and docs/reviews/REVIEW_LOG.md.
Close remaining P0/P1; fill test gaps; run npm run lint, npm run test:run, npm run build, npm run validate:content.
Update REVIEW_LOG with final definition-of-done status.
```

---

## Execution order

| Order | Agent | Parallel |
|-------|--------|----------|
| 0 | Foundation | — |
| 1 | Chess Core, Content, Docs | yes |
| 2 | Training Grading, Engine | yes |
| 3 | Feature, Persistence, Scan | yes |
| 4 | Integrator | — |
