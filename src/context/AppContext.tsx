import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { SETTINGS_KEY } from '../constants/db';
import { createDefaultSettings } from '../constants/defaults';
import { usePersistentStore } from '../hooks/usePersistentStore';
import { getSettings, putSettings } from '../storage/settingsRepo';
import type { AppSettings } from '../types/settings';
import { mergeSettings, mergeSettingsPatches, type SettingsPatch } from '../utils/settingsMerge';

interface AppContextValue {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const {
    value: settings,
    setValue: setSettings,
    flush,
    isLoading,
  } = usePersistentStore<AppSettings>(
    SETTINGS_KEY,
    getSettings,
    putSettings,
    createDefaultSettings(),
  );

  const settingsRef = useRef(settings);
  const isLoadingRef = useRef(isLoading);

  const pendingPatchRef = useRef<SettingsPatch | null>(null);
  const isFlushingPendingPatchRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
    isLoadingRef.current = isLoading;
  }, [settings, isLoading]);

  const applyPatch = useCallback(
    async (patch: SettingsPatch) => {
      setSettings((prev) => mergeSettings(prev, patch));
      await flush();
    },
    [setSettings, flush],
  );

  const updateSettings = useCallback(
    async (patch: SettingsPatch) => {
      if (isLoadingRef.current) {
        console.warn(
          'Settings still loading; queuing update until hydration completes.',
        );
        pendingPatchRef.current = mergeSettingsPatches(
          pendingPatchRef.current,
          patch,
        );
        setSettings((prev) => mergeSettings(prev, patch));
        return;
      }
      try {
        await applyPatch(patch);
        // If there was a previously queued patch, this flush also persists it.
        pendingPatchRef.current = null;
      } catch (err) {
        // Keep failed writes queued so the retry effect can flush later.
        pendingPatchRef.current = mergeSettingsPatches(
          pendingPatchRef.current,
          patch,
        );
        throw err;
      }
    },
    [applyPatch, setSettings],
  );

  useEffect(() => {
    if (isLoading || !pendingPatchRef.current || isFlushingPendingPatchRef.current) {
      return;
    }

    isFlushingPendingPatchRef.current = true;
    const maxAttempts = 3;

    void (async () => {
      let attempts = 0;
      while (
        pendingPatchRef.current &&
        !isLoadingRef.current &&
        attempts < maxAttempts
      ) {
        try {
          await flush();
          pendingPatchRef.current = null;
          return;
        } catch (err) {
          attempts += 1;
          console.warn('Failed to flush queued settings patch:', err);
          // Keep `pendingPatchRef` so we can retry.
          if (attempts >= maxAttempts) {
            return;
          }
          // Small delay avoids rapid retry loops on transient IDB failures.
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    })().finally(() => {
      isFlushingPendingPatchRef.current = false;
    });
  }, [isLoading, flush]);

  const updateUsername = useCallback(
    async (username: string) => {
      await updateSettings({
        chesscom: {
          ...settingsRef.current.chesscom,
          username,
        },
      });
    },
    [updateSettings],
  );

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings, updateUsername }),
    [settings, isLoading, updateSettings, updateUsername],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export type { SettingsPatch } from '../utils/settingsMerge';

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
