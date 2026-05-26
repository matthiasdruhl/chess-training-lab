import { Chess } from 'chess.js';
import { useMemo } from 'react';

interface GameReplayPanelProps {
  movesSan: string[];
  targetPly: number;
  className?: string;
}

export function GameReplayPanel({
  movesSan,
  targetPly,
  className = '',
}: GameReplayPanelProps) {
  const displayMoves = useMemo(() => {
    const pairs: { num: number; white?: string; black?: string }[] = [];
    for (let i = 0; i < movesSan.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: movesSan[i],
        black: movesSan[i + 1],
      });
    }
    return pairs;
  }, [movesSan]);

  function plyHighlight(plyIndex: number): string {
    const ply = plyIndex + 1;
    if (ply === targetPly) {
      return 'bg-amber-900/50 text-amber-100 font-medium';
    }
    if (ply < targetPly) {
      return 'text-slate-400';
    }
    return 'text-slate-600';
  }

  return (
    <div className={`rounded-md border border-slate-800 bg-slate-950/60 p-3 ${className}`}>
      <h3 className="mb-2 text-sm font-medium text-slate-200">Game context</h3>
      <div className="max-h-48 overflow-y-auto font-mono text-xs leading-relaxed">
        {displayMoves.map((row) => (
          <div key={row.num} className="flex gap-2 py-0.5">
            <span className="w-6 shrink-0 text-slate-500">{row.num}.</span>
            {row.white && (
              <span className={plyHighlight((row.num - 1) * 2)}>
                {row.white}
              </span>
            )}
            {row.black && (
              <span className={plyHighlight((row.num - 1) * 2 + 1)}>
                {row.black}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Highlighted move is the puzzle position (ply {targetPly}).
      </p>
    </div>
  );
}

/** Replay PGN moves up to target ply and return FEN. */
export function fenAtPly(movesSan: string[], targetPly: number): string | null {
  try {
    const chess = new Chess();
    for (let i = 0; i < Math.min(targetPly, movesSan.length); i += 1) {
      chess.move(movesSan[i]!);
    }
    return chess.fen();
  } catch {
    return null;
  }
}
