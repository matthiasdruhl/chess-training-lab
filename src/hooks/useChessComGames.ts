import { useCallback, useRef, useState } from 'react';
import { ChessComFetchError, fetchGamesForMonths } from '../services/chesscom/client';
import {
  defaultGameFilterOptions,
  filterGames,
} from '../services/chesscom/filterGames';
import { isFixtureMode, loadFixtureGames } from '../services/chesscom/fixtures';
import type { FilteredGame } from '../services/chesscom/types';
import { useAppContext } from '../context/AppContext';

export type FixtureSource = 'env' | 'fallback' | 'none';

export interface ChessComGamesState {
  filteredGames: FilteredGame[];
  totalFetched: number;
  isLoading: boolean;
  error: string | null;
  errorKind: ChessComFetchError['kind'] | null;
  usedFixture: boolean;
  fixtureSource: FixtureSource;
  fetchProgress: { current: number; total: number } | null;
}

export interface FetchAndFilterResult {
  filtered: FilteredGame[];
  usedFixture: boolean;
  fixtureSource: FixtureSource;
}

export function useChessComGames() {
  const { settings } = useAppContext();
  const fetchAbortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ChessComGamesState>({
    filteredGames: [],
    totalFetched: 0,
    isLoading: false,
    error: null,
    errorKind: null,
    usedFixture: false,
    fixtureSource: 'none',
    fetchProgress: null,
  });

  const cancelFetch = useCallback(() => {
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
  }, []);

  const fetchAndFilter = useCallback(
    async (signal?: AbortSignal): Promise<FetchAndFilterResult> => {
      const username = settings.chesscom.username.trim();
      if (!username) {
        setState((prev) => ({
          ...prev,
          error: 'Set your Chess.com username in Settings first.',
          errorKind: null,
        }));
        return { filtered: [], usedFixture: false, fixtureSource: 'none' };
      }

      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;
      if (signal) {
        if (signal.aborted) {
          controller.abort();
        } else {
          signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
      }
      const combinedSignal = controller.signal;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        errorKind: null,
        fetchProgress: null,
      }));

      try {
        if (isFixtureMode()) {
          const games = loadFixtureGames(username);
          const filtered = filterGames(
            games,
            username,
            defaultGameFilterOptions(settings),
          );
          setState({
            filteredGames: filtered,
            totalFetched: games.length,
            isLoading: false,
            error: null,
            errorKind: null,
            usedFixture: true,
            fixtureSource: 'env',
            fetchProgress: null,
          });
          return { filtered, usedFixture: true, fixtureSource: 'env' };
        }

        const months = settings.chesscom.defaultMonthsToFetch;
        const games = await fetchGamesForMonths(
          username,
          months,
          (current, total) => {
            setState((prev) => ({
              ...prev,
              fetchProgress: { current, total },
            }));
          },
          combinedSignal,
        );

        if (combinedSignal.aborted) {
          return { filtered: [], usedFixture: false, fixtureSource: 'none' };
        }

        const filtered = filterGames(
          games,
          username,
          defaultGameFilterOptions(settings),
        );

        setState({
          filteredGames: filtered,
          totalFetched: games.length,
          isLoading: false,
          error: null,
          errorKind: null,
          usedFixture: false,
          fixtureSource: 'none',
          fetchProgress: null,
        });

        if (filtered.length === 0) {
          setState((prev) => ({
            ...prev,
            error:
              'No d4 / Caro-Kann rapid games in this period — try more months or check your username.',
          }));
        }

        return { filtered, usedFixture: false, fixtureSource: 'none' };
      } catch (err) {
        if (combinedSignal.aborted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            fetchProgress: null,
          }));
          return { filtered: [], usedFixture: false, fixtureSource: 'none' };
        }

        if (err instanceof ChessComFetchError && err.kind !== 'not_found') {
          try {
            const games = loadFixtureGames(username);
            const filtered = filterGames(
              games,
              username || 'testuser',
              defaultGameFilterOptions(settings),
            );
            setState({
              filteredGames: filtered,
              totalFetched: games.length,
              isLoading: false,
              error: `Live API unavailable (${err.message}) — using test games.`,
              errorKind: err.kind,
              usedFixture: true,
              fixtureSource: 'fallback',
              fetchProgress: null,
            });
            return { filtered, usedFixture: true, fixtureSource: 'fallback' };
          } catch {
            // fall through
          }
        }

        const message =
          err instanceof ChessComFetchError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to fetch games.';
        const kind = err instanceof ChessComFetchError ? err.kind : null;

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          errorKind: kind,
          usedFixture: false,
          fixtureSource: 'none',
          fetchProgress: null,
        }));
        return { filtered: [], usedFixture: false, fixtureSource: 'none' };
      } finally {
        if (fetchAbortRef.current === controller) {
          fetchAbortRef.current = null;
        }
      }
    },
    [settings],
  );

  return { ...state, fetchAndFilter, cancelFetch };
}
