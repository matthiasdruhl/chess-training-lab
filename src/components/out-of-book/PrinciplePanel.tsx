import { Link } from 'react-router-dom';
import type { OutOfBookDrillStep } from '../../hooks/useOutOfBookDrill';
import type { OutOfBookDeviation, OutOfBookProgress } from '../../types/outOfBook';

interface PrinciplePanelProps {
  deviation: OutOfBookDeviation | undefined;
  progress: OutOfBookProgress | null;
  step: OutOfBookDrillStep;
  feedback: string | null;
  hasContinuation: boolean;
}

function stepLabel(step: OutOfBookDrillStep, hasContinuation: boolean): string {
  if (step === 'plan') {
    return '1. Plan';
  }
  if (step === 'move') {
    return '2. Move';
  }
  if (step === 'continuation') {
    return hasContinuation ? '3. Continuation' : '2. Move';
  }
  return 'Complete';
}

export function PrinciplePanel({
  deviation,
  progress,
  step,
  feedback,
  hasContinuation,
}: PrinciplePanelProps) {
  if (!deviation) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-medium text-slate-300">Principle</h2>
        <p className="mt-2 text-sm text-slate-500">Select a deviation to start.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Principle</h2>
        <span className="text-xs font-medium text-slate-400">{stepLabel(step, hasContinuation)}</span>
      </div>

      {hasContinuation && step !== 'complete' && (
        <p className="mt-2 text-xs text-slate-500">
          Steps: 1. Plan → 2. Move{hasContinuation ? ' → 3. Continuation' : ''}
        </p>
      )}

      {feedback && step !== 'plan' && (
        <p className="mt-2 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-amber-200">
          {feedback}
        </p>
      )}

      <p className="mt-3 text-sm leading-relaxed text-slate-200">{deviation.principle}</p>

      <div className="mt-4 flex-1" />

      <div className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Plan quiz</span>
          <span>
            {progress?.planQuizCorrect ?? 0}/{progress?.planQuizAttempts ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Moves</span>
          <span>
            {progress?.moveCorrect ?? 0}/{progress?.moveAttempts ?? 0}
          </span>
        </div>
        {step === 'complete' && (
          <div className="space-y-2">
            <p className="text-xs text-emerald-300">Complete.</p>
            <Link
              to="/repertoire"
              className="inline-block text-xs text-sky-300 hover:text-sky-200"
            >
              Back to repertoire ({deviation.parentNodeId})
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
