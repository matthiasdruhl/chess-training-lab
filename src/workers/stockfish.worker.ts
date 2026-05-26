/**
 * Stockfish engine worker — package: stockfish@18.0.7
 * Build: stockfish-18-lite-single (single-threaded WASM, ~7MB)
 * https://github.com/nmrugg/stockfish.js
 *
 * Bundled via Vite into this module worker. worker-shim.ts clears onmessage
 * before stockfish.js loads. Import Stockfish ONLY here — never on main thread.
 */
import './worker-shim';
import createStockfish from 'stockfish/bin/stockfish-18-lite-single.js';
import stockfishWasmUrl from 'stockfish/bin/stockfish-18-lite-single.wasm?url';
import { DEFAULT_DEPTH } from '../constants/engine';
import { parseUciScoreCp } from '../utils/evalScore';
import type { WorkerIn, WorkerOut } from '../types/engine';

interface StockfishEngine {
  processCommand: (cmd: string) => void;
}

const workerScope = self;

let engine: StockfishEngine | null = null;
let engineReady = false;
let bootPromise: Promise<void> | null = null;

function post(out: WorkerOut): void {
  workerScope.postMessage(out);
}

function parseInfoLine(line: string): void {
  if (!line.startsWith('info ')) {
    return;
  }

  const parts = line.split(/\s+/);
  let depth = 0;
  let scoreCp: number | null = null;
  let pv: string[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] === 'depth' && parts[i + 1]) {
      depth = Number.parseInt(parts[i + 1], 10);
    }
    if (parts[i] === 'score') {
      scoreCp = parseUciScoreCp(parts, i);
    }
    if (parts[i] === 'pv') {
      pv = parts.slice(i + 1);
      break;
    }
  }

  if (depth > 0 && scoreCp !== null) {
    post({ type: 'info', depth, scoreCp, pv });
  }
}

function handleUciLine(line: string): void {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  if (trimmed === 'uciok') {
    engine?.processCommand('isready');
    return;
  }

  if (trimmed === 'readyok') {
    engineReady = true;
    post({ type: 'ready' });
    return;
  }

  if (trimmed.startsWith('info ')) {
    parseInfoLine(trimmed);
    return;
  }

  if (trimmed.startsWith('bestmove ')) {
    const uci = trimmed.split(/\s+/)[1];
    if (uci && uci !== '(none)') {
      const ponder = trimmed.split(/\s+/)[3];
      post({ type: 'bestmove', uci, ponder });
    } else {
      post({ type: 'error', message: 'Engine returned no legal move.' });
    }
  }
}

async function bootEngine(): Promise<void> {
  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    engine = await createStockfish({
      locateFile: (path: string) =>
        path.includes('.wasm') ? stockfishWasmUrl : path,
      listener: (line: string) => handleUciLine(line),
    });
    engine.processCommand('uci');
  })();

  return bootPromise;
}

function sendPosition(fen: string, moves?: string[]): void {
  if (!engine) {
    return;
  }
  if (moves && moves.length > 0) {
    engine.processCommand(`position fen ${fen} moves ${moves.join(' ')}`);
  } else {
    engine.processCommand(`position fen ${fen}`);
  }
}

function sendGo(movetime?: number, depth?: number): void {
  if (!engine) {
    return;
  }
  if (depth !== undefined) {
    engine.processCommand(`go depth ${depth}`);
  } else if (movetime !== undefined) {
    engine.processCommand(`go movetime ${movetime}`);
  } else {
    engine.processCommand(`go depth ${DEFAULT_DEPTH}`);
  }
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerIn>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'init':
      bootEngine().catch((err: unknown) => {
        post({
          type: 'error',
          message: err instanceof Error ? err.message : 'Engine init failed.',
        });
      });
      break;

    case 'position':
      if (!engineReady) {
        post({ type: 'error', message: 'Engine not ready.' });
        return;
      }
      sendPosition(msg.fen, msg.moves);
      break;

    case 'go':
      if (!engineReady) {
        post({ type: 'error', message: 'Engine not ready.' });
        return;
      }
      sendGo(msg.movetime, msg.depth);
      break;

    case 'stop':
      engine?.processCommand('stop');
      break;

    default:
      break;
  }
});
