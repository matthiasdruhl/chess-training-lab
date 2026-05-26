import { blunderKeyFromRecord, makeBlunderKey } from '../services/analysis/reviewKeys';
import { openAppDB } from './db';
import type { PersonalBlunder, BlunderStatus } from '../types/review';

export async function getBlunder(id: string): Promise<PersonalBlunder | undefined> {
  const db = await openAppDB();
  return (await db.get('personal_blunders', id)) as PersonalBlunder | undefined;
}

export async function putBlunder(blunder: PersonalBlunder): Promise<void> {
  const db = await openAppDB();
  await db.put('personal_blunders', blunder);
}

export async function deleteBlunder(id: string): Promise<void> {
  const db = await openAppDB();
  await db.delete('personal_blunders', id);
}

export async function listAllBlunders(): Promise<PersonalBlunder[]> {
  const db = await openAppDB();
  return (await db.getAll('personal_blunders')) as PersonalBlunder[];
}

export async function listBlundersByStatus(
  status: BlunderStatus,
): Promise<PersonalBlunder[]> {
  const db = await openAppDB();
  return (await db.getAllFromIndex(
    'personal_blunders',
    'userState.status',
    status,
  )) as PersonalBlunder[];
}

export async function listOpenBlunders(): Promise<PersonalBlunder[]> {
  const all = await listAllBlunders();
  return all.filter((b) => b.userState.status !== 'mastered');
}

export async function loadBlunderDedupeKeys(): Promise<Set<string>> {
  const all = await listAllBlunders();
  return new Set(all.map(blunderKeyFromRecord));
}

export async function hasBlunder(key: string): Promise<boolean> {
  const keys = await loadBlunderDedupeKeys();
  return keys.has(key);
}

export { makeBlunderKey };
