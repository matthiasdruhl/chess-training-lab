export type RepertoireColor = 'white' | 'black';
export type TrainerMode = 'strict' | 'relaxed';
export type RepertoireProgressStatus = 'new' | 'learning' | 'review' | 'known';

export interface RepertoireFileMeta {
  version: string;
  name: string;
  updatedAt: string;
  targetRatingBand: [number, number];
  description?: string;
}

export interface RepertoireRootFilter {
  firstMoveSan?: string | null;
  respondsToSan?: string;
  ecoPrefix?: string[];
}

export interface RepertoireTrainerHints {
  showIntentAfterMistake: boolean;
  showArrowOnHint: boolean;
}

export interface RepertoireTrainerConfig {
  mode: TrainerMode;
  autoReply: boolean;
  hints: RepertoireTrainerHints;
}

export interface RepertoireNode {
  id: string;
  name: string;
  fen: string;
  pathSan: string[];
  pathUci: string[];
  intent: string;
  plans?: string[];
  priority: number;
  tags?: string[];
  branchPoint?: number;
  aliasesUci?: string[][];
  trainer: RepertoireTrainerConfig;
  children: RepertoireNode[];
}

export interface RepertoireRoot {
  id: string;
  color: RepertoireColor;
  opening: string;
  filter: RepertoireRootFilter;
  tree: RepertoireNode;
}

export interface RepertoireFile {
  meta: RepertoireFileMeta;
  roots: RepertoireRoot[];
}

export interface RepertoireProgress {
  version: 1;
  nodeId: string;
  color: RepertoireColor;
  status: RepertoireProgressStatus;
  streak: number;
  bestStreak: number;
  attempts: number;
  successfulCompletions: number;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
  notes: string;
}

export interface FlattenedRepertoireNode {
  node: RepertoireNode;
  color: RepertoireColor;
  opening: string;
  depth: number;
}

export interface TrainingStart {
  fen: string;
  plyIndex: number;
}
