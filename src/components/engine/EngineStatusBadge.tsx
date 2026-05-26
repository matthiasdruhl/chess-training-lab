import type { EngineStatus } from '../../types/engine';

const STATUS_LABEL: Record<EngineStatus, string> = {
  idle: 'Engine: starting…',
  ready: 'Engine: ready',
  thinking: 'Engine: thinking…',
  error: 'Engine: error',
};

const STATUS_CLASS: Record<EngineStatus, string> = {
  idle: 'border-slate-600 bg-slate-800 text-slate-300',
  ready: 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300',
  thinking: 'border-amber-800/60 bg-amber-950/40 text-amber-300',
  error: 'border-red-800/60 bg-red-950/40 text-red-300',
};

interface EngineStatusBadgeProps {
  status: EngineStatus;
}

export function EngineStatusBadge({ status }: EngineStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        STATUS_CLASS[status],
      ].join(' ')}
      aria-live="polite"
    >
      {status === 'thinking' && (
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400"
          aria-hidden="true"
        />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}
