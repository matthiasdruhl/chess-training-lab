import type { RepertoireNode } from '../../types/repertoire';

interface TrainerControlsProps {
  node: RepertoireNode | undefined;
  moves: string[];
  isAutoPlaying: boolean;
  isBoardLocked: boolean;
  onReset: () => void;
  onHint: () => void;
}

export function TrainerControls({
  node,
  moves,
  isAutoPlaying,
  isBoardLocked,
  onReset,
  onHint,
}: TrainerControlsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={!node}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset line
        </button>
        <button
          type="button"
          onClick={onHint}
          disabled={!node}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Hint
        </button>
        {node && (
          <span
            className={`rounded px-2 py-1 text-xs font-medium uppercase tracking-wide ${
              node.trainer.mode === 'strict'
                ? 'bg-red-950/50 text-red-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {node.trainer.mode}
          </span>
        )}
        {isAutoPlaying && (
          <span className="text-xs text-slate-500">Opponent replying…</span>
        )}
        {isBoardLocked && !isAutoPlaying && (
          <span className="text-xs text-amber-400/90">Board locked — resetting line…</span>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          Move list
        </h3>
        <p className="text-sm text-slate-300">
          {moves.length > 0 ? moves.join(' ') : 'No moves played yet.'}
        </p>
      </div>
    </div>
  );
}
