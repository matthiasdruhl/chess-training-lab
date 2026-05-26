/**
 * Stockfish engine worker — package: stockfish@18.0.7
 * Build: stockfish-18-asm (JavaScript, no WASM — reliable in classic workers)
 * https://github.com/nmrugg/stockfish.js
 *
 * Stockfish must run as a classic worker script (not a Vite module worker).
 * A tiny bootstrap blob stubs Node-like globals, then importScripts() loads stockfish.
 */
import stockfishJs from 'stockfish/bin/stockfish-18-asm.js?url';

export function createStockfishWorker(): Worker {
  const scriptUrl = new URL(stockfishJs, import.meta.url).href;

  const bootstrap = `
Object.defineProperty(self, 'process', {
  value: { env: {} },
  configurable: true,
  writable: true,
});
if (!('onmessage' in self)) {
  self.onmessage = null;
}
importScripts(${JSON.stringify(scriptUrl)});
`;

  const blob = new Blob([bootstrap], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob), { type: 'classic' });
}
