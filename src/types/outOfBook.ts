export interface OutOfBookFileMeta {
  version: string;
  name: string;
  updatedAt: string;
}

export type OutOfBookSeverity = 'common' | 'occasional';
export type TrainingColor = 'white' | 'black';
export type ProgressStatus = 'new' | 'learning' | 'review' | 'known';

export interface OutOfBookPlanChoice {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface OutOfBookOptionalContinuation {
  userUci: string;
  opponentReplies: string[];
}

export interface OutOfBookDeviation {
  id: string;
  parentNodeId: string;
  color: TrainingColor;
  name: string;
  fen: string;
  opponentMove: { san: string; uci: string };
  principle: string;
  planChoices: OutOfBookPlanChoice[];
  acceptableUci: string[];
  optionalContinuation?: OutOfBookOptionalContinuation;
  severity: OutOfBookSeverity;
  tags: string[];
}

export interface OutOfBookFile {
  meta: OutOfBookFileMeta;
  deviations: OutOfBookDeviation[];
}

export interface OutOfBookProgress {
  version: 1;
  deviationId: string;
  parentNodeId: string;
  status: ProgressStatus;
  planQuizCorrect: number;
  planQuizAttempts: number;
  moveCorrect: number;
  moveAttempts: number;
  lastPracticedAt: string | null;
  notes: string;
}

