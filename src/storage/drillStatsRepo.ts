import type { DrillStats, PresetModule } from '../types/preset';
import { openAppDB } from './db';

function isValidDrillStats(value: unknown): value is DrillStats {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<DrillStats>;
  return candidate.version === 1 && typeof candidate.presetId === 'string';
}

export function createDefaultDrillStats(
  presetId: string,
  module: PresetModule,
): DrillStats {
  return {
    version: 1,
    presetId,
    module,
    attempts: 0,
    completions: 0,
    resetCount: 0,
    totalMoves: 0,
    lastPlayedAt: null,
    notes: '',
  };
}

export async function getDrillStats(presetId: string): Promise<DrillStats | undefined> {
  const db = await openAppDB();
  const existing = await db.get('drill_stats', presetId);
  if (!existing) {
    return undefined;
  }

  if (!isValidDrillStats(existing)) {
    return undefined;
  }

  return existing;
}

export async function putDrillStats(stats: DrillStats): Promise<void> {
  const db = await openAppDB();
  await db.put('drill_stats', stats);
}
