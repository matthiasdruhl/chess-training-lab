/** Chess.com per-player result strings (see Chess.com Published API). */

const DRAW_RESULTS = new Set([
  'agreed',
  'stalemate',
  'repetition',
  '50move',
  'insufficient',
  'timevsinsufficient',
  'draw',
]);

const LOSS_RESULTS = new Set([
  'checkmated',
  'resigned',
  'timeout',
  'lose',
  'loss',
  'abandoned',
]);

export type UserGameOutcome = 'win' | 'draw' | 'loss' | 'unknown';

export function userGameOutcome(result: string): UserGameOutcome {
  const normalized = result.trim().toLowerCase();
  if (normalized === 'win') {
    return 'win';
  }
  if (DRAW_RESULTS.has(normalized)) {
    return 'draw';
  }
  if (LOSS_RESULTS.has(normalized)) {
    return 'loss';
  }
  return 'unknown';
}

/** True when the user did not convert a winning advantage (draw or loss). */
export function userFailedToWin(result: string): boolean {
  const outcome = userGameOutcome(result);
  return outcome === 'draw' || outcome === 'loss';
}
