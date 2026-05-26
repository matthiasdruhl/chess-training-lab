import type { TacticsPack } from '../../types/tactics';

interface PackListProps {
  packs: TacticsPack[];
  selectedPackId: string | null;
  progressByPack: Map<string, { solved: number; total: number }>;
  onSelectPack: (packId: string) => void;
}

export function PackList({
  packs,
  selectedPackId,
  progressByPack,
  onSelectPack,
}: PackListProps) {
  if (packs.length === 0) {
    return <p className="text-sm text-slate-500">No tactic packs loaded.</p>;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-300">Packs</h2>
      <ul className="space-y-1">
        {packs.map((pack) => {
          const progress = progressByPack.get(pack.id);
          const solved = progress?.solved ?? 0;
          const total = progress?.total ?? pack.puzzleIds.length;

          return (
            <li key={pack.id}>
              <button
                type="button"
                onClick={() => onSelectPack(pack.id)}
                aria-pressed={selectedPackId === pack.id}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selectedPackId === pack.id
                    ? 'border-emerald-600 bg-emerald-950/30 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80'
                }`}
              >
                <span className="block truncate font-medium">{pack.name}</span>
                <span className="mt-1 block text-xs text-slate-400">{pack.description}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {solved}/{total} solved · {pack.structureTag}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
