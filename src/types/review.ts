export type BlunderStatus = 'new' | 'learning' | 'review' | 'mastered';
export type PuzzleStatus = BlunderStatus;
export type Classification = 'blunder' | 'mistake' | 'inaccuracy';

export interface GameSource {
  platform: 'chess.com';
  username: string;
  gameId: string;
  gameUrl: string;
  playedAt: string;
  timeClass: string;
  result: string;
  userColor: 'white' | 'black';
  opening: { eco: string; name: string };
  filterMatched: {
    repertoireSide: string;
    firstMovesSan: string[];
  };
}

export interface PuzzlePosition {
  fen: string;
  sideToMove: 'white' | 'black';
  moveNumber: number;
  ply: number;
  playedMove: { san: string; uci: string };
  pvContextSan: string[];
}

export interface PersonalBlunder {
  version: 1;
  id: string;
  source: GameSource;
  position: PuzzlePosition;
  analysis: {
    evalBeforeCp: number;
    evalAfterCp: number;
    swingCp: number;
    bestMove: { san: string; uci: string };
    secondBestGapCp?: number;
    depth: number;
    movetimeMs: number;
    classification: Classification;
    engine: { name: 'stockfish'; jsVersion: string };
  };
  quiz: {
    prompt: string;
    showPlayedMoveAsWrong: boolean;
    difficulty: 'normal' | 'hard';
  };
  userState: {
    status: BlunderStatus;
    attempts: number;
    correctAttempts: number;
    lastAttemptAt: string | null;
    masteredAt: string | null;
    notes: string;
  };
  tags: string[];
}

export interface ConversionMissed {
  version: 1;
  id: string;
  source: GameSource;
  position: PuzzlePosition;
  analysis: {
    peakEvalCp: number;
    evalAtMomentCp: number;
    dropFromPeakCp: number;
    bestMove: { san: string; uci: string };
    plyOfPeak: number;
    depth: number;
    movetimeMs: number;
    engine: { name: 'stockfish'; jsVersion: string };
  };
  quiz: {
    prompt: string;
    showPlayedMoveAsWrong: boolean;
  };
  userState: PersonalBlunder['userState'];
  tags: string[];
}

export interface AnalysisCacheEntry {
  cacheKey: string;
  fen: string;
  playedMoveUci: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  bestMoveUci: string;
  depth: number;
  createdAt: string;
  version: 1;
}

export interface PlyAnalysis {
  cacheKey: string;
  fenBefore: string;
  fenAfter: string;
  ply: number;
  playedMoveUci: string;
  playedMoveSan: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  bestMoveUci: string;
  depth: number;
  pvContextSan: string[];
  moveNumber: number;
  sideToMove: 'white' | 'black';
}
