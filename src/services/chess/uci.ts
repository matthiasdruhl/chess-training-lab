import { Chess, type Square } from 'chess.js';

export const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface ParsedUci {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

const PROMOTION_CHARS = new Set(['q', 'r', 'b', 'n']);

export function parseUci(uci: string): ParsedUci | null {
  if (uci.length < 4) {
    return null;
  }
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promoChar = uci[4]?.toLowerCase();
  if (uci.length > 5) {
    return null;
  }
  if (promoChar && !PROMOTION_CHARS.has(promoChar)) {
    return null;
  }
  const promotion = promoChar && PROMOTION_CHARS.has(promoChar)
    ? (promoChar as PromotionPiece)
    : undefined;
  return { from, to, promotion };
}

export interface ApplyUciOptions {
  /** When set, used for promotion moves that omit the 5th UCI character. */
  defaultPromotion?: PromotionPiece;
}

export function applyUciToGame(
  game: Chess,
  uci: string,
  options: ApplyUciOptions = {},
): boolean {
  const parsed = parseUci(uci);
  if (!parsed) {
    return false;
  }
  const promotion =
    parsed.promotion ?? options.defaultPromotion;
  try {
    const move = game.move({
      from: parsed.from,
      to: parsed.to,
      promotion,
    });
    return move !== null;
  } catch {
    return false;
  }
}

export function applyUciToFen(
  fen: string,
  uci: string,
  options: ApplyUciOptions = {},
): string | null {
  try {
    const game = new Chess(fen);
    if (!applyUciToGame(game, uci, options)) {
      return null;
    }
    return game.fen();
  } catch {
    return null;
  }
}

/** Validates UCI without defaulting promotion (engine replies must be explicit when needed). */
export function isLegalUciForFen(fen: string, uci: string): boolean {
  const parsed = parseUci(uci);
  if (!parsed) {
    return false;
  }
  try {
    const chess = new Chess(fen);
    return Boolean(
      chess.move({
        from: parsed.from,
        to: parsed.to,
        promotion: parsed.promotion,
      }),
    );
  } catch {
    return false;
  }
}

export function fenAfterUci(
  fen: string,
  uci: string,
  options: ApplyUciOptions = { defaultPromotion: 'q' },
): string | null {
  return applyUciToFen(fen, uci, options);
}
