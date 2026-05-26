import type { AppSettings } from '../types/settings';
import {
  BLUNDER_SWING_CP,
  CONVERSION_DROP_TO_CP,
  CONVERSION_MIN_PEAK_CP,
  CONVERSION_SCAN_MOVETIME_MS,
  LEAK_MIN_SWING_CP,
} from './analysis';
import { CHESSCOM_DEFAULT_MONTHS } from './chesscom';
import {
  DEFAULT_DEPTH,
  DEFAULT_MOVETIME_MS,
  QUIZ_DEPTH,
  SCAN_MOVETIME_MS,
} from './engine';

export function createDefaultSettings(): AppSettings {
  return {
    version: 1,
    id: 'app',
    chesscom: {
      username: '',
      defaultMonthsToFetch: CHESSCOM_DEFAULT_MONTHS,
    },
    leakDetector: {
      minSwingCp: LEAK_MIN_SWING_CP,
      blunderSwingCp: BLUNDER_SWING_CP,
      scanMovetimeMs: SCAN_MOVETIME_MS,
      quizDepth: QUIZ_DEPTH,
    },
    conversionReview: {
      minPeakCp: CONVERSION_MIN_PEAK_CP,
      dropToCp: CONVERSION_DROP_TO_CP,
      scanMovetimeMs: CONVERSION_SCAN_MOVETIME_MS,
    },
    engine: {
      defaultMovetimeMs: DEFAULT_MOVETIME_MS,
      defaultDepth: DEFAULT_DEPTH,
    },
    ui: {
      showEvalBar: true,
    },
    updatedAt: new Date().toISOString(),
  };
}
