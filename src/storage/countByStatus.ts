import { openAppDB } from './db';

export type StatusCountMap = Record<string, number>;

export async function countByIndexedStatus(
  storeName: 'out_of_book_progress' | 'tactics_progress' | 'repertoire_progress',
  indexName: 'status',
  statuses: readonly string[],
): Promise<StatusCountMap> {
  const db = await openAppDB();
  const entries = await Promise.all(
    statuses.map(async (status) => {
      const rows = await db.getAllFromIndex(storeName, indexName, status);
      return [status, rows.length] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function countByUserStateStatus(
  storeName: 'personal_blunders' | 'conversion_missed',
  statuses: readonly string[],
): Promise<StatusCountMap> {
  const db = await openAppDB();
  const entries = await Promise.all(
    statuses.map(async (status) => {
      const rows = await db.getAllFromIndex(storeName, 'userState.status', status);
      return [status, rows.length] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function sumCounts(counts: StatusCountMap, keys: readonly string[]): number {
  return keys.reduce((total, key) => total + (counts[key] ?? 0), 0);
}
