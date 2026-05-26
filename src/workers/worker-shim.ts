/**
 * Run before stockfish.js loads.
 * - Clears onmessage so stockfish skips its worker auto-init branch.
 * - Provides document.currentScript so stockfish exports the factory without booting.
 */
Reflect.deleteProperty(globalThis, 'onmessage');

Object.defineProperty(globalThis, 'document', {
  value: { currentScript: { _exports: null } },
  configurable: true,
});
