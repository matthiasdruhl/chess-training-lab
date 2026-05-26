import packageJson from '../../package.json';
import { DB_VERSION } from '../constants/db';
import type { AppBackup } from '../types/backup';
import { openAppDB } from './db';

type BackupDataStore =
  | 'repertoire_progress'
  | 'out_of_book_progress'
  | 'bridge_progress'
  | 'drill_stats'
  | 'tactics_progress'
  | 'personal_blunders'
  | 'conversion_missed'
  | 'analysis_cache';

const BACKUP_STORES: BackupDataStore[] = [
  'repertoire_progress',
  'out_of_book_progress',
  'bridge_progress',
  'drill_stats',
  'tactics_progress',
  'personal_blunders',
  'conversion_missed',
  'analysis_cache',
];

export class BackupValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(errors.join('\n'));
    this.name = 'BackupValidationError';
    this.errors = errors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isRecordArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function validateVersionField(
  record: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (record.version !== 1) {
    errors.push(`${path}.version must be 1.`);
  }
}

function validateRepertoireProgress(record: unknown, index: number, errors: string[]): void {
  const path = `repertoire_progress[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateVersionField(record, path, errors);
  if (!isString(record.nodeId)) {
    errors.push(`${path}.nodeId must be a string.`);
  }
  if (record.color !== 'white' && record.color !== 'black') {
    errors.push(`${path}.color must be "white" or "black".`);
  }
  const validStatuses = ['new', 'learning', 'review', 'known'];
  if (!validStatuses.includes(String(record.status))) {
    errors.push(`${path}.status must be one of: ${validStatuses.join(', ')}.`);
  }
  for (const field of ['streak', 'bestStreak', 'attempts', 'successfulCompletions'] as const) {
    if (!isNumber(record[field])) {
      errors.push(`${path}.${field} must be a number.`);
    }
  }
  if (!isNullableString(record.lastPracticedAt)) {
    errors.push(`${path}.lastPracticedAt must be a string or null.`);
  }
  if (!isNullableString(record.nextReviewAt)) {
    errors.push(`${path}.nextReviewAt must be a string or null.`);
  }
  if (!isString(record.notes)) {
    errors.push(`${path}.notes must be a string.`);
  }
}

function validateOutOfBookProgress(record: unknown, index: number, errors: string[]): void {
  const path = `out_of_book_progress[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateVersionField(record, path, errors);
  if (!isString(record.deviationId)) {
    errors.push(`${path}.deviationId must be a string.`);
  }
  if (!isString(record.parentNodeId)) {
    errors.push(`${path}.parentNodeId must be a string.`);
  }
  const validStatuses = ['new', 'learning', 'review', 'known'];
  if (!validStatuses.includes(String(record.status))) {
    errors.push(`${path}.status must be one of: ${validStatuses.join(', ')}.`);
  }
  for (const field of ['planQuizCorrect', 'planQuizAttempts', 'moveCorrect', 'moveAttempts'] as const) {
    if (!isNumber(record[field])) {
      errors.push(`${path}.${field} must be a number.`);
    }
  }
  if (!isNullableString(record.lastPracticedAt)) {
    errors.push(`${path}.lastPracticedAt must be a string or null.`);
  }
  if (!isString(record.notes)) {
    errors.push(`${path}.notes must be a string.`);
  }
}

function validateBridgeProgress(record: unknown, index: number, errors: string[]): void {
  const path = `bridge_progress[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateVersionField(record, path, errors);
  if (!isString(record.handoffId)) {
    errors.push(`${path}.handoffId must be a string.`);
  }
  if (!isString(record.repertoireNodeId)) {
    errors.push(`${path}.repertoireNodeId must be a string.`);
  }
  for (const field of ['planQuizPassed', 'continuedToMiddlegame'] as const) {
    if (!isBoolean(record[field])) {
      errors.push(`${path}.${field} must be a boolean.`);
    }
  }
  if (!isNumber(record.planQuizAttempts)) {
    errors.push(`${path}.planQuizAttempts must be a number.`);
  }
  if (!isNullableString(record.lastPracticedAt)) {
    errors.push(`${path}.lastPracticedAt must be a string or null.`);
  }
  if (!isString(record.notes)) {
    errors.push(`${path}.notes must be a string.`);
  }
}

function validateDrillStats(record: unknown, index: number, errors: string[]): void {
  const path = `drill_stats[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateVersionField(record, path, errors);
  if (!isString(record.presetId)) {
    errors.push(`${path}.presetId must be a string.`);
  }
  if (record.module !== 'middlegame' && record.module !== 'endgame') {
    errors.push(`${path}.module must be "middlegame" or "endgame".`);
  }
  for (const field of ['attempts', 'completions', 'resetCount', 'totalMoves'] as const) {
    if (!isNumber(record[field])) {
      errors.push(`${path}.${field} must be a number.`);
    }
  }
  if (!isNullableString(record.lastPlayedAt)) {
    errors.push(`${path}.lastPlayedAt must be a string or null.`);
  }
  if (!isString(record.notes)) {
    errors.push(`${path}.notes must be a string.`);
  }
}

function validateTacticsProgress(record: unknown, index: number, errors: string[]): void {
  const path = `tactics_progress[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateVersionField(record, path, errors);
  if (!isString(record.puzzleId)) {
    errors.push(`${path}.puzzleId must be a string.`);
  }
  if (!isString(record.packId)) {
    errors.push(`${path}.packId must be a string.`);
  }
  const validStatuses = ['new', 'learning', 'review', 'mastered'];
  if (!validStatuses.includes(String(record.status))) {
    errors.push(`${path}.status must be one of: ${validStatuses.join(', ')}.`);
  }
  for (const field of ['attempts', 'solves'] as const) {
    if (!isNumber(record[field])) {
      errors.push(`${path}.${field} must be a number.`);
    }
  }
  if (!isBoolean(record.revealedSolution)) {
    errors.push(`${path}.revealedSolution must be a boolean.`);
  }
  if (!isNullableString(record.lastAttemptAt)) {
    errors.push(`${path}.lastAttemptAt must be a string or null.`);
  }
  if (!isNullableString(record.masteredAt)) {
    errors.push(`${path}.masteredAt must be a string or null.`);
  }
}

function validateUserState(record: Record<string, unknown>, path: string, errors: string[]): void {
  if (!isRecord(record.userState)) {
    errors.push(`${path}.userState must be an object.`);
    return;
  }
  const validStatuses = ['new', 'learning', 'review', 'mastered'];
  if (!validStatuses.includes(String(record.userState.status))) {
    errors.push(`${path}.userState.status must be one of: ${validStatuses.join(', ')}.`);
  }
  for (const field of ['attempts', 'correctAttempts'] as const) {
    if (!isNumber(record.userState[field])) {
      errors.push(`${path}.userState.${field} must be a number.`);
    }
  }
  if (!isNullableString(record.userState.lastAttemptAt)) {
    errors.push(`${path}.userState.lastAttemptAt must be a string or null.`);
  }
  if (!isNullableString(record.userState.masteredAt)) {
    errors.push(`${path}.userState.masteredAt must be a string or null.`);
  }
  if (!isString(record.userState.notes)) {
    errors.push(`${path}.userState.notes must be a string.`);
  }
}

function validatePersonalBlunder(record: unknown, index: number, errors: string[]): void {
  const path = `personal_blunders[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateVersionField(record, path, errors);
  if (!isString(record.id)) {
    errors.push(`${path}.id must be a string.`);
  }
  validateUserState(record, path, errors);
  if (!Array.isArray(record.tags)) {
    errors.push(`${path}.tags must be an array.`);
  }
}

function validateConversionMissed(record: unknown, index: number, errors: string[]): void {
  const path = `conversion_missed[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateVersionField(record, path, errors);
  if (!isString(record.id)) {
    errors.push(`${path}.id must be a string.`);
  }
  validateUserState(record, path, errors);
  if (!Array.isArray(record.tags)) {
    errors.push(`${path}.tags must be an array.`);
  }
}

function validateAnalysisCacheEntry(record: unknown, index: number, errors: string[]): void {
  const path = `analysis_cache[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  validateVersionField(record, path, errors);
  for (const field of ['cacheKey', 'fen', 'playedMoveUci', 'bestMoveUci', 'createdAt'] as const) {
    if (!isString(record[field])) {
      errors.push(`${path}.${field} must be a string.`);
    }
  }
  for (const field of ['evalBeforeCp', 'evalAfterCp', 'depth'] as const) {
    if (!isNumber(record[field])) {
      errors.push(`${path}.${field} must be a number.`);
    }
  }
}

function validateAppSettings(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('settings must be an object.');
    return;
  }
  validateVersionField(value, 'settings', errors);
  if (value.id !== 'app') {
    errors.push('settings.id must be "app".');
  }
  if (!isRecord(value.chesscom) || !isString(value.chesscom.username)) {
    errors.push('settings.chesscom.username must be a string.');
  }
  if (!isRecord(value.leakDetector) || !isNumber(value.leakDetector.minSwingCp)) {
    errors.push('settings.leakDetector must include numeric minSwingCp.');
  }
  if (!isRecord(value.conversionReview) || !isNumber(value.conversionReview.minPeakCp)) {
    errors.push('settings.conversionReview must include numeric minPeakCp.');
  }
  if (!isRecord(value.engine) || !isNumber(value.engine.defaultMovetimeMs)) {
    errors.push('settings.engine must include numeric defaultMovetimeMs.');
  }
  if (!isRecord(value.ui) || !isBoolean(value.ui.showEvalBar)) {
    errors.push('settings.ui.showEvalBar must be a boolean.');
  }
  if (!isString(value.updatedAt)) {
    errors.push('settings.updatedAt must be a string.');
  }
}

export function validateBackupDetailed(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ['Backup must be a JSON object.'];
  }

  if (!isRecord(value.meta)) {
    errors.push('meta must be an object.');
  } else {
    if (!isString(value.meta.exportedAt)) {
      errors.push('meta.exportedAt must be a string.');
    }
    if (!isString(value.meta.appVersion)) {
      errors.push('meta.appVersion must be a string.');
    }
    if (value.meta.dbVersion !== DB_VERSION) {
      errors.push(`meta.dbVersion must be ${DB_VERSION}.`);
    }
  }

  validateAppSettings(value.settings, errors);

  const arrayFields: { key: keyof AppBackup; label: string }[] = [
    { key: 'repertoire_progress', label: 'repertoire_progress' },
    { key: 'out_of_book_progress', label: 'out_of_book_progress' },
    { key: 'bridge_progress', label: 'bridge_progress' },
    { key: 'drill_stats', label: 'drill_stats' },
    { key: 'tactics_progress', label: 'tactics_progress' },
    { key: 'personal_blunders', label: 'personal_blunders' },
    { key: 'conversion_missed', label: 'conversion_missed' },
  ];

  for (const { key, label } of arrayFields) {
    if (!isRecordArray(value[key])) {
      errors.push(`${label} must be an array.`);
    }
  }

  if (value.analysis_cache !== undefined && !isRecordArray(value.analysis_cache)) {
    errors.push('analysis_cache must be an array when present.');
  }

  if (errors.length > 0) {
    return errors;
  }

  const backup = value as unknown as AppBackup;

  backup.repertoire_progress.forEach((record, index) => {
    validateRepertoireProgress(record, index, errors);
  });
  backup.out_of_book_progress.forEach((record, index) => {
    validateOutOfBookProgress(record, index, errors);
  });
  backup.bridge_progress.forEach((record, index) => {
    validateBridgeProgress(record, index, errors);
  });
  backup.drill_stats.forEach((record, index) => {
    validateDrillStats(record, index, errors);
  });
  backup.tactics_progress.forEach((record, index) => {
    validateTacticsProgress(record, index, errors);
  });
  backup.personal_blunders.forEach((record, index) => {
    validatePersonalBlunder(record, index, errors);
  });
  backup.conversion_missed.forEach((record, index) => {
    validateConversionMissed(record, index, errors);
  });
  (backup.analysis_cache ?? []).forEach((record, index) => {
    validateAnalysisCacheEntry(record, index, errors);
  });

  return errors;
}

export function validateBackup(value: unknown): value is AppBackup {
  return validateBackupDetailed(value).length === 0;
}

export function parseBackupJson(text: string): AppBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new BackupValidationError(['Backup file is not valid JSON.']);
  }

  const errors = validateBackupDetailed(parsed);
  if (errors.length > 0) {
    throw new BackupValidationError(errors);
  }

  return parsed as AppBackup;
}

export function getBackupRecordCounts(backup: AppBackup): Record<string, number> {
  return {
    repertoire_progress: backup.repertoire_progress.length,
    out_of_book_progress: backup.out_of_book_progress.length,
    bridge_progress: backup.bridge_progress.length,
    drill_stats: backup.drill_stats.length,
    tactics_progress: backup.tactics_progress.length,
    personal_blunders: backup.personal_blunders.length,
    conversion_missed: backup.conversion_missed.length,
    analysis_cache: backup.analysis_cache?.length ?? 0,
  };
}

export async function exportBackup(): Promise<AppBackup> {
  const db = await openAppDB();
  const settingsRow = await db.get('settings', 'app');
  if (!settingsRow || settingsRow.version !== 1 || settingsRow.id !== 'app') {
    throw new Error('Could not read app settings for export.');
  }

  const [
    repertoire_progress,
    out_of_book_progress,
    bridge_progress,
    drill_stats,
    tactics_progress,
    personal_blunders,
    conversion_missed,
    analysis_cache,
  ] = await Promise.all([
    db.getAll('repertoire_progress'),
    db.getAll('out_of_book_progress'),
    db.getAll('bridge_progress'),
    db.getAll('drill_stats'),
    db.getAll('tactics_progress'),
    db.getAll('personal_blunders'),
    db.getAll('conversion_missed'),
    db.getAll('analysis_cache'),
  ]);

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      appVersion: packageJson.version,
      dbVersion: DB_VERSION,
    },
    settings: settingsRow,
    repertoire_progress,
    out_of_book_progress,
    bridge_progress,
    drill_stats,
    tactics_progress,
    personal_blunders,
    conversion_missed,
    analysis_cache,
  };
}

export async function importBackup(backup: AppBackup): Promise<void> {
  const errors = validateBackupDetailed(backup);
  if (errors.length > 0) {
    throw new BackupValidationError(errors);
  }

  const db = await openAppDB();
  const tx = db.transaction(['settings', ...BACKUP_STORES], 'readwrite');

  try {
    await tx.objectStore('settings').put(backup.settings);

    const storeRecords: { store: BackupDataStore; records: unknown[] }[] = [
      { store: 'repertoire_progress', records: backup.repertoire_progress },
      { store: 'out_of_book_progress', records: backup.out_of_book_progress },
      { store: 'bridge_progress', records: backup.bridge_progress },
      { store: 'drill_stats', records: backup.drill_stats },
      { store: 'tactics_progress', records: backup.tactics_progress },
      { store: 'personal_blunders', records: backup.personal_blunders },
      { store: 'conversion_missed', records: backup.conversion_missed },
      { store: 'analysis_cache', records: backup.analysis_cache ?? [] },
    ];

    for (const { store, records } of storeRecords) {
      const objectStore = tx.objectStore(store);
      await objectStore.clear();
      for (const record of records) {
        await objectStore.put(record);
      }
    }

    await tx.done;
  } catch (err) {
    tx.abort();
    throw err instanceof Error ? err : new Error('Backup import failed.');
  }
}

export function downloadBackupFile(backup: AppBackup): void {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `chess-training-lab-backup-${date}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
