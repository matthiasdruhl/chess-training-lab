import type { ConversionMissed, PersonalBlunder } from '../../types/review';

/** Stable dedupe key: `${gameUrl}#${ply}` (matches analysis cache format). */
export function makeBlunderKey(gameUrl: string, ply: number): string {
  return `${gameUrl}#${ply}`;
}

export function blunderKeyFromRecord(blunder: PersonalBlunder): string {
  return makeBlunderKey(blunder.source.gameId, blunder.position.ply);
}

/** One conversion episode per peak in a game: `${gameUrl}#ep${plyOfPeak}`. */
export function makeConversionKey(gameUrl: string, plyOfPeak: number): string {
  return `${gameUrl}#ep${plyOfPeak}`;
}

export function conversionKeyFromRecord(conversion: ConversionMissed): string {
  return makeConversionKey(conversion.source.gameId, conversion.analysis.plyOfPeak);
}
