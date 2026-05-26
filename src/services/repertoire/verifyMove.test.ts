import { describe, expect, it } from 'vitest';
import { verifyMove } from './verifyMove';

describe('verifyMove', () => {
  it('matches exact UCI case-insensitively', () => {
    expect(verifyMove('E2E4', 'e2e4')).toBe(true);
  });

  it('matches aliases', () => {
    expect(verifyMove('g1f3', 'b1c3', ['g1f3', 'Ng1f3'])).toBe(true);
  });

  it('rejects wrong moves', () => {
    expect(verifyMove('e2e3', 'e2e4')).toBe(false);
    expect(verifyMove('d2d4', 'e2e4', ['d2d3'])).toBe(false);
  });
});
