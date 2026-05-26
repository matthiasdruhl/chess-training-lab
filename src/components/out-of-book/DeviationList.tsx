import type { OutOfBookDeviation } from '../../types/outOfBook';

interface DeviationListProps {
  deviations: OutOfBookDeviation[];
  selectedDeviationId: string | null;
  onSelectDeviation: (id: string) => void;
}

export function DeviationList({
  deviations,
  selectedDeviationId,
  onSelectDeviation,
}: DeviationListProps) {
  if (deviations.length === 0) {
    return <p className="text-sm text-slate-500">No deviations for this repertoire node yet.</p>;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-300">Deviations</h2>
      <ul className="space-y-1">
        {deviations.map((deviation) => (
          <li key={deviation.id}>
            <button
              type="button"
              onClick={() => onSelectDeviation(deviation.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selectedDeviationId === deviation.id
                  ? 'border-emerald-600 bg-emerald-950/30 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">{deviation.name}</span>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                  {deviation.severity}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Opponent: {deviation.opponentMove.san}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

