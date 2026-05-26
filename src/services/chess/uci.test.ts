import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  AFTER_E4_FEN,
  START_FEN,
  WHITE_PROMOTION_FEN,
} from '../../test/fixtures';
import {
  applyUciToFen,
  applyUciToGame,
  fenAfterUci,
  isLegalUciForFen,
  parseUci,
} from './uci';

describe('parseUci', () => {
  it('parses four-character moves', () => {
    expect(parseUci('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: undefined });
  });

  it('parses promotion suffix', () => {
    expect(parseUci('a7a8q')).toEqual({ from: 'a7', to: 'a8', promotion: 'q' });
  });

  it('rejects invalid strings', () => {
    expect(parseUci('e2')).toBeNull();
    expect(parseUci('e2e4x')).toBeNull();
    expect(parseUci('e2e4z')).toBeNull();
  });
});

describe('applyUciToGame', () => {
  it('applies legal moves with default queen promotion', () => {
    const game = new Chess(WHITE_PROMOTION_FEN);
    expect(applyUciToGame(game, 'a7a8', { defaultPromotion: 'q' })).toBe(true);
    expect(game.fen()).toMatch(/^Q/);
  });

  it('returns false for illegal moves', () => {
    const game = new Chess(START_FEN);
    expect(applyUciToGame(game, 'e2e5')).toBe(false);
  });
});

describe('applyUciToFen / fenAfterUci', () => {
  it('returns updated FEN after e4', () => {
    expect(applyUciToFen(START_FEN, 'e2e4', { defaultPromotion: 'q' })).toBe(AFTER_E4_FEN);
    expect(fenAfterUci(START_FEN, 'e2e4')).toBe(AFTER_E4_FEN);
  });

  it('returns null when move is illegal', () => {
    expect(fenAfterUci(START_FEN, 'd2d5')).toBeNull();
  });
});

describe('isLegalUciForFen', () => {
  it('accepts legal engine-style moves', () => {
    expect(isLegalUciForFen(START_FEN, 'e2e4')).toBe(true);
  });

  it('rejects illegal moves', () => {
    expect(isLegalUciForFen(START_FEN, 'e2e5')).toBe(false);
  });

  it('requires explicit promotion when default is not applied', () => {
    const parsed = parseUci('a7a8q');
    expect(parsed).toEqual({ from: 'a7', to: 'a8', promotion: 'q' });
    expect(isLegalUciForFen(WHITE_PROMOTION_FEN, 'a7a8')).toBe(false);
    expect(isLegalUciForFen(WHITE_PROMOTION_FEN, 'a7a8q')).toBe(true);
    expect(applyUciToFen(WHITE_PROMOTION_FEN, 'a7a8', {})).toBeNull();
    expect(applyUciToFen(WHITE_PROMOTION_FEN, 'a7a8q', {})).not.toBeNull();
  });
});
