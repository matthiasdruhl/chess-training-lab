import type { DrillStats, Preset } from '../../types/preset';

interface PlansPanelProps {
  preset: Preset | undefined;
  stats: DrillStats | null;
  sessionMoveCount: number;
  variant?: 'middlegame' | 'endgame';
}

export function PlansPanel({
  preset,
  stats,
  sessionMoveCount,
  variant = 'middlegame',
}: PlansPanelProps) {
  if (!preset) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-medium text-slate-300">Plans</h2>
        <p className="mt-2 text-sm text-slate-500">Select a preset to see plans and objective.</p>
      </div>
    );
  }

  const isEndgame = variant === 'endgame';
  const plansToShow = isEndgame ? preset.plans.slice(0, 3) : preset.plans;

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      {isEndgame && preset.endgameTheme && (
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
          {preset.endgameTheme.replace(/-/g, ' ')}
        </p>
      )}

      <h2 className={`text-sm font-medium text-slate-300 ${isEndgame ? 'mt-1' : ''}`}>
        {isEndgame ? 'Technique' : 'Objective'}
      </h2>
      <p className={`text-sm leading-relaxed text-slate-200 ${isEndgame ? 'mt-1' : 'mt-2'}`}>
        {preset.objective}
      </p>

      <div className={`flex-1 ${isEndgame ? 'mt-3' : 'mt-4'}`}>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          {isEndgame ? 'Steps' : 'Plans'}
        </h3>
        <ol
          className={`space-y-1 text-sm text-slate-300 ${
            isEndgame ? 'list-inside list-decimal' : 'list-inside list-disc'
          }`}
        >
          {plansToShow.map((plan) => (
            <li key={plan}>{plan}</li>
          ))}
        </ol>
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Session stats</h3>
        <div className="flex justify-between text-slate-400">
          <span>Moves this session</span>
          <span className="font-medium text-white">{sessionMoveCount}</span>
        </div>
        {!isEndgame && (
          <>
            <div className="flex justify-between text-slate-400">
              <span>Total attempts</span>
              <span className="font-medium text-white">{stats?.attempts ?? 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total moves</span>
              <span className="font-medium text-white">{stats?.totalMoves ?? 0}</span>
            </div>
          </>
        )}
        {stats && stats.resetCount > 0 && (
          <div className="flex justify-between text-slate-400">
            <span>Resets (all time)</span>
            <span className="font-medium text-amber-300">{stats.resetCount}</span>
          </div>
        )}
        {stats?.lastPlayedAt && (
          <p className="text-xs text-slate-500">
            Last played {new Date(stats.lastPlayedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
