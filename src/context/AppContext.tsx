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
  settingsRef.current = settings;

  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const pendingPatchRef = useRef<SettingsPatch | null>(null);

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
      await applyPatch(patch);
    },
    [applyPatch, setSettings],
  );

  useEffect(() => {
    if (!isLoading && pendingPatchRef.current) {
      pendingPatchRef.current = null;
      void flush();
    }
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

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
