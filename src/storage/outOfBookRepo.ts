import type { OutOfBookProgress, ProgressStatus } from '../types/outOfBook';
import { openAppDB } from './db';

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
  return (await db.get('out_of_book_progress', deviationId)) as OutOfBookProgress | undefined;
}

export async function putOutOfBookProgress(record: OutOfBookProgress): Promise<void> {
  const db = await openAppDB();
  await db.put('out_of_book_progress', record);
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

