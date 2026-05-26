import type { DrillStats, PresetModule } from '../types/preset';
import { openAppDB } from './db';

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
  return (await db.get('drill_stats', presetId)) as DrillStats | undefined;
}

export async function putDrillStats(stats: DrillStats): Promise<void> {
  const db = await openAppDB();
  await db.put('drill_stats', stats);
}
