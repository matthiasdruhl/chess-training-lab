import { useCallback, useEffect, useState } from 'react';
import type { Square } from 'chess.js';
import { EvalBar } from '../board/EvalBar';
import { TrainingBoard } from '../board/TrainingBoard';
import { useChessSession } from '../../hooks/useChessSession';
import { useStockfish } from '../../hooks/useStockfish';
import { useAppContext } from '../../context/AppContext';

interface ReviewQuizPanelProps {
  fen: string;
  sideToMove: 'white' | 'black';
  prompt: string;
  onSubmitMove: (uci: string) => Promise<boolean>;
  onMarkMastered: () => void;
  isCorrect: boolean;
  feedback: string | null;
  contextExtra?: React.ReactNode;
  showBestLine?: boolean;
  bestMoveSan?: string;
}

export function ReviewQuizPanel({
  fen,
  sideToMove,
  prompt,
  onSubmitMove,
  onMarkMastered,
  isCorrect,
  feedback,
  contextExtra,
  showBestLine = false,
  bestMoveSan,
}: ReviewQuizPanelProps) {
  const { settings } = useAppContext();
  const { fen: boardFen, turn, makeMove, loadFen } = useChessSession(fen);
  const { lastEval, isThinking, analyze } = useStockfish();
  const [submitted, setSubmitted] = useState(false);
  const [pendingUci, setPendingUci] = useState<string | null>(null);

  const orientation = sideToMove;

  useEffect(() => {
    loadFen(fen);
    setSubmitted(false);
    setPendingUci(null);
  }, [fen, loadFen]);

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
      if (submitted && isCorrect) {
        return false;
      }
      const ok = makeMove(from, to, promotion);
      if (ok) {
        setPendingUci(`${from}${to}${promotion ?? ''}`);
      }
      return ok;
    },
    [makeMove, submitted, isCorrect],
  );

  async function handleSubmit() {
    if (!pendingUci) {
      return;
    }
    const correct = await onSubmitMove(pendingUci);
    setSubmitted(true);
    if (settings.ui.showEvalBar) {
      void analyze(fen);
    }
    if (!correct) {
      loadFen(fen);
      setPendingUci(null);
    }
  }

  function handleReset() {
    loadFen(fen);
    setPendingUci(null);
    setSubmitted(false);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex items-start gap-3">
        {settings.ui.showEvalBar && (lastEval || isThinking) && (
          <EvalBar
            scoreCp={lastEval?.scoreCp ?? 0}
            sideToMove={turn}
            className="shrink-0"
          />
        )}
        <TrainingBoard
          fen={boardFen}
          orientation={orientation}
          onMove={handleMove}
          allowDragging={!submitted || !isCorrect}
        />
      </div>

      <div className="flex-1 space-y-4">
        <p className="text-sm text-slate-300">{prompt}</p>

        {contextExtra}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!pendingUci || (submitted && isCorrect)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            Submit move
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Reset position
          </button>
          {isCorrect && (
            <button
              type="button"
              onClick={onMarkMastered}
              className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Mark mastered
            </button>
          )}
        </div>

        {feedback && (
          <p
            className={`text-sm ${isCorrect ? 'text-emerald-400' : 'text-amber-300'}`}
          >
            {feedback}
          </p>
        )}

        {showBestLine && submitted && !isCorrect && bestMoveSan && (
          <p className="text-sm text-slate-400">Best line starts with {bestMoveSan}.</p>
        )}
      </div>
    </div>
  );
}
