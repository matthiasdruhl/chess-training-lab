import type { AppSettings } from '../types/settings';

export type SettingsPatch = {
  chesscom?: Partial<AppSettings['chesscom']>;
  leakDetector?: Partial<AppSettings['leakDetector']>;
  conversionReview?: Partial<AppSettings['conversionReview']>;
  engine?: Partial<AppSettings['engine']>;
  ui?: Partial<AppSettings['ui']>;
  version?: AppSettings['version'];
  id?: AppSettings['id'];
  updatedAt?: string;
};

export function mergeSettings(
  base: AppSettings,
  patch: SettingsPatch,
): AppSettings {
  return {
    ...base,
    ...patch,
    chesscom: patch.chesscom
      ? { ...base.chesscom, ...patch.chesscom }
      : base.chesscom,
    leakDetector: patch.leakDetector
      ? { ...base.leakDetector, ...patch.leakDetector }
      : base.leakDetector,
    conversionReview: patch.conversionReview
      ? { ...base.conversionReview, ...patch.conversionReview }
      : base.conversionReview,
    engine: patch.engine ? { ...base.engine, ...patch.engine } : base.engine,
    ui: patch.ui ? { ...base.ui, ...patch.ui } : base.ui,
  };
}

export function mergeSettingsPatches(
  base: SettingsPatch | null,
  patch: SettingsPatch,
): SettingsPatch {
  if (!base) {
    return patch;
  }
  return {
    ...base,
    ...patch,
    chesscom: patch.chesscom
      ? { ...base.chesscom, ...patch.chesscom }
      : base.chesscom,
    leakDetector: patch.leakDetector
      ? { ...base.leakDetector, ...patch.leakDetector }
      : base.leakDetector,
    conversionReview: patch.conversionReview
      ? { ...base.conversionReview, ...patch.conversionReview }
      : base.conversionReview,
    engine: patch.engine
      ? { ...base.engine, ...patch.engine }
      : base.engine,
    ui: patch.ui ? { ...base.ui, ...patch.ui } : base.ui,
  };
}
