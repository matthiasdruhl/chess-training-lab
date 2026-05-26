import type { ChessComGame } from './types';
import testGames from '../../../data/fixtures/chesscom-test-games.json';

export function loadFixtureGames(username?: string): ChessComGame[] {
  const data = testGames as { games: ChessComGame[] };
  const target = username?.trim() || 'testuser';
  return data.games.map((game) => ({
    ...game,
    white:
      game.white.username === 'testuser'
        ? { ...game.white, username: target }
        : game.white,
    black:
      game.black.username === 'testuser'
        ? { ...game.black, username: target }
        : game.black,
  }));
}

export function isFixtureMode(): boolean {
  return import.meta.env.VITE_USE_CHESSCOM_FIXTURE === 'true';
}
