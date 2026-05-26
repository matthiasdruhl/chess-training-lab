declare module 'stockfish/bin/stockfish-18-lite-single.js' {
  interface StockfishOptions {
    locateFile?: (path: string) => string;
    listener?: (line: string) => void;
  }

  interface StockfishEngine {
    processCommand: (cmd: string) => void;
  }

  function createStockfish(options?: StockfishOptions): Promise<StockfishEngine>;

  export default createStockfish;
}
