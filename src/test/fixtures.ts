import { Chess } from 'chess.js';
import { START_FEN } from '../services/chess/uci';

export { START_FEN };

const afterE4 = new Chess(START_FEN);
afterE4.move('e4');
export const AFTER_E4_FEN = afterE4.fen();

/** White pawn on a7; white Ke1, black Kh8 — queen promotion available. */
export const WHITE_PROMOTION_FEN = (() => {
  const board = new Chess();
  board.clear();
  board.put({ type: 'k', color: 'w' }, 'e1');
  board.put({ type: 'k', color: 'b' }, 'h8');
  board.put({ type: 'p', color: 'w' }, 'a7');
  return board.fen();
})();
