import { Chess, type Move, type Square } from 'chess.js';
import { useCallback, useMemo, useState } from 'react';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function useChessSession(initialFen: string = START_FEN) {
  const [game, setGame] = useState(() => new Chess(initialFen));

  const fen = game.fen();
  const turn = game.turn();
  const history = game.history();
  const isGameOver = game.isGameOver();

  const legalMoves = useMemo(
    () => game.moves({ verbose: true }),
    [fen],
  );

  const loadFen = useCallback((nextFen: string): boolean => {
    try {
      const next = new Chess(nextFen);
      setGame(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
      const copy = new Chess(game.fen());
      try {
        const move = copy.move({ from, to, promotion: promotion ?? 'q' });
        if (!move) {
          return false;
        }
        setGame(copy);
        return true;
      } catch {
        return false;
      }
    },
    [game],
  );

  const reset = useCallback(() => {
    setGame(new Chess(START_FEN));
  }, []);

  const getLastMove = useCallback((): Move | null => {
    const moves = game.history({ verbose: true });
    return moves.length > 0 ? moves[moves.length - 1] : null;
  }, [game]);

  return {
    fen,
    turn,
    history,
    isGameOver,
    legalMoves,
    loadFen,
    makeMove,
    reset,
    getLastMove,
  };
}
