import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';

interface TrainingBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  onMove?: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => boolean;
  boardWidth?: number;
}

export function TrainingBoard({
  fen,
  orientation = 'white',
  onMove,
  boardWidth = 400,
}: TrainingBoardProps) {
  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    piece: { isSparePiece: boolean; position: string; pieceType: string };
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    if (!onMove || !targetSquare) {
      return false;
    }
    return onMove(sourceSquare as Square, targetSquare as Square);
  }

  return (
    <Chessboard
      options={{
        position: fen,
        boardOrientation: orientation,
        onPieceDrop: handlePieceDrop,
        boardStyle: { borderRadius: '4px', width: boardWidth },
      }}
    />
  );
}
