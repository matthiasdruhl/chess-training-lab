import { Link } from 'react-router-dom';
import type { DashboardStats } from '../../storage/dashboardStats';

interface DashboardStatsPanelProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

export function DashboardStatsPanel({
  stats,
  isLoading,
}: DashboardStatsPanelProps) {
  const loading = isLoading || !stats;
  const repertoireDue = loading ? '…' : String(stats.repertoireDue);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-lg font-medium text-white">Quick stats</h2>
      <p className="mt-1 text-sm text-slate-400">Aggregates from your local training data.</p>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Repertoire
          </h3>
          <StatRow label="Lines due" value={repertoireDue} />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Out-of-book
          </h3>
          <StatRow
            label="Open / known"
            value={
              loading
                ? '…'
                : `${stats.outOfBook.open} open · ${stats.outOfBook.known} known`
            }
          />
          <StatRow
            label="By status"
            value={
              loading
                ? '…'
                : `new ${stats.outOfBook.new} · learning ${stats.outOfBook.learning} · review ${stats.outOfBook.review}`
            }
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Bridge
          </h3>
          <StatRow
            label="Handoffs"
            value={
              loading ? '…' : `${stats.bridge.open} open · ${stats.bridge.done} done`
            }
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Presets
          </h3>
          <StatRow
            label="Drill totals"
            value={
              loading
                ? '…'
                : `${stats.drillStats.attempts} attempts · ${stats.drillStats.resets} resets`
            }
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tactics
          </h3>
          <StatRow
            label="Progress"
            value={
              loading
                ? '…'
                : `mastered ${stats.tactics.mastered} · learning ${stats.tactics.learning} · new ${stats.tactics.new}`
            }
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Leaks & conversion
          </h3>
          <StatRow
            label="Blunders"
            value={
              loading
                ? '…'
                : `${stats.blunders.open} open · ${stats.blunders.mastered} mastered`
            }
          />
          <StatRow
            label="Conversions"
            value={
              loading
                ? '…'
                : `${stats.conversions.open} open · ${stats.conversions.mastered} mastered`
            }
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/leaks"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          Leaks
        </Link>
        <Link
          to="/conversion"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          Conversion
        </Link>
      </div>
    </section>
  );
}
