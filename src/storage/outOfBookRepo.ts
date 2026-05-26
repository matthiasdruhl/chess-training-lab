import type { OutOfBookProgress, ProgressStatus } from '../types/outOfBook';
import { openAppDB } from './db';

function isValidOutOfBookProgress(value: unknown): value is OutOfBookProgress {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<OutOfBookProgress>;
  return candidate.version === 1 && typeof candidate.deviationId === 'string';
}

export function createDefaultOutOfBookProgress(
  deviationId: string,
  parentNodeId: string,
): OutOfBookProgress {
  return {
    version: 1,
    deviationId,
    parentNodeId,
    status: 'new',
    planQuizCorrect: 0,
    planQuizAttempts: 0,
    moveCorrect: 0,
    moveAttempts: 0,
    lastPracticedAt: null,
    notes: '',
  };
}

export async function getOutOfBookProgress(
  deviationId: string,
): Promise<OutOfBookProgress | undefined> {
  const db = await openAppDB();
  const existing = await db.get('out_of_book_progress', deviationId);
  if (!existing) {
    return undefined;
  }

  if (!isValidOutOfBookProgress(existing)) {
    return undefined;
  }

  return existing;
}

export async function putOutOfBookProgress(record: OutOfBookProgress): Promise<void> {
  const db = await openAppDB();
  await db.put('out_of_book_progress', record);
}

export async function listAllOutOfBookProgress(): Promise<OutOfBookProgress[]> {
  const db = await openAppDB();
  const rows = await db.getAll('out_of_book_progress');
  return rows.filter(isValidOutOfBookProgress);
}

export function nextOutOfBookStatusAfterSuccess(status: ProgressStatus): ProgressStatus {
  if (status === 'known') {
    return 'known';
  }
  if (status === 'new') {
    return 'learning';
  }
  if (status === 'learning') {
    return 'review';
  }
  return 'review';
}

