import {
  conversionKeyFromRecord,
  makeConversionKey,
} from '../services/analysis/reviewKeys';
import { openAppDB } from './db';
import type { ConversionMissed, PuzzleStatus } from '../types/review';

export async function getConversion(
  id: string,
): Promise<ConversionMissed | undefined> {
  const db = await openAppDB();
  return (await db.get('conversion_missed', id)) as ConversionMissed | undefined;
}

export async function putConversion(record: ConversionMissed): Promise<void> {
  const db = await openAppDB();
  await db.put('conversion_missed', record);
}

export async function deleteConversion(id: string): Promise<void> {
  const db = await openAppDB();
  await db.delete('conversion_missed', id);
}

export async function listAllConversions(): Promise<ConversionMissed[]> {
  const db = await openAppDB();
  return (await db.getAll('conversion_missed')) as ConversionMissed[];
}

export async function listConversionsByStatus(
  status: PuzzleStatus,
): Promise<ConversionMissed[]> {
  const db = await openAppDB();
  return (await db.getAllFromIndex(
    'conversion_missed',
    'userState.status',
    status,
  )) as ConversionMissed[];
}

export async function listOpenConversions(): Promise<ConversionMissed[]> {
  const all = await listAllConversions();
  return all.filter((c) => c.userState.status !== 'mastered');
}

export async function loadConversionDedupeKeys(): Promise<Set<string>> {
  const all = await listAllConversions();
  return new Set(all.map(conversionKeyFromRecord));
}

export async function hasConversion(key: string): Promise<boolean> {
  const keys = await loadConversionDedupeKeys();
  return keys.has(key);
}

export { makeConversionKey };
