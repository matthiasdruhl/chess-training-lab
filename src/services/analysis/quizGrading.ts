import { Chess, type Square } from 'chess.js';
import { QUIZ_MOVE_LOSS_CP } from '../../constants/analysis';
import type { GoLimits } from '../../types/engine';
import { toUserPerspective } from './evalPerspective';

type AnalyzeFn = (fen: string, limits?: GoLimits) => Promise<{ scoreCp: number; bestMoveUci: string }>;
type BestMoveFn = (fen: string, limits?: GoLimits) => Promise<string>;

export interface QuizGradeInput {
  fen: string;
  userUci: string;
  expectedUci: string;
  userColor: 'white' | 'black';
  /** Cached eval at fen before move, user POV (from scan record). */
  evalBeforeCp?: number;
  analyze: AnalyzeFn;
  bestMove: BestMoveFn;
  limits?: GoLimits;
}

export async function gradeQuizMove(input: QuizGradeInput): Promise<boolean> {
  const { fen, userUci, expectedUci, userColor, evalBeforeCp, analyze, bestMove, limits } =
    input;

  if (userUci === expectedUci) {
    return true;
  }

  try {
    const engineUci = await bestMove(fen, limits);
    if (userUci === engineUci) {
      return true;
    }
  } catch {
    // continue to cp tolerance check
  }

  try {
    const beforeAnalysis = await analyze(fen, limits);
    if (beforeAnalysis.bestMoveUci && userUci === beforeAnalysis.bestMoveUci) {
      return true;
    }

    const chess = new Chess(fen);
    const from = userUci.slice(0, 2) as Square;
    const to = userUci.slice(2, 4) as Square;
    const promo = userUci[4];
    const promotion =
      promo === 'q' || promo === 'r' || promo === 'b' || promo === 'n' ? promo : undefined;
    chess.move({ from, to, promotion: promotion ?? 'q' });
    const fenAfter = chess.fen();

    const afterAnalysis = await analyze(fenAfter, limits);
    const stmBefore = fen.includes(' w ') ? 'w' : 'b';
    const evalBefore =
      evalBeforeCp ??
      toUserPerspective(beforeAnalysis.scoreCp, stmBefore, userColor);
    const evalAfter = toUserPerspective(
      afterAnalysis.scoreCp,
      chess.turn(),
      userColor,
    );

    if (!Number.isFinite(evalBefore) || !Number.isFinite(evalAfter)) {
      return false;
    }

    return evalBefore - evalAfter < QUIZ_MOVE_LOSS_CP;
  } catch {
    return false;
  }
}
