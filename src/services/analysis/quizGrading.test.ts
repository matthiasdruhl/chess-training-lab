import { describe, expect, it, vi } from 'vitest';
import { QUIZ_MOVE_LOSS_CP } from '../../constants/analysis';
import { gradeQuizMove } from './quizGrading';

describe('gradeQuizMove', () => {
  it('accepts exact expected UCI without calling engine', async () => {
    const analyze = vi.fn();
    const bestMove = vi.fn();
    const ok = await gradeQuizMove({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      userUci: 'e7e5',
      expectedUci: 'e7e5',
      userColor: 'black',
      analyze,
      bestMove,
    });
    expect(ok).toBe(true);
    expect(analyze).not.toHaveBeenCalled();
    expect(bestMove).not.toHaveBeenCalled();
  });

  it('accepts engine best move when it differs from expected', async () => {
    const ok = await gradeQuizMove({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      userUci: 'e2e4',
      expectedUci: 'd2d4',
      userColor: 'white',
      analyze: vi.fn(),
      bestMove: vi.fn().mockResolvedValue('e2e4'),
    });
    expect(ok).toBe(true);
  });

  it('accepts within cp tolerance when eval drop is below threshold', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const analyze = vi
      .fn()
      .mockResolvedValueOnce({ scoreCp: 50, bestMoveUci: 'd2d4' })
      .mockResolvedValueOnce({ scoreCp: -42, bestMoveUci: 'd2d4' });
    const ok = await gradeQuizMove({
      fen,
      userUci: 'e2e4',
      expectedUci: 'd2d4',
      userColor: 'white',
      evalBeforeCp: 50,
      analyze,
      bestMove: vi.fn().mockRejectedValue(new Error('skip')),
    });
    expect(ok).toBe(true);
    expect(50 - 42).toBeLessThan(QUIZ_MOVE_LOSS_CP);
  });

  it('rejects illegal user UCI', async () => {
    const ok = await gradeQuizMove({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      userUci: 'e2e5',
      expectedUci: 'e2e4',
      userColor: 'white',
      analyze: vi.fn(),
      bestMove: vi.fn().mockRejectedValue(new Error('skip')),
    });
    expect(ok).toBe(false);
  });
});
