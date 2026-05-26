import type { BridgeProgress } from '../types/bridge';
import { openAppDB } from './db';

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
  return (await db.get('bridge_progress', handoffId)) as BridgeProgress | undefined;
}

export async function putBridgeProgress(record: BridgeProgress): Promise<void> {
  const db = await openAppDB();
  await db.put('bridge_progress', record);
}

