import { useCallback, useEffect, useState } from 'react';
import { QUIZ_MOVE_LOSS_CP } from '../constants/analysis';
import { gradeQuizMove } from '../services/analysis/quizGrading';
import { useEngineControl } from '../context/EngineContext';
import { useAppContext } from '../context/AppContext';
import {
  getBlunder,
  listOpenBlunders,
  putBlunder,
} from '../storage/blundersRepo';
import type { PersonalBlunder } from '../types/review';

export function useBlunderQuiz(initialId?: string) {
  const { settings } = useAppContext();
  const { enqueueAnalyze, enqueueBestMove } = useEngineControl();
  const [queue, setQueue] = useState<PersonalBlunder[]>([]);
  const [current, setCurrent] = useState<PersonalBlunder | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshQueue = useCallback(async () => {
    const items = await listOpenBlunders();
    items.sort(
      (a, b) =>
        new Date(b.source.playedAt).getTime() -
        new Date(a.source.playedAt).getTime(),
    );
    setQueue(items);
    return items;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      const items = await refreshQueue();
      if (cancelled) {
        return;
      }
      if (initialId) {
        const picked = items.find((b) => b.id === initialId) ?? (await getBlunder(initialId));
        setCurrent(picked ?? items[0] ?? null);
      } else {
        setCurrent(items[0] ?? null);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialId, refreshQueue]);

  const selectBlunder = useCallback(async (id: string) => {
    const record = await getBlunder(id);
    setCurrent(record ?? null);
    setFeedback(null);
    setIsCorrect(false);
  }, []);

  const submitMove = useCallback(
    async (userUci: string): Promise<boolean> => {
      if (!current) {
        return false;
      }
      const expected = current.analysis.bestMove.uci;
      const now = new Date().toISOString();
      const nextAttempts = current.userState.attempts + 1;
      const quizLimits = { depth: settings.leakDetector.quizDepth };

      const correct = await gradeQuizMove({
        fen: current.position.fen,
        userUci,
        expectedUci: expected,
        userColor: current.source.userColor,
        evalBeforeCp: current.analysis.evalBeforeCp,
        analyze: async (fen, limits) => {
          const result = await enqueueAnalyze(fen, limits);
          return { scoreCp: result.scoreCp, bestMoveUci: result.bestMoveUci };
        },
        bestMove: enqueueBestMove,
        limits: quizLimits,
      });

      const updated: PersonalBlunder = {
        ...current,
        userState: {
          ...current.userState,
          attempts: nextAttempts,
          correctAttempts: correct
            ? current.userState.correctAttempts + 1
            : current.userState.correctAttempts,
          lastAttemptAt: now,
          status: correct ? 'learning' : current.userState.status,
        },
      };

      await putBlunder(updated);
      setCurrent(updated);
      setQueue((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));

      if (correct) {
        setIsCorrect(true);
        setFeedback('Correct — well spotted.');
      } else {
        setIsCorrect(false);
        setFeedback(
          `Not quite. Best was ${current.analysis.bestMove.san} (within ${QUIZ_MOVE_LOSS_CP} cp).`,
        );
      }
      return correct;
    },
    [current, enqueueAnalyze, enqueueBestMove, settings.leakDetector.quizDepth],
  );

  const markMastered = useCallback(async () => {
    if (!current) {
      return;
    }
    const now = new Date().toISOString();
    const updated: PersonalBlunder = {
      ...current,
      userState: {
        ...current.userState,
        status: 'mastered',
        masteredAt: now,
      },
    };
    await putBlunder(updated);
    setCurrent(updated);
    await refreshQueue();
  }, [current, refreshQueue]);

  return {
    queue,
    current,
    feedback,
    isCorrect,
    isLoading,
    refreshQueue,
    selectBlunder,
    submitMove,
    markMastered,
  };
}
