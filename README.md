# Chess Training Lab

A **personal, local-only** web application for structured chess training. Built for a ~1600 Rapid player focused on **Queen's Gambit** (White) and **Caro-Kann** (Black).

## What this is

- Runs on **localhost** via Vite (`npm run dev`)
- **No backend**, no accounts, no cloud sync
- **Persistent progress** via **IndexedDB** in the browser
- Training content (lines, deviations, tactics, positions) ships as **JSON files** in the repo

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/README.md](docs/README.md) | Documentation index and read order |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System overview, all 8 modules, runtime model |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Locked technical and product decisions (ADRs) |
| [docs/DATA.md](docs/DATA.md) | IndexedDB stores, JSON schemas, persistence flows |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | Phased build plan (8 phases) with acceptance criteria |
| [docs/SETUP.md](docs/SETUP.md) | Vite, dependencies, Chess.com proxy, worker setup |
| [docs/UI.md](docs/UI.md) | Screen layouts, flows, navigation, empty states |
| [docs/CONTENT.md](docs/CONTENT.md) | How to author repertoire, deviations, bridge, tactics |
| [docs/CHESSCOM.md](docs/CHESSCOM.md) | Public API, scan pipeline, blunder/conversion rules |
| [docs/CONSTANTS.md](docs/CONSTANTS.md) | Thresholds and default settings (single reference) |

Example data files live in [docs/schemas/examples/](docs/schemas/examples/).

## Training modules (8)

| # | Module | Purpose |
|---|--------|---------|
| 1 | **Repertoire Trainer** | Memorize QG / Caro lines, intents, and move order |
| 2 | **Out-of-Book Defender** | Practice principled responses when opponents leave your prep |
| 3 | **Opening → Middlegame Bridge** | Connect end-of-opening positions to concrete middlegame plans |
| 4 | **Middlegame Simulator** | Play from characteristic pawn structures vs Stockfish |
| 5 | **Structure Tactics** | Pattern recognition in your opening structures (preview route; full module in Phase 6). |
| 6 | **Leak Detector** | Turn Chess.com mistakes into repeatable puzzles (coming in Phase 7). |
| 7 | **Conversion Review** | Fix winning positions you failed to convert (coming in Phase 7). |
| 8 | **Endgame Drill-Master** | Strict, reset-heavy endgame technique vs Stockfish |

## Status

**Phase 5 complete** — run `npm install && npm run dev`, then open http://localhost:5173. Module 5 currently exposes a preview route while full Structure Tactics content is scheduled in Phase 6; see [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for upcoming scope.
