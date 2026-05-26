import type { ConversionMissed } from '../../types/review';

interface ConversionQueueListProps {
  items: ConversionMissed[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

function statusBadge(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-blue-900/50 text-blue-200';
    case 'learning':
      return 'bg-amber-900/50 text-amber-200';
    case 'review':
      return 'bg-purple-900/50 text-purple-200';
    case 'mastered':
      return 'bg-emerald-900/50 text-emerald-200';
    default:
      return 'bg-slate-800 text-slate-300';
  }
}

export function ConversionQueueList({
  items,
  selectedId,
  onSelect,
  onDelete,
}: ConversionQueueListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No conversion misses in queue — run a scan from the Dashboard.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
            selectedId === item.id ? 'bg-slate-800/80' : 'hover:bg-slate-900/60'
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate text-white">
              {item.source.opening.name || item.source.filterMatched.repertoireSide}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(item.source.playedAt).toLocaleDateString()} · peak{' '}
              {item.analysis.peakEvalCp} cp · drop {item.analysis.dropFromPeakCp} cp ·{' '}
              {item.source.result}
            </span>
          </button>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs ${statusBadge(item.userState.status)}`}
          >
            {item.userState.status}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="shrink-0 text-xs text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
