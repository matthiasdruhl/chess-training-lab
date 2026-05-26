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
