import type { BridgeProgress } from '../types/bridge';
import { openAppDB } from './db';

function isValidBridgeProgress(value: unknown): value is BridgeProgress {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<BridgeProgress>;
  return candidate.version === 1 && typeof candidate.handoffId === 'string';
}

export function createDefaultBridgeProgress(
  handoffId: string,
  repertoireNodeId: string,
): BridgeProgress {
  return {
    version: 1,
    handoffId,
    repertoireNodeId,
    planQuizPassed: false,
    planQuizAttempts: 0,
    continuedToMiddlegame: false,
    lastPracticedAt: null,
    notes: '',
  };
}

export async function getBridgeProgress(handoffId: string): Promise<BridgeProgress | undefined> {
  const db = await openAppDB();
  const existing = await db.get('bridge_progress', handoffId);
  if (!existing) {
    return undefined;
  }

  if (!isValidBridgeProgress(existing)) {
    return undefined;
  }

  return existing;
}

export async function putBridgeProgress(record: BridgeProgress): Promise<void> {
  const db = await openAppDB();
  await db.put('bridge_progress', record);
}

export async function listAllBridgeProgress(): Promise<BridgeProgress[]> {
  const db = await openAppDB();
  const rows = await db.getAll('bridge_progress');
  return rows.filter(isValidBridgeProgress);
}

