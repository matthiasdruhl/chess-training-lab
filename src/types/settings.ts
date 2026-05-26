export interface AppSettings {
  version: 1;
  id: 'app';
  chesscom: {
    username: string;
    defaultMonthsToFetch: number;
  };
  leakDetector: {
    minSwingCp: number;
    blunderSwingCp: number;
    scanMovetimeMs: number;
    quizDepth: number;
  };
  conversionReview: {
    minPeakCp: number;
    dropToCp: number;
    scanMovetimeMs: number;
  };
  engine: {
    defaultMovetimeMs: number;
    defaultDepth: number;
  };
  ui: {
    boardTheme?: string;
    showEvalBar: boolean;
  };
  updatedAt: string;
}
