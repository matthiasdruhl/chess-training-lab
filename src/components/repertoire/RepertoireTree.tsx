import type { FlattenedRepertoireNode, RepertoireProgress } from '../../types/repertoire';
import { isProgressDue } from '../../storage/progressRepo';

interface RepertoireTreeProps {
  nodes: FlattenedRepertoireNode[];
  selectedNodeId: string | null;
  progressMap: Record<string, RepertoireProgress>;
  onSelectNode: (nodeId: string) => void;
}

const STATUS_LABELS: Record<RepertoireProgress['status'], string> = {
  new: 'New',
  learning: 'Learning',
  review: 'Review',
  known: 'Known',
};

const STATUS_STYLES: Record<RepertoireProgress['status'], string> = {
  new: 'bg-slate-700 text-slate-200',
  learning: 'bg-amber-900/60 text-amber-200',
  review: 'bg-sky-900/60 text-sky-200',
  known: 'bg-emerald-900/60 text-emerald-200',
};

export function RepertoireTree({
  nodes,
  selectedNodeId,
  progressMap,
  onSelectNode,
}: RepertoireTreeProps) {
  if (nodes.length === 0) {
    return (
      <p className="text-sm text-slate-500">No trainable lines for this side yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-300">Lines</h2>
      <ul className="space-y-1">
        {nodes.map(({ node, depth }) => {
          const progress = progressMap[node.id];
          const status = progress?.status ?? 'new';
          const due = isProgressDue(progress);

          return (
            <li key={node.id} style={{ paddingLeft: `${depth * 12}px` }}>
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selectedNodeId === node.id
                    ? 'border-emerald-600 bg-emerald-950/30 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{node.name}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {due && status !== 'known' && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                      Due
                    </span>
                  )}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[status]}`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
