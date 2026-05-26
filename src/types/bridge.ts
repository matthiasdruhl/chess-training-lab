import type { ProgressStatus, TrainingColor } from './outOfBook';

export interface BridgeFileMeta {
  version: string;
  name: string;
  updatedAt: string;
}

export interface BridgePlanChoice {
  id: string;
  label: string;
  correctPlanId?: string;
}

export interface BridgeHandoff {
  id: string;
  repertoireNodeId: string;
  name: string;
  handoffFen: string;
  color: TrainingColor;
  recapSan: string[];
  recapMoveCount: number;
  planChoices: BridgePlanChoice[];
  correctPlanId: string;
  intentSummary: string;
  linkedPresetId: string;
  tags: string[];
}

export interface BridgeFile {
  meta: BridgeFileMeta;
  handoffs: BridgeHandoff[];
}

export interface BridgeProgress {
  version: 1;
  handoffId: string;
  repertoireNodeId: string;
  planQuizPassed: boolean;
  planQuizAttempts: number;
  continuedToMiddlegame: boolean;
  lastPracticedAt: string | null;
  notes: string;
}

export type BridgeProgressStatus = ProgressStatus;

