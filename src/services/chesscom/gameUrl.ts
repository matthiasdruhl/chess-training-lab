import type { ChessComGame } from './types';

function linkFromPgn(pgn: string): string | null {
  const match = pgn.match(/\[Link\s+"([^"]+)"\]/i);
  const link = match?.[1]?.trim();
  if (link && link.includes('chess.com')) {
    return link;
  }
  return null;
}

/** Resolve a user-facing Chess.com game URL; falls back to the API URL. */
export function resolveChessComGameUrl(game: Pick<ChessComGame, 'url' | 'pgn'>): string {
  if (game.url.startsWith('https://www.chess.com/')) {
    return game.url;
  }
  return linkFromPgn(game.pgn) ?? game.url;
}
