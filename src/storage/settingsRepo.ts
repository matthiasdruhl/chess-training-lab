import { SETTINGS_KEY } from '../constants/db';
import { createDefaultSettings } from '../constants/defaults';
import type { AppSettings } from '../types/settings';
import { openAppDB } from './db';

export async function getSettings(): Promise<AppSettings> {
  const db = await openAppDB();
  const existing = await db.get('settings', SETTINGS_KEY);
  if (existing) {
    return existing;
  }

  const defaults = createDefaultSettings();
  await db.put('settings', defaults);
  return defaults;
}

export async function putSettings(settings: AppSettings): Promise<void> {
  const db = await openAppDB();
  await db.put('settings', {
    ...settings,
    updatedAt: new Date().toISOString(),
  });
}
