import { Chess } from 'chess.js';
import { CHESSCOM_TIME_CLASS_FILTER } from '../../constants/chesscom';
import type { AppSettings } from '../../types/settings';
import type { ChessComGame, FilteredGame } from './types';

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function parseOpeningFromPgn(pgn: string): { eco: string; name: string } {
  const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/i);
  const nameMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/i);
  return {
    eco: ecoMatch?.[1] ?? '',
    name: nameMatch?.[1] ?? '',
  };
}

function firstMovesSan(pgn: string, maxPlies = 8): string[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.history().slice(0, maxPlies);
  } catch {
    return [];
  }
}

function matchesQueensGambit(moves: string[]): boolean {
  if (moves.length === 0 || moves[0]?.toLowerCase() !== 'd4') {
    return false;
  }
  const normalized = moves.map((m) => m.replace(/[+#!?]/g, '').toLowerCase());
  return normalized.includes('c4') || normalized.includes('d5');
}

function matchesCaroKann(moves: string[]): boolean {
  if (moves.length < 2) {
    return false;
  }
  const first = moves[0]?.replace(/[+#!?]/g, '').toLowerCase();
  const second = moves[1]?.replace(/[+#!?]/g, '').toLowerCase();
  return first === 'e4' && second === 'c6';
}

export interface GameFilterOptions {
  timeClasses?: readonly string[];
  ratedOnly?: boolean;
  colors?: ('white' | 'black')[];
}

export function defaultGameFilterOptions(_settings: AppSettings): GameFilterOptions {
  return {
    timeClasses: [...CHESSCOM_TIME_CLASS_FILTER],
    ratedOnly: true,
    colors: ['white', 'black'],
  };
}

export function filterGames(
  games: ChessComGame[],
  username: string,
  options: GameFilterOptions = {},
): FilteredGame[] {
  const normalizedUser = normalizeUsername(username);
  const timeClasses = options.timeClasses ?? [...CHESSCOM_TIME_CLASS_FILTER];
  const ratedOnly = options.ratedOnly ?? true;
  const colors = options.colors ?? ['white', 'black'];
  const results: FilteredGame[] = [];

  for (const game of games) {
    if (ratedOnly && !game.rated) {
      continue;
    }
    if (!timeClasses.includes(game.time_class)) {
      continue;
    }

    const whiteUser = normalizeUsername(game.white.username);
    const blackUser = normalizeUsername(game.black.username);
    let userColor: 'white' | 'black' | null = null;
    if (whiteUser === normalizedUser) {
      userColor = 'white';
    } else if (blackUser === normalizedUser) {
      userColor = 'black';
    } else {
      continue;
    }

    if (!colors.includes(userColor)) {
      continue;
    }

    const moves = firstMovesSan(game.pgn);
    let repertoireSide: string | null = null;

    if (userColor === 'white' && matchesQueensGambit(moves)) {
      repertoireSide = 'white-queens-gambit';
    } else if (userColor === 'black' && matchesCaroKann(moves)) {
      repertoireSide = 'black-caro-kann';
    }

    if (!repertoireSide) {
      continue;
    }

    const result =
      userColor === 'white' ? game.white.result : game.black.result;

    results.push({
      game,
      userColor,
      result,
      filterMatched: {
        repertoireSide,
        firstMovesSan: moves.slice(0, 4),
      },
    });
  }

  return results;
}

export function buildGameSource(
  filtered: FilteredGame,
  _username: string,
): FilteredGame['filterMatched'] & {
  opening: { eco: string; name: string };
} {
  return {
    ...filtered.filterMatched,
    opening: parseOpeningFromPgn(filtered.game.pgn),
  };
}

export { parseOpeningFromPgn, firstMovesSan };
