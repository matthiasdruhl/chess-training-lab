import { REPERTOIRE_DUE_DAYS } from '../constants/training';
import type { RepertoireColor, RepertoireProgress } from '../types/repertoire';
import { openAppDB } from './db';

export function createDefaultProgress(
  nodeId: string,
  color: RepertoireColor,
): RepertoireProgress {
  return {
    version: 1,
    nodeId,
    color,
    status: 'new',
    streak: 0,
    bestStreak: 0,
    attempts: 0,
    successfulCompletions: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    notes: '',
  };
}

export async function getProgress(nodeId: string): Promise<RepertoireProgress | undefined> {
  const db = await openAppDB();
  return (await db.get('repertoire_progress', nodeId)) as RepertoireProgress | undefined;
}

export async function putProgress(record: RepertoireProgress): Promise<void> {
  const db = await openAppDB();
  await db.put('repertoire_progress', record);
}

export async function listByColor(color: RepertoireColor): Promise<RepertoireProgress[]> {
  const db = await openAppDB();
  return (await db.getAllFromIndex(
    'repertoire_progress',
    'color',
    color,
  )) as RepertoireProgress[];
}

export async function listAllProgress(): Promise<RepertoireProgress[]> {
  const db = await openAppDB();
  return (await db.getAll('repertoire_progress')) as RepertoireProgress[];
}

export async function listDueForReview(): Promise<RepertoireProgress[]> {
  const all = await listAllProgress();
  return all.filter((record) => isProgressDue(record));
}

export function isProgressDue(record: RepertoireProgress | undefined): boolean {
  if (!record) {
    return true;
  }
  if (record.status === 'known') {
    return false;
  }

  if (record.status === 'new' || record.status === 'learning') {
    return true;
  }

  const now = new Date();
  const nowIso = now.toISOString();

  if (record.nextReviewAt) {
    return record.nextReviewAt <= nowIso;
  }

  if (!record.lastPracticedAt) {
    return true;
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - REPERTOIRE_DUE_DAYS);
  return record.lastPracticedAt < cutoff.toISOString();
}
