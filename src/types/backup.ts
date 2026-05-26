import type { AppSettings } from './settings';
import type { BridgeProgress } from './bridge';
import type { OutOfBookProgress } from './outOfBook';
import type { DrillStats } from './preset';
import type { RepertoireProgress } from './repertoire';
import type { AnalysisCacheEntry, ConversionMissed, PersonalBlunder } from './review';
import type { TacticsProgress } from './tactics';

export interface AppBackupMeta {
  exportedAt: string;
  appVersion: string;
  dbVersion: number;
}

export interface AppBackup {
  meta: AppBackupMeta;
  settings: AppSettings;
  repertoire_progress: RepertoireProgress[];
  out_of_book_progress: OutOfBookProgress[];
  bridge_progress: BridgeProgress[];
  drill_stats: DrillStats[];
  tactics_progress: TacticsProgress[];
  personal_blunders: PersonalBlunder[];
  conversion_missed: ConversionMissed[];
  analysis_cache?: AnalysisCacheEntry[];
}
