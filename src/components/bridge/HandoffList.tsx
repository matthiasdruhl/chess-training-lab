import type { BridgeHandoff } from '../../types/bridge';

interface HandoffListProps {
  handoffs: BridgeHandoff[];
  selectedHandoffId: string | null;
  onSelectHandoff: (id: string) => void;
}

export function HandoffList({ handoffs, selectedHandoffId, onSelectHandoff }: HandoffListProps) {
  if (handoffs.length === 0) {
    return <p className="text-sm text-slate-500">No handoffs for this repertoire node yet.</p>;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-300">Handoffs</h2>
      <ul className="space-y-1">
        {handoffs.map((handoff) => (
          <li key={handoff.id}>
            <button
              type="button"
              onClick={() => onSelectHandoff(handoff.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selectedHandoffId === handoff.id
                  ? 'border-emerald-600 bg-emerald-950/30 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80'
              }`}
            >
              <span className="block truncate">{handoff.name}</span>
              <p className="mt-1 text-xs text-slate-400">Preset: {handoff.linkedPresetId}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

