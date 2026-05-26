import type { OutOfBookDrillStep } from '../../hooks/useOutOfBookDrill';
import type { OutOfBookPlanChoice } from '../../types/outOfBook';

interface PlanChoicePanelProps {
  step: OutOfBookDrillStep;
  choices: OutOfBookPlanChoice[];
  selectedPlanId: string | null;
  onChoose: (planId: string) => void;
  feedback: string | null;
  hasContinuation: boolean;
}

export function PlanChoicePanel({
  step,
  choices,
  selectedPlanId,
  onChoose,
  feedback,
  hasContinuation,
}: PlanChoicePanelProps) {
  const moveStepLabel = hasContinuation ? '2. Move' : '2. Move';

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Step 1 — Choose a plan</h2>
        <span className="text-xs text-slate-500">
          {step === 'plan' ? 'Active' : 'Locked'}
          {step === 'move' || step === 'continuation' || step === 'complete'
            ? ` · ${moveStepLabel}${step === 'continuation' ? ' · 3. Continuation' : ''}`
            : ''}
        </span>
      </div>

      {feedback && step === 'plan' && (
        <p className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-amber-200">
          {feedback}
        </p>
      )}

      <div className="grid gap-2">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChoose(choice.id)}
            disabled={step !== 'plan'}
            className={`rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              selectedPlanId === choice.id
                ? 'border-emerald-700 bg-emerald-950/30 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80'
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>

      {(step === 'move' || step === 'continuation') && (
        <p className="text-sm text-slate-400">
          {step === 'move'
            ? 'Find the move on the board.'
            : 'Play the follow-up move on the board.'}
        </p>
      )}
    </div>
  );
}
