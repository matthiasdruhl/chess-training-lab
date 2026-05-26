import { Link } from 'react-router-dom';
import type { TodaySessionStep } from '../../hooks/useTodaySession';

interface TodaySessionPanelProps {
  steps: TodaySessionStep[];
  completedCount: number;
  totalCount: number;
  isResolvingTargets: boolean;
  onToggleStep: (stepId: TodaySessionStep['id']) => void;
  onResetForToday: () => void;
}

export function TodaySessionPanel({
  steps,
  completedCount,
  totalCount,
  isResolvingTargets,
  onToggleStep,
  onResetForToday,
}: TodaySessionPanelProps) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Today&apos;s session</h2>
          <p className="mt-1 text-sm text-slate-400">
            {completedCount} of {totalCount} complete
            {isResolvingTargets && ' · resolving targets…'}
          </p>
        </div>
        <button
          type="button"
          onClick={onResetForToday}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Reset for today
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2"
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={step.done}
                onChange={() => onToggleStep(step.id)}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{step.label}</span>
                <span className="block text-xs text-slate-500">{step.detail}</span>
              </span>
            </label>
            <Link
              to={step.href}
              className="shrink-0 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
            >
              Start
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
