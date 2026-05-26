import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';

interface TrainingBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  onMove?: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => boolean;
  boardWidth?: number;
  allowDragging?: boolean;
}

export function TrainingBoard({
  fen,
  orientation = 'white',
  onMove,
  boardWidth = 400,
  allowDragging = true,
}: TrainingBoardProps) {
  function handlePieceDrop({
    sourceSquare,
    targetSquare,
    piece,
  }: {
    piece: { isSparePiece: boolean; position: string; pieceType: string };
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    if (!onMove || !targetSquare) {
      return false;
    }
    const normalizedPieceType = piece.pieceType.toLowerCase();
    const promotionPieceTypes = ['q', 'r', 'b', 'n'] as const;
    const promotion = promotionPieceTypes.includes(normalizedPieceType as (typeof promotionPieceTypes)[number])
      ? (normalizedPieceType as 'q' | 'r' | 'b' | 'n')
      : undefined;

    return onMove(sourceSquare as Square, targetSquare as Square, promotion);
  }

  return (
    <Chessboard
      options={{
        position: fen,
        boardOrientation: orientation,
        allowDragging,
        onPieceDrop: handlePieceDrop,
        boardStyle: { borderRadius: '4px', width: boardWidth },
      }}
    />
  );
}
