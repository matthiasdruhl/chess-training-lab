import { SETTINGS_KEY } from '../constants/db';
import { createDefaultSettings } from '../constants/defaults';
import type { AppSettings } from '../types/settings';
import { openAppDB } from './db';

function isValidAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<AppSettings>;
  return candidate.version === 1 && candidate.id === 'app';
}

export async function getSettings(): Promise<AppSettings> {
  const db = await openAppDB();
  const existing = await db.get('settings', SETTINGS_KEY);
  if (isValidAppSettings(existing)) {
    return existing;
  }

  const defaults = createDefaultSettings();
  await db.put('settings', defaults);
  return defaults;
}

export async function putSettings(settings: AppSettings): Promise<void> {
  const db = await openAppDB();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');
  const existing = await store.get(SETTINGS_KEY);

  const base: AppSettings = isValidAppSettings(existing)
    ? existing
    : createDefaultSettings();

  const next: AppSettings = {
    ...base,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  await store.put(next);
  await tx.done;
}
