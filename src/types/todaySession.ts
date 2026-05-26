export type TodaySessionStepId =
  | 'repertoire'
  | 'out-of-book'
  | 'bridge'
  | 'middlegame'
  | 'tactics'
  | 'leaks'
  | 'conversion'
  | 'endgame';

export interface TodaySessionTargets {
  repertoireNodeId?: string;
  deviationId?: string;
  parentNodeId?: string;
  handoffId?: string;
  middlegamePresetId?: string;
  tacticsPackId?: string;
  endgamePresetId?: string;
}

export interface TodaySessionState {
  date: string;
  completedStepIds: TodaySessionStepId[];
  order?: TodaySessionStepId[];
  targets?: TodaySessionTargets;
}
