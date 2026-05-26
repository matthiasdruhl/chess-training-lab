import { MATE_SCORE_CP, toWhitePerspective } from '../../utils/evalScore';

interface EvalBarProps {
  /** Centipawns from side-to-move perspective. Mate scores use ±10000. */
  scoreCp: number;
  /** Side to move in the analyzed position — bar always shows White POV. */
  sideToMove: 'w' | 'b';
  className?: string;
}

function clampScore(scoreCp: number): number {
  return Math.max(-MATE_SCORE_CP, Math.min(MATE_SCORE_CP, scoreCp));
}

function formatScore(scoreCp: number): string {
  if (Math.abs(scoreCp) >= MATE_SCORE_CP - 1) {
    return scoreCp > 0 ? 'M+' : 'M-';
  }
  const pawns = scoreCp / 100;
  const sign = pawns > 0 ? '+' : '';
  return `${sign}${pawns.toFixed(1)}`;
}

export function EvalBar({ scoreCp, sideToMove, className = '' }: EvalBarProps) {
  const whitePovCp = toWhitePerspective(scoreCp, sideToMove);
  const clamped = clampScore(whitePovCp);
  const whitePercent = 50 + (clamped / MATE_SCORE_CP) * 50;
  const displayPercent = Math.max(2, Math.min(98, whitePercent));

  return (
    <div
      className={['flex flex-col items-center gap-1', className].join(' ')}
      aria-label={`Evaluation ${formatScore(whitePovCp)}`}
    >
      <div className="relative h-48 w-5 overflow-hidden rounded-sm border border-slate-700 bg-slate-950">
        <div
          className="absolute bottom-0 left-0 right-0 bg-slate-100 transition-all duration-300 ease-out"
          style={{ height: `${displayPercent}%` }}
        />
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-600" aria-hidden="true" />
      </div>
      <span className="text-xs font-mono tabular-nums text-slate-300">
        {formatScore(whitePovCp)}
      </span>
    </div>
  );
}
