export type EngineStatus = 'idle' | 'thinking' | 'ready' | 'error';

export interface GoLimits {
  depth?: number;
  movetime?: number;
}

export interface AnalysisResult {
  scoreCp: number;
  depth: number;
  pv: string[];
  bestMoveUci: string;
}

export type WorkerIn =
  | { type: 'init' }
  | { type: 'position'; fen: string; moves?: string[] }
  | { type: 'go'; movetime?: number; depth?: number }
  | { type: 'stop' }
  | { type: 'setoption'; name: string; value: string | number | boolean };

export type WorkerOut =
  | { type: 'ready' }
  | { type: 'info'; depth: number; scoreCp: number; pv: string[] }
  | { type: 'bestmove'; uci: string; ponder?: string }
  | { type: 'error'; message: string };
