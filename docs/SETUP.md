# Development Setup

Environment and toolchain for Chess Training Lab. Personal localhost use only.

**Project path:** `~/Projects/chess-training-lab/`

---

## Prerequisites

| Tool | Minimum version |
|------|-----------------|
| Node.js | 20 LTS recommended |
| npm | 10+ (comes with Node) |

Check:

```bash
node -v
npm -v
```

---

## Initial scaffold (Phase 1)

Run once when starting implementation:

```bash
cd ~/Projects/chess-training-lab
npm create vite@latest . -- --template react-ts
```

If the directory is not empty (docs already exist), Vite may prompt—choose to merge or scaffold in place.

### Core dependencies

```bash
npm install chess.js react-chessboard react-router-dom idb
npm install -D tailwindcss @tailwindcss/vite
```

### Phase 2 — Stockfish

Add a worker-compatible Stockfish package (exact package TBD at implementation—common options):

- `stockfish.js` / `stockfish.wasm.js`

```bash
# Example — verify compatibility with Vite worker import before locking version
npm install stockfish
```

Document the chosen package in a comment at top of `src/workers/stockfish.worker.ts`.

---

## Tailwind (Vite plugin)

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  server: {
    proxy: {
      '/api/chesscom': {
        target: 'https://api.chess.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chesscom/, '/pub'),
      },
    },
  },
});
```

`src/index.css`:

```css
@import "tailwindcss";
```

---

## Chess.com proxy (required for Phase 7)

Client base URL helper `src/services/chesscom/client.ts`:

```typescript
export const CHESSCOM_BASE = import.meta.env.DEV
  ? '/api/chesscom'
  : 'https://api.chess.com/pub';
```

**Personal workflow:** Always use `npm run dev` when testing leaks/conversion. For `vite preview`, duplicate the `server.proxy` block or use `preview.proxy` (Vite 5+).

If fetch fails with CORS in browser console, the proxy is not active.

---

## Stockfish Web Worker

`src/workers/stockfish.worker.ts`:

```typescript
// Import stockfish ONLY inside this file — never in React components
const worker = self as DedicatedWorkerGlobalScope;

// new Worker(new URL('../workers/stockfish.worker.ts', import.meta.url), { type: 'module' })
```

`EngineContext` creates one worker on app load; sends `uci` / `isready` before accepting jobs.

See [ARCHITECTURE.md](./ARCHITECTURE.md) §7.1 and [DATA.md](./DATA.md) §5 for message contract.

---

## Content files (copy before module phases)

| Phase | Copy from → to |
|-------|----------------|
| 3 | `docs/schemas/examples/repertoire.json` → `data/repertoire/queens-gambit-caro-kann.json` |
| 4 | `out-of-book.json` → `data/out-of-book/deviations.json` |
| 4 | `bridge.json` → `data/bridge/handoffs.json` |
| 5 | `presets.json` → `data/presets/structures-and-endgames.json` |
| 6 | `structure-tactics.json` → `data/tactics/structure-tactics.json` |

Create `data/` folders if missing:

```bash
mkdir -p data/{repertoire,out-of-book,bridge,presets,tactics}
```

Import JSON in app:

```typescript
import repertoire from '../../data/repertoire/queens-gambit-caro-kann.json';
```

Ensure `tsconfig.json` has `resolveJsonModule: true`.

---

## Scripts (`package.json`)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local app at `http://localhost:5173` (default Vite port) |
| `npm run build` | Production bundle (optional; personal use) |
| `npm run preview` | Preview build—needs proxy for Chess.com |

Optional later:

| Script | Purpose |
|--------|---------|
| `npm run validate-content` | Check JSON cross-refs |
| `npm test` | Vitest unit tests |

---

## IndexedDB in DevTools

1. Open app in Chrome/Edge/Firefox
2. DevTools → **Application** → **IndexedDB** → `chess-training-lab`
3. After Phase 1, confirm all 9 object stores exist

To reset training data: delete database or use Phase 8 import/export.

---

## Environment variables

v1 uses **no `.env` file** required. Optional future:

| Variable | Purpose |
|----------|---------|
| `VITE_CHESSCOM_BASE` | Override API base |
| `VITE_USE_FIXTURES` | Offline Chess.com JSON |

---

## Folder structure after Phase 1

Matches [ARCHITECTURE.md](./ARCHITECTURE.md) §6. Key paths:

```
src/
  main.tsx
  App.tsx
  routes/          # 8 route files + dashboard
  components/
  hooks/
  workers/
  services/
  storage/
  constants/       # mirror docs/CONSTANTS.md
  types/
data/              # JSON content (git-tracked)
docs/              # specification (this folder)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Worker failed to load | Check Vite `worker.format: 'es'`; import path uses `import.meta.url` |
| Board not rendering | Ensure `react-chessboard` CSS/dist imported if required by version |
| Chess.com 403/429 | Increase delay; reduce months fetched |
| IDB not persisting | Not in private browsing with storage blocked |
| JSON import error | Validate JSON; enable `resolveJsonModule` |

---

## Git (optional)

When ready to version the project:

```bash
git init
git add .
# .gitignore from Vite template includes node_modules, dist
```

Do not commit browser backup exports or live API fixture dumps with personal games unless intended.

---

## Related documents

- [IMPLEMENTATION.md](./IMPLEMENTATION.md) — phase order
- [CHESSCOM.md](./CHESSCOM.md) — API details
- [CONSTANTS.md](./CONSTANTS.md) — defaults
- [UI.md](./UI.md) — routes to implement
