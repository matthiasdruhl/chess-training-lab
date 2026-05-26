import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useEngineControl } from '../context/EngineContext';
import {
  scanFilteredGames,
  type ScanProgress,
  type ScanResult,
} from '../services/analysis/scanPipeline';
import { useChessComGames, type FixtureSource } from './useChessComGames';
import { putBlunder } from '../storage/blundersRepo';
import { putConversion } from '../storage/conversionRepo';
import type { PersonalBlunder, ConversionMissed } from '../types/review';
import blunderExample from '../../data/fixtures/personal-blunder-seed.json';
import conversionExample from '../../data/fixtures/conversion-missed-seed.json';

export interface GameScanState {
  isScanning: boolean;
  progress: ScanProgress | null;
  lastResult: ScanResult | null;
  error: string | null;
}

function shouldSeedDemoRecords(fixtureSource: FixtureSource): boolean {
  return fixtureSource === 'env' || fixtureSource === 'fallback';
}

async function seedDemoRecords(username: string): Promise<ScanResult> {
  const blunder = {
    ...(blunderExample as PersonalBlunder),
    id: crypto.randomUUID(),
    source: {
      ...(blunderExample as PersonalBlunder).source,
      username: username || 'testuser',
    },
  };
  const conversion = {
    ...(conversionExample as ConversionMissed),
    id: crypto.randomUUID(),
    source: {
      ...(conversionExample as ConversionMissed).source,
      username: username || 'testuser',
    },
  };
  await putBlunder(blunder);
  await putConversion(conversion);
  return {
    blunders: [blunder],
    conversions: [conversion],
    gamesScanned: 0,
    usedFixture: true,
  };
}

export function useGameScan() {
  const { settings, updateSettings } = useAppContext();
  const { enqueueAnalyze } = useEngineControl();
  const { fetchAndFilter, cancelFetch, error: fetchError, ...chessComState } =
    useChessComGames();
  const [state, setState] = useState<GameScanState>({
    isScanning: false,
    progress: null,
    lastResult: null,
    error: null,
  });
  const scanningRef = useRef(false);
  const mountedRef = useRef(true);
  const scanAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      scanAbortRef.current?.abort();
      cancelFetch();
    };
  }, [cancelFetch]);

  const safeSetState = useCallback(
    (updater: GameScanState | ((prev: GameScanState) => GameScanState)) => {
      if (mountedRef.current) {
        setState(updater);
      }
    },
    [],
  );

  const cancelScan = useCallback(() => {
    scanAbortRef.current?.abort();
    scanAbortRef.current = null;
    cancelFetch();
    scanningRef.current = false;
    safeSetState((prev) => ({
      ...prev,
      isScanning: false,
      progress: null,
      error: prev.error ?? 'Scan cancelled.',
    }));
  }, [cancelFetch, safeSetState]);

  const scanGames = useCallback(async (): Promise<ScanResult | null> => {
    if (scanningRef.current) {
      return null;
    }
    scanningRef.current = true;

    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;

    safeSetState((prev) => ({
      ...prev,
      isScanning: true,
      error: null,
      progress: null,
    }));

    try {
      const { filtered, usedFixture: fetchedFixture, fixtureSource } =
        await fetchAndFilter(controller.signal);

      if (controller.signal.aborted) {
        return null;
      }

      if (filtered.length === 0) {
        safeSetState((prev) => ({
          ...prev,
          isScanning: false,
          error: fetchError ?? 'No games to scan.',
        }));
        return null;
      }

      const analyze = async (fen: string, movetimeMs: number) =>
        enqueueAnalyze(fen, { movetime: movetimeMs });

      let result = await scanFilteredGames(
        filtered,
        settings.chesscom.username,
        settings,
        analyze,
        (progress) => {
          safeSetState((prev) => ({ ...prev, progress }));
        },
        { signal: controller.signal },
      );

      if (controller.signal.aborted) {
        return null;
      }

      result = { ...result, usedFixture: fetchedFixture };

      if (
        result.blunders.length === 0 &&
        result.conversions.length === 0 &&
        shouldSeedDemoRecords(fixtureSource)
      ) {
        result = await seedDemoRecords(settings.chesscom.username);
      }

      await updateSettings({
        chesscom: {
          ...settings.chesscom,
          lastScanAt: new Date().toISOString(),
        },
      });

      safeSetState({
        isScanning: false,
        progress: null,
        lastResult: result,
        error: null,
      });
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }
      const message = err instanceof Error ? err.message : 'Scan failed.';
      safeSetState((prev) => ({
        ...prev,
        isScanning: false,
        error: message,
      }));
      return null;
    } finally {
      scanningRef.current = false;
      if (scanAbortRef.current === controller) {
        scanAbortRef.current = null;
      }
    }
  }, [
    fetchError,
    enqueueAnalyze,
    fetchAndFilter,
    safeSetState,
    settings,
    updateSettings,
  ]);

  return {
    ...state,
    ...chessComState,
    error: state.error ?? fetchError,
    scanGames,
    cancelScan,
  };
}
