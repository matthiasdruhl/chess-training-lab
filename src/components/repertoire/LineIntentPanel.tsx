import type { RepertoireNode, RepertoireProgress } from '../../types/repertoire';

interface LineIntentPanelProps {
  node: RepertoireNode | undefined;
  progress: RepertoireProgress | undefined;
  showIntent: boolean;
  feedback: string | null;
  onMarkKnown: () => void;
}

export function LineIntentPanel({
  node,
  progress,
  showIntent,
  feedback,
  onMarkKnown,
}: LineIntentPanelProps) {
  if (!node) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-medium text-slate-300">Intent</h2>
        <p className="mt-2 text-sm text-slate-500">
          Select a line from the tree to start training.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-medium text-slate-300">Intent</h2>

      {feedback && (
        <p className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-amber-200">
          {feedback}
        </p>
      )}

      <div className="mt-3 flex-1 space-y-3">
        {showIntent ? (
          <p className="text-sm leading-relaxed text-slate-200">{node.intent}</p>
        ) : (
          <p className="text-sm text-slate-500">
            Intent hidden until you request a hint or make a mistake.
          </p>
        )}

        {node.plans && node.plans.length > 0 && showIntent && (
          <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Plans
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
              {node.plans.map((plan) => (
                <li key={plan}>{plan}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Streak</span>
          <span className="font-medium text-white">
            {progress?.streak ?? 0}
            {(progress?.bestStreak ?? 0) > 0 && (
              <span className="ml-2 text-slate-500">
                (best {progress?.bestStreak})
              </span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onMarkKnown}
          disabled={progress?.status === 'known'}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {progress?.status === 'known' ? 'Known' : 'Mark known'}
        </button>
      </div>
    </div>
  );
}
