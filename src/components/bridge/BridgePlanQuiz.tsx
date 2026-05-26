import type { BridgeHandoff } from '../../types/bridge';

interface BridgePlanQuizProps {
  handoff: BridgeHandoff | undefined;
  passed: boolean;
  selectedPlanId: string | null;
  feedback: string | null;
  onChoosePlan: (id: string) => void;
  onContinue: () => void;
}

export function BridgePlanQuiz({
  handoff,
  passed,
  selectedPlanId,
  feedback,
  onChoosePlan,
  onContinue,
}: BridgePlanQuizProps) {
  if (!handoff) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Plan quiz</h2>
        <span className="text-xs text-slate-500">{passed ? 'Passed' : 'Pick one'}</span>
      </div>

      {feedback && !passed && (
        <p className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-amber-200">
          {feedback}
        </p>
      )}

      <div className="grid gap-2">
        {handoff.planChoices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChoosePlan(choice.id)}
            disabled={passed}
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

      {passed && (
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <p className="text-sm leading-relaxed text-slate-200">{handoff.intentSummary}</p>
          <p className="text-xs text-slate-400">
            Middlegame preset:{' '}
            <span className="font-mono text-slate-300">{handoff.linkedPresetId}</span>
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-900/40"
          >
            Continue to middlegame
          </button>
        </div>
      )}
    </div>
  );
}
