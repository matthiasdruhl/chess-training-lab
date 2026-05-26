# Documentation Index

Complete specification for **Chess Training Lab** — personal, localhost, **8 modules**, **IndexedDB** persistence.

## Read order (first time)

1. **[DECISIONS.md](./DECISIONS.md)** — Locked choices (~5 min)
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design and modules
3. **[DATA.md](./DATA.md)** — IndexedDB + JSON schemas
4. **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** — Phases 1–8

## Before / during coding

| Document | When to use |
|----------|-------------|
| **[SETUP.md](./SETUP.md)** | Phase 1 — Vite, deps, proxy, worker |
| **[UI.md](./UI.md)** | Phase 1+ — screens, layout, empty states |
| **[CONSTANTS.md](./CONSTANTS.md)** | Phase 1+ — thresholds and defaults |
| **[CONTENT.md](./CONTENT.md)** | Phase 3+ — editing JSON training content |
| **[CHESSCOM.md](./CHESSCOM.md)** | Phase 7 — API, scan, blunder/conversion detection |

## Example data (copy into `data/`)

| Example | Target path |
|---------|-------------|
| [schemas/examples/repertoire.json](./schemas/examples/repertoire.json) | `data/repertoire/queens-gambit-caro-kann.json` |
| [schemas/examples/out-of-book.json](./schemas/examples/out-of-book.json) | `data/out-of-book/deviations.json` |
| [schemas/examples/bridge.json](./schemas/examples/bridge.json) | `data/bridge/handoffs.json` |
| [schemas/examples/presets.json](./schemas/examples/presets.json) | `data/presets/structures-and-endgames.json` |
| [schemas/examples/structure-tactics.json](./schemas/examples/structure-tactics.json) | `data/tactics/structure-tactics.json` |
| [schemas/examples/personal-blunder.json](./schemas/examples/personal-blunder.json) | Reference for `personal_blunders` |
| [schemas/examples/conversion-missed.json](./schemas/examples/conversion-missed.json) | Reference for `conversion_missed` |
| [schemas/examples/app-backup.json](./schemas/examples/app-backup.json) | Backup export shape |

## IndexedDB stores (v1)

`settings` · `repertoire_progress` · `out_of_book_progress` · `bridge_progress` · `drill_stats` · `tactics_progress` · `personal_blunders` · `conversion_missed` · `analysis_cache`

## Project location

```
~/Projects/chess-training-lab/
```

Documentation complete for v1 implementation. Application source not yet scaffolded.
