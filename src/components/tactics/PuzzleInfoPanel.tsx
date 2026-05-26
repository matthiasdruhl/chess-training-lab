import { Link } from 'react-router-dom';
import type { StructurePuzzle, TacticsProgress } from '../../types/tactics';

interface PuzzleInfoPanelProps {
  puzzle: StructurePuzzle | undefined;
  progress: TacticsProgress | undefined;
  queueIndex: number;
  queueLength: number;
  solvedCount: number;
  step: 'attempt' | 'correct' | 'revealed';
  feedback: string | null;
  engineHint: string | null;
  isLoadingHint: boolean;
  allowSolutionReveal: boolean;
  onRevealSolution: () => void;
  onRequestHint: () => void;
  onNextPuzzle: () => void;
}

const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

export function PuzzleInfoPanel({
  puzzle,
  progress,
  queueIndex,
  queueLength,
  solvedCount,
  step,
  feedback,
  engineHint,
  isLoadingHint,
  allowSolutionReveal,
  onRevealSolution,
  onRequestHint,
  onNextPuzzle,
}: PuzzleInfoPanelProps) {
  if (!puzzle) {
    return (
      <aside className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
        <p className="text-sm text-slate-500">Select a pack to start training.</p>
      </aside>
    );
  }

  return (
    <aside className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/30 p-4">
      <div>
        <h2 className="text-sm font-medium text-slate-300">Puzzle</h2>
        <p className="mt-1 font-medium text-white">{puzzle.name}</p>
        <p className="mt-1 text-xs text-slate-400">
          {queueIndex + 1} / {queueLength} in queue · {solvedCount} solved in pack
        </p>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-slate-300">
          <span className="text-slate-500">Theme:</span> {puzzle.theme}
        </p>
        <p className="text-slate-300">
          <span className="text-slate-500">Difficulty:</span>{' '}
          {DIFFICULTY_LABELS[puzzle.difficulty]}
        </p>
        <p className="text-slate-300">
          <span className="text-slate-500">Structure:</span> {puzzle.structureTag}
        </p>
        {progress && (
          <p className="text-slate-400">
            Attempts: {progress.attempts} · Solves: {progress.solves}
            {progress.status !== 'new' && ` · ${progress.status}`}
          </p>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            step === 'correct'
              ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200'
              : 'border-amber-700/60 bg-amber-950/30 text-amber-100'
          }`}
        >
          {feedback}
        </div>
      )}

      {step === 'attempt' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRequestHint}
            disabled={isLoadingHint}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {isLoadingHint ? 'Hint…' : 'Engine hint'}
          </button>
          {allowSolutionReveal && (
            <button
              type="button"
              onClick={onRevealSolution}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Reveal solution
            </button>
          )}
        </div>
      )}

      {engineHint && step === 'attempt' && (
        <p className="text-xs text-slate-400">
          Engine suggests: <span className="font-mono text-slate-200">{engineHint}</span>
        </p>
      )}

      {(step === 'correct' || step === 'revealed') && (
        <button
          type="button"
          onClick={onNextPuzzle}
          className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Next puzzle
        </button>
      )}

      {puzzle.relatedPresetId && (
        <Link
          to={`/middlegame?preset=${encodeURIComponent(puzzle.relatedPresetId)}`}
          className="block rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Play related structure →
        </Link>
      )}
    </aside>
  );
}
