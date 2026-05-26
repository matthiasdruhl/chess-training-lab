import type { TacticsProgress, TacticsProgressStatus } from '../types/tactics';
import { openAppDB } from './db';

function isValidTacticsProgress(value: unknown): value is TacticsProgress {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<TacticsProgress>;
  return candidate.version === 1 && typeof candidate.puzzleId === 'string';
}

export function createDefaultTacticsProgress(puzzleId: string, packId: string): TacticsProgress {
  return {
    version: 1,
    puzzleId,
    packId,
    status: 'new',
    attempts: 0,
    solves: 0,
    revealedSolution: false,
    lastAttemptAt: null,
    masteredAt: null,
  };
}

export async function getTacticsProgress(
  puzzleId: string,
): Promise<TacticsProgress | undefined> {
  const db = await openAppDB();
  const existing = await db.get('tactics_progress', puzzleId);
  if (!existing) {
    return undefined;
  }

  if (!isValidTacticsProgress(existing)) {
    return undefined;
  }

  return existing;
}

export async function getTacticsProgressForPack(packId: string): Promise<TacticsProgress[]> {
  const db = await openAppDB();
  const records = await db.getAllFromIndex('tactics_progress', 'packId', packId);
  return records.filter(isValidTacticsProgress);
}

export async function putTacticsProgress(record: TacticsProgress): Promise<void> {
  const db = await openAppDB();
  await db.put('tactics_progress', record);
}

export function nextTacticsStatusAfterWrong(status: TacticsProgressStatus): TacticsProgressStatus {
  if (status === 'mastered' || status === 'review') {
    return status;
  }
  return 'learning';
}

export function nextTacticsStatusAfterCorrect(
  status: TacticsProgressStatus,
  solves: number,
): TacticsProgressStatus {
  if (status === 'mastered') {
    return 'mastered';
  }
  if (solves >= 2) {
    return 'mastered';
  }
  if (status === 'new' || status === 'learning') {
    return 'review';
  }
  return 'review';
}
