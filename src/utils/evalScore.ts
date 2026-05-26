const MATE_SCORE_CP = 10_000;

/** Parse UCI info score to centipawns from side-to-move perspective. */
export function parseUciScoreCp(parts: string[], scoreIndex: number): number | null {
  const kind = parts[scoreIndex + 1];
  const raw = parts[scoreIndex + 2];
  if (!kind || raw === undefined) {
    return null;
  }

  if (kind === 'cp') {
    const cp = Number.parseInt(raw, 10);
    return Number.isNaN(cp) ? null : cp;
  }

  if (kind === 'mate') {
    const mateIn = Number.parseInt(raw, 10);
    if (Number.isNaN(mateIn)) {
      return null;
    }
    return mateIn > 0 ? MATE_SCORE_CP : -MATE_SCORE_CP;
  }

  return null;
}

/** Flip eval when displaying from the opposite side's perspective. */
export function flipScoreCp(scoreCp: number): number {
  return -scoreCp;
}

/** Normalize side-to-move eval to White's point of view for bar display. */
export function toWhitePerspective(
  scoreCp: number,
  sideToMove: 'w' | 'b',
): number {
  return sideToMove === 'w' ? scoreCp : flipScoreCp(scoreCp);
}

export { MATE_SCORE_CP };
