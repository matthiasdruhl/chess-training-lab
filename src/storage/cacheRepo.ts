import { openAppDB } from './db';
import type { AnalysisCacheEntry } from '../types/review';

export function makeCacheKey(gameUrl: string, ply: number): string {
  return `${gameUrl}#${ply}`;
}

export async function getCacheEntry(
  cacheKey: string,
): Promise<AnalysisCacheEntry | undefined> {
  const db = await openAppDB();
  return (await db.get('analysis_cache', cacheKey)) as AnalysisCacheEntry | undefined;
}

export async function putCacheEntry(entry: AnalysisCacheEntry): Promise<void> {
  const db = await openAppDB();
  await db.put('analysis_cache', entry);
}

export async function getOrPutCacheEntry(
  cacheKey: string,
  factory: () => Promise<Omit<AnalysisCacheEntry, 'cacheKey' | 'createdAt' | 'version'>>,
): Promise<AnalysisCacheEntry> {
  const existing = await getCacheEntry(cacheKey);
  if (existing) {
    return existing;
  }
  const partial = await factory();
  const entry: AnalysisCacheEntry = {
    cacheKey,
    ...partial,
    createdAt: new Date().toISOString(),
    version: 1,
  };
  await putCacheEntry(entry);
  return entry;
}
