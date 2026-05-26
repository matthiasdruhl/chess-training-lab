import { describe, expect, it } from 'vitest';
import { START_FEN, WHITE_PROMOTION_FEN } from '../../test/fixtures';
import { applyUciToFen, isLegalUciForFen } from '../chess/uci';

describe('engine queue legal move guard', () => {
  it('allows legal opening moves', () => {
    expect(isLegalUciForFen(START_FEN, 'e2e4')).toBe(true);
  });

  it('rejects illegal moves', () => {
    expect(isLegalUciForFen(START_FEN, 'e2e5')).toBe(false);
    expect(isLegalUciForFen(START_FEN, 'bad')).toBe(false);
  });

  it('requires promotion character for underpromotion positions', () => {
    expect(applyUciToFen(WHITE_PROMOTION_FEN, 'a7a8q', {})).not.toBeNull();
    expect(applyUciToFen(WHITE_PROMOTION_FEN, 'a7a8', {})).toBeNull();
    expect(isLegalUciForFen(WHITE_PROMOTION_FEN, 'a7a8q')).toBe(true);
    expect(isLegalUciForFen(WHITE_PROMOTION_FEN, 'a7a8')).toBe(false);
  });
});
